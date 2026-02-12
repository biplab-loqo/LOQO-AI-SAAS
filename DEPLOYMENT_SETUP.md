# ═══════════════════════════════════════════════════════════════════════
#  LOQO AI STUDIO — SPLIT DEPLOYMENT SETUP
#  Frontend → Vercel  |  Backend → Railway
# ═══════════════════════════════════════════════════════════════════════

# ┌─────────────────────────────────────────────────────────────────────┐
# │  PART 1: BACKEND ON RAILWAY                                        │
# └─────────────────────────────────────────────────────────────────────┘

# ── Step 1: Create Railway Project ────────────────────────────────────
# Go to https://railway.app → New Project → Deploy from GitHub repo
# Set the ROOT DIRECTORY to: backend
# (Railway Settings → Source → Root Directory → "backend")
#
# OR via CLI:
#   npm i -g @railway/cli
#   railway login
#   railway init
#   railway link

# ── Step 2: Set Railway Environment Variables ─────────────────────────
# Go to Railway Dashboard → Your Service → Variables tab
# Add ALL of these variables:

# ┌── COPY THESE TO RAILWAY VARIABLES ──┐

PROJECT_NAME=Loqo AI Studio
API_V1_STR=/api/v1

# MongoDB Atlas (REQUIRED - update with your connection string)
MONGODB_URL=mongodb+srv://biplab-loqo:biplabloqo%40123@loqocluster.g5s4hiu.mongodb.net/?appName=loqocluster
MONGODB_DB_NAME=loqo_db

# Google OAuth (REQUIRED)
GOOGLE_CLIENT_ID=621612224489-34b6rsceovl3jad7re8uoul724t3rhgr.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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

# IMPORTANT: Update this after you get your Vercel URL
GOOGLE_REDIRECT_URI=https://YOUR-VERCEL-APP.vercel.app/auth/callback

# JWT (REQUIRED)
SECRET_KEY=y487264hkjqwhhirfuiy23i8yriufsakjhfkuyu3u
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
REFRESH_TOKEN_EXPIRE_DAYS=7

# CORS - IMPORTANT: Add your Vercel frontend URL here
# Update after you know your Vercel URL
BACKEND_CORS_ORIGINS=https://YOUR-VERCEL-APP.vercel.app,http://localhost:3000

# Railway auto-sets PORT, no need to set it manually

# └─────────────────────────────────────┘

# ── Step 3: Railway Settings ──────────────────────────────────────────
# In Railway Dashboard → Service → Settings:
#   • Root Directory:    backend
#   • Start Command:     uvicorn app.main:app --host 0.0.0.0 --port $PORT
#   • Watch Paths:       /backend/**
#   • Health Check Path: /health
#   • Generate Domain:   Click "Generate Domain" to get your public URL

# ── Step 4: Get Your Railway URL ──────────────────────────────────────
# After deploy, your backend will be at:
#   https://YOUR-PROJECT.up.railway.app
#
# Test it:
#   curl https://YOUR-PROJECT.up.railway.app/health
#   → {"status":"healthy"}
#
#   Open in browser: https://YOUR-PROJECT.up.railway.app/docs
#   → FastAPI Swagger UI


# ┌─────────────────────────────────────────────────────────────────────┐
# │  PART 2: FRONTEND ON VERCEL                                        │
# └─────────────────────────────────────────────────────────────────────┘

# ── Step 1: Import to Vercel ──────────────────────────────────────────
# Go to https://vercel.com → Add New Project → Import Git Repository
#
# Vercel will auto-detect the vercel.json configuration.
# It is configured to:
#   • Framework:         Next.js
#   • Build Command:     cd frontend && npm run build
#   • Output Directory:  frontend/.next
#   • Install Command:   cd frontend && npm install

# ── Step 2: Set Vercel Environment Variables ──────────────────────────
# Go to Vercel Dashboard → Your Project → Settings → Environment Variables
# Add these for ALL environments (Production, Preview, Development):

# ┌── COPY THESE TO VERCEL ENV VARS ────┐

NEXT_PUBLIC_API_URL=https://YOUR-PROJECT.up.railway.app/api/v1
NEXT_PUBLIC_GOOGLE_CLIENT_ID=621612224489-34b6rsceovl3jad7re8uoul724t3rhgr.apps.googleusercontent.com
NEXT_PUBLIC_STATIC_URL=https://YOUR-PROJECT.up.railway.app/static

# └─────────────────────────────────────┘

# ── Step 3: Deploy ────────────────────────────────────────────────────
# Vercel will auto-deploy on git push, or click "Deploy" in dashboard.


# ┌─────────────────────────────────────────────────────────────────────┐
# │  PART 3: POST-DEPLOYMENT CHECKLIST                                 │
# └─────────────────────────────────────────────────────────────────────┘

# After both are deployed, you need to do these steps:

# ── A. Update Railway CORS with actual Vercel URL ─────────────────────
# Railway Dashboard → Variables → Update:
#   BACKEND_CORS_ORIGINS=https://your-actual-app.vercel.app,http://localhost:3000
#   GOOGLE_REDIRECT_URI=https://your-actual-app.vercel.app/auth/callback

# ── B. Update Vercel ENV with actual Railway URL ──────────────────────
# Vercel Dashboard → Settings → Environment Variables → Update:
#   NEXT_PUBLIC_API_URL=https://your-actual-backend.up.railway.app/api/v1
#   NEXT_PUBLIC_STATIC_URL=https://your-actual-backend.up.railway.app/static

# ── C. Update Google OAuth Console ────────────────────────────────────
# Go to: https://console.cloud.google.com/apis/credentials
# Edit your OAuth 2.0 Client ID and add:
#
# Authorized JavaScript Origins:
#   https://your-actual-app.vercel.app
#
# Authorized Redirect URIs:
#   https://your-actual-app.vercel.app/auth/callback

# ── D. Redeploy Both ─────────────────────────────────────────────────
# After updating env vars, redeploy both services:
#   • Railway: Will auto-redeploy when env vars change
#   • Vercel:  Go to Deployments → Redeploy (or push a commit)


# ┌─────────────────────────────────────────────────────────────────────┐
# │  PART 4: TESTING                                                    │
# └─────────────────────────────────────────────────────────────────────┘

# 1. Backend Health:
#    curl https://YOUR-BACKEND.up.railway.app/health
#    Expected: {"status":"healthy"}

# 2. Backend API Docs:
#    Open: https://YOUR-BACKEND.up.railway.app/docs

# 3. Frontend:
#    Open: https://YOUR-APP.vercel.app
#    Expected: Landing page loads

# 4. Login Flow:
#    Click Login → Google OAuth → Should redirect back to dashboard

# 5. API Connection:
#    Open browser console on frontend → Network tab
#    Verify API calls go to Railway URL, not localhost


# ┌─────────────────────────────────────────────────────────────────────┐
# │  PART 5: LOCAL DEVELOPMENT                                         │
# └─────────────────────────────────────────────────────────────────────┘

# For local dev, create these .env files:

# ── frontend/.env.local ──────────────────────────────────────────────
# NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
# NEXT_PUBLIC_GOOGLE_CLIENT_ID=621612224489-34b6rsceovl3jad7re8uoul724t3rhgr.apps.googleusercontent.com
# NEXT_PUBLIC_STATIC_URL=http://localhost:8000/static

# ── backend/.env ─────────────────────────────────────────────────────
# PROJECT_NAME=Loqo AI Studio
# API_V1_STR=/api/v1
# BACKEND_CORS_ORIGINS=http://localhost:3000,http://localhost:3001
# MONGODB_URL=mongodb://localhost:27017
# MONGODB_DB_NAME=loqo_db
# GOOGLE_CLIENT_ID=621612224489-34b6rsceovl3jad7re8uoul724t3rhgr.apps.googleusercontent.com
# GOOGLE_CLIENT_SECRET=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
# GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback
# SECRET_KEY=y487264hkjqwhhirfuiy23i8yriufsakjhfkuyu3u
# ALGORITHM=HS256
# ACCESS_TOKEN_EXPIRE_MINUTES=1440
# REFRESH_TOKEN_EXPIRE_DAYS=7

# ── Run locally ──────────────────────────────────────────────────────
# Terminal 1 (Backend):
#   cd backend
#   pip install -r requirements.txt
#   uvicorn app.main:app --reload --port 8000
#
# Terminal 2 (Frontend):
#   cd frontend
#   npm install
#   npm run dev


# ┌─────────────────────────────────────────────────────────────────────┐
# │  QUICK REFERENCE: FILE STRUCTURE                                    │
# └─────────────────────────────────────────────────────────────────────┘
#
# Root repo (pushed to GitHub)
# ├── vercel.json              ← Vercel reads this (frontend config)
# ├── .vercelignore            ← Tells Vercel to skip backend/
# ├── frontend/                ← Deployed to Vercel
# │   ├── package.json
# │   ├── next.config.mjs
# │   ├── .env.example
# │   └── ...
# ├── backend/                 ← Deployed to Railway (root dir = backend/)
# │   ├── railway.json
# │   ├── nixpacks.toml
# │   ├── Procfile
# │   ├── requirements.txt
# │   ├── runtime.txt
# │   ├── .env.example
# │   └── app/
# └── demodata/                ← Served by backend as /static
