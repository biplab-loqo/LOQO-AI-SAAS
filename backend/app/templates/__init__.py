"""
Template registry.

Templates define workflow step pipelines.  They live in code —
NOT in the database.  Call ``get_template()`` / ``list_templates()``
to access them.
"""
from typing import Dict, List, Optional

from app.templates.base import WorkflowTemplate
from app.templates.production_pipeline import PRODUCTION_PIPELINE

# ── Registry ─────────────────────────────────────────────────
TEMPLATE_REGISTRY: Dict[str, WorkflowTemplate] = {
    PRODUCTION_PIPELINE.id: PRODUCTION_PIPELINE,
}


def get_template(template_id: str) -> Optional[WorkflowTemplate]:
    return TEMPLATE_REGISTRY.get(template_id)


def list_templates() -> List[WorkflowTemplate]:
    return list(TEMPLATE_REGISTRY.values())
