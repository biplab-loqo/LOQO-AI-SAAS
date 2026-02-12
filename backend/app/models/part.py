from typing import Optional
from beanie import Document, PydanticObjectId
from pydantic import Field
from datetime import datetime


class Part(Document):
    projectId: PydanticObjectId
    episodeId: PydanticObjectId
    partNumber: int
    title: str
    scriptText: Optional[str] = None
    createdBy: Optional[PydanticObjectId] = None

    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "parts"

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True

