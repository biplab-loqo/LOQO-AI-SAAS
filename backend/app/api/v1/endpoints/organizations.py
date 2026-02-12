"""Organization endpoints: create, get, add member, list members."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from app.models.organization import Organization
from app.models.user import User
from app.core.auth import get_current_active_user

router = APIRouter()


class OrgCreate(BaseModel):
    name: str


class AddMember(BaseModel):
    email: str


class MemberOut(BaseModel):
    id: str
    email: str
    name: str
    avatarUrl: Optional[str] = None


class OrgOut(BaseModel):
    id: str
    name: str
    members: List[MemberOut]
    created_at: str


async def _org_response(org: Organization) -> OrgOut:
    members = []
    for mid in org.memberIds:
        m = await User.get(mid)
        if m:
            members.append(MemberOut(id=str(m.id), email=m.email, name=m.name, avatarUrl=m.avatarUrl))
    return OrgOut(id=str(org.id), name=org.name, members=members, created_at=org.createdAt.isoformat())


@router.post("/", response_model=OrgOut)
async def create_organization(body: OrgCreate, user: User = Depends(get_current_active_user)):
    if user.organizationId:
        raise HTTPException(400, "User already belongs to an organization")
    if await Organization.find_one(Organization.name == body.name):
        raise HTTPException(400, "Organization name already taken")
    org = Organization(name=body.name, memberIds=[user.id])
    await org.insert()
    user.organizationId = org.id
    await user.save()
    return await _org_response(org)


@router.get("/my-organization", response_model=OrgOut)
async def get_my_organization(user: User = Depends(get_current_active_user)):
    if not user.organizationId:
        raise HTTPException(404, "User does not belong to any organization")
    org = await Organization.get(user.organizationId)
    if not org:
        raise HTTPException(404, "Organization not found")
    return await _org_response(org)


@router.post("/add-member", response_model=MemberOut)
async def add_member(body: AddMember, user: User = Depends(get_current_active_user)):
    if not user.organizationId:
        raise HTTPException(400, "No organization")
    org = await Organization.get(user.organizationId)
    if not org:
        raise HTTPException(404, "Organization not found")
    member = await User.find_one(User.email == body.email)
    if not member:
        raise HTTPException(404, f"User with email {body.email} not found")
    if member.organizationId:
        raise HTTPException(400, "User already belongs to an organization")
    org.memberIds.append(member.id)
    await org.save()
    member.organizationId = org.id
    await member.save()
    return MemberOut(id=str(member.id), email=member.email, name=member.name, avatarUrl=member.avatarUrl)


@router.get("/members", response_model=List[MemberOut])
async def list_members(user: User = Depends(get_current_active_user)):
    if not user.organizationId:
        raise HTTPException(400, "No organization")
    org = await Organization.get(user.organizationId)
    if not org:
        raise HTTPException(404, "Organization not found")
    out = []
    for mid in org.memberIds:
        m = await User.get(mid)
        if m:
            out.append(MemberOut(id=str(m.id), email=m.email, name=m.name, avatarUrl=m.avatarUrl))
    return out
