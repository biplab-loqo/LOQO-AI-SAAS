
from typing import Optional
from beanie import Document, PydanticObjectId
from pydantic import Field
from datetime import datetime

class Project(Document):
    organizationId: PydanticObjectId
    name: str
    description: Optional[str] = None
    createdBy: PydanticObjectId
    
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "projects"
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
