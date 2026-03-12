"""
Media API — upload, list, delete workflow media assets.

POST   /media/presign        — get pre-signed S3 upload URL
POST   /media/confirm        — confirm upload + create WorkflowMedia record
GET    /media/{media_id}     — get media record
GET    /media/by-step/{sv_id}— list media for a step version
DELETE /media/{media_id}     — delete media record + S3 object
"""
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from beanie.odm.fields import PydanticObjectId

from app.core.auth import get_current_user
from app.core.config import settings
from app.models.user import User
from app.models.media import WorkflowMedia, StorageInfo
from app.utils.s3 import S3Service

router = APIRouter(prefix="/media", tags=["media"])


# ── Request bodies ───────────────────────────────────────────

class PresignRequest(BaseModel):
    filename: str
    content_type: str
    folder: str = "workflow-media"


class ConfirmUploadRequest(BaseModel):
    execution_id: str
    step_version_id: Optional[str] = None
    s3_key: str
    content_type: str
    size_bytes: Optional[int] = None
    type: str = "image"             # image | video | audio
    role: str = "final"             # intermediate | final


# ── Presign ──────────────────────────────────────────────────

@router.post("/presign")
async def presign_upload(
    body: PresignRequest,
    user: User = Depends(get_current_user),
):
    """Get a pre-signed S3 PUT URL."""
    s3 = S3Service.get()
    if not s3.enabled:
        raise HTTPException(503, "S3 not configured")

    key = s3.make_key(body.filename, body.folder)
    url = s3.presign_put(key, body.content_type)

    cdn_url = None
    if settings.CLOUDFRONT_DOMAIN:
        cdn_url = f"https://{settings.CLOUDFRONT_DOMAIN}/{key}"

    return {
        "upload_url": url,
        "s3_key": key,
        "public_url": s3.public_url(key),
        "cdn_url": cdn_url,
    }


# ── Confirm upload ───────────────────────────────────────────

@router.post("/confirm")
async def confirm_upload(
    body: ConfirmUploadRequest,
    user: User = Depends(get_current_user),
):
    """Confirm an upload and create a WorkflowMedia record."""
    cdn_url = None
    if settings.CLOUDFRONT_DOMAIN:
        cdn_url = f"https://{settings.CLOUDFRONT_DOMAIN}/{body.s3_key}"

    media = WorkflowMedia(
        execution_id=body.execution_id,
        step_version_id=body.step_version_id,
        type=body.type,
        role=body.role,
        storage=StorageInfo(
            provider="s3",
            bucket=settings.AWS_S3_BUCKET,
            key=body.s3_key,
            mime_type=body.content_type,
            size_bytes=body.size_bytes,
        ),
        cdn_url=cdn_url,
    )
    await media.insert()

    return {
        "media_id": str(media.id),
        "type": media.type,
        "cdn_url": media.cdn_url,
        "storage": media.storage.model_dump(),
    }


# ── Get media ────────────────────────────────────────────────

@router.get("/{media_id}")
async def get_media(
    media_id: str,
    user: User = Depends(get_current_user),
):
    media = await WorkflowMedia.get(media_id)
    if not media:
        raise HTTPException(404, "Media not found")
    return {
        "media_id": str(media.id),
        "execution_id": media.execution_id,
        "step_version_id": media.step_version_id,
        "type": media.type,
        "role": media.role,
        "cdn_url": media.cdn_url,
        "storage": media.storage.model_dump(),
        "created_at": media.created_at.isoformat(),
    }


@router.get("/by-step/{step_version_id}")
async def get_media_by_step(
    step_version_id: str,
    user: User = Depends(get_current_user),
):
    """List all media for a step version."""
    media_list = await WorkflowMedia.find(
        {"stepVersionId": step_version_id},
    ).to_list()
    return [
        {
            "media_id": str(m.id),
            "type": m.type,
            "role": m.role,
            "cdn_url": m.cdn_url,
            "storage": m.storage.model_dump(),
            "created_at": m.created_at.isoformat(),
        }
        for m in media_list
    ]


# ── Delete media ─────────────────────────────────────────────

@router.delete("/{media_id}")
async def delete_media(
    media_id: str,
    user: User = Depends(get_current_user),
):
    media = await WorkflowMedia.get(media_id)
    if not media:
        raise HTTPException(404, "Media not found")

    # Delete from S3
    if media.storage.key:
        try:
            s3 = S3Service.get()
            if s3.enabled:
                s3.delete_object(media.storage.key)
        except Exception:
            pass  # Don't fail if S3 delete fails

    await media.delete()
    return {"deleted": True, "media_id": media_id}
