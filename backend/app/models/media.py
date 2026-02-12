from typing import Optional
from beanie import Document, PydanticObjectId
from pydantic import Field, BaseModel
from datetime import datetime


class MediaMetadata(BaseModel):
    versionNo: int = 1
    edited: bool = False
    selected: bool = True


class Image(Document):
    organizationId: PydanticObjectId
    projectId: PydanticObjectId
    episodeId: Optional[PydanticObjectId] = None
    partId: Optional[PydanticObjectId] = None
    shotId: Optional[PydanticObjectId] = None
    name: str = ""
    imageUrl: str
    category: str = "shot"  # "shot", "character", "location", "prop"
    metadata: MediaMetadata = Field(default_factory=MediaMetadata)

    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "images"

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True


class Clip(Document):
    organizationId: PydanticObjectId
    projectId: PydanticObjectId
    episodeId: PydanticObjectId
    partId: PydanticObjectId
    shotId: Optional[PydanticObjectId] = None
    name: str = ""
    clipUrl: str
    metadata: MediaMetadata = Field(default_factory=MediaMetadata)

    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "clips"

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True

