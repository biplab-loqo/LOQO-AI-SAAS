"""Combined / clubbed endpoints – fewer API calls for the frontend."""
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime
from beanie import PydanticObjectId

from app.models.project import Project
from app.models.episode import Episode
from app.models.part import Part
from app.models.beat import Beat
from app.models.shot import Shot
from app.models.storyboard import Storyboard
from app.models.media import Image, Clip
from app.models.user import User
from app.core.auth import get_current_active_user

router = APIRouter()


# ── Helper serialisers ───────────────────────────────────────

def _str(oid) -> str:
    return str(oid) if oid else None


# ── GET /combined/parts/{part_id}/studio-data ────────────────

@router.get("/parts/{part_id}/studio-data")
async def get_part_studio_data(part_id: str, user: User = Depends(get_current_active_user)):
    """Return everything the studio page needs in ONE call:
    part, episode, beats, shots, storyboards, images, clips."""
    pid = PydanticObjectId(part_id)
    part = await Part.get(pid)
    if not part:
        raise HTTPException(404, "Part not found")

    episode = await Episode.get(part.episodeId)

    beats = await Beat.find(Beat.partId == pid).sort("+beatNumber").to_list()
    shots = await Shot.find(Shot.partId == pid).sort("+shotNumber").to_list()
    storyboards = await Storyboard.find(Storyboard.partId == pid).sort("+panelNumber").to_list()
    images = await Image.find(Image.partId == pid).to_list()
    clips = await Clip.find(Clip.partId == pid).to_list()

    return {
        "part": {
            "id": _str(part.id), "title": part.title,
            "episodeId": _str(part.episodeId), "projectId": _str(part.projectId),
            "partNumber": part.partNumber, "scriptText": part.scriptText,
            "createdBy": _str(part.createdBy),
            "createdAt": part.createdAt.isoformat(), "updatedAt": part.updatedAt.isoformat(),
        },
        "episode": {
            "id": _str(episode.id), "projectId": _str(episode.projectId),
            "episodeNumber": episode.episodeNumber, "bibleText": episode.bibleText,
            "createdAt": episode.createdAt.isoformat(), "updatedAt": episode.updatedAt.isoformat(),
        } if episode else None,
        "beats": [
            {
                "id": _str(b.id), "partId": _str(b.partId),
                "beatNumber": b.beatNumber, "content": b.content,
                "metadata": b.metadata.model_dump(),
                "createdAt": b.createdAt.isoformat(), "updatedAt": b.updatedAt.isoformat(),
            }
            for b in beats
        ],
        "shots": [
            {
                "id": _str(s.id), "partId": _str(s.partId),
                "shotNumber": s.shotNumber, "shotName": s.shotName,
                "content": s.content, "metadata": s.metadata.model_dump(),
                "createdAt": s.createdAt.isoformat(), "updatedAt": s.updatedAt.isoformat(),
            }
            for s in shots
        ],
        "storyboards": [
            {
                "id": _str(sb.id), "partId": _str(sb.partId),
                "panelNumber": sb.panelNumber,
                "content": sb.content, "metadata": sb.metadata.model_dump(),
                "createdAt": sb.createdAt.isoformat(), "updatedAt": sb.updatedAt.isoformat(),
            }
            for sb in storyboards
        ],
        "images": [
            {
                "id": _str(i.id), "partId": _str(i.partId),
                "shotId": _str(i.shotId), "name": i.name,
                "imageUrl": i.imageUrl, "metadata": i.metadata.model_dump(),
                "createdAt": i.createdAt.isoformat(), "updatedAt": i.updatedAt.isoformat(),
            }
            for i in images
        ],
        "clips": [
            {
                "id": _str(c.id), "partId": _str(c.partId),
                "shotId": _str(c.shotId), "name": c.name,
                "clipUrl": c.clipUrl, "metadata": c.metadata.model_dump(),
                "createdAt": c.createdAt.isoformat(), "updatedAt": c.updatedAt.isoformat(),
            }
            for c in clips
        ],
    }


# ── GET /combined/projects/{project_id}/overview ─────────────

async def _part_summary(part: Part) -> dict:
    pid = part.id
    return {
        "id": _str(pid), "title": part.title, "partNumber": part.partNumber,
        "episodeId": _str(part.episodeId), "projectId": _str(part.projectId),
        "scriptText": part.scriptText,
        "beatCount": await Beat.find(Beat.partId == pid).count(),
        "shotCount": await Shot.find(Shot.partId == pid).count(),
        "storyboardCount": await Storyboard.find(Storyboard.partId == pid).count(),
        "imageCount": await Image.find(Image.partId == pid).count(),
        "clipCount": await Clip.find(Clip.partId == pid).count(),
    }


@router.get("/projects/{project_id}/overview")
async def get_project_overview(project_id: str, user: User = Depends(get_current_active_user)):
    """Project + all episodes + parts with content counts."""
    proj = await Project.get(PydanticObjectId(project_id))
    if not proj:
        raise HTTPException(404, "Project not found")

    episodes = await Episode.find(Episode.projectId == proj.id).sort("+episodeNumber").to_list()
    ep_data = []
    for ep in episodes:
        parts = await Part.find(Part.episodeId == ep.id).sort("+partNumber").to_list()
        ep_data.append({
            "id": _str(ep.id), "projectId": _str(ep.projectId),
            "episodeNumber": ep.episodeNumber, "bibleText": ep.bibleText,
            "parts": [await _part_summary(p) for p in parts],
            "createdAt": ep.createdAt.isoformat(), "updatedAt": ep.updatedAt.isoformat(),
        })

    return {
        "id": _str(proj.id), "name": proj.name, "description": proj.description,
        "organizationId": _str(proj.organizationId),
        "episodes": ep_data,
        "createdAt": proj.createdAt.isoformat(), "updatedAt": proj.updatedAt.isoformat(),
    }


# ── GET /combined/projects/{project_id}/episodes/{episode_id}/full

@router.get("/projects/{project_id}/episodes/{episode_id}/full")
async def get_episode_full(project_id: str, episode_id: str, user: User = Depends(get_current_active_user)):
    """Episode + all parts with content counts."""
    ep = await Episode.get(PydanticObjectId(episode_id))
    if not ep or _str(ep.projectId) != project_id:
        raise HTTPException(404, "Episode not found")

    parts = await Part.find(Part.episodeId == ep.id).sort("+partNumber").to_list()

    return {
        "id": _str(ep.id), "projectId": _str(ep.projectId),
        "episodeNumber": ep.episodeNumber, "bibleText": ep.bibleText,
        "parts": [await _part_summary(p) for p in parts],
        "createdAt": ep.createdAt.isoformat(), "updatedAt": ep.updatedAt.isoformat(),
    }
