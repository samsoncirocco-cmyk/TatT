#!/bin/bash

# TatTester Quick Start Script
# Run this after executing the Supabase SQL schema

set -e

echo "=========================================="
echo "🚀 TatTester Quick Start"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check environment variables
echo "📋 Step 1: Checking environment variables..."
echo ""

if [ -z "$GOOGLE_APPLICATION_CREDENTIALS" ]; then
    echo -e "${YELLOW}⚠️  GOOGLE_APPLICATION_CREDENTIALS not set${NC}"
    echo "   Run: export GOOGLE_APPLICATION_CREDENTIALS=./gcp-service-account-key.json"
    echo ""
else
    echo -e "${GREEN}✅ GOOGLE_APPLICATION_CREDENTIALS set${NC}"
fi

if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found${NC}"
    echo "   Create it with your Supabase and GCP credentials"
    echo ""
else
    echo -e "${GREEN}✅ .env file exists${NC}"
fi

echo ""

# Step 2: Verify Supabase schema
echo "=========================================="
echo "📊 Step 2: Verifying Supabase Schema"
echo "=========================================="
echo ""

if command -v node &> /dev/null; then
    echo "Running verification..."
    npm run supabase:verify
else
    echo -e "${RED}❌ Node.js not found${NC}"
    exit 1
fi

echo ""

# Step 3: Test GCP services
echo "=========================================="
echo "🔥 Step 3: Testing GCP Services"
echo "=========================================="
echo ""

if [ -z "$GOOGLE_APPLICATION_CREDENTIALS" ]; then
    echo -e "${YELLOW}⚠️  Skipping GCP test (credentials not set)${NC}"
    echo "   Set credentials first: export GOOGLE_APPLICATION_CREDENTIALS=./gcp-service-account-key.json"
else
    echo "Running GCP health check..."
    npm run gcp:health
fi

echo ""

# Summary
echo "=========================================="
echo "✅ Quick Start Complete!"
echo "=========================================="
echo ""
echo "📚 Next Steps:"
echo "   1. Start dev server: npm run dev"
echo "   2. Start backend: npm run server"
echo "   3. Read docs: .context/EXECUTION_CHECKLIST.md"
echo ""
echo "🎯 What You Can Do Now:"
echo "   - Generate designs with Gemini + Imagen"
echo "   - Store designs with multi-layer support"
echo "   - Upload to Cloud Storage"
echo "   - Match artists with vector search"
echo ""
echo "📖 Documentation:"
echo "   - Setup Guide: .context/EXECUTION_CHECKLIST.md"
echo "   - Supabase: scripts/SUPABASE_SETUP.md"
echo "   - Quick Ref: .context/READY_TO_EXECUTE.md"
echo ""
echo "🚀 Happy coding!"
echo ""
