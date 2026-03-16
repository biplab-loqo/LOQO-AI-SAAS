"""
seed.py — Seed the database with a complete demo dataset.

Creates:
  • 1 User (test@test.com) with Organization
  • 1 Project → 1 Episode → 1 Part
    • 1 TemplateVersion (micro_drama_pipeline, 14 steps)
  • 1 WorkflowExecution linked to part + template
    • 14 StepVersions with realistic output (blobs, artifactRefs, s3_uris)

Run:
  cd backend
  python -m scripts.seed
"""

import sys
from datetime import datetime, timezone
from bson import ObjectId
from pymongo import MongoClient

# ── Connection ────────────────────────────────────────────────
MONGO_URI = "mongodb+srv://deepakstarbio_db_user:dkQuuhaq9iLqBHCj@cluster0.rdg6wwa.mongodb.net/?appName=Cluster0"
DB_NAME = "test"

client = MongoClient(MONGO_URI)
db = client[DB_NAME]

now = datetime.now(timezone.utc)

# Real S3 base used by seed_part.py (HTTP 200 verified assets)
_S3_BASE = "https://amzn-s3-bucket-lq-ai-3.s3.us-east-1.amazonaws.com/executions/69a964e453c01a6f14088ba7"

# ── Clear existing data ──────────────────────────────────────
COLLECTIONS = [
    "users", "organizations", "projects", "episodes", "parts",
    "workflowTemplateVersions", "workflowExecutions", "stepVersions",
    "stepConfigs", "messages", "shots", "clips", "characters", "locations",
]
for col in COLLECTIONS:
    db[col].drop()
print("[SEED] Cleared all collections")


# ══════════════════════════════════════════════════════════════
#  1. USER + ORGANIZATION
# ══════════════════════════════════════════════════════════════

org_id = ObjectId()
user_id = ObjectId()

db["organizations"].insert_one({
    "_id": org_id,
    "name": "Demo Studio",
    "description": "Loqo AI demo workspace",
    "ownerId": str(user_id),
    "memberIds": [str(user_id)],
    "createdAt": now,
    "updatedAt": now,
})

db["users"].insert_one({
    "_id": user_id,
    "name": "Demo User",
    "email": "test@test.com",
    "authProvider": "demo",
    "avatarUrl": None,
    "bio": "Demo account for local development",
    "googleId": None,
    "organizationId": str(org_id),
    "createdAt": now,
    "updatedAt": now,
})
print(f"[SEED] User: {user_id}  Org: {org_id}")


# ══════════════════════════════════════════════════════════════
#  2. PROJECT → EPISODE → PART
# ══════════════════════════════════════════════════════════════

project_id = ObjectId()
episode_id = ObjectId()
part_id = ObjectId()

db["projects"].insert_one({
    "_id": project_id,
    "organizationId": org_id,
    "title": "The Driver's Swayamvar",
    "description": "A short micro-drama about an auto driver's marriage quest",
    "createdBy": str(user_id),
    "isActive": True,
    "createdAt": now,
    "updatedAt": now,
})

db["episodes"].insert_one({
    "_id": episode_id,
    "projectId": str(project_id),
    "title": "Episode 1 – The Proposal",
    "episodeNumber": 1,
    "description": "Pyarelaal receives a marriage proposal",
    "bibleText": None,
    "isActive": True,
    "createdBy": str(user_id),
    "createdAt": now,
    "updatedAt": now,
})

print(f"[SEED] Project: {project_id}  Episode: {episode_id}")


# ══════════════════════════════════════════════════════════════
#  3. TEMPLATE VERSION (14-step micro_drama_pipeline)
# ══════════════════════════════════════════════════════════════

template_id = ObjectId()
template_version_id = ObjectId()

PIPELINE_STEPS = [
    "run_show_bible",
    "run_character_design",
    "generate_anchor_image_for_character",
    "generate_view_pack_images_for_character",
    "run_key_location",
    "generate_anchor_image_for_key_location",
    "generate_view_pack_images_for_key_location",
    "run_beat_breakdown",
    "run_shot_intent_mapping",
    "run_storyboard_prompt",
    "run_AI_prompt",
    "create_individual_prompt_files",
    "generate_images_nano_banana",
    "generate_animations",
]

db["workflowTemplateVersions"].insert_one({
    "_id": template_version_id,
    "workflowTemplateId": template_id,
    "version": 1,
    "templateKey": "micro_drama_pipeline",
    "steps": [{"key": k, "order": i + 1} for i, k in enumerate(PIPELINE_STEPS)],
    "createdAt": now,
    "updatedAt": now,
})
print(f"[SEED] Template: {template_version_id}  ({len(PIPELINE_STEPS)} steps)")


# ══════════════════════════════════════════════════════════════
#  4. WORKFLOW EXECUTION  (matches workflowdb_v13 fresh shape)
# ══════════════════════════════════════════════════════════════

execution_id = ObjectId()
order_id = f"{str(user_id)}_{int(now.timestamp())}"

SCREENPLAY = (
    "Part 1\n\n"
    "Ek badi se gadi rajmahal ke bahar aake rukti hai...sabhi naukar aapas me khusar pusar kar rahe hain….\n"
    "\t\t\t\tNAUKARANI\n"
    "Kya sach me rajkumari is gareeb driver se shaadi karengi…\n\n"
    "Sab muh bana rahe hain…\n"
    "\t\t\t\tNAUKAR\n"
    "Kya kismat hai uski..seedha road se mahal…\n"
    "Sab use dekh kar muh bana rahe hain ... .Tabhi car se ek nice dress me gayatri utarti hai.. "
    "Uske peeche Sia aur Pyarelaal bhi utarte hain....."
)

db["workflowExecutions"].insert_one({
    "_id": execution_id,
    "userId": str(user_id),
    "templateKey": "micro_drama_pipeline",
    "templateVersion": 1,
    "templateVersionId": template_version_id,
    "title": order_id,
    "status": "running",
    "currentStepKey": None,
    "steps": [
        {"stepKey": k, "status": "not_started", "updatedAt": now}
        for k in PIPELINE_STEPS
    ],
    "seqCounters": {"messageSeq": 0},
    "meta": {
        "orderId": order_id,
        "screenplay": SCREENPLAY,
        "orgId": str(org_id),
        "projectId": str(project_id),
        "episodeId": str(episode_id),
        "partId": str(part_id),
        "action": None,
        "createdAt": now.isoformat(),
    },
    "createdAt": now,
    "updatedAt": now,
})


# ══════════════════════════════════════════════════════════════
#  5. PART (linked to execution)
# ══════════════════════════════════════════════════════════════

db["parts"].insert_one({
    "_id": part_id,
    "projectId": str(project_id),
    "episodeId": str(episode_id),
    "partNumber": 1,
    "title": "Part 1 – Morning Market",
    "scriptText": """INT. RAJMAHAL – DAY

PYARELAAL (30s, lanky auto driver) polishes his beloved auto-rickshaw.

PYARELAAL
  Today is the day. Either I find a bride,
  or this auto finds a new driver.

EXT. MARKET – DAY

SIA (25, sharp-eyed teacher) walks through the crowded bazaar.
Her dupatta catches on Pyarelaal's auto mirror.

SIA
  Excuse me! Can you watch where you park this thing?

PYARELAAL
  Madam, this is not just a thing.
  This is a chariot of dreams.

SIA rolls her eyes but can't suppress a smile.""",
    "createdBy": str(user_id),
    "buildProgress": {
        "executionId": str(execution_id),
        "templateVersionId": str(template_version_id),
        "status": "running",
    },
    "createdAt": now,
    "updatedAt": now,
})
print(f"[SEED] Part: {part_id}  Execution: {execution_id}")


# ══════════════════════════════════════════════════════════════
#  6. STEP VERSIONS — realistic output for each pipeline step
# ══════════════════════════════════════════════════════════════

STEP_DATA = {
    # ── Text-only steps (blobs with JSON data) ──
    "run_show_bible": {
        "input": {"screenplay": "INT. RAJMAHAL – DAY\nPYARELAAL polishes his auto..."},
        "output": {
            "blobs": [{"kind": "json_blob", "data": {
                "Project": "The Driver's Swayamvar",
                "Image_style": "Colorful Indian miniature painting meets modern illustration",
                "Genre": "Romantic Comedy",
                "Themes": ["Finding love", "Self-discovery", "Small-town aspirations"],
                "Setting": "A bustling North Indian small town — markets, temples, narrow lanes",
                "Directorial_Treatment": "Warm, saturated palette with comedic timing. Close-ups for emotional beats.",
            }}],
            "artifactRefs": {},
            "s3_uris": [],
            "counts": {"blobs": 1, "files": 0, "artifacts": 0},
        },
    },
    "run_beat_breakdown": {
        "input": {"screenplay": "INT. RAJMAHAL – DAY\nPYARELAAL polishes his auto..."},
        "output": {
            "blobs": [{"kind": "json_blob", "data": [
                {"Beat_Number": 1, "Title": "The Polish", "Scene_Ref": "INT. RAJMAHAL – DAY",
                 "Screenplay_lines": ["PYARELAAL polishes his beloved auto-rickshaw."],
                 "Time_Range": "00:00–00:15", "Description": "Pyarelaal prepares for his big day",
                 "Emotion": "Hopeful anticipation"},
                {"Beat_Number": 2, "Title": "The Encounter", "Scene_Ref": "EXT. MARKET – DAY",
                 "Screenplay_lines": ["SIA walks through the crowded bazaar.", "Her dupatta catches on Pyarelaal's auto mirror."],
                 "Time_Range": "00:15–00:45", "Description": "A chance meeting between Sia and Pyarelaal",
                 "Emotion": "Surprise and spark"},
                {"Beat_Number": 3, "Title": "The Banter", "Scene_Ref": "EXT. MARKET – DAY",
                 "Screenplay_lines": ["Excuse me! Can you watch where you park this thing?", "This is a chariot of dreams."],
                 "Time_Range": "00:45–01:15", "Description": "Witty exchange between the two",
                 "Emotion": "Playful tension"},
            ]}],
            "artifactRefs": {},
            "s3_uris": [],
            "counts": {"blobs": 1, "files": 0, "artifacts": 0},
        },
    },
    "run_shot_breakdown": {
        "input": {},
        "output": {
            "blobs": [{"kind": "json_blob", "data": [
                {"shot": "Shot_1", "intent_title": "The Auto", "intent": "Establish Pyarelaal and his auto",
                 "emotion": "Pride", "narrative_function": "Character intro", "estimated_duration": "5s"},
                {"shot": "Shot_2", "intent_title": "Market Walk", "intent": "Show Sia in her element",
                 "emotion": "Confidence", "narrative_function": "Character intro", "estimated_duration": "5s"},
                {"shot": "Shot_3", "intent_title": "The Snag", "intent": "Dupatta catches on mirror",
                 "emotion": "Surprise", "narrative_function": "Inciting incident", "estimated_duration": "3s"},
            ]}],
            "artifactRefs": {},
            "s3_uris": [],
            "counts": {"blobs": 1, "files": 0, "artifacts": 0},
        },
    },
    "run_storyboard_descriptions": {
        "input": {},
        "output": {
            "blobs": [{"kind": "json_blob", "data": [
                {"metadata": {"panel_number": 1, "beat_number": 1, "shot_summary": "Pyarelaal polishes auto"},
                 "cinematography": {"shot_size_angle": "Medium close-up", "lens_intent": "35mm warm", "camera_movement": "Static"},
                 "composition": {"subject_composition": "Pyarelaal center frame", "action": "Polishing with cloth"},
                 "setting": {"key_location": "Rajmahal Interior", "scenography": "Warm morning light through arches", "time_context": "Morning"},
                 "character_focal_position": "Center", "characters": [{"character_name": "Pyarelaal", "character_visual_identity": "30s, lanky, mustache, white kurta"}],
                 "story_context": {"visual_style_guide": "Indian miniature meets modern", "project_context": "Romantic comedy", "era_culture_context": "Contemporary North India", "emotional_thematic_intent": "Hopeful anticipation"},
                 "audio": {"dialogue": "Today is the day.", "audio_cue_intent": "Light tabla rhythm"}},
            ]}],
            "artifactRefs": {},
            "s3_uris": [],
            "counts": {"blobs": 1, "files": 0, "artifacts": 0},
        },
    },

    # ── Character steps (description + images) ──
    "extract_characters": {
        "input": {},
        "output": {
            "blobs": [{"kind": "json_blob", "data": {
                "Pyarelaal": {
                    "Name/Identifier": "Pyarelaal",
                    "Cultural Context": "North Indian small-town auto driver",
                    "Visual Design": "Colorful, expressive, Indian miniature style",
                    "Age & Gender": "30s, Male",
                    "Physical Description": "Lanky build, prominent mustache, expressive eyes",
                    "Attire": "White kurta-pajama, sometimes with a colorful vest",
                },
                "Sia": {
                    "Name/Identifier": "Sia",
                    "Cultural Context": "Modern educated Indian woman, schoolteacher",
                    "Visual Design": "Elegant yet practical, subtle traditional elements",
                    "Age & Gender": "25, Female",
                    "Physical Description": "Sharp features, intelligent eyes, medium build",
                    "Attire": "Salwar kameez with distinctive dupatta, occasionally saree",
                },
            }}],
            "artifactRefs": {},
            "s3_uris": [],
            "counts": {"blobs": 1, "files": 0, "artifacts": 0},
        },
    },
    "generate_anchor_characters": {
        "input": {},
        "output": {
            "blobs": [],
            "artifactRefs": {
                "Pyarelaal": [
                    "https://placehold.co/512x768/e8d5b7/333333?text=Pyarelaal+Anchor",
                ],
                "Sia": [
                    "https://placehold.co/512x768/d5e8b7/333333?text=Sia+Anchor",
                ],
            },
            "s3_uris": [],
            "counts": {"blobs": 0, "files": 0, "artifacts": 2},
        },
    },
    "generate_view_pack_characters": {
        "input": {},
        "output": {
            "blobs": [],
            "artifactRefs": {
                "Pyarelaal": [
                    "https://placehold.co/512x768/e8d5b7/333333?text=Pyarelaal+VP1",
                    "https://placehold.co/512x768/e8d5b7/333333?text=Pyarelaal+VP2",
                    "https://placehold.co/512x768/e8d5b7/333333?text=Pyarelaal+VP3",
                ],
                "Sia": [
                    "https://placehold.co/512x768/d5e8b7/333333?text=Sia+VP1",
                    "https://placehold.co/512x768/d5e8b7/333333?text=Sia+VP2",
                    "https://placehold.co/512x768/d5e8b7/333333?text=Sia+VP3",
                ],
            },
            "s3_uris": [],
            "counts": {"blobs": 0, "files": 0, "artifacts": 6},
        },
    },

    # ── Location steps (description + images) ──
    "extract_locations": {
        "input": {},
        "output": {
            "blobs": [{"kind": "json_blob", "data": {
                "Rajmahal_Interior": {
                    "location_id": "loc_01",
                    "name": "Rajmahal Interior",
                    "type": "Interior",
                    "narrative_role": "Pyarelaal's home and auto-garage",
                    "visual_profile": {
                        "environment": "Warm, cluttered workshop with auto parts",
                        "cultural_or_era_style": "Traditional Indian haveli interior",
                        "architecture_or_space": "Arched doorways, faded murals, hanging calendar",
                        "lighting_time_of_day": "Morning — golden sunlight through latticed windows",
                        "key_objects_or_features": ["Auto-rickshaw", "Tool wall", "Radio", "Tea cups"],
                    },
                },
                "Market": {
                    "location_id": "loc_02",
                    "name": "Market",
                    "type": "Exterior",
                    "narrative_role": "Where Pyarelaal and Sia first meet",
                    "visual_profile": {
                        "environment": "Crowded, vibrant Indian bazaar",
                        "cultural_or_era_style": "Contemporary small-town India",
                        "architecture_or_space": "Narrow lanes, colorful shop fronts, canopies",
                        "lighting_time_of_day": "Late morning — dappled light through awnings",
                        "key_objects_or_features": ["Fruit stalls", "Fabric shop", "Cycle rickshaws", "Chai stall"],
                    },
                },
            }}],
            "artifactRefs": {},
            "s3_uris": [],
            "counts": {"blobs": 1, "files": 0, "artifacts": 0},
        },
    },
    "generate_anchor_locations": {
        "input": {},
        "output": {
            "blobs": [],
            "artifactRefs": {
                "Rajmahal_Interior": [
                    "https://placehold.co/768x512/b7d5e8/333333?text=Rajmahal+Anchor",
                ],
                "Market": [
                    "https://placehold.co/768x512/e8b7b7/333333?text=Market+Anchor",
                ],
            },
            "s3_uris": [],
            "counts": {"blobs": 0, "files": 0, "artifacts": 2},
        },
    },
    "generate_view_pack_locations": {
        "input": {},
        "output": {
            "blobs": [],
            "artifactRefs": {
                "Rajmahal_Interior": [
                    "https://placehold.co/768x512/b7d5e8/333333?text=Rajmahal+VP1",
                    "https://placehold.co/768x512/b7d5e8/333333?text=Rajmahal+VP2",
                    "https://placehold.co/768x512/b7d5e8/333333?text=Rajmahal+VP3",
                ],
                "Market": [
                    "https://placehold.co/768x512/e8b7b7/333333?text=Market+VP1",
                    "https://placehold.co/768x512/e8b7b7/333333?text=Market+VP2",
                    "https://placehold.co/768x512/e8b7b7/333333?text=Market+VP3",
                ],
            },
            "s3_uris": [],
            "counts": {"blobs": 0, "files": 0, "artifacts": 6},
        },
    },

    # ── Image generation steps ──
    "generate_storyboard_panels": {
        "input": {},
        "output": {
            "blobs": [],
            "artifactRefs": {},
            "s3_uris": [
                "https://placehold.co/768x1024/ffeedd/333333?text=Panel+1",
                "https://placehold.co/768x1024/ffeedd/333333?text=Panel+2",
                "https://placehold.co/768x1024/ffeedd/333333?text=Panel+3",
            ],
            "counts": {"blobs": 0, "files": 3, "artifacts": 0},
        },
    },
    "generate_images_hd": {
        "input": {},
        "output": {
            "blobs": [],
            "artifactRefs": {},
            "s3_uris": [
                "https://placehold.co/1024x1024/ddeeff/333333?text=HD+Image+1",
                "https://placehold.co/1024x1024/ddeeff/333333?text=HD+Image+2",
            ],
            "counts": {"blobs": 0, "files": 2, "artifacts": 0},
        },
    },
    "generate_images_nano_banana": {
        "input": {},
        "output": {
            "blobs": [],
            "artifactRefs": {},
            "s3_uris": [
                "https://placehold.co/512x512/eeddff/333333?text=Nano+1",
                "https://placehold.co/512x512/eeddff/333333?text=Nano+2",
                "https://placehold.co/512x512/eeddff/333333?text=Nano+3",
            ],
            "counts": {"blobs": 0, "files": 3, "artifacts": 0},
        },
    },
}

# ── Map legacy seeded payloads to current step keys ──
STEP_DATA.setdefault("run_character_design", STEP_DATA.get("extract_characters", {}))
STEP_DATA.setdefault("generate_anchor_image_for_character", STEP_DATA.get("generate_anchor_characters", {}))
STEP_DATA.setdefault("generate_view_pack_images_for_character", STEP_DATA.get("generate_view_pack_characters", {}))
STEP_DATA.setdefault("run_key_location", STEP_DATA.get("extract_locations", {}))
STEP_DATA.setdefault("generate_anchor_image_for_key_location", STEP_DATA.get("generate_anchor_locations", {}))
STEP_DATA.setdefault("generate_view_pack_images_for_key_location", STEP_DATA.get("generate_view_pack_locations", {}))
STEP_DATA.setdefault("run_shot_intent_mapping", STEP_DATA.get("run_shot_breakdown", {}))
STEP_DATA.setdefault("run_storyboard_prompt", STEP_DATA.get("run_storyboard_descriptions", {}))
STEP_DATA.setdefault("run_AI_prompt", {
    "input": {},
    "output": {
        "blobs": [{"kind": "json_blob", "data": {"status": "completed", "prompts_generated": 3}}],
        "artifactRefs": {},
        "s3_uris": [],
        "counts": {"blobs": 1, "files": 0, "artifacts": 0},
    },
})
STEP_DATA.setdefault("create_individual_prompt_files", {
    "input": {},
    "output": {
        "blobs": [{"kind": "json_blob", "data": {"status": "completed", "files_created": 3}}],
        "artifactRefs": {},
        "s3_uris": [],
        "counts": {"blobs": 1, "files": 0, "artifacts": 0},
    },
})
STEP_DATA.setdefault("generate_animations", {
    "input": {},
    "output": {
        "blobs": [],
        "artifactRefs": {},
        "s3_uris": [
            "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
            "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
        ],
        "counts": {"blobs": 0, "files": 2, "artifacts": 0},
    },
})


def _media_rows(urls: list[str], prefix: str) -> list[dict]:
    out: list[dict] = []
    for i, u in enumerate(urls, start=1):
        out.append({
            "display_name": f"{prefix} {i}",
            "file_name": u.split("/")[-1],
            "s3_uri": u,
        })
    return out


def _seed_entity_collections() -> tuple[int, int]:
    """Seed characters and locations in first-class collections with real data."""
    execution_key = str(execution_id)
    org_key = str(org_id)
    project_key = str(project_id)
    episode_key = str(episode_id)
    part_key = str(part_id)

    # Character source data (real URLs)
    character_descs = {
        "Pyarelaal": {
            "character_id": "char_01",
            "name_identifier": "Pyarelaal",
            "display_name": "Pyarelaal",
            "character_name": "Pyarelaal",
            "cultural_context": "North Indian small-town auto driver, class of '95",
            "visual_design_style": "Colorful, expressive, Indian miniature meets folk art",
            "age_gender": "Early 30s, Male",
            "physical_description": "Lanky build, prominent handlebar mustache, expressive brown eyes.",
            "attire": "Crisp white kurta-pajama with embroidered vest and Kolhapuri chappals.",
        },
        "Sia": {
            "character_id": "char_02",
            "name_identifier": "Sia",
            "display_name": "Sia",
            "character_name": "Sia",
            "cultural_context": "Modern educated Indian woman, schoolteacher, independent",
            "visual_design_style": "Elegant yet practical with subtle traditional elements",
            "age_gender": "Mid-20s, Female",
            "physical_description": "Sharp, intelligent features; confident posture.",
            "attire": "Cotton salwar kameez with hand-block-printed dupatta.",
        },
        "Mamaji": {
            "character_id": "char_03",
            "name_identifier": "Mamaji",
            "display_name": "Mamaji",
            "character_name": "Mamaji",
            "cultural_context": "Pyarelaal's maternal uncle, comedic matchmaker",
            "visual_design_style": "Slightly caricatured, warm comedic presence",
            "age_gender": "Late 50s, Male",
            "physical_description": "Rotund, bald with tufts above ears, theatrical gestures.",
            "attire": "Floral bush shirt and high-waist trousers with thick-framed glasses.",
        },
    }

    character_anchors = {
        "Pyarelaal": [f"{_S3_BASE}/characters/C1/character_anchor_full_body.png"],
        "Sia": [f"{_S3_BASE}/characters/C2/character_anchor_full_body.png"],
        "Mamaji": [f"{_S3_BASE}/characters/C1/character_anchor_closeup.png"],
    }
    character_views = {
        "Pyarelaal": [
            f"{_S3_BASE}/characters/C1/Front_Closeup.png",
            f"{_S3_BASE}/characters/C1/Front_Extreme_Closeup.png",
            f"{_S3_BASE}/characters/C1/Back_View_Closeup.png",
        ],
        "Sia": [
            f"{_S3_BASE}/characters/C2/Front_Closeup.png",
            f"{_S3_BASE}/characters/C2/Front_Extreme_Closeup.png",
            f"{_S3_BASE}/characters/C2/Back_View_Closeup.png",
        ],
        "Mamaji": [
            f"{_S3_BASE}/characters/C1/Side_View_Closeup.png",
            f"{_S3_BASE}/characters/C2/Side_View_Closeup.png",
            f"{_S3_BASE}/characters/C1/Character_FreezePack_Collage.png",
        ],
    }

    db["characters"].delete_many({
        "$or": [{"execution_id": execution_key}, {"executionId": execution_key}]
    })

    character_docs: list[dict] = []
    for name, desc in character_descs.items():
        view_urls = character_views.get(name, [])
        collage = next((u for u in view_urls if "collage" in u.lower()), None)
        character_docs.append({
            "_id": ObjectId(),
            "org_id": org_key,
            "project_id": project_key,
            "episode_id": episode_key,
            "part_id": part_key,
            "execution_id": execution_key,
            "character_description": desc,
            "anchor_images": _media_rows(character_anchors.get(name, []), "Anchor"),
            "view_pack_images": _media_rows(view_urls, "View Pack"),
            "collage_image": {
                "display_name": "Collage",
                "file_name": collage.split("/")[-1],
                "s3_uri": collage,
            } if collage else None,
            "character_camera_library": None,
            "status": "succeeded",
            "is_approved": False,
            "version": 1,
            "created_at": now,
            "updated_at": now,
        })

    if character_docs:
        db["characters"].insert_many(character_docs)

    # Location source data (real URLs)
    location_descs = {
        "Rajmahal_Interior": {
            "location_id": "loc_01",
            "name": "Rajmahal Interior",
            "display_name": "Rajmahal Interior",
            "location_name": "Rajmahal Interior",
            "type": "Interior",
            "narrative_role": "Pyarelaal's home, sanctuary, and auto-garage",
            "visual_profile": {
                "environment": "Warm, cluttered workshop layered with personal history",
                "architecture_or_space": "Arched Mughal doorways and timber beams",
                "lighting_time_of_day": "Morning — golden sunlight through latticed jharokhas",
            },
        },
        "Market": {
            "location_id": "loc_02",
            "name": "Market",
            "display_name": "Market",
            "location_name": "Market",
            "type": "Exterior",
            "narrative_role": "Bustling arena where Pyarelaal and Sia first meet",
            "visual_profile": {
                "environment": "Crowded, vibrant, sensory-overloaded Indian bazaar",
                "architecture_or_space": "Narrow lanes, colorful shop fronts, patchwork canopies",
                "lighting_time_of_day": "Late morning — dappled amber light",
            },
        },
        "Town_Square": {
            "location_id": "loc_03",
            "name": "Town Square",
            "display_name": "Town Square",
            "location_name": "Town Square",
            "type": "Exterior",
            "narrative_role": "Community hub for gossip, announcements, and comic misunderstandings",
            "visual_profile": {
                "environment": "Open plaza with a clock tower and pipal tree",
                "architecture_or_space": "Brick paving, chai kiosks, hand-painted banners",
                "lighting_time_of_day": "Noon to golden hour",
            },
        },
    }

    location_anchors = {
        "Rajmahal_Interior": [f"{_S3_BASE}/locations/1/anchor_reference.png"],
        "Market": [f"{_S3_BASE}/locations/1/L3_Front_Right_Medium.png"],
        "Town_Square": [f"{_S3_BASE}/locations/1/L6_Front_Left_Close.png"],
    }
    location_views = {
        "Rajmahal_Interior": [
            f"{_S3_BASE}/locations/1/L0_Front_Center_Wide.png",
            f"{_S3_BASE}/locations/1/L1_Front_Center_Medium.png",
            f"{_S3_BASE}/locations/1/L2_Front_Left_Medium.png",
        ],
        "Market": [
            f"{_S3_BASE}/locations/1/L3_Front_Right_Medium.png",
            f"{_S3_BASE}/locations/1/L4_Front_Left_Wide.png",
            f"{_S3_BASE}/locations/1/L5_Front_Center_Close.png",
        ],
        "Town_Square": [
            f"{_S3_BASE}/locations/1/L6_Front_Left_Close.png",
            f"{_S3_BASE}/locations/1/L7_Front_Right_Close.png",
            f"{_S3_BASE}/locations/1/FreezePack_Collage.png",
        ],
    }

    db["locations"].delete_many({
        "$or": [{"execution_id": execution_key}, {"executionId": execution_key}]
    })

    location_docs: list[dict] = []
    for key, desc in location_descs.items():
        view_urls = location_views.get(key, [])
        collage = next((u for u in view_urls if "collage" in u.lower() or "freezepack" in u.lower()), None)
        location_docs.append({
            "_id": ObjectId(),
            "org_id": org_key,
            "project_id": project_key,
            "episode_id": episode_key,
            "part_id": part_key,
            "execution_id": execution_key,
            "location_description": desc,
            "anchor_images": _media_rows(location_anchors.get(key, []), "Anchor"),
            "view_pack_images": _media_rows(view_urls, "View Pack"),
            "collage_image": {
                "display_name": "Collage",
                "file_name": collage.split("/")[-1],
                "s3_uri": collage,
            } if collage else None,
            "location_camera_library": None,
            "status": "succeeded",
            "is_approved": False,
            "version": 1,
            "created_at": now,
            "updated_at": now,
        })

    if location_docs:
        db["locations"].insert_many(location_docs)

    return len(character_docs), len(location_docs)

# NOTE: No StepVersions are inserted — execution starts fresh with all steps
# "not_started", matching a real pipeline's initial shape. Run
# `python -m scripts.sim_step_complete` after each UI approval to advance the pipeline.
#
# Shots and clips are automatically seeded by sim_step_complete.py when
# the generate_images_nano_banana (shots) and generate_animations (clips)
# steps are processed after storyboard approval.

seeded_characters, seeded_locations = _seed_entity_collections()
print(f"[SEED] Characters collection rows: {seeded_characters}")
print(f"[SEED] Locations collection rows: {seeded_locations}")


# ════════════════════════════════════════════════════════════
#  DONE
# ════════════════════════════════════════════════════════════

print()
print("✅ Seed complete!")
print()
print(f"   User email:    test@test.com")
print(f"   Organization:  Demo Studio")
print(f"   Project:       The Driver's Swayamvar")
print(f"   Episode:       Episode 1 – The Proposal")
print(f"   Part:          Part 1 – Morning Market")
print(f"   Execution:     {execution_id}  (14 steps, all not_started — fresh pipeline)")
print(f"   Template:      micro_drama_pipeline v1  (order_id={order_id})")
print()
print(f"   Part URL:      /project/{project_id}/episode/{episode_id}/part/{part_id}")
print()
print("   Start backend:  uvicorn app.main:app --reload --port 8001")
print("   Start frontend: cd ../frontend && npm run dev")
print("   Demo login:     Click 'Demo Login' button on login page")
print()
