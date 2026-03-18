import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

# Ensure our named loggers emit INFO+ output by default (useful when Uvicorn
# or other runners don't configure a root logger for application loggers).
loqo_logger = logging.getLogger("loqo")
if not loqo_logger.hasHandlers():
    handler = logging.StreamHandler()
    handler.setFormatter(
        logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s")
    )
    loqo_logger.addHandler(handler)
loqo_logger.setLevel(logging.INFO)

from app.core.config import settings
from app.api.v1 import api_v1_router
from app.db.mongodb import init_db, close_db

logger = logging.getLogger("loqo")


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains"
        )
        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    logger.info("[Startup] Database initialized")
    yield
    await close_db()
    logger.info("[Shutdown] Database connection closed")


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Loqo AI Studio API — Workflow Execution Engine",
    version="1.0.0",
    openapi_url=f"{settings.API_PREFIX}/openapi.json",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_tags=[
        {"name": "auth", "description": "Authentication"},
        {"name": "users", "description": "User profile"},
        {"name": "organizations", "description": "Organization management"},
        {"name": "projects", "description": "Project CRUD"},
        {"name": "workflows", "description": "Workflow execution engine"},
        {"name": "media", "description": "Media asset management"},
    ],
    contact={"name": "Loqo AI Studio", "email": "support@loqo.ai"},
    license_info={"name": "Proprietary"},
)

# Security Headers
app.add_middleware(SecurityHeadersMiddleware)

# Gzip compression
app.add_middleware(GZipMiddleware, minimum_size=1000)

# CORS — all origins come from BACKEND_CORS_ORIGINS env var
allowed_origins = settings.cors_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600,
)

# ── V1 RESTful API
app.include_router(api_v1_router, prefix=settings.API_PREFIX)


@app.get("/")
async def root():
    return {
        "message": "Welcome to Loqo API v1",
        "status": "healthy",
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}
