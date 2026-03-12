"""
Workflow API endpoints — single-DB architecture.

All data lives in one Atlas database. No chains, no scheduler.
Steps are executed by an external service.
No separate artifacts collection — images are s3_uris in step output.

Executions
──────────
  GET    /workflows                                 — list executions
  GET    /workflows/{id}                            — execution status + steps
  DELETE /workflows/{id}                            — delete execution cascade

Steps
─────
  GET    /workflows/{id}/steps/{key}                — latest step version data
  GET    /workflows/{id}/steps/{key}/history        — all versions of a step
  POST   /workflows/{id}/steps/{key}/edit           — create new version
  POST   /workflows/{id}/steps/{key}/iterate        — refine with prompt
  PATCH  /workflows/{id}/steps/{key}/images         — update s3_uris/artifactRefs in-place

Templates
─────────
  GET    /workflows/templates                       — list template versions

Messages
────────
  GET    /workflows/{id}/messages                   — conversation messages
  POST   /workflows/{id}/messages                   — add a message

Step Versions
─────────────
  GET    /workflows/step-versions/{version_id}      — single step version by ID
"""
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from copy import deepcopy

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel

from app.core.auth import get_current_user, get_current_user_optional
from app.models.user import User
from app.models.workflow_execution import WorkflowExecution
from app.models.step_version import StepVersion
from app.models.template_version import TemplateVersion
from app.models.message import Message
from beanie import PydanticObjectId
from app.models.shot import Shot
from app.models.clip import Clip
from app.services.workflow_engine import WorkflowEngine, _convert_s3_uris_in_output

router = APIRouter(prefix="/workflows", tags=["workflows"])


# ── Helpers ──────────────────────────────────────────────────

async def _resolve_ctx_id(execution_id: str):
    """Get execution and its ID used to query sub-collections (stepVersions, messages)."""
    execution = await WorkflowExecution.get(execution_id)
    if not execution:
        raise HTTPException(404, "Execution not found")
    # Always use the execution's own _id to query step versions —
    # template_version_id is for the template, not step version ownership.
    ctx_id = execution.id
    return execution, ctx_id


# ── Request bodies ───────────────────────────────────────────

class EditStepBody(BaseModel):
    """Edit step data → creates a NEW StepVersion (never overwrites)."""
    data: Dict[str, Any]
    org_id: Optional[str] = None
    project_id: Optional[str] = None
    episode_id: Optional[str] = None
    part_id: Optional[str] = None


class IterateStepBody(BaseModel):
    """Iterate (refine) a step with a text prompt."""
    prompt: str
    org_id: Optional[str] = None
    project_id: Optional[str] = None
    episode_id: Optional[str] = None
    part_id: Optional[str] = None


class PatchImagesBody(BaseModel):
    """Patch s3_uris / artifactRefs on the head step version in-place."""
    s3_uris: List[str] = []
    artifact_refs: Optional[Dict[str, List[str]]] = None


class GenerateStepBody(BaseModel):
    """Trigger generation of a step."""
    org_id: Optional[str] = None
    project_id: Optional[str] = None
    episode_id: Optional[str] = None
    part_id: Optional[str] = None


class ApproveStepBody(BaseModel):
    """Optional context for approve — forwarded to SQS."""
    org_id: Optional[str] = None
    project_id: Optional[str] = None
    episode_id: Optional[str] = None
    part_id: Optional[str] = None


class CreateMessageBody(BaseModel):
    """Create a message in the conversation."""
    step_key: Optional[list[str]] = None
    action: str = "generate"     # "generate" | "edit" | "iterate"
    prompt: Optional[str] = None
    org_id: Optional[str] = None
    project_id: Optional[str] = None
    episode_id: Optional[str] = None
    part_id: Optional[str] = None


# ══════════════════════════════════════════════════════════════
#  TEMPLATES
# ══════════════════════════════════════════════════════════════

@router.get("/templates")
async def list_templates(
    user: User = Depends(get_current_user),
):
    """List all pipeline template versions from the DB."""
    templates = await TemplateVersion.find().sort("-version").to_list()
    return [
        {
            "id": str(t.id),
            "version": t.version,
            "workflow_template_id": str(t.workflow_template_id) if t.workflow_template_id else None,
            "steps": [
                {"key": s.key, "order": s.order}
                for s in t.steps
            ],
            "created_at": t.created_at.isoformat(),
        }
        for t in templates
    ]


# ══════════════════════════════════════════════════════════════
#  EXECUTIONS
# ══════════════════════════════════════════════════════════════

@router.get("")
async def list_workflows(
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0),
    status: Optional[str] = None,
    user: User = Depends(get_current_user),
):
    """List workflow executions (paginated, optional status filter)."""
    query: dict = {}
    if status:
        query["status"] = status

    executions = await WorkflowExecution.find(query).skip(skip).limit(limit).sort("-createdAt").to_list()
    total = await WorkflowExecution.find(query).count()

    results = []
    for ex in executions:
        results.append({
            "id": str(ex.id),
            "user_id": ex.user_id,
            "template_version_id": str(ex.template_version_id) if ex.template_version_id else None,
            "title": ex.title,
            "status": ex.status,
            "current_step_key": ex.current_step_key,
            "step_count": len(ex.steps),
            "meta": ex.meta,
            "created_at": ex.created_at.isoformat(),
            "updated_at": ex.updated_at.isoformat(),
        })

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "executions": results,
    }


@router.get("/by-part/{part_id}")
async def get_workflow_by_part(
    part_id: str,
    # this endpoint is intentionally public because the UI polls it before the user
    # may be fully authenticated. 401s prevented shots/animations from loading.
    #user: User = Depends(get_current_user),
):
    """Get the latest workflow execution for a given part ID.

    Queries both top-level partId and meta.partId to support all schema variants.
    Returns 404 if no execution exists yet (frontend polls until it appears).
    """
    # Try top-level partId first, then meta.partId (real AI service stores it there)
    execution = await WorkflowExecution.find_one(
        {"$or": [{"partId": part_id}, {"meta.partId": part_id}]}
    )
    if not execution:
        raise HTTPException(404, f"No execution found for part {part_id}")
    try:
        return await WorkflowEngine.get_execution_status(str(execution.id))
    except ValueError as e:
        raise HTTPException(404, str(e))


@router.get("/{execution_id}")
async def get_workflow(
    execution_id: str,
    user: User = Depends(get_current_user),
):
    """Get full workflow execution status with step details."""
    try:
        return await WorkflowEngine.get_execution_status(execution_id)
    except ValueError as e:
        raise HTTPException(404, str(e))


@router.delete("/{execution_id}")
async def delete_workflow(
    execution_id: str,
    user: User = Depends(get_current_user),
):
    """Delete execution + all related step versions and messages."""
    execution, ctx_id = await _resolve_ctx_id(execution_id)

    await StepVersion.find({"executionId": ctx_id}).delete()
    await Message.find({"executionId": ctx_id}).delete()
    await Shot.find({"executionId": ctx_id}).delete()
    await Clip.find({"executionId": ctx_id}).delete()
    await execution.delete()

    return {"deleted": True, "execution_id": execution_id}


# ══════════════════════════════════════════════════════════════
#  STEPS
# ══════════════════════════════════════════════════════════════

@router.get("/{execution_id}/steps/{step_key}")
async def get_step_data(
    execution_id: str,
    step_key: str,
    user: User = Depends(get_current_user),
):
    """Latest step version data for a step. Images are s3_uris in output."""
    try:
        return await WorkflowEngine.get_step_data(execution_id, step_key)
    except ValueError as e:
        raise HTTPException(404, str(e))


@router.get("/{execution_id}/steps/{step_key}/history")
async def get_step_history(
    execution_id: str,
    step_key: str,
    user: User = Depends(get_current_user),
):
    """All versions of a step."""
    _, ctx_id = await _resolve_ctx_id(execution_id)
    versions = await StepVersion.find(
        {"executionId": ctx_id, "stepKey": step_key}
    ).sort("versionNo").to_list()

    return [
        {
            "step_version_id": str(sv.id),
            "version_no": sv.version_no,
            "status": sv.status,
            "lineage": sv.lineage.model_dump(by_alias=True, mode="json") if sv.lineage else None,
            "has_output": sv.output is not None,
            "created_at": sv.created_at.isoformat(),
        }
        for sv in versions
    ]


# ══════════════════════════════════════════════════════════════
#  STEP EDIT
# ══════════════════════════════════════════════════════════════

@router.post("/{execution_id}/steps/{step_key}/edit")
async def edit_step(
    execution_id: str,
    step_key: str,
    body: EditStepBody,
    user: User = Depends(get_current_user),
):
    """Edit step data → creates a NEW StepVersion with incremented version_no."""
    try:
        new_sv = await WorkflowEngine.edit_step(
            execution_id=execution_id,
            step_key=step_key,
            new_output_data=body.data,
            user_id=str(user.id),
            org_id=body.org_id or str(user.organizationId or ""),
            project_id=body.project_id or "",
            episode_id=body.episode_id or "",
            part_id=body.part_id or "",
        )
    except ValueError as e:
        raise HTTPException(400, str(e))

    return {
        "step_version_id": str(new_sv.id),
        "step_key": new_sv.step_key,
        "version_no": new_sv.version_no,
        "status": new_sv.status,
        "lineage": new_sv.lineage.model_dump(by_alias=True, mode="json") if new_sv.lineage else None,
        "created_at": new_sv.created_at.isoformat(),
    }


# ══════════════════════════════════════════════════════════════
#  STEP ITERATE
# ══════════════════════════════════════════════════════════════

@router.post("/{execution_id}/steps/{step_key}/iterate")
async def iterate_step(
    execution_id: str,
    step_key: str,
    body: IterateStepBody,
    user: User = Depends(get_current_user),
):
    """Iterate (refine) a step with a text prompt."""
    try:
        result = await WorkflowEngine.iterate_step(
            execution_id=execution_id,
            step_key=step_key,
            prompt=body.prompt,
            user_id=str(user.id),
            org_id=body.org_id or str(user.organizationId or ""),
            project_id=body.project_id or "",
            episode_id=body.episode_id or "",
            part_id=body.part_id or "",
        )
    except ValueError as e:
        raise HTTPException(400, str(e))

    return result


# ══════════════════════════════════════════════════════════════
#  STEP PATCH IMAGES — update s3_uris / artifactRefs in-place
# ══════════════════════════════════════════════════════════════

@router.patch("/{execution_id}/steps/{step_key}/images")
async def patch_step_images(
    execution_id: str,
    step_key: str,
    body: PatchImagesBody,
    user: User = Depends(get_current_user),
):
    """Patch only the image lists (s3_uris / artifactRefs) on the head step version.

    Used when the user manually deletes or uploads images via the UI.
    Does NOT create a new version — modifies the existing head version in place.
    """
    execution, ctx_id = await _resolve_ctx_id(execution_id)

    sv = await StepVersion.find(
        {"executionId": ctx_id, "stepKey": step_key}
    ).sort("-versionNo").first_or_none()

    if not sv:
        raise HTTPException(404, "Step version not found")

    # Update the output image fields in place
    if sv.output is None:
        sv.output = {}

    sv.output["s3_uris"] = body.s3_uris
    if body.artifact_refs is not None:
        sv.output["artifactRefs"] = body.artifact_refs

    # Update counts
    if isinstance(sv.output.get("counts"), dict):
        sv.output["counts"]["files"] = len(body.s3_uris)

    sv.updated_at = datetime.now(timezone.utc)
    await sv.save()

    return {
        "step_version_id": str(sv.id),
        "step_key": sv.step_key,
        "version_no": sv.version_no,
        "s3_uris_count": len(body.s3_uris),
    }


# ══════════════════════════════════════════════════════════════
#  STEP GENERATE — trigger pipeline step execution
# ══════════════════════════════════════════════════════════════

@router.post("/{execution_id}/steps/{step_key}/generate")
async def generate_step(
    execution_id: str,
    step_key: str,
    body: GenerateStepBody,
    user: User = Depends(get_current_user),
):
    """Trigger generation of a pipeline step via SQS."""
    try:
        result = await WorkflowEngine.generate_step(
            execution_id=execution_id,
            step_key=step_key,
            user_id=str(user.id),
            org_id=body.org_id or str(user.organizationId or ""),
            project_id=body.project_id or "",
            episode_id=body.episode_id or "",
            part_id=body.part_id or "",
        )
    except ValueError as e:
        raise HTTPException(400, str(e))
    return result


# ══════════════════════════════════════════════════════════════
#  STEP APPROVE — mark step as approved, allow next step
# ══════════════════════════════════════════════════════════════

@router.post("/{execution_id}/steps/{step_key}/approve")
async def approve_step(
    execution_id: str,
    step_key: str,
    body: ApproveStepBody = ApproveStepBody(),
    user: User = Depends(get_current_user),
):
    """Approve a completed step, allowing the next step to proceed."""
    try:
        result = await WorkflowEngine.approve_step(
            execution_id=execution_id,
            step_key=step_key,
            user_id=str(user.id),
            org_id=body.org_id or str(user.organizationId or ""),
            project_id=body.project_id or "",
            episode_id=body.episode_id or "",
            part_id=body.part_id or "",
        )
    except ValueError as e:
        raise HTTPException(400, str(e))
    return result


# ══════════════════════════════════════════════════════════════
#  MESSAGES
# ══════════════════════════════════════════════════════════════

@router.get("/{execution_id}/messages")
async def get_messages(
    execution_id: str,
    step_key: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    user: User = Depends(get_current_user),
):
    """Get conversation messages for an execution, optionally filtered by step."""
    _, ctx_id = await _resolve_ctx_id(execution_id)
    query: dict = {"executionId": ctx_id}
    if step_key:
        query["stepKey"] = step_key

    messages = await Message.find(query).sort("createdAt").limit(limit).to_list()

    return [
        {
            "id": str(m.id),
            "execution_id": m.execution_id,
            "step_key": m.step_key,
            "org_id": m.org_id,
            "project_id": m.project_id,
            "episode_id": m.episode_id,
            "part_id": m.part_id,
            "action": m.action,
            "prompt": m.prompt,
            "user_id": m.user_id,
            "created_at": m.created_at.isoformat(),
        }
        for m in messages
    ]


@router.post("/{execution_id}/messages")
async def create_message(
    execution_id: str,
    body: CreateMessageBody,
    user: User = Depends(get_current_user),
):
    """Add a message to the conversation."""
    execution, ctx_id = await _resolve_ctx_id(execution_id)

    msg = Message(
        execution_id=str(ctx_id),
        step_key=body.step_key or [],
        org_id=body.org_id or "",
        project_id=body.project_id or "",
        episode_id=body.episode_id or "",
        part_id=body.part_id or "",
        action=body.action,
        prompt=body.prompt,
        user_id=str(user.id),
    )
    await msg.insert()

    return {
        "id": str(msg.id),
        "execution_id": msg.execution_id,
        "step_key": msg.step_key,
        "action": msg.action,
        "created_at": msg.created_at.isoformat(),
    }


# ══════════════════════════════════════════════════════════════
#  STEP VERSION DIRECT LOOKUP
# ══════════════════════════════════════════════════════════════

@router.get("/step-versions/{version_id}")
async def get_step_version_by_id(
    version_id: str,
    user: User = Depends(get_current_user),
):
    """Fetch a single step version by its Mongo _id."""
    sv = await StepVersion.get(version_id)
    if not sv:
        raise HTTPException(404, "Step version not found")

    return {
        "step_version_id": str(sv.id),
        "execution_id": str(sv.execution_id) if sv.execution_id else None,
        "step_key": sv.step_key,
        "version_no": sv.version_no,
        "status": sv.status,
        "lineage": sv.lineage.model_dump(by_alias=True, mode="json") if sv.lineage else None,
        "output": _convert_s3_uris_in_output(sv.output),
        "error": sv.error,
        "created_at": sv.created_at.isoformat(),
    }


# ══════════════════════════════════════════════════════════════
#  SHOTS / CLIPS — independent collections (not stepVersion blobs)
# ══════════════════════════════════════════════════════════════

# shots/clips use optional authentication — they work for both authenticated
# and anonymous users. If a valid token is provided, we track the user.
@router.get("/{execution_id}/shots")
async def get_shots(
    execution_id: str,
    part_id: Optional[str] = None,
    latest_only: bool = Query(True),
    user: Optional[User] = Depends(get_current_user_optional),
):
    """Get shot rows for an execution from the independent `shots` collection."""
    _, ctx_id = await _resolve_ctx_id(execution_id)

    query: Dict[str, Any] = {"executionId": ctx_id}
    if part_id:
        query["partId"] = part_id

    rows = await Shot.find(query).sort([("shotId", 1), ("version", -1), ("sequenceNo", 1)]).to_list()

    if latest_only:
        latest_by_shot: Dict[str, Shot] = {}
        for row in rows:
            if row.shot_id not in latest_by_shot:
                latest_by_shot[row.shot_id] = row
        rows = list(latest_by_shot.values())

    rows.sort(key=lambda r: (r.sequence_no or 0, r.shot_id))

    out: List[Dict[str, Any]] = []
    for row in rows:
        d = row.model_dump(by_alias=True, mode="json")
        d["id"] = str(row.id)
        d["executionId"] = str(row.execution_id) if row.execution_id else None
        out.append(d)
    return out


@router.get("/{execution_id}/clips")
async def get_clips(
    execution_id: str,
    part_id: Optional[str] = None,
    latest_only: bool = Query(True),
    user: Optional[User] = Depends(get_current_user_optional),
):
    """Get clip rows for an execution from the independent `clips` collection."""
    _, ctx_id = await _resolve_ctx_id(execution_id)

    query: Dict[str, Any] = {"executionId": ctx_id}
    if part_id:
        query["partId"] = part_id

    rows = await Clip.find(query).sort([("clipId", 1), ("version", -1), ("sequenceNo", 1)]).to_list()

    if latest_only:
        latest_by_clip: Dict[str, Clip] = {}
        for row in rows:
            if row.clip_id not in latest_by_clip:
                latest_by_clip[row.clip_id] = row
        rows = list(latest_by_clip.values())

    rows.sort(key=lambda r: (r.sequence_no or 0, r.clip_id))

    out: List[Dict[str, Any]] = []
    for row in rows:
        d = row.model_dump(by_alias=True, mode="json")
        d["id"] = str(row.id)
        d["executionId"] = str(row.execution_id) if row.execution_id else None
        out.append(d)
    return out


# ══════════════════════════════════════════════════════════════
#  SHOTS — update (creates new version) + version history
# ══════════════════════════════════════════════════════════════

class UpdateShotBody(BaseModel):
    """Partial field update for a Shot — inserts a new version document."""
    one_liner_shot_intent: Optional[str] = None
    start_image_prompt:    Optional[str] = None
    animation_prompt:      Optional[str] = None
    is_approved:           Optional[bool] = None
    start_image:           Optional[Dict[str, Any]] = None
    character_references:  Optional[List[Dict[str, Any]]] = None
    location_references:   Optional[List[Dict[str, Any]]] = None
    previous_references:   Optional[List[Dict[str, Any]]] = None
    shot_metadata:         Optional[Dict[str, Any]] = None


@router.patch("/{execution_id}/shots/{shot_id}")
async def update_shot(
    execution_id: str,
    shot_id: str,
    body: UpdateShotBody,
    user: User = Depends(get_current_user),
):
    """Edit a shot's fields → inserts a new Shot version, returns updated doc."""
    _, ctx_id = await _resolve_ctx_id(execution_id)

    rows = await Shot.find(
        {"executionId": ctx_id, "shotId": shot_id}
    ).sort([("version", -1)]).to_list()

    if not rows:
        raise HTTPException(404, f"Shot '{shot_id}' not found for execution '{execution_id}'")

    latest = rows[0]
    new_shot = deepcopy(latest)
    new_shot.id = None          # let Beanie generate a new _id
    new_shot.version = latest.version + 1
    new_shot.updated_at = datetime.now(timezone.utc)

    if body.one_liner_shot_intent is not None:
        new_shot.one_liner_shot_intent = body.one_liner_shot_intent
    if body.start_image_prompt is not None:
        new_shot.start_image_prompt = body.start_image_prompt
    if body.animation_prompt is not None:
        new_shot.animation_prompt = body.animation_prompt
    if body.is_approved is not None:
        new_shot.is_approved = body.is_approved
    if body.shot_metadata is not None:
        from app.models.shot import ShotMetadata
        new_shot.shot_metadata = ShotMetadata(**body.shot_metadata)
    if body.character_references is not None:
        from app.models.shot import CharacterReference
        new_shot.character_references = [CharacterReference.model_validate(r) for r in body.character_references]
    if body.location_references is not None:
        from app.models.shot import LocationReference
        new_shot.location_references = [LocationReference.model_validate(r) for r in body.location_references]

    await new_shot.insert()

    d = new_shot.model_dump(by_alias=True, mode="json")
    d["id"] = str(new_shot.id)
    d["executionId"] = str(new_shot.execution_id) if new_shot.execution_id else None
    return d


@router.get("/{execution_id}/shots/{shot_id}/versions")
async def get_shot_versions(
    execution_id: str,
    shot_id: str,
    user: User = Depends(get_current_user),
):
    """Return all versions of a shot, oldest first."""
    _, ctx_id = await _resolve_ctx_id(execution_id)

    rows = await Shot.find(
        {"executionId": ctx_id, "shotId": shot_id}
    ).sort([("version", 1)]).to_list()

    out = []
    for row in rows:
        d = row.model_dump(by_alias=True, mode="json")
        d["id"] = str(row.id)
        d["executionId"] = str(row.execution_id) if row.execution_id else None
        out.append(d)
    return out


# ══════════════════════════════════════════════════════════════
#  CLIPS — update (creates new version) + version history
# ══════════════════════════════════════════════════════════════

class UpdateClipBody(BaseModel):
    """Partial field update for a Clip — inserts a new version document."""
    animation_prompt: Optional[str] = None
    is_approved:      Optional[bool] = None
    clip_output:      Optional[Dict[str, Any]] = None
    input_images:     Optional[List[Dict[str, Any]]] = None


@router.patch("/{execution_id}/clips/{clip_id}")
async def update_clip(
    execution_id: str,
    clip_id: str,
    body: UpdateClipBody,
    user: User = Depends(get_current_user),
):
    """Edit a clip's fields → inserts a new Clip version, returns updated doc."""
    _, ctx_id = await _resolve_ctx_id(execution_id)

    rows = await Clip.find(
        {"executionId": ctx_id, "clipId": clip_id}
    ).sort([("version", -1)]).to_list()

    if not rows:
        raise HTTPException(404, f"Clip '{clip_id}' not found for execution '{execution_id}'")

    latest = rows[0]
    new_clip = deepcopy(latest)
    new_clip.id = None
    new_clip.version = latest.version + 1
    new_clip.updated_at = datetime.now(timezone.utc)

    if body.animation_prompt is not None:
        new_clip.animation_prompt = body.animation_prompt
    if body.is_approved is not None:
        new_clip.is_approved = body.is_approved
    if body.input_images is not None:
        from app.models.clip import ClipMediaRef
        new_clip.input_images = [ClipMediaRef.model_validate(img) for img in body.input_images]

    await new_clip.insert()

    d = new_clip.model_dump(by_alias=True, mode="json")
    d["id"] = str(new_clip.id)
    d["executionId"] = str(new_clip.execution_id) if new_clip.execution_id else None
    return d


@router.get("/{execution_id}/clips/{clip_id}/versions")
async def get_clip_versions(
    execution_id: str,
    clip_id: str,
    user: User = Depends(get_current_user),
):
    """Return all versions of a clip, oldest first."""
    _, ctx_id = await _resolve_ctx_id(execution_id)

    rows = await Clip.find(
        {"executionId": ctx_id, "clipId": clip_id}
    ).sort([("version", 1)]).to_list()

    out = []
    for row in rows:
        d = row.model_dump(by_alias=True, mode="json")
        d["id"] = str(row.id)
        d["executionId"] = str(row.execution_id) if row.execution_id else None
        out.append(d)
    return out


# ══════════════════════════════════════════════════════════════
#  SHOTS / CLIPS — approve a specific version in-place
#  (no new version created; sibling versions are un-approved)
# ══════════════════════════════════════════════════════════════

@router.post("/{execution_id}/shots/{shot_doc_id}/approve")
async def approve_shot_version(
    execution_id: str,
    shot_doc_id: str,
    user: User = Depends(get_current_user),
):
    """Mark a specific Shot version as the approved one.
    All other versions sharing the same shotId are un-approved first.
    Returns the approved document."""
    _, ctx_id = await _resolve_ctx_id(execution_id)

    try:
        doc_oid = PydanticObjectId(shot_doc_id)
    except Exception:
        raise HTTPException(400, "Invalid shot_doc_id — must be a valid ObjectId")

    target = await Shot.get(doc_oid)
    if not target or str(target.execution_id) != str(ctx_id):
        raise HTTPException(404, f"Shot version '{shot_doc_id}' not found in this execution")

    now = datetime.now(timezone.utc)

    # Un-approve ALL versions of this shotId in this execution
    await Shot.find(
        {"executionId": ctx_id, "shotId": target.shot_id}
    ).update({"$set": {"isApproved": False, "updatedAt": now}})

    # Approve the specific version
    await Shot.find_one({"_id": doc_oid}).update(
        {"$set": {"isApproved": True, "updatedAt": now}}
    )

    # Reload and return
    await target.sync()
    d = target.model_dump(by_alias=True, mode="json")
    d["id"] = str(target.id)
    d["executionId"] = str(target.execution_id) if target.execution_id else None
    return d


@router.post("/{execution_id}/clips/{clip_doc_id}/approve")
async def approve_clip_version(
    execution_id: str,
    clip_doc_id: str,
    user: User = Depends(get_current_user),
):
    """Mark a specific Clip version as the approved one.
    All other versions sharing the same clipId are un-approved first.
    Returns the approved document."""
    _, ctx_id = await _resolve_ctx_id(execution_id)

    try:
        doc_oid = PydanticObjectId(clip_doc_id)
    except Exception:
        raise HTTPException(400, "Invalid clip_doc_id — must be a valid ObjectId")

    target = await Clip.get(doc_oid)
    if not target or str(target.execution_id) != str(ctx_id):
        raise HTTPException(404, f"Clip version '{clip_doc_id}' not found in this execution")

    now = datetime.now(timezone.utc)

    # Un-approve ALL versions of this clipId in this execution
    await Clip.find(
        {"executionId": ctx_id, "clipId": target.clip_id}
    ).update({"$set": {"isApproved": False, "updatedAt": now}})

    # Approve the specific version
    await Clip.find_one({"_id": doc_oid}).update(
        {"$set": {"isApproved": True, "updatedAt": now}}
    )

    # Reload and return
    await target.sync()
    d = target.model_dump(by_alias=True, mode="json")
    d["id"] = str(target.id)
    d["executionId"] = str(target.execution_id) if target.execution_id else None
    return d

