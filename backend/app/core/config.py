from typing import List, Optional
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

_env_path = Path(__file__).parent.parent.parent / ".env"


class Settings(BaseSettings):
    PROJECT_NAME: str
    API_PREFIX: str

    # CORS
    BACKEND_CORS_ORIGINS: Optional[str] = Field(default="")

    @property
    def cors_origins(self) -> List[str]:
        if not self.BACKEND_CORS_ORIGINS or self.BACKEND_CORS_ORIGINS.strip() == "":
            return ["*"]
        value = self.BACKEND_CORS_ORIGINS.strip()
        if value.startswith("["):
            import json
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return [i.strip() for i in value.split(",") if i.strip()]
        if "," in value:
            return [i.strip() for i in value.split(",") if i.strip()]
        return [value]

    # Database
    MONGODB_URL: str
    MONGODB_DB_NAME: str
    # Authentication
    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # AWS — Real SQS + S3
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_S3_BUCKET: str = ""
    S3_BUCKET_NAME: str = ""
    AWS_REGION: str
    AWS_S3_REGION: str
    AWS_SQS_QUEUE_URL: str = ""  # Real SQS queue URL
    AWS_SQS_REGION: str = ""     # If empty, auto-parsed from AWS_SQS_QUEUE_URL
    PRIVATE_S3_BUCKETS: str = "" # Comma-separated list of private bucket names

    @property
    def private_s3_buckets(self) -> set:
        """Returns the set of private S3 bucket names from PRIVATE_S3_BUCKETS env var."""
        if not self.PRIVATE_S3_BUCKETS:
            return set()
        return {b.strip() for b in self.PRIVATE_S3_BUCKETS.split(",") if b.strip()}

    @property
    def sqs_region(self) -> str:
        """Returns the SQS region, parsed from the queue URL if not explicitly set."""
        if self.AWS_SQS_REGION:
            return self.AWS_SQS_REGION
        # Parse from URL: https://sqs.<region>.amazonaws.com/...
        url = self.AWS_SQS_QUEUE_URL
        if url:
            try:
                parts = url.split(".")
                # parts[1] is the region when URL is sqs.<region>.amazonaws.com
                if len(parts) >= 3 and parts[0].endswith("sqs"):
                    return parts[1]
            except Exception:
                pass
        return self.AWS_S3_REGION

    # CloudFront CDN
    CLOUDFRONT_DOMAIN: str = ""            # e.g. d1234abcdef.cloudfront.net
    CLOUDFRONT_KEY_PAIR_ID: str = ""       # for signed URLs (optional)
    CLOUDFRONT_PRIVATE_KEY_PATH: str = ""  # PEM file path for signed URLs (optional)

    # AWS MediaConvert (video transcoding)
    MEDIACONVERT_ENDPOINT: str = ""        # regional endpoint
    MEDIACONVERT_ROLE_ARN: str = ""        # IAM role for MediaConvert

    # Media processing
    IMAGE_WIDTHS: str             # target width for AVIF, e.g. "650"
    VIDEO_MAX_HEIGHT: int         # max video height for optimized output, e.g. 1080

    @property
    def image_widths_list(self) -> List[int]:
        return [int(w.strip()) for w in self.IMAGE_WIDTHS.split(",") if w.strip()]

    # Static media
    STATIC_BASE_URL: str

    model_config = SettingsConfigDict(
        env_file=str(_env_path) if _env_path.is_file() else None,
        env_file_encoding="utf-8",
        case_sensitive=True,
    )


settings = Settings()
