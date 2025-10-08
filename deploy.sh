#!/bin/bash

# SkillForge One-Click Deployment Script
# Deploys to Vercel with Neon database

set -e

echo "🚀 SkillForge Deployment Script"
echo "================================"

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo "⚠️  .env.production not found"
    echo "📋 Copy .env.production.example and fill in your values:"
    echo "   cp .env.production.example .env.production"
    exit 1
fi

echo ""
echo "📦 Building locally to verify..."
npm run build

echo ""
echo "🔍 Checking database connection..."
if ! npx prisma db push --skip-generate; then
    echo "⚠️  Database connection failed. Make sure DATABASE_URL is correct."
    exit 1
fi

echo ""
echo "✅ Pre-flight checks passed!"
echo ""
echo "🚀 Deploying to Vercel..."
echo "   (You'll be prompted to link your project on first run)"
echo ""

# Deploy to production
vercel --prod

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Post-deployment checklist:"
echo "   1. Update GitHub OAuth callback URL with your Vercel domain"
echo "   2. Update NEXTAUTH_URL in Vercel environment variables"
echo "   3. Run seed script: DATABASE_URL=\$PROD_URL npx tsx prisma/seed-achievements.ts"
echo "   4. Test login and AI generation"
echo ""
echo "🔗 Manage deployment: https://vercel.com/dashboard"
