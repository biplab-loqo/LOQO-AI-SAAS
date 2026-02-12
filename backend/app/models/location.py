from typing import Optional, List
from beanie import Document, PydanticObjectId
from pydantic import Field, BaseModel
from datetime import datetime

from app.models.character import AssetScope


class Location(Document):
    """A location in a project, with descriptive content and reference images."""
    organizationId: PydanticObjectId
    projectId: PydanticObjectId
    name: str
    content: str  # JSON string with full location data (like beats/shots)
    imageIds: List[PydanticObjectId] = Field(default_factory=list)
    scope: AssetScope = Field(default_factory=AssetScope)

    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "locations"

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
