"""Beat CRUD + set-current-version."""
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime
from beanie import PydanticObjectId

from app.models.beat import Beat, BeatMetadata
from app.models.part import Part
from app.models.user import User
from app.core.auth import get_current_active_user

router = APIRouter()


class BeatCreate(BaseModel):
    partId: str
    beatNumber: int
    content: str
    metadata: Optional[Dict[str, Any]] = None


class BeatUpdate(BaseModel):
    beatNumber: Optional[int] = None
    content: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class BeatOut(BaseModel):
    id: str
    organizationId: str
    projectId: str
    episodeId: str
    partId: str
    beatNumber: int
    content: str
    metadata: Dict[str, Any]
    createdAt: datetime
    updatedAt: datetime


def _out(b: Beat) -> BeatOut:
    return BeatOut(
        id=str(b.id), organizationId=str(b.organizationId),
        projectId=str(b.projectId), episodeId=str(b.episodeId),
        partId=str(b.partId), beatNumber=b.beatNumber, content=b.content,
        metadata=b.metadata.model_dump(), createdAt=b.createdAt, updatedAt=b.updatedAt,
    )


@router.post("/", response_model=BeatOut, status_code=201)
async def create_beat(body: BeatCreate, user: User = Depends(get_current_active_user)):
    part = await Part.get(PydanticObjectId(body.partId))
    if not part:
        raise HTTPException(404, "Part not found")
    meta = BeatMetadata(**(body.metadata or {}))
    beat = Beat(
        organizationId=part.projectId,  # will be resolved below
        projectId=part.projectId, episodeId=part.episodeId, partId=part.id,
        beatNumber=body.beatNumber, content=body.content, metadata=meta,
    )
    # Resolve org from user
    if user.organizationId:
        beat.organizationId = user.organizationId
    await beat.insert()
    return _out(beat)


@router.get("/by-part/{part_id}", response_model=List[BeatOut])
async def list_beats(part_id: str, user: User = Depends(get_current_active_user)):
    beats = await Beat.find(Beat.partId == PydanticObjectId(part_id)).sort("+beatNumber").to_list()
    return [_out(b) for b in beats]


@router.get("/{beat_id}", response_model=BeatOut)
async def get_beat(beat_id: str, user: User = Depends(get_current_active_user)):
    b = await Beat.get(PydanticObjectId(beat_id))
    if not b:
        raise HTTPException(404, "Beat not found")
    return _out(b)


@router.put("/{beat_id}", response_model=BeatOut)
async def update_beat(beat_id: str, body: BeatUpdate, user: User = Depends(get_current_active_user)):
    b = await Beat.get(PydanticObjectId(beat_id))
    if not b:
        raise HTTPException(404, "Beat not found")
    if body.beatNumber is not None:
        b.beatNumber = body.beatNumber
    if body.content is not None:
        b.content = body.content
    if body.metadata is not None:
        b.metadata = BeatMetadata(**body.metadata)
    b.updatedAt = datetime.utcnow()
    await b.save()
    return _out(b)


@router.delete("/{beat_id}", status_code=204)
async def delete_beat(beat_id: str, user: User = Depends(get_current_active_user)):
    b = await Beat.get(PydanticObjectId(beat_id))
    if not b:
        raise HTTPException(404, "Beat not found")
    await b.delete()


@router.post("/{beat_id}/set-current", response_model=BeatOut)
async def set_beat_current(beat_id: str, user: User = Depends(get_current_active_user)):
    beat = await Beat.get(PydanticObjectId(beat_id))
    if not beat:
        raise HTTPException(404, "Beat not found")
    # Unset current on all beats with same beatNumber in the same part
    same = await Beat.find(Beat.partId == beat.partId, Beat.beatNumber == beat.beatNumber).to_list()
    for b in same:
        if b.metadata.current:
            b.metadata.current = False
            b.updatedAt = datetime.utcnow()
            await b.save()
    beat.metadata.current = True
    beat.updatedAt = datetime.utcnow()
    await beat.save()
    return _out(beat)
