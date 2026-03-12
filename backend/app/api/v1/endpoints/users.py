"""
User endpoints — v1 RESTful API

GET    /users/me           → Get current user profile
PUT    /users/me           → Update current user profile
GET    /users/{user_id}    → Get user by ID
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.core.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/users", tags=["users"])


# ── Schemas ───────────────────────────────────────────────────

class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None


# ── GET /users/me ─────────────────────────────────────────────

@router.get("/me")
async def get_my_profile(current_user: User = Depends(get_current_user)):
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "name": current_user.name,
        "avatarUrl": current_user.avatarUrl,
        "bio": current_user.bio,
        "organizationId": current_user.organizationId,
        "createdAt": current_user.createdAt.isoformat(),
        "updatedAt": current_user.updatedAt.isoformat(),
    }


# ── PUT /users/me ─────────────────────────────────────────────

@router.put("/me")
async def update_my_profile(body: UpdateProfileRequest, current_user: User = Depends(get_current_user)):
    if body.name is not None:
        current_user.name = body.name
    if body.bio is not None:
        current_user.bio = body.bio
    current_user.updatedAt = datetime.utcnow()
    await current_user.save()
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "name": current_user.name,
        "avatarUrl": current_user.avatarUrl,
        "bio": current_user.bio,
        "organizationId": current_user.organizationId,
        "createdAt": current_user.createdAt.isoformat(),
        "updatedAt": current_user.updatedAt.isoformat(),
    }


# ── GET /users/{user_id} ─────────────────────────────────────

@router.get("/{user_id}")
async def get_user(user_id: str, current_user: User = Depends(get_current_user)):
    user = await User.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": str(user.id),
        "email": user.email,
        "name": user.name,
        "avatarUrl": user.avatarUrl,
        "bio": user.bio,
    }
