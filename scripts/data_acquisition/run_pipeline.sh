#!/bin/bash
# Production Data Acquisition Pipeline
# ==========================================
# 
# This script orchestrates the full data acquisition process:
# 1. Crawl shops → 2. Validate artists → 3. Import to Neo4j
#
# Usage:
#   bash src/scripts/data_acquisition/run_pipeline.sh [--full|--test]

set -e  # Exit on error

# Colors for output
GREEN='\033[0.32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}TatT Data Acquisition Pipeline${NC}"
echo -e "${GREEN}========================================${NC}\n"

# Parse arguments
MODE=${1:-test}

if [ "$MODE" = "--full" ]; then
    echo -e "${YELLOW}Running in FULL mode (all 50 cities)${NC}"
    CRAWLER_LIMIT=""
elif [ "$MODE" = "--test" ]; then
    echo -e "${YELLOW}Running in TEST mode (100 shops)${NC}"
    CRAWLER_LIMIT="CRAWLER_TOTAL_LIMIT=100"
else
    echo -e "${RED}Invalid mode. Use --full or --test${NC}"
    exit 1
fi

# Check for required API keys
if [ -z "$GOOGLE_PLACES_API_KEY" ] && [ "$MODE" = "--full" ]; then
    echo -e "${YELLOW}Warning: GOOGLE_PLACES_API_KEY not set. Running in mock mode.${NC}"
fi

# Step 1: Run Crawler
echo -e "\n${GREEN}[1/3] Running Shop Crawler...${NC}"
$CRAWLER_LIMIT node src/scripts/data_acquisition/production_crawler.js

if [ $? -ne 0 ]; then
    echo -e "${RED}Crawler failed. Exiting.${NC}"
    exit 1
fi

# Step 2: Run Validator
echo -e "\n${GREEN}[2/3] Running AI Validator...${NC}"
node src/scripts/data_acquisition/production_validator.js

if [ $? -ne 0 ]; then
    echo -e "${RED}Validator failed. Exiting.${NC}"
    exit 1
fi

# Step 3: Import to Neo4j
echo -e "\n${GREEN}[3/3] Importing to Neo4j...${NC}"
VALIDATOR_INPUT=src/scripts/data_acquisition/output/verified_artists_production.json \
node src/scripts/data_acquisition/import_to_neo4j.js

if [ $? -ne 0 ]; then
    echo -e "${YELLOW}Neo4j import failed (database may not be running). Skipping.${NC}"
fi

# Summary
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Pipeline Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Results:"
echo -e "  - Raw data: src/scripts/data_acquisition/output/raw_artists_production.json"
echo -e "  - Verified: src/scripts/data_acquisition/output/verified_artists_production.json"
echo -e "  - Logs: src/scripts/data_acquisition/output/*.log"
echo -e "\n${YELLOW}Next steps:${NC}"
echo -e "  1. Review verified_artists_production.json"
echo -e "  2. Start Neo4j and re-run import if needed"
echo -e "  3. View GraphInsight component at /artists/1"
