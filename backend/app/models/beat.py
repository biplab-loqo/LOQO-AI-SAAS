from beanie import Document, PydanticObjectId
from pydantic import Field, BaseModel
from datetime import datetime


class BeatMetadata(BaseModel):
    versionNo: int = 1
    edited: bool = False
    selected: bool = True


class Beat(Document):
    """One document = one version of ALL beats for a part.
    The `content` field is a JSON string containing the array of beats.
    Parsing the content gives individual beat numbers/titles/etc.
    """
    organizationId: PydanticObjectId
    projectId: PydanticObjectId
    episodeId: PydanticObjectId
    partId: PydanticObjectId
    content: str
    metadata: BeatMetadata = Field(default_factory=BeatMetadata)

    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "beats"

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
