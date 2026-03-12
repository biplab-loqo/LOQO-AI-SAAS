"""StepVersion — maps to the `stepVersions` collection.

Schema includes:
  input  — raw input dict (prompts, config, previous step refs, etc.)
  output — raw JSON dict (any structure, typically { blobs: [...], artifactRefs: {...}, s3_uris: [...], counts: {...} })

No separate Artifact collection — images are referenced via s3_uris/artifactRefs
embedded in the step version output.
"""
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from beanie import Document, PydanticObjectId
from pydantic import BaseModel, Field


class StepVersionLineage(BaseModel):
    type: Optional[str] = None
    created_from_version_id: Optional[PydanticObjectId] = Field(None, alias="createdFromVersionId")
    model_config = {"populate_by_name": True}


class StepVersion(Document):
    execution_id: Optional[PydanticObjectId] = Field(None, alias="executionId")
    step_key: Optional[str] = Field(None, alias="stepKey")
    version_no: Optional[int] = Field(None, alias="versionNo")

    # Context IDs — link this step version back to the project hierarchy
    org_id: Optional[str] = Field(None, alias="orgId")
    project_id: Optional[str] = Field(None, alias="projectId")
    episode_id: Optional[str] = Field(None, alias="episodeId")
    part_id: Optional[str] = Field(None, alias="partId")

    lineage: Optional[StepVersionLineage] = None

    # Raw JSON input — any structure (step prompts, config, references)
    input: Optional[Dict[str, Any]] = None

    # Raw JSON output — any structure, parsed generically by frontend
    output: Optional[Dict[str, Any]] = None

    status: str = "pending"
    error: Optional[Any] = None

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), alias="createdAt")
    updated_at: Optional[datetime] = Field(None, alias="updatedAt")

    class Settings:
        name = "stepVersions"

    model_config = {"populate_by_name": True}
