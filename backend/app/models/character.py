from typing import Optional, List
from beanie import Document, PydanticObjectId
from pydantic import Field, BaseModel
from datetime import datetime


class AssetScope(BaseModel):
    """Controls where an asset is visible.
    project=True means visible across the entire project.
    episodeIds / partIds narrow visibility to specific episodes/parts."""
    project: bool = True
    episodeIds: List[PydanticObjectId] = Field(default_factory=list)
    partIds: List[PydanticObjectId] = Field(default_factory=list)


class Character(Document):
    """A character in a project, with descriptive content and reference images."""
    organizationId: PydanticObjectId
    projectId: PydanticObjectId
    name: str
    content: str  # JSON string with full character data (like beats/shots)
    imageIds: List[PydanticObjectId] = Field(default_factory=list)
    scope: AssetScope = Field(default_factory=AssetScope)

    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "characters"

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
