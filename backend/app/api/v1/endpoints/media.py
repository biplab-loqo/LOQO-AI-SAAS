"""Unified Media endpoints (images + clips)."""
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime
from beanie import PydanticObjectId
from enum import Enum

from app.models.media import Image, Clip, MediaMetadata
from app.models.part import Part
from app.models.user import User
from app.core.auth import get_current_active_user

router = APIRouter()


class MediaType(str, Enum):
    image = "image"
    clip = "clip"


# ── Schemas ──────────────────────────────────────────────────

class MediaCreate(BaseModel):
    type: MediaType
    partId: str
    shotId: Optional[str] = None
    name: str = ""
    url: str
    category: Optional[str] = "shot"
    metadata: Optional[Dict[str, Any]] = None


class MediaOut(BaseModel):
    id: str
    type: str
    organizationId: str
    projectId: str
    episodeId: str
    partId: str
    shotId: Optional[str] = None
    name: str
    url: str
    category: Optional[str] = None
    metadata: Dict[str, Any]
    createdAt: datetime
    updatedAt: datetime


# ── POST /media ──────────────────────────────────────────────

@router.post("/", response_model=MediaOut, status_code=201)
async def create_media(body: MediaCreate, user: User = Depends(get_current_active_user)):
    part = await Part.get(PydanticObjectId(body.partId))
    if not part:
        raise HTTPException(404, "Part not found")
    meta = MediaMetadata(**(body.metadata or {}))

    if body.type == MediaType.image:
        item = Image(
            organizationId=user.organizationId or part.projectId,
            projectId=part.projectId, episodeId=part.episodeId, partId=part.id,
            shotId=PydanticObjectId(body.shotId) if body.shotId else None,
            name=body.name, imageUrl=body.url, category=body.category or "shot",
            metadata=meta,
        )
        await item.insert()
        return MediaOut(
            id=str(item.id), type="image",
            organizationId=str(item.organizationId),
            projectId=str(item.projectId), episodeId=str(item.episodeId),
            partId=str(item.partId), shotId=str(item.shotId) if item.shotId else None,
            name=item.name, url=item.imageUrl, category=item.category,
            metadata=item.metadata.model_dump(),
            createdAt=item.createdAt, updatedAt=item.updatedAt,
        )
    else:
        item = Clip(
            organizationId=user.organizationId or part.projectId,
            projectId=part.projectId, episodeId=part.episodeId, partId=part.id,
            shotId=PydanticObjectId(body.shotId) if body.shotId else None,
            name=body.name, clipUrl=body.url,
            metadata=meta,
        )
        await item.insert()
        return MediaOut(
            id=str(item.id), type="clip",
            organizationId=str(item.organizationId),
            projectId=str(item.projectId), episodeId=str(item.episodeId),
            partId=str(item.partId), shotId=str(item.shotId) if item.shotId else None,
            name=item.name, url=item.clipUrl,
            metadata=item.metadata.model_dump(),
            createdAt=item.createdAt, updatedAt=item.updatedAt,
        )


# ── DELETE /media/{id} ──────────────────────────────────────

@router.delete("/{media_id}", status_code=204)
async def delete_media(media_id: str, user: User = Depends(get_current_active_user)):
    oid = PydanticObjectId(media_id)
    # Try image first, then clip (IDs are globally unique)
    img = await Image.get(oid)
    if img:
        await img.delete()
        return
    clip = await Clip.get(oid)
    if clip:
        await clip.delete()
        return
    raise HTTPException(404, "Media not found")
