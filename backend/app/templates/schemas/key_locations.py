"""Key Locations step output schema."""
from typing import List, Optional
from pydantic import BaseModel


class VisualProfile(BaseModel):
    environment: str
    cultural_or_era_style: str
    architecture_or_space: str
    lighting_time_of_day: str
    key_objects_or_features: Optional[List[str]] = []


class KeyLocation(BaseModel):
    location_id: int
    name: str
    type: str                   # Interior | Exterior | Mixed
    narrative_role: str
    visual_profile: VisualProfile


class KeyLocationsData(BaseModel):
    key_locations: List[KeyLocation]
