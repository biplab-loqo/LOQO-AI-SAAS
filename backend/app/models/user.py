from typing import Optional
from beanie import Document
from pydantic import Field, EmailStr
from datetime import datetime


class User(Document):
    name: str
    email: EmailStr = Field(unique=True)
    avatarUrl: Optional[str] = None
    bio: Optional[str] = None
    authProvider: str = "google"
    googleId: Optional[str] = Field(default=None, unique=True, sparse=True)
    organizationId: Optional[str] = None

    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "users"
