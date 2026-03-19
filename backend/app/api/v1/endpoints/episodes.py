"""
Episode endpoints — v1 RESTful API

GET    /episodes?projectId=X          → List episodes for a project
POST   /episodes                      → Create episode
GET    /episodes/{episode_id}         → Get episode with parts
PUT    /episodes/{episode_id}         → Update episode
DELETE /episodes/{episode_id}         → Delete episode (cascade)
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from app.core.auth import get_current_user
from app.models.user import User
from app.models.organization import Organization
from app.models.project import Project
from app.models.episode import Episode
from app.models.part import Part
from app.models.character import Character
from app.models.location import Location
from app.models.workflow_execution import WorkflowExecution

router = APIRouter(prefix="/episodes", tags=["episodes"])


# ── Schemas ───────────────────────────────────────────────────

class CreateEpisodeRequest(BaseModel):
    projectId: str
    title: Optional[str] = ""
    name: Optional[str] = None
    episodeNumber: int = 1
    bibleText: Optional[str] = None


class UpdateEpisodeRequest(BaseModel):
    title: Optional[str] = None
    name: Optional[str] = None
    episodeNumber: Optional[int] = None
    bibleText: Optional[str] = None


# ── Helpers ───────────────────────────────────────────────────

async def _require_org(user: User) -> Organization:
    if not user.organizationId:
        raise HTTPException(status_code=400, detail="User has no organization")
    org = await Organization.get(user.organizationId)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org


def _serialize_episode(ep: Episode) -> dict:
    return {
        "id": str(ep.id),
        "projectId": ep.projectId,
        "episodeNumber": ep.episodeNumber,
        "title": getattr(ep, "title", ""),
        "name": getattr(ep, "name", None),
        "bibleText": ep.bibleText,
        "createdBy": ep.createdBy,
        "createdAt": ep.createdAt.isoformat(),
        "updatedAt": ep.updatedAt.isoformat(),
    }


# ── GET /episodes?projectId=X ────────────────────────────────

@router.get("")
async def list_episodes(
    projectId: str = Query(...),
    current_user: User = Depends(get_current_user),
):
    await _require_org(current_user)
    episodes = await Episode.find(Episode.projectId == projectId).to_list()
    return [_serialize_episode(e) for e in episodes]


# ── POST /episodes ────────────────────────────────────────────

@router.post("")
async def create_episode(
    body: CreateEpisodeRequest,
    current_user: User = Depends(get_current_user),
):
    await _require_org(current_user)

    project = await Project.get(body.projectId)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    ep = Episode(
        projectId=str(project.id),
        title=body.title or "",
        name=body.name,
        episodeNumber=body.episodeNumber,
        bibleText=body.bibleText,
        createdBy=str(current_user.id),
    )
    await ep.insert()
    return _serialize_episode(ep)


# ── GET /episodes/{episode_id} ────────────────────────────────

@router.get("/{episode_id}")
async def get_episode(
    episode_id: str,
    current_user: User = Depends(get_current_user),
):
    await _require_org(current_user)

    ep = await Episode.get(episode_id)
    if not ep:
        raise HTTPException(status_code=404, detail="Episode not found")

    parts = await Part.find(Part.episodeId == str(ep.id)).to_list()
    out = _serialize_episode(ep)
    out["parts"] = [
        {
            "id": str(p.id),
            "title": p.title,
            "partNumber": p.partNumber,
            "episodeId": str(ep.id),
            "projectId": p.projectId,
            "scriptText": p.scriptText,
        }
        for p in parts
    ]
    return out


# ── PUT /episodes/{episode_id} ────────────────────────────────

@router.put("/{episode_id}")
async def update_episode(
    episode_id: str,
    body: UpdateEpisodeRequest,
    current_user: User = Depends(get_current_user),
):
    await _require_org(current_user)

    ep = await Episode.get(episode_id)
    if not ep:
        raise HTTPException(status_code=404, detail="Episode not found")

    if body.episodeNumber is not None:
        ep.episodeNumber = body.episodeNumber
    if body.title is not None:
        ep.title = body.title
    if body.name is not None:
        ep.name = body.name
    if body.bibleText is not None:
        ep.bibleText = body.bibleText
    ep.updatedAt = datetime.utcnow()
    await ep.save()
    return _serialize_episode(ep)


# ── DELETE /episodes/{episode_id} ─────────────────────────────

@router.delete("/{episode_id}")
async def delete_episode(
    episode_id: str,
    current_user: User = Depends(get_current_user),
):
    await _require_org(current_user)

    ep = await Episode.get(episode_id)
    if not ep:
        raise HTTPException(status_code=404, detail="Episode not found")

    parts = await Part.find(Part.episodeId == str(ep.id)).to_list()
    for part in parts:
        await part.delete()
    await ep.delete()

    return {"status": "success", "message": "Episode deleted"}


# ── Helpers for media normalization ───────────────────────────

def _normalize_media_refs(d: dict) -> dict:
    """Normalize s3_uri fields to browser-friendly URLs."""
    from app.core.config import settings

    def _fix(obj: Any) -> Any:
        if isinstance(obj, dict):
            for k, v in obj.items():
                if k == "s3_uri" and isinstance(v, str) and v.startswith("s3://"):
                    bucket_and_key = v[5:]
                    slash = bucket_and_key.find("/")
                    if slash > 0:
                        bucket = bucket_and_key[:slash]
                        key = bucket_and_key[slash + 1:]
                        obj[k] = f"https://{bucket}.s3.amazonaws.com/{key}"
                else:
                    _fix(v)
            return obj
        if isinstance(obj, list):
            for item in obj:
                _fix(item)
        return obj

    return _fix(d)


def _to_jsonable(d: Any) -> Any:
    """Recursively convert ObjectId / datetime objects for JSON output."""
    from bson import ObjectId as BsonOid
    from datetime import datetime as _dt

    if isinstance(d, dict):
        return {k: _to_jsonable(v) for k, v in d.items()}
    if isinstance(d, list):
        return [_to_jsonable(v) for v in d]
    if isinstance(d, BsonOid):
        return str(d)
    if isinstance(d, _dt):
        return d.isoformat()
    return d


# ── GET /episodes/{episode_id}/characters ─────────────────────

@router.get("/{episode_id}/characters")
async def get_episode_characters(
    episode_id: str,
    current_user: User = Depends(get_current_user),
):
    """Get all characters across all parts of an episode (latest version per entity)."""
    await _require_org(current_user)

    ep = await Episode.get(episode_id)
    if not ep:
        raise HTTPException(status_code=404, detail="Episode not found")

    ep_str = str(ep.id)

    rows = await Character.find(
        {"$or": [
            {"episode_id": ep_str},
            {"episodeId": ep_str},
        ]}
    ).sort([("version", -1), ("updated_at", -1)]).to_list()

    # Deduplicate by identity — keep only latest version
    latest: Dict[str, Character] = {}
    for row in rows:
        desc = row.character_description or {}
        key = str(
            desc.get("character_name")
            or desc.get("name_identifier")
            or desc.get("name")
            or desc.get("display_name")
            or str(row.id)
        ).strip().lower()
        if key not in latest:
            latest[key] = row

    out: List[Dict[str, Any]] = []
    for row in latest.values():
        d = _to_jsonable(row.model_dump(mode="python"))
        d["id"] = str(row.id)
        d = _normalize_media_refs(d)
        out.append(d)
    return out


# ── GET /episodes/{episode_id}/locations ──────────────────────

@router.get("/{episode_id}/locations")
async def get_episode_locations(
    episode_id: str,
    current_user: User = Depends(get_current_user),
):
    """Get all locations across all parts of an episode (latest version per entity)."""
    await _require_org(current_user)

    ep = await Episode.get(episode_id)
    if not ep:
        raise HTTPException(status_code=404, detail="Episode not found")

    ep_str = str(ep.id)

    rows = await Location.find(
        {"$or": [
            {"episode_id": ep_str},
            {"episodeId": ep_str},
        ]}
    ).sort([("version", -1), ("updated_at", -1)]).to_list()

    # Deduplicate by identity — keep only latest version
    latest: Dict[str, Location] = {}
    for row in rows:
        desc = row.location_description or {}
        key = str(
            desc.get("location_name")
            or desc.get("name_identifier")
            or desc.get("name")
            or desc.get("display_name")
            or str(row.id)
        ).strip().lower()
        if key not in latest:
            latest[key] = row

    out: List[Dict[str, Any]] = []
    for row in latest.values():
        d = _to_jsonable(row.model_dump(mode="python"))
        d["id"] = str(row.id)
        d = _normalize_media_refs(d)
        out.append(d)
    return out


# ── GET /episodes/{episode_id}/show-bible ─────────────────────────────────────

@router.get("/{episode_id}/show-bible")
async def get_episode_show_bible(
    episode_id: str,
    current_user: User = Depends(get_current_user),
):
    """Return the execution-config show bible for a specific episode."""
    await _require_org(current_user)

    ep = await Episode.get(episode_id)
    if not ep:
        raise HTTPException(status_code=404, detail="Episode not found")

    # executionConfig stores episode-level show bible entries keyed by
    # entity_type='episode' and episode_id.
    col = Episode.get_pymongo_collection().database["executionConfig"]
    doc = await col.find_one({"entity_type": "episode", "episode_id": str(ep.id)})
    if not doc or "show_bible" not in doc:
        raise HTTPException(status_code=404, detail="Show bible not found")

    return {"showBible": _to_jsonable(doc.get("show_bible"))}
