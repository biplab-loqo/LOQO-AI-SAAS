# Data Seeding Scripts

## Setup

1. Update MongoDB credentials in `db_config.py` (or directly in `seed_project_data.py`)
2. Ensure MongoDB is running
3. Install required dependency:
   ```bash
   pip install pymongo
   ```

## Running the Seed Script

```bash
cd /home/biplab-dev/Downloads/loqo-proj
python scripts/seed_project_data.py
```

## What it does

The script will:
1. Connect to your MongoDB database
2. Fetch all existing organizations
3. For each organization:
   - Create a new project "Rajmahal Ki Dulhan"
   - Create Episode 2
   - Create Part 1
   - Insert 7 beats from `beat_breakdown.json`
   - Insert all shots from `shot_intent_mapping.json`
   - Insert 19 storyboard panels from `storyboard.json`
   - Insert clips and images from `ep-02-part-1` folder

## MongoDB Collections Used

- organizations
- projects
- episodes
- parts
- beats
- shots
- storyboardPanels
- clips
- images

## Field Naming Convention

The script uses camelCase for MongoDB field names following common conventions:
- `organizationId`, `projectId`, `episodeId`, etc. for references
- `beatNumber`, `shotCode`, `panelNumber` for identifiers
- `createdAt`, `updatedAt` for timestamps
