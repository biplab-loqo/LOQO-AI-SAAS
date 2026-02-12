"""Part CRUD (nested under projects/episodes) + /studio data endpoint."""
from typing import List, Optional
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime
from beanie import PydanticObjectId

from app.models.project import Project
from app.models.episode import Episode
from app.models.part import Part
from app.models.beat import Beat
from app.models.shot import Shot
from app.models.storyboard import Storyboard
from app.models.media import Image, Clip
from app.models.character import Character
from app.models.location import Location
from app.models.prop import Prop
from app.models.user import User
from app.core.auth import get_current_active_user
from app.utils.seed_part import seed_part_data


# ── Two routers: one for nested CRUD, one for /parts/{id}/studio ──
crud_router = APIRouter()
studio_router = APIRouter()


class PartCreate(BaseModel):
    title: str
    partNumber: int
    scriptText: Optional[str] = None


class PartUpdate(BaseModel):
    title: Optional[str] = None
    partNumber: Optional[int] = None
    scriptText: Optional[str] = None


class PartOut(BaseModel):
    id: str
    projectId: str
    episodeId: str
    partNumber: int
    title: str
    scriptText: Optional[str] = None
    createdBy: Optional[str] = None
    createdAt: datetime
    updatedAt: datetime


def _out(p: Part) -> PartOut:
    return PartOut(
        id=str(p.id), projectId=str(p.projectId), episodeId=str(p.episodeId),
        partNumber=p.partNumber, title=p.title, scriptText=p.scriptText,
        createdBy=str(p.createdBy) if p.createdBy else None,
        createdAt=p.createdAt, updatedAt=p.updatedAt,
    )


# ── Nested CRUD under /projects/{pid}/episodes/{eid}/parts ──

@crud_router.get("/{project_id}/episodes/{episode_id}/parts/{part_id}", response_model=PartOut)
async def get_part(project_id: str, episode_id: str, part_id: str, user: User = Depends(get_current_active_user)):
    part = await Part.get(PydanticObjectId(part_id))
    if not part or str(part.episodeId) != episode_id:
        raise HTTPException(404, "Part not found")
    return _out(part)


@crud_router.post("/{project_id}/episodes/{episode_id}/parts", response_model=PartOut, status_code=201)
async def create_part(project_id: str, episode_id: str, body: PartCreate, user: User = Depends(get_current_active_user)):
    ep = await Episode.get(PydanticObjectId(episode_id))
    if not ep or str(ep.projectId) != project_id:
        raise HTTPException(404, "Episode not found")
    proj = await Project.get(PydanticObjectId(project_id))
    if not proj:
        raise HTTPException(404, "Project not found")
    part = Part(
        projectId=PydanticObjectId(project_id), episodeId=ep.id,
        partNumber=body.partNumber, title=body.title,
        scriptText=body.scriptText, createdBy=user.id,
    )
    await part.insert()

    # Auto-seed demo content (beats, shots, storyboards, images, clips)
    try:
        await seed_part_data(
            org_id=proj.organizationId,
            project_id=proj.id,
            episode_id=ep.id,
            part_id=part.id,
        )
    except Exception as e:
        print(f"Warning: auto-seed failed for part {part.id}: {e}")

    return _out(part)


@crud_router.put("/{project_id}/episodes/{episode_id}/parts/{part_id}", response_model=PartOut)
async def update_part(project_id: str, episode_id: str, part_id: str, body: PartUpdate, user: User = Depends(get_current_active_user)):
    part = await Part.get(PydanticObjectId(part_id))
    if not part or str(part.episodeId) != episode_id:
        raise HTTPException(404, "Part not found")
    if body.title is not None:
        part.title = body.title
    if body.partNumber is not None:
        part.partNumber = body.partNumber
    if body.scriptText is not None:
        part.scriptText = body.scriptText
    part.updatedAt = datetime.utcnow()
    await part.save()
    return _out(part)


@crud_router.delete("/{project_id}/episodes/{episode_id}/parts/{part_id}", status_code=204)
async def delete_part(project_id: str, episode_id: str, part_id: str, user: User = Depends(get_current_active_user)):
    part = await Part.get(PydanticObjectId(part_id))
    if not part or str(part.episodeId) != episode_id:
        raise HTTPException(404, "Part not found")
    # Cascade delete content
    await Beat.find(Beat.partId == part.id).delete()
    await Shot.find(Shot.partId == part.id).delete()
    await Storyboard.find(Storyboard.partId == part.id).delete()
    await Image.find(Image.partId == part.id).delete()
    await Clip.find(Clip.partId == part.id).delete()
    await part.delete()


# ── Studio data: GET /parts/{part_id}/studio ─────────────────

def _str(oid) -> Optional[str]:
    return str(oid) if oid else None


@studio_router.get("/{part_id}/studio")
async def get_part_studio(part_id: str, user: User = Depends(get_current_active_user)):
    """Returns part + episode + all beats/shots/storyboards/images/clips in ONE call."""
    pid = PydanticObjectId(part_id)
    part = await Part.get(pid)
    if not part:
        raise HTTPException(404, "Part not found")

    episode = await Episode.get(part.episodeId)

    beats = await Beat.find(Beat.partId == pid).to_list()
    shots = await Shot.find(Shot.partId == pid).to_list()
    storyboards = await Storyboard.find(Storyboard.partId == pid).to_list()
    images = await Image.find(Image.partId == pid).to_list()
    clips = await Clip.find(Clip.partId == pid).to_list()

    # Project-level assets
    proj_id = part.projectId
    characters = await Character.find(Character.projectId == proj_id).sort("+name").to_list()
    locations = await Location.find(Location.projectId == proj_id).sort("+name").to_list()
    props = await Prop.find(Prop.projectId == proj_id).sort("+name").to_list()

    # Resolve asset image IDs
    all_asset_img_ids = []
    for asset in [*characters, *locations, *props]:
        all_asset_img_ids.extend(asset.imageIds)
    asset_images_map = {}
    if all_asset_img_ids:
        asset_imgs = await Image.find({"_id": {"$in": all_asset_img_ids}}).to_list()
        asset_images_map = {str(img.id): img for img in asset_imgs}

    def _asset_images(image_ids):
        return [
            {
                "id": str(img_id),
                "name": asset_images_map[str(img_id)].name if str(img_id) in asset_images_map else "",
                "imageUrl": asset_images_map[str(img_id)].imageUrl if str(img_id) in asset_images_map else "",
                "category": asset_images_map[str(img_id)].category if str(img_id) in asset_images_map else "",
            }
            for img_id in image_ids if str(img_id) in asset_images_map
        ]

    return {
        "part": {
            "id": _str(part.id), "title": part.title,
            "episodeId": _str(part.episodeId), "projectId": _str(part.projectId),
            "partNumber": part.partNumber, "scriptText": part.scriptText,
            "createdBy": _str(part.createdBy),
            "createdAt": part.createdAt.isoformat(), "updatedAt": part.updatedAt.isoformat(),
        },
        "episode": {
            "id": _str(episode.id), "projectId": _str(episode.projectId),
            "episodeNumber": episode.episodeNumber, "bibleText": episode.bibleText,
            "createdAt": episode.createdAt.isoformat(), "updatedAt": episode.updatedAt.isoformat(),
        } if episode else None,
        "beats": [
            {
                "id": _str(b.id), "partId": _str(b.partId),
                "content": b.content, "metadata": b.metadata.model_dump(),
                "createdAt": b.createdAt.isoformat(), "updatedAt": b.updatedAt.isoformat(),
            }
            for b in beats
        ],
        "shots": [
            {
                "id": _str(s.id), "partId": _str(s.partId),
                "content": s.content, "metadata": s.metadata.model_dump(),
                "createdAt": s.createdAt.isoformat(), "updatedAt": s.updatedAt.isoformat(),
            }
            for s in shots
        ],
        "storyboards": [
            {
                "id": _str(sb.id), "partId": _str(sb.partId),
                "content": sb.content, "metadata": sb.metadata.model_dump(),
                "createdAt": sb.createdAt.isoformat(), "updatedAt": sb.updatedAt.isoformat(),
            }
            for sb in storyboards
        ],
        "images": [
            {
                "id": _str(i.id), "partId": _str(i.partId),
                "shotId": _str(i.shotId), "name": i.name,
                "imageUrl": i.imageUrl, "category": i.category,
                "metadata": i.metadata.model_dump(),
                "createdAt": i.createdAt.isoformat(), "updatedAt": i.updatedAt.isoformat(),
            }
            for i in images
        ],
        "clips": [
            {
                "id": _str(c.id), "partId": _str(c.partId),
                "shotId": _str(c.shotId), "name": c.name,
                "clipUrl": c.clipUrl, "metadata": c.metadata.model_dump(),
                "createdAt": c.createdAt.isoformat(), "updatedAt": c.updatedAt.isoformat(),
            }
            for c in clips
        ],
        "characters": [
            {
                "id": _str(ch.id), "name": ch.name,
                "content": ch.content,
                "imageIds": [str(i) for i in ch.imageIds],
                "images": _asset_images(ch.imageIds),
                "scope": {
                    "project": ch.scope.project,
                    "episodeIds": [str(e) for e in ch.scope.episodeIds],
                    "partIds": [str(p) for p in ch.scope.partIds],
                },
                "createdAt": ch.createdAt.isoformat(), "updatedAt": ch.updatedAt.isoformat(),
            }
            for ch in characters
        ],
        "locations": [
            {
                "id": _str(loc.id), "name": loc.name,
                "content": loc.content,
                "imageIds": [str(i) for i in loc.imageIds],
                "images": _asset_images(loc.imageIds),
                "scope": {
                    "project": loc.scope.project,
                    "episodeIds": [str(e) for e in loc.scope.episodeIds],
                    "partIds": [str(p) for p in loc.scope.partIds],
                },
                "createdAt": loc.createdAt.isoformat(), "updatedAt": loc.updatedAt.isoformat(),
            }
            for loc in locations
        ],
        "props": [
            {
                "id": _str(p.id), "name": p.name,
                "category": p.category, "content": p.content,
                "imageIds": [str(i) for i in p.imageIds],
                "images": _asset_images(p.imageIds),
                "scope": {
                    "project": p.scope.project,
                    "episodeIds": [str(e) for e in p.scope.episodeIds],
                    "partIds": [str(pp) for pp in p.scope.partIds],
                },
                "createdAt": p.createdAt.isoformat(), "updatedAt": p.updatedAt.isoformat(),
            }
            for p in props
        ],
    }

