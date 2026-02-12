"""Authentication endpoints: Google OAuth login, /me, logout."""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from datetime import timedelta

from app.models.user import User
from app.models.organization import Organization
from app.core.auth import verify_google_token, create_access_token, get_current_active_user
from app.core.config import settings

router = APIRouter()


class TokenRequest(BaseModel):
    id_token: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict
    has_organization: bool
    organization: Optional[dict] = None


class UserMeResponse(BaseModel):
    id: str
    email: str
    name: str
    avatarUrl: Optional[str] = None
    bio: Optional[str] = None
    has_organization: bool
    organization: Optional[dict] = None


async def _build_org_payload(org: Organization) -> dict:
    members = []
    for mid in org.memberIds:
        m = await User.get(mid)
        if m:
            members.append({"id": str(m.id), "email": m.email, "name": m.name, "avatarUrl": m.avatarUrl})
    return {"id": str(org.id), "name": org.name, "created_at": org.createdAt.isoformat(), "members": members}


@router.post("/google", response_model=TokenResponse)
async def google_auth(req: TokenRequest):
    info = await verify_google_token(req.id_token)
    user = await User.find_one(User.googleId == info["google_id"])
    if not user:
        user = User(email=info["email"], googleId=info["google_id"], name=info["display_name"], avatarUrl=info.get("picture"))
        await user.insert()

    org_data, has_org = None, False
    if user.organizationId:
        org = await Organization.get(user.organizationId)
        if org:
            has_org = True
            org_data = await _build_org_payload(org)

    token = create_access_token(data={"sub": str(user.id), "email": user.email},
                                expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    return TokenResponse(
        access_token=token,
        user={"id": str(user.id), "email": user.email, "name": user.name, "avatarUrl": user.avatarUrl, "bio": user.bio},
        has_organization=has_org, organization=org_data,
    )


@router.get("/me", response_model=UserMeResponse)
async def get_me(current_user: User = Depends(get_current_active_user)):
    org_data, has_org = None, False
    if current_user.organizationId:
        org = await Organization.get(current_user.organizationId)
        if org:
            has_org = True
            org_data = await _build_org_payload(org)
    return UserMeResponse(
        id=str(current_user.id), email=current_user.email, name=current_user.name,
        avatarUrl=current_user.avatarUrl, bio=current_user.bio,
        has_organization=has_org, organization=org_data,
    )


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_active_user)):
    return {"message": "Successfully logged out"}
