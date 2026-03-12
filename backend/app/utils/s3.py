"""
Robust S3 Service — singleton client with pre-signed URLs, upload, delete.
Supports CDN delivery, versioned keys, and optimized asset storage.

All credentials come from env via Settings:
  AWS_ACCESS_KEY_ID
  AWS_SECRET_ACCESS_KEY
  AWS_S3_BUCKET
  AWS_S3_REGION
"""
from __future__ import annotations

import hashlib
import uuid
import logging
from typing import Optional

import boto3
from botocore.config import Config as BotoConfig
from botocore.exceptions import BotoCoreError, ClientError

from app.core.config import settings

logger = logging.getLogger("loqo.s3")

# ── Cache-Control presets ────────────────────────────────────
CACHE_IMMUTABLE = "public, max-age=31536000, immutable"      # 1 year, never changes
CACHE_LONG = "public, max-age=2592000"                        # 30 days
CACHE_SHORT = "public, max-age=3600, stale-while-revalidate=86400"  # 1hr + SWR 24hr


class S3ServiceError(Exception):
    """Raised when an S3 operation fails."""


class S3Service:
    """Thread-safe singleton wrapping boto3 S3 client."""

    _instance: Optional[S3Service] = None

    # ── singleton ────────────────────────────────────────────
    @classmethod
    def get(cls) -> S3Service:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    @classmethod
    def reset(cls) -> None:
        cls._instance = None

    # ── init ─────────────────────────────────────────────────
    def __init__(self) -> None:
        self.bucket = settings.AWS_S3_BUCKET
        self.region = settings.AWS_S3_REGION
        self._enabled = bool(
            settings.AWS_ACCESS_KEY_ID
            and settings.AWS_SECRET_ACCESS_KEY
            and settings.AWS_S3_BUCKET
        )
        if not self._enabled:
            logger.warning("[S3] Credentials not configured — S3 operations will fail at runtime.")
            self._client = None
            return

        boto_cfg = BotoConfig(
            region_name=self.region,
            signature_version="s3v4",
            retries={"max_attempts": 3, "mode": "standard"},
            s3={"addressing_style": "virtual"},
        )
        endpoint_url = f"https://s3.{self.region}.amazonaws.com"
        self._client = boto3.client(
            "s3",
            region_name=self.region,
            endpoint_url=endpoint_url,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            config=boto_cfg,
        )
        logger.info(f"[S3] Initialized — bucket={self.bucket}, region={self.region}")

    # ── helpers ──────────────────────────────────────────────
    @property
    def enabled(self) -> bool:
        return self._enabled

    def _require_client(self):
        if not self._enabled or self._client is None:
            raise S3ServiceError(
                "S3 is not configured. Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, "
                "and AWS_S3_BUCKET in your environment."
            )

    def public_url(self, key: str) -> str:
        return f"https://{self.bucket}.s3.{self.region}.amazonaws.com/{key}"

    @staticmethod
    def make_key(filename: str, folder: str = "uploads") -> str:
        """Generate a unique S3 key: folder/uuid12_filename"""
        uid = uuid.uuid4().hex[:12]
        safe_name = filename.replace(" ", "_")
        prefix = folder.strip("/") if folder else "uploads"
        return f"{prefix}/{uid}_{safe_name}"

    @staticmethod
    def make_versioned_key(filename: str, folder: str = "originals", version: str | None = None) -> str:
        """Generate a versioned S3 key: folder/uuid12_v{hash}_filename
        The version hash allows cache invalidation when the file changes."""
        uid = uuid.uuid4().hex[:12]
        safe_name = filename.replace(" ", "_")
        prefix = folder.strip("/") if folder else "originals"
        if version:
            return f"{prefix}/{uid}_v{version}_{safe_name}"
        return f"{prefix}/{uid}_{safe_name}"

    @staticmethod
    def version_hash(data: bytes) -> str:
        """Create a short content-based hash for cache busting."""
        return hashlib.sha256(data).hexdigest()[:12]

    @staticmethod
    def optimized_key(original_key: str, width: int, fmt: str = "avif") -> str:
        """Derive optimized key from original: optimized/{width}/{basename}.{fmt}"""
        import os
        basename = os.path.basename(original_key)
        name_no_ext = os.path.splitext(basename)[0]
        return f"optimized/{width}/{name_no_ext}.{fmt}"

    @staticmethod
    def optimized_video_key(original_key: str, suffix: str = "mp4") -> str:
        """Derive optimized video key: videos/{basename}.{suffix}"""
        import os
        basename = os.path.basename(original_key)
        name_no_ext = os.path.splitext(basename)[0]
        return f"videos/{name_no_ext}.{suffix}"

    # ── pre-signed URLs ──────────────────────────────────────
    def presign_put(self, key: str, content_type: str, expires: int = 3600) -> str:
        """Return a pre-signed PUT URL for the frontend to upload directly."""
        self._require_client()
        try:
            url = self._client.generate_presigned_url(
                ClientMethod="put_object",
                Params={
                    "Bucket": self.bucket,
                    "Key": key,
                    "ContentType": content_type,
                },
                ExpiresIn=expires,
            )
            return url
        except (BotoCoreError, ClientError) as exc:
            logger.error(f"[S3] presign_put failed: {exc}")
            raise S3ServiceError(f"Failed to generate upload URL: {exc}") from exc

    def presign_get(self, key: str, expires: int = 3600) -> str:
        """Return a pre-signed GET URL (useful for private buckets)."""
        self._require_client()
        try:
            url = self._client.generate_presigned_url(
                ClientMethod="get_object",
                Params={"Bucket": self.bucket, "Key": key},
                ExpiresIn=expires,
            )
            return url
        except (BotoCoreError, ClientError) as exc:
            logger.error(f"[S3] presign_get failed: {exc}")
            raise S3ServiceError(f"Failed to generate download URL: {exc}") from exc

    # ── direct upload ────────────────────────────────────────
    def upload_file(self, local_path: str, key: str, content_type: str | None = None,
                    cache_control: str = CACHE_IMMUTABLE) -> str:
        """Upload a local file to S3 with cache-control. Returns the public URL."""
        self._require_client()
        import mimetypes
        if not content_type:
            content_type, _ = mimetypes.guess_type(local_path)
            content_type = content_type or "application/octet-stream"
        try:
            self._client.upload_file(
                Filename=local_path,
                Bucket=self.bucket,
                Key=key,
                ExtraArgs={
                    "ContentType": content_type,
                    "CacheControl": cache_control,
                },
            )
            url = self.public_url(key)
            logger.info(f"[S3] Uploaded: {key}")
            return url
        except (BotoCoreError, ClientError) as exc:
            logger.error(f"[S3] upload_file failed: {exc}")
            raise S3ServiceError(f"Failed to upload {local_path}: {exc}") from exc

    def upload_bytes(self, data: bytes, key: str, content_type: str,
                     cache_control: str = CACHE_IMMUTABLE) -> str:
        """Upload raw bytes to S3. Returns the public URL."""
        self._require_client()
        try:
            self._client.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=data,
                ContentType=content_type,
                CacheControl=cache_control,
            )
            url = self.public_url(key)
            logger.info(f"[S3] Uploaded bytes: {key} ({len(data)} bytes)")
            return url
        except (BotoCoreError, ClientError) as exc:
            logger.error(f"[S3] upload_bytes failed: {exc}")
            raise S3ServiceError(f"Failed to upload bytes to {key}: {exc}") from exc

    def download_bytes(self, key: str) -> bytes:
        """Download object as bytes."""
        self._require_client()
        try:
            resp = self._client.get_object(Bucket=self.bucket, Key=key)
            return resp["Body"].read()
        except (BotoCoreError, ClientError) as exc:
            logger.error(f"[S3] download_bytes failed: {exc}")
            raise S3ServiceError(f"Failed to download {key}: {exc}") from exc

    def update_cache_control(self, key: str, cache_control: str) -> bool:
        """Update CacheControl metadata on an existing object (copy-in-place)."""
        self._require_client()
        try:
            # Get existing metadata
            meta = self._client.head_object(Bucket=self.bucket, Key=key)
            content_type = meta.get("ContentType", "application/octet-stream")

            self._client.copy_object(
                Bucket=self.bucket,
                CopySource={"Bucket": self.bucket, "Key": key},
                Key=key,
                ContentType=content_type,
                CacheControl=cache_control,
                MetadataDirective="REPLACE",
            )
            logger.info(f"[S3] Updated cache-control for {key}: {cache_control}")
            return True
        except (BotoCoreError, ClientError) as exc:
            logger.error(f"[S3] update_cache_control failed: {exc}")
            return False

    # ── object operations ────────────────────────────────────
    def delete_object(self, key: str) -> bool:
        """Delete an object from the bucket. Returns True on success."""
        self._require_client()
        try:
            self._client.delete_object(Bucket=self.bucket, Key=key)
            logger.info(f"[S3] Deleted: {key}")
            return True
        except (BotoCoreError, ClientError) as exc:
            logger.error(f"[S3] delete_object failed: {exc}")
            raise S3ServiceError(f"Failed to delete {key}: {exc}") from exc

    def head_object(self, key: str) -> Optional[dict]:
        """Check if an object exists. Returns metadata dict or None."""
        self._require_client()
        try:
            resp = self._client.head_object(Bucket=self.bucket, Key=key)
            return {
                "content_type": resp.get("ContentType"),
                "content_length": resp.get("ContentLength"),
                "last_modified": resp.get("LastModified"),
            }
        except ClientError as exc:
            if exc.response["Error"]["Code"] == "404":
                return None
            raise S3ServiceError(f"head_object failed: {exc}") from exc

    def copy_object(self, src_key: str, dest_key: str, cache_control: str | None = None) -> str:
        """Copy an object within the same bucket. Returns public URL of copy."""
        self._require_client()
        try:
            params = {
                "Bucket": self.bucket,
                "CopySource": {"Bucket": self.bucket, "Key": src_key},
                "Key": dest_key,
            }
            if cache_control:
                params["CacheControl"] = cache_control
                params["MetadataDirective"] = "REPLACE"
            self._client.copy_object(**params)
            return self.public_url(dest_key)
        except (BotoCoreError, ClientError) as exc:
            raise S3ServiceError(f"copy_object failed: {exc}") from exc

    def key_from_url(self, url: str) -> str | None:
        """Extract S3 key from a public S3 URL or CDN URL."""
        if not url:
            return None
        # S3 URL format: https://{bucket}.s3.{region}.amazonaws.com/{key}
        if ".amazonaws.com/" in url:
            return url.split(".amazonaws.com/", 1)[-1]
        # CloudFront: https://{domain}/{key}
        cf_domain = settings.CLOUDFRONT_DOMAIN
        if cf_domain and cf_domain in url:
            return url.split(cf_domain + "/", 1)[-1] if cf_domain + "/" in url else None
        return None

    # ── health check ─────────────────────────────────────────
    def validate(self) -> dict:
        """Test the connection and return status dict."""
        if not self._enabled:
            return {"ok": False, "error": "S3 not configured"}
        try:
            self._client.head_bucket(Bucket=self.bucket)
            return {"ok": True, "bucket": self.bucket, "region": self.region}
        except (BotoCoreError, ClientError) as exc:
            return {"ok": False, "error": str(exc)}


# ── Singleton instance ────────────────────────────────────────
s3_service = S3Service()
