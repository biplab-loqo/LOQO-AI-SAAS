"""TemplateVersion — maps to the `workflowTemplateVersions` collection.

Describes the ordered steps of a pipeline template.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional

from beanie import Document, PydanticObjectId
from pydantic import BaseModel, Field


class TemplateStepConfigRefs(BaseModel):
    step_config_ids: List[PydanticObjectId] = Field(default_factory=list, alias="stepConfigIds")
    model_config = {"populate_by_name": True}


class TemplateStep(BaseModel):
    key: str
    order: int
    config_refs: Optional[TemplateStepConfigRefs] = Field(None, alias="configRefs")
    model_config = {"populate_by_name": True}


class TemplateVersion(Document):
    version: Optional[int] = None
    workflow_template_id: Optional[PydanticObjectId] = Field(None, alias="workflowTemplateId")
    template_key: Optional[str] = Field(None, alias="templateKey")  # e.g. "micro_drama_pipeline"
    steps: List[TemplateStep] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow, alias="createdAt")
    updated_at: Optional[datetime] = Field(None, alias="updatedAt")

    class Settings:
        name = "workflowTemplateVersions"

    model_config = {"populate_by_name": True}
