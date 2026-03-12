from typing import List, Optional
from beanie import Document
from pydantic import Field
from datetime import datetime


class Organization(Document):
    name: str
    description: Optional[str] = None
    ownerId: str
    memberIds: List[str] = Field(default_factory=list)

    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "organizations"
