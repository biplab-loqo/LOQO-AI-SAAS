"""Unified CRUD endpoints for Characters, Locations, and Props (project-level assets)."""
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime
from beanie import PydanticObjectId
from enum import Enum

from app.models.character import Character, AssetScope
from app.models.location import Location
from app.models.prop import Prop
from app.models.media import Image
from app.models.project import Project
from app.models.user import User
from app.core.auth import get_current_active_user

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────

class ScopeIn(BaseModel):
    project: bool = True
    episodeIds: List[str] = []
    partIds: List[str] = []


class AssetCreate(BaseModel):
    projectId: str
    name: str
    content: str  # JSON string with structured data
    imageIds: List[str] = []
    category: Optional[str] = None  # only for props
    scope: Optional[ScopeIn] = None


class AssetUpdate(BaseModel):
    name: Optional[str] = None
    content: Optional[str] = None
    imageIds: Optional[List[str]] = None
    category: Optional[str] = None
    scope: Optional[ScopeIn] = None


class ScopeOut(BaseModel):
    project: bool
    episodeIds: List[str]
    partIds: List[str]


class AssetOut(BaseModel):
    id: str
    organizationId: str
    projectId: str
    name: str
    content: str
    imageIds: List[str]
    category: Optional[str] = None
    scope: ScopeOut
    createdAt: datetime
    updatedAt: datetime


class ImageOut(BaseModel):
    id: str
    name: str
    imageUrl: str
    category: str
    createdAt: datetime


class AssetDetailOut(AssetOut):
    images: List[ImageOut] = []


class ImageUploadBody(BaseModel):
    projectId: str
    name: str = ""
    imageUrl: str
    category: str  # "character", "location", "prop"


# ── Helpers ──────────────────────────────────────────────────

def _to_out(doc, category: Optional[str] = None) -> AssetOut:
    scope = doc.scope
    return AssetOut(
        id=str(doc.id),
        organizationId=str(doc.organizationId),
        projectId=str(doc.projectId),
        name=doc.name,
        content=doc.content,
        imageIds=[str(i) for i in doc.imageIds],
        category=category if category else getattr(doc, "category", None),
        scope=ScopeOut(
            project=scope.project,
            episodeIds=[str(e) for e in scope.episodeIds],
            partIds=[str(p) for p in scope.partIds],
        ),
        createdAt=doc.createdAt,
        updatedAt=doc.updatedAt,
    )


async def _resolve_images(image_ids: List[PydanticObjectId]) -> List[ImageOut]:
    if not image_ids:
        return []
    images = await Image.find({"_id": {"$in": image_ids}}).to_list()
    return [
        ImageOut(
            id=str(img.id), name=img.name, imageUrl=img.imageUrl,
            category=img.category, createdAt=img.createdAt,
        )
        for img in images
    ]


async def _get_project_org(project_id: str, user: User) -> PydanticObjectId:
    project = await Project.get(PydanticObjectId(project_id))
    if not project:
        raise HTTPException(404, "Project not found")
    return user.organizationId or project.organization_id


# ═════════════════════════════════════════════════════════════
#  CHARACTERS
# ═════════════════════════════════════════════════════════════

@router.get("/characters/{project_id}", response_model=List[AssetOut])
async def list_characters(project_id: str, user: User = Depends(get_current_active_user)):
    chars = await Character.find(
        Character.projectId == PydanticObjectId(project_id)
    ).sort("+name").to_list()
    return [_to_out(c, "character") for c in chars]


@router.get("/characters/{project_id}/{character_id}", response_model=AssetDetailOut)
async def get_character(project_id: str, character_id: str, user: User = Depends(get_current_active_user)):
    char = await Character.get(PydanticObjectId(character_id))
    if not char or str(char.projectId) != project_id:
        raise HTTPException(404, "Character not found")
    out = _to_out(char, "character")
    images = await _resolve_images(char.imageIds)
    return AssetDetailOut(**out.model_dump(), images=images)


@router.post("/characters", response_model=AssetOut, status_code=201)
async def create_character(body: AssetCreate, user: User = Depends(get_current_active_user)):
    org_id = await _get_project_org(body.projectId, user)
    char = Character(
        organizationId=org_id,
        projectId=PydanticObjectId(body.projectId),
        name=body.name,
        content=body.content,
        imageIds=[PydanticObjectId(i) for i in body.imageIds],
    )
    if body.scope:
        char.scope = AssetScope(
            project=body.scope.project,
            episodeIds=[PydanticObjectId(e) for e in body.scope.episodeIds],
            partIds=[PydanticObjectId(p) for p in body.scope.partIds],
        )
    await char.insert()
    return _to_out(char, "character")


@router.put("/characters/{character_id}", response_model=AssetOut)
async def update_character(character_id: str, body: AssetUpdate, user: User = Depends(get_current_active_user)):
    char = await Character.get(PydanticObjectId(character_id))
    if not char:
        raise HTTPException(404, "Character not found")
    if body.name is not None:
        char.name = body.name
    if body.content is not None:
        char.content = body.content
    if body.imageIds is not None:
        char.imageIds = [PydanticObjectId(i) for i in body.imageIds]
    if body.scope is not None:
        char.scope = AssetScope(
            project=body.scope.project,
            episodeIds=[PydanticObjectId(e) for e in body.scope.episodeIds],
            partIds=[PydanticObjectId(p) for p in body.scope.partIds],
        )
    char.updatedAt = datetime.utcnow()
    await char.save()
    return _to_out(char, "character")


@router.delete("/characters/{character_id}", status_code=204)
async def delete_character(character_id: str, user: User = Depends(get_current_active_user)):
    char = await Character.get(PydanticObjectId(character_id))
    if not char:
        raise HTTPException(404, "Character not found")
    await char.delete()


# ═════════════════════════════════════════════════════════════
#  LOCATIONS
# ═════════════════════════════════════════════════════════════

@router.get("/locations/{project_id}", response_model=List[AssetOut])
async def list_locations(project_id: str, user: User = Depends(get_current_active_user)):
    locs = await Location.find(
        Location.projectId == PydanticObjectId(project_id)
    ).sort("+name").to_list()
    return [_to_out(l, "location") for l in locs]


@router.get("/locations/{project_id}/{location_id}", response_model=AssetDetailOut)
async def get_location(project_id: str, location_id: str, user: User = Depends(get_current_active_user)):
    loc = await Location.get(PydanticObjectId(location_id))
    if not loc or str(loc.projectId) != project_id:
        raise HTTPException(404, "Location not found")
    out = _to_out(loc, "location")
    images = await _resolve_images(loc.imageIds)
    return AssetDetailOut(**out.model_dump(), images=images)


@router.post("/locations", response_model=AssetOut, status_code=201)
async def create_location(body: AssetCreate, user: User = Depends(get_current_active_user)):
    org_id = await _get_project_org(body.projectId, user)
    loc = Location(
        organizationId=org_id,
        projectId=PydanticObjectId(body.projectId),
        name=body.name,
        content=body.content,
        imageIds=[PydanticObjectId(i) for i in body.imageIds],
    )
    if body.scope:
        loc.scope = AssetScope(
            project=body.scope.project,
            episodeIds=[PydanticObjectId(e) for e in body.scope.episodeIds],
            partIds=[PydanticObjectId(p) for p in body.scope.partIds],
        )
    await loc.insert()
    return _to_out(loc, "location")


@router.put("/locations/{location_id}", response_model=AssetOut)
async def update_location(location_id: str, body: AssetUpdate, user: User = Depends(get_current_active_user)):
    loc = await Location.get(PydanticObjectId(location_id))
    if not loc:
        raise HTTPException(404, "Location not found")
    if body.name is not None:
        loc.name = body.name
    if body.content is not None:
        loc.content = body.content
    if body.imageIds is not None:
        loc.imageIds = [PydanticObjectId(i) for i in body.imageIds]
    if body.scope is not None:
        loc.scope = AssetScope(
            project=body.scope.project,
            episodeIds=[PydanticObjectId(e) for e in body.scope.episodeIds],
            partIds=[PydanticObjectId(p) for p in body.scope.partIds],
        )
    loc.updatedAt = datetime.utcnow()
    await loc.save()
    return _to_out(loc, "location")


@router.delete("/locations/{location_id}", status_code=204)
async def delete_location(location_id: str, user: User = Depends(get_current_active_user)):
    loc = await Location.get(PydanticObjectId(location_id))
    if not loc:
        raise HTTPException(404, "Location not found")
    await loc.delete()


# ═════════════════════════════════════════════════════════════
#  PROPS / EXTRAS
# ═════════════════════════════════════════════════════════════

@router.get("/props/{project_id}", response_model=List[AssetOut])
async def list_props(project_id: str, user: User = Depends(get_current_active_user)):
    props = await Prop.find(
        Prop.projectId == PydanticObjectId(project_id)
    ).sort("+name").to_list()
    return [_to_out(p) for p in props]


@router.get("/props/{project_id}/{prop_id}", response_model=AssetDetailOut)
async def get_prop(project_id: str, prop_id: str, user: User = Depends(get_current_active_user)):
    prop = await Prop.get(PydanticObjectId(prop_id))
    if not prop or str(prop.projectId) != project_id:
        raise HTTPException(404, "Prop not found")
    out = _to_out(prop)
    images = await _resolve_images(prop.imageIds)
    return AssetDetailOut(**out.model_dump(), images=images)


@router.post("/props", response_model=AssetOut, status_code=201)
async def create_prop(body: AssetCreate, user: User = Depends(get_current_active_user)):
    org_id = await _get_project_org(body.projectId, user)
    prop = Prop(
        organizationId=org_id,
        projectId=PydanticObjectId(body.projectId),
        name=body.name,
        category=body.category or "general",
        content=body.content,
        imageIds=[PydanticObjectId(i) for i in body.imageIds],
    )
    if body.scope:
        prop.scope = AssetScope(
            project=body.scope.project,
            episodeIds=[PydanticObjectId(e) for e in body.scope.episodeIds],
            partIds=[PydanticObjectId(p) for p in body.scope.partIds],
        )
    await prop.insert()
    return _to_out(prop)


@router.put("/props/{prop_id}", response_model=AssetOut)
async def update_prop(prop_id: str, body: AssetUpdate, user: User = Depends(get_current_active_user)):
    prop = await Prop.get(PydanticObjectId(prop_id))
    if not prop:
        raise HTTPException(404, "Prop not found")
    if body.name is not None:
        prop.name = body.name
    if body.content is not None:
        prop.content = body.content
    if body.imageIds is not None:
        prop.imageIds = [PydanticObjectId(i) for i in body.imageIds]
    if body.category is not None:
        prop.category = body.category
    if body.scope is not None:
        prop.scope = AssetScope(
            project=body.scope.project,
            episodeIds=[PydanticObjectId(e) for e in body.scope.episodeIds],
            partIds=[PydanticObjectId(p) for p in body.scope.partIds],
        )
    prop.updatedAt = datetime.utcnow()
    await prop.save()
    return _to_out(prop)


@router.delete("/props/{prop_id}", status_code=204)
async def delete_prop(prop_id: str, user: User = Depends(get_current_active_user)):
    prop = await Prop.get(PydanticObjectId(prop_id))
    if not prop:
        raise HTTPException(404, "Prop not found")
    await prop.delete()


# ═════════════════════════════════════════════════════════════
#  ASSET IMAGES (upload reference images for any asset type)
# ═════════════════════════════════════════════════════════════

@router.post("/images", response_model=ImageOut, status_code=201)
async def create_asset_image(body: ImageUploadBody, user: User = Depends(get_current_active_user)):
    """Create a project-level reference image for characters/locations/props."""
    org_id = await _get_project_org(body.projectId, user)
    img = Image(
        organizationId=org_id,
        projectId=PydanticObjectId(body.projectId),
        name=body.name,
        imageUrl=body.imageUrl,
        category=body.category,
    )
    await img.insert()
    return ImageOut(
        id=str(img.id), name=img.name, imageUrl=img.imageUrl,
        category=img.category, createdAt=img.createdAt,
    )


@router.get("/images/{project_id}", response_model=List[ImageOut])
async def list_asset_images(project_id: str, category: Optional[str] = None, user: User = Depends(get_current_active_user)):
    """List all project-level reference images, optionally filtered by category."""
    query = {"projectId": PydanticObjectId(project_id), "partId": None}
    if category:
        query["category"] = category
    images = await Image.find(query).sort("-createdAt").to_list()
    return [
        ImageOut(
            id=str(img.id), name=img.name, imageUrl=img.imageUrl,
            category=img.category, createdAt=img.createdAt,
        )
        for img in images
    ]
