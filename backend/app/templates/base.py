"""
Template base types.

Templates define workflow step pipelines.  They live in code (Python
configs) and are NEVER stored in the DB.  Step outputs are persisted
as JSON blobs inside StepVersion documents.

Key types
─────────
  StepDefinition   – one step in the pipeline
  Edge             – parent → child dependency
  WorkflowTemplate – full pipeline (steps + edges)
"""
from __future__ import annotations

from typing import Dict, List, Literal, Optional

from pydantic import BaseModel


# ── Step ─────────────────────────────────────────────────────

class RetryPolicy(BaseModel):
    max_retries: int = 3


class StepDefinition(BaseModel):
    step_key: str                                       # unique id e.g. "show_bible"
    name: str                                           # human name e.g. "Show Bible"
    kind: Literal["llm", "tool", "python", "human_input"] = "llm"
    order: int                                          # execution order (1-based)
    schema_ref: str                                     # dotted path to Pydantic schema
    description: Optional[str] = None
    retry_policy: RetryPolicy = RetryPolicy()


# ── Edge ─────────────────────────────────────────────────────

class Edge(BaseModel):
    parent: str                                         # step_key of parent
    child: str                                          # step_key of child
    dependency_type: Literal["hard", "soft"] = "hard"


# ── Template ─────────────────────────────────────────────────

class WorkflowTemplate(BaseModel):
    """A complete workflow template.  Lives in Python code, never in the DB."""
    id: str
    name: str
    description: str
    version: str = "1.0"
    steps: List[StepDefinition]
    edges: List[Edge]

    # ── Helpers ──────────────────────────────────────────────

    @property
    def _children_map(self) -> Dict[str, List[str]]:
        """Build parent → [children] adjacency list."""
        m: Dict[str, List[str]] = {}
        for edge in self.edges:
            m.setdefault(edge.parent, []).append(edge.child)
        return m

    @property
    def _parents_map(self) -> Dict[str, List[str]]:
        """Build child → [parents] adjacency list."""
        m: Dict[str, List[str]] = {}
        for edge in self.edges:
            m.setdefault(edge.child, []).append(edge.parent)
        return m

    def get_step(self, step_key: str) -> Optional[StepDefinition]:
        for s in self.steps:
            if s.step_key == step_key:
                return s
        return None

    def get_parent_keys(self, step_key: str) -> List[str]:
        """Direct parents of a step."""
        return self._parents_map.get(step_key, [])

    def get_downstream_keys(self, step_key: str) -> List[str]:
        """All step_keys that transitively depend on *step_key*."""
        children_map = self._children_map
        visited: set[str] = set()
        queue = [step_key]
        while queue:
            cur = queue.pop(0)
            for child in children_map.get(cur, []):
                if child not in visited:
                    visited.add(child)
                    queue.append(child)
        return sorted(visited)

    def get_steps_to_rerun(self, from_step_key: str) -> List[StepDefinition]:
        """The step itself + every downstream step that must be re-run."""
        rerun_keys = {from_step_key} | set(self.get_downstream_keys(from_step_key))
        return sorted(
            [s for s in self.steps if s.step_key in rerun_keys],
            key=lambda s: s.order,
        )

    def get_steps_to_keep(self, from_step_key: str) -> List[StepDefinition]:
        """Steps that can be inherited (everything NOT in the re-run set)."""
        rerun_keys = {s.step_key for s in self.get_steps_to_rerun(from_step_key)}
        return sorted(
            [s for s in self.steps if s.step_key not in rerun_keys],
            key=lambda s: s.order,
        )

    def execution_order(self) -> List[StepDefinition]:
        """Steps sorted by their declared order."""
        return sorted(self.steps, key=lambda s: s.order)
