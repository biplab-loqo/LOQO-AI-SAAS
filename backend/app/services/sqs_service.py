"""
SQS Service — sends messages to Amazon SQS (standard or FIFO queue).

Message payload uses stepKey to identify the target step.
Queue type is auto-detected from the URL — FIFO params are only added when
the URL ends in ".fifo".
"""
import asyncio
import json
import hashlib
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional, List

import boto3
from botocore.exceptions import ClientError

from app.core.config import settings

logger = logging.getLogger("loqo.sqs")

# ── Lazy client ──────────────────────────────────────────────

_client = None


def _get_client():
    global _client
    if _client is None:
        region = settings.sqs_region
        logger.info("Initialising SQS boto3 client — region=%s", region)
        _client = boto3.client(
            "sqs",
            region_name=region,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )
    return _client


# ── Sync helper (runs in thread pool so it never blocks the event loop) ──

def _sync_send(queue_url: str, body_str: str, group_id: str, dedup_id: str, is_fifo: bool) -> Optional[str]:
    """Synchronous SQS send — called via asyncio.to_thread."""
    client = _get_client()
    kwargs: Dict[str, Any] = {
        "QueueUrl": queue_url,
        "MessageBody": body_str,
    }
    if is_fifo:
        kwargs["MessageGroupId"] = group_id
        kwargs["MessageDeduplicationId"] = dedup_id
    resp = client.send_message(**kwargs)
    return resp.get("MessageId")


# ── Public API ───────────────────────────────────────────────


def build_message_body(
    *,
    execution_id: str = "",
    step_key: Optional[List[str]] = None,
    part_id: str,
    org_id: str,
    project_id: str,
    episode_id: str = "",
    action: str = "generate",
    user_id: str = "",
    template_key: str = "",
) -> Dict[str, Any]:
    """Build the canonical SQS message body.

    Schema:
      {
        messageId,          executionId,        stepKey,
        partId,             orgId,
        projectId,          episodeId,          action,
        userId,             templateKey,        createdAt
      }
    """
    resolved_step_key = step_key or []
    return {
        "msg_id": str(uuid.uuid4()),
        "executionId": execution_id,
        "stepKey": resolved_step_key,
        "partId": part_id,
        "orgId": org_id,
        "projectId": project_id,
        "episodeId": episode_id,
        "action": action,
        "userId": user_id,
        "templateKey": template_key,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }


async def send_to_sqs(
    *,
    execution_id: str = "",
    step_key: Optional[List[str]] = None,
    part_id: str = "",
    org_id: str = "",
    project_id: str = "",
    episode_id: str = "",
    action: str = "generate",
    user_id: str = "",
    template_key: str = "",
) -> Optional[str]:
    """Send a structured message to an SQS queue (standard or FIFO).

    Message schema uses stepKey as an ordered array.

    Queue type is auto-detected from the URL: FIFO params (MessageGroupId +
    MessageDeduplicationId) are only included when the URL ends in ".fifo".

    The synchronous boto3 call is offloaded to a thread pool via
    asyncio.to_thread so it never blocks the async event loop.
    Returns the SQS MessageId on success, or None if the queue
    URL is not configured / send fails.
    """
    queue_url = settings.AWS_SQS_QUEUE_URL
    if not queue_url:
        logger.warning("AWS_SQS_QUEUE_URL not configured — skipping SQS send")
        return None

    body = build_message_body(
        execution_id=execution_id,
        step_key=step_key,
        part_id=part_id,
        org_id=org_id,
        project_id=project_id,
        episode_id=episode_id,
        action=action,
        user_id=user_id,
        template_key=template_key,
    )

    body_str = json.dumps(body, default=str)

    # Detect queue type from URL — FIFO queues end in .fifo
    is_fifo = queue_url.endswith(".fifo")
    first_step_key = step_key[0] if step_key else ""
    group_id = f"{execution_id}:{first_step_key}"
    dedup_id = hashlib.sha256(
        f"{first_step_key}:{action}:{datetime.now(timezone.utc).isoformat()}".encode()
    ).hexdigest()

    # Log the message body for debugging
    logger.info(
        "SQS [%s] message prepared:\n%s",
        "FIFO" if is_fifo else "standard",
        json.dumps(body, indent=2, default=str),
    )

    try:
        msg_id = await asyncio.to_thread(
            _sync_send, queue_url, body_str, group_id, dedup_id, is_fifo
        )
        logger.info(
            "✓ SQS message sent — action=%s stepKey=%s execution=%s msgId=%s body=%s",
            action, step_key, execution_id, msg_id, body_str,
        )
        return msg_id
    except ClientError as e:
        logger.error("SQS send failed: %s", e)
        return None
    except Exception as e:
        logger.error("SQS unexpected error: %s", e)
        return None
