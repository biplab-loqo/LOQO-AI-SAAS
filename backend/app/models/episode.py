from typing import Optional
from beanie import Document, PydanticObjectId
from pydantic import Field
from datetime import datetime


class Episode(Document):
    projectId: PydanticObjectId
    episodeNumber: int
    bibleText: Optional[str] = None
    createdBy: Optional[PydanticObjectId] = None

    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "episodes"

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
