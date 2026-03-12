"""
Production Pipeline — the demo workflow template.

DAG:
  show_bible ──┬──► characters ────────┐
               ├──► key_locations ─────┤
               └──► beat_breakdown ────┴──► storyboard
"""
from app.templates.base import WorkflowTemplate, StepDefinition, Edge, RetryPolicy

PRODUCTION_PIPELINE = WorkflowTemplate(
    id="production_pipeline",
    name="Production Pipeline",
    description=(
        "Full production pipeline: Script → Show Bible → Characters, "
        "Key Locations, Beat Breakdown → Storyboard"
    ),
    version="1.0",
    steps=[
        StepDefinition(
            step_key="show_bible",
            name="Show Bible",
            kind="llm",
            order=1,
            schema_ref="app.templates.schemas.show_bible.ShowBibleData",
            description="Generate the show bible from the script",
            retry_policy=RetryPolicy(max_retries=3),
        ),
        StepDefinition(
            step_key="characters",
            name="Character Description",
            kind="llm",
            order=2,
            schema_ref="app.templates.schemas.characters.CharactersData",
            description="Extract and describe characters",
            retry_policy=RetryPolicy(max_retries=3),
        ),
        StepDefinition(
            step_key="key_locations",
            name="Key Locations",
            kind="llm",
            order=3,
            schema_ref="app.templates.schemas.key_locations.KeyLocationsData",
            description="Identify and describe key locations",
            retry_policy=RetryPolicy(max_retries=3),
        ),
        StepDefinition(
            step_key="beat_breakdown",
            name="Beat Breakdown",
            kind="llm",
            order=4,
            schema_ref="app.templates.schemas.beat_breakdown.BeatBreakdownData",
            description="Break script into beats",
            retry_policy=RetryPolicy(max_retries=2),
        ),
        StepDefinition(
            step_key="storyboard",
            name="Storyboard",
            kind="llm",
            order=5,
            schema_ref="app.templates.schemas.storyboard.StoryboardData",
            description="Generate storyboard panels",
            retry_policy=RetryPolicy(max_retries=3),
        ),
    ],
    edges=[
        Edge(parent="show_bible", child="characters", dependency_type="hard"),
        Edge(parent="show_bible", child="key_locations", dependency_type="hard"),
        Edge(parent="show_bible", child="beat_breakdown", dependency_type="hard"),
        Edge(parent="characters", child="storyboard", dependency_type="hard"),
        Edge(parent="key_locations", child="storyboard", dependency_type="hard"),
        Edge(parent="beat_breakdown", child="storyboard", dependency_type="hard"),
    ],
)
