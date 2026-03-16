"""Location document — independent location table."""
from datetime import datetime
from typing import Any, Dict, List, Optional

from beanie import Document
from pydantic import Field


class Location(Document):
    # Context IDs
    org_id: Optional[str] = None
    project_id: Optional[str] = None
    episode_id: Optional[str] = None
    part_id: Optional[str] = None
    execution_id: Optional[str] = None

    # Payload (workflowdb_v16-compatible schema)
    location_description: Dict[str, Any] = Field(default_factory=dict)
    anchor_images: List[Dict[str, Any]] = Field(default_factory=list)
    view_pack_images: List[Dict[str, Any]] = Field(default_factory=list)
    collage_image: Optional[Dict[str, Any]] = None
    location_camera_library: Optional[Dict[str, Any]] = None

    # Statusing / versioning
    status: str = "succeeded"
    is_approved: bool = False
    version: int = 1

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "locations"
        indexes = [
            [("execution_id", 1), ("part_id", 1)],
            [("project_id", 1), ("episode_id", 1), ("part_id", 1)],
            [("version", -1), ("updated_at", -1)],
            [("location_description.location_id", 1), ("version", -1)],
            [("location_description.name", 1), ("version", -1)],
            [("location_description.display_name", 1), ("version", -1)],
        ]

    model_config = {"populate_by_name": True}
