"""Unified content CRUD for beats, shots, and storyboards.

Each document = one version of ALL items for a part.
The `content` field is a JSON string; parsing it gives individual items.
"""
from enum import Enum
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime
from beanie import PydanticObjectId

from app.models.beat import Beat, BeatMetadata
from app.models.shot import Shot, ShotMetadata
from app.models.storyboard import Storyboard, StoryboardMetadata
from app.models.part import Part
from app.models.user import User
from app.core.auth import get_current_active_user

router = APIRouter()


class ContentType(str, Enum):
    beat = "beat"
    shot = "shot"
    storyboard = "storyboard"


MODEL_MAP = {
    ContentType.beat: Beat,
    ContentType.shot: Shot,
    ContentType.storyboard: Storyboard,
}

META_MAP = {
    ContentType.beat: BeatMetadata,
    ContentType.shot: ShotMetadata,
    ContentType.storyboard: StoryboardMetadata,
}


# ── Schemas ──────────────────────────────────────────────────

class ContentCreate(BaseModel):
    type: ContentType
    partId: str
    content: str
    metadata: Optional[Dict[str, Any]] = None


class ContentUpdate(BaseModel):
    content: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class ContentOut(BaseModel):
    id: str
    type: str
    organizationId: str
    projectId: str
    episodeId: str
    partId: str
    content: str
    metadata: Dict[str, Any]
    createdAt: datetime
    updatedAt: datetime


def _out(item: Any, content_type: str) -> ContentOut:
    return ContentOut(
        id=str(item.id), type=content_type,
        organizationId=str(item.organizationId),
        projectId=str(item.projectId), episodeId=str(item.episodeId),
        partId=str(item.partId), content=item.content,
        metadata=item.metadata.model_dump(),
        createdAt=item.createdAt, updatedAt=item.updatedAt,
    )


async def _find_content(content_id: str):
    """Detect type from ID by trying each model."""
    oid = PydanticObjectId(content_id)
    for ct, model in MODEL_MAP.items():
        item = await model.get(oid)
        if item:
            return item, ct
    return None, None


# ── POST /content ────────────────────────────────────────────

@router.post("/", response_model=ContentOut, status_code=201)
async def create_content(body: ContentCreate, user: User = Depends(get_current_active_user)):
    part = await Part.get(PydanticObjectId(body.partId))
    if not part:
        raise HTTPException(404, "Part not found")

    Model = MODEL_MAP[body.type]
    MetaModel = META_MAP[body.type]
    meta = MetaModel(**(body.metadata or {}))

    item = Model(
        organizationId=user.organizationId or part.projectId,
        projectId=part.projectId, episodeId=part.episodeId, partId=part.id,
        content=body.content, metadata=meta,
    )
    await item.insert()
    return _out(item, body.type.value)


# ── PUT /content/{id} ───────────────────────────────────────

@router.put("/{content_id}", response_model=ContentOut)
async def update_content(content_id: str, body: ContentUpdate, user: User = Depends(get_current_active_user)):
    item, ct = await _find_content(content_id)
    if not item:
        raise HTTPException(404, "Content not found")

    if body.content is not None:
        item.content = body.content
    if body.metadata is not None:
        MetaModel = META_MAP[ct]
        item.metadata = MetaModel(**body.metadata)
    item.updatedAt = datetime.utcnow()
    await item.save()
    return _out(item, ct.value)


# ── DELETE /content/{id} ────────────────────────────────────

@router.delete("/{content_id}", status_code=204)
async def delete_content(content_id: str, user: User = Depends(get_current_active_user)):
    item, ct = await _find_content(content_id)
    if not item:
        raise HTTPException(404, "Content not found")
    await item.delete()


# ── POST /content/{id}/select ───────────────────────────────

@router.post("/{content_id}/select", response_model=ContentOut)
async def select_content(content_id: str, user: User = Depends(get_current_active_user)):
    """Mark this version as selected (un-selects all other versions for same part & type)."""
    item, ct = await _find_content(content_id)
    if not item:
        raise HTTPException(404, "Content not found")

    Model = MODEL_MAP[ct]
    # Unselect all sibling versions of the same type for the same part
    siblings = await Model.find(Model.partId == item.partId).to_list()
    for s in siblings:
        if s.metadata.selected and s.id != item.id:
            s.metadata.selected = False
            s.updatedAt = datetime.utcnow()
            await s.save()

    item.metadata.selected = True
    item.updatedAt = datetime.utcnow()
    await item.save()
    return _out(item, ct.value)
