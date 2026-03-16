"""Character document — independent character table."""
from datetime import datetime
from typing import Any, Dict, List, Optional

from beanie import Document
from pydantic import Field


class Character(Document):
    # Context IDs
    org_id: Optional[str] = None
    project_id: Optional[str] = None
    episode_id: Optional[str] = None
    part_id: Optional[str] = None
    execution_id: Optional[str] = None

    # Payload (workflowdb_v16-compatible schema)
    character_description: Dict[str, Any] = Field(default_factory=dict)
    anchor_images: List[Dict[str, Any]] = Field(default_factory=list)
    view_pack_images: List[Dict[str, Any]] = Field(default_factory=list)
    collage_image: Optional[Dict[str, Any]] = None
    character_camera_library: Optional[Dict[str, Any]] = None

    # Statusing / versioning
    status: str = "succeeded"
    is_approved: bool = False
    version: int = 1

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "characters"
        indexes = [
            [("execution_id", 1), ("part_id", 1)],
            [("project_id", 1), ("episode_id", 1), ("part_id", 1)],
            [("version", -1), ("updated_at", -1)],
            [("character_description.name_identifier", 1), ("version", -1)],
            [("character_description.character_id", 1), ("version", -1)],
            [("character_description.display_name", 1), ("version", -1)],
        ]

    model_config = {"populate_by_name": True}
