"""Shot CRUD + set-current-version."""
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime
from beanie import PydanticObjectId

from app.models.shot import Shot, ShotMetadata
from app.models.part import Part
from app.models.user import User
from app.core.auth import get_current_active_user

router = APIRouter()


class ShotCreate(BaseModel):
    partId: str
    shotNumber: int
    shotName: str
    content: str
    metadata: Optional[Dict[str, Any]] = None


class ShotUpdate(BaseModel):
    shotNumber: Optional[int] = None
    shotName: Optional[str] = None
    content: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class ShotOut(BaseModel):
    id: str
    organizationId: str
    projectId: str
    episodeId: str
    partId: str
    shotNumber: int
    shotName: str
    content: str
    metadata: Dict[str, Any]
    createdAt: datetime
    updatedAt: datetime


def _out(s: Shot) -> ShotOut:
    return ShotOut(
        id=str(s.id), organizationId=str(s.organizationId),
        projectId=str(s.projectId), episodeId=str(s.episodeId),
        partId=str(s.partId), shotNumber=s.shotNumber, shotName=s.shotName,
        content=s.content, metadata=s.metadata.model_dump(),
        createdAt=s.createdAt, updatedAt=s.updatedAt,
    )


@router.post("/", response_model=ShotOut, status_code=201)
async def create_shot(body: ShotCreate, user: User = Depends(get_current_active_user)):
    part = await Part.get(PydanticObjectId(body.partId))
    if not part:
        raise HTTPException(404, "Part not found")
    meta = ShotMetadata(**(body.metadata or {}))
    shot = Shot(
        organizationId=user.organizationId or part.projectId,
        projectId=part.projectId, episodeId=part.episodeId, partId=part.id,
        shotNumber=body.shotNumber, shotName=body.shotName,
        content=body.content, metadata=meta,
    )
    await shot.insert()
    return _out(shot)


@router.get("/by-part/{part_id}", response_model=List[ShotOut])
async def list_shots(part_id: str, user: User = Depends(get_current_active_user)):
    shots = await Shot.find(Shot.partId == PydanticObjectId(part_id)).sort("+shotNumber").to_list()
    return [_out(s) for s in shots]


@router.get("/{shot_id}", response_model=ShotOut)
async def get_shot(shot_id: str, user: User = Depends(get_current_active_user)):
    s = await Shot.get(PydanticObjectId(shot_id))
    if not s:
        raise HTTPException(404, "Shot not found")
    return _out(s)


@router.put("/{shot_id}", response_model=ShotOut)
async def update_shot(shot_id: str, body: ShotUpdate, user: User = Depends(get_current_active_user)):
    s = await Shot.get(PydanticObjectId(shot_id))
    if not s:
        raise HTTPException(404, "Shot not found")
    if body.shotNumber is not None:
        s.shotNumber = body.shotNumber
    if body.shotName is not None:
        s.shotName = body.shotName
    if body.content is not None:
        s.content = body.content
    if body.metadata is not None:
        s.metadata = ShotMetadata(**body.metadata)
    s.updatedAt = datetime.utcnow()
    await s.save()
    return _out(s)


@router.delete("/{shot_id}", status_code=204)
async def delete_shot(shot_id: str, user: User = Depends(get_current_active_user)):
    s = await Shot.get(PydanticObjectId(shot_id))
    if not s:
        raise HTTPException(404, "Shot not found")
    await s.delete()


@router.post("/{shot_id}/set-current", response_model=ShotOut)
async def set_shot_current(shot_id: str, user: User = Depends(get_current_active_user)):
    shot = await Shot.get(PydanticObjectId(shot_id))
    if not shot:
        raise HTTPException(404, "Shot not found")
    same = await Shot.find(Shot.partId == shot.partId, Shot.shotNumber == shot.shotNumber).to_list()
    for s in same:
        if s.metadata.current:
            s.metadata.current = False
            s.updatedAt = datetime.utcnow()
            await s.save()
    shot.metadata.current = True
    shot.updatedAt = datetime.utcnow()
    await shot.save()
    return _out(shot)
