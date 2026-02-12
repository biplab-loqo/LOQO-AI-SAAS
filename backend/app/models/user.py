
from typing import Optional
from beanie import Document, PydanticObjectId
from pydantic import Field, EmailStr
from datetime import datetime

class User(Document):
    """User model"""
    name: str
    email: EmailStr = Field(unique=True)
    avatarUrl: Optional[str] = None
    bio: Optional[str] = None
    googleId: str = Field(unique=True)
    organizationId: Optional[PydanticObjectId] = None
    
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "users"
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
