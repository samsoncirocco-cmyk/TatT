#!/bin/bash
# Verification Script - Ensure Changes Propagate Correctly

echo "🔍 TatTester Change Propagation Verification"
echo "=============================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Check we're in the right directory
echo "Test 1: Checking directory..."
if [ -f "package.json" ] && [ -f "next.config.ts" ]; then
    echo -e "${GREEN}✅ In manama-next directory${NC}"
else
    echo -e "${RED}❌ Not in manama-next directory${NC}"
    exit 1
fi

# Test 2: Check Docker is running
echo ""
echo "Test 2: Checking Docker..."
if docker-compose ps | grep -q "Up"; then
    echo -e "${GREEN}✅ Docker container is running${NC}"
    DOCKER_RUNNING=true
else
    echo -e "${YELLOW}⚠️  Docker container is not running${NC}"
    echo "   Start with: docker-compose up dev"
    DOCKER_RUNNING=false
fi

# Test 3: Create test file
echo ""
echo "Test 3: Creating test file..."
TEST_FILE="VERIFY_TEST_$(date +%s).txt"
echo "Timestamp: $(date)" > "$TEST_FILE"
echo "This is a test file to verify changes propagate." >> "$TEST_FILE"
echo -e "${GREEN}✅ Created: $TEST_FILE${NC}"

# Test 4: Check Docker sees the file
if [ "$DOCKER_RUNNING" = true ]; then
    echo ""
    echo "Test 4: Checking if Docker sees test file..."
    if docker-compose exec -T dev ls "/app/$TEST_FILE" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Docker can see the file${NC}"

        # Verify content matches
        echo ""
        echo "Test 5: Verifying content matches..."
        LOCAL_CONTENT=$(cat "$TEST_FILE")
        DOCKER_CONTENT=$(docker-compose exec -T dev cat "/app/$TEST_FILE" 2>/dev/null)

        if [ "$LOCAL_CONTENT" = "$DOCKER_CONTENT" ]; then
            echo -e "${GREEN}✅ Content matches between Mac and Docker${NC}"
        else
            echo -e "${RED}❌ Content mismatch${NC}"
        fi
    else
        echo -e "${RED}❌ Docker cannot see the file${NC}"
    fi
else
    echo ""
    echo -e "${YELLOW}⏭️  Skipping Docker tests (container not running)${NC}"
fi

# Test 6: Check git status
echo ""
echo "Test 6: Checking git status..."
if git status > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Git repository is valid${NC}"

    # Show current branch
    BRANCH=$(git branch --show-current)
    echo "   Current branch: $BRANCH"

    if [ "$BRANCH" != "manama/next" ]; then
        echo -e "${YELLOW}   ⚠️  Not on manama/next branch${NC}"
    fi

    # Check for uncommitted changes
    if git diff-index --quiet HEAD --; then
        echo -e "${GREEN}   No uncommitted changes${NC}"
    else
        CHANGED_FILES=$(git status --short | wc -l | tr -d ' ')
        echo -e "${YELLOW}   ⚠️  $CHANGED_FILES files with uncommitted changes${NC}"
        echo "   Run 'git status' to see them"
    fi
else
    echo -e "${RED}❌ Not a git repository${NC}"
fi

# Test 7: Check connection to remote
echo ""
echo "Test 7: Checking GitHub connection..."
if git ls-remote origin > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Connected to GitHub${NC}"
    REMOTE=$(git remote get-url origin)
    echo "   Remote: $REMOTE"
else
    echo -e "${RED}❌ Cannot connect to GitHub${NC}"
fi

# Test 8: Check if local is in sync with remote
echo ""
echo "Test 8: Checking sync with remote..."
git fetch origin manama/next > /dev/null 2>&1
LOCAL=$(git rev-parse manama/next)
REMOTE=$(git rev-parse origin/manama/next)

if [ "$LOCAL" = "$REMOTE" ]; then
    echo -e "${GREEN}✅ Local branch is in sync with remote${NC}"
else
    AHEAD=$(git rev-list origin/manama/next..manama/next --count)
    BEHIND=$(git rev-list manama/next..origin/manama/next --count)

    if [ "$AHEAD" -gt 0 ]; then
        echo -e "${YELLOW}   ⚠️  You have $AHEAD unpushed commits${NC}"
        echo "   Push with: git push origin manama/next"
    fi

    if [ "$BEHIND" -gt 0 ]; then
        echo -e "${YELLOW}   ⚠️  Remote has $BEHIND new commits${NC}"
        echo "   Pull with: git pull origin manama/next"
    fi
fi

# Summary
echo ""
echo "=============================================="
echo "📊 Summary"
echo "=============================================="

echo ""
echo "Your change workflow:"
echo "1. Edit files on Mac → ${GREEN}Automatic${NC} → Docker sees changes"
echo "2. Commit changes → ${YELLOW}Manual${NC} → git commit -m 'message'"
echo "3. Push to GitHub → ${YELLOW}Manual${NC} → git push origin manama/next"
echo "4. Vercel deploys → ${GREEN}Automatic${NC} → Updates production"
echo "5. Pull on Computer B → ${YELLOW}Manual${NC} → git pull origin manama/next"

echo ""
echo "Quick commands:"
echo "  ${GREEN}git status${NC}                    - Check what changed"
echo "  ${GREEN}git add .${NC}                     - Stage all changes"
echo "  ${GREEN}git commit -m 'message'${NC}       - Save changes locally"
echo "  ${GREEN}git push origin manama/next${NC}   - Send to GitHub + Vercel"
echo "  ${GREEN}git pull origin manama/next${NC}   - Get changes on other computer"

# Cleanup
echo ""
echo "🧹 Cleanup..."
rm "$TEST_FILE"
echo -e "${GREEN}✅ Removed test file${NC}"

echo ""
echo "✅ Verification complete!"
echo ""
echo "See CHANGE_WORKFLOW.md for detailed documentation."
