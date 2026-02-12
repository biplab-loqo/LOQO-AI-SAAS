#!/usr/bin/env python3
"""
Seed script: drops loqo_db and creates fresh demo data using REAL content
from the demodata/ folder.

Beat content comes from demodata/beat_v1.json
Shot content comes from demodata/shot_v1.json, shot_v2.json, shot_v3.json
Storyboard content comes from demodata/storyboard_v1.json, storyboard_v2.json
Images & clips come from the Shot_*, Characters/* folders.

Static files are served at http://localhost:8000/static/...

Usage:
    cd backend && python -m scripts.seed
"""
import asyncio
import json
from pathlib import Path
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from app.models import ALL_MODELS
from app.models.user import User
from app.models.organization import Organization
from app.models.project import Project
from app.models.episode import Episode
from app.models.part import Part
from app.models.beat import Beat, BeatMetadata
from app.models.shot import Shot, ShotMetadata
from app.models.storyboard import Storyboard, StoryboardMetadata
from app.models.media import Image, Clip, MediaMetadata

MONGO_URL = "mongodb://root:examplepassword@localhost:27017/loqo_db?authSource=admin"
DB_NAME = "loqo_db"
STATIC_BASE = "http://localhost:8000/static"

# Resolve demodata folder (backend/../demodata)
DEMODATA_DIR = Path(__file__).resolve().parent.parent.parent / "demodata"

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
VIDEO_EXTS = {".mp4", ".mov", ".avi", ".mkv", ".webm"}


def load_json(filename: str) -> dict:
    """Load a JSON file from the demodata directory."""
    with open(DEMODATA_DIR / filename, "r", encoding="utf-8") as f:
        return json.load(f)


def scan_shot_folders() -> dict[str, dict[str, list[str]]]:
    """
    Scan Shot_* folders and return:
    { "Shot_1": { "images": ["1.jpeg", ...], "clips": ["1.mp4", ...] }, ... }
    """
    result = {}
    for entry in sorted(DEMODATA_DIR.iterdir()):
        if entry.is_dir() and entry.name.startswith("Shot_"):
            images = []
            clips = []
            for f in sorted(entry.iterdir()):
                if f.is_file():
                    ext = f.suffix.lower()
                    if ext in IMAGE_EXTS:
                        images.append(f.name)
                    elif ext in VIDEO_EXTS:
                        clips.append(f.name)
            result[entry.name] = {"images": images, "clips": clips}
    return result


def scan_character_folders() -> dict[str, list[str]]:
    """
    Scan Characters/ folder and return:
    { "Gayatri/CU-MCU": ["1.png", ...], "Gayatri/Full_Body": [...], "Sia": [...] }
    """
    chars_dir = DEMODATA_DIR / "Characters"
    if not chars_dir.is_dir():
        return {}
    result = {}
    for char_dir in sorted(chars_dir.iterdir()):
        if not char_dir.is_dir():
            continue
        char_name = char_dir.name
        # Check for sub-folders (like Gayatri/CU-MCU, Gayatri/Full_Body)
        sub_dirs = [d for d in char_dir.iterdir() if d.is_dir()]
        if sub_dirs:
            for sub in sorted(sub_dirs):
                key = f"{char_name}/{sub.name}"
                imgs = [f.name for f in sorted(sub.iterdir())
                        if f.is_file() and f.suffix.lower() in IMAGE_EXTS]
                if imgs:
                    result[key] = imgs
        # Also pick up loose files in the character root
        loose = [f.name for f in sorted(char_dir.iterdir())
                 if f.is_file() and f.suffix.lower() in IMAGE_EXTS]
        if loose:
            result[char_name] = loose
    return result


async def seed():
    client = AsyncIOMotorClient(MONGO_URL)

    # ── DROP ──────────────────────────────────────────────────
    print("⚠  Dropping database …")
    await client.drop_database(DB_NAME)
    print("✓  Database dropped.")

    # ── INIT BEANIE ──────────────────────────────────────────
    await init_beanie(database=client[DB_NAME], document_models=ALL_MODELS)
    print("✓  Beanie initialised.")

    now = datetime.utcnow()

    # ── USER ─────────────────────────────────────────────────
    user = User(
        name="Demo User", email="demo@loqo.ai",
        googleId="google-demo-id-12345",
        avatarUrl="https://ui-avatars.com/api/?name=Demo+User",
        bio="A storyteller at heart.", createdAt=now, updatedAt=now,
    )
    await user.insert()
    print(f"✓  User created  → {user.id}")

    user2 = User(
        name="Jane Collaborator", email="jane@loqo.ai",
        googleId="google-jane-id-67890",
        avatarUrl="https://ui-avatars.com/api/?name=Jane",
        bio="Screenwriter & director.", createdAt=now, updatedAt=now,
    )
    await user2.insert()

    # ── ORG ──────────────────────────────────────────────────
    org = Organization(
        name="Loqo Studios", description="Demo organisation",
        memberIds=[user.id, user2.id], createdAt=now, updatedAt=now,
    )
    await org.insert()
    user.organizationId = org.id
    await user.save()
    user2.organizationId = org.id
    await user2.save()
    print(f"✓  Organization  → {org.id}")

    # ── PROJECT ──────────────────────────────────────────────
    project = Project(
        organizationId=org.id, name="Rajmahal Ki Dulhan",
        description="A romantic drama set in a present-day Indian royal estate. Gayatri, Sia, and Pyarelaal arrive at Rajmahal — facing class tensions, family friction, and power dynamics.",
        createdBy=user.id, createdAt=now, updatedAt=now,
    )
    await project.insert()
    print(f"✓  Project       → {project.id}")

    # ── EPISODE ──────────────────────────────────────────────
    ep = Episode(
        projectId=project.id, episodeNumber=1,
        bibleText="Pilot — The arrival at Rajmahal. Gayatri, her daughter Sia, and her husband Pyarelaal reach the grand palace. The servants gossip about the marriage. Power dynamics and family friction emerge immediately.",
        createdBy=user.id, createdAt=now, updatedAt=now,
    )
    await ep.insert()
    print(f"✓  Episode       → {ep.id}")

    # ── PART ─────────────────────────────────────────────────
    part = Part(
        projectId=project.id, episodeId=ep.id,
        partNumber=1, title="Arrival at Rajmahal",
        scriptText=(
            "EXT. GRAND ROAD / RAJMAHAL OUTER GATE - DAY\n\n"
            "Ek badi se gadi (Luxury Car) is running on grand road.\n"
            "gadi is entering to the grand outer gate of Rajmahal.\n"
            "Gadi rajmahal ki main building ke bahar aake rukti hai...\n\n"
            "EXT. RAJMAHAL MAIN BUILDING ENTRANCE - CONTINUOUS\n\n"
            "sabhi naukar aapas me khusar pusar kar rahe hain….\n\n"
            "NAUKARANI\nKya sach me rajkumari is gareeb driver se shaadi karengi…\n"
            "Sab muh bana rahe hain…\n\n"
            "NAUKAR\nKya kismat hai uski..seedha road se mahal…\n\n"
            "Tabhi car se ek nice dress me gayatri utarti hai..\n"
            "Uske peeche Sia aur Pyarelaal bhi utarte hain.....\n\n"
            "SIA\nWow ye rajmahal to filmon wale mahal se bhi bada hai....\n\n"
            "GAYATRI\nAb yahi tumhara ghar hai...\n\n"
            "SIA\nSacchi mummy....\nGayatri smile karti hai use dekh kar....\n\n"
            "GAYATRI\nPyarelaal chalo\n\n"
            "PYARELAAL\nPyare boliye na..\n\n"
            "GAYATRI\nDekho zyada chipakne ki koshish mat karna... "
            "Abhi tak tumne mujhe nahi haraya hai... "
            "Wo to baki yoddha tumhe mil kar maar na den isliye maine tumhe select kar liya.... "
            "samjhe? Now follow me...\n\n"
            "Gayatri bol ke aage badh jati hai....\npyarelaal muh bana kar khada hai....\n\n"
            "SIA\nnaam to aapka hai pyare.. Par mummy dikha gayi aapko din me taare....\n\n"
            "PYARELAAL\nHaan sab teri wajah se hua hai.. Chuhiya...\n\n"
            "SIA\nPapa chuhiya nahi siya....\n\n"
            "PYARELAAL\nHaan haan chal...."
        ),
        createdBy=user.id, createdAt=now, updatedAt=now,
    )
    await part.insert()
    print(f"✓  Part          → {part.id}")

    # ══════════════════════════════════════════════════════════
    #  LOAD JSON FILES FROM DEMODATA
    # ══════════════════════════════════════════════════════════

    print(f"\n📂  Loading demo data from: {DEMODATA_DIR}")

    # ── BEAT: 1 version (beat_v1.json) ───────────────────────
    beat_data = load_json("beat_v1.json")
    beat_content = beat_data.get("beats", [])

    b1 = Beat(
        organizationId=org.id, projectId=project.id,
        episodeId=ep.id, partId=part.id,
        content=json.dumps(beat_content),
        metadata=BeatMetadata(versionNo=1, edited=False, selected=True),
        createdAt=now - timedelta(days=2), updatedAt=now - timedelta(days=2),
    )
    await b1.insert()
    print(f"✓  Beat v1       → {len(beat_content)} beats")

    # ── SHOTS: 3 versions ────────────────────────────────────
    shot_files = ["shot_v1.json", "shot_v2.json", "shot_v3.json"]
    total_shots = 0
    for i, fname in enumerate(shot_files, start=1):
        shot_data = load_json(fname)
        # shots are nested under "beats" key in these files
        shot_content = shot_data.get("beats", [])
        is_latest = (i == len(shot_files))
        s = Shot(
            organizationId=org.id, projectId=project.id,
            episodeId=ep.id, partId=part.id,
            content=json.dumps(shot_content),
            metadata=ShotMetadata(
                versionNo=i,
                edited=(i > 1),
                selected=is_latest,
            ),
            createdAt=now - timedelta(days=len(shot_files) - i + 1),
            updatedAt=now - timedelta(days=len(shot_files) - i + 1),
        )
        await s.insert()
        total_shots += 1
        print(f"✓  Shot v{i}       → {len(shot_content)} beats×shots (selected={is_latest})")

    # ── STORYBOARDS: 2 versions ──────────────────────────────
    sb_files = ["storyboard_v1.json", "storyboard_v2.json"]
    total_sb = 0
    for i, fname in enumerate(sb_files, start=1):
        sb_data = load_json(fname)
        sb_content = sb_data.get("storyboard", [])
        is_latest = (i == len(sb_files))
        sb = Storyboard(
            organizationId=org.id, projectId=project.id,
            episodeId=ep.id, partId=part.id,
            content=json.dumps(sb_content),
            metadata=StoryboardMetadata(
                versionNo=i,
                edited=(i > 1),
                selected=is_latest,
            ),
            createdAt=now - timedelta(days=len(sb_files) - i + 1),
            updatedAt=now - timedelta(days=len(sb_files) - i + 1),
        )
        await sb.insert()
        total_sb += 1
        print(f"✓  Storyboard v{i} → {len(sb_content)} panels (selected={is_latest})")

    # ══════════════════════════════════════════════════════════
    #  IMAGES & CLIPS FROM SHOT FOLDERS
    # ══════════════════════════════════════════════════════════

    shot_folders = scan_shot_folders()
    total_images = 0
    total_clips = 0

    for folder_name, files in shot_folders.items():
        # Create images
        for img_name in files["images"]:
            url = f"{STATIC_BASE}/{folder_name}/{img_name}"
            img = Image(
                organizationId=org.id, projectId=project.id,
                episodeId=ep.id, partId=part.id,
                name=f"{folder_name}/{img_name}",
                imageUrl=url,
                category="shot",
                metadata=MediaMetadata(versionNo=1, selected=True),
                createdAt=now, updatedAt=now,
            )
            await img.insert()
            total_images += 1

        # Create clips
        for clip_name in files["clips"]:
            url = f"{STATIC_BASE}/{folder_name}/{clip_name}"
            clip = Clip(
                organizationId=org.id, projectId=project.id,
                episodeId=ep.id, partId=part.id,
                name=f"{folder_name}/{clip_name}",
                clipUrl=url,
                metadata=MediaMetadata(versionNo=1, selected=True),
                createdAt=now, updatedAt=now,
            )
            await clip.insert()
            total_clips += 1

    print(f"✓  Shot images   → {total_images}")
    print(f"✓  Shot clips    → {total_clips}")

    # ══════════════════════════════════════════════════════════
    #  CHARACTER IMAGES FROM Characters/ FOLDERS
    # ══════════════════════════════════════════════════════════

    char_folders = scan_character_folders()
    total_char_images = 0

    for char_path, img_names in char_folders.items():
        for img_name in img_names:
            url = f"{STATIC_BASE}/Characters/{char_path}/{img_name}"
            img = Image(
                organizationId=org.id, projectId=project.id,
                episodeId=ep.id, partId=part.id,
                name=f"Characters/{char_path}/{img_name}",
                imageUrl=url,
                category="character",
                metadata=MediaMetadata(versionNo=1, selected=True),
                createdAt=now, updatedAt=now,
            )
            await img.insert()
            total_char_images += 1

    print(f"✓  Character imgs → {total_char_images}")

    # ══════════════════════════════════════════════════════════
    #  SUMMARY
    # ══════════════════════════════════════════════════════════

    print(f"\n{'═' * 50}")
    print(f"  🎬  Project: Rajmahal Ki Dulhan")
    print(f"  📺  Episode: 1 (Pilot)")
    print(f"  🎞   Part: Arrival at Rajmahal")
    print(f"  📝  Beats:       1 version ({len(beat_content)} beats)")
    print(f"  🎥  Shots:       {total_shots} versions")
    print(f"  🖼   Storyboards: {total_sb} versions")
    print(f"  🖼   Shot images: {total_images}")
    print(f"  🎬  Shot clips:  {total_clips}")
    print(f"  👤  Char images: {total_char_images}")
    print(f"  📁  Total media: {total_images + total_clips + total_char_images}")
    print(f"{'═' * 50}")
    print(f"\n🎉  Seed complete!")


if __name__ == "__main__":
    asyncio.run(seed())