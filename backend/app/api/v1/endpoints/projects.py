"""
Project endpoints — v1 RESTful API

GET    /projects                  → List projects for user's org
POST   /projects                  → Create project
GET    /projects/{project_id}     → Get project with episodes + parts tree
PUT    /projects/{project_id}     → Update project
DELETE /projects/{project_id}     → Delete project (cascade)
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.core.auth import get_current_user
from app.models.user import User
from app.models.organization import Organization
from app.models.project import Project
from app.models.episode import Episode
from app.models.part import Part

router = APIRouter(prefix="/projects", tags=["projects"])


# ── Schemas ───────────────────────────────────────────────────

class CreateProjectRequest(BaseModel):
    name: str
    description: Optional[str] = None


class UpdateProjectRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


# ── Helpers ───────────────────────────────────────────────────

async def _require_org(user: User) -> Organization:
    if not user.organizationId:
        raise HTTPException(status_code=400, detail="User has no organization")
    org = await Organization.get(user.organizationId)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org


def _serialize_project(p: Project) -> dict:
    return {
        "id": str(p.id),
        "name": p.title,
        "description": p.description,
        "organization_id": str(p.organizationId) if p.organizationId else None,
        "created_by": p.createdBy,
        "created_at": p.createdAt.isoformat(),
        "updated_at": p.updatedAt.isoformat(),
    }


async def _project_full(project: Project) -> dict:
    """Project detail with episodes + parts tree (legacy-style)."""
    episodes = await Episode.find(
        Episode.projectId == str(project.id),
    ).sort("episodeNumber").to_list()

    ep_list = []
    for ep in episodes:
        parts = await Part.find(
            Part.episodeId == str(ep.id),
        ).sort("partNumber").to_list()

        ep_list.append({
            "id": str(ep.id),
            "projectId": ep.projectId,
            "title": ep.title,
            "episodeNumber": ep.episodeNumber,
            "description": ep.description,
            "bibleText": ep.bibleText,
            "isActive": ep.isActive,
            "createdBy": ep.createdBy,
            "createdAt": ep.createdAt.isoformat(),
            "updatedAt": ep.updatedAt.isoformat(),
            "parts": [
                {
                    "id": str(p.id),
                    "projectId": p.projectId,
                    "episodeId": p.episodeId,
                    "partNumber": p.partNumber,
                    "title": p.title,
                    "scriptText": p.scriptText,
                    "createdBy": p.createdBy,
                    "createdAt": p.createdAt.isoformat(),
                    "updatedAt": p.updatedAt.isoformat(),
                }
                for p in parts
            ],
        })

    out = _serialize_project(project)
    out["episodes"] = ep_list
    return out


# ── GET /projects ─────────────────────────────────────────────

@router.get("")
async def list_projects(current_user: User = Depends(get_current_user)):
    org = await _require_org(current_user)
    projects = await Project.find(Project.organizationId == org.id).to_list()
    return [_serialize_project(p) for p in projects]


# ── POST /projects ────────────────────────────────────────────

@router.post("")
async def create_project(body: CreateProjectRequest, current_user: User = Depends(get_current_user)):
    org = await _require_org(current_user)
    project = Project(
        organizationId=org.id,
        title=body.name,
        description=body.description,
        createdBy=str(current_user.id),
    )
    await project.insert()
    return _serialize_project(project)


# ── GET /projects/{project_id} ────────────────────────────────

@router.get("/{project_id}")
async def get_project(project_id: str, current_user: User = Depends(get_current_user)):
    org = await _require_org(current_user)
    project = await Project.get(project_id)
    if not project or str(project.organizationId) != str(org.id):
        raise HTTPException(status_code=404, detail="Project not found")
    return await _project_full(project)


# ── PUT /projects/{project_id} ────────────────────────────────

@router.put("/{project_id}")
async def update_project(project_id: str, body: UpdateProjectRequest, current_user: User = Depends(get_current_user)):
    org = await _require_org(current_user)
    project = await Project.get(project_id)
    if not project or str(project.organizationId) != str(org.id):
        raise HTTPException(status_code=404, detail="Project not found")

    if body.name is not None:
        project.title = body.name
    if body.description is not None:
        project.description = body.description
    project.updatedAt = datetime.utcnow()
    await project.save()
    return _serialize_project(project)


# ── DELETE /projects/{project_id} ─────────────────────────────

@router.delete("/{project_id}")
async def delete_project(project_id: str, current_user: User = Depends(get_current_user)):
    org = await _require_org(current_user)
    project = await Project.get(project_id)
    if not project or str(project.organizationId) != str(org.id):
        raise HTTPException(status_code=404, detail="Project not found")

    # Cascade delete — episodes and parts
    await Part.find(Part.projectId == str(project.id)).delete()
    await Episode.find(Episode.projectId == str(project.id)).delete()
    await project.delete()
    return {"status": "success", "message": "Project deleted"}
