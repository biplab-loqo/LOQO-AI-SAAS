#!/usr/bin/env python3
"""
seed_part.py — One-shot seeder: seeds ALL pipeline data for the latest part.

Run this once whenever a new Part is created to immediately populate the entire
pipeline (show_bible → generate_animations) without having to click through the UI.

Features
--------
- Finds the latest Part in the DB (or pass --part-id <id> for a specific one)
- Creates a WorkflowExecution if one doesn't exist yet
- Wipes & re-inserts all StepVersions for that execution (idempotent)
- Wipes & re-inserts all Shots (10 shots, real S3 images)
- Wipes & re-inserts all Clips (10 clips, real S3 MP4 animations)
- Sets every execution.step to status=succeeded + has_data signals via StepVersion
- Sets execution.status = "completed"

Usage
-----
  cd backend
  python -m scripts.seed_part               # latest part
  python -m scripts.seed_part --part-id <ObjectId>   # specific part
"""

import sys
import argparse
from datetime import datetime, timezone
from bson import ObjectId
from pymongo import MongoClient

# ── Connection ─────────────────────────────────────────────────────────────
MONGO_URI = "mongodb+srv://deepakstarbio_db_user:dkQuuhaq9iLqBHCj@cluster0.rdg6wwa.mongodb.net/?appName=Cluster0"
DB_NAME   = "test"

client = MongoClient(MONGO_URI)
db     = client[DB_NAME]
now    = datetime.now(timezone.utc)

# ── Real S3 base (all URLs confirmed HTTP 200) ─────────────────────────────
_S3_BASE = "https://amzn-s3-bucket-lq-ai-3.s3.us-east-1.amazonaws.com/executions/69a964e453c01a6f14088ba7"

def _s3_img(n: int) -> str:
    """S3 PNG for shot n; cycles through the 5 available images."""
    return f"{_S3_BASE}/images/shot_{((n - 1) % 5) + 1}.png"

def _s3_anim(n: int) -> str:
    """S3 MP4 for clip n; cycles through the 5 available animations."""
    return f"{_S3_BASE}/animations/shot_{((n - 1) % 5) + 1}.mp4"

# ── Reference images ───────────────────────────────────────────────────────
CHAR_REF_IMAGES: dict[str, str] = {
    "Pyarelaal": f"{_S3_BASE}/characters/C1/character_anchor_full_body.png",
    "Sia":       f"{_S3_BASE}/characters/C2/character_anchor_full_body.png",
    "Mamaji":    f"{_S3_BASE}/characters/C1/character_anchor_closeup.png",
}

LOC_REF_IMAGES: dict[str, str] = {
    "Rajmahal_Interior": f"{_S3_BASE}/locations/1/L0_Front_Center_Wide.png",
    "Market":            f"{_S3_BASE}/locations/1/L3_Front_Right_Medium.png",
    "Town_Square":       f"{_S3_BASE}/locations/1/L6_Front_Left_Close.png",
}

# ── 10 shots cycling 5 real S3 images ─────────────────────────────────────
SHOT_DEFINITIONS: list[dict] = [
    {
        "shot_id": "shot_01", "seq": 1, "shot_no": 1, "beat_no": 1,
        "one_liner": "ECU Pyarelaal polishing the auto-rickshaw mirror in his workshop",
        "start_prompt": (
            "Extreme close-up of a gleaming auto-rickshaw mirror polished by hand, "
            "warm golden morning light through ornate jharokha lattice, Indian haveli interior, "
            "dust motes in the beam, shallow depth-of-field, nostalgic and hopeful mood"
        ),
        "anim_prompt": (
            "Slow rack-focus from the shiny mirror surface to Pyarelaal's proud reflected face, "
            "a subtle smile forms, gentle handheld drift"
        ),
        "image_url": _s3_img(1), "anim_url": _s3_anim(1),
        "chars": ["Pyarelaal"], "locs": ["Rajmahal_Interior"],
    },
    {
        "shot_id": "shot_02", "seq": 2, "shot_no": 2, "beat_no": 2,
        "one_liner": "Wide market establishing shot — Sia enters with purpose",
        "start_prompt": (
            "Wide establishing shot of a vibrant North Indian bazaar, narrow lanes, colourful fabric "
            "stalls, patchwork canopies, dappled amber late-morning light, Sia entering frame-left "
            "with confident stride, slight 24mm distortion for chaotic energy"
        ),
        "anim_prompt": (
            "Slow push-in following Sia as she navigates the crowd, camera tracks at chest height, "
            "crowd parts slightly around her"
        ),
        "image_url": _s3_img(2), "anim_url": _s3_anim(2),
        "chars": ["Sia"], "locs": ["Market"],
    },
    {
        "shot_id": "shot_03", "seq": 3, "shot_no": 3, "beat_no": 2,
        "one_liner": "Dupatta snags on auto mirror — inciting incident",
        "start_prompt": (
            "Medium close-up of a bright printed dupatta caught on a chrome auto-rickshaw mirror, "
            "both characters' hands reaching in frame, market background, warm light, slight dutch tilt"
        ),
        "anim_prompt": (
            "Quick push-in on the snag with a comic string twang, then snap-zoom out to show "
            "both frozen — Sia annoyed, Pyarelaal startled then delighted"
        ),
        "image_url": _s3_img(3), "anim_url": _s3_anim(3),
        "chars": ["Pyarelaal", "Sia"], "locs": ["Market"],
    },
    {
        "shot_id": "shot_04", "seq": 4, "shot_no": 4, "beat_no": 3,
        "one_liner": "CU Pyarelaal — 'chariot of dreams' dialogue with animated hands",
        "start_prompt": (
            "Close-up of Pyarelaal's expressive face and animated hands mid-monologue, "
            "market stall colours blurred behind, warm afternoon light, shot-reverse-shot setup"
        ),
        "anim_prompt": (
            "Pyarelaal gestures theatrically with both hands, eyebrows raised, mustache twitching, "
            "camera holds steady with slight natural breathing"
        ),
        "image_url": _s3_img(4), "anim_url": _s3_anim(4),
        "chars": ["Pyarelaal"], "locs": ["Market"],
    },
    {
        "shot_id": "shot_05", "seq": 5, "shot_no": 5, "beat_no": 3,
        "one_liner": "CU Sia — skeptical arched-eyebrow reaction shot",
        "start_prompt": (
            "Close-up of Sia's sharp, intelligent face with one eyebrow arched, arms beginning to "
            "cross, market energy behind her, dappled light, reluctant amusement forming"
        ),
        "anim_prompt": (
            "Sia's skepticism cracks into a flicker of amusement, she catches herself and schools "
            "her face back to neutral disapproval"
        ),
        "image_url": _s3_img(5), "anim_url": _s3_anim(5),
        "chars": ["Sia"], "locs": ["Market"],
    },
    {
        "shot_id": "shot_06", "seq": 6, "shot_no": 6, "beat_no": 4,
        "one_liner": "OTS Pyarelaal watches Sia depart — a plan forming",
        "start_prompt": (
            "Over-the-shoulder shot from behind Pyarelaal watching Sia walk away into the crowd, "
            "golden-hour market light, wide lane receding into blur"
        ),
        "anim_prompt": (
            "Camera slowly pulls back from Pyarelaal's shoulder as he turns with a growing grin, "
            "crowd swirls around him as quiet determination settles on his face"
        ),
        "image_url": _s3_img(1), "anim_url": _s3_anim(1),
        "chars": ["Pyarelaal", "Sia"], "locs": ["Market"],
    },
    {
        "shot_id": "shot_07", "seq": 7, "shot_no": 7, "beat_no": 4,
        "one_liner": "Mamaji spots Pyarelaal's moony expression — scheme hatches",
        "start_prompt": (
            "Medium shot of Mamaji peeking around a fruit stall, wide eyes behind thick glasses, "
            "matrimonial newspaper visible in shirt pocket, market chaos behind him, warm amber light"
        ),
        "anim_prompt": (
            "Mamaji strokes his chin with conspiratorial glee, pulls out the newspaper and "
            "circles an ad, eyebrows waggling, comedy underscore"
        ),
        "image_url": _s3_img(2), "anim_url": _s3_anim(2),
        "chars": ["Mamaji"], "locs": ["Market"],
    },
    {
        "shot_id": "shot_08", "seq": 8, "shot_no": 8, "beat_no": 5,
        "one_liner": "Town Square — community chatter about the mysterious new teacher",
        "start_prompt": (
            "Wide shot of Town Square under the pipal tree, four townsfolk mid-gossip on benches, "
            "the clock tower slightly out of focus behind them, golden-hour light, warm community feel"
        ),
        "anim_prompt": (
            "Camera slowly pans left to right across the group as dialogue erupts, pigeons scatter "
            "from the clock tower, energy builds with each new rumour"
        ),
        "image_url": _s3_img(3), "anim_url": _s3_anim(3),
        "chars": ["Pyarelaal", "Mamaji"], "locs": ["Town_Square"],
    },
    {
        "shot_id": "shot_09", "seq": 9, "shot_no": 9, "beat_no": 5,
        "one_liner": "Sia at school blackboard — unaware she is already the talk of the town",
        "start_prompt": (
            "Medium shot of Sia at a chalk-dusted classroom blackboard, bright morning light "
            "through tall windows, students heads visible in foreground, focused and in command"
        ),
        "anim_prompt": (
            "Sia writes on the board with decisive strokes, turns to face class, "
            "warm smile breaking through her professional composure"
        ),
        "image_url": _s3_img(4), "anim_url": _s3_anim(4),
        "chars": ["Sia"], "locs": ["Town_Square"],
    },
    {
        "shot_id": "shot_10", "seq": 10, "shot_no": 10, "beat_no": 6,
        "one_liner": "Pyarelaal decorates the auto-rickshaw with jasmine — the grand plan begins",
        "start_prompt": (
            "Wide shot of Pyarelaal's Rajmahal workshop at dusk, the auto-rickshaw festooned "
            "with fresh jasmine garlands and marigolds, fairy lights strung, determined hero framing"
        ),
        "anim_prompt": (
            "Time-lapse-style flicker through the decoration process, ending on Pyarelaal "
            "stepping back to admire his work, chest puffed with pride"
        ),
        "image_url": _s3_img(5), "anim_url": _s3_anim(5),
        "chars": ["Pyarelaal"], "locs": ["Rajmahal_Interior"],
    },
]

# ── Full DEMO_OUTPUTS — every step in the pipeline ─────────────────────────
DEMO_OUTPUTS: dict[str, dict] = {

    "run_show_bible": {
        "blobs": [{"kind": "json_blob", "data": {
            "Project": "The Driver's Swayamvar",
            "Image_style": "Colorful Indian miniature painting meets modern illustration",
            "Genre": "Romantic Comedy",
            "Themes": ["Finding love", "Self-discovery", "Small-town aspirations"],
            "Setting": "A bustling North Indian small town — markets, temples, narrow lanes",
            "Tone": "Warm, humorous, heartfelt",
            "Target_Audience": "Young adults, OTT platform viewers",
            "Directorial_Treatment": (
                "Warm, saturated palette with comedic timing. "
                "Close-ups for emotional beats. Wide shots for establishing the town."
            ),
            "Color_Palette": "Saffron, turmeric gold, deep teal, dusty rose",
            "Visual_Motifs": [
                "Auto-rickshaw as chariot of dreams",
                "The town's clock tower as a recurring landmark",
                "Chai as a social connector",
            ],
        }}],
        "artifactRefs": {}, "s3_uris": [],
        "counts": {"blobs": 1, "files": 0, "artifacts": 0},
    },

    "run_beat_breakdown": {
        "blobs": [{"kind": "json_blob", "data": [
            {
                "Beat_Number": 1, "Title": "The Polish",
                "Scene_Ref": "INT. RAJMAHAL – DAY",
                "Screenplay_lines": ["PYARELAAL polishes his beloved auto-rickshaw."],
                "Time_Range": "00:00–00:15",
                "Description": "Pyarelaal meticulously prepares for what he calls his destiny day.",
                "Emotion": "Hopeful anticipation",
                "Visual_Notes": "ECU on spinning wheel, reflection of Pyarelaal in the chrome",
            },
            {
                "Beat_Number": 2, "Title": "The Encounter",
                "Scene_Ref": "EXT. MARKET – DAY",
                "Screenplay_lines": [
                    "SIA walks through the crowded bazaar.",
                    "Her dupatta catches on Pyarelaal's auto mirror.",
                ],
                "Time_Range": "00:15–00:45",
                "Description": "A chance collision sparks the central conflict.",
                "Emotion": "Surprise and spark",
                "Visual_Notes": "Slow motion on the dupatta snagging; cut to both faces",
            },
            {
                "Beat_Number": 3, "Title": "The Banter",
                "Scene_Ref": "EXT. MARKET – DAY",
                "Screenplay_lines": [
                    "Excuse me! Can you watch where you park this thing?",
                    "This is not just a thing. This is a chariot of dreams.",
                ],
                "Time_Range": "00:45–01:15",
                "Description": "Witty verbal sparring establishes both characters.",
                "Emotion": "Playful tension",
                "Visual_Notes": "Shot-reverse-shot, tight on expressions",
            },
            {
                "Beat_Number": 4, "Title": "The Departure",
                "Scene_Ref": "EXT. MARKET – DAY",
                "Screenplay_lines": ["SIA rolls her eyes but can't suppress a smile."],
                "Time_Range": "01:15–01:30",
                "Description": "Sia leaves; Pyarelaal watches, a plan forming.",
                "Emotion": "Curiosity, determination",
                "Visual_Notes": "OTS shot of Pyarelaal watching Sia disappear into the crowd",
            },
            {
                "Beat_Number": 5, "Title": "The Rumour Mill",
                "Scene_Ref": "EXT. TOWN SQUARE – DAY",
                "Screenplay_lines": [
                    "Word spreads about the new schoolteacher.",
                    "MAMAJI overheard saying 'perfect match!'",
                ],
                "Time_Range": "01:30–02:00",
                "Description": "Town Square gossip sets the comic machinery in motion.",
                "Emotion": "Comic escalation",
                "Visual_Notes": "Wide shot of gossiping townsfolk; Mamaji at center",
            },
            {
                "Beat_Number": 6, "Title": "The Grand Plan",
                "Scene_Ref": "INT. RAJMAHAL – EVENING",
                "Screenplay_lines": ["PYARELAAL strings jasmine garlands on the auto."],
                "Time_Range": "02:00–02:15",
                "Description": "Pyarelaal sets his plan in motion — the swayamvar begins.",
                "Emotion": "Determined optimism",
                "Visual_Notes": "Warm dusk light, silhouette of hero and chariot",
            },
        ]}],
        "artifactRefs": {}, "s3_uris": [],
        "counts": {"blobs": 1, "files": 0, "artifacts": 0},
    },

    "run_shot_intent_mapping": {
        "blobs": [{"kind": "json_blob", "data": {
            "status": "completed", "shots_mapped": 10,
            "intent_categories": ["character_intro", "inciting_incident", "dialogue", "reaction", "comedy"],
        }}],
        "artifactRefs": {}, "s3_uris": [],
        "counts": {"blobs": 1, "files": 0, "artifacts": 0},
    },

    "run_key_location": {
        "blobs": [{"kind": "json_blob", "data": {
            "Key_Locations": {
                "Rajmahal_Interior": {
                    "location_id": "loc_01", "name": "Rajmahal Interior", "type": "Interior",
                    "narrative_role": "Pyarelaal's home, sanctuary, and auto-garage — the heart of the story",
                    "visual_profile": {
                        "environment": "Warm, cluttered workshop layered with personal history",
                        "cultural_or_era_style": "Traditional Indian haveli interior, lived-in",
                        "architecture_or_space": "Arched Mughal doorways, faded floral murals, timber beams",
                        "lighting_time_of_day": "Morning — golden sunlight through ornate latticed jharokhas",
                        "key_objects_or_features": [
                            "Gleaming auto-rickshaw center stage",
                            "Tool wall with vintage wrenches and garlands",
                            "Transistor radio on a chai-stained shelf",
                            "Framed photo of parents",
                        ],
                        "mood": "Nostalgia mixed with optimism",
                    },
                },
                "Market": {
                    "location_id": "loc_02", "name": "Market", "type": "Exterior",
                    "narrative_role": "The bustling arena where Pyarelaal and Sia first meet — chaos as catalyst",
                    "visual_profile": {
                        "environment": "Crowded, vibrant, sensory-overloaded Indian bazaar",
                        "cultural_or_era_style": "Contemporary small-town India, timeless energy",
                        "architecture_or_space": "Narrow lanes, colorful shop fronts, patchwork canopies",
                        "lighting_time_of_day": "Late morning — dappled amber light filtering through awnings",
                        "key_objects_or_features": [
                            "Overflowing fruit and vegetable stalls",
                            "Bolts of bright fabric on display",
                            "Cycle rickshaws weaving through the crowd",
                            "Corner chai stall with steaming glasses",
                        ],
                        "mood": "Energetic, joyful, slightly chaotic",
                    },
                },
                "Town_Square": {
                    "location_id": "loc_03", "name": "Town Square", "type": "Exterior",
                    "narrative_role": "Community hub — gossip, announcements, comic misunderstandings",
                    "visual_profile": {
                        "environment": "Open plaza with a crumbling clock tower and a pipal tree",
                        "cultural_or_era_style": "Colonial-era remnant reclaimed by local culture",
                        "architecture_or_space": "Brick paving, chai kiosks, hand-painted banners",
                        "lighting_time_of_day": "Various — from harsh noon to warm golden hour",
                        "key_objects_or_features": [
                            "The old clock tower (always 5 minutes slow)",
                            "Benches under the pipal tree — the town's unofficial parliament",
                            "Notice board plastered with posters",
                        ],
                        "mood": "Communal, lively, slightly absurd",
                    },
                },
            }
        }}],
        "artifactRefs": {}, "s3_uris": [],
        "counts": {"blobs": 1, "files": 0, "artifacts": 0},
    },

    "generate_anchor_image_for_key_location": {
        "blobs": [],
        "artifactRefs": {
            "Rajmahal_Interior": [f"{_S3_BASE}/locations/1/anchor_reference.png"],
            "Market":            [f"{_S3_BASE}/locations/1/L3_Front_Right_Medium.png"],
            "Town_Square":       [f"{_S3_BASE}/locations/1/L6_Front_Left_Close.png"],
        },
        "s3_uris": [], "counts": {"blobs": 0, "files": 0, "artifacts": 3},
    },

    "generate_view_pack_images_for_key_location": {
        "blobs": [],
        "artifactRefs": {
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
        },
        "s3_uris": [], "counts": {"blobs": 0, "files": 0, "artifacts": 9},
    },

    "run_character_design": {
        "blobs": [{"kind": "json_blob", "data": {
            "Characters": {
                "Pyarelaal": {
                    "Name_Identifier": "Pyarelaal",
                    "Cultural_Context": "North Indian small-town auto driver, class of '95",
                    "Visual_Design_Style": "Colorful, expressive, Indian miniature meets folk art",
                    "Age_Gender": "Early 30s, Male",
                    "Physical_Description": (
                        "Lanky build, prominent handlebar mustache, expressive brown eyes. "
                        "Slightly stooped from years of driving."
                    ),
                    "Attire": (
                        "Crisp white kurta-pajama, often with a bright embroidered Nehru vest. "
                        "Kolhapuri chappals. Red tilak on forehead on auspicious days."
                    ),
                    "Signature_Props": ["Flower garland on auto mirror", "Dog-eared self-help book"],
                    "Personality_Visual_Cues": "Hands always in motion when talking, bright smile",
                },
                "Sia": {
                    "Name_Identifier": "Sia",
                    "Cultural_Context": "Modern educated Indian woman, schoolteacher, independent",
                    "Visual_Design_Style": "Elegant yet practical, subtle traditional elements in modern silhouettes",
                    "Age_Gender": "Mid-20s, Female",
                    "Physical_Description": (
                        "Sharp, intelligent features, medium build, confident posture. "
                        "Always carries a canvas tote."
                    ),
                    "Attire": (
                        "Cotton salwar kameez with distinctive hand-block-printed dupatta. "
                        "Occasionally saree for school. Simple silver jhumkas."
                    ),
                    "Signature_Props": ["Stack of test papers", "Steel water bottle"],
                    "Personality_Visual_Cues": "Arms crossed when skeptical, eyebrow arched at absurdity",
                },
                "Mamaji": {
                    "Name_Identifier": "Mamaji",
                    "Cultural_Context": "Pyarelaal's maternal uncle, self-appointed matchmaker",
                    "Visual_Design_Style": "Slightly caricatured, warm comedic presence",
                    "Age_Gender": "Late 50s, Male",
                    "Physical_Description": "Rotund, bald with tufts above ears, theatrical in all things.",
                    "Attire": "Floral bush shirt tucked into high-waist trousers, thick-framed glasses.",
                    "Signature_Props": ["Matrimonial newspaper folded in pocket", "Ever-present thermos"],
                    "Personality_Visual_Cues": "Sweating perpetually, always whispering conspiracies",
                },
            }
        }}],
        "artifactRefs": {}, "s3_uris": [],
        "counts": {"blobs": 1, "files": 0, "artifacts": 0},
    },

    "generate_anchor_image_for_character": {
        "blobs": [],
        "artifactRefs": {
            "Pyarelaal": [f"{_S3_BASE}/characters/C1/character_anchor_full_body.png"],
            "Sia":        [f"{_S3_BASE}/characters/C2/character_anchor_full_body.png"],
            "Mamaji":     [f"{_S3_BASE}/characters/C1/character_anchor_closeup.png"],
        },
        "s3_uris": [], "counts": {"blobs": 0, "files": 0, "artifacts": 3},
    },

    "generate_view_pack_images_for_character": {
        "blobs": [],
        "artifactRefs": {
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
        },
        "s3_uris": [], "counts": {"blobs": 0, "files": 0, "artifacts": 9},
    },

    "run_storyboard_prompt": {
        "blobs": [{"kind": "json_blob", "data": [
            {
                "metadata": {"panel_number": 1, "beat_number": 1, "shot_key": "Shot_01",
                             "shot_summary": "ECU Pyarelaal polishing mirror"},
                "cinematography": {"shot_size_angle": "Extreme Close-Up", "lens_intent": "50mm macro",
                                   "camera_movement": "Static with gentle rack focus"},
                "composition": {"subject_composition": "Mirror fills frame, Pyarelaal's face reflected",
                                "action": "Slow circular polish with chamois cloth"},
                "setting": {"key_location": "Rajmahal Interior", "time_context": "Golden morning"},
                "characters": [{"character_name": "Pyarelaal", "expression": "Proud focus"}],
                "audio": {"dialogue": "", "audio_cue_intent": "Light tabla, birds outside"},
                "story_context": {"emotional_thematic_intent": "Establish pride and ritual"},
            },
            {
                "metadata": {"panel_number": 2, "beat_number": 2, "shot_key": "Shot_02",
                             "shot_summary": "Wide market — Sia enters"},
                "cinematography": {"shot_size_angle": "Wide establishing shot", "lens_intent": "24mm",
                                   "camera_movement": "Slow push in following Sia"},
                "composition": {"subject_composition": "Sia enters frame left, crowd parts slightly",
                                "action": "Sia walks with purpose through market"},
                "setting": {"key_location": "Market", "time_context": "Late morning"},
                "characters": [{"character_name": "Sia", "expression": "Focused determination"}],
                "audio": {"dialogue": "", "audio_cue_intent": "Market ambience, distant music"},
                "story_context": {"emotional_thematic_intent": "Introduce Sia in her element"},
            },
            {
                "metadata": {"panel_number": 3, "beat_number": 2, "shot_key": "Shot_03",
                             "shot_summary": "Dupatta snags on auto mirror"},
                "cinematography": {"shot_size_angle": "Medium close-up", "lens_intent": "35mm",
                                   "camera_movement": "Quick push + dutch tilt on snag"},
                "composition": {"subject_composition": "Dupatta in frame, both hands reaching",
                                "action": "Dupatta catches — both freeze"},
                "setting": {"key_location": "Market", "time_context": "Late morning"},
                "characters": [
                    {"character_name": "Pyarelaal", "expression": "Startled then delighted"},
                    {"character_name": "Sia", "expression": "Annoyed surprise"},
                ],
                "audio": {"dialogue": "Excuse me! Can you watch where you park this thing?",
                          "audio_cue_intent": "Comic sting — string twang"},
                "story_context": {"emotional_thematic_intent": "Inciting incident — connection through collision"},
            },
            {
                "metadata": {"panel_number": 4, "beat_number": 3, "shot_key": "Shot_04",
                             "shot_summary": "CU Pyarelaal monologue"},
                "cinematography": {"shot_size_angle": "Close-up", "lens_intent": "85mm portrait",
                                   "camera_movement": "Static"},
                "composition": {"subject_composition": "Pyarelaal's animated face and hands",
                                "action": "Gesturing dramatically"},
                "setting": {"key_location": "Market", "time_context": "Late morning"},
                "characters": [{"character_name": "Pyarelaal", "expression": "Theatrical pride"}],
                "audio": {"dialogue": "This is not just a thing. This is a chariot of dreams.",
                          "audio_cue_intent": "Swelling folk melody"},
                "story_context": {"emotional_thematic_intent": "Establish comic heroism"},
            },
            {
                "metadata": {"panel_number": 5, "beat_number": 3, "shot_key": "Shot_05",
                             "shot_summary": "CU Sia reaction"},
                "cinematography": {"shot_size_angle": "Close-up", "lens_intent": "85mm",
                                   "camera_movement": "Static"},
                "composition": {"subject_composition": "Sia's arched eyebrow reaction",
                                "action": "Arms beginning to cross"},
                "setting": {"key_location": "Market", "time_context": "Late morning"},
                "characters": [{"character_name": "Sia", "expression": "Skeptical amusement"}],
                "audio": {"dialogue": "", "audio_cue_intent": "Comic beat"},
                "story_context": {"emotional_thematic_intent": "Contrast characters — warm sparks forming"},
            },
        ]}],
        "artifactRefs": {}, "s3_uris": [],
        "counts": {"blobs": 1, "files": 0, "artifacts": 0},
    },

    "run_AI_prompt": {
        "blobs": [{"kind": "json_blob", "data": {
            "status": "completed", "prompts_generated": 10, "model": "gpt-4o",
        }}],
        "artifactRefs": {}, "s3_uris": [],
        "counts": {"blobs": 1, "files": 0, "artifacts": 0},
    },

    "create_individual_prompt_files": {
        "blobs": [{"kind": "json_blob", "data": {
            "status": "completed", "files_created": 10,
        }}],
        "artifactRefs": {}, "s3_uris": [],
        "counts": {"blobs": 1, "files": 0, "artifacts": 0},
    },

    "generate_images_nano_banana": {
        "blobs": [{"kind": "json_blob", "data": {"images": "Images"}}],
        "artifactRefs": [
            {"shotId": str(i), "image": {"uri": _s3_img(i)}} for i in range(1, 11)
        ],
        "s3_uris": [], "counts": {"blobs": 1, "files": 0, "artifacts": 10},
    },

    "generate_animations": {
        "blobs": [{"kind": "json_blob", "data": {
            "animations": [{"shotId": str(i), "animation": {"uri": _s3_anim(i)}} for i in range(1, 11)],
        }}],
        "artifactRefs": [
            {"shotId": str(i), "animation": {"uri": _s3_anim(i)}} for i in range(1, 11)
        ],
        "s3_uris": [], "counts": {"blobs": 1, "files": 0, "artifacts": 10},
    },
}

FALLBACK_OUTPUT = {
    "blobs": [{"kind": "json_blob", "data": {"status": "completed"}}],
    "artifactRefs": {}, "s3_uris": [],
    "counts": {"blobs": 1, "files": 0, "artifacts": 0},
}

# ── Pipeline step order ────────────────────────────────────────────────────
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


# ══════════════════════════════════════════════════════════════════════════════
#  Shot + Clip seeding helpers
# ══════════════════════════════════════════════════════════════════════════════

def _seed_shots(db, execution: dict) -> None:
    exec_oid = execution["_id"]
    org_id   = execution.get("orgId") or ""
    proj_id  = str(execution.get("projectId") or "")
    ep_id    = str(execution.get("episodeId") or "")
    part_id  = str(execution.get("partId") or "")

    deleted = db["shots"].delete_many({"executionId": exec_oid})
    if deleted.deleted_count:
        print(f"    ✓ Removed {deleted.deleted_count} existing shots")

    docs = []
    for s in SHOT_DEFINITIONS:
        char_refs = [
            {"characterId": n.lower(), "referenceImage": CHAR_REF_IMAGES.get(n, ""),
             "displayName": n, "awsUrl": CHAR_REF_IMAGES.get(n, "")}
            for n in s["chars"]
        ]
        loc_refs = [
            {"locationId": n.lower(), "referenceImage": LOC_REF_IMAGES.get(n, ""),
             "displayName": n, "awsUrl": LOC_REF_IMAGES.get(n, "")}
            for n in s["locs"]
        ]
        docs.append({
            "_id":         ObjectId(),
            "executionId": exec_oid,
            "orgId":       org_id,
            "projectId":   proj_id,
            "episodeId":   ep_id,
            "partId":      part_id,
            "shotId":      s["shot_id"],
            "sequenceNo":  s["seq"],
            "version":     1,
            "isApproved":  False,
            "characterReferences": char_refs,
            "locationReferences":  loc_refs,
            "previousReferences":  [],
            "shotMetadata": {"shotNumber": s["shot_no"], "beatNumber": s["beat_no"]},
            "oneLinerShotIntent":  s["one_liner"],
            "startImagePrompt":    s["start_prompt"],
            "startImage": {
                "objectId": None,
                "displayName": f"Shot {s['shot_no']} — Start Frame",
                "awsUrl": s["image_url"],
            },
            "executionMetadata": {
                "provider": "simulated", "model": "dall-e-3", "modelVersion": "1.0",
                "resolution": "768x512", "aspectRatio": "16:9", "outputFormat": "png",
                "quality": "standard", "orgId": org_id, "projectId": proj_id,
                "episodeId": ep_id, "partId": part_id, "orderId": f"order_{s['shot_id']}",
            },
            "createdAt": now, "updatedAt": now,
        })
    db["shots"].insert_many(docs)
    print(f"    ✓ Seeded {len(docs)} shots → shots collection")


def _seed_clips(db, execution: dict) -> None:
    exec_oid = execution["_id"]
    org_id   = execution.get("orgId") or ""
    proj_id  = str(execution.get("projectId") or "")
    ep_id    = str(execution.get("episodeId") or "")
    part_id  = str(execution.get("partId") or "")

    deleted = db["clips"].delete_many({"executionId": exec_oid})
    if deleted.deleted_count:
        print(f"    ✓ Removed {deleted.deleted_count} existing clips")

    docs = []
    for s in SHOT_DEFINITIONS:
        clip_num = s["shot_id"].replace("shot_", "")
        docs.append({
            "_id":         ObjectId(),
            "executionId": exec_oid,
            "orgId":       org_id,
            "projectId":   proj_id,
            "episodeId":   ep_id,
            "partId":      part_id,
            "clipId":      f"clip_{clip_num}",
            "shotId":      s["shot_id"],
            "sequenceNo":  s["seq"],
            "version":     1,
            "isApproved":  False,
            "inputImages": [{
                "objectId": None,
                "displayName": f"Shot {s['shot_no']} — Start Frame",
                "awsUrl": s["image_url"],
            }],
            "animationPrompt": s["anim_prompt"],
            "clipOutput": {
                "objectId": None,
                "displayName": f"Clip {s['shot_no']} — Output",
                "awsUrl": s["anim_url"],
            },
            "executionMetadata": {
                "provider": "simulated", "model": "runway-gen4", "modelVersion": "1.0",
                "durationSeconds": 4, "aspectRatio": "16:9", "outputFormat": "mp4",
                "quality": "standard", "orgId": org_id, "projectId": proj_id,
                "episodeId": ep_id, "partId": part_id, "orderId": f"order_clip_{clip_num}",
            },
            "createdAt": now, "updatedAt": now,
        })
    db["clips"].insert_many(docs)
    print(f"    ✓ Seeded {len(docs)} clips → clips collection")


# ══════════════════════════════════════════════════════════════════════════════
#  Main
# ══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="Seed all pipeline data for a part")
    parser.add_argument("--part-id", help="ObjectId of the part to seed (default: latest)")
    args = parser.parse_args()

    print()
    print("╔══════════════════════════════════════════════════════════╗")
    print("║       seed_part.py — one-shot pipeline data seeder      ║")
    print("╚══════════════════════════════════════════════════════════╝")
    print()

    # ── Find Part ──────────────────────────────────────────────────────────
    if args.part_id:
        part = db["parts"].find_one({"_id": ObjectId(args.part_id)})
        if not part:
            print(f"❌  Part {args.part_id} not found.")
            sys.exit(1)
    else:
        part = db["parts"].find_one({}, sort=[("createdAt", -1)])
        if not part:
            print("❌  No parts found. Create a Part in the UI first.")
            sys.exit(1)

    part_id    = part["_id"]
    project_id = part.get("projectId")
    episode_id = part.get("episodeId")
    print(f"▶  Part        : {part_id}  ({part.get('title', 'untitled')})")

    # ── User / Org ─────────────────────────────────────────────────────────
    user = db["users"].find_one({})
    if not user:
        print("❌  No users found. Run seed.py first.")
        sys.exit(1)
    user_id = str(user["_id"])
    org_id  = user.get("organizationId", "")
    print(f"▶  User        : {user_id}")
    print(f"▶  Org         : {org_id}")

    # ── Template ───────────────────────────────────────────────────────────
    template = db["workflowTemplateVersions"].find_one({}, sort=[("version", -1)])
    template_id      = template["_id"] if template else None
    template_version = template.get("version", 1) if template else 1
    template_key     = template.get("templateKey", "micro_drama_pipeline") if template else "micro_drama_pipeline"

    # Determine ordered step list from template (or use hardcoded fallback)
    step_keys = PIPELINE_STEPS[:]
    if template:
        t_steps = template.get("steps", [])
        if t_steps and isinstance(t_steps[0], dict) and "key" in t_steps[0]:
            try:
                step_keys = [s["key"] for s in sorted(t_steps, key=lambda x: int(x.get("order", 999)))]
            except (TypeError, ValueError):
                pass

    # Always ensure generate_animations is the last step (add to DB template if missing)
    if "generate_animations" not in step_keys:
        step_keys.append("generate_animations")
        if template:
            t_steps = template.get("steps", [])
            t_steps.append({"key": "generate_animations", "order": len(t_steps) + 1, "configRefs": None})
            db["workflowTemplateVersions"].update_one(
                {"_id": template["_id"]},
                {"$set": {"steps": t_steps}},
            )
            print("  ✓ Added generate_animations to workflow template")

    print(f"▶  Pipeline    : {len(step_keys)} steps")
    print()

    # ── Upsert WorkflowExecution ───────────────────────────────────────────
    existing_exec = db["workflowExecutions"].find_one({"partId": str(part_id)})
    if existing_exec:
        exec_oid = existing_exec["_id"]
        print(f"  ✓ Using existing execution: {exec_oid}")
    else:
        exec_oid = ObjectId()
        db["workflowExecutions"].insert_one({
            "_id":               exec_oid,
            "userId":            user_id,
            "templateVersionId": template_id,
            "templateKey":       template_key,
            "templateVersion":   template_version,
            "title":             f"{part.get('title', 'Part')}_exec",
            "status":            "running",
            "orgId":             org_id,
            "projectId":         str(project_id or ""),
            "episodeId":         str(episode_id or ""),
            "partId":            str(part_id),
            "currentStepKey":    step_keys[0],
            "steps":             [{"stepKey": sk, "status": "not_started", "updatedAt": now} for sk in step_keys],
            "seqCounters":       {"messageSeq": 0},
            "meta":              {"seeded": True, "source": "seed_part"},
            "createdAt":         now,
            "updatedAt":         now,
        })
        print(f"  ✓ Created new execution: {exec_oid}")

    execution = {
        "_id": exec_oid,
        "orgId": org_id,
        "projectId": str(project_id or ""),
        "episodeId": str(episode_id or ""),
        "partId": str(part_id),
    }

    # ── Wipe existing StepVersions for this execution ──────────────────────
    del_sv = db["stepVersions"].delete_many({"executionId": exec_oid})
    print(f"  ✓ Cleared {del_sv.deleted_count} existing stepVersions")

    # ── Insert one StepVersion per step, all succeeded ────────────────────
    print()
    print("▶  Seeding StepVersions…")
    steps_update = []
    for sk in step_keys:
        output = DEMO_OUTPUTS.get(sk, FALLBACK_OUTPUT)
        sv_id = ObjectId()
        db["stepVersions"].insert_one({
            "_id":          sv_id,
            "executionId":  exec_oid,
            "stepKey":      sk,
            "versionNo":    1,
            "lineage":      {"type": "seeded"},
            "input":        {"seeded": True},
            "output":       output,
            "status":       "succeeded",
            "orgId":        org_id,
            "projectId":    str(project_id or ""),
            "episodeId":    str(episode_id or ""),
            "partId":       str(part_id),
            "createdAt":    now,
            "updatedAt":    now,
        })
        steps_update.append({
            "stepKey":       sk,
            "status":        "succeeded",
            "headVersionId": sv_id,
            "updatedAt":     now,
        })
        print(f"    ✓ {sk}")

    # ── Seed Shots + Clips ─────────────────────────────────────────────────
    print()
    print("▶  Seeding shots…")
    _seed_shots(db, execution)

    print()
    print("▶  Seeding clips…")
    _seed_clips(db, execution)

    # ── Update WorkflowExecution: all steps succeeded, status completed ───
    print()
    print("▶  Updating execution status…")
    db["workflowExecutions"].update_one(
        {"_id": exec_oid},
        {"$set": {
            "steps":          steps_update,
            "currentStepKey": step_keys[-1],
            "status":         "completed",
            "meta":           {"seeded": True, "source": "seed_part"},
            "updatedAt":      now,
        }},
    )
    print(f"    ✓ Execution status → completed")
    print(f"    ✓ currentStepKey  → {step_keys[-1]}")

    print()
    print("═" * 58)
    print(f"  ✅  DONE  — Part {part_id} fully seeded")
    print(f"      • {len(step_keys)} stepVersions (all succeeded)")
    print(f"      • {len(SHOT_DEFINITIONS)} shots")
    print(f"      • {len(SHOT_DEFINITIONS)} clips")
    print("═" * 58)
    print()
    print("  Refresh the browser — all tabs should be visible and populated.")
    print()


if __name__ == "__main__":
    main()
