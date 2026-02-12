"""User profile endpoints."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional

from app.models.user import User
from app.core.auth import get_current_active_user

router = APIRouter()


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None


class ProfileOut(BaseModel):
    id: str
    email: str
    name: str
    avatarUrl: Optional[str] = None
    bio: Optional[str] = None
    created_at: str
    has_organization: bool


def _profile(u: User) -> ProfileOut:
    return ProfileOut(
        id=str(u.id), email=u.email, name=u.name, avatarUrl=u.avatarUrl,
        bio=u.bio, created_at=u.createdAt.isoformat(),
        has_organization=u.organizationId is not None,
    )


@router.get("/profile", response_model=ProfileOut)
async def get_profile(user: User = Depends(get_current_active_user)):
    return _profile(user)


@router.put("/profile", response_model=ProfileOut)
async def update_profile(body: ProfileUpdate, user: User = Depends(get_current_active_user)):
    if body.name is not None:
        user.name = body.name
    if body.bio is not None:
        user.bio = body.bio
    await user.save()
    return _profile(user)

