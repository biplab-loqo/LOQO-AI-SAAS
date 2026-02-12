from typing import Optional, List
from beanie import Document, PydanticObjectId
from pydantic import Field, BaseModel
from datetime import datetime

from app.models.character import AssetScope


class Prop(Document):
    """A prop / extra in a project, with descriptive content and reference images."""
    organizationId: PydanticObjectId
    projectId: PydanticObjectId
    name: str
    category: str = "general"  # e.g. "vehicle", "weapon", "furniture", etc.
    content: str  # JSON string with full prop data (like beats/shots)
    imageIds: List[PydanticObjectId] = Field(default_factory=list)
    scope: AssetScope = Field(default_factory=AssetScope)

    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "props"

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
