#!/bin/bash
# Auto-Import Pipeline
# ==========================================
# 
# Monitors validator completion and automatically imports to Neo4j
#
# Usage:
#   bash src/scripts/data_acquisition/auto_import.sh

set -e

echo "========================================="
echo "Auto-Import Pipeline"
echo "========================================="
echo ""

# Wait for validator to complete
echo "[1/3] Waiting for validator to complete..."
while pgrep -f "production_validator.js" > /dev/null; do
    sleep 30
    echo "  Validator still running... (checking every 30s)"
done

echo "✅ Validator completed!"
echo ""

# Brief pause
sleep 5

# Check if verified artists file exists
VERIFIED_FILE="src/scripts/data_acquisition/output/verified_artists_production.json"
if [ ! -f "$VERIFIED_FILE" ]; then
    echo "❌ Error: Verified artists file not found"
    exit 1
fi

# Count verified artists
ARTIST_COUNT=$(grep -o '"verified": true' "$VERIFIED_FILE" | wc -l | tr -d ' ')
echo "📊 Found $ARTIST_COUNT verified artists"
echo ""

# Check Neo4j connection
echo "[2/3] Checking Neo4j connection..."
if [ -z "$NEO4J_URI" ] || [ "$NEO4J_URI" = "bolt://localhost:7687" ]; then
    echo "⚠️  Warning: Neo4j URI not configured for Aura"
    echo ""
    echo "To import to Neo4j Aura:"
    echo "1. Get connection URI from: https://console.neo4j.io"
    echo "2. Update .env file:"
    echo "   NEO4J_URI=neo4j+s://xxxxx.databases.neo4j.io"
    echo "   NEO4J_USER=neo4j"
    echo "   NEO4J_PASSWORD=your_password"
    echo "3. Run: node src/scripts/data_acquisition/import_to_neo4j.js"
    echo ""
    echo "Skipping Neo4j import for now."
    exit 0
fi

# Import to Neo4j
echo "[3/3] Importing to Neo4j Aura..."
node src/scripts/data_acquisition/import_to_neo4j.js

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================="
    echo "✅ IMPORT COMPLETE!"
    echo "========================================="
    echo "Verified artists: $ARTIST_COUNT"
    echo "Database: Neo4j Aura"
    echo "Next: View at /artists/1 in the app"
else
    echo ""
    echo "⚠️  Import failed. Check Neo4j credentials in .env"
fi
