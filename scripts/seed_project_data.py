import json
import os
import sys
from pathlib import Path
from datetime import datetime
from pymongo import MongoClient
from bson import ObjectId

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

# MongoDB configuration
MONGO_CONFIG = {
    'host': 'localhost',
    'port': 27017,
    'database': 'loqo_db',
    'username': 'root',
    'password': 'examplepassword',
}

# Paths to dummy data
BASE_DIR = Path(__file__).parent.parent
DUMMY_DATA_DIR = BASE_DIR / 'dummy_data' / 'prompt'
IMAGES_DIR = BASE_DIR / 'dummy_data' / 'ep-02-part-1'

def get_mongo_client():
    """Create and return MongoDB client and database"""
    connection_string = f"mongodb://{MONGO_CONFIG['username']}:{MONGO_CONFIG['password']}@{MONGO_CONFIG['host']}:{MONGO_CONFIG['port']}"
    
    client = MongoClient(connection_string)
    db = client[MONGO_CONFIG['database']]
    return client, db

def load_json_file(filename):
    """Load JSON file from dummy_data/prompt directory"""
    filepath = DUMMY_DATA_DIR / filename
    print(f"  Loading {filename}...")
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def get_all_organizations(db):
    """Fetch all organization IDs from database"""
    return list(db.organizations.find({}, {'_id': 1, 'name': 1}))

def verify_data(db, project_id, org_name):
    """Verify all inserted data"""
    print(f"\n{'='*60}")
    print(f"VERIFICATION REPORT for {org_name}")
    print(f"{'='*60}")
    
    # Count projects
    project_count = db.projects.count_documents({'_id': project_id})
    print(f"✓ Projects: {project_count}")
    
    # Count episodes
    episode_count = db.episodes.count_documents({'projectId': project_id})
    print(f"✓ Episodes: {episode_count}")
    
    # Count parts
    episodes = list(db.episodes.find({'projectId': project_id}))
    part_count = 0
    for episode in episodes:
        part_count += db.parts.count_documents({'episodeId': episode['_id']})
    print(f"✓ Parts: {part_count}")
    
    # Count beats
    parts = list(db.parts.find({'episodeId': {'$in': [e['_id'] for e in episodes]}}))
    beat_count = 0
    for part in parts:
        beat_count += db.beats.count_documents({'partId': part['_id']})
    print(f"✓ Beats: {beat_count}")
    
    # Count shots
    beats = list(db.beats.find({'partId': {'$in': [p['_id'] for p in parts]}}))
    shot_count = 0
    for beat in beats:
        shot_count += db.shots.count_documents({'beatId': beat['_id']})
    print(f"✓ Shots: {shot_count}")
    
    # Count storyboard panels
    panel_count = 0
    for part in parts:
        panel_count += db.storyboardPanels.count_documents({'partId': part['_id']})
    print(f"✓ Storyboard Panels: {panel_count}")
    
    # Count clips
    clip_count = 0
    for part in parts:
        clip_count += db.clips.count_documents({'partId': part['_id']})
    print(f"✓ Clips: {clip_count}")
    
    # Count images
    clips = list(db.clips.find({'partId': {'$in': [p['_id'] for p in parts]}}))
    image_count = 0
    for clip in clips:
        image_count += db.images.count_documents({'clipId': clip['_id']})
    print(f"✓ Images: {image_count}")
    
    print(f"{'='*60}\n")

def insert_project(db, org_id, org_name):
    """Insert project with correct schema and return project_id"""
    project_doc = {
        'organizationId': org_id,
        'name': f"Rajmahal Ki Dulhan - {org_name}",
        'description': "A romantic drama set in present-day Indian royal estate",
        'canon': {},  # World-building rules, style guides
        'characters': [],  # Global character definitions
        'locations': [],  # Global location definitions
        'createdAt': datetime.utcnow(),
        'updatedAt': datetime.utcnow()
    }
    result = db.projects.insert_one(project_doc)
    return result.inserted_id

def insert_episode(db, project_id):
    """Insert episode with correct schema and return episode_id"""
    episode_doc = {
        'projectId': project_id,
        'title': "Episode 2 - The Arrival",
        'season_number': 1,
        'episode_number': 2,
        'canon_overrides': {},  # Episode-specific canon overrides
        'additional_characters': [],  # Episode-specific characters
        'additional_locations': [],  # Episode-specific locations
        'createdAt': datetime.utcnow(),
        'updatedAt': datetime.utcnow()
    }
    result = db.episodes.insert_one(episode_doc)
    return result.inserted_id

def insert_part(db, episode_id):
    """Insert part with correct schema and return part_id"""
    part_doc = {
        'episodeId': episode_id,
        'title': "Part 1 - Grand Entrance",
        'part_number': 1,
        'status': "draft",  # Use enum value: draft, in_progress, locked, exported
        'content': {},  # Flexible JSON content storage
        'createdAt': datetime.utcnow(),
        'updatedAt': datetime.utcnow()
    }
    result = db.parts.insert_one(part_doc)
    return result.inserted_id

def insert_beats(db, part_id, beats_data):
    """Insert all beats with correct schema and return mapping of beat_number to beat_id"""
    beat_mapping = {}
    beat_docs = []
    
    for beat in beats_data['beats']:
        # Store all beat data in the flexible content field
        beat_doc = {
            'partId': part_id,
            'beat_number': beat['Beat_Number'],
            'title': beat.get('Title', f"Beat {beat['Beat_Number']}"),
            'content': {
                'scene_ref': beat.get('Scene_Ref', ''),
                'description': beat.get('Description', ''),
                'emotion': beat.get('Emotion', ''),
                'time_range': beat.get('Time_Range', ''),
                'screenplay_lines': beat.get('Screenplay_lines', []),
                # Store any additional fields
                **{k: v for k, v in beat.items() if k not in ['Beat_Number', 'Title', 'Scene_Ref', 'Description', 'Emotion', 'Time_Range', 'Screenplay_lines']}
            },
            'createdAt': datetime.utcnow(),
            'updatedAt': datetime.utcnow()
        }
        beat_docs.append(beat_doc)
    
    if beat_docs:
        result = db.beats.insert_many(beat_docs)
        
        # Create mapping
        for i, beat in enumerate(beats_data['beats']):
            beat_mapping[beat['Beat_Number']] = result.inserted_ids[i]
    
    return beat_mapping

def insert_shots(db, beat_mapping, shots_data):
    """Insert all shots with correct schema and return mapping of shot_id"""
    shot_mapping = {}
    shot_docs = []
    
    for beat in shots_data['beats']:
        beat_id = beat_mapping.get(beat['beat_number'])
        if not beat_id:
            print(f"  Warning: Beat {beat['beat_number']} not found in mapping")
            continue
        
        for shot in beat['shots']:
            shot_doc = {
                'beatId': beat_id,
                'beat_number': beat['beat_number'],
                'shot_name': shot['shot'],
                'title': shot.get('intent_title', ''),
                'content': {
                    'intent': shot.get('intent', ''),
                    'emotion': shot.get('emotion', ''),
                    'narrative_function': shot.get('narrative_function', ''),
                    'estimated_duration': shot.get('estimated_duration', ''),
                    # Store any additional fields
                    **{k: v for k, v in shot.items() if k not in ['shot', 'intent_title', 'intent', 'emotion', 'narrative_function', 'estimated_duration']}
                },
                'createdAt': datetime.utcnow(),
                'updatedAt': datetime.utcnow()
            }
            shot_docs.append(shot_doc)
    
    if shot_docs:
        result = db.shots.insert_many(shot_docs)
        
        # Create mapping
        idx = 0
        for beat in shots_data['beats']:
            for shot in beat['shots']:
                shot_mapping[f"{beat['beat_number']}_{shot['shot']}"] = result.inserted_ids[idx]
                idx += 1
    
    return shot_mapping

def insert_storyboard(db, part_id, beat_mapping, storyboard_data):
    """Insert all storyboard panels"""
    panel_docs = []
    
    for panel in storyboard_data['storyboard']:
        beat_id = beat_mapping.get(panel['metadata']['beat_number'])
        if not beat_id:
            print(f"  Warning: Beat {panel['metadata']['beat_number']} not found for panel {panel['metadata']['panel_number']}")
            continue
        
        panel_doc = {
            'partId': part_id,
            'beatId': beat_id,
            'panelNumber': panel['metadata']['panel_number'],
            'shotSummary': panel['metadata']['shot_summary'],
            'cinematography': {
                'shotSizeAngle': panel['cinematography']['shot_size_angle'],
                'lensIntent': panel['cinematography']['lens_intent'],
                'cameraMovement': panel['cinematography']['camera_movement']
            },
            'composition': {
                'subjectComposition': panel['composition']['subject_composition'],
                'action': panel['composition']['action']
            },
            'setting': {
                'keyLocation': panel['setting']['key_location'],
                'scenography': panel['setting']['scenography'],
                'timeContext': panel['setting']['time_context']
            },
            'characterFocalPosition': panel.get('character_focal_position'),
            'characters': panel.get('characters', []),
            'storyContext': {
                'visualStyleGuide': panel['story_context']['visual_style_guide'],
                'projectContext': panel['story_context']['project_context'],
                'eraCultureContext': panel['story_context']['era_culture_context'],
                'emotionalThematicIntent': panel['story_context']['emotional_thematic_intent']
            },
            'audio': {
                'dialogue': panel['audio']['dialogue'],
                'audioCueIntent': panel['audio']['audio_cue_intent']
            },
            'createdAt': datetime.utcnow(),
            'updatedAt': datetime.utcnow()
        }
        panel_docs.append(panel_doc)
    
    if panel_docs:
        db.storyboardPanels.insert_many(panel_docs)
        print(f"  ✓ Inserted {len(panel_docs)} storyboard panels")

def insert_clips_and_images(db, part_id, shot_mapping):
    """Insert clips and images with random internet URLs"""
    
    # Sample image URLs from Unsplash (free to use)
    sample_images = [
        "https://images.unsplash.com/photo-1485846234645-a62644f84728",  # Movie scene
        "https://images.unsplash.com/photo-1478720568477-152d9b164e26",  # Cinema
        "https://images.unsplash.com/photo-1574267432644-f610f35bc73e",  # Film production
        "https://images.unsplash.com/photo-1598899134739-24c46f58b8c0",  # Movie camera
        "https://images.unsplash.com/photo-1579781403337-48927bdc8096",  # Film set
        "https://images.unsplash.com/photo-1524985069026-dd778a71c7b4",  # Studio
        "https://images.unsplash.com/photo-1440404653325-ab127d49abc1",  # Camera crew
        "https://images.unsplash.com/photo-1627873649417-c67f701f1949",  # Film equipment
        "https://images.unsplash.com/photo-1615986201152-7686a4867f30",  # Production scene
        "https://images.unsplash.com/photo-1536440136628-849c177e76a1",  # Cinematic
    ]
    
    # Sample video/clip URLs (using placeholder video service)
    sample_clips = [
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    ]
    
    if not shot_mapping:
        print("  Warning: No shots found to attach images/clips")
        return 0, 0
    
    image_docs = []
    clip_docs = []
    shot_ids = list(shot_mapping.values())
    
    # Create 2-3 images per shot
    for idx, shot_id in enumerate(shot_ids[:10]):  # Limit to first 10 shots
        # Add 2 images per shot
        for img_idx in range(2):
            image_url = sample_images[(idx * 2 + img_idx) % len(sample_images)]
            image_doc = {
                'shotId': shot_id,
                'partId': part_id,
                'imageUrl': image_url,
                'metadata': {
                    'imageType': 'reference',
                    'resolution': '1920x1080',
                    'source': 'unsplash'
                },
                'createdAt': datetime.utcnow(),
                'updatedAt': datetime.utcnow()
            }
            image_docs.append(image_doc)
        
        # Add 1 clip per shot
        if idx < len(sample_clips):
            clip_url = sample_clips[idx % len(sample_clips)]
            clip_doc = {
                'shotId': shot_id,
                'partId': part_id,
                'clipUrl': clip_url,
                'metadata': {
                    'duration': 10.0,
                    'format': 'mp4',
                    'source': 'google_sample_videos'
                },
                'createdAt': datetime.utcnow(),
                'updatedAt': datetime.utcnow()
            }
            clip_docs.append(clip_doc)
    
    # Insert documents
    inserted_clips = 0
    inserted_images = 0
    
    if image_docs:
        db.images.insert_many(image_docs)
        inserted_images = len(image_docs)
        print(f"  ✓ Inserted {inserted_images} images with internet URLs")
    
    if clip_docs:
        db.clips.insert_many(clip_docs)
        inserted_clips = len(clip_docs)
        print(f"  ✓ Inserted {inserted_clips} clips with internet URLs")
    
    return inserted_clips, inserted_images

    
    return len(clip_docs), len(image_docs)

def cleanup_organization_data(db, org_id, org_name):
    """Remove all existing data for an organization"""
    print(f"\n🗑️  Cleaning up existing data for {org_name}...")
    
    # Find all projects for this organization
    projects = list(db.projects.find({'organizationId': org_id}))
    project_ids = [p['_id'] for p in projects]
    
    if not project_ids:
        print("  ✓ No existing data to clean up")
        return
    
    # Find all episodes for these projects
    episodes = list(db.episodes.find({'projectId': {'$in': project_ids}}))
    episode_ids = [e['_id'] for e in episodes]
    
    # Find all parts for these episodes
    parts = list(db.parts.find({'episodeId': {'$in': episode_ids}}))
    part_ids = [p['_id'] for p in parts]
    
    # Find all beats for these parts
    beats = list(db.beats.find({'partId': {'$in': part_ids}}))
    beat_ids = [b['_id'] for b in beats]
    
    # Find all clips for these parts
    clips = list(db.clips.find({'partId': {'$in': part_ids}}))
    clip_ids = [c['_id'] for c in clips]
    
    # Delete in reverse order (children first)
    deleted_counts = {}
    
    if clip_ids:
        result = db.images.delete_many({'clipId': {'$in': clip_ids}})
        deleted_counts['images'] = result.deleted_count
    
    if part_ids:
        result = db.clips.delete_many({'partId': {'$in': part_ids}})
        deleted_counts['clips'] = result.deleted_count
        
        result = db.storyboardPanels.delete_many({'partId': {'$in': part_ids}})
        deleted_counts['storyboard_panels'] = result.deleted_count
    
    if beat_ids:
        result = db.shots.delete_many({'beatId': {'$in': beat_ids}})
        deleted_counts['shots'] = result.deleted_count
    
    if part_ids:
        result = db.beats.delete_many({'partId': {'$in': part_ids}})
        deleted_counts['beats'] = result.deleted_count
    
    if episode_ids:
        result = db.parts.delete_many({'episodeId': {'$in': episode_ids}})
        deleted_counts['parts'] = result.deleted_count
    
    if project_ids:
        result = db.episodes.delete_many({'projectId': {'$in': project_ids}})
        deleted_counts['episodes'] = result.deleted_count
    
    result = db.projects.delete_many({'organizationId': org_id})
    deleted_counts['projects'] = result.deleted_count
    
    print(f"  ✓ Deleted: {deleted_counts}")

def seed_data_for_organization(db, org_id, org_name):
    """Seed all data for a single organization"""
    try:
        print(f"\n{'='*60}")
        print(f"Seeding data for: {org_name} (ID: {org_id})")
        print(f"{'='*60}")
        
        # Cleanup existing data for this organization
        cleanup_organization_data(db, org_id, org_name)
        
        # Load JSON data
        print("\n📂 Loading JSON files...")
        beats_data = load_json_file('beat_breakdown.json')
        shots_data = load_json_file('shot_intent_mapping.json')
        storyboard_data = load_json_file('storyboard.json')
        print("  ✓ All JSON files loaded successfully")
        
        # Insert hierarchy
        print("\n📝 Inserting project hierarchy...")
        project_id = insert_project(db, org_id, org_name)
        print(f"  ✓ Project ID: {project_id}")
        
        episode_id = insert_episode(db, project_id)
        print(f"  ✓ Episode ID: {episode_id}")
        
        part_id = insert_part(db, episode_id)
        print(f"  ✓ Part ID: {part_id}")
        
        # Insert beats
        print("\n🎬 Inserting beats...")
        beat_mapping = insert_beats(db, part_id, beats_data)
        print(f"  ✓ Inserted {len(beat_mapping)} beats")
        
        # Insert shots
        print("\n📷 Inserting shots...")
        shot_mapping = insert_shots(db, beat_mapping, shots_data)
        print(f"  ✓ Inserted {len(shot_mapping)} shots")
        
        # Insert storyboard
        print("\n🎨 Inserting storyboard panels...")
        insert_storyboard(db, part_id, beat_mapping, storyboard_data)
        
        # Insert clips and images
        print("\n🖼️  Inserting clips and images...")
        clip_count, image_count = insert_clips_and_images(db, part_id, shot_mapping)
        print(f"  ✓ Total: {clip_count} clips and {image_count} images")
        
        # Verify data
        verify_data(db, project_id, org_name)
        
        print(f"✅ Successfully seeded all data for {org_name}\n")
        
    except Exception as e:
        print(f"\n❌ Error seeding data for {org_name}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise

def main():
    """Main execution function"""
    print("\n" + "="*60)
    print("🚀 LOQO PROJECT DATA SEEDING SCRIPT")
    print("="*60)
    
    try:
        client, db = get_mongo_client()
        print("✓ Connected to MongoDB successfully")
        
        # Get all organizations
        print("\n🔍 Fetching organizations from database...")
        organizations = get_all_organizations(db)
        
        if not organizations:
            print("⚠️  No organizations found in database!")
            print("Please create at least one organization first.")
            sys.exit(1)
        
        print(f"✓ Found {len(organizations)} organization(s):")
        for org in organizations:
            print(f"  - {org['name']} (ID: {org['_id']})")
        
        # Seed data for each organization
        for org in organizations:
            seed_data_for_organization(db, org['_id'], org['name'])
        
        print("\n" + "="*60)
        print("✅ ALL DATA SEEDED SUCCESSFULLY")
        print("="*60)
        print("\n📊 Summary:")
        print(f"  - Organizations processed: {len(organizations)}")
        print(f"  - Projects created: {len(organizations)}")
        print(f"  - Episodes created: {len(organizations)}")
        print(f"  - Parts created: {len(organizations)}")
        print("\n")
        
    except Exception as e:
        print(f"\n❌ Fatal error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        if 'client' in locals():
            client.close()
            print("✓ MongoDB connection closed")

if __name__ == "__main__":
    main()
