"""WorkflowExecution — maps to the `workflowExecutions` collection.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional

from beanie import Document, PydanticObjectId
from pydantic import BaseModel, Field


class ExecutionStepSummary(BaseModel):
    """Embedded step entry inside a WorkflowExecution."""
    step_key: str = Field(alias="stepKey")
    status: str = "not_started"
    updated_at: Optional[datetime] = Field(None, alias="updatedAt")
    started_at: Optional[datetime] = Field(None, alias="startedAt")
    ended_at: Optional[datetime] = Field(None, alias="endedAt")
    duration_ms: Optional[int] = Field(None, alias="durationMs")
    head_version_id: Optional[PydanticObjectId] = Field(None, alias="headVersionId")
    last_run_id: Optional[PydanticObjectId] = Field(None, alias="lastRunId")
    error: Optional[Any] = None

    model_config = {"populate_by_name": True}


class WorkflowExecution(Document):
    user_id: Optional[str] = Field(None, alias="userId")
    template_version_id: Optional[PydanticObjectId] = Field(None, alias="templateVersionId")
    template_key: Optional[str] = Field(None, alias="templateKey")          # e.g. "micro_drama_pipeline"
    template_version: Optional[int] = Field(None, alias="templateVersion")  # e.g. 1
    title: Optional[str] = None
    status: str = "pending"

    # Context IDs — link execution back to the project hierarchy
    org_id: Optional[str] = Field(None, alias="orgId")
    project_id: Optional[str] = Field(None, alias="projectId")
    episode_id: Optional[str] = Field(None, alias="episodeId")
    part_id: Optional[str] = Field(None, alias="partId")
    current_step_key: Optional[str] = Field(None, alias="currentStepKey")

    steps: List[ExecutionStepSummary] = Field(default_factory=list)

    seq_counters: Optional[Dict[str, Any]] = Field(None, alias="seqCounters")
    meta: Optional[Dict[str, Any]] = None

    created_at: datetime = Field(default_factory=datetime.utcnow, alias="createdAt")
    updated_at: datetime = Field(default_factory=datetime.utcnow, alias="updatedAt")

    class Settings:
        name = "workflowExecutions"

    model_config = {"populate_by_name": True}
