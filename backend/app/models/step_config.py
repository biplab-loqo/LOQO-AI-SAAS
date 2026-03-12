"""StepConfig — maps to the `stepConfigs` collection.

Each document holds a key (config path) and an S3 URL to the
actual config file (e.g. prompt templates).
"""
from beanie import Document
from pydantic import Field
from typing import Optional


class StepConfig(Document):
    key: Optional[str] = None
    s3_url: Optional[str] = Field(None, alias="s3_url")

    class Settings:
        name = "stepConfigs"

    model_config = {"populate_by_name": True}
