"""
Organization endpoints — v1 RESTful API

POST   /organizations          → Create organization
GET    /organizations/me       → Get current user's organization
PUT    /organizations/{id}     → Update organization
DELETE /organizations/{id}     → Delete organization
POST   /organizations/{id}/members → Add member to organization
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.core.auth import get_current_user
from app.models.user import User
from app.models.organization import Organization

router = APIRouter(prefix="/organizations", tags=["organizations"])


# ── Schemas ───────────────────────────────────────────────────

class CreateOrgRequest(BaseModel):
    name: str
    description: Optional[str] = None


class UpdateOrgRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class AddMemberRequest(BaseModel):
    email: str


# ── Helpers ───────────────────────────────────────────────────

async def _serialize_org(org: Organization) -> dict:
    members = []
    for mid in (org.memberIds or []):
        m = await User.get(mid)
        if m:
            members.append({
                "id": str(m.id),
                "email": m.email,
                "name": m.name,
                "avatarUrl": m.avatarUrl,
            })
    return {
        "id": str(org.id),
        "name": org.name,
        "description": org.description,
        "members": members,
        "created_at": org.createdAt.isoformat(),
    }


# ── POST /organizations ──────────────────────────────────────

@router.post("")
async def create_organization(body: CreateOrgRequest, current_user: User = Depends(get_current_user)):
    if current_user.organizationId:
        raise HTTPException(status_code=400, detail="User already has an organization")

    org = Organization(
        name=body.name,
        description=body.description,
        ownerId=str(current_user.id),
        memberIds=[str(current_user.id)],
    )
    await org.insert()

    current_user.organizationId = str(org.id)
    await current_user.save()

    return await _serialize_org(org)


# ── GET /organizations/me ────────────────────────────────────

@router.get("/me")
async def get_my_organization(current_user: User = Depends(get_current_user)):
    if not current_user.organizationId:
        raise HTTPException(status_code=404, detail="User has no organization")

    org = await Organization.get(current_user.organizationId)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    return await _serialize_org(org)


# ── GET /organizations/{org_id} ──────────────────────────────

@router.get("/{org_id}")
async def get_organization(org_id: str, current_user: User = Depends(get_current_user)):
    org = await Organization.get(org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return await _serialize_org(org)


# ── PUT /organizations/{org_id} ──────────────────────────────

@router.put("/{org_id}")
async def update_organization(org_id: str, body: UpdateOrgRequest, current_user: User = Depends(get_current_user)):
    org = await Organization.get(org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    if body.name is not None:
        org.name = body.name
    if body.description is not None:
        org.description = body.description
    org.updatedAt = datetime.utcnow()
    await org.save()

    return await _serialize_org(org)


# ── DELETE /organizations/{org_id} ───────────────────────────

@router.delete("/{org_id}")
async def delete_organization(org_id: str, current_user: User = Depends(get_current_user)):
    org = await Organization.get(org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    if org.ownerId != str(current_user.id):
        raise HTTPException(status_code=403, detail="Only owner can delete organization")

    for mid in org.memberIds:
        member = await User.get(mid)
        if member:
            member.organizationId = None
            await member.save()

    await org.delete()
    return {"status": "success", "message": "Organization deleted"}


# ── POST /organizations/{org_id}/members ─────────────────────

@router.post("/{org_id}/members")
async def add_member(org_id: str, body: AddMemberRequest, current_user: User = Depends(get_current_user)):
    org = await Organization.get(org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    new_member = await User.find_one(User.email == body.email)
    if not new_member:
        raise HTTPException(status_code=404, detail=f"User with email {body.email} not found")

    member_id = str(new_member.id)
    if member_id in org.memberIds:
        raise HTTPException(status_code=400, detail="User already a member")

    org.memberIds.append(member_id)
    org.updatedAt = datetime.utcnow()
    await org.save()

    new_member.organizationId = str(org.id)
    await new_member.save()

    return {
        "id": str(new_member.id),
        "email": new_member.email,
        "name": new_member.name,
        "avatarUrl": new_member.avatarUrl,
    }
