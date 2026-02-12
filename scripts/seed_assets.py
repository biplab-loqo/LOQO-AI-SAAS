#!/usr/bin/env python3
"""
Standalone seeder for Characters, Locations, and Props.

Seeds project-level assets into MongoDB for all existing projects
using data from demodata/character.json, demodata/location.json,
and demodata/Extras/.

Usage:
    python scripts/seed_assets.py
"""
import json
import sys
from pathlib import Path
from datetime import datetime
from pymongo import MongoClient
from bson import ObjectId

# ── Config ────────────────────────────────────────────────────
MONGO_CONFIG = {
    'host': 'localhost',
    'port': 27017,
    'database': 'loqo_db',
    'username': 'root',
    'password': 'examplepassword',
}

BASE_DIR = Path(__file__).parent.parent
DEMODATA_DIR = BASE_DIR / "demodata"
STATIC_BASE = "http://localhost:8000/static"
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}


def get_db():
    conn = f"mongodb://{MONGO_CONFIG['username']}:{MONGO_CONFIG['password']}@{MONGO_CONFIG['host']}:{MONGO_CONFIG['port']}"
    client = MongoClient(conn)
    return client, client[MONGO_CONFIG['database']]


def load_json(filename):
    with open(DEMODATA_DIR / filename, 'r', encoding='utf-8') as f:
        return json.load(f)


def scan_char_images():
    """Scan character image folders, return dict of char_name → [image_paths]."""
    chars_dir = DEMODATA_DIR / "Characters"
    if not chars_dir.is_dir():
        return {}
    result = {}
    for char_dir in sorted(chars_dir.iterdir()):
        if not char_dir.is_dir() or char_dir.name.startswith('.'):
            continue
        char_name = char_dir.name
        images = []
        # Recurse into subdirs
        for root, dirs, files in sorted(char_dir.walk()):
            for f in sorted(files):
                fp = root / f
                if fp.suffix.lower() in IMAGE_EXTS:
                    rel = fp.relative_to(DEMODATA_DIR)
                    images.append(str(rel))
        result[char_name] = images
    return result


def scan_location_images():
    """Scan location image folders."""
    loc_dir = DEMODATA_DIR / "Rajmahal_Location"
    if not loc_dir.is_dir():
        return []
    images = []
    for root, dirs, files in sorted(loc_dir.walk()):
        for f in sorted(files):
            fp = root / f
            if fp.suffix.lower() in IMAGE_EXTS:
                rel = fp.relative_to(DEMODATA_DIR)
                images.append(str(rel))
    return images


def scan_extras_images():
    """Scan extras image folders, return dict of extra_name → [image_paths]."""
    extras_dir = DEMODATA_DIR / "Extras"
    if not extras_dir.is_dir():
        return {}
    result = {}
    for sub in sorted(extras_dir.iterdir()):
        if not sub.is_dir() or sub.name.startswith('.'):
            continue
        images = []
        for f in sorted(sub.iterdir()):
            if f.is_file() and f.suffix.lower() in IMAGE_EXTS:
                rel = f.relative_to(DEMODATA_DIR)
                images.append(str(rel))
        if images:
            result[sub.name] = images
    return result


def seed_for_project(db, project):
    """Seed characters, locations, and props for a single project."""
    project_id = project['_id']
    org_id = project.get('organizationId')
    now = datetime.utcnow()

    print(f"\n  📦 Project: {project.get('name', '?')} ({project_id})")

    # ── CHARACTERS ────────────────────────────────────────
    existing = db.characters.count_documents({'projectId': project_id})
    if existing > 0:
        print(f"    ⏭  Characters: {existing} already exist, skipping")
    else:
        char_data = load_json("character.json")
        chars_dict = char_data.get("Characters", {})
        char_images_map = scan_char_images()

        for char_key, char_info in chars_dict.items():
            display_name = char_key.title()
            # Create reference images for this character
            image_ids = []
            char_img_paths = char_images_map.get(display_name, [])
            for img_path in char_img_paths:
                url = f"{STATIC_BASE}/{img_path}"
                img_doc = {
                    'organizationId': org_id,
                    'projectId': project_id,
                    'name': img_path,
                    'imageUrl': url,
                    'category': 'character',
                    'metadata': {'versionNo': 1, 'edited': False, 'selected': True},
                    'createdAt': now, 'updatedAt': now,
                }
                result = db.images.insert_one(img_doc)
                image_ids.append(result.inserted_id)

            db.characters.insert_one({
                'organizationId': org_id,
                'projectId': project_id,
                'name': display_name,
                'content': json.dumps(char_info),
                'imageIds': image_ids,
                'scope': {'project': True, 'episodeIds': [], 'partIds': []},
                'createdAt': now, 'updatedAt': now,
            })
            print(f"    ✓ Character: {display_name} ({len(image_ids)} images)")

    # ── LOCATIONS ─────────────────────────────────────────
    existing = db.locations.count_documents({'projectId': project_id})
    if existing > 0:
        print(f"    ⏭  Locations: {existing} already exist, skipping")
    else:
        loc_data = load_json("location.json")
        loc_list = loc_data.get("key_locations", [])
        loc_img_paths = scan_location_images()

        # Create location reference images
        loc_image_ids = []
        for img_path in loc_img_paths:
            url = f"{STATIC_BASE}/{img_path}"
            img_doc = {
                'organizationId': org_id,
                'projectId': project_id,
                'name': img_path,
                'imageUrl': url,
                'category': 'location',
                'metadata': {'versionNo': 1, 'edited': False, 'selected': True},
                'createdAt': now, 'updatedAt': now,
            }
            result = db.images.insert_one(img_doc)
            loc_image_ids.append(result.inserted_id)

        for loc_info in loc_list:
            # Assign all images to the first location for demo
            assign_ids = loc_image_ids if loc_info.get("location_id") == "1" else []
            db.locations.insert_one({
                'organizationId': org_id,
                'projectId': project_id,
                'name': loc_info.get('name', 'Unknown'),
                'content': json.dumps(loc_info),
                'imageIds': assign_ids,
                'scope': {'project': True, 'episodeIds': [], 'partIds': []},
                'createdAt': now, 'updatedAt': now,
            })
            print(f"    ✓ Location: {loc_info.get('name', '?')} ({len(assign_ids)} images)")

    # ── PROPS / EXTRAS ────────────────────────────────────
    existing = db.props.count_documents({'projectId': project_id})
    if existing > 0:
        print(f"    ⏭  Props: {existing} already exist, skipping")
    else:
        extras_map = scan_extras_images()
        for extra_name, img_paths in extras_map.items():
            image_ids = []
            for img_path in img_paths:
                url = f"{STATIC_BASE}/{img_path}"
                img_doc = {
                    'organizationId': org_id,
                    'projectId': project_id,
                    'name': img_path,
                    'imageUrl': url,
                    'category': 'props',
                    'metadata': {'versionNo': 1, 'edited': False, 'selected': True},
                    'createdAt': now, 'updatedAt': now,
                }
                result = db.images.insert_one(img_doc)
                image_ids.append(result.inserted_id)

            category = "vehicle" if extra_name.lower() == "car" else "general"
            db.props.insert_one({
                'organizationId': org_id,
                'projectId': project_id,
                'name': extra_name,
                'category': category,
                'content': json.dumps({
                    'name': extra_name,
                    'description': f'Reference images for {extra_name}',
                    'category': category,
                }),
                'imageIds': image_ids,
                'scope': {'project': True, 'episodeIds': [], 'partIds': []},
                'createdAt': now, 'updatedAt': now,
            })
            print(f"    ✓ Prop: {extra_name} ({len(image_ids)} images)")


def main():
    print("\n" + "=" * 60)
    print("🎭 LOQO ASSET SEEDER (Characters, Locations, Props)")
    print("=" * 60)

    client, db = get_db()
    print("✓ Connected to MongoDB")

    projects = list(db.projects.find({}))
    if not projects:
        print("⚠️  No projects found. Create a project first.")
        sys.exit(1)

    print(f"✓ Found {len(projects)} project(s)")

    for project in projects:
        seed_for_project(db, project)

    print("\n" + "=" * 60)
    print("✅ ASSET SEEDING COMPLETE")
    print("=" * 60 + "\n")

    client.close()


if __name__ == "__main__":
    main()
