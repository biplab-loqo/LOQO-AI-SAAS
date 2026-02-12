"""Episode CRUD (nested under projects)."""
from typing import List, Optional
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


class EpisodeCreate(BaseModel):
    episodeNumber: int
    bibleText: Optional[str] = None


class EpisodeUpdate(BaseModel):
    episodeNumber: Optional[int] = None
    bibleText: Optional[str] = None


class EpisodeOut(BaseModel):
    id: str
    projectId: str
    episodeNumber: int
    bibleText: Optional[str] = None
    createdBy: Optional[str] = None
    createdAt: datetime
    updatedAt: datetime


def _out(e: Episode) -> EpisodeOut:
    return EpisodeOut(
        id=str(e.id), projectId=str(e.projectId), episodeNumber=e.episodeNumber,
        bibleText=e.bibleText, createdBy=str(e.createdBy) if e.createdBy else None,
        createdAt=e.createdAt, updatedAt=e.updatedAt,
    )


@router.get("/{project_id}/episodes/{episode_id}", response_model=EpisodeOut)
async def get_episode(project_id: str, episode_id: str, user: User = Depends(get_current_active_user)):
    ep = await Episode.get(PydanticObjectId(episode_id))
    if not ep or str(ep.projectId) != project_id:
        raise HTTPException(404, "Episode not found")
    return _out(ep)


@router.post("/{project_id}/episodes", response_model=EpisodeOut, status_code=201)
async def create_episode(project_id: str, body: EpisodeCreate, user: User = Depends(get_current_active_user)):
    p = await Project.get(PydanticObjectId(project_id))
    if not p:
        raise HTTPException(404, "Project not found")
    ep = Episode(projectId=p.id, episodeNumber=body.episodeNumber, bibleText=body.bibleText, createdBy=user.id)
    await ep.insert()
    return _out(ep)


@router.put("/{project_id}/episodes/{episode_id}", response_model=EpisodeOut)
async def update_episode(project_id: str, episode_id: str, body: EpisodeUpdate, user: User = Depends(get_current_active_user)):
    ep = await Episode.get(PydanticObjectId(episode_id))
    if not ep or str(ep.projectId) != project_id:
        raise HTTPException(404, "Episode not found")
    if body.episodeNumber is not None:
        ep.episodeNumber = body.episodeNumber
    if body.bibleText is not None:
        ep.bibleText = body.bibleText
    ep.updatedAt = datetime.utcnow()
    await ep.save()
    return _out(ep)


@router.delete("/{project_id}/episodes/{episode_id}", status_code=204)
async def delete_episode(project_id: str, episode_id: str, user: User = Depends(get_current_active_user)):
    ep = await Episode.get(PydanticObjectId(episode_id))
    if not ep or str(ep.projectId) != project_id:
        raise HTTPException(404, "Episode not found")
    # Cascade delete
    parts = await Part.find(Part.episodeId == ep.id).to_list()
    for part in parts:
        await Beat.find(Beat.partId == part.id).delete()
        await Shot.find(Shot.partId == part.id).delete()
        await Storyboard.find(Storyboard.partId == part.id).delete()
        await Image.find(Image.partId == part.id).delete()
        await Clip.find(Clip.partId == part.id).delete()
        await part.delete()
    await ep.delete()
