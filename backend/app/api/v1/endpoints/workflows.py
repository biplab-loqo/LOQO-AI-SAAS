"""
Workflow API endpoints — single-DB architecture.

All data lives in one Atlas database. No chains, no scheduler.
Steps are executed by an external service.
No separate artifacts collection — images are s3_uris in step output.

Executions
──────────
  GET    /workflows                                 — list executions
  GET    /workflows/{id}                            — execution status + steps
  DELETE /workflows/{id}                            — delete execution cascade

Steps
─────
  GET    /workflows/{id}/steps/{key}                — latest step version data
  GET    /workflows/{id}/steps/{key}/history        — all versions of a step
  POST   /workflows/{id}/steps/{key}/edit           — create new version
  POST   /workflows/{id}/steps/{key}/iterate        — refine with prompt
  PATCH  /workflows/{id}/steps/{key}/images         — update s3_uris/artifactRefs in-place

Templates
─────────
  GET    /workflows/templates                       — list template versions

Messages
────────
  GET    /workflows/{id}/messages                   — conversation messages
  POST   /workflows/{id}/messages                   — add a message

Step Versions
─────────────
  GET    /workflows/step-versions/{version_id}      — single step version by ID
"""
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from copy import deepcopy
from bson import ObjectId

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic_core import ValidationError as PydanticCoreValidationError
from pydantic import BaseModel

from app.core.auth import get_current_user, get_current_user_optional
from app.models.user import User
from app.models.workflow_execution import WorkflowExecution
from app.models.step_version import StepVersion
from app.models.template_version import TemplateVersion
from app.models.message import Message
from beanie import PydanticObjectId
from app.models.shot import Shot
from app.models.clip import Clip
from app.models.character import Character
from app.models.location import Location
from app.services.workflow_engine import WorkflowEngine, _convert_s3_uris_in_output, _s3uri_to_url
from app.services.sqs_service import send_to_sqs, build_message_body

router = APIRouter(prefix="/workflows", tags=["workflows"])


# ── Helpers ──────────────────────────────────────────────────

async def _resolve_ctx_id(execution_id: str):
    """Get execution and its ID used to query sub-collections (stepVersions, messages)."""
    try:
        execution = await WorkflowExecution.get(execution_id)
    except (ValueError, TypeError, PydanticCoreValidationError):
        raise HTTPException(404, "Execution not found")
    if not execution:
        raise HTTPException(404, "Execution not found")
    # Always use the execution's own _id to query step versions —
    # template_version_id is for the template, not step version ownership.
    ctx_id = execution.id
    return execution, ctx_id


# ── Request bodies ───────────────────────────────────────────

class EditStepBody(BaseModel):
    """Edit step data → creates a NEW StepVersion (never overwrites)."""
    data: Dict[str, Any]
    org_id: Optional[str] = None
    project_id: Optional[str] = None
    episode_id: Optional[str] = None
    part_id: Optional[str] = None


class IterateStepBody(BaseModel):
    """Iterate (refine) a step with a text prompt."""
    prompt: str
    org_id: Optional[str] = None
    project_id: Optional[str] = None
    episode_id: Optional[str] = None
    part_id: Optional[str] = None


class PatchImagesBody(BaseModel):
    """Patch s3_uris / artifactRefs on the head step version in-place."""
    s3_uris: List[str] = []
    artifact_refs: Optional[Dict[str, List[str]]] = None


class GenerateStepBody(BaseModel):
    """Trigger generation of a step."""
    org_id: Optional[str] = None
    project_id: Optional[str] = None
    episode_id: Optional[str] = None
    part_id: Optional[str] = None


class ApproveStepBody(BaseModel):
    """Optional context for approve — forwarded to SQS."""
    org_id: Optional[str] = None
    project_id: Optional[str] = None
    episode_id: Optional[str] = None
    part_id: Optional[str] = None


class CreateMessageBody(BaseModel):
    """Create a message in the conversation."""
    step_key: Optional[list[str]] = None
    action: str = "generate"     # "generate" | "edit" | "iterate"
    prompt: Optional[str] = None
    org_id: Optional[str] = None
    project_id: Optional[str] = None
    episode_id: Optional[str] = None
    part_id: Optional[str] = None


class ShotIterateBody(BaseModel):
    """Iterate a specific shot with a text instruction."""
    instruction: str
    org_id: Optional[str] = None
    project_id: Optional[str] = None
    episode_id: Optional[str] = None
    part_id: Optional[str] = None


class ShotRetryBody(BaseModel):
    """Retry a specific shot — re-generate with existing references."""
    org_id: Optional[str] = None
    project_id: Optional[str] = None
    episode_id: Optional[str] = None
    part_id: Optional[str] = None


# ══════════════════════════════════════════════════════════════
#  TEMPLATES
# ══════════════════════════════════════════════════════════════

@router.get("/templates")
async def list_templates(
    user: User = Depends(get_current_user),
):
    """List all pipeline template versions from the DB."""
    templates = await TemplateVersion.find().sort("-version").to_list()
    return [
        {
            "id": str(t.id),
            "version": t.version,
            "workflow_template_id": str(t.workflow_template_id) if t.workflow_template_id else None,
            "steps": [
                {"key": s.key, "order": s.order}
                for s in t.steps
            ],
            "created_at": t.created_at.isoformat(),
        }
        for t in templates
    ]


# ══════════════════════════════════════════════════════════════
#  EXECUTIONS
# ══════════════════════════════════════════════════════════════

@router.get("")
async def list_workflows(
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0),
    status: Optional[str] = None,
    user: User = Depends(get_current_user),
):
    """List workflow executions (paginated, optional status filter)."""
    query: dict = {}
    if status:
        query["status"] = status

    executions = await WorkflowExecution.find(query).skip(skip).limit(limit).sort("-createdAt").to_list()
    total = await WorkflowExecution.find(query).count()

    results = []
    for ex in executions:
        results.append({
            "id": str(ex.id),
            "user_id": ex.user_id,
            "template_version_id": str(ex.template_version_id) if ex.template_version_id else None,
            "title": ex.title,
            "status": ex.status,
            "current_step_key": ex.current_step_key,
            "step_count": len(ex.steps),
            "meta": ex.meta,
            "created_at": ex.created_at.isoformat(),
            "updated_at": ex.updated_at.isoformat(),
        })

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "executions": results,
    }


@router.get("/by-part/{part_id}")
async def get_workflow_by_part(
    part_id: str,
    # this endpoint is intentionally public because the UI polls it before the user
    # may be fully authenticated. 401s prevented shots/animations from loading.
    #user: User = Depends(get_current_user),
):
    """Get the latest workflow execution for a given part ID.

    Queries both top-level partId and meta.partId to support all schema variants.
    Returns 404 if no execution exists yet (frontend polls until it appears).
    """
    # Try top-level partId first, then meta.partId (real AI service stores it there)
    execution = await WorkflowExecution.find_one(
        {"$or": [{"partId": part_id}, {"meta.partId": part_id}]}
    )
    if not execution:
        raise HTTPException(404, f"No execution found for part {part_id}")
    try:
        return await WorkflowEngine.get_execution_status(str(execution.id))
    except ValueError as e:
        raise HTTPException(404, str(e))


@router.get("/{execution_id}")
async def get_workflow(
    execution_id: str,
    user: User = Depends(get_current_user),
):
    """Get full workflow execution status with step details."""
    try:
        return await WorkflowEngine.get_execution_status(execution_id)
    except ValueError as e:
        raise HTTPException(404, str(e))


@router.delete("/{execution_id}")
async def delete_workflow(
    execution_id: str,
    user: User = Depends(get_current_user),
):
    """Delete execution + all related step versions and messages."""
    execution, ctx_id = await _resolve_ctx_id(execution_id)

    await StepVersion.find({"executionId": ctx_id}).delete()
    await Message.find({"executionId": ctx_id}).delete()
    await Shot.find({"executionId": ctx_id}).delete()
    await Clip.find({"executionId": ctx_id}).delete()
    await execution.delete()

    return {"deleted": True, "execution_id": execution_id}


# ══════════════════════════════════════════════════════════════
#  STEPS
# ══════════════════════════════════════════════════════════════

@router.get("/{execution_id}/steps/{step_key}")
async def get_step_data(
    execution_id: str,
    step_key: str,
    user: User = Depends(get_current_user),
):
    """Latest step version data for a step. Images are s3_uris in output."""
    try:
        return await WorkflowEngine.get_step_data(execution_id, step_key)
    except ValueError as e:
        raise HTTPException(404, str(e))


@router.get("/{execution_id}/steps/{step_key}/history")
async def get_step_history(
    execution_id: str,
    step_key: str,
    user: User = Depends(get_current_user),
):
    """All versions of a step."""
    _, ctx_id = await _resolve_ctx_id(execution_id)
    versions = await StepVersion.find(
        {"executionId": ctx_id, "stepKey": step_key}
    ).sort("versionNo").to_list()

    return [
        {
            "step_version_id": str(sv.id),
            "version_no": sv.version_no,
            "status": sv.status,
            "is_approved": bool(getattr(sv, "is_approved", False)),
            "lineage": sv.lineage.model_dump(by_alias=True, mode="json") if sv.lineage else None,
            "has_output": sv.output is not None,
            "created_at": sv.created_at.isoformat(),
        }
        for sv in versions
    ]


# ══════════════════════════════════════════════════════════════
#  STEP EDIT
# ══════════════════════════════════════════════════════════════

@router.post("/{execution_id}/steps/{step_key}/edit")
async def edit_step(
    execution_id: str,
    step_key: str,
    body: EditStepBody,
    user: User = Depends(get_current_user),
):
    """Edit step data → creates a NEW StepVersion with incremented version_no."""
    try:
        new_sv = await WorkflowEngine.edit_step(
            execution_id=execution_id,
            step_key=step_key,
            new_output_data=body.data,
            user_id=str(user.id),
            org_id=body.org_id or str(user.organizationId or ""),
            project_id=body.project_id or "",
            episode_id=body.episode_id or "",
            part_id=body.part_id or "",
        )
    except ValueError as e:
        raise HTTPException(400, str(e))

    return {
        "step_version_id": str(new_sv.id),
        "step_key": new_sv.step_key,
        "version_no": new_sv.version_no,
        "status": new_sv.status,
        "is_approved": bool(getattr(new_sv, "is_approved", False)),
        "lineage": new_sv.lineage.model_dump(by_alias=True, mode="json") if new_sv.lineage else None,
        "created_at": new_sv.created_at.isoformat(),
    }


# ══════════════════════════════════════════════════════════════
#  STEP ITERATE
# ══════════════════════════════════════════════════════════════

@router.post("/{execution_id}/steps/{step_key}/iterate")
async def iterate_step(
    execution_id: str,
    step_key: str,
    body: IterateStepBody,
    user: User = Depends(get_current_user),
):
    """Iterate (refine) a step with a text prompt."""
    try:
        result = await WorkflowEngine.iterate_step(
            execution_id=execution_id,
            step_key=step_key,
            prompt=body.prompt,
            user_id=str(user.id),
            org_id=body.org_id or str(user.organizationId or ""),
            project_id=body.project_id or "",
            episode_id=body.episode_id or "",
            part_id=body.part_id or "",
        )
    except ValueError as e:
        raise HTTPException(400, str(e))

    return result


# ══════════════════════════════════════════════════════════════
#  STEP PATCH IMAGES — update s3_uris / artifactRefs in-place
# ══════════════════════════════════════════════════════════════

@router.patch("/{execution_id}/steps/{step_key}/images")
async def patch_step_images(
    execution_id: str,
    step_key: str,
    body: PatchImagesBody,
    user: User = Depends(get_current_user),
):
    """Patch only the image lists (s3_uris / artifactRefs) on the head step version.

    Used when the user manually deletes or uploads images via the UI.
    Does NOT create a new version — modifies the existing head version in place.
    """
    execution, ctx_id = await _resolve_ctx_id(execution_id)

    sv = await StepVersion.find(
        {"executionId": ctx_id, "stepKey": step_key}
    ).sort("-versionNo").first_or_none()

    if not sv:
        raise HTTPException(404, "Step version not found")

    # Update the output image fields in place
    if sv.output is None:
        sv.output = {}

    sv.output["s3_uris"] = body.s3_uris
    if body.artifact_refs is not None:
        sv.output["artifactRefs"] = body.artifact_refs

    # Update counts
    if isinstance(sv.output.get("counts"), dict):
        sv.output["counts"]["files"] = len(body.s3_uris)

    sv.updated_at = datetime.now(timezone.utc)
    await sv.save()

    return {
        "step_version_id": str(sv.id),
        "step_key": sv.step_key,
        "version_no": sv.version_no,
        "s3_uris_count": len(body.s3_uris),
    }


# ══════════════════════════════════════════════════════════════
#  STEP GENERATE — trigger pipeline step execution
# ══════════════════════════════════════════════════════════════

@router.post("/{execution_id}/steps/{step_key}/generate")
async def generate_step(
    execution_id: str,
    step_key: str,
    body: GenerateStepBody,
    user: User = Depends(get_current_user),
):
    """Trigger generation of a pipeline step via SQS."""
    try:
        result = await WorkflowEngine.generate_step(
            execution_id=execution_id,
            step_key=step_key,
            user_id=str(user.id),
            org_id=body.org_id or str(user.organizationId or ""),
            project_id=body.project_id or "",
            episode_id=body.episode_id or "",
            part_id=body.part_id or "",
        )
    except ValueError as e:
        raise HTTPException(400, str(e))
    return result


# ══════════════════════════════════════════════════════════════
#  STEP APPROVE — mark step as approved, allow next step
# ══════════════════════════════════════════════════════════════

@router.post("/{execution_id}/steps/{step_key}/approve")
async def approve_step(
    execution_id: str,
    step_key: str,
    body: ApproveStepBody = ApproveStepBody(),
    user: User = Depends(get_current_user),
):
    """Approve a completed step, allowing the next step to proceed."""
    try:
        result = await WorkflowEngine.approve_step(
            execution_id=execution_id,
            step_key=step_key,
            user_id=str(user.id),
            org_id=body.org_id or str(user.organizationId or ""),
            project_id=body.project_id or "",
            episode_id=body.episode_id or "",
            part_id=body.part_id or "",
        )
    except ValueError as e:
        raise HTTPException(400, str(e))
    return result


# ══════════════════════════════════════════════════════════════
#  MESSAGES
# ══════════════════════════════════════════════════════════════

@router.get("/{execution_id}/messages")
async def get_messages(
    execution_id: str,
    step_key: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    user: User = Depends(get_current_user),
):
    """Get conversation messages for an execution, optionally filtered by step."""
    _, ctx_id = await _resolve_ctx_id(execution_id)
    query: dict = {"executionId": ctx_id}
    if step_key:
        query["stepKey"] = step_key

    messages = await Message.find(query).sort("createdAt").limit(limit).to_list()

    return [
        {
            "id": str(m.id),
            "execution_id": m.execution_id,
            "step_key": m.step_key,
            "org_id": m.org_id,
            "project_id": m.project_id,
            "episode_id": m.episode_id,
            "part_id": m.part_id,
            "action": m.action,
            "prompt": m.prompt,
            "user_id": m.user_id,
            "created_at": m.created_at.isoformat(),
        }
        for m in messages
    ]


@router.post("/{execution_id}/messages")
async def create_message(
    execution_id: str,
    body: CreateMessageBody,
    user: User = Depends(get_current_user),
):
    """Add a message to the conversation."""
    execution, ctx_id = await _resolve_ctx_id(execution_id)

    msg = Message(
        execution_id=str(ctx_id),
        step_key=body.step_key or [],
        org_id=body.org_id or "",
        project_id=body.project_id or "",
        episode_id=body.episode_id or "",
        part_id=body.part_id or "",
        action=body.action,
        prompt=body.prompt,
        user_id=str(user.id),
    )
    await msg.insert()

    return {
        "id": str(msg.id),
        "execution_id": msg.execution_id,
        "step_key": msg.step_key,
        "action": msg.action,
        "created_at": msg.created_at.isoformat(),
    }


# ══════════════════════════════════════════════════════════════
#  STEP VERSION DIRECT LOOKUP
# ══════════════════════════════════════════════════════════════

@router.get("/step-versions/{version_id}")
async def get_step_version_by_id(
    version_id: str,
    user: User = Depends(get_current_user),
):
    """Fetch a single step version by its Mongo _id."""
    sv = await StepVersion.get(version_id)
    if not sv:
        raise HTTPException(404, "Step version not found")

    return {
        "step_version_id": str(sv.id),
        "execution_id": str(sv.execution_id) if sv.execution_id else None,
        "step_key": sv.step_key,
        "version_no": sv.version_no,
        "status": sv.status,
        "is_approved": bool(getattr(sv, "is_approved", False)),
        "lineage": sv.lineage.model_dump(by_alias=True, mode="json") if sv.lineage else None,
        "output": _convert_s3_uris_in_output(sv.output),
        "error": sv.error,
        "created_at": sv.created_at.isoformat(),
    }


# ══════════════════════════════════════════════════════════════
#  SHOTS / CLIPS — independent collections (not stepVersion blobs)
# ══════════════════════════════════════════════════════════════

# shots/clips use optional authentication — they work for both authenticated
# and anonymous users. If a valid token is provided, we track the user.
@router.get("/{execution_id}/shots")
async def get_shots(
    execution_id: str,
    part_id: Optional[str] = None,
    latest_only: bool = Query(True),
    user: Optional[User] = Depends(get_current_user_optional),
):
    """Get shot rows for an execution from the independent `shots` collection."""
    _, ctx_id = await _resolve_ctx_id(execution_id)
    ctx_str = str(ctx_id)

    # Use raw collection reads to avoid strict model parsing failures from
    # legacy/partial rows while keeping endpoint behavior stable.
    exec_or: List[Dict[str, Any]] = [
        {"executionId": ctx_id},
        {"executionId": ctx_str},
        {"execution_id": ctx_str},
    ]
    if part_id:
        query: Dict[str, Any] = {
            "$and": [
                {"$or": exec_or},
                {"$or": [{"partId": part_id}, {"part_id": part_id}]},
            ]
        }
    else:
        query = {"$or": exec_or}

    coll = Shot.get_pymongo_collection()
    rows = await coll.find(query).sort([("updatedAt", -1), ("version", -1)]).to_list(length=None)
    rows = [_normalize_shot_row(row) for row in rows]
    rows = [row for row in rows if row.get("shotId") and row.get("sequenceNo") is not None]

    if latest_only:
        latest_by_shot: Dict[str, Dict[str, Any]] = {}
        for row in rows:
            shot_key = str(row.get("shotId") or "")
            if shot_key and shot_key not in latest_by_shot:
                latest_by_shot[shot_key] = row
        rows = list(latest_by_shot.values())

    rows.sort(key=lambda r: (int(r.get("sequenceNo") or 0), str(r.get("shotId") or "")))

    out: List[Dict[str, Any]] = []
    for row in rows:
        d = _to_jsonable(row)
        d["id"] = str(d.pop("_id")) if d.get("_id") else None
        if not d.get("executionId") and d.get("execution_id"):
            d["executionId"] = d.get("execution_id")
        if not d.get("partId") and d.get("part_id"):
            d["partId"] = d.get("part_id")
        d["executionId"] = str(d.get("executionId")) if d.get("executionId") else None
        out.append(d)
    return out


@router.get("/{execution_id}/clips")
async def get_clips(
    execution_id: str,
    part_id: Optional[str] = None,
    latest_only: bool = Query(True),
    user: Optional[User] = Depends(get_current_user_optional),
):
    """Get clip rows for an execution from the independent `clips` collection."""
    _, ctx_id = await _resolve_ctx_id(execution_id)
    ctx_str = str(ctx_id)

    # Use raw collection reads to avoid strict model parsing failures from
    # legacy/partial rows while keeping endpoint behavior stable.
    exec_or: List[Dict[str, Any]] = [
        {"executionId": ctx_id},
        {"executionId": ctx_str},
        {"execution_id": ctx_str},
    ]
    if part_id:
        query: Dict[str, Any] = {
            "$and": [
                {"$or": exec_or},
                {"$or": [{"partId": part_id}, {"part_id": part_id}]},
            ]
        }
    else:
        query = {"$or": exec_or}

    coll = Clip.get_pymongo_collection()
    rows = await coll.find(query).sort([("updatedAt", -1), ("version", -1)]).to_list(length=None)
    rows = [_normalize_clip_row(row) for row in rows]
    rows = [row for row in rows if row.get("clipId") and row.get("sequenceNo") is not None]

    if latest_only:
        latest_by_clip: Dict[str, Dict[str, Any]] = {}
        for row in rows:
            clip_key = str(row.get("clipId") or "")
            if clip_key and clip_key not in latest_by_clip:
                latest_by_clip[clip_key] = row
        rows = list(latest_by_clip.values())

    rows.sort(key=lambda r: (int(r.get("sequenceNo") or 0), str(r.get("clipId") or "")))

    out: List[Dict[str, Any]] = []
    for row in rows:
        d = _to_jsonable(row)
        d["id"] = str(d.pop("_id")) if d.get("_id") else None
        if not d.get("executionId") and d.get("execution_id"):
            d["executionId"] = d.get("execution_id")
        if not d.get("partId") and d.get("part_id"):
            d["partId"] = d.get("part_id")
        d["executionId"] = str(d.get("executionId")) if d.get("executionId") else None
        out.append(d)
    return out


# ══════════════════════════════════════════════════════════════
#  CHARACTERS / LOCATIONS — independent collections
# ══════════════════════════════════════════════════════════════

def _normalize_media_refs(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Convert nested `s3_uri` values to browser-safe URLs in-place copy."""
    out = deepcopy(doc)

    def _fix_media_list(items: Any):
        if not isinstance(items, list):
            return
        for m in items:
            if isinstance(m, dict) and m.get("s3_uri"):
                m["s3_uri"] = _s3uri_to_url(m["s3_uri"])

    _fix_media_list(out.get("anchor_images"))
    _fix_media_list(out.get("view_pack_images"))
    if isinstance(out.get("collage_image"), dict) and out["collage_image"].get("s3_uri"):
        out["collage_image"]["s3_uri"] = _s3uri_to_url(out["collage_image"]["s3_uri"])

    return out


def _to_jsonable(value: Any) -> Any:
    """Recursively convert BSON/Python values into JSON-safe values."""
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, list):
        return [_to_jsonable(v) for v in value]
    if isinstance(value, dict):
        return {k: _to_jsonable(v) for k, v in value.items()}
    return value


def _deep_convert_s3_uris(value: Any) -> Any:
    """Recursively convert `s3://...` strings into browser-safe URLs."""
    if isinstance(value, str):
        return _s3uri_to_url(value) if value.startswith("s3://") else value
    if isinstance(value, list):
        return [_deep_convert_s3_uris(v) for v in value]
    if isinstance(value, dict):
        return {k: _deep_convert_s3_uris(v) for k, v in value.items()}
    return value


def _normalize_shot_row(row: Dict[str, Any]) -> Dict[str, Any]:
    """Map legacy snake_case shot docs to current camelCase response shape."""
    d = dict(row)
    if not d.get("shotId") and d.get("shot_id"):
        d["shotId"] = d.get("shot_id")
    if not d.get("shotId") and d.get("shot_number") is not None:
        try:
            d["shotId"] = f"shot_{int(d.get('shot_number')):02d}"
        except Exception:
            d["shotId"] = str(d.get("shot_number"))
    if d.get("sequenceNo") is None and d.get("sequence_no") is not None:
        d["sequenceNo"] = d.get("sequence_no")
    if d.get("sequenceNo") is None and d.get("shot_number") is not None:
        d["sequenceNo"] = d.get("shot_number")

    if d.get("shotMetadata") is None and isinstance(d.get("shot_metadata"), dict):
        m = dict(d.get("shot_metadata") or {})
        if "shot_number" in m and "shotNumber" not in m:
            m["shotNumber"] = m.get("shot_number")
        if "beat_number" in m and "beatNumber" not in m:
            m["beatNumber"] = m.get("beat_number")
        d["shotMetadata"] = m
    if d.get("shotMetadata") is None and d.get("shot_number") is not None:
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

    return _deep_convert_s3_uris(d)


def _normalize_clip_row(row: Dict[str, Any]) -> Dict[str, Any]:
    """Map legacy snake_case clip docs to current camelCase response shape."""
    d = dict(row)
    if not d.get("clipId") and d.get("clip_id"):
        d["clipId"] = d.get("clip_id")
    if not d.get("shotId") and d.get("shot_id"):
        d["shotId"] = d.get("shot_id")
    if d.get("sequenceNo") is None and d.get("sequence_no") is not None:
        d["sequenceNo"] = d.get("sequence_no")
    if d.get("sequenceNo") is None and d.get("shot_number") is not None:
        d["sequenceNo"] = d.get("shot_number")
    if d.get("animationPrompt") is None and d.get("animation_prompt"):
        d["animationPrompt"] = d.get("animation_prompt")
    if not d.get("shotId") and d.get("shot_number") is not None:
        try:
            d["shotId"] = f"shot_{int(d.get('shot_number')):02d}"
        except Exception:
            d["shotId"] = str(d.get("shot_number"))
    if not d.get("clipId"):
        if d.get("clip_id"):
            d["clipId"] = d.get("clip_id")
        elif d.get("shotId") and d.get("version") is not None:
            d["clipId"] = f"{d.get('shotId')}_v{d.get('version')}"
        elif d.get("shotId"):
            d["clipId"] = f"{d.get('shotId')}_clip"

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

    return _deep_convert_s3_uris(d)


def _character_identity_key(row: Character) -> str:
    d = row.character_description or {}
    return str(
        d.get("character_id")
        or d.get("name_identifier")
        or d.get("name_id")
        or d.get("display_name")
        or d.get("character_name")
        or row.id
    )


def _location_identity_key(row: Location) -> str:
    d = row.location_description or {}
    return str(
        d.get("location_id")
        or d.get("name_identifier")
        or d.get("name_id")
        or d.get("name")
        or d.get("location_name")
        or d.get("display_name")
        or row.id
    )


async def _all_latest_characters_approved(ctx_id: str) -> bool:
    rows = await Character.find({"$or": [{"execution_id": ctx_id}, {"executionId": ctx_id}]}).sort([("version", -1)]).to_list()
    latest: Dict[str, Character] = {}
    for row in rows:
        key = _character_identity_key(row)
        if key not in latest:
            latest[key] = row
    return bool(latest) and all(bool(getattr(r, "is_approved", False)) for r in latest.values())


async def _all_latest_locations_approved(ctx_id: str) -> bool:
    rows = await Location.find({"$or": [{"execution_id": ctx_id}, {"executionId": ctx_id}]}).sort([("version", -1)]).to_list()
    latest: Dict[str, Location] = {}
    for row in rows:
        key = _location_identity_key(row)
        if key not in latest:
            latest[key] = row
    return bool(latest) and all(bool(getattr(r, "is_approved", False)) for r in latest.values())


async def _all_latest_shots_approved(ctx_id: str) -> bool:
    """Returns True when every shotId group has at least one approved version."""
    rows = await Shot.find({"executionId": PydanticObjectId(ctx_id)}).to_list()
    if not rows:
        return False
    groups: Dict[str, bool] = {}
    for row in rows:
        key = str(getattr(row, "shot_id", "") or "")
        if not key:
            continue
        if key not in groups:
            groups[key] = False
        if bool(getattr(row, "is_approved", False)):
            groups[key] = True
    return bool(groups) and all(groups.values())


async def _all_latest_clips_approved(ctx_id: str) -> bool:
    rows = await Clip.find({"executionId": PydanticObjectId(ctx_id)}).sort([("version", -1)]).to_list()
    latest: Dict[str, Clip] = {}
    for row in rows:
        key = str(getattr(row, "clip_id", "") or "")
        if key and key not in latest:
            latest[key] = row
    return bool(latest) and all(bool(getattr(r, "is_approved", False)) for r in latest.values())


@router.get("/{execution_id}/characters")
async def get_characters(
    execution_id: str,
    part_id: Optional[str] = None,
    latest_only: bool = Query(True),
    user: Optional[User] = Depends(get_current_user_optional),
):
    """Get character rows for an execution from the `characters` collection."""
    _, ctx_id = await _resolve_ctx_id(execution_id)
    ctx_str = str(ctx_id)

    query_or: List[Dict[str, Any]] = [{"execution_id": ctx_str}, {"executionId": ctx_str}]
    if part_id:
        query_or = [
            {"execution_id": ctx_str, "part_id": part_id},
            {"executionId": ctx_str, "partId": part_id},
            {"execution_id": ctx_str, "partId": part_id},
            {"executionId": ctx_str, "part_id": part_id},
        ]

    rows = await Character.find({"$or": query_or}).sort([("version", -1), ("updated_at", -1)]).to_list()

    if latest_only:
        latest_by_entity: Dict[str, Character] = {}
        for row in rows:
            key = _character_identity_key(row)
            if key not in latest_by_entity:
                latest_by_entity[key] = row
        rows = list(latest_by_entity.values())

    out: List[Dict[str, Any]] = []
    for row in rows:
        d = _to_jsonable(row.model_dump(mode="python"))
        d["id"] = str(row.id)
        d = _normalize_media_refs(d)
        out.append(d)
    return out


@router.get("/{execution_id}/locations")
async def get_locations(
    execution_id: str,
    part_id: Optional[str] = None,
    latest_only: bool = Query(True),
    user: Optional[User] = Depends(get_current_user_optional),
):
    """Get location rows for an execution from the `locations` collection."""
    _, ctx_id = await _resolve_ctx_id(execution_id)
    ctx_str = str(ctx_id)

    query_or: List[Dict[str, Any]] = [{"execution_id": ctx_str}, {"executionId": ctx_str}]
    if part_id:
        query_or = [
            {"execution_id": ctx_str, "part_id": part_id},
            {"executionId": ctx_str, "partId": part_id},
            {"execution_id": ctx_str, "partId": part_id},
            {"executionId": ctx_str, "part_id": part_id},
        ]

    rows = await Location.find({"$or": query_or}).sort([("version", -1), ("updated_at", -1)]).to_list()

    if latest_only:
        latest_by_entity: Dict[str, Location] = {}
        for row in rows:
            key = _location_identity_key(row)
            if key not in latest_by_entity:
                latest_by_entity[key] = row
        rows = list(latest_by_entity.values())

    out: List[Dict[str, Any]] = []
    for row in rows:
        d = _to_jsonable(row.model_dump(mode="python"))
        d["id"] = str(row.id)
        d = _normalize_media_refs(d)
        out.append(d)
    return out


class UpdateCharacterBody(BaseModel):
    character_description: Optional[Dict[str, Any]] = None
    anchor_images: Optional[List[Dict[str, Any]]] = None
    view_pack_images: Optional[List[Dict[str, Any]]] = None
    collage_image: Optional[Dict[str, Any]] = None
    character_camera_library: Optional[Dict[str, Any]] = None
    status: Optional[str] = None
    is_approved: Optional[bool] = None


@router.patch("/{execution_id}/characters/{character_doc_id}")
async def update_character(
    execution_id: str,
    character_doc_id: str,
    body: UpdateCharacterBody,
    user: User = Depends(get_current_user),
):
    """Edit a character row -> inserts a new Character version document."""
    _, ctx_id = await _resolve_ctx_id(execution_id)

    try:
        doc_oid = PydanticObjectId(character_doc_id)
    except Exception:
        raise HTTPException(400, "Invalid character_doc_id — must be a valid ObjectId")

    latest = await Character.get(doc_oid)
    if not latest:
        raise HTTPException(404, f"Character '{character_doc_id}' not found")

    latest_exec_id = str(getattr(latest, "execution_id", "") or "")
    if latest_exec_id and latest_exec_id != str(ctx_id):
        raise HTTPException(404, f"Character '{character_doc_id}' not found in this execution")

    new_doc = deepcopy(latest)
    new_doc.id = None
    new_doc.version = int(latest.version or 1) + 1
    new_doc.updated_at = datetime.now(timezone.utc)

    if body.character_description is not None:
        new_doc.character_description = body.character_description
    if body.anchor_images is not None:
        new_doc.anchor_images = body.anchor_images
    if body.view_pack_images is not None:
        new_doc.view_pack_images = body.view_pack_images
    if body.collage_image is not None:
        new_doc.collage_image = body.collage_image
    if body.character_camera_library is not None:
        new_doc.character_camera_library = body.character_camera_library
    if body.status is not None:
        new_doc.status = body.status
    if body.is_approved is not None:
        new_doc.is_approved = body.is_approved

    await new_doc.insert()

    d = _normalize_media_refs(_to_jsonable(new_doc.model_dump(mode="python")))
    d["id"] = str(new_doc.id)
    return d


@router.get("/{execution_id}/characters/{character_key}/versions")
async def get_character_versions(
    execution_id: str,
    character_key: str,
    user: User = Depends(get_current_user),
):
    """Return all versions of a character identity, oldest first."""
    _, ctx_id = await _resolve_ctx_id(execution_id)
    rows = await Character.find({"$or": [{"execution_id": str(ctx_id)}, {"executionId": str(ctx_id)}]}).sort([("version", 1)]).to_list()

    out: List[Dict[str, Any]] = []
    for row in rows:
        if _character_identity_key(row) != character_key:
            continue
        d = _normalize_media_refs(_to_jsonable(row.model_dump(mode="python")))
        d["id"] = str(row.id)
        out.append(d)
    return out


@router.post("/{execution_id}/characters/{character_doc_id}/approve")
async def approve_character_version(
    execution_id: str,
    character_doc_id: str,
    user: User = Depends(get_current_user),
):
    """Mark a specific Character version as approved; un-approve sibling versions."""
    _, ctx_id = await _resolve_ctx_id(execution_id)

    try:
        doc_oid = PydanticObjectId(character_doc_id)
    except Exception:
        raise HTTPException(400, "Invalid character_doc_id — must be a valid ObjectId")

    target = await Character.get(doc_oid)
    if not target:
        raise HTTPException(404, f"Character version '{character_doc_id}' not found")
    target_exec_id = str(getattr(target, "execution_id", "") or "")
    if target_exec_id and target_exec_id != str(ctx_id):
        raise HTTPException(404, f"Character version '{character_doc_id}' not found in this execution")

    key = _character_identity_key(target)
    now = datetime.now(timezone.utc)

    rows = await Character.find({"$or": [{"execution_id": str(ctx_id)}, {"executionId": str(ctx_id)}]}).to_list()
    sibling_ids = [r.id for r in rows if _character_identity_key(r) == key]
    if sibling_ids:
        await Character.find({"_id": {"$in": sibling_ids}}).update({"$set": {"is_approved": False, "updated_at": now}})

    await Character.find_one({"_id": doc_oid}).update({"$set": {"is_approved": True, "updated_at": now}})
    await target.sync()
    d = _normalize_media_refs(_to_jsonable(target.model_dump(mode="python")))
    d["id"] = str(target.id)

    if await _all_latest_characters_approved(str(ctx_id)):
        try:
            workflow_result = await WorkflowEngine.approve_step(
                execution_id=str(ctx_id),
                step_key="generate_view_pack_images_for_character",
                user_id=str(user.id),
                org_id=str(getattr(target, "org_id", "") or ""),
                project_id=str(getattr(target, "project_id", "") or ""),
                episode_id=str(getattr(target, "episode_id", "") or ""),
                part_id=str(getattr(target, "part_id", "") or ""),
            )
            d["workflow_advanced"] = True
            d["workflow"] = workflow_result
        except Exception:
            d["workflow_advanced"] = False

    return d


class UpdateLocationBody(BaseModel):
    location_description: Optional[Dict[str, Any]] = None
    anchor_images: Optional[List[Dict[str, Any]]] = None
    view_pack_images: Optional[List[Dict[str, Any]]] = None
    collage_image: Optional[Dict[str, Any]] = None
    location_camera_library: Optional[Dict[str, Any]] = None
    status: Optional[str] = None
    is_approved: Optional[bool] = None


@router.patch("/{execution_id}/locations/{location_doc_id}")
async def update_location(
    execution_id: str,
    location_doc_id: str,
    body: UpdateLocationBody,
    user: User = Depends(get_current_user),
):
    """Edit a location row -> inserts a new Location version document."""
    _, ctx_id = await _resolve_ctx_id(execution_id)

    try:
        doc_oid = PydanticObjectId(location_doc_id)
    except Exception:
        raise HTTPException(400, "Invalid location_doc_id — must be a valid ObjectId")

    latest = await Location.get(doc_oid)
    if not latest:
        raise HTTPException(404, f"Location '{location_doc_id}' not found")

    latest_exec_id = str(getattr(latest, "execution_id", "") or "")
    if latest_exec_id and latest_exec_id != str(ctx_id):
        raise HTTPException(404, f"Location '{location_doc_id}' not found in this execution")

    new_doc = deepcopy(latest)
    new_doc.id = None
    new_doc.version = int(latest.version or 1) + 1
    new_doc.updated_at = datetime.now(timezone.utc)

    if body.location_description is not None:
        new_doc.location_description = body.location_description
    if body.anchor_images is not None:
        new_doc.anchor_images = body.anchor_images
    if body.view_pack_images is not None:
        new_doc.view_pack_images = body.view_pack_images
    if body.collage_image is not None:
        new_doc.collage_image = body.collage_image
    if body.location_camera_library is not None:
        new_doc.location_camera_library = body.location_camera_library
    if body.status is not None:
        new_doc.status = body.status
    if body.is_approved is not None:
        new_doc.is_approved = body.is_approved

    await new_doc.insert()

    d = _normalize_media_refs(_to_jsonable(new_doc.model_dump(mode="python")))
    d["id"] = str(new_doc.id)
    return d


@router.get("/{execution_id}/locations/{location_key}/versions")
async def get_location_versions(
    execution_id: str,
    location_key: str,
    user: User = Depends(get_current_user),
):
    """Return all versions of a location identity, oldest first."""
    _, ctx_id = await _resolve_ctx_id(execution_id)
    rows = await Location.find({"$or": [{"execution_id": str(ctx_id)}, {"executionId": str(ctx_id)}]}).sort([("version", 1)]).to_list()

    out: List[Dict[str, Any]] = []
    for row in rows:
        if _location_identity_key(row) != location_key:
            continue
        d = _normalize_media_refs(_to_jsonable(row.model_dump(mode="python")))
        d["id"] = str(row.id)
        out.append(d)
    return out


@router.post("/{execution_id}/locations/{location_doc_id}/approve")
async def approve_location_version(
    execution_id: str,
    location_doc_id: str,
    user: User = Depends(get_current_user),
):
    """Mark a specific Location version as approved; un-approve sibling versions."""
    _, ctx_id = await _resolve_ctx_id(execution_id)

    try:
        doc_oid = PydanticObjectId(location_doc_id)
    except Exception:
        raise HTTPException(400, "Invalid location_doc_id — must be a valid ObjectId")

    target = await Location.get(doc_oid)
    if not target:
        raise HTTPException(404, f"Location version '{location_doc_id}' not found")
    target_exec_id = str(getattr(target, "execution_id", "") or "")
    if target_exec_id and target_exec_id != str(ctx_id):
        raise HTTPException(404, f"Location version '{location_doc_id}' not found in this execution")

    key = _location_identity_key(target)
    now = datetime.now(timezone.utc)

    rows = await Location.find({"$or": [{"execution_id": str(ctx_id)}, {"executionId": str(ctx_id)}]}).to_list()
    sibling_ids = [r.id for r in rows if _location_identity_key(r) == key]
    if sibling_ids:
        await Location.find({"_id": {"$in": sibling_ids}}).update({"$set": {"is_approved": False, "updated_at": now}})

    await Location.find_one({"_id": doc_oid}).update({"$set": {"is_approved": True, "updated_at": now}})
    await target.sync()
    d = _normalize_media_refs(_to_jsonable(target.model_dump(mode="python")))
    d["id"] = str(target.id)

    if await _all_latest_locations_approved(str(ctx_id)):
        try:
            workflow_result = await WorkflowEngine.approve_step(
                execution_id=str(ctx_id),
                step_key="generate_view_pack_images_for_key_location",
                user_id=str(user.id),
                org_id=str(getattr(target, "org_id", "") or ""),
                project_id=str(getattr(target, "project_id", "") or ""),
                episode_id=str(getattr(target, "episode_id", "") or ""),
                part_id=str(getattr(target, "part_id", "") or ""),
            )
            d["workflow_advanced"] = True
            d["workflow"] = workflow_result
        except Exception:
            d["workflow_advanced"] = False

    return d


# ══════════════════════════════════════════════════════════════
#  SHOTS — update (creates new version) + version history
# ══════════════════════════════════════════════════════════════

class UpdateShotBody(BaseModel):
    """Partial field update for a Shot — inserts a new version document."""
    one_liner_shot_intent: Optional[str] = None
    start_image_prompt:    Optional[str] = None
    animation_prompt:      Optional[str] = None
    is_approved:           Optional[bool] = None
    start_image:           Optional[Dict[str, Any]] = None
    character_references:  Optional[List[Dict[str, Any]]] = None
    location_references:   Optional[List[Dict[str, Any]]] = None
    previous_references:   Optional[List[Dict[str, Any]]] = None
    shot_metadata:         Optional[Dict[str, Any]] = None


@router.patch("/{execution_id}/shots/{shot_id}")
async def update_shot(
    execution_id: str,
    shot_id: str,
    body: UpdateShotBody,
    user: User = Depends(get_current_user),
):
    """Edit a shot's fields → inserts a new Shot version, returns updated doc."""
    _, ctx_id = await _resolve_ctx_id(execution_id)

    rows = await Shot.find(
        {"executionId": ctx_id, "shotId": shot_id}
    ).sort([("version", -1)]).to_list()

    if not rows:
        raise HTTPException(404, f"Shot '{shot_id}' not found for execution '{execution_id}'")

    latest = rows[0]
    new_shot = deepcopy(latest)
    new_shot.id = None          # let Beanie generate a new _id
    new_shot.version = latest.version + 1
    new_shot.updated_at = datetime.now(timezone.utc)

    if body.one_liner_shot_intent is not None:
        new_shot.one_liner_shot_intent = body.one_liner_shot_intent
    if body.start_image_prompt is not None:
        new_shot.start_image_prompt = body.start_image_prompt
    if body.animation_prompt is not None:
        new_shot.animation_prompt = body.animation_prompt
    if body.is_approved is not None:
        new_shot.is_approved = body.is_approved
    if body.shot_metadata is not None:
        from app.models.shot import ShotMetadata
        new_shot.shot_metadata = ShotMetadata(**body.shot_metadata)
    if body.character_references is not None:
        from app.models.shot import CharacterReference
        new_shot.character_references = [CharacterReference.model_validate(r) for r in body.character_references]
    if body.location_references is not None:
        from app.models.shot import LocationReference
        new_shot.location_references = [LocationReference.model_validate(r) for r in body.location_references]

    await new_shot.insert()

    d = new_shot.model_dump(by_alias=True, mode="json")
    d["id"] = str(new_shot.id)
    d["executionId"] = str(new_shot.execution_id) if new_shot.execution_id else None
    return d


@router.get("/{execution_id}/shots/{shot_id}/versions")
async def get_shot_versions(
    execution_id: str,
    shot_id: str,
    user: User = Depends(get_current_user),
):
    """Return all versions of a shot, oldest first."""
    _, ctx_id = await _resolve_ctx_id(execution_id)

    rows = await Shot.find(
        {"executionId": ctx_id, "shotId": shot_id}
    ).sort([("version", 1)]).to_list()

    out = []
    for row in rows:
        d = row.model_dump(by_alias=True, mode="json")
        d["id"] = str(row.id)
        d["executionId"] = str(row.execution_id) if row.execution_id else None
        out.append(d)
    return out


# ══════════════════════════════════════════════════════════════
#  CLIPS — update (creates new version) + version history
# ══════════════════════════════════════════════════════════════

class UpdateClipBody(BaseModel):
    """Partial field update for a Clip — inserts a new version document."""
    animation_prompt: Optional[str] = None
    is_approved:      Optional[bool] = None
    clip_output:      Optional[Dict[str, Any]] = None
    input_images:     Optional[List[Dict[str, Any]]] = None


@router.patch("/{execution_id}/clips/{clip_id}")
async def update_clip(
    execution_id: str,
    clip_id: str,
    body: UpdateClipBody,
    user: User = Depends(get_current_user),
):
    """Edit a clip's fields → inserts a new Clip version, returns updated doc."""
    _, ctx_id = await _resolve_ctx_id(execution_id)

    rows = await Clip.find(
        {"executionId": ctx_id, "clipId": clip_id}
    ).sort([("version", -1)]).to_list()

    if not rows:
        raise HTTPException(404, f"Clip '{clip_id}' not found for execution '{execution_id}'")

    latest = rows[0]
    new_clip = deepcopy(latest)
    new_clip.id = None
    new_clip.version = latest.version + 1
    new_clip.updated_at = datetime.now(timezone.utc)

    if body.animation_prompt is not None:
        new_clip.animation_prompt = body.animation_prompt
    if body.is_approved is not None:
        new_clip.is_approved = body.is_approved
    if body.input_images is not None:
        from app.models.clip import ClipMediaRef
        new_clip.input_images = [ClipMediaRef.model_validate(img) for img in body.input_images]

    await new_clip.insert()

    d = new_clip.model_dump(by_alias=True, mode="json")
    d["id"] = str(new_clip.id)
    d["executionId"] = str(new_clip.execution_id) if new_clip.execution_id else None
    return d


@router.get("/{execution_id}/clips/{clip_id}/versions")
async def get_clip_versions(
    execution_id: str,
    clip_id: str,
    user: User = Depends(get_current_user),
):
    """Return all versions of a clip, oldest first."""
    _, ctx_id = await _resolve_ctx_id(execution_id)

    rows = await Clip.find(
        {"executionId": ctx_id, "clipId": clip_id}
    ).sort([("version", 1)]).to_list()

    out = []
    for row in rows:
        d = row.model_dump(by_alias=True, mode="json")
        d["id"] = str(row.id)
        d["executionId"] = str(row.execution_id) if row.execution_id else None
        out.append(d)
    return out


# ══════════════════════════════════════════════════════════════
#  SHOTS / CLIPS — approve a specific version in-place
#  (no new version created; sibling versions are un-approved)
# ══════════════════════════════════════════════════════════════

@router.post("/{execution_id}/shots/{shot_doc_id}/approve")
async def approve_shot_version(
    execution_id: str,
    shot_doc_id: str,
    user: User = Depends(get_current_user),
):
    """Mark a specific Shot version as the approved one.
    All other versions sharing the same shotId are un-approved first.
    Returns the approved document."""
    _, ctx_id = await _resolve_ctx_id(execution_id)

    try:
        doc_oid = PydanticObjectId(shot_doc_id)
    except Exception:
        raise HTTPException(400, "Invalid shot_doc_id — must be a valid ObjectId")

    target = await Shot.get(doc_oid)
    if not target or str(target.execution_id) != str(ctx_id):
        raise HTTPException(404, f"Shot version '{shot_doc_id}' not found in this execution")

    now = datetime.now(timezone.utc)

    # Approve the specific version (multiple versions per shotId may be approved)
    await Shot.find_one({"_id": doc_oid}).update(
        {"$set": {"isApproved": True, "updatedAt": now}}
    )

    # Reload and return
    await target.sync()
    d = target.model_dump(by_alias=True, mode="json")
    d["id"] = str(target.id)
    d["executionId"] = str(target.execution_id) if target.execution_id else None

    if await _all_latest_shots_approved(str(ctx_id)):
        try:
            workflow_result = await WorkflowEngine.approve_step(
                execution_id=str(ctx_id),
                step_key="generate_images_nano_banana",
                user_id=str(user.id),
                org_id=str(getattr(target, "org_id", "") or ""),
                project_id=str(getattr(target, "project_id", "") or ""),
                episode_id=str(getattr(target, "episode_id", "") or ""),
                part_id=str(getattr(target, "part_id", "") or ""),
            )
            d["workflow_advanced"] = True
            d["workflow"] = workflow_result
        except Exception:
            d["workflow_advanced"] = False

    return d


@router.post("/{execution_id}/shots/{shot_doc_id}/unapprove")
async def unapprove_shot_version(
    execution_id: str,
    shot_doc_id: str,
    user: User = Depends(get_current_user),
):
    """Remove approval from a specific Shot version. Returns the updated document."""
    _, ctx_id = await _resolve_ctx_id(execution_id)

    try:
        doc_oid = PydanticObjectId(shot_doc_id)
    except Exception:
        raise HTTPException(400, "Invalid shot_doc_id — must be a valid ObjectId")

    target = await Shot.get(doc_oid)
    if not target or str(target.execution_id) != str(ctx_id):
        raise HTTPException(404, f"Shot version '{shot_doc_id}' not found in this execution")

    now = datetime.now(timezone.utc)
    await Shot.find_one({"_id": doc_oid}).update(
        {"$set": {"isApproved": False, "updatedAt": now}}
    )

    await target.sync()
    d = target.model_dump(by_alias=True, mode="json")
    d["id"] = str(target.id)
    d["executionId"] = str(target.execution_id) if target.execution_id else None
    return d


@router.post("/{execution_id}/clips/{clip_doc_id}/approve")
async def approve_clip_version(
    execution_id: str,
    clip_doc_id: str,
    user: User = Depends(get_current_user),
):
    """Mark a specific Clip version as the approved one.
    All other versions sharing the same clipId are un-approved first.
    Returns the approved document."""
    _, ctx_id = await _resolve_ctx_id(execution_id)

    try:
        doc_oid = PydanticObjectId(clip_doc_id)
    except Exception:
        raise HTTPException(400, "Invalid clip_doc_id — must be a valid ObjectId")

    target = await Clip.get(doc_oid)
    if not target or str(target.execution_id) != str(ctx_id):
        raise HTTPException(404, f"Clip version '{clip_doc_id}' not found in this execution")

    now = datetime.now(timezone.utc)

    # Un-approve ALL versions of this clipId in this execution
    await Clip.find(
        {"executionId": ctx_id, "clipId": target.clip_id}
    ).update({"$set": {"isApproved": False, "updatedAt": now}})

    # Approve the specific version
    await Clip.find_one({"_id": doc_oid}).update(
        {"$set": {"isApproved": True, "updatedAt": now}}
    )

    # Reload and return
    await target.sync()
    d = target.model_dump(by_alias=True, mode="json")
    d["id"] = str(target.id)
    d["executionId"] = str(target.execution_id) if target.execution_id else None

    if await _all_latest_clips_approved(str(ctx_id)):
        try:
            workflow_result = await WorkflowEngine.approve_step(
                execution_id=str(ctx_id),
                step_key="generate_animations",
                user_id=str(user.id),
                org_id=str(getattr(target, "org_id", "") or ""),
                project_id=str(getattr(target, "project_id", "") or ""),
                episode_id=str(getattr(target, "episode_id", "") or ""),
                part_id=str(getattr(target, "part_id", "") or ""),
            )
            d["workflow_advanced"] = True
            d["workflow"] = workflow_result
        except Exception:
            d["workflow_advanced"] = False

    return d


# ══════════════════════════════════════════════════════════════
#  SHOTS — iterate (refine with instruction) & retry (re-generate)
# ══════════════════════════════════════════════════════════════

@router.post("/{execution_id}/shots/{shot_doc_id}/iterate")
async def iterate_shot(
    execution_id: str,
    shot_doc_id: str,
    body: ShotIterateBody,
    user: User = Depends(get_current_user),
):
    """Iterate a specific shot with a text instruction.

    Builds an SQS message with action='iterate' and an iterate_payload
    containing the shot metadata and instruction.
    Also saves a Message record for auditability.
    """
    _, ctx_id = await _resolve_ctx_id(execution_id)

    try:
        doc_oid = PydanticObjectId(shot_doc_id)
    except Exception:
        raise HTTPException(400, "Invalid shot_doc_id")

    shot = await Shot.get(doc_oid)
    if not shot or str(shot.execution_id) != str(ctx_id):
        raise HTTPException(404, f"Shot '{shot_doc_id}' not found in this execution")

    step_key = ["generate_images_nano_banana"]
    org_id = body.org_id or str(getattr(shot, "org_id", "") or "")
    project_id = body.project_id or str(getattr(shot, "project_id", "") or "")
    episode_id = body.episode_id or str(getattr(shot, "episode_id", "") or "")
    part_id = body.part_id or str(getattr(shot, "part_id", "") or "")

    iterate_payload = {
        "shot_number": shot.shot_metadata.shot_number if shot.shot_metadata else shot.sequence_no,
        "base_shot_id": str(shot.id),
        "instruction": body.instruction,
    }
    if shot.start_image:
        iterate_payload["start_image"] = {
            "object_id": shot.start_image.object_id or f"start_image_{shot.sequence_no}_{ctx_id}",
            "display_name": shot.start_image.display_name,
            "aws_url": shot.start_image.aws_url,
        }

    # Build SQS message body with iterate_payload
    import uuid
    sqs_body = {
        "executionId": str(ctx_id),
        "msg_id": str(uuid.uuid4()),
        "stepKey": step_key,
        "orgId": org_id,
        "projectId": project_id,
        "episodeId": episode_id,
        "partId": part_id,
        "action": "iterate",
        "userId": str(user.id),
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "iterate_payload": iterate_payload,
    }

    # Save Message record
    msg = Message(
        execution_id=str(ctx_id),
        step_key=step_key,
        org_id=org_id,
        project_id=project_id,
        episode_id=episode_id,
        part_id=part_id,
        action="iterate",
        prompt=body.instruction,
        user_id=str(user.id),
    )
    await msg.insert()

    # Send to SQS directly with custom body
    import json as _json
    import asyncio
    from app.services.sqs_service import _sync_send
    from app.core.config import settings as _settings
    import hashlib

    queue_url = _settings.AWS_SQS_QUEUE_URL
    sqs_msg_id = None
    if queue_url:
        body_str = _json.dumps(sqs_body, default=str)
        is_fifo = queue_url.endswith(".fifo")
        group_id = f"{ctx_id}:generate_images_nano_banana"
        dedup_id = hashlib.sha256(
            f"generate_images_nano_banana:iterate:{datetime.now(timezone.utc).isoformat()}".encode()
        ).hexdigest()
        try:
            sqs_msg_id = await asyncio.to_thread(
                _sync_send, queue_url, body_str, group_id, dedup_id, is_fifo
            )
        except Exception:
            pass

    return {
        "status": "sent",
        "message_id": str(msg.id),
        "sqs_message_id": sqs_msg_id,
        "shot_id": str(shot.id),
        "action": "iterate",
    }


@router.post("/{execution_id}/shots/{shot_doc_id}/retry")
async def retry_shot(
    execution_id: str,
    shot_doc_id: str,
    body: ShotRetryBody,
    user: User = Depends(get_current_user),
):
    """Retry a specific shot — re-generate with existing references.

    Builds an SQS message with action='retry' and a retry_payload
    containing the shot's character/location/previous references.
    Also saves a Message record for auditability.
    """
    _, ctx_id = await _resolve_ctx_id(execution_id)

    try:
        doc_oid = PydanticObjectId(shot_doc_id)
    except Exception:
        raise HTTPException(400, "Invalid shot_doc_id")

    shot = await Shot.get(doc_oid)
    if not shot or str(shot.execution_id) != str(ctx_id):
        raise HTTPException(404, f"Shot '{shot_doc_id}' not found in this execution")

    step_key = ["generate_images_nano_banana"]
    org_id = body.org_id or str(getattr(shot, "org_id", "") or "")
    project_id = body.project_id or str(getattr(shot, "project_id", "") or "")
    episode_id = body.episode_id or str(getattr(shot, "episode_id", "") or "")
    part_id = body.part_id or str(getattr(shot, "part_id", "") or "")

    retry_payload: Dict[str, Any] = {
        "shot_number": shot.shot_metadata.shot_number if shot.shot_metadata else shot.sequence_no,
        "base_shot_id": str(shot.id),
        "start_image_prompt": shot.start_image_prompt,
    }

    # character_references
    char_refs = []
    for ref in (shot.character_references or []):
        char_refs.append({
            "character_id": ref.character_id or "",
            "reference_image": ref.reference_image or "",
            "display_name": ref.display_name,
            "aws_url": ref.aws_url,
        })
    retry_payload["character_references"] = char_refs

    # location_references
    loc_refs = []
    for ref in (shot.location_references or []):
        loc_refs.append({
            "location_id": ref.location_id or "",
            "reference_image": ref.reference_image or "",
            "display_name": ref.display_name,
            "aws_url": ref.aws_url,
        })
    retry_payload["location_references"] = loc_refs

    # previous_references
    prev_refs = []
    for ref in (shot.previous_references or []):
        prev_refs.append({
            "reference_image": ref.reference_image,
            "display_name": ref.display_name,
            "aws_url": ref.aws_url,
        })
    retry_payload["previous_references"] = prev_refs

    # Build SQS message body with retry_payload
    import uuid
    sqs_body = {
        "executionId": str(ctx_id),
        "msg_id": str(uuid.uuid4()),
        "stepKey": step_key,
        "orgId": org_id,
        "projectId": project_id,
        "episodeId": episode_id,
        "partId": part_id,
        "action": "retry",
        "userId": str(user.id),
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "retry_payload": retry_payload,
    }

    # Save Message record
    msg = Message(
        execution_id=str(ctx_id),
        step_key=step_key,
        org_id=org_id,
        project_id=project_id,
        episode_id=episode_id,
        part_id=part_id,
        action="retry",
        prompt=f"Retry shot {retry_payload['shot_number']}",
        user_id=str(user.id),
    )
    await msg.insert()

    # Send to SQS directly with custom body
    import json as _json
    import asyncio
    from app.services.sqs_service import _sync_send
    from app.core.config import settings as _settings
    import hashlib

    queue_url = _settings.AWS_SQS_QUEUE_URL
    sqs_msg_id = None
    if queue_url:
        body_str = _json.dumps(sqs_body, default=str)
        is_fifo = queue_url.endswith(".fifo")
        group_id = f"{ctx_id}:generate_images_nano_banana"
        dedup_id = hashlib.sha256(
            f"generate_images_nano_banana:retry:{datetime.now(timezone.utc).isoformat()}".encode()
        ).hexdigest()
        try:
            sqs_msg_id = await asyncio.to_thread(
                _sync_send, queue_url, body_str, group_id, dedup_id, is_fifo
            )
        except Exception:
            pass

    return {
        "status": "sent",
        "message_id": str(msg.id),
        "sqs_message_id": sqs_msg_id,
        "shot_id": str(shot.id),
        "action": "retry",
    }

