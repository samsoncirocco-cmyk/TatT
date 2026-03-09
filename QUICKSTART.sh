#!/usr/bin/env bash
# ============================================================
#  TatT — Demo Quickstart
#  Zero credentials needed. Runs entirely on mock data.
#  Designed for: Killua, YC reviewers, and any early tester.
# ============================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo -e "${BOLD}${CYAN}  ████████╗ █████╗ ████████╗████████╗${NC}"
echo -e "${BOLD}${CYAN}     ██╔══╝██╔══██╗╚══██╔══╝╚══██╔══╝${NC}"
echo -e "${BOLD}${CYAN}     ██║   ███████║   ██║      ██║   ${NC}"
echo -e "${BOLD}${CYAN}     ██║   ██╔══██║   ██║      ██║   ${NC}"
echo -e "${BOLD}${CYAN}     ██║   ██║  ██║   ██║      ██║   ${NC}"
echo -e "${BOLD}${CYAN}     ╚═╝   ╚═╝  ╚═╝   ╚═╝      ╚═╝   ${NC}"
echo ""
echo -e "${BOLD}  AI Tattoo Studio — Demo Mode${NC}"
echo -e "  No Firebase. No Replicate. No Supabase. Just vibes."
echo ""
echo "──────────────────────────────────────────────────────"

# ── 1. Node check ──────────────────────────────────────────
if ! command -v node &>/dev/null; then
  echo -e "${YELLOW}⚠  Node.js not found. Install from https://nodejs.org${NC}"
  exit 1
fi

NODE_VER=$(node --version | tr -d 'v' | cut -d. -f1)
if [ "$NODE_VER" -lt 18 ]; then
  echo -e "${YELLOW}⚠  Node.js 18+ required (you have $(node --version))${NC}"
  exit 1
fi
echo -e "${GREEN}✓  Node.js $(node --version)${NC}"

# ── 2. Install dependencies ────────────────────────────────
echo ""
echo "📦 Installing dependencies..."
npm install --legacy-peer-deps --silent
echo -e "${GREEN}✓  Dependencies installed${NC}"

# ── 3. Set up demo env ─────────────────────────────────────
echo ""
if [ ! -f .env.local ]; then
  echo "🔧 Copying demo environment file..."
  cp env.demo .env.local
  echo -e "${GREEN}✓  .env.local created from env.demo${NC}"
else
  # Make sure demo mode flags are on
  if grep -q "NEXT_PUBLIC_DEMO_MODE=true" .env.local; then
    echo -e "${GREEN}✓  Demo mode already active in .env.local${NC}"
  else
    echo -e "${YELLOW}⚠  .env.local exists but demo mode may be off — check NEXT_PUBLIC_DEMO_MODE${NC}"
  fi
fi

# ── 4. Start the dev server ────────────────────────────────
echo ""
echo "──────────────────────────────────────────────────────"
echo ""
echo -e "${BOLD}🚀 Starting TatT in demo mode...${NC}"
echo ""
echo -e "   Home:       ${CYAN}http://localhost:3000${NC}"
echo -e "   Generate:   ${CYAN}http://localhost:3000/generate${NC}"
echo -e "   Artists:    ${CYAN}http://localhost:3000/artists${NC}"
echo -e "   Demo tour:  ${CYAN}http://localhost:3000/demo${NC}"
echo -e "   Gallery:    ${CYAN}http://localhost:3000/gallery${NC}"
echo ""
echo -e "   ${YELLOW}Press Ctrl+C to stop${NC}"
echo ""
echo "──────────────────────────────────────────────────────"
echo ""

exec npx next dev --webpack
