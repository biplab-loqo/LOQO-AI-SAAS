# Loqo AI Studio — Backend

FastAPI backend for the Loqo AI Studio platform — AI-Powered Screenplay to Visual Pipeline.

## Tech Stack

- Python 3.12+
- FastAPI + Uvicorn
- MongoDB Atlas (via Beanie ODM + Motor)
- AWS S3 (media storage)
- AWS SQS (async workflow messaging)
- AWS CloudFront (CDN)
- Google OAuth 2.0

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

See `.env.example` for all required and optional variables.

## Local Development

```bash
# Create virtual environment
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Seed the database (optional)
python -m scripts.seed

# Start the server
uvicorn app.main:app --reload --port 8001
```

Open [http://localhost:8001/docs](http://localhost:8001/docs) for Swagger UI.

## API Endpoints

All routes are prefixed with `/api/v1`:

| Group           | Prefix                | Description                     |
| --------------- | --------------------- | ------------------------------- |
| Auth            | `/api/v1/auth`        | Google OAuth login/logout       |
| Users           | `/api/v1/users`       | User profile management         |
| Organizations   | `/api/v1/organizations` | Organization CRUD + members   |
| Projects        | `/api/v1/projects`    | Project CRUD                    |
| Episodes        | `/api/v1/episodes`    | Episode CRUD                    |
| Parts           | `/api/v1/parts`       | Part CRUD + script management   |
| Workflows       | `/api/v1/workflows`   | Execution engine, steps, shots  |
| Media           | `/api/v1/media`       | S3 presigned upload/download    |

## Project Structure

```
app/
├── main.py               # FastAPI app entrypoint
├── api/v1/               # V1 REST API routes
│   └── endpoints/        # Route handlers by domain
├── core/                 # Config, auth utilities
├── db/                   # MongoDB connection
├── models/               # Beanie document models
├── services/             # Business logic (workflow engine, SQS, S3)
├── templates/            # Pipeline step templates
└── utils/                # Shared helpers (S3, CDN, media)
scripts/
├── seed.py               # Database seeder
└── seed_part.py          # Partial seed utility
demodata/                 # Demo assets (images, JSON)
```

## Docker (Local MongoDB)

```bash
docker-compose up -d
```

This starts a local MongoDB 7 instance on port 27018.

## Deploy

The backend is designed to run on Railway, Render, or any Docker-compatible platform.

Set all environment variables from `.env.example` in your hosting provider's dashboard.
