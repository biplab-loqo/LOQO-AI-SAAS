"""
V1 RESTful API Router — single-DB architecture.

Route groups:
  /api/v1/auth          — Authentication (login/logout/me)
  /api/v1/users         — User profile management
  /api/v1/organizations — Organization CRUD + members
  /api/v1/projects      — Project CRUD
  /api/v1/episodes      — Episode CRUD
  /api/v1/parts         — Part CRUD
  /api/v1/workflows     — Workflow execution engine
  /api/v1/media         — Media asset management
"""
from fastapi import APIRouter

from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.users import router as users_router
from app.api.v1.endpoints.organizations import router as organizations_router
from app.api.v1.endpoints.projects import router as projects_router
from app.api.v1.endpoints.episodes import router as episodes_router
from app.api.v1.endpoints.parts import router as parts_router
from app.api.v1.endpoints.workflows import router as workflows_router
from app.api.v1.endpoints.media import router as media_router

api_v1_router = APIRouter()

api_v1_router.include_router(auth_router)
api_v1_router.include_router(users_router)
api_v1_router.include_router(organizations_router)
api_v1_router.include_router(projects_router)
api_v1_router.include_router(episodes_router)
api_v1_router.include_router(parts_router)
api_v1_router.include_router(workflows_router)
api_v1_router.include_router(media_router)
