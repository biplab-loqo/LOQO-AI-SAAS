from typing import Optional
from beanie import Document
from pydantic import Field
from datetime import datetime


class Part(Document):
    projectId: str
    episodeId: str
    partNumber: int
    title: str
    description: Optional[str] = None
    scriptText: Optional[str] = None
    isActive: bool = True
    createdBy: str

    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "parts"

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
