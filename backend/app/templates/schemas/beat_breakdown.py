"""Beat Breakdown step output schema."""
from typing import List
from pydantic import BaseModel


class Beat(BaseModel):
    beat_number: int
    title: str
    scene_ref: str
    screenplay_lines: List[str]
    time_range: str
    description: str
    emotion: str


class BeatBreakdownData(BaseModel):
    beats: List[Beat]
