"""Clip document — independent clip table linked to Shot."""
from datetime import datetime
from typing import List, Optional

from beanie import Document, PydanticObjectId
from pydantic import BaseModel, Field


class ClipMediaRef(BaseModel):
    object_id: Optional[str] = Field(None, alias="objectId")
    display_name: str = Field(..., alias="displayName")
    aws_url: str = Field(..., alias="awsUrl")

    model_config = {"populate_by_name": True}


class ClipExecutionMetadata(BaseModel):
    provider: Optional[str] = None
    model: Optional[str] = None
    model_version: Optional[str] = Field(None, alias="modelVersion")
    duration_seconds: Optional[int] = Field(None, alias="durationSeconds")
    aspect_ratio: Optional[str] = Field(None, alias="aspectRatio")
    output_format: Optional[str] = Field(None, alias="outputFormat")
    quality: Optional[str] = None
    prompt_language: Optional[str] = Field(None, alias="promptLanguage")
    input_media_count: Optional[int] = Field(None, alias="inputMediaCount")
    temperature: Optional[float] = None
    seed: Optional[int] = None
    retry_count: Optional[int] = Field(None, alias="retryCount")
    requested_at: Optional[datetime] = Field(None, alias="requestedAt")
    generated_at: Optional[datetime] = Field(None, alias="generatedAt")
    order_id: Optional[str] = Field(None, alias="orderId")

    model_config = {"populate_by_name": True}


class Clip(Document):
    # Identity + hierarchy
    execution_id: PydanticObjectId = Field(..., alias="executionId")
    org_id: Optional[str] = Field(None, alias="orgId")
    project_id: Optional[str] = Field(None, alias="projectId")
    episode_id: Optional[str] = Field(None, alias="episodeId")
    part_id: Optional[str] = Field(None, alias="partId")

    # Requested required fields
    clip_id: str = Field(..., alias="clipId")
    shot_id: str = Field(..., alias="shotId")
    sequence_no: int = Field(..., alias="sequenceNo")
    version: int = 1
    is_approved: bool = Field(False, alias="isApproved")

    # Payload
    input_images: List[ClipMediaRef] = Field(default_factory=list, alias="inputImages")
    animation_prompt: str = Field(..., alias="animationPrompt")
    clip_output: Optional[ClipMediaRef] = Field(None, alias="clipOutput")
    execution_metadata: ClipExecutionMetadata = Field(default_factory=ClipExecutionMetadata, alias="executionMetadata")

    created_at: datetime = Field(default_factory=datetime.utcnow, alias="createdAt")
    updated_at: datetime = Field(default_factory=datetime.utcnow, alias="updatedAt")

    class Settings:
        name = "clips"
        indexes = [
            [("executionId", 1), ("clipId", 1), ("version", -1)],
            [("executionId", 1), ("shotId", 1), ("sequenceNo", 1)],
            [("projectId", 1), ("episodeId", 1), ("partId", 1), ("sequenceNo", 1)],
        ]

    model_config = {"populate_by_name": True}
