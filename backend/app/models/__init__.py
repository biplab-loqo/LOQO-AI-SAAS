"""All Beanie document models — registered with init_beanie on startup.

One database holds all collections. Images are embedded as s3_uris in
StepVersion output (no separate artifacts collection).
"""

from app.models.user import User
from app.models.organization import Organization
from app.models.project import Project
from app.models.episode import Episode
from app.models.part import Part
from app.models.workflow_execution import WorkflowExecution
from app.models.step_version import StepVersion
from app.models.template_version import TemplateVersion
from app.models.step_config import StepConfig
from app.models.message import Message
from app.models.shot import Shot
from app.models.clip import Clip
from app.models.character import Character
from app.models.location import Location

ALL_MODELS = [
    User,
    Organization,
    Project,
    Episode,
    Part,
    WorkflowExecution,
    StepVersion,
    TemplateVersion,
    StepConfig,
    Message,
    Shot,
    Clip,
    Character,
    Location,
]

__all__ = [
    "User",
    "Organization",
    "Project",
    "Episode",
    "Part",
    "WorkflowExecution",
    "StepVersion",
    "TemplateVersion",
    "StepConfig",
    "Message",
    "Shot",
    "Clip",
    "Character",
    "Location",
    "ALL_MODELS",
]
