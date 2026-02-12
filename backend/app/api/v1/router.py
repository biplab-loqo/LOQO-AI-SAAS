from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    organizations,
    users,
    projects,
    episodes,
    parts,
    content,
    media,
    assets,
)

tags_metadata = [
    {"name": "auth", "description": "Google OAuth login, /me, logout."},
    {"name": "users", "description": "User profile get / update."},
    {"name": "organizations", "description": "Organization CRUD + members."},
    {"name": "projects", "description": "Project CRUD + /full overview."},
    {"name": "episodes", "description": "Episode CRUD (nested under projects)."},
    {"name": "parts", "description": "Part CRUD + /studio data."},
    {"name": "content", "description": "Unified CRUD for beats/shots/storyboards + select version."},
    {"name": "media", "description": "Unified image & clip CRUD."},
    {"name": "assets", "description": "Characters, Locations, Props CRUD with reference images."},
]

api_router = APIRouter()

# Auth, Users, Organizations
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(organizations.router, prefix="/organizations", tags=["organizations"])
api_router.include_router(users.router, prefix="/users", tags=["users"])

# Projects (includes /full)
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])

# Episodes (nested under /projects)
api_router.include_router(episodes.router, prefix="/projects", tags=["episodes"])

# Parts CRUD (nested under /projects)
api_router.include_router(parts.crud_router, prefix="/projects", tags=["parts"])

# Parts Studio (top-level /parts/{id}/studio)
api_router.include_router(parts.studio_router, prefix="/parts", tags=["parts"])

# Content (beats/shots/storyboards – unified)
api_router.include_router(content.router, prefix="/content", tags=["content"])

# Media (images & clips – unified)
api_router.include_router(media.router, prefix="/media", tags=["media"])

# Assets (characters, locations, props – unified)
api_router.include_router(assets.router, prefix="/assets", tags=["assets"])


