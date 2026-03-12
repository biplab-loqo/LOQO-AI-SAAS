from typing import Optional
from beanie import Document, PydanticObjectId
from pydantic import Field
from datetime import datetime


class Episode(Document):
    projectId: str  # Project ID as string
    title: str
    name: Optional[str] = None  # Display name for the episode
    episodeNumber: int
    description: Optional[str] = None
    bibleText: Optional[str] = None
    isActive: bool = True
    createdBy: str  # User ID as string

    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "episodes"

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
