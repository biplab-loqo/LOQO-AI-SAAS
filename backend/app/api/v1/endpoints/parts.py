"""
Part endpoints — v1 RESTful API

GET    /parts?episodeId=X         → List parts for an episode
POST   /parts                     → Create part (+ optionally create execution from template)
GET    /parts/{part_id}           → Get part details
PUT    /parts/{part_id}           → Update part
PUT    /parts/{part_id}/script    → Update part script
DELETE /parts/{part_id}           → Delete part (cascade)
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional

from app.core.auth import get_current_user
from app.models.user import User
from app.models.organization import Organization
from app.models.episode import Episode
from app.models.part import Part
from app.models.template_version import TemplateVersion
from app.models.message import Message
from app.services.sqs_service import send_to_sqs

router = APIRouter(prefix="/parts", tags=["parts"])


# ── Schemas ───────────────────────────────────────────────────

class CreatePartRequest(BaseModel):
    episodeId: str
    title: str = "Untitled Part"
    partNumber: int = 1
    scriptText: Optional[str] = None
    templateVersionId: Optional[str] = None


class UpdatePartRequest(BaseModel):
    title: Optional[str] = None
    partNumber: Optional[int] = None


class UpdateScriptRequest(BaseModel):
    scriptText: str


# ── Helpers ───────────────────────────────────────────────────

async def _require_org(user: User) -> Organization:
    if not user.organizationId:
        raise HTTPException(status_code=400, detail="User has no organization")
    org = await Organization.get(user.organizationId)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org


def _ser_part(p: Part) -> dict:
    return {
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


# ── GET /parts?episodeId=X ────────────────────────────────────

@router.get("")
async def list_parts(
    episodeId: str = Query(...),
    current_user: User = Depends(get_current_user),
):
    await _require_org(current_user)
    parts = await Part.find(Part.episodeId == episodeId).to_list()
    return [_ser_part(p) for p in parts]


# ── POST /parts ───────────────────────────────────────────────

@router.post("")
async def create_part(
    body: CreatePartRequest,
    current_user: User = Depends(get_current_user),
):
    org = await _require_org(current_user)

    ep = await Episode.get(body.episodeId)
    if not ep:
        raise HTTPException(status_code=404, detail="Episode not found")

    part = Part(
        projectId=ep.projectId,
        episodeId=str(ep.id),
        partNumber=body.partNumber,
        title=body.title,
        scriptText=body.scriptText,
        createdBy=str(current_user.id),
    )
    await part.insert()

    # If a template was selected, send SQS to kick off the pipeline.
    # The AI generation service creates the WorkflowExecution upon receiving
    # this message — the frontend polls /workflows/by-part/{partId} until it appears.
    if body.templateVersionId:
        tv = await TemplateVersion.get(body.templateVersionId)
        if not tv:
            raise HTTPException(status_code=404, detail="Template version not found")

        sorted_steps = sorted(tv.steps, key=lambda x: x.order)
        first_step_key = sorted_steps[0].key if sorted_steps else "run_show_bible"
        template_key = tv.template_key or ""

        user_id = str(current_user.id)
        org_id = str(org.id)
        project_id = ep.projectId
        episode_id = str(ep.id)
        part_id = str(part.id)

        # Save a Message record for auditability
        msg = Message(
            step_key=[first_step_key],
            org_id=org_id,
            project_id=project_id,
            episode_id=episode_id,
            part_id=part_id,
            action="generate",
            user_id=user_id,
            template_version_id=body.templateVersionId,
        )
        await msg.insert()

        # Send SQS — no executionId yet, AI service creates the execution
        await send_to_sqs(
            step_key=[first_step_key],
            part_id=part_id,
            org_id=org_id,
            project_id=project_id,
            episode_id=episode_id,
            user_id=user_id,
            template_key=template_key,
            action="generate",
        )

    return _ser_part(part)


# ── GET /parts/{part_id} ──────────────────────────────────────

@router.get("/{part_id}")
async def get_part(
    part_id: str,
    current_user: User = Depends(get_current_user),
):
    await _require_org(current_user)
    part = await Part.get(part_id)
    if not part:
        raise HTTPException(status_code=404, detail="Part not found")
    return _ser_part(part)


# ── PUT /parts/{part_id} ──────────────────────────────────────

@router.put("/{part_id}")
async def update_part(
    part_id: str,
    body: UpdatePartRequest,
    current_user: User = Depends(get_current_user),
):
    await _require_org(current_user)

    part = await Part.get(part_id)
    if not part:
        raise HTTPException(status_code=404, detail="Part not found")

    if body.title is not None:
        part.title = body.title
    if body.partNumber is not None:
        part.partNumber = body.partNumber
    part.updatedAt = datetime.utcnow()
    await part.save()
    return _ser_part(part)


# ── PUT /parts/{part_id}/script ───────────────────────────────

@router.put("/{part_id}/script")
async def update_script(
    part_id: str,
    body: UpdateScriptRequest,
    current_user: User = Depends(get_current_user),
):
    await _require_org(current_user)

    part = await Part.get(part_id)
    if not part:
        raise HTTPException(status_code=404, detail="Part not found")

    part.scriptText = body.scriptText
    part.updatedAt = datetime.utcnow()
    await part.save()
    return {"status": "success", "message": "Script updated"}


# ── DELETE /parts/{part_id} ───────────────────────────────────

@router.delete("/{part_id}")
async def delete_part(
    part_id: str,
    current_user: User = Depends(get_current_user),
):
    await _require_org(current_user)

    part = await Part.get(part_id)
    if not part:
        raise HTTPException(status_code=404, detail="Part not found")

    await part.delete()
    return {"status": "success", "message": "Part deleted"}
