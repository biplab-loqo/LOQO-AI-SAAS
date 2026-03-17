#!/usr/bin/env python3
"""
Process pending `messages.action=generate` records and materialize DB outputs.

Why
---
Use this when approvals are creating next-step generate messages, but no external
worker is consuming SQS in your local/dev setup.

Behavior
--------
- Reads pending generate messages from `messages`
- For each step in `message.stepKey[]`:
  - collection-backed tabs are sourced from their own tables:
      characters, locations, shots, clips
  - all other tabs are sourced from stepVersions
- Inserts a new StepVersion (next versionNo) for each processed step
- Marks execution step statuses as succeeded
- Marks message as processed by this simulator

Run
---
  cd backend
  python -m scripts.process_generate_messages --execution-id <EXEC_ID>
  python -m scripts.process_generate_messages --execution-id <EXEC_ID> --poll 2
  python -m scripts.process_generate_messages --limit 5
"""

from __future__ import annotations

import argparse
import copy
import os
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from bson import ObjectId
from dotenv import load_dotenv
from pymongo import MongoClient


# ──────────────────────────────────────────────────────────────────────────────
# Config
# ──────────────────────────────────────────────────────────────────────────────

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

MONGODB_URL = os.getenv("MONGODB_URL", "")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "test")
WORKFLOW_SOURCE_DB = os.getenv("WORKFLOW_SOURCE_DB", "workflowdb_v16")

if not MONGODB_URL:
    raise RuntimeError("MONGODB_URL is missing in backend/.env")

client = MongoClient(MONGODB_URL)
db = client[MONGODB_DB_NAME]
source_db = client[WORKFLOW_SOURCE_DB]

DEFAULT_PIPELINE_STEPS = [
    "run_show_bible",
    "run_character_design",
    "generate_anchor_image_for_character",
    "generate_view_pack_images_for_character",
    "run_key_location",
    "generate_anchor_image_for_key_location",
    "generate_view_pack_images_for_key_location",
    "run_beat_breakdown",
    "run_shot_intent_mapping",
    "run_storyboard_prompt",
    "run_AI_prompt",
    "create_individual_prompt_files",
    "generate_images_nano_banana",
    "generate_animations",
]

CHAR_STEPS = {
    "run_character_design",
    "generate_anchor_image_for_character",
    "generate_view_pack_images_for_character",
}

LOC_STEPS = {
    "run_key_location",
    "generate_anchor_image_for_key_location",
    "generate_view_pack_images_for_key_location",
}

SHOT_STEP = "generate_images_nano_banana"
CLIP_STEP = "generate_animations"


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _str_oid(v: Any) -> str:
    if isinstance(v, ObjectId):
        return str(v)
    return str(v or "")


def _to_oid(v: Any) -> Optional[ObjectId]:
    if isinstance(v, ObjectId):
        return v
    if isinstance(v, str) and ObjectId.is_valid(v):
        return ObjectId(v)
    return None


def _template_steps_and_ref() -> tuple[list[str], Optional[Any], int, str]:
    """Resolve template metadata (prefer local DB, fallback to workflowdb_v16)."""
    tpl = db["workflowTemplateVersions"].find_one({}, sort=[("version", -1), ("createdAt", -1)])
    if not tpl:
        tpl = source_db["workflowTemplateVersions"].find_one({}, sort=[("version", -1), ("createdAt", -1)])

    if tpl:
        steps_raw = tpl.get("steps") or []
        if steps_raw and isinstance(steps_raw[0], dict):
            try:
                step_keys = [s.get("key") for s in sorted(steps_raw, key=lambda x: int(x.get("order", 999))) if s.get("key")]
            except Exception:
                step_keys = [s.get("key") for s in steps_raw if isinstance(s, dict) and s.get("key")]
        else:
            step_keys = [str(s) for s in steps_raw if s]

        if not step_keys:
            step_keys = DEFAULT_PIPELINE_STEPS[:]

        return step_keys, tpl.get("_id"), int(tpl.get("version") or 1), str(tpl.get("templateKey") or "micro_drama_pipeline")

    return DEFAULT_PIPELINE_STEPS[:], None, 1, "micro_drama_pipeline"


def _create_execution_for_message(msg: Dict[str, Any], step_chain: list[str]) -> Optional[Dict[str, Any]]:
    """Create workflowExecution when first message arrives for a new part (run_show_bible)."""
    if "run_show_bible" not in step_chain:
        return None

    part_oid = _to_oid(msg.get("partId") or (msg.get("meta") or {}).get("partId"))
    if not part_oid:
        return None

    part = db["parts"].find_one({"_id": part_oid})
    if not part:
        part = source_db["parts"].find_one({"_id": part_oid})
    if not part:
        return None

    # Reuse by partId if already exists
    existing = db["workflowExecutions"].find_one({"partId": str(part_oid)}, sort=[("createdAt", -1)])
    if existing:
        return existing

    step_keys, template_version_id, template_version, template_key = _template_steps_and_ref()

    user_id = _str_oid(msg.get("userId"))
    if not user_id:
        user = db["users"].find_one({}) or source_db["users"].find_one({})
        user_id = _str_oid((user or {}).get("_id"))

    org_id = _str_oid(msg.get("orgId") or part.get("organizationId") or (msg.get("meta") or {}).get("orgId"))
    project_id = _str_oid(msg.get("projectId") or part.get("projectId") or (msg.get("meta") or {}).get("projectId"))
    episode_id = _str_oid(msg.get("episodeId") or part.get("episodeId") or (msg.get("meta") or {}).get("episodeId"))
    part_id = _str_oid(part_oid)

    ts = now_utc()
    order_id = f"{user_id}_{int(ts.timestamp())}" if user_id else f"order_{int(ts.timestamp())}"

    doc = {
        "_id": ObjectId(),
        "userId": user_id,
        "templateKey": template_key,
        "templateVersion": template_version,
        "templateVersionId": template_version_id,
        "title": order_id,
        "status": "running",
        "currentStepKey": None,
        "orgId": org_id,
        "projectId": project_id,
        "episodeId": episode_id,
        "partId": part_id,
        "steps": [
            {
                "stepKey": sk,
                "status": "not_started",
                "isApproved": False,
                "updatedAt": ts,
            }
            for sk in step_keys
        ],
        "seqCounters": {"messageSeq": 0},
        "meta": {
            "orderId": order_id,
            "screenplay": part.get("scriptText") or (msg.get("meta") or {}).get("screenplay") or "",
            "orgId": org_id,
            "projectId": project_id,
            "episodeId": episode_id,
            "partId": part_id,
            "partNumber": part.get("partNumber"),
            "action": "generate",
            "createdAt": ts.isoformat(),
        },
        "createdAt": ts,
        "updatedAt": ts,
    }
    db["workflowExecutions"].insert_one(doc)

    db["messages"].update_one(
        {"_id": msg["_id"]},
        {"$set": {"executionId": str(doc["_id"])}}
    )
    return doc


def _latest_by_key(rows: List[Dict[str, Any]], key_fn) -> List[Dict[str, Any]]:
    out: Dict[str, Dict[str, Any]] = {}
    for r in rows:
        k = key_fn(r)
        if k and k not in out:
            out[k] = r
    return list(out.values())


def _get_exec_context(execution: Dict[str, Any]) -> Dict[str, str]:
    return {
        "org_id": _str_oid(execution.get("orgId") or (execution.get("meta") or {}).get("orgId")),
        "project_id": _str_oid(execution.get("projectId") or (execution.get("meta") or {}).get("projectId")),
        "episode_id": _str_oid(execution.get("episodeId") or (execution.get("meta") or {}).get("episodeId")),
        "part_id": _str_oid(execution.get("partId") or (execution.get("meta") or {}).get("partId")),
        "execution_id": _str_oid(execution.get("_id")),
    }


def _seed_source_rows(collection: str, ctx: Dict[str, str], limit: int, sort_spec: list[tuple[str, int]]) -> List[Dict[str, Any]]:
    """Get real sample rows from source db first (workflowdb_v16), then local db."""
    # Try same execution first
    by_exec = list(
        source_db[collection]
        .find({"$or": [{"execution_id": ctx["execution_id"]}, {"executionId": ctx["execution_id"]}]})
        .sort(sort_spec)
        .limit(limit)
    )
    if by_exec:
        return by_exec

    # Then same part
    by_part = list(
        source_db[collection]
        .find({"$or": [{"part_id": ctx["part_id"]}, {"partId": ctx["part_id"]}]})
        .sort(sort_spec)
        .limit(limit)
    )
    if by_part:
        return by_part

    # Then any latest from source
    latest_source = list(source_db[collection].find().sort(sort_spec).limit(limit))
    if latest_source:
        return latest_source

    # Fallback local latest
    return list(db[collection].find().sort(sort_spec).limit(limit))


# ──────────────────────────────────────────────────────────────────────────────
# Collection bootstrap (real DB data only)
# ──────────────────────────────────────────────────────────────────────────────

def _ensure_characters_for_execution(execution: Dict[str, Any]) -> int:
    ctx = _get_exec_context(execution)
    existing = list(db["characters"].find({"$or": [{"execution_id": ctx["execution_id"]}, {"executionId": ctx["execution_id"]}]}))
    if existing:
        has_images = any(
            (len(r.get("anchor_images") or []) > 0) or
            (len(r.get("view_pack_images") or []) > 0) or
            bool((r.get("collage_image") or {}).get("s3_uri"))
            for r in existing
        )
        if has_images:
            return len(existing)
        # Existing rows but empty media -> refresh from real source examples
        db["characters"].delete_many({"$or": [{"execution_id": ctx["execution_id"]}, {"executionId": ctx["execution_id"]}]})

    source_rows = _seed_source_rows(
        "characters",
        ctx,
        200,
        [("updated_at", -1), ("updatedAt", -1), ("version", -1)],
    )
    if not source_rows:
        return 0

    latest = _latest_by_key(
        source_rows,
        lambda r: str(
            ((r.get("character_description") or {}).get("character_id"))
            or ((r.get("character_description") or {}).get("name_identifier"))
            or ((r.get("character_description") or {}).get("name_id"))
            or ((r.get("character_description") or {}).get("display_name"))
            or r.get("_id")
        ),
    )

    docs: List[Dict[str, Any]] = []
    ts = now_utc()
    for row in latest:
        d = copy.deepcopy(row)
        d["_id"] = ObjectId()
        d["org_id"] = ctx["org_id"]
        d["project_id"] = ctx["project_id"]
        d["episode_id"] = ctx["episode_id"]
        d["part_id"] = ctx["part_id"]
        d["execution_id"] = ctx["execution_id"]
        d["status"] = "succeeded"
        d["is_approved"] = False
        d["version"] = 1
        d["created_at"] = ts
        d["updated_at"] = ts
        docs.append(d)

    if docs:
        db["characters"].insert_many(docs)
    return len(docs)


def _ensure_locations_for_execution(execution: Dict[str, Any]) -> int:
    ctx = _get_exec_context(execution)
    existing = list(db["locations"].find({"$or": [{"execution_id": ctx["execution_id"]}, {"executionId": ctx["execution_id"]}]}))
    if existing:
        has_images = any(
            (len(r.get("anchor_images") or []) > 0) or
            (len(r.get("view_pack_images") or []) > 0) or
            bool((r.get("collage_image") or {}).get("s3_uri"))
            for r in existing
        )
        if has_images:
            return len(existing)
        # Existing rows but empty media -> refresh from real source examples
        db["locations"].delete_many({"$or": [{"execution_id": ctx["execution_id"]}, {"executionId": ctx["execution_id"]}]})

    source_rows = _seed_source_rows(
        "locations",
        ctx,
        200,
        [("updated_at", -1), ("updatedAt", -1), ("version", -1)],
    )
    if not source_rows:
        return 0

    latest = _latest_by_key(
        source_rows,
        lambda r: str(
            ((r.get("location_description") or {}).get("location_id"))
            or ((r.get("location_description") or {}).get("name"))
            or ((r.get("location_description") or {}).get("display_name"))
            or r.get("_id")
        ),
    )

    docs: List[Dict[str, Any]] = []
    ts = now_utc()
    for row in latest:
        d = copy.deepcopy(row)
        d["_id"] = ObjectId()
        d["org_id"] = ctx["org_id"]
        d["project_id"] = ctx["project_id"]
        d["episode_id"] = ctx["episode_id"]
        d["part_id"] = ctx["part_id"]
        d["execution_id"] = ctx["execution_id"]
        d["status"] = "succeeded"
        d["is_approved"] = False
        d["version"] = 1
        d["created_at"] = ts
        d["updated_at"] = ts
        docs.append(d)

    if docs:
        db["locations"].insert_many(docs)
    return len(docs)


def _ensure_shots_for_execution(execution: Dict[str, Any]) -> int:
    exec_oid = execution["_id"]
    ctx = _get_exec_context(execution)
    existing = list(db["shots"].find({"executionId": exec_oid}))
    if existing:
        return len(existing)

    source_rows = _seed_source_rows("shots", ctx, 300, [("updatedAt", -1), ("version", -1)])
    if not source_rows:
        return 0

    latest = _latest_by_key(source_rows, lambda r: str(r.get("shotId") or r.get("_id")))
    ts = now_utc()
    docs: List[Dict[str, Any]] = []

    for row in latest:
        d = copy.deepcopy(row)

        # Normalize legacy snake_case source schema → current camelCase schema.
        if not d.get("shotId") and d.get("shot_id"):
            d["shotId"] = d.get("shot_id")
        if not d.get("shotId") and d.get("shot_number") is not None:
            try:
                d["shotId"] = f"shot_{int(d.get('shot_number')):02d}"
            except Exception:
                d["shotId"] = str(d.get("shot_number"))

        if d.get("sequenceNo") is None:
            if d.get("sequence_no") is not None:
                d["sequenceNo"] = d.get("sequence_no")
            elif d.get("shot_number") is not None:
                d["sequenceNo"] = d.get("shot_number")

        if d.get("shotMetadata") is None and isinstance(d.get("shot_metadata"), dict):
            m = dict(d.get("shot_metadata") or {})
            if "shot_number" in m and "shotNumber" not in m:
                m["shotNumber"] = m.get("shot_number")
            if "beat_number" in m and "beatNumber" not in m:
                m["beatNumber"] = m.get("beat_number")
            d["shotMetadata"] = m
        elif d.get("shotMetadata") is None and d.get("shot_number") is not None:
            d["shotMetadata"] = {"shotNumber": d.get("shot_number")}

        if d.get("oneLinerShotIntent") is None and d.get("one_liner_shot_intent"):
            d["oneLinerShotIntent"] = d.get("one_liner_shot_intent")
        if d.get("startImagePrompt") is None and d.get("start_image_prompt"):
            d["startImagePrompt"] = d.get("start_image_prompt")

        if d.get("startImage") is None and isinstance(d.get("start_image"), dict):
            m = dict(d.get("start_image") or {})
            if "object_id" in m and "objectId" not in m:
                m["objectId"] = m.get("object_id")
            if "display_name" in m and "displayName" not in m:
                m["displayName"] = m.get("display_name")
            if "aws_url" in m and "awsUrl" not in m:
                m["awsUrl"] = m.get("aws_url")
            d["startImage"] = m

        if d.get("characterReferences") is None and isinstance(d.get("character_references"), list):
            refs = []
            for r in d.get("character_references") or []:
                rr = dict(r)
                if "character_id" in rr and "characterId" not in rr:
                    rr["characterId"] = rr.get("character_id")
                if "reference_image" in rr and "referenceImage" not in rr:
                    rr["referenceImage"] = rr.get("reference_image")
                if "display_name" in rr and "displayName" not in rr:
                    rr["displayName"] = rr.get("display_name")
                if "aws_url" in rr and "awsUrl" not in rr:
                    rr["awsUrl"] = rr.get("aws_url")
                refs.append(rr)
            d["characterReferences"] = refs

        if d.get("locationReferences") is None and isinstance(d.get("location_references"), list):
            refs = []
            for r in d.get("location_references") or []:
                rr = dict(r)
                if "location_id" in rr and "locationId" not in rr:
                    rr["locationId"] = rr.get("location_id")
                if "reference_image" in rr and "referenceImage" not in rr:
                    rr["referenceImage"] = rr.get("reference_image")
                if "display_name" in rr and "displayName" not in rr:
                    rr["displayName"] = rr.get("display_name")
                if "aws_url" in rr and "awsUrl" not in rr:
                    rr["awsUrl"] = rr.get("aws_url")
                refs.append(rr)
            d["locationReferences"] = refs

        if d.get("previousReferences") is None and isinstance(d.get("previous_references"), list):
            refs = []
            for r in d.get("previous_references") or []:
                rr = dict(r)
                if "reference_image" in rr and "referenceImage" not in rr:
                    rr["referenceImage"] = rr.get("reference_image")
                if "display_name" in rr and "displayName" not in rr:
                    rr["displayName"] = rr.get("display_name")
                if "aws_url" in rr and "awsUrl" not in rr:
                    rr["awsUrl"] = rr.get("aws_url")
                refs.append(rr)
            d["previousReferences"] = refs

        d["_id"] = ObjectId()
        d["executionId"] = exec_oid
        d["orgId"] = ctx["org_id"]
        d["projectId"] = ctx["project_id"]
        d["episodeId"] = ctx["episode_id"]
        d["partId"] = ctx["part_id"]
        d["version"] = 1
        d["isApproved"] = False
        d["createdAt"] = ts
        d["updatedAt"] = ts
        docs.append(d)

    if docs:
        db["shots"].insert_many(docs)
    return len(docs)


def _ensure_clips_for_execution(execution: Dict[str, Any]) -> int:
    exec_oid = execution["_id"]
    ctx = _get_exec_context(execution)
    existing = list(db["clips"].find({"executionId": exec_oid}))
    if existing:
        return len(existing)

    source_rows = _seed_source_rows("clips", ctx, 300, [("updatedAt", -1), ("version", -1)])
    if not source_rows:
        return 0

    latest = _latest_by_key(source_rows, lambda r: str(r.get("clipId") or r.get("_id")))
    ts = now_utc()
    docs: List[Dict[str, Any]] = []

    for row in latest:
        d = copy.deepcopy(row)

        # Normalize legacy snake_case source schema → current camelCase schema.
        if not d.get("clipId") and d.get("clip_id"):
            d["clipId"] = d.get("clip_id")
        if not d.get("shotId") and d.get("shot_id"):
            d["shotId"] = d.get("shot_id")
        if d.get("sequenceNo") is None and d.get("sequence_no") is not None:
            d["sequenceNo"] = d.get("sequence_no")
        if d.get("animationPrompt") is None and d.get("animation_prompt"):
            d["animationPrompt"] = d.get("animation_prompt")

        if d.get("clipOutput") is None and isinstance(d.get("clip_output"), dict):
            m = dict(d.get("clip_output") or {})
            if "object_id" in m and "objectId" not in m:
                m["objectId"] = m.get("object_id")
            if "display_name" in m and "displayName" not in m:
                m["displayName"] = m.get("display_name")
            if "aws_url" in m and "awsUrl" not in m:
                m["awsUrl"] = m.get("aws_url")
            d["clipOutput"] = m

        if d.get("inputImages") is None and isinstance(d.get("input_images"), list):
            imgs = []
            for r in d.get("input_images") or []:
                rr = dict(r)
                if "object_id" in rr and "objectId" not in rr:
                    rr["objectId"] = rr.get("object_id")
                if "display_name" in rr and "displayName" not in rr:
                    rr["displayName"] = rr.get("display_name")
                if "aws_url" in rr and "awsUrl" not in rr:
                    rr["awsUrl"] = rr.get("aws_url")
                imgs.append(rr)
            d["inputImages"] = imgs

        d["_id"] = ObjectId()
        d["executionId"] = exec_oid
        d["orgId"] = ctx["org_id"]
        d["projectId"] = ctx["project_id"]
        d["episodeId"] = ctx["episode_id"]
        d["partId"] = ctx["part_id"]
        d["version"] = 1
        d["isApproved"] = False
        d["createdAt"] = ts
        d["updatedAt"] = ts
        docs.append(d)

    if docs:
        db["clips"].insert_many(docs)
    return len(docs)


# ──────────────────────────────────────────────────────────────────────────────
# Step output builders
# ──────────────────────────────────────────────────────────────────────────────

def _build_character_output(execution: Dict[str, Any], step_key: str) -> Dict[str, Any]:
    ctx = _get_exec_context(execution)
    rows = list(db["characters"].find({"$or": [{"execution_id": ctx["execution_id"]}, {"executionId": ctx["execution_id"]}]}).sort([("version", -1)]))

    latest = _latest_by_key(
        rows,
        lambda r: str(
            ((r.get("character_description") or {}).get("character_id"))
            or ((r.get("character_description") or {}).get("name_identifier"))
            or ((r.get("character_description") or {}).get("name_id"))
            or ((r.get("character_description") or {}).get("display_name"))
            or r.get("_id")
        ),
    )

    if step_key == "run_character_design":
        chars: Dict[str, Any] = {}
        for r in latest:
            desc = r.get("character_description") or {}
            name = str(desc.get("display_name") or desc.get("character_name") or desc.get("name_identifier") or "Character")
            chars[name] = desc
        return {
            "blobs": [{"kind": "json_blob", "data": {"Characters": chars}}],
            "artifactRefs": {},
            "s3_uris": [],
            "counts": {"blobs": 1, "files": 0, "artifacts": 0},
        }

    refs: Dict[str, List[str]] = {}
    for r in latest:
        desc = r.get("character_description") or {}
        name = str(desc.get("display_name") or desc.get("character_name") or desc.get("name_identifier") or "Character")
        imgs = r.get("anchor_images") if step_key == "generate_anchor_image_for_character" else r.get("view_pack_images")
        urls = [i.get("s3_uri") for i in (imgs or []) if i.get("s3_uri")]
        if step_key == "generate_view_pack_images_for_character":
            collage = r.get("collage_image") or {}
            if collage.get("s3_uri"):
                urls.append(collage.get("s3_uri"))
        refs[name] = urls

    return {
        "blobs": [],
        "artifactRefs": refs,
        "s3_uris": [],
        "counts": {"blobs": 0, "files": 0, "artifacts": sum(len(v) for v in refs.values())},
    }


def _build_location_output(execution: Dict[str, Any], step_key: str) -> Dict[str, Any]:
    ctx = _get_exec_context(execution)
    rows = list(db["locations"].find({"$or": [{"execution_id": ctx["execution_id"]}, {"executionId": ctx["execution_id"]}]}).sort([("version", -1)]))

    latest = _latest_by_key(
        rows,
        lambda r: str(
            ((r.get("location_description") or {}).get("location_id"))
            or ((r.get("location_description") or {}).get("name"))
            or ((r.get("location_description") or {}).get("display_name"))
            or r.get("_id")
        ),
    )

    if step_key == "run_key_location":
        locs: Dict[str, Any] = {}
        for r in latest:
            desc = r.get("location_description") or {}
            key = str(desc.get("name") or desc.get("display_name") or desc.get("location_name") or "Location")
            locs[key] = desc
        return {
            "blobs": [{"kind": "json_blob", "data": {"Key_Locations": locs}}],
            "artifactRefs": {},
            "s3_uris": [],
            "counts": {"blobs": 1, "files": 0, "artifacts": 0},
        }

    refs: Dict[str, List[str]] = {}
    for r in latest:
        desc = r.get("location_description") or {}
        name = str(desc.get("name") or desc.get("display_name") or desc.get("location_name") or "Location")
        imgs = r.get("anchor_images") if step_key == "generate_anchor_image_for_key_location" else r.get("view_pack_images")
        urls = [i.get("s3_uri") for i in (imgs or []) if i.get("s3_uri")]
        if step_key == "generate_view_pack_images_for_key_location":
            collage = r.get("collage_image") or {}
            if collage.get("s3_uri"):
                urls.append(collage.get("s3_uri"))
        refs[name] = urls

    return {
        "blobs": [],
        "artifactRefs": refs,
        "s3_uris": [],
        "counts": {"blobs": 0, "files": 0, "artifacts": sum(len(v) for v in refs.values())},
    }


def _build_shot_output(execution: Dict[str, Any]) -> Dict[str, Any]:
    rows = list(db["shots"].find({"executionId": execution["_id"]}).sort([("sequenceNo", 1), ("version", -1)]))
    latest = _latest_by_key(rows, lambda r: str(r.get("shotId") or r.get("_id")))

    artifacts = []
    for r in latest:
        shot_id = str(r.get("shotId") or "")
        start = r.get("startImage") or {}
        url = start.get("awsUrl")
        if shot_id and url:
            artifacts.append({"shotId": shot_id, "image": {"uri": url}})

    return {
        "blobs": [{"kind": "json_blob", "data": {"images": "Images"}}],
        "artifactRefs": artifacts,
        "s3_uris": [],
        "counts": {"blobs": 1, "files": 0, "artifacts": len(artifacts)},
    }


def _build_clip_output(execution: Dict[str, Any]) -> Dict[str, Any]:
    rows = list(db["clips"].find({"executionId": execution["_id"]}).sort([("sequenceNo", 1), ("version", -1)]))
    latest = _latest_by_key(rows, lambda r: str(r.get("clipId") or r.get("_id")))

    artifacts = []
    anims = []
    for r in latest:
        shot_id = str(r.get("shotId") or "")
        out = r.get("clipOutput") or {}
        url = out.get("awsUrl")
        if shot_id and url:
            artifacts.append({"shotId": shot_id, "animation": {"uri": url}})
            anims.append({"shotId": shot_id, "animation": {"uri": url}})

    return {
        "blobs": [{"kind": "json_blob", "data": {"animations": anims}}],
        "artifactRefs": artifacts,
        "s3_uris": [],
        "counts": {"blobs": 1, "files": 0, "artifacts": len(artifacts)},
    }


def _build_generic_step_output(step_key: str) -> Dict[str, Any]:
    sv = db["stepVersions"].find_one({"stepKey": step_key}, sort=[("versionNo", -1), ("updatedAt", -1), ("createdAt", -1)])
    if not sv:
        sv = source_db["stepVersions"].find_one({"stepKey": step_key}, sort=[("versionNo", -1), ("updatedAt", -1), ("createdAt", -1)])
    if sv and isinstance(sv.get("output"), dict):
        return copy.deepcopy(sv["output"])

    return {
        "blobs": [{"kind": "json_blob", "data": {"status": "completed", "step": step_key}}],
        "artifactRefs": {},
        "s3_uris": [],
        "counts": {"blobs": 1, "files": 0, "artifacts": 0},
    }


# ──────────────────────────────────────────────────────────────────────────────
# StepVersion + execution update
# ──────────────────────────────────────────────────────────────────────────────

def _insert_step_version(execution: Dict[str, Any], step_key: str, output: Dict[str, Any]) -> ObjectId:
    exec_oid = execution["_id"]
    prev = db["stepVersions"].find_one({"executionId": exec_oid, "stepKey": step_key}, sort=[("versionNo", -1)])
    version_no = int((prev or {}).get("versionNo") or 0) + 1

    ctx = _get_exec_context(execution)
    ts = now_utc()
    sv_id = ObjectId()

    db["stepVersions"].insert_one({
        "_id": sv_id,
        "executionId": exec_oid,
        "stepKey": step_key,
        "versionNo": version_no,
        "lineage": {"type": "simulated_worker", "createdFromVersionId": prev.get("_id") if prev else None},
        "input": {"source": "process_generate_messages", "fromDB": True},
        "output": output,
        "status": "succeeded",
        "orgId": ctx["org_id"],
        "projectId": ctx["project_id"],
        "episodeId": ctx["episode_id"],
        "partId": ctx["part_id"],
        "createdAt": ts,
        "updatedAt": ts,
    })
    return sv_id


def _mark_step_succeeded(execution: Dict[str, Any], step_key: str, head_version_id: ObjectId) -> None:
    ts = now_utc()
    steps = execution.get("steps") or []
    found = False

    for s in steps:
        if s.get("stepKey") == step_key:
            s["status"] = "succeeded"
            s["updatedAt"] = ts
            s["endedAt"] = ts
            s["headVersionId"] = head_version_id
            found = True
            break

    if not found:
        steps.append({
            "stepKey": step_key,
            "status": "succeeded",
            "updatedAt": ts,
            "endedAt": ts,
            "headVersionId": head_version_id,
        })

    has_running = any((s.get("status") in {"running", "not_started", "locked"}) for s in steps)

    db["workflowExecutions"].update_one(
        {"_id": execution["_id"]},
        {"$set": {
            "steps": steps,
            "currentStepKey": step_key,
            "status": "running" if has_running else "completed",
            "updatedAt": ts,
        }}
    )


def _enqueue_generate_message_once(execution: Dict[str, Any], source_msg: Dict[str, Any], step_key: str) -> bool:
    """Create a generate message for one step only if there is no pending one."""
    exec_id = _str_oid(execution.get("_id"))
    existing = db["messages"].find_one(
        {
            "executionId": exec_id,
            "action": "generate",
            "stepKey": [step_key],
            "$or": [
                {"processedBySimulator": {"$exists": False}},
                {"processedBySimulator": False},
            ],
        },
        sort=[("createdAt", -1)],
    )
    if existing:
        return False

    ts = now_utc()
    ctx = _get_exec_context(execution)
    db["messages"].insert_one(
        {
            "_id": ObjectId(),
            "executionId": exec_id,
            "stepKey": [step_key],
            "orgId": ctx["org_id"],
            "projectId": ctx["project_id"],
            "episodeId": ctx["episode_id"],
            "partId": ctx["part_id"],
            "action": "generate",
            "userId": _str_oid(source_msg.get("userId")),
            "templateKey": str(execution.get("templateKey") or "micro_drama_pipeline"),
            "createdAt": ts,
            "source": "process_generate_messages",
        }
    )
    return True


# ──────────────────────────────────────────────────────────────────────────────
# Message processor
# ──────────────────────────────────────────────────────────────────────────────

def _process_one_message(msg: Dict[str, Any]) -> None:
    step_chain = msg.get("stepKey") or []
    if isinstance(step_chain, str):
        step_chain = [step_chain]

    execution_id = msg.get("executionId")
    execution: Optional[Dict[str, Any]] = None

    if execution_id and ObjectId.is_valid(str(execution_id)):
        execution = db["workflowExecutions"].find_one({"_id": ObjectId(str(execution_id))})

    if not execution:
        execution = _create_execution_for_message(msg, step_chain)
        if execution:
            execution_id = str(execution["_id"])

    if not execution:
        db["messages"].update_one(
            {"_id": msg["_id"]},
            {"$set": {
                "processedBySimulator": False,
                "processor": "process_generate_messages",
                "note": "execution-not-found",
                "updatedAt": now_utc(),
            }}
        )
        return

    if not step_chain:
        db["messages"].update_one({"_id": msg["_id"]}, {"$set": {"processedBySimulator": True, "processedAt": now_utc(), "processor": "process_generate_messages", "note": "empty-step-chain"}})
        return

    print(f"▶ Processing message {msg['_id']} → steps={step_chain}")

    for step_key in step_chain:
        if step_key in CHAR_STEPS:
            _ensure_characters_for_execution(execution)
            output = _build_character_output(execution, step_key)
        elif step_key in LOC_STEPS:
            _ensure_locations_for_execution(execution)
            output = _build_location_output(execution, step_key)
        elif step_key == SHOT_STEP:
            _ensure_shots_for_execution(execution)
            output = _build_shot_output(execution)
        elif step_key == CLIP_STEP:
            _ensure_clips_for_execution(execution)
            output = _build_clip_output(execution)
        else:
            output = _build_generic_step_output(step_key)

        sv_id = _insert_step_version(execution, step_key, output)
        _mark_step_succeeded(execution, step_key, sv_id)
        execution = db["workflowExecutions"].find_one({"_id": execution["_id"]}) or execution
        print(f"    ✓ {step_key} -> stepVersion {sv_id}")

        # Storyboard approved/processed => ensure shots table exists from real source examples.
        if step_key == "run_storyboard_prompt":
            seeded = _ensure_shots_for_execution(execution)
            print(f"    ✓ shots available: {seeded}")

            # If this message did not already include image-generation step,
            # enqueue it once so all shots can be generated in the next cycle.
            if "generate_images_nano_banana" not in step_chain:
                enq = _enqueue_generate_message_once(execution, msg, "generate_images_nano_banana")
                if enq:
                    print("    ✓ queued generate_images_nano_banana message")

    db["messages"].update_one(
        {"_id": msg["_id"]},
        {"$set": {
            "processedBySimulator": True,
            "processedAt": now_utc(),
            "processor": "process_generate_messages",
        }}
    )


def _fetch_pending_messages(execution_id: Optional[str], limit: int) -> List[Dict[str, Any]]:
    q: Dict[str, Any] = {
        "action": "generate",
        "$or": [
            {"processedBySimulator": {"$exists": False}},
            {"processedBySimulator": False},
        ],
    }
    if execution_id:
        q["executionId"] = execution_id

    return list(db["messages"].find(q).sort([("createdAt", 1)]).limit(limit))


def main() -> None:
    parser = argparse.ArgumentParser(description="Process generate messages and write step outputs from DB tables")
    parser.add_argument("--execution-id", help="Only process generate messages for this execution id")
    parser.add_argument("--limit", type=int, default=20, help="Max messages per cycle")
    parser.add_argument("--poll", type=int, default=0, help="Poll interval in seconds (0 = run once)")
    args = parser.parse_args()

    print("\n╔══════════════════════════════════════════════════════════════════╗")
    print("║       process_generate_messages.py — local queue simulator      ║")
    print("╚══════════════════════════════════════════════════════════════════╝")
    print(f"DB: {MONGODB_DB_NAME}")
    if args.execution_id:
        print(f"Execution filter: {args.execution_id}")
    print()

    def run_cycle() -> int:
        msgs = _fetch_pending_messages(args.execution_id, max(1, args.limit))
        if not msgs:
            print("No pending generate messages.")
            return 0
        for m in msgs:
            _process_one_message(m)
        return len(msgs)

    if args.poll and args.poll > 0:
        while True:
            count = run_cycle()
            print(f"Processed: {count}. Sleeping {args.poll}s...\n")
            time.sleep(args.poll)
    else:
        run_cycle()


if __name__ == "__main__":
    main()
