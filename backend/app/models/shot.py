"""Shot document — independent shot table."""
from datetime import datetime
from typing import List, Optional

from beanie import Document, PydanticObjectId
from pydantic import BaseModel, Field


class ShotMediaRef(BaseModel):
    object_id: Optional[str] = Field(None, alias="objectId")
    display_name: str = Field(..., alias="displayName")
    aws_url: str = Field(..., alias="awsUrl")

    model_config = {"populate_by_name": True}


class CharacterReference(BaseModel):
    character_id: Optional[str] = Field(None, alias="characterId")
    reference_image: Optional[str] = Field(None, alias="referenceImage")
    display_name: str = Field(..., alias="displayName")
    aws_url: str = Field(..., alias="awsUrl")

    model_config = {"populate_by_name": True}


class LocationReference(BaseModel):
    location_id: Optional[str] = Field(None, alias="locationId")
    reference_image: Optional[str] = Field(None, alias="referenceImage")
    display_name: str = Field(..., alias="displayName")
    aws_url: str = Field(..., alias="awsUrl")

    model_config = {"populate_by_name": True}


class PreviousReference(BaseModel):
    reference_image: str = Field(..., alias="referenceImage")
    display_name: str = Field(..., alias="displayName")
    aws_url: str = Field(..., alias="awsUrl")

    model_config = {"populate_by_name": True}


class ShotMetadata(BaseModel):
    shot_number: int = Field(..., alias="shotNumber")
    beat_number: Optional[int] = Field(None, alias="beatNumber")

    model_config = {"populate_by_name": True}


class ShotExecutionMetadata(BaseModel):
    provider: Optional[str] = None
    model: Optional[str] = None
    model_version: Optional[str] = Field(None, alias="modelVersion")
    resolution: Optional[str] = None
    aspect_ratio: Optional[str] = Field(None, alias="aspectRatio")
    output_format: Optional[str] = Field(None, alias="outputFormat")
    quality: Optional[str] = None
    prompt_language: Optional[str] = Field(None, alias="promptLanguage")
    reference_mode: Optional[str] = Field(None, alias="referenceMode")
    reference_count: Optional[int] = Field(None, alias="referenceCount")
    temperature: Optional[float] = None
    seed: Optional[int] = None
    retry_count: Optional[int] = Field(None, alias="retryCount")
    requested_at: Optional[datetime] = Field(None, alias="requestedAt")
    generated_at: Optional[datetime] = Field(None, alias="generatedAt")
    order_id: Optional[str] = Field(None, alias="orderId")

    model_config = {"populate_by_name": True}


class Shot(Document):
    # Identity + hierarchy
    execution_id: PydanticObjectId = Field(..., alias="executionId")
    org_id: Optional[str] = Field(None, alias="orgId")
    project_id: Optional[str] = Field(None, alias="projectId")
    episode_id: Optional[str] = Field(None, alias="episodeId")
    part_id: Optional[str] = Field(None, alias="partId")

    # Requested required fields
    shot_id: str = Field(..., alias="shotId")
    sequence_no: int = Field(..., alias="sequenceNo")
    version: int = 1
    is_approved: bool = Field(False, alias="isApproved")

    # Payload
    character_references: List[CharacterReference] = Field(default_factory=list, alias="characterReferences")
    previous_references: List[PreviousReference] = Field(default_factory=list, alias="previousReferences")
    location_references: List[LocationReference] = Field(default_factory=list, alias="locationReferences")
    shot_metadata: ShotMetadata = Field(..., alias="shotMetadata")
    one_liner_shot_intent: str = Field(..., alias="oneLinerShotIntent")
    start_image_prompt: str = Field(..., alias="startImagePrompt")
    animation_prompt: Optional[str] = Field(None, alias="animationPrompt")  # Optional: clips have this, shots may not
    start_image: Optional[ShotMediaRef] = Field(None, alias="startImage")
    execution_metadata: ShotExecutionMetadata = Field(default_factory=ShotExecutionMetadata, alias="executionMetadata")

    created_at: datetime = Field(default_factory=datetime.utcnow, alias="createdAt")
    updated_at: datetime = Field(default_factory=datetime.utcnow, alias="updatedAt")

    class Settings:
        name = "shots"
        indexes = [
            [("executionId", 1), ("shotId", 1), ("version", -1)],
            [("executionId", 1), ("sequenceNo", 1)],
            [("projectId", 1), ("episodeId", 1), ("partId", 1), ("sequenceNo", 1)],
        ]

    model_config = {"populate_by_name": True}
