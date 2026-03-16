"""
Workflow engine — core logic for the Loqo AI pipeline execution.

Responsibilities
────────────────
• get_execution_status   — full status snapshot of an execution
• get_step_data          — latest step version data (s3_uris embedded in output)
• edit_step              — create a new StepVersion (versioned, never overwrites)
                                                     + log a Message + send to SQS
• iterate_step           — refine a step via text prompt → new version + SQS
• generate_step          — trigger a pipeline step via SQS (action="generate")
• approve_step           — mark step approved → auto-trigger next step via SQS

SQS message schema:
        {executionId, stepKey[], partId, orgId, projectId, episodeId, action, createdAt}
        action is always "generate" for SQS dispatches.
"""
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any

from beanie import PydanticObjectId

from app.models.workflow_execution import WorkflowExecution
from app.models.step_version import StepVersion
from app.models.message import Message
from app.models.shot import (
    Shot,
    ShotMetadata,
    ShotMediaRef,
    CharacterReference,
    PreviousReference,
    LocationReference,
    ShotExecutionMetadata,
)
from app.models.clip import Clip, ClipMediaRef, ClipExecutionMetadata
from app.services.sqs_service import send_to_sqs
from app.core.config import settings

logger = logging.getLogger("loqo.workflow")

# ── Pipeline constants — single source of truth for step ordering ─────────────
# Canonical 14-step order; approval always follows this sequence regardless of
# what order the AI service embedded in the execution document.
PIPELINE_STEPS: list[str] = [
    "run_show_bible",
    "run_character_design",
    "generate_anchor_image_for_character",
    "generate_view_pack_images_for_character",
    "run_key_location",
    "generate_anchor_image_for_key_location",
    "generate_view_pack_images_for_key_location",
    "run_beat_breakdown",
    "run_shot_intent_mapping",
    "run_storyboard_prompt",
    "run_AI_prompt",
    "create_individual_prompt_files",
    "generate_images_nano_banana",
    "generate_animations",
]

# Steps shown as tabs in the UI — hidden steps are batched with the next visible step.
VISIBLE_STEP_KEYS: frozenset[str] = frozenset({
    "run_show_bible",
    "run_character_design",
    "generate_anchor_image_for_character",
    "generate_view_pack_images_for_character",
    "run_key_location",
    "generate_anchor_image_for_key_location",
    "generate_view_pack_images_for_key_location",
    "run_beat_breakdown",
    "run_storyboard_prompt",
    "generate_images_nano_banana",
    "generate_animations",
})


async def _seed_demo_shots_and_clips_if_empty(
    execution: WorkflowExecution,
    *,
    org_id: str = "",
    project_id: str = "",
    episode_id: str = "",
    part_id: str = "",
) -> None:
    """Seed 4 demo shots + 4 demo clips for an execution when empty.

    Triggered after storyboard approval so the Shot/Animation tabs can render
    from independent collections immediately.
    """
    exec_id = execution.id
    if not exec_id:
        return

    exists = await Shot.find({"executionId": exec_id}).count()
    if exists > 0:
        return

    now = datetime.now(timezone.utc)
    exid = str(exec_id)

    resolved_org = org_id or execution.org_id or str((execution.meta or {}).get("orgId") or "")
    resolved_project = project_id or execution.project_id or str((execution.meta or {}).get("projectId") or "")
    resolved_episode = episode_id or execution.episode_id or str((execution.meta or {}).get("episodeId") or "")
    resolved_part = part_id or execution.part_id or str((execution.meta or {}).get("partId") or "")
    resolved_order = str((execution.meta or {}).get("orderId") or "")

    base = f"https://amzn-s3-bucket-lq-ai-3.s3.amazonaws.com/executions/{exid}"

    demo_intents = [
        "Opening visual: the school ground wakes up with children assembling under soft morning light.",
        "Symbolic detail shot: close-up of hands tying ribbon and preparing the flag rope.",
        "Emotional beat: teacher guiding students while tricolor balloons rise in background.",
        "Hero close-up: child-led flag raise conveying innocence, unity, and hope.",
    ]

    shot_rows: list[Shot] = []
    clip_rows: list[Clip] = []

    for i in range(1, 5):
        shot_id = f"shot_{i}"
        start_img = f"{base}/images/image_prompt_{i}.png"

        shot = Shot(
            execution_id=exec_id,
            org_id=resolved_org or None,
            project_id=resolved_project or None,
            episode_id=resolved_episode or None,
            part_id=resolved_part or None,
            shot_id=shot_id,
            sequence_no=i,
            version=1,
            is_approved=False,
            character_references=[
                CharacterReference(
                    character_id="Young Boy 7",
                    reference_image="character_anchor_full_body.png",
                    display_name="Young Boy 7 full body",
                    aws_url=f"{base}/characters/Young%20Boy%207/character_anchor_full_body.png",
                ),
                CharacterReference(
                    character_id="Young Boy 7",
                    reference_image="Side_View_Closeup.png",
                    display_name="Young Boy 7 side close-up",
                    aws_url=f"{base}/characters/Young%20Boy%207/Side_View_Closeup.png",
                ),
            ],
            previous_references=[
                PreviousReference(
                    reference_image=f"image_prompt_{max(1, i-1)}.png",
                    display_name=f"Previous shot frame {max(1, i-1)}",
                    aws_url=f"{base}/images/image_prompt_{max(1, i-1)}.png",
                )
            ] if i > 1 else [],
            location_references=[
                LocationReference(
                    location_id="Village_Mound_01",
                    reference_image="Front_Center_Wide.png",
                    display_name="Village mound front wide view",
                    aws_url=f"{base}/locations/Village_Mound_01/Front_Center_Wide.png",
                )
            ],
            shot_metadata=ShotMetadata(shot_number=i, beat_number=min(3, i)),
            one_liner_shot_intent=demo_intents[i - 1],
            start_image_prompt=(
                "Eye-level cinematic frame with shallow depth of field, clear subject focus, "
                "soft morning ambience, Indian tricolor motif, and warm hopeful emotion in "
                "PIXAR STYLE 3D ANIMATION. 3D Pixar cinematic style, Full-HD."
            ),
            animation_prompt=(
                "From the start frame, animate gentle upward motion in flag and balloons over "
                "a six-second take, preserving composition continuity, with subtle ambient "
                "village sound bed and no visible lip-sync."
            ),
            start_image=ShotMediaRef(
                object_id=f"start_image_{i}_{exid}",
                display_name=f"Generated start image shot {i}",
                aws_url=start_img,
            ),
            execution_metadata=ShotExecutionMetadata(
                provider="google_vertex_ai",
                model="gemini-3.1-flash-image",
                model_version="latest",
                resolution="1080x1920",
                aspect_ratio="9:16",
                output_format="png",
                quality="high",
                prompt_language="en",
                reference_mode="multi_reference",
                reference_count=4,
                temperature=0.7,
                seed=123456 + i,
                retry_count=0,
                requested_at=now,
                generated_at=now,
                org_id=resolved_org or None,
                project_id=resolved_project or None,
                episode_id=resolved_episode or None,
                part_id=resolved_part or None,
                order_id=resolved_order or None,
            ),
            created_at=now,
            updated_at=now,
        )
        shot_rows.append(shot)

        clip = Clip(
            execution_id=exec_id,
            org_id=resolved_org or None,
            project_id=resolved_project or None,
            episode_id=resolved_episode or None,
            part_id=resolved_part or None,
            clip_id=f"clip_{i}",
            shot_id=shot_id,
            sequence_no=i,
            version=1,
            is_approved=False,
            input_images=[
                ClipMediaRef(
                    object_id=f"start_image_{i}_{exid}",
                    display_name=f"Generated start image shot {i}",
                    aws_url=start_img,
                )
            ],
            animation_prompt=shot.animation_prompt,
            clip_output=ClipMediaRef(
                object_id=f"clip_output_{i}_{exid}",
                display_name=f"Generated clip shot {i}",
                aws_url=f"{base}/clips/clip_{i}.mp4",
            ),
            execution_metadata=ClipExecutionMetadata(
                provider="kling_ai",
                model="kling-v1.6",
                model_version="latest",
                duration_seconds=6,
                aspect_ratio="9:16",
                output_format="mp4",
                quality="high",
                prompt_language="en",
                input_media_count=1,
                temperature=0.7,
                seed=223456 + i,
                retry_count=0,
                requested_at=now,
                generated_at=now,
                org_id=resolved_org or None,
                project_id=resolved_project or None,
                episode_id=resolved_episode or None,
                part_id=resolved_part or None,
                order_id=resolved_order or None,
            ),
            created_at=now,
            updated_at=now,
        )
        clip_rows.append(clip)

    for row in shot_rows:
        await row.insert()
    for row in clip_rows:
        await row.insert()

    logger.info("Seeded %d shots and %d clips for execution=%s", len(shot_rows), len(clip_rows), exid)


def _get_private_s3_buckets() -> set:
    """Returns the set of private S3 bucket names from PRIVATE_S3_BUCKETS env var."""
    return settings.private_s3_buckets


def _s3uri_to_url(s3_uri: str) -> str:
    """Convert s3://bucket/key OR https://bucket.s3...amazonaws.com/key → presigned URL."""
    if not s3_uri or not isinstance(s3_uri, str):
        return s3_uri

    bucket: str = ""
    key: str = ""

    if s3_uri.startswith("s3://"):
        without_prefix = s3_uri[5:]
        bucket, _, key = without_prefix.partition("/")
    elif "amazonaws.com" in s3_uri and any(f"{b}.s3" in s3_uri for b in _get_private_s3_buckets()):
        # https://amzn-s3-bucket-lq-ai-*.s3.amazonaws.com/key  OR
        # https://amzn-s3-bucket-lq-ai-*.s3.ap-south-1.amazonaws.com/key
        try:
            from urllib.parse import urlparse
            parsed = urlparse(s3_uri)
            bucket = parsed.netloc.split(".")[0]   # first label = bucket name
            key = parsed.path.lstrip("/")
        except Exception:
            return s3_uri
    else:
        return s3_uri  # public or unknown URL — pass through as-is

    if not bucket or not key:
        return s3_uri

    # Return plain HTTPS URL for public buckets (no presigned URL needed)
    return f"https://{bucket}.s3.amazonaws.com/{key}"


def _convert_s3_uris_in_output(output: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Walk the output dict and convert any s3:// URIs to presigned/HTTPS URLs."""
    if not output:
        return output

    result = dict(output)

    # Convert flat s3_uris list
    if isinstance(result.get("s3_uris"), list):
        result["s3_uris"] = [_s3uri_to_url(u) for u in result["s3_uris"]]

    # ── artifactRefs — handle both v7 dict format and v8 array-of-objects format ──

    art = result.get("artifactRefs")

    if isinstance(art, dict):
        # v7 format: { name: [uri, ...], ... }
        def _resolve_ref(v):
            if isinstance(v, list):
                return [_s3uri_to_url(u) for u in v]
            if isinstance(v, str):
                return [_s3uri_to_url(v)]
            return v
        result["artifactRefs"] = {
            k: _resolve_ref(v)
            for k, v in art.items()
        }
    elif isinstance(art, list):
        # v8 format: array of structured objects — recursively presign all URI/URL fields
        result["artifactRefs"] = [_presign_deep(obj) for obj in art]

    return result


def _presign_deep(obj: Any) -> Any:
    """Recursively walk a value and presign any string that looks like an s3:// URI
    or a private-bucket HTTPS URL.  Works on dicts, lists, and plain strings."""
    if isinstance(obj, str):
        return _s3uri_to_url(obj)
    if isinstance(obj, list):
        return [_presign_deep(item) for item in obj]
    if isinstance(obj, dict):
        return {k: _presign_deep(v) for k, v in obj.items()}
    return obj


class WorkflowEngine:

    # ── Status ───────────────────────────────────────────────

    @staticmethod
    async def get_execution_status(execution_id: str) -> Dict[str, Any]:
        """Full status snapshot of an execution with step details."""
        execution = await WorkflowExecution.get(execution_id)
        if not execution:
            raise ValueError(f"Execution {execution_id} not found")

        exec_id = execution.id

        steps_status: list[dict] = []
        for step_summary in execution.steps:
            latest_sv = await StepVersion.find(
                {"executionId": exec_id, "stepKey": step_summary.step_key}
            ).sort("-versionNo").first_or_none()

            steps_status.append({
                "step_key": step_summary.step_key,
                "status": latest_sv.status if latest_sv else step_summary.status,
                "is_approved": (latest_sv.is_approved if latest_sv else getattr(step_summary, "is_approved", False)),
                "version_no": latest_sv.version_no if latest_sv else 0,
                "has_data": (latest_sv.output is not None) if latest_sv else False,
                "step_version_id": str(latest_sv.id) if latest_sv else None,
            })

        return {
            "execution_id": str(execution.id),
            "user_id": execution.user_id,
            "template_version_id": str(execution.template_version_id) if execution.template_version_id else None,
            "template_key": execution.template_key,
            "title": execution.title,
            "status": execution.status,
            "current_step_key": execution.current_step_key,
            "meta": execution.meta,
            "steps": steps_status,
            "created_at": execution.created_at.isoformat(),
            "updated_at": execution.updated_at.isoformat(),
        }

    # ── Step data ────────────────────────────────────────────

    @staticmethod
    async def get_step_data(
        execution_id: str,
        step_key: str,
    ) -> Dict[str, Any]:
        """Get latest step version data. Images are s3_uris in output."""
        execution = await WorkflowExecution.get(execution_id)
        if not execution:
            raise ValueError(f"Execution {execution_id} not found")

        exec_id = execution.id

        sv = await StepVersion.find(
            {"executionId": exec_id, "stepKey": step_key}
        ).sort("-versionNo").first_or_none()

        if not sv:
            raise ValueError(f"No step version found for step '{step_key}' in execution {execution_id}")

        return {
            "step_version_id": str(sv.id),
            "execution_id": str(sv.execution_id),
            "step_key": sv.step_key,
            "version_no": sv.version_no,
            "status": sv.status,
            "is_approved": sv.is_approved,
            "lineage": sv.lineage.model_dump(by_alias=True, mode="json") if sv.lineage else None,
            "input": sv.input,  # Include input from v7 schema
            "output": _convert_s3_uris_in_output(sv.output),
            "error": sv.error,
            "created_at": sv.created_at.isoformat(),
        }

    # ── Edit step — creates new version, does NOT trigger children ─

    @staticmethod
    async def edit_step(
        execution_id: str,
        step_key: str,
        new_output_data: Dict[str, Any],
        *,
        user_id: str = "",
        org_id: str = "",
        project_id: str = "",
        episode_id: str = "",
        part_id: str = "",
    ) -> StepVersion:
        """Create a NEW StepVersion with incremented version_no.

        Stores the new data wrapped in the standard blobs format.
        Also saves a Message (action="edit") and sends to SQS.
        """
        execution = await WorkflowExecution.get(execution_id)
        if not execution:
            raise ValueError(f"Execution {execution_id} not found")

        exec_id = execution.id

        latest_sv = await StepVersion.find(
            {"executionId": exec_id, "stepKey": step_key}
        ).sort("-versionNo").first_or_none()

        next_ver = (latest_sv.version_no + 1) if latest_sv and latest_sv.version_no else 1

        from app.models.step_version import StepVersionLineage

        now = datetime.now(timezone.utc)
        new_sv = StepVersion(
            execution_id=exec_id,
            step_key=step_key,
            version_no=next_ver,
            lineage=StepVersionLineage(
                type="edit",
                created_from_version_id=latest_sv.id if latest_sv else None,
            ),
            output={
                "blobs": [{"kind": "json_blob", "data": new_output_data}],
                "artifactRefs": None,
                "s3_uris": [],
                "counts": {"blobs": 1, "files": 0, "artifacts": 0},
            },
            status="succeeded",
            org_id=org_id or None,
            project_id=project_id or None,
            episode_id=episode_id or None,
            part_id=part_id or None,
            created_at=now,
            updated_at=now,
        )
        await new_sv.insert()

        for step_summary in execution.steps:
            if step_summary.step_key == step_key:
                step_summary.head_version_id = new_sv.id
                step_summary.status = "succeeded"
                step_summary.updated_at = now
                break
        execution.updated_at = now
        await execution.save()

        # ── Save a Message ───────────────────────────────────
        msg = Message(
            execution_id=str(exec_id),
            step_key=[step_key],
            org_id=org_id,
            project_id=project_id,
            episode_id=episode_id,
            part_id=part_id,
            action="edit",
            user_id=user_id,
        )
        await msg.insert()

        # ── Send to SQS (fire-and-forget) ────────────────────
        await send_to_sqs(
            execution_id=str(exec_id),
            step_key=[step_key],
            part_id=part_id,
            org_id=org_id,
            project_id=project_id,
            episode_id=episode_id,
            action="generate",
            user_id=user_id,
            template_key=execution.template_key or "",
        )

        logger.info(
            "Edit step '%s' v%d → execution=%s (message + SQS sent)",
            step_key, next_ver, execution_id,
        )
        return new_sv

    # ── Iterate step — refine with a user prompt ─────────────

    @staticmethod
    async def iterate_step(
        execution_id: str,
        step_key: str,
        prompt: str,
        *,
        user_id: str = "",
        org_id: str = "",
        project_id: str = "",
        episode_id: str = "",
        part_id: str = "",
    ) -> Dict[str, Any]:
        """User sends a text prompt to iterate/refine a step.

        Creates a new StepVersion with lineage type="iterate" and status="running".
        Saves a Message (action="iterate") and sends to SQS.
        """
        execution = await WorkflowExecution.get(execution_id)
        if not execution:
            raise ValueError(f"Execution {execution_id} not found")

        exec_id = execution.id

        latest_sv = await StepVersion.find(
            {"executionId": exec_id, "stepKey": step_key}
        ).sort("-versionNo").first_or_none()

        next_ver = (latest_sv.version_no + 1) if latest_sv and latest_sv.version_no else 1

        from app.models.step_version import StepVersionLineage

        now = datetime.now(timezone.utc)
        new_sv = StepVersion(
            execution_id=exec_id,
            step_key=step_key,
            version_no=next_ver,
            lineage=StepVersionLineage(
                type="iterate",
                created_from_version_id=latest_sv.id if latest_sv else None,
            ),
            output=latest_sv.output if latest_sv else None,
            status="running",
            org_id=org_id or None,
            project_id=project_id or None,
            episode_id=episode_id or None,
            part_id=part_id or None,
            created_at=now,
            updated_at=now,
        )
        await new_sv.insert()

        for step_summary in execution.steps:
            if step_summary.step_key == step_key:
                step_summary.head_version_id = new_sv.id
                step_summary.status = "running"
                step_summary.updated_at = now
                break
        execution.updated_at = now
        await execution.save()

        # ── Save Message ─────────────────────────────────────
        msg = Message(
            execution_id=str(exec_id),
            step_key=[step_key],
            org_id=org_id,
            project_id=project_id,
            episode_id=episode_id,
            part_id=part_id,
            action="iterate",
            prompt=prompt,
            user_id=user_id,
        )
        await msg.insert()

        # ── Send to SQS ─────────────────────────────────────
        await send_to_sqs(
            execution_id=str(exec_id),
            step_key=[step_key],
            part_id=part_id,
            org_id=org_id,
            project_id=project_id,
            episode_id=episode_id,
            action="generate",
            user_id=user_id,
            template_key=execution.template_key or "",
        )

        logger.info(
            "Iterate step '%s' v%d → execution=%s (message + SQS sent)",
            step_key, next_ver, execution_id,
        )
        return {
            "step_version_id": str(new_sv.id),
            "message_id": str(msg.id),
            "step_key": step_key,
            "version_no": next_ver,
            "status": new_sv.status,
            "lineage": new_sv.lineage.model_dump(by_alias=True, mode="json") if new_sv.lineage else None,
            "created_at": new_sv.created_at.isoformat(),
        }

    # ── Generate step — trigger execution via SQS ────────────

    @staticmethod
    async def generate_step(
        execution_id: str,
        step_key: str,
        *,
        user_id: str = "",
        org_id: str = "",
        project_id: str = "",
        episode_id: str = "",
        part_id: str = "",
    ) -> Dict[str, Any]:
        """Trigger generation of a pipeline step.

        Sets the target step and any not_started prerequisite steps to 'running',
        then sends an SQS message so the external pipeline worker picks it up.
        """
        execution = await WorkflowExecution.get(execution_id)
        if not execution:
            raise ValueError(f"Execution {execution_id} not found")

        exec_id = execution.id

        now = datetime.now(timezone.utc)

        # Find the target step index
        target_idx = None
        for i, s in enumerate(execution.steps):
            if s.step_key == step_key:
                target_idx = i
                break

        if target_idx is None:
            raise ValueError(f"Step '{step_key}' not found in execution")

        # Mark the target step + any not_started prerequisites as running
        for i in range(target_idx + 1):
            s = execution.steps[i]
            if s.status == "not_started":
                s.status = "running"
                s.started_at = now
                s.updated_at = now

        execution.current_step_key = step_key
        execution.status = "running"
        execution.updated_at = now
        await execution.save()

        # ── Save Message ─────────────────────────────────────
        gen_msg = Message(
            execution_id=str(exec_id),
            step_key=[step_key],
            org_id=org_id,
            project_id=project_id,
            episode_id=episode_id,
            part_id=part_id,
            action="generate",
            user_id=user_id,
        )
        await gen_msg.insert()

        # Send to SQS — worker will run from the first "running" step
        await send_to_sqs(
            execution_id=str(exec_id),
            step_key=[step_key],
            part_id=part_id,
            org_id=org_id,
            project_id=project_id,
            episode_id=episode_id,
            action="generate",
            user_id=user_id,
            template_key=execution.template_key or "",
        )

        logger.info(
            "Generate step '%s' → execution=%s (message + SQS sent)",
            step_key, execution_id,
        )
        return {
            "execution_id": str(execution.id),
            "step_key": step_key,
            "status": "running",
        }

    # ── Approve step — mark approved, auto-generate NEXT step ──

    @staticmethod
    async def approve_step(
        execution_id: str,
        step_key: str,
        *,
        user_id: str = "",
        org_id: str = "",
        project_id: str = "",
        episode_id: str = "",
        part_id: str = "",
    ) -> Dict[str, Any]:
        """Approve a step, then auto-trigger the next step chain via SQS.

        Chain building:
          Starting from target_idx + 1, collect consecutive hidden steps
          (steps whose step_key is NOT in any visible UI tab), then include
          the very next visible step.  This entire chain is sent as stepKey[]
          in one SQS message and one Message record.

          currentStepKey on the execution is set to the LAST (visible) step
          in the chain so the UI always shows a meaningful current step.

          Example: approve run_beat_breakdown
            hidden: run_shot_intent_mapping
            next visible: run_storyboard_prompt
            → chain = [run_shot_intent_mapping, run_storyboard_prompt]
            → currentStepKey = run_storyboard_prompt

          Example: approve run_storyboard_prompt
            hidden: run_AI_prompt, create_individual_prompt_files
            next visible: generate_images_nano_banana
            → chain = [run_AI_prompt, create_individual_prompt_files, generate_images_nano_banana]
            → currentStepKey = generate_images_nano_banana

          Example: approve run_key_location (inside locations tab)
            next step: generate_anchor_image_for_key_location (visible)
            → chain = [generate_anchor_image_for_key_location]
            → currentStepKey = generate_anchor_image_for_key_location
        """
        execution = await WorkflowExecution.get(execution_id)
        if not execution:
            raise ValueError(f"Execution {execution_id} not found")

        exec_id = execution.id
        now = datetime.now(timezone.utc)

        # Find the target step index
        target_idx = None
        for i, s in enumerate(execution.steps):
            if s.step_key == step_key:
                target_idx = i
                break

        if target_idx is None:
            raise ValueError(f"Step '{step_key}' not found in execution")

        # Mark target step + succeeded predecessors as approved (boolean flag only)
        approved_keys = []
        for i in range(target_idx + 1):
            s = execution.steps[i]
            if s.status in ("succeeded", "running"):
                s.is_approved = True
                s.updated_at = now
                approved_keys.append(s.step_key)

        execution.updated_at = now

        # Also update head StepVersions approval boolean
        for sk in approved_keys:
            sv = await StepVersion.find(
                {"executionId": exec_id, "stepKey": sk}
            ).sort("-versionNo").first_or_none()
            if sv:
                sv.is_approved = True
                sv.updated_at = now
                await sv.save()

        # ── Build the next-step chain using canonical PIPELINE_STEPS order ────────
        # Walk PIPELINE_STEPS (not execution.steps) so the sequence is always
        # correct regardless of the order the AI service stored in the execution.
        exec_steps_by_key = {s.step_key: s for s in execution.steps}
        try:
            pipeline_target_idx = PIPELINE_STEPS.index(step_key)
        except ValueError:
            pipeline_target_idx = -1  # step not in canonical list; no chain built

        next_step_chain = []  # type: ignore[var-annotated]
        i = pipeline_target_idx + 1
        while i < len(PIPELINE_STEPS):
            sk = PIPELINE_STEPS[i]
            exec_step = exec_steps_by_key.get(sk)
            if exec_step is None:
                i += 1
                continue
            if exec_step.status not in ("not_started", "locked"):
                break  # already running/succeeded — don't re-trigger
            if sk not in VISIBLE_STEP_KEYS:
                # Hidden step — batch it with the next visible step
                next_step_chain.append(sk)
                exec_step.status = "running"
                exec_step.started_at = now
                exec_step.updated_at = now
                i += 1
            else:
                # Visible step — terminal entry of this batch; stop here
                next_step_chain.append(sk)
                exec_step.status = "running"
                exec_step.started_at = now
                exec_step.updated_at = now
                break

        if next_step_chain:
            # currentStepKey → last entry (always a visible step) so UI tracks correctly
            execution.current_step_key = next_step_chain[-1]
            execution.status = "running"
        else:
            execution.status = "completed"

        await execution.save()

        # Shot/clip rows are materialized by the local processor script from real DB examples.

        if next_step_chain:
            # ── Save one Message with the full stepKey chain ──
            gen_msg = Message(
                execution_id=str(exec_id),
                step_key=next_step_chain,
                org_id=org_id,
                project_id=project_id,
                episode_id=episode_id,
                part_id=part_id,
                action="generate",
                user_id=user_id,
            )
            await gen_msg.insert()

            # ── Send one SQS message with the full stepKey chain ──
            await send_to_sqs(
                execution_id=str(exec_id),
                step_key=next_step_chain,
                part_id=part_id,
                org_id=org_id,
                project_id=project_id,
                episode_id=episode_id,
                action="generate",
                user_id=user_id,
                template_key=execution.template_key or "",
            )

            logger.info(
                "Approved step '%s' → chain=%s → execution=%s",
                step_key, next_step_chain, execution_id,
            )
        else:
            logger.info(
                "Approved final step '%s' → execution=%s (pipeline complete)",
                step_key, execution_id,
            )

        return {
            "execution_id": str(execution.id),
            "step_key": step_key,
            "status": "approved",
            "next_step_chain": next_step_chain,
            "next_step_key": next_step_chain[0] if next_step_chain else None,
        }
