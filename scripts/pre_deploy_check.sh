#!/bin/bash

# Pre-deployment build test
# Run this locally to ensure everything builds correctly before deploying

set -e

echo "🔍 Pre-Deployment Build Test"
echo "=============================="
echo ""

# Test Frontend Build
echo "📦 Building frontend..."
cd frontend
if npm run build; then
    echo "✅ Frontend build successful"
else
    echo "❌ Frontend build failed"
    exit 1
fi
cd ..

# Test Backend
echo ""
echo "🐍 Testing backend..."
cd backend
if python -c "from app.main import app; print('✅ Backend imports successful')"; then
    echo "✅ Backend validated"
else
    echo "❌ Backend validation failed"
    exit 1
fi
cd ..

# Check for required files
echo ""
echo "📋 Checking deployment files..."
files_to_check=(
    "vercel.json"
    "backend/vercel.json"
    "backend/.python-version"
    "backend/requirements.txt"
    "frontend/package.json"
    "frontend/next.config.mjs"
    "demodata/character.json"
    ".vercelignore"
)

for file in "${files_to_check[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ Missing: $file"
        exit 1
    fi
done

echo ""
echo "🎉 All pre-deployment checks passed!"
echo ""
echo "Next steps:"
echo "1. Commit and push your changes to Git"
echo "2. Run: vercel --prod"
echo "3. Set environment variables in Vercel dashboard"
echo "4. Run validation: ./scripts/validate_deployment.sh YOUR_URL"
