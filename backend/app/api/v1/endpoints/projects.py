"""Project CRUD + /full overview endpoint."""
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


# ── Schemas ──────────────────────────────────────────────────

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class ProjectOut(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    organization_id: str
    created_by: str
    created_at: datetime
    updated_at: datetime


def _out(p: Project) -> ProjectOut:
    return ProjectOut(
        id=str(p.id), name=p.name, description=p.description,
        organization_id=str(p.organizationId), created_by=str(p.createdBy),
        created_at=p.createdAt, updated_at=p.updatedAt,
    )


# ── CRUD ─────────────────────────────────────────────────────

@router.post("/", response_model=ProjectOut, status_code=201)
async def create_project(body: ProjectCreate, user: User = Depends(get_current_active_user)):
    if not user.organizationId:
        raise HTTPException(400, "User must belong to an organization")
    p = Project(name=body.name, description=body.description, organizationId=user.organizationId, createdBy=user.id)
    await p.insert()
    return _out(p)


@router.get("/", response_model=List[ProjectOut])
async def list_projects(user: User = Depends(get_current_active_user)):
    if not user.organizationId:
        raise HTTPException(400, "User must belong to an organization")
    projects = await Project.find(Project.organizationId == user.organizationId).to_list()
    return [_out(p) for p in projects]


@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(project_id: str, user: User = Depends(get_current_active_user)):
    p = await Project.get(PydanticObjectId(project_id))
    if not p:
        raise HTTPException(404, "Project not found")
    return _out(p)


@router.put("/{project_id}", response_model=ProjectOut)
async def update_project(project_id: str, body: ProjectUpdate, user: User = Depends(get_current_active_user)):
    p = await Project.get(PydanticObjectId(project_id))
    if not p:
        raise HTTPException(404, "Project not found")
    if body.name is not None:
        p.name = body.name
    if body.description is not None:
        p.description = body.description
    p.updatedAt = datetime.utcnow()
    await p.save()
    return _out(p)


@router.delete("/{project_id}", status_code=204)
async def delete_project(project_id: str, user: User = Depends(get_current_active_user)):
    p = await Project.get(PydanticObjectId(project_id))
    if not p:
        raise HTTPException(404, "Project not found")
    # Cascade delete all children
    episodes = await Episode.find(Episode.projectId == p.id).to_list()
    for ep in episodes:
        parts = await Part.find(Part.episodeId == ep.id).to_list()
        for part in parts:
            await Beat.find(Beat.partId == part.id).delete()
            await Shot.find(Shot.partId == part.id).delete()
            await Storyboard.find(Storyboard.partId == part.id).delete()
            await Image.find(Image.partId == part.id).delete()
            await Clip.find(Clip.partId == part.id).delete()
            await part.delete()
        await ep.delete()
    await p.delete()


# ── /full – returns project + all episodes + parts + counts ──

async def _part_summary(p: Part) -> dict:
    pid = p.id
    return {
        "id": str(pid), "title": p.title, "partNumber": p.partNumber,
        "episodeId": str(p.episodeId), "projectId": str(p.projectId),
        "scriptText": p.scriptText,
        "beatCount": await Beat.find(Beat.partId == pid).count(),
        "shotCount": await Shot.find(Shot.partId == pid).count(),
        "storyboardCount": await Storyboard.find(Storyboard.partId == pid).count(),
        "imageCount": await Image.find(Image.partId == pid).count(),
        "clipCount": await Clip.find(Clip.partId == pid).count(),
    }


@router.get("/{project_id}/full")
async def get_project_full(project_id: str, user: User = Depends(get_current_active_user)):
    """Project + all episodes + parts with content counts – one call for the whole project."""
    proj = await Project.get(PydanticObjectId(project_id))
    if not proj:
        raise HTTPException(404, "Project not found")

    episodes = await Episode.find(Episode.projectId == proj.id).sort("+episodeNumber").to_list()
    ep_data = []
    for ep in episodes:
        parts = await Part.find(Part.episodeId == ep.id).sort("+partNumber").to_list()
        ep_data.append({
            "id": str(ep.id), "projectId": str(ep.projectId),
            "episodeNumber": ep.episodeNumber, "bibleText": ep.bibleText,
            "parts": [await _part_summary(p) for p in parts],
            "createdAt": ep.createdAt.isoformat(), "updatedAt": ep.updatedAt.isoformat(),
        })

    return {
        "id": str(proj.id), "name": proj.name, "description": proj.description,
        "organizationId": str(proj.organizationId),
        "createdBy": str(proj.createdBy),
        "episodes": ep_data,
        "createdAt": proj.createdAt.isoformat(), "updatedAt": proj.updatedAt.isoformat(),
    }
