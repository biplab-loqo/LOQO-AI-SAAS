
import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.core.config import settings
from app.api.v1.router import api_router, tags_metadata
from app.db.mongodb import init_db

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        # Add security headers
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        return response

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    yield
    # Shutdown
    # Close connections if needed

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="""
    ## Loqo AI Studio API
    
    A comprehensive API for managing storytelling projects with AI-powered features.
    
    ### Features
    
    * **Projects**: Create and manage storytelling projects
    * **Episodes**: Organize content into episodes
    * **Parts**: Break down episodes into manageable parts
    * **Beats**: Define story beats for narrative structure
    * **Shots**: Plan camera shots and visual sequences
    * **Storyboards**: Create visual storyboards with panels
    * **Media**: Upload and manage images and video clips
    * **Organizations**: Multi-tenant organization management
    * **Authentication**: Google OAuth integration
    
    ### Version Control
    
    All content (beats, shots, storyboards, media) includes built-in version metadata:
    - `versionNo`: Version number
    - `edited`: Whether the item has been modified
    - `selected`: Whether this is the selected/active version
    
    ### Getting Started
    
    1. Authenticate via Google OAuth
    2. Create or join an organization
    3. Create a project
    4. Add episodes and parts
    5. Start creating beats, shots, and storyboards
    """,
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
    docs_url="/docs",  # Standard docs endpoint
    redoc_url="/redoc",  # Standard redoc endpoint
    openapi_tags=tags_metadata,  # Add tag descriptions
    contact={
        "name": "Loqo AI Studio",
        "email": "support@loqo.ai",
    },
    license_info={
        "name": "Proprietary",
    },
)

# Security Headers
app.add_middleware(SecurityHeadersMiddleware)

# Gzip compression
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Set all CORS enabled origins
allowed_origins = [
    "http://localhost:3000",
    "http://localhost:8000",
    "http://localhost:8001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8000",
    "http://127.0.0.1:8001",
]

# Add configured CORS origins from settings
if settings.BACKEND_CORS_ORIGINS:
    allowed_origins.extend(settings.BACKEND_CORS_ORIGINS)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600,  # Cache preflight requests for 10 minutes
)

app.include_router(api_router, prefix=settings.API_V1_STR)

# ── Static file serving for demo data (images, clips) ─────────
# Try multiple paths - works in both local dev and Railway
_demodata_dir = Path(__file__).resolve().parent.parent.parent / "demodata"
if not _demodata_dir.is_dir():
    # Same level as backend (monorepo root/demodata)
    _demodata_dir = Path(__file__).resolve().parent.parent.parent.parent / "demodata"
if not _demodata_dir.is_dir():
    # Fallback: relative to cwd (Railway)
    _demodata_dir = Path(os.getcwd()) / "demodata"

if _demodata_dir.is_dir():
    app.mount("/static", StaticFiles(directory=str(_demodata_dir)), name="static")
else:
    print(f"Warning: demodata directory not found at {_demodata_dir}")

@app.get("/")
async def root():
    return {"message": "Welcome to Loqo API", "status": "healthy"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
