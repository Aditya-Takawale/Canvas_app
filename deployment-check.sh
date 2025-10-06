#!/bin/bash
# Quick deployment preparation script for Unix/Linux/Mac

echo "🚀 Canvas App Deployment Preparation"
echo "====================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the Canvas_app root directory"
    exit 1
fi

echo "📋 Pre-deployment checklist:"

# 1. Check Git status
echo "📁 Checking Git status..."
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  You have uncommitted changes. Please commit them before deployment."
    git status --short
else
    echo "✅ Git working directory is clean"
fi

# 2. Check if environment files exist
echo "🔧 Checking environment configurations..."
files=(
    "frontend/.env.production.example"
    "backend/.env.production.example"
    "vercel.json"
    "railway.json"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file missing"
    fi
done

# 3. Check package.json scripts
echo "📦 Checking backend package.json scripts..."
if [ -f "backend/package.json" ]; then
    scripts=("start" "build" "postinstall" "db:deploy")
    for script in "${scripts[@]}"; do
        if jq -e ".scripts.\"$script\"" backend/package.json > /dev/null 2>&1; then
            echo "✅ Script '$script' exists"
        else
            echo "❌ Script '$script' missing"
        fi
    done
else
    echo "❌ backend/package.json not found"
fi

# 4. Check database schema
echo "🗄️  Checking database configuration..."
if [ -f "backend/prisma/schema.prisma" ]; then
    if grep -q 'provider = "postgresql"' backend/prisma/schema.prisma; then
        echo "✅ Database configured for PostgreSQL"
    else
        echo "⚠️  Database still configured for SQLite. Update for production."
    fi
else
    echo "❌ Prisma schema not found"
fi

echo ""
echo "🎯 Next Steps:"
echo "1. Commit all changes: git add . && git commit -m 'Prepare for deployment'"
echo "2. Push to GitHub: git push origin main"
echo "3. Set up Railway PostgreSQL database"
echo "4. Deploy backend to Railway"
echo "5. Deploy frontend to Vercel"
echo "6. Configure environment variables"
echo ""
echo "📖 See DEPLOYMENT-GUIDE.md for detailed instructions"