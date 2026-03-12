"""
Auth endpoints — v1 RESTful API

POST /auth/login    → Google OAuth login (public)
GET  /auth/me       → Get current user profile
POST /auth/logout   → Logout (client-side token clear)
"""
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.core.config import settings
from app.core.auth import verify_google_token, create_access_token, get_current_user
from app.models.user import User
from app.models.organization import Organization
from app.models.project import Project
from app.models.episode import Episode
from app.models.part import Part
from beanie import PydanticObjectId

router = APIRouter(prefix="/auth", tags=["auth"])


# ── Schemas ───────────────────────────────────────────────────

class LoginRequest(BaseModel):
    id_token: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict
    has_organization: bool
    organization: Optional[dict] = None


# ── Helpers ───────────────────────────────────────────────────

async def _build_me_response(user: User) -> dict:
    org_data = None
    has_org = False

    if user.organizationId:
        org = await Organization.get(user.organizationId)
        if org:
            has_org = True
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
            org_data = {
                "id": str(org.id),
                "name": org.name,
                "created_at": org.createdAt.isoformat(),
                "members": members,
            }

    return {
        "id": str(user.id),
        "email": user.email,
        "name": user.name,
        "avatarUrl": user.avatarUrl,
        "bio": user.bio,
        "has_organization": has_org,
        "organization": org_data,
    }


# ── POST /auth/login ─────────────────────────────────────────

@router.post("/login")
async def login(body: LoginRequest):
    """Google OAuth login — no auth required."""
    google_info = await verify_google_token(body.id_token)

    user = await User.find_one(User.googleId == google_info["google_id"])
    if not user:
        user = await User.find_one(User.email == google_info["email"])
        if user:
            user.googleId = google_info["google_id"]
            if google_info.get("picture"):
                user.avatarUrl = google_info["picture"]
            await user.save()
        else:
            user = User(
                name=google_info["display_name"],
                email=google_info["email"],
                googleId=google_info["google_id"],
                avatarUrl=google_info.get("picture"),
            )
            await user.insert()

    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    me = await _build_me_response(user)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": me["id"],
            "email": me["email"],
            "name": me["name"],
            "avatarUrl": me["avatarUrl"],
            "bio": me["bio"],
        },
        "has_organization": me["has_organization"],
        "organization": me["organization"],
    }




# ── GET /auth/me ──────────────────────────────────────────────

@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user profile with organization info."""
    return await _build_me_response(current_user)


# ── POST /auth/logout ─────────────────────────────────────────

@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """Logout — client should clear token."""
    return {"status": "success", "message": "Logged out"}
