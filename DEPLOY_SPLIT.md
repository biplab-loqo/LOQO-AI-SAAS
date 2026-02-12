# 🚀 Split Deployment Strategy

## Problem
Vercel's monorepo setup with Next.js middleware + FastAPI backend causes persistent `MIDDLEWARE_INVOCATION_FAILED` errors due to routing conflicts.

## Solution: Deploy Separately

### ✅ Frontend → Vercel (Current)
- Already configured in `vercel.json`
- Middleware removed (auth handled client-side via `ProtectedRoute` component)
- Will auto-deploy on git push

### ✅ Backend → Railway (Recommended)

#### Why Railway?
- ✅ Native Python/FastAPI support
- ✅ Persistent storage for static files
- ✅ Free tier available
- ✅ MongoDB Atlas compatible
- ✅ Automatic HTTPS
- ✅ Simple deployment

---

## 🔥 Deploy Backend to Railway

### Step 1: Install Railway CLI
```bash
npm i -g @railway/cli
# or
brew install railway
```

### Step 2: Login
```bash
railway login
```

### Step 3: Initialize Railway Project
```bash
cd backend
railway init
```

### Step 4: Set Environment Variables
```bash
railway variables set MONGODB_URL="mongodb+srv://biplab-loqo:biplabloqo%40123@loqocluster.g5s4hiu.mongodb.net/?appName=loqocluster"
railway variables set MONGODB_DB_NAME="loqo_db"
railway variables set GOOGLE_CLIENT_ID="621612224489-34b6rsceovl3jad7re8uoul724t3rhgr.apps.googleusercontent.com"
railway variables set GOOGLE_CLIENT_SECRET="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"
railway variables set SECRET_KEY="y487264hkjqwhhirfuiy23i8yriufsakjhfkuyu3u"
railway variables set ALGORITHM="HS256"
railway variables set ACCESS_TOKEN_EXPIRE_MINUTES="1440"
railway variables set REFRESH_TOKEN_EXPIRE_DAYS="7"
railway variables set PROJECT_NAME="Loqo AI Studio"
railway variables set API_V1_STR="/api/v1"
```

### Step 5: Create `railway.json` in backend/
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "uvicorn app.main:app --host 0.0.0.0 --port $PORT",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Step 6: Create `Procfile` in backend/
```
web: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### Step 7: Deploy
```bash
railway up
```

### Step 8: Get Your Backend URL
```bash
railway domain
```

You'll get something like: `https://your-project.up.railway.app`

---

## 🔗 Connect Frontend to Backend

### Update Frontend Environment Variables

1. **Local Development** - Update `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=https://your-project.up.railway.app/api/v1
NEXT_PUBLIC_GOOGLE_CLIENT_ID=621612224489-34b6rsceovl3jad7re8uoul724t3rhgr.apps.googleusercontent.com
```

2. **Vercel Production** - Add to Vercel dashboard:
```env
NEXT_PUBLIC_API_URL=https://your-project.up.railway.app/api/v1
NEXT_PUBLIC_GOOGLE_CLIENT_ID=621612224489-34b6rsceovl3jad7re8uoul724t3rhgr.apps.googleusercontent.com
```

### Update Backend CORS

Update `backend/.env` or Railway env vars:
```env
BACKEND_CORS_ORIGINS=https://loqo-saas.vercel.app,http://localhost:3000
GOOGLE_REDIRECT_URI=https://loqo-saas.vercel.app/auth/callback
```

---

## ✅ Testing Checklist

After deployment:

- [ ] **Backend Health**: Visit `https://your-project.up.railway.app/health`
  - Should return: `{"status":"healthy"}`

- [ ] **Backend API Docs**: Visit `https://your-project.up.railway.app/docs`
  - Should show FastAPI Swagger UI

- [ ] **Frontend**: Visit `https://loqo-saas.vercel.app`
  - Should load homepage

- [ ] **Auth Flow**: Click login on frontend
  - Should connect to Railway backend
  - Google OAuth should work

- [ ] **Static Files**: Check `https://your-project.up.railway.app/static/Characters/character.json`
  - Should serve files from demodata/

---

## 🎯 Alternative: Deploy Backend to Render.com

If you prefer Render over Railway:

### Step 1: Create `render.yaml` in project root
```yaml
services:
  - type: web
    name: loqo-backend
    env: python
    region: singapore
    buildCommand: "cd backend && pip install -r requirements.txt"
    startCommand: "cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT"
    envVars:
      - key: MONGODB_URL
        value: mongodb+srv://biplab-loqo:biplabloqo%40123@loqocluster.g5s4hiu.mongodb.net/?appName=loqocluster
      - key: MONGODB_DB_NAME
        value: loqo_db
      - key: GOOGLE_CLIENT_ID
        value: 621612224489-34b6rsceovl3jad7re8uoul724t3rhgr.apps.googleusercontent.com
      - key: GOOGLE_CLIENT_SECRET
        sync: false
      - key: SECRET_KEY
        generateValue: true
      - key: ALGORITHM
        value: HS256
```

### Step 2: Push to GitHub and connect Render
1. Go to https://render.com
2. New → Web Service
3. Connect your GitHub repo
4. Render will auto-detect `render.yaml`
5. Deploy!

---

## 📊 Comparison

| Platform | Pros | Cons | Best For |
|----------|------|------|----------|
| **Railway** | Easy CLI, auto HTTPS, good DX | Limited free tier | Quick deployment |
| **Render** | More free tier, auto-deploy | Slower cold starts | Production apps |
| **Fly.io** | Edge deployment, fast | Complex config | Global apps |
| **DigitalOcean App Platform** | Simple, stable | Less free tier | Stable production |

---

## 🚨 Important: Update Google OAuth

After deploying backend, update Google Cloud Console:

1. Go to: https://console.cloud.google.com/apis/credentials
2. Select OAuth Client ID
3. Add **Authorized Redirect URIs**:
   ```
   https://loqo-saas.vercel.app/auth/callback
   https://your-project.up.railway.app/auth/callback
   ```

---

## 💡 Pro Tip: Keep Backend URL in Sync

Create a script to update both .env files:

```bash
# update-backend-url.sh
#!/bin/bash
BACKEND_URL=$1

echo "NEXT_PUBLIC_API_URL=${BACKEND_URL}/api/v1" > frontend/.env.local
echo "BACKEND_CORS_ORIGINS=https://loqo-saas.vercel.app,http://localhost:3000" >> backend/.env

echo "✅ Updated frontend and backend configs with: $BACKEND_URL"
```

Usage:
```bash
chmod +x update-backend-url.sh
./update-backend-url.sh https://your-project.up.railway.app
```
