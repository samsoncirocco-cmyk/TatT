#!/bin/bash

# Complete Text Embeddings Migration Setup
# This script automates the entire migration process

set -e  # Exit on error

echo "======================================================================"
echo "🚀 Text Embeddings Migration - Complete Setup"
echo "======================================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Show SQL migration instructions
echo -e "${YELLOW}Step 1: Supabase Schema Migration${NC}"
echo "──────────────────────────────────────────────────────────────────────"
echo ""
echo "You need to run the following SQL in Supabase SQL Editor:"
echo ""
echo "1. Open: https://supabase.com/dashboard/project/yfcmysjmoehcyszvkxsr/sql/new"
echo "2. Copy/paste the contents of: src/db/migrations/002_migrate_to_text_embeddings.sql"
echo "3. Click 'Run'"
echo ""
echo -e "${YELLOW}Press ENTER when you've completed the SQL migration...${NC}"
read -r

# Step 2: Test with a small batch
echo ""
echo -e "${GREEN}Step 2: Testing with 5 artists${NC}"
echo "──────────────────────────────────────────────────────────────────────"
node scripts/migrate-to-text-embeddings.js --limit=5

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Test failed. Please check the errors above.${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Test successful!${NC}"
echo ""
echo -e "${YELLOW}Continue with full migration? (y/n)${NC}"
read -r response

if [[ "$response" != "y" ]]; then
    echo "Migration cancelled."
    exit 0
fi

# Step 3: Full migration
echo ""
echo -e "${GREEN}Step 3: Full Migration (all artists)${NC}"
echo "──────────────────────────────────────────────────────────────────────"
node scripts/migrate-to-text-embeddings.js

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Migration failed. Please check the errors above.${NC}"
    exit 1
fi

# Step 4: Summary
echo ""
echo "======================================================================"
echo -e "${GREEN}🎉 Migration Complete!${NC}"
echo "======================================================================"
echo ""
echo "Next steps:"
echo "  1. Test queries in the UI (Match Pulse)"
echo "  2. Verify search results are semantic (not just keyword-based)"
echo "  3. Monitor performance (queries should be <500ms)"
echo ""
echo "Documentation: docs/TEXT_EMBEDDINGS_MIGRATION.md"
echo ""
