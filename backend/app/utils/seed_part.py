"""
Utility to populate a newly-created Part with demo data from the
demodata/ directory (beats, shots, storyboards, images, clips, characters, locations, props).

Called automatically from the create_part endpoint.
"""
import json
from pathlib import Path
from datetime import datetime, timedelta
from beanie import PydanticObjectId

from app.models.beat import Beat, BeatMetadata
from app.models.shot import Shot, ShotMetadata
from app.models.storyboard import Storyboard, StoryboardMetadata
from app.models.media import Image, Clip, MediaMetadata
from app.models.character import Character, AssetScope
from app.models.location import Location
from app.models.prop import Prop

STATIC_BASE = "http://localhost:8000/static"
DEMODATA_DIR = Path(__file__).resolve().parent.parent.parent.parent / "demodata"
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
VIDEO_EXTS = {".mp4", ".mov", ".avi", ".mkv", ".webm"}


def _load_json(filename: str) -> dict:
    with open(DEMODATA_DIR / filename, "r", encoding="utf-8") as f:
        return json.load(f)


def _scan_shot_folders() -> dict[str, dict[str, list[str]]]:
    result = {}
    for entry in sorted(DEMODATA_DIR.iterdir()):
        if entry.is_dir() and entry.name.startswith("Shot_"):
            images, clips = [], []
            for f in sorted(entry.iterdir()):
                if f.is_file():
                    ext = f.suffix.lower()
                    if ext in IMAGE_EXTS:
                        images.append(f.name)
                    elif ext in VIDEO_EXTS:
                        clips.append(f.name)
            result[entry.name] = {"images": images, "clips": clips}
    return result


def _scan_character_folders() -> dict[str, list[str]]:
    chars_dir = DEMODATA_DIR / "Characters"
    if not chars_dir.is_dir():
        return {}
    result = {}
    for char_dir in sorted(chars_dir.iterdir()):
        if not char_dir.is_dir():
            continue
        char_name = char_dir.name
        sub_dirs = [d for d in char_dir.iterdir() if d.is_dir()]
        if sub_dirs:
            for sub in sorted(sub_dirs):
                key = f"{char_name}/{sub.name}"
                imgs = [f.name for f in sorted(sub.iterdir())
                        if f.is_file() and f.suffix.lower() in IMAGE_EXTS]
                if imgs:
                    result[key] = imgs
        loose = [f.name for f in sorted(char_dir.iterdir())
                 if f.is_file() and f.suffix.lower() in IMAGE_EXTS]
        if loose:
            result[char_name] = loose
    return result


def _scan_location_folders() -> dict[str, list[str]]:
    loc_dir = DEMODATA_DIR / "Rajmahal_Location"
    if not loc_dir.is_dir():
        return {}
    result = {}
    for sub in sorted(loc_dir.iterdir()):
        if sub.is_dir():
            imgs = [f.name for f in sorted(sub.iterdir())
                    if f.is_file() and f.suffix.lower() in IMAGE_EXTS]
            if imgs:
                result[sub.name] = imgs
    # Also grab root-level images
    root_imgs = [f.name for f in sorted(loc_dir.iterdir())
                 if f.is_file() and f.suffix.lower() in IMAGE_EXTS]
    if root_imgs:
        result["_root"] = root_imgs
    return result


def _scan_extras_folders() -> dict[str, list[str]]:
    extras_dir = DEMODATA_DIR / "Extras"
    if not extras_dir.is_dir():
        return {}
    result = {}
    for sub in sorted(extras_dir.iterdir()):
        if sub.is_dir():
            imgs = [f.name for f in sorted(sub.iterdir())
                    if f.is_file() and f.suffix.lower() in IMAGE_EXTS]
            if imgs:
                result[sub.name] = imgs
    return result


async def seed_part_data(
    org_id: PydanticObjectId,
    project_id: PydanticObjectId,
    episode_id: PydanticObjectId,
    part_id: PydanticObjectId,
) -> dict:
    """Insert demo beats, shots, storyboards, images & clips for a part.
    Returns a summary dict with counts."""

    now = datetime.utcnow()

    # ── BEATS ─────────────────────────────────────────────
    beat_data = _load_json("beat_v1.json")
    beat_content = beat_data.get("beats", [])
    await Beat(
        organizationId=org_id, projectId=project_id,
        episodeId=episode_id, partId=part_id,
        content=json.dumps(beat_content),
        metadata=BeatMetadata(versionNo=1, edited=False, selected=True),
        createdAt=now - timedelta(days=2), updatedAt=now - timedelta(days=2),
    ).insert()

    # ── SHOTS (3 versions) ────────────────────────────────
    shot_files = ["shot_v1.json", "shot_v2.json", "shot_v3.json"]
    for i, fname in enumerate(shot_files, start=1):
        shot_data = _load_json(fname)
        shot_content = shot_data.get("beats", [])
        is_latest = (i == len(shot_files))
        await Shot(
            organizationId=org_id, projectId=project_id,
            episodeId=episode_id, partId=part_id,
            content=json.dumps(shot_content),
            metadata=ShotMetadata(versionNo=i, edited=(i > 1), selected=is_latest),
            createdAt=now - timedelta(days=len(shot_files) - i + 1),
            updatedAt=now - timedelta(days=len(shot_files) - i + 1),
        ).insert()

    # ── STORYBOARDS (2 versions) ──────────────────────────
    sb_files = ["storyboard_v1.json", "storyboard_v2.json"]
    for i, fname in enumerate(sb_files, start=1):
        sb_data = _load_json(fname)
        sb_content = sb_data.get("storyboard", [])
        is_latest = (i == len(sb_files))
        await Storyboard(
            organizationId=org_id, projectId=project_id,
            episodeId=episode_id, partId=part_id,
            content=json.dumps(sb_content),
            metadata=StoryboardMetadata(versionNo=i, edited=(i > 1), selected=is_latest),
            createdAt=now - timedelta(days=len(sb_files) - i + 1),
            updatedAt=now - timedelta(days=len(sb_files) - i + 1),
        ).insert()

    # ── SHOT IMAGES & CLIPS ──────────────────────────────
    shot_folders = _scan_shot_folders()
    total_images = 0
    total_clips = 0
    for folder_name, files in shot_folders.items():
        for img_name in files["images"]:
            url = f"{STATIC_BASE}/{folder_name}/{img_name}"
            await Image(
                organizationId=org_id, projectId=project_id,
                episodeId=episode_id, partId=part_id,
                name=f"{folder_name}/{img_name}", imageUrl=url, category="shot",
                metadata=MediaMetadata(versionNo=1, selected=True),
                createdAt=now, updatedAt=now,
            ).insert()
            total_images += 1
        for clip_name in files["clips"]:
            url = f"{STATIC_BASE}/{folder_name}/{clip_name}"
            await Clip(
                organizationId=org_id, projectId=project_id,
                episodeId=episode_id, partId=part_id,
                name=f"{folder_name}/{clip_name}", clipUrl=url,
                metadata=MediaMetadata(versionNo=1, selected=True),
                createdAt=now, updatedAt=now,
            ).insert()
            total_clips += 1

    # ── CHARACTER IMAGES ─────────────────────────────────
    char_folders = _scan_character_folders()
    total_char = 0
    for char_path, img_names in char_folders.items():
        for img_name in img_names:
            url = f"{STATIC_BASE}/Characters/{char_path}/{img_name}"
            await Image(
                organizationId=org_id, projectId=project_id,
                episodeId=episode_id, partId=part_id,
                name=f"Characters/{char_path}/{img_name}", imageUrl=url, category="character",
                metadata=MediaMetadata(versionNo=1, selected=True),
                createdAt=now, updatedAt=now,
            ).insert()
            total_char += 1

    # ── LOCATION IMAGES ──────────────────────────────────
    loc_folders = _scan_location_folders()
    total_loc_imgs = 0
    for loc_path, img_names in loc_folders.items():
        for img_name in img_names:
            if loc_path == "_root":
                url = f"{STATIC_BASE}/Rajmahal_Location/{img_name}"
                name = f"Rajmahal_Location/{img_name}"
            else:
                url = f"{STATIC_BASE}/Rajmahal_Location/{loc_path}/{img_name}"
                name = f"Rajmahal_Location/{loc_path}/{img_name}"
            await Image(
                organizationId=org_id, projectId=project_id,
                episodeId=episode_id, partId=part_id,
                name=name, imageUrl=url, category="location",
                metadata=MediaMetadata(versionNo=1, selected=True),
                createdAt=now, updatedAt=now,
            ).insert()
            total_loc_imgs += 1

    # ── EXTRAS / PROPS IMAGES ────────────────────────────
    extras_folders = _scan_extras_folders()
    total_extras_imgs = 0
    for extra_name, img_names in extras_folders.items():
        for img_name in img_names:
            url = f"{STATIC_BASE}/Extras/{extra_name}/{img_name}"
            await Image(
                organizationId=org_id, projectId=project_id,
                episodeId=episode_id, partId=part_id,
                name=f"Extras/{extra_name}/{img_name}", imageUrl=url, category="props",
                metadata=MediaMetadata(versionNo=1, selected=True),
                createdAt=now, updatedAt=now,
            ).insert()
            total_extras_imgs += 1

    # ── PROJECT-LEVEL CHARACTERS ─────────────────────────
    # Only seed if no characters exist yet for this project
    existing_chars = await Character.find(Character.projectId == project_id).count()
    total_characters = 0
    if existing_chars == 0:
        try:
            char_data = _load_json("character.json")
            chars_dict = char_data.get("Characters", {})
            # Collect character images from the image table for linking
            for char_name, char_info in chars_dict.items():
                # Find matching images for this character
                display_name = char_name.title()
                char_image_docs = await Image.find({
                    "projectId": project_id,
                    "category": "character",
                    "name": {"$regex": f"Characters/{display_name}", "$options": "i"},
                }).to_list()
                image_ids = [img.id for img in char_image_docs]

                await Character(
                    organizationId=org_id, projectId=project_id,
                    name=display_name,
                    content=json.dumps(char_info),
                    imageIds=image_ids,
                    scope=AssetScope(project=True, episodeIds=[], partIds=[]),
                    createdAt=now, updatedAt=now,
                ).insert()
                total_characters += 1
        except Exception as e:
            print(f"  Warning: Could not seed characters: {e}")

    # ── PROJECT-LEVEL LOCATIONS ──────────────────────────
    existing_locs = await Location.find(Location.projectId == project_id).count()
    total_locations = 0
    if existing_locs == 0:
        try:
            loc_data = _load_json("location.json")
            loc_list = loc_data.get("key_locations", [])
            # Get all location images for linking
            loc_image_docs = await Image.find({
                "projectId": project_id,
                "category": "location",
            }).to_list()
            loc_image_ids = [img.id for img in loc_image_docs]

            for loc_info in loc_list:
                await Location(
                    organizationId=org_id, projectId=project_id,
                    name=loc_info.get("name", "Unknown Location"),
                    content=json.dumps(loc_info),
                    imageIds=loc_image_ids if loc_info.get("location_id") == "1" else [],
                    scope=AssetScope(project=True, episodeIds=[], partIds=[]),
                    createdAt=now, updatedAt=now,
                ).insert()
                total_locations += 1
        except Exception as e:
            print(f"  Warning: Could not seed locations: {e}")

    # ── PROJECT-LEVEL PROPS / EXTRAS ─────────────────────
    existing_props = await Prop.find(Prop.projectId == project_id).count()
    total_props = 0
    if existing_props == 0:
        try:
            for extra_name in extras_folders:
                extra_image_docs = await Image.find({
                    "projectId": project_id,
                    "category": "props",
                    "name": {"$regex": f"Extras/{extra_name}", "$options": "i"},
                }).to_list()
                image_ids = [img.id for img in extra_image_docs]

                await Prop(
                    organizationId=org_id, projectId=project_id,
                    name=extra_name,
                    category="vehicle" if extra_name.lower() == "car" else "general",
                    content=json.dumps({
                        "name": extra_name,
                        "description": f"Reference images for {extra_name}",
                        "category": "vehicle" if extra_name.lower() == "car" else "general",
                    }),
                    imageIds=image_ids,
                    scope=AssetScope(project=True, episodeIds=[], partIds=[]),
                    createdAt=now, updatedAt=now,
                ).insert()
                total_props += 1
        except Exception as e:
            print(f"  Warning: Could not seed props: {e}")

    return {
        "beats": len(beat_content),
        "shot_versions": len(shot_files),
        "storyboard_versions": len(sb_files),
        "shot_images": total_images,
        "clips": total_clips,
        "character_images": total_char,
        "location_images": total_loc_imgs,
        "extras_images": total_extras_imgs,
        "characters": total_characters,
        "locations": total_locations,
        "props": total_props,
    }
