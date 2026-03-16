"""Message — maps to the `messages` collection.

Every SQS-dispatched action is mirrored here for full auditability.
Uses stepKey to identify the target step.
action is one of:
  generate  — pipeline step triggered (first or approve-continues-next)
  edit      — user edited a step's data blob
  iterate   — user sent a refine prompt
"""
from datetime import datetime, timezone
from typing import Optional, List

from beanie import Document
from pydantic import Field


class Message(Document):
    execution_id: Optional[str] = Field(None, alias="executionId")
    step_key: Optional[List[str]] = Field(None, alias="stepKey")     # ordered step chain (always array)

    # Context IDs for tracing
    org_id: Optional[str] = Field(None, alias="orgId")
    project_id: Optional[str] = Field(None, alias="projectId")
    episode_id: Optional[str] = Field(None, alias="episodeId")
    part_id: Optional[str] = Field(None, alias="partId")

    action: str = "generate"                    # "generate" | "edit" | "iterate"
    prompt: Optional[str] = None                 # for iterate: the user prompt

    user_id: Optional[str] = Field(None, alias="userId")
    template_key: Optional[str] = Field(None, alias="templateKey")  # identified template
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), alias="createdAt")

    class Settings:
        name = "messages"

    model_config = {"populate_by_name": True}
