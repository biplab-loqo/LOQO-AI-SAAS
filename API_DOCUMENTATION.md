# LOQO AI Studio — API & Schema Documentation

> **Base URL**: `http://localhost:8000/api/v1`  
> **Total Routes**: 23 (including root health checks)  
> **Auth**: Google OAuth → JWT Bearer tokens  
> **Interactive Docs**: `http://localhost:8000/docs` (Swagger) · `http://localhost:8000/redoc` (ReDoc)

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Organizations](#2-organizations)
3. [User Profile](#3-user-profile)
4. [Projects](#4-projects)
5. [Episodes](#5-episodes)
6. [Parts](#6-parts)
7. [Content (Beats / Shots / Storyboards)](#7-content-unified)
8. [Media (Images / Clips)](#8-media-unified)
9. [Schema Reference](#9-schema-reference)

---

## 1. Authentication

All endpoints (except `POST /auth/google`) require a JWT bearer token in the `Authorization` header.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/google` | Exchange Google `id_token` for a JWT access token |
| `GET` | `/auth/me` | Get the currently authenticated user + organization |
| `POST` | `/auth/logout` | Invalidate the current session |

### `POST /auth/google`

**Request Body**:
```json
{ "id_token": "eyJhbGciOi..." }
```

**Response** `200`:
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "user": {
    "id": "...", "email": "user@example.com", "name": "User Name",
    "avatarUrl": null, "bio": null
  },
  "has_organization": true,
  "organization": {
    "id": "...", "name": "My Org", "created_at": "2025-...",
    "members": [{ "id": "...", "email": "...", "name": "...", "avatarUrl": null }]
  }
}
```

### `GET /auth/me`

Returns the same shape as the google login response (without `access_token`).

---

## 2. Organizations

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/organizations/` | Create a new organization |
| `GET` | `/organizations/my-organization` | Get the authenticated user's organization |
| `POST` | `/organizations/add-member` | Add a member by email |
| `GET` | `/organizations/members` | List all organization members |

### `POST /organizations/`

**Request**: `{ "name": "Studio Name" }`  
**Response**: `{ "id", "name", "members": [...], "created_at" }`

### `POST /organizations/add-member`

**Request**: `{ "email": "new@member.com" }`  
**Response**: `{ "id", "email", "name", "avatarUrl" }`

---

## 3. User Profile

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/users/profile` | Get authenticated user's profile |
| `PUT` | `/users/profile` | Update name and/or bio |

### `PUT /users/profile`

**Request**: `{ "name": "New Name", "bio": "My bio" }`  
**Response**: Full user profile object.

---

## 4. Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/projects/` | Create a new project |
| `GET` | `/projects/` | List all projects for the user's organization |
| `GET` | `/projects/{project_id}` | Get a single project |
| `PUT` | `/projects/{project_id}` | Update project name/description |
| `DELETE` | `/projects/{project_id}` | Delete project + all children (cascade) |
| `GET` | `/projects/{project_id}/full` | **⭐ Full project tree** — one API call |

### `GET /projects/{project_id}/full`

Returns the entire project hierarchy in one request. This is the primary data-fetching endpoint for the frontend.

**Response**:
```json
{
  "id": "...",
  "name": "My Project",
  "description": "...",
  "organizationId": "...",
  "createdBy": "...",
  "episodes": [
    {
      "id": "...",
      "projectId": "...",
      "episodeNumber": 1,
      "bibleText": "Show bible text...",
      "parts": [
        {
          "id": "...",
          "title": "The Grand Arrival",
          "partNumber": 1,
          "episodeId": "...",
          "projectId": "...",
          "scriptText": "...",
          "beatCount": 6,
          "shotCount": 12,
          "storyboardCount": 8,
          "imageCount": 4,
          "clipCount": 2
        }
      ],
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "createdAt": "...",
  "updatedAt": "..."
}
```

---

## 5. Episodes

Episodes are nested under projects. **No standalone GET** — use `GET /projects/{id}/full` instead.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/projects/{project_id}/episodes` | Create a new episode |
| `PUT` | `/projects/{project_id}/episodes/{episode_id}` | Update episode |
| `DELETE` | `/projects/{project_id}/episodes/{episode_id}` | Delete episode + cascade |

### `POST /projects/{project_id}/episodes`

**Request**:
```json
{ "episodeNumber": 1, "bibleText": "Optional show bible text" }
```

**Response**: EpisodeOut object.

---

## 6. Parts

Parts are nested under projects/episodes.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/projects/{project_id}/episodes/{episode_id}/parts` | Create a part |
| `PUT` | `/projects/{project_id}/episodes/{episode_id}/parts/{part_id}` | Update part |
| `DELETE` | `/projects/{project_id}/episodes/{episode_id}/parts/{part_id}` | Delete part + cascade |
| `GET` | `/parts/{part_id}/studio` | **⭐ Studio data** — part + all content |

### `GET /parts/{part_id}/studio`

Returns everything needed for the Part Studio page in one API call.

**Response**:
```json
{
  "part": {
    "id": "...", "title": "...", "episodeId": "...", "projectId": "...",
    "partNumber": 1, "scriptText": "...", "createdBy": "...",
    "createdAt": "...", "updatedAt": "..."
  },
  "episode": {
    "id": "...", "projectId": "...", "episodeNumber": 1,
    "bibleText": "...", "createdAt": "...", "updatedAt": "..."
  },
  "beats": [
    {
      "id": "...", "partId": "...",
      "content": "[{\"title\":\"Beat 1\",...}, {\"title\":\"Beat 2\",...}]",
      "metadata": { "versionNo": 1, "edited": false, "selected": true },
      "createdAt": "...", "updatedAt": "..."
    }
  ],
  "shots": [ /* same structure as beats */ ],
  "storyboards": [ /* same structure as beats */ ],
  "images": [
    {
      "id": "...", "partId": "...", "shotId": "...", "name": "Shot image",
      "imageUrl": "https://...", "category": "shot",
      "metadata": { "versionNo": 1, "edited": false, "selected": true },
      "createdAt": "...", "updatedAt": "..."
    }
  ],
  "clips": [
    {
      "id": "...", "partId": "...", "shotId": "...", "name": "Clip",
      "clipUrl": "https://...",
      "metadata": { "versionNo": 1, "edited": false, "selected": true },
      "createdAt": "...", "updatedAt": "..."
    }
  ]
}
```

---

## 7. Content (Unified)

**Beats, Shots, and Storyboards** are all managed through a single unified `/content/` endpoint. Each document represents **one version** of ALL items (beats/shots/panels) for a part. The `content` field is a **JSON string** containing an array.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/content/` | Create a new content document |
| `PUT` | `/content/{content_id}` | Update content or metadata |
| `DELETE` | `/content/{content_id}` | Delete a content document |
| `POST` | `/content/{content_id}/select` | Set this version as selected (deselects others) |

### `POST /content/`

**Request**:
```json
{
  "type": "beat",
  "partId": "...",
  "content": "[{\"title\":\"Opening Beat\",\"description\":\"...\"}]",
  "metadata": { "versionNo": 1, "edited": false, "selected": true }
}
```

`type` must be one of: `"beat"`, `"shot"`, `"storyboard"`

### `POST /content/{content_id}/select`

Sets this document as the `selected` version. All other documents of the **same type and part** are automatically deselected.

### Content Field Format

The `content` field is a JSON-encoded string. When parsed, it yields an **array of objects**. The structure depends on the type:

#### Beat Content Item:
```json
{
  "title": "The Grand Arrival",
  "scene_ref": "EXT. PALACE - DAY",
  "time_range": "0:00 – 0:45",
  "description": "The procession approaches...",
  "emotion": "awe, anticipation",
  "screenplay_lines": ["FADE IN:", "EXT. PALACE ROAD — DAY"],
  "shots": [
    {
      "shot": "1A",
      "intent_title": "Establishing Shot",
      "intent": "Wide aerial shot...",
      "emotion": "wonder",
      "narrative_function": "Establishes scale",
      "estimated_duration": "8s"
    }
  ]
}
```

#### Shot Content Item:
```json
{
  "shot": "1A",
  "name": "Wide Establishing",
  "intent_title": "Grand Scale Introduction",
  "intent": "Aerial shot descending...",
  "emotion": "awe",
  "narrative_function": "World-building",
  "estimated_duration": "8s"
}
```

#### Storyboard Panel Content Item:
```json
{
  "metadata": {
    "panel_number": 1,
    "beat_number": 1,
    "shot_summary": "Wide establishing shot"
  },
  "cinematography": {
    "shot_size_angle": "Extreme Wide Shot",
    "lens_intent": "Ultra-wide for grandeur",
    "camera_movement": "Slow crane descent"
  },
  "composition": {
    "subject_composition": "Palace centered",
    "action": "Procession approaches"
  },
  "setting": {
    "key_location": "Palace exterior",
    "time_context": "Late afternoon"
  },
  "characters": [
    {
      "character_name": "Gayatri",
      "character_visual_identity": "Royal blue sari..."
    }
  ],
  "audio": {
    "dialogue": "",
    "audio_cue_intent": "Majestic orchestral swell"
  }
}
```

---

## 8. Media (Unified)

**Images and Clips** are managed through a single `/media/` endpoint.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/media/` | Create a new media item |
| `DELETE` | `/media/{media_id}` | Delete a media item |

### `POST /media/`

**Request**:
```json
{
  "type": "image",
  "partId": "...",
  "shotId": "...",
  "name": "Palace establishing shot",
  "url": "https://example.com/image.jpg",
  "category": "shot",
  "metadata": { "versionNo": 1, "edited": false, "selected": true }
}
```

`type` must be `"image"` or `"clip"`.  
`category` (images only): `"shot"`, `"character"`, `"location"`, or `"props"`.

---

## 9. Schema Reference

### Data Models

#### Project
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | MongoDB ObjectId |
| `name` | string | Project name |
| `description` | string? | Optional description |
| `organizationId` | string | Parent organization |
| `createdBy` | string | User who created it |
| `createdAt` | datetime | Creation timestamp |
| `updatedAt` | datetime | Last update timestamp |

#### Episode
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | MongoDB ObjectId |
| `projectId` | string | Parent project |
| `episodeNumber` | int | Episode number |
| `bibleText` | string? | Show bible text for this episode |
| `createdBy` | string? | Creator |
| `createdAt` | datetime | Creation timestamp |
| `updatedAt` | datetime | Last update timestamp |

#### Part
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | MongoDB ObjectId |
| `projectId` | string | Parent project |
| `episodeId` | string | Parent episode |
| `partNumber` | int | Part number within episode |
| `title` | string | Part title |
| `scriptText` | string? | Original script text |
| `createdBy` | string? | Creator |
| `createdAt` | datetime | Creation timestamp |
| `updatedAt` | datetime | Last update timestamp |

#### Beat / Shot / Storyboard (Content)
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | MongoDB ObjectId |
| `organizationId` | string | Parent organization |
| `projectId` | string | Parent project |
| `episodeId` | string | Parent episode |
| `partId` | string | Parent part |
| `content` | string | **JSON string** containing array of all items |
| `metadata.versionNo` | int | Version number |
| `metadata.edited` | bool | Whether this version was edited |
| `metadata.selected` | bool | Whether this is the active/selected version |
| `createdAt` | datetime | Creation timestamp |
| `updatedAt` | datetime | Last update timestamp |

> **Key Design**: Each Beat/Shot/Storyboard document contains ALL items for a part in one JSON string. There are no `beatNumber`, `shotNumber`, or `panelNumber` fields — numbering is derived by parsing the content array.

#### Image
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | MongoDB ObjectId |
| `organizationId` | string | Parent organization |
| `projectId` | string | Parent project |
| `episodeId` | string | Parent episode |
| `partId` | string | Parent part |
| `shotId` | string? | Associated shot (optional) |
| `name` | string | Display name |
| `imageUrl` | string | URL to the image |
| `category` | string | `"shot"`, `"character"`, `"location"`, or `"props"` |
| `metadata.versionNo` | int | Version number |
| `metadata.edited` | bool | Whether modified |
| `metadata.selected` | bool | Whether active version |
| `createdAt` | datetime | Creation timestamp |
| `updatedAt` | datetime | Last update timestamp |

#### Clip
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | MongoDB ObjectId |
| `organizationId` | string | Parent organization |
| `projectId` | string | Parent project |
| `episodeId` | string | Parent episode |
| `partId` | string | Parent part |
| `shotId` | string? | Associated shot |
| `name` | string | Display name |
| `clipUrl` | string | URL to the video clip |
| `metadata.versionNo` | int | Version number |
| `metadata.edited` | bool | Whether modified |
| `metadata.selected` | bool | Whether active version |
| `createdAt` | datetime | Creation timestamp |
| `updatedAt` | datetime | Last update timestamp |

---

### Version Management

All content and media use a unified version metadata pattern:

```json
{
  "versionNo": 2,
  "edited": true,
  "selected": true
}
```

- **`versionNo`**: Sequential version number for the entity
- **`edited`**: Whether this version was manually edited (vs. AI-generated)
- **`selected`**: Whether this is the currently active version displayed to the user

The `POST /content/{id}/select` endpoint automatically handles deselecting the previously selected version of the same type+part combination.

---

### Data Hierarchy

```
Organization
  └── Project
       └── Episode (has bibleText)
            └── Part (has scriptText)
                 ├── Beat(s)        — versioned, content = JSON array of beats
                 ├── Shot(s)        — versioned, content = JSON array of shots
                 ├── Storyboard(s)  — versioned, content = JSON array of panels
                 ├── Image(s)       — versioned, categorized (shot/char/loc/props)
                 └── Clip(s)        — versioned
```

### Route Summary (23 total)

```
POST   /api/v1/auth/google
GET    /api/v1/auth/me
POST   /api/v1/auth/logout

POST   /api/v1/organizations/
GET    /api/v1/organizations/my-organization
POST   /api/v1/organizations/add-member
GET    /api/v1/organizations/members

GET    /api/v1/users/profile
PUT    /api/v1/users/profile

POST   /api/v1/projects/
GET    /api/v1/projects/
GET    /api/v1/projects/{project_id}
PUT    /api/v1/projects/{project_id}
DELETE /api/v1/projects/{project_id}
GET    /api/v1/projects/{project_id}/full          ⭐ Full tree

POST   /api/v1/projects/{project_id}/episodes
PUT    /api/v1/projects/{project_id}/episodes/{episode_id}
DELETE /api/v1/projects/{project_id}/episodes/{episode_id}

POST   /api/v1/projects/{project_id}/episodes/{episode_id}/parts
PUT    /api/v1/projects/{project_id}/episodes/{episode_id}/parts/{part_id}
DELETE /api/v1/projects/{project_id}/episodes/{episode_id}/parts/{part_id}
GET    /api/v1/parts/{part_id}/studio               ⭐ Studio data

POST   /api/v1/content/
PUT    /api/v1/content/{content_id}
DELETE /api/v1/content/{content_id}
POST   /api/v1/content/{content_id}/select

POST   /api/v1/media/
DELETE /api/v1/media/{media_id}

GET    /                                             Health
GET    /health                                       Health
```
