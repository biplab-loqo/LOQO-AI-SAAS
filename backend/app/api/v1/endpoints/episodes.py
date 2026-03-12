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
from typing import Optional

from app.core.auth import get_current_user
from app.models.user import User
from app.models.organization import Organization
from app.models.project import Project
from app.models.episode import Episode
from app.models.part import Part

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
