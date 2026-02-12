#!/bin/bash

# LOQO SaaS Deployment Validation Script
# Run this after deploying to Vercel to verify everything works

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    if [ $2 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $1"
    else
        echo -e "${RED}✗${NC} $1"
    fi
}

# Check if URL is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Please provide your Vercel deployment URL${NC}"
    echo "Usage: ./scripts/validate_deployment.sh https://your-app.vercel.app"
    exit 1
fi

DEPLOYMENT_URL=$1
echo -e "${YELLOW}Validating deployment at: $DEPLOYMENT_URL${NC}\n"

# Test 1: Health Check
echo "Testing backend health endpoint..."
if curl -sf "$DEPLOYMENT_URL/health" > /dev/null; then
    print_status "Backend health check" 0
else
    print_status "Backend health check" 1
    echo "  Check: $DEPLOYMENT_URL/health"
fi

# Test 2: API Documentation
echo "Testing API documentation..."
if curl -sf "$DEPLOYMENT_URL/docs" > /dev/null; then
    print_status "API documentation accessible" 0
else
    print_status "API documentation accessible" 1
    echo "  Check: $DEPLOYMENT_URL/docs"
fi

# Test 3: Frontend
echo "Testing frontend..."
if curl -sf "$DEPLOYMENT_URL" > /dev/null; then
    print_status "Frontend loading" 0
else
    print_status "Frontend loading" 1
    echo "  Check: $DEPLOYMENT_URL"
fi

# Test 4: Static Files
echo "Testing static file serving..."
if curl -sf "$DEPLOYMENT_URL/static/character.json" > /dev/null; then
    print_status "Static files serving" 0
else
    print_status "Static files serving" 1
    echo "  Check: $DEPLOYMENT_URL/static/character.json"
fi

# Test 5: API Endpoint
echo "Testing API endpoint..."
if curl -sf "$DEPLOYMENT_URL/api/v1/health" > /dev/null 2>&1 || curl -sf "$DEPLOYMENT_URL/health" > /dev/null; then
    print_status "API endpoint responding" 0
else
    print_status "API endpoint responding" 1
    echo "  Check: $DEPLOYMENT_URL/api/v1/health"
fi

echo -e "\n${YELLOW}Validation complete!${NC}\n"

# Checklist
echo -e "${YELLOW}Post-Deployment Checklist:${NC}"
echo "□ Set all environment variables in Vercel dashboard"
echo "□ Update Google OAuth redirect URIs with: $DEPLOYMENT_URL/auth/callback"
echo "□ Update BACKEND_CORS_ORIGINS with: $DEPLOYMENT_URL"
echo "□ Test Google login functionality"
echo "□ Seed database if needed (run locally with MongoDB Atlas URL)"
echo "□ Enable Vercel Analytics (optional)"
echo "□ Set up custom domain (optional)"

echo -e "\n${GREEN}Useful URLs:${NC}"
echo "Frontend:  $DEPLOYMENT_URL"
echo "API Docs:  $DEPLOYMENT_URL/docs"
echo "Health:    $DEPLOYMENT_URL/health"
echo "Static:    $DEPLOYMENT_URL/static/"
