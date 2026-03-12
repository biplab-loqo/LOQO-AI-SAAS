"""WorkflowMedia — user-uploaded media assets.

For S3 presign/confirm upload flow. This is separate from pipeline Artifacts.
Stores metadata for user-uploaded files (S3 key, bucket, etc.).
"""
from datetime import datetime
from typing import Optional, Literal

from beanie import Document
from pydantic import BaseModel, Field


class StorageInfo(BaseModel):
    provider: Literal["s3", "local"] = "s3"
    bucket: str = ""
    key: str = ""
    mime_type: Optional[str] = None
    size_bytes: Optional[int] = None


class WorkflowMedia(Document):
    execution_id: Optional[str] = Field(None, alias="executionId")
    step_version_id: Optional[str] = Field(None, alias="stepVersionId")

    type: Literal["image", "video", "audio"] = "image"
    role: Literal["intermediate", "final"] = "final"

    storage: StorageInfo = Field(default_factory=StorageInfo)
    cdn_url: Optional[str] = Field(None, alias="cdnUrl")

    created_at: datetime = Field(default_factory=datetime.utcnow, alias="createdAt")

    class Settings:
        name = "workflowMedia"

    model_config = {"populate_by_name": True}
