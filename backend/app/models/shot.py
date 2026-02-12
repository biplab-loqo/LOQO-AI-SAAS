from beanie import Document, PydanticObjectId
from pydantic import Field, BaseModel
from datetime import datetime


class ShotMetadata(BaseModel):
    versionNo: int = 1
    edited: bool = False
    selected: bool = True


class Shot(Document):
    """One document = one version of ALL shots for a part.
    The `content` field is a JSON string containing the array of shots.
    Parsing the content gives individual shot numbers/names/etc.
    """
    organizationId: PydanticObjectId
    projectId: PydanticObjectId
    episodeId: PydanticObjectId
    partId: PydanticObjectId
    content: str
    metadata: ShotMetadata = Field(default_factory=ShotMetadata)

    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "shots"

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
