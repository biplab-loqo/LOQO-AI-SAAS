#!/bin/bash
set -e

echo "=== Git Push Setup Script ==="
echo ""

# Check if repo exists
echo "Checking repository access..."
if gh repo view biplab-loqo/LOQO-AI-SAAS >/dev/null 2>&1; then
    echo "✓ Repository exists and accessible"
    
    # Try to push
    echo "Pushing to GitHub..."
    if git push -u origin main; then
        echo "✓ Successfully pushed to GitHub!"
        exit 0
    else
        echo "✗ Push failed with HTTPS, trying to fix..."
        
        # Try with gh CLI authentication
        echo "Using GitHub CLI to authenticate..."
        gh auth setup-git
        git push -u origin main
    fi
else
    echo "Repository not found or not accessible."
    echo "Creating repository..."
    gh repo create biplab-loqo/LOQO-AI-SAAS --public --source=. --remote=origin --push
fi

echo ""
echo "✓ All done! Changes pushed to GitHub."
