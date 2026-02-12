
from typing import List, Optional
from beanie import Document, PydanticObjectId
from pydantic import Field
from datetime import datetime

class Organization(Document):
    """Organization model"""
    name: str
    description: Optional[str] = None
    memberIds: List[PydanticObjectId] = []
    
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "organizations"
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
