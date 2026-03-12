from typing import Optional
from beanie import Document, PydanticObjectId
from pydantic import Field
from datetime import datetime


class Project(Document):
    organizationId: Optional[PydanticObjectId] = None
    title: str
    description: Optional[str] = None
    createdBy: str
    isActive: bool = True

    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "projects"
