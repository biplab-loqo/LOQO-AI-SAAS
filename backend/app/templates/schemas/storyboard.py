"""Storyboard step output schema."""
from typing import List
from pydantic import BaseModel


class PanelMetadata(BaseModel):
    panel_number: int
    beat_number: int
    shot_summary: str


class Blocking(BaseModel):
    positions: str
    facing: str
    distance: str
    landmark_relation: str


class FramePlan(BaseModel):
    character_poses: List[str]
    characters_mode: str
    blocking: Blocking


class Composition(BaseModel):
    subject_composition: str
    action: str


class StoryContext(BaseModel):
    visual_style_guide: str
    project_context: str
    era_culture_context: str
    emotional_thematic_intent: str


class Audio(BaseModel):
    dialogue: str
    audio_cue_intent: str


class Motion(BaseModel):
    hero_subject: str
    hero_action: str
    hero_direction: str
    hero_intensity: str
    secondary_subject: str
    secondary_action: str
    secondary_intensity: str


class Animation(BaseModel):
    method: str
    duration_sec: int
    start_frame: str
    end_frame: str
    clip_output: str
    motion: Motion
    camera_motion_rule: str


class StoryboardPanel(BaseModel):
    metadata: PanelMetadata
    shot_id: str
    location_camera_node_id: str
    location_camera_reference: str
    lens_mm: int
    shot_type: str
    camera_height: str
    camera_angle: str
    previous_reference: str
    frame_plan: FramePlan
    composition: Composition
    story_context: StoryContext
    audio: Audio
    keyframe_output: str
    animation: Animation


class StoryboardData(BaseModel):
    storyboard: List[StoryboardPanel]
