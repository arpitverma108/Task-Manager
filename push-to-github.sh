#!/bin/bash
# 🚀 Quick GitHub Push Script for Team Task Manager
# Run this from the project root directory

echo "🔍 Checking Git setup..."

# Check if git is initialized
if [ ! -d .git ]; then
    echo "❌ Git not initialized. Running: git init"
    git init
fi

# Check if .gitignore exists
if [ ! -f .gitignore ]; then
    echo "❌ .gitignore not found!"
    exit 1
fi

echo "✅ Git initialized"

# Check that .env is not staged
echo "🔐 Checking for secrets..."
if git ls-files | grep -E "\.env$|\.env\.production$" | grep -v example; then
    echo "❌ ERROR: .env file is staged! This will expose secrets!"
    echo "   Run: git reset HEAD .env"
    exit 1
fi

echo "✅ No .env files staged (secrets safe)"

# Add all files
echo "📝 Staging files..."
git add .

# Show what will be committed
echo "📋 Files to be committed:"
git status --short

# Verify no .env is in there
if git status --short | grep -E "\.env[^.a-z]|\.env$"; then
    echo "❌ WARNING: .env file in staged changes!"
    echo "   Run: git reset HEAD backend/.env"
    exit 1
fi

# Check if this is first commit
if git rev-parse --verify HEAD > /dev/null 2>&1; then
    echo "📝 Creating commit..."
    git commit -m "$(date '+Update: %Y-%m-%d %H:%M:%S')"
else
    echo "📝 Creating initial commit..."
    git commit -m "Initial commit: Team Task Manager"
fi

# Check remote
if git remote -v | grep -q origin; then
    echo "✅ Remote 'origin' configured"
    echo ""
    echo "🚀 Ready to push! Run:"
    echo "   git push -u origin main"
else
    echo "❌ Remote 'origin' not configured"
    echo ""
    echo "📌 First, create a repo on GitHub, then run:"
    echo "   git remote add origin https://github.com/YOUR_USERNAME/team-task-manager.git"
    echo "   git branch -M main"
    echo "   git push -u origin main"
fi

echo ""
echo "✅ Done!"
