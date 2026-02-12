from typing import List, Union
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator

# Resolve .env path - may not exist on Vercel (uses env vars directly)
_env_path = Path(__file__).parent.parent.parent / ".env"


class Settings(BaseSettings):
    PROJECT_NAME: str = "Loqo AI Studio"
    API_V1_STR: str = "/api/v1"
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = []

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and v.startswith("["):
            import json
            return json.loads(v)
        elif isinstance(v, (list, str)):
            if isinstance(v, str):
                return [i.strip() for i in v.split(",") if i.strip()]
            return v
        raise ValueError(v)

    # Database
    MONGODB_URL: str
    MONGODB_DB_NAME: str = "loqo_db"

    # Authentication
    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:3000/auth/callback"
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 360
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    model_config = SettingsConfigDict(
        env_file=str(_env_path) if _env_path.is_file() else None,
        env_file_encoding="utf-8",
        case_sensitive=True,
    )


settings = Settings()
