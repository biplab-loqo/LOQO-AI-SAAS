from beanie import Document, PydanticObjectId
from pydantic import Field, BaseModel
from datetime import datetime


class StoryboardMetadata(BaseModel):
    versionNo: int = 1
    edited: bool = False
    selected: bool = True


class Storyboard(Document):
    """One document = one version of ALL storyboard panels for a part.
    The `content` field is a JSON string containing the array of panels.
    Parsing the content gives individual panel numbers/details/etc.
    """
    organizationId: PydanticObjectId
    projectId: PydanticObjectId
    episodeId: PydanticObjectId
    partId: PydanticObjectId
    content: str
    metadata: StoryboardMetadata = Field(default_factory=StoryboardMetadata)

    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "storyboards"

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
