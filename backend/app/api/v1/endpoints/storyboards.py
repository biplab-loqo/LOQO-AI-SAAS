"""Storyboard CRUD + set-current-version."""
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime
from beanie import PydanticObjectId

from app.models.storyboard import Storyboard, StoryboardMetadata
from app.models.part import Part
from app.models.user import User
from app.core.auth import get_current_active_user

router = APIRouter()


class StoryboardCreate(BaseModel):
    partId: str
    panelNumber: int
    content: str
    metadata: Optional[Dict[str, Any]] = None


class StoryboardUpdate(BaseModel):
    panelNumber: Optional[int] = None
    content: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class StoryboardOut(BaseModel):
    id: str
    organizationId: str
    projectId: str
    episodeId: str
    partId: str
    panelNumber: int
    content: str
    metadata: Dict[str, Any]
    createdAt: datetime
    updatedAt: datetime


def _out(sb: Storyboard) -> StoryboardOut:
    return StoryboardOut(
        id=str(sb.id), organizationId=str(sb.organizationId),
        projectId=str(sb.projectId), episodeId=str(sb.episodeId),
        partId=str(sb.partId), panelNumber=sb.panelNumber,
        content=sb.content, metadata=sb.metadata.model_dump(),
        createdAt=sb.createdAt, updatedAt=sb.updatedAt,
    )


@router.post("/", response_model=StoryboardOut, status_code=201)
async def create_storyboard(body: StoryboardCreate, user: User = Depends(get_current_active_user)):
    part = await Part.get(PydanticObjectId(body.partId))
    if not part:
        raise HTTPException(404, "Part not found")
    meta = StoryboardMetadata(**(body.metadata or {}))
    sb = Storyboard(
        organizationId=user.organizationId or part.projectId,
        projectId=part.projectId, episodeId=part.episodeId, partId=part.id,
        panelNumber=body.panelNumber, content=body.content, metadata=meta,
    )
    await sb.insert()
    return _out(sb)


@router.get("/by-part/{part_id}", response_model=List[StoryboardOut])
async def list_storyboards(part_id: str, user: User = Depends(get_current_active_user)):
    sbs = await Storyboard.find(Storyboard.partId == PydanticObjectId(part_id)).sort("+panelNumber").to_list()
    return [_out(sb) for sb in sbs]


@router.get("/{storyboard_id}", response_model=StoryboardOut)
async def get_storyboard(storyboard_id: str, user: User = Depends(get_current_active_user)):
    sb = await Storyboard.get(PydanticObjectId(storyboard_id))
    if not sb:
        raise HTTPException(404, "Storyboard not found")
    return _out(sb)


@router.put("/{storyboard_id}", response_model=StoryboardOut)
async def update_storyboard(storyboard_id: str, body: StoryboardUpdate, user: User = Depends(get_current_active_user)):
    sb = await Storyboard.get(PydanticObjectId(storyboard_id))
    if not sb:
        raise HTTPException(404, "Storyboard not found")
    if body.panelNumber is not None:
        sb.panelNumber = body.panelNumber
    if body.content is not None:
        sb.content = body.content
    if body.metadata is not None:
        sb.metadata = StoryboardMetadata(**body.metadata)
    sb.updatedAt = datetime.utcnow()
    await sb.save()
    return _out(sb)


@router.delete("/{storyboard_id}", status_code=204)
async def delete_storyboard(storyboard_id: str, user: User = Depends(get_current_active_user)):
    sb = await Storyboard.get(PydanticObjectId(storyboard_id))
    if not sb:
        raise HTTPException(404, "Storyboard not found")
    await sb.delete()


@router.post("/{storyboard_id}/set-current", response_model=StoryboardOut)
async def set_storyboard_current(storyboard_id: str, user: User = Depends(get_current_active_user)):
    sb = await Storyboard.get(PydanticObjectId(storyboard_id))
    if not sb:
        raise HTTPException(404, "Storyboard not found")
    same = await Storyboard.find(Storyboard.partId == sb.partId, Storyboard.panelNumber == sb.panelNumber).to_list()
    for s in same:
        if s.metadata.current:
            s.metadata.current = False
            s.updatedAt = datetime.utcnow()
            await s.save()
    sb.metadata.current = True
    sb.updatedAt = datetime.utcnow()
    await sb.save()
    return _out(sb)
