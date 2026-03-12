"""
Database initialisation — connects to the configured MongoDB instance and
initialises Beanie with all document models.
"""
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.core.config import settings
from app.models import ALL_MODELS

_client: AsyncIOMotorClient | None = None


async def init_db():
    """Connect to Atlas and initialise Beanie with all document models."""
    global _client
    _client = AsyncIOMotorClient(settings.MONGODB_URL)
    await init_beanie(
        database=_client[settings.MONGODB_DB_NAME],
        document_models=ALL_MODELS,
    )


async def close_db():
    """Close the Motor client on shutdown."""
    global _client
    if _client:
        _client.close()
        _client = None
