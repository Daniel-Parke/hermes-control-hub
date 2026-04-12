#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Mission Control — Install Script
# ═══════════════════════════════════════════════════════════════
# One-command installer for Mission Control.
# Handles fresh install, re-install, and existing directory.
#
# Usage:
#   # From a clone:
#   cd mission-control && bash scripts/install.sh
#
#   # Or standalone (auto-clones):
#   bash install.sh
#
# Prerequisites:
#   - Node.js 18+
#   - Hermes agent installed at ~/.hermes/
# ═══════════════════════════════════════════════════════════════

set -e

REPO_URL="https://github.com/Daniel-Parke/hermes-mission-control.git"
INSTALL_DIR="$HOME/mission-control"
BRANCH="main"

# ── Helpers ──────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}ℹ${NC}  $*"; }
ok()    { echo -e "${GREEN}✓${NC}  $*"; }
warn()  { echo -e "${YELLOW}⚠${NC}  $*"; }
fail()  { echo -e "${RED}✗${NC}  $*"; exit 1; }

# ── Banner ───────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   Mission Control — Installer             ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── Check Node.js ────────────────────────────────────────────
if ! command -v node &>/dev/null; then
    fail "Node.js not found. Install Node.js 18+ first: https://nodejs.org"
fi
NODE_MAJOR=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 18 ]; then
    fail "Node.js 18+ required (found $(node -v))"
fi
ok "Node.js $(node -v)"

# ── Check Hermes ─────────────────────────────────────────────
HERMES_HOME="${HERMES_HOME:-$HOME/.hermes}"
if [ ! -f "$HERMES_HOME/config.yaml" ]; then
    fail "Hermes agent not found at $HERMES_HOME/config.yaml

Install Hermes first:
  hermes update
  or: https://github.com/NousResearch/hermes-agent"
fi
ok "Hermes config found"

# ── Check Git ────────────────────────────────────────────────
if ! command -v git &>/dev/null; then
    fail "git not found. Install git first."
fi

# ── Handle Existing Installation ─────────────────────────────
if [ -d "$INSTALL_DIR" ]; then
    echo ""
    warn "Existing installation found at $INSTALL_DIR"
    read -p "   Reinstall? This will DELETE the directory. (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        info "Removing existing installation..."
        rm -rf "$INSTALL_DIR"
        ok "Removed"
    else
        info "Using existing installation"
        cd "$INSTALL_DIR"
        if [ -f "scripts/setup.sh" ]; then
            info "Running setup in existing directory..."
            bash scripts/setup.sh
            echo ""
            ok "Setup complete! Start with: npm run start:network"
            exit 0
        else
            fail "setup.sh not found in $INSTALL_DIR — directory may be corrupted"
        fi
    fi
fi

# ── Clone Repository ─────────────────────────────────────────
echo ""
info "Cloning Mission Control..."
if ! git clone --branch "$BRANCH" --single-branch "$REPO_URL" "$INSTALL_DIR" 2>&1; then
    fail "Clone failed. Check your internet connection and try again."
fi
ok "Cloned to $INSTALL_DIR"

# ── Enable Gateway API Server ────────────────────────────────
HERMES_HOME="${HERMES_HOME:-$HOME/.hermes}"
if ! grep -q "API_SERVER_ENABLED=true" "$HERMES_HOME/.env" 2>/dev/null; then
    info "Enabling gateway API server for Rec Room..."
    echo "" >> "$HERMES_HOME/.env"
    echo "# Enable API server for Mission Control Rec Room" >> "$HERMES_HOME/.env"
    echo "API_SERVER_ENABLED=true" >> "$HERMES_HOME/.env"
    ok "API server enabled"
fi

# ── Run Setup ────────────────────────────────────────────────
cd "$INSTALL_DIR"
if [ ! -f "scripts/setup.sh" ]; then
    fail "setup.sh not found after clone"
fi
bash scripts/setup.sh

# ── Create Mission Control Agent Profiles ─────────────────────
echo ""
info "Setting up Mission Control agent profiles..."

HERMES_HOME="${HERMES_HOME:-$HOME/.hermes}"
MC_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PROFILE_TEMPLATES="$MC_DIR/scripts/profiles"

PROFILES=("mc-qa-engineer" "mc-devops-engineer" "mc-swe-engineer" "mc-data-engineer" "mc-data-scientist" "mc-ops-director" "mc-creative-lead" "mc-support-agent")

for profile in "${PROFILES[@]}"; do
    PROFILE_DIR="$HERMES_HOME/profiles/$profile"
    if [ -d "$PROFILE_DIR" ]; then
        ok "Profile '$profile' already exists"
    else
        info "Creating profile: $profile"
        # Create profile with config/env clone (shares API keys)
        if command -v hermes &>/dev/null; then
            hermes profile create "$profile" --clone --no-alias 2>/dev/null || true
        else
            # Fallback: manual directory creation
            mkdir -p "$PROFILE_DIR"/{memories,sessions,skills,skins,logs,plans,workspace,cron}
            # Copy config and env from default profile
            [ -f "$HERMES_HOME/config.yaml" ] && cp "$HERMES_HOME/config.yaml" "$PROFILE_DIR/config.yaml"
            [ -f "$HERMES_HOME/.env" ] && cp "$HERMES_HOME/.env" "$PROFILE_DIR/.env"
        fi
        # Write specialist SOUL.md and AGENTS.md
        if [ -f "$PROFILE_TEMPLATES/$profile/SOUL.md" ]; then
            cp "$PROFILE_TEMPLATES/$profile/SOUL.md" "$PROFILE_DIR/SOUL.md"
        fi
        # Copy auth.json for provider authentication
        if [ -f "$HERMES_HOME/auth.json" ]; then
            cp "$HERMES_HOME/auth.json" "$PROFILE_DIR/auth.json"
            chmod 600 "$PROFILE_DIR/auth.json"
        fi
        if [ -f "$PROFILE_TEMPLATES/$profile/AGENTS.md" ]; then
            cp "$PROFILE_TEMPLATES/$profile/AGENTS.md" "$PROFILE_DIR/AGENTS.md"
        fi
        ok "Profile '$profile' created"
    fi
done

ok "All agent profiles ready"

# ── Optional: Hindsight Memory Setup ─────────────────────────
echo ""
echo "════════════════════════════════════════════════════════════"
echo "  Memory Provider Setup (Optional)"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "  Hindsight provides long-term memory with semantic search"
echo "  using a knowledge graph. Requires PostgreSQL + ~2GB disk."
echo ""

# Check if already configured
HINDSIGHT_ALREADY=false
if [ -f "$HERMES_HOME/hindsight/config.json" ]; then
    if curl -s --max-time 3 http://127.0.0.1:8888/health 2>/dev/null | grep -q healthy; then
        ok "Hindsight already configured and running"
        HINDSIGHT_ALREADY=true
    fi
fi

if [ "$HINDSIGHT_ALREADY" = false ]; then
    read -p "  Set up Hindsight memory? [y/N]: " -n 1 -r SETUP_HINDSIGHT
    echo ""

    if [[ $SETUP_HINDSIGHT =~ ^[Yy]$ ]]; then
        echo ""
        if [ -f "$INSTALL_DIR/scripts/setup-hindsight.sh" ]; then
            bash "$INSTALL_DIR/scripts/setup-hindsight.sh" || {
                warn "Hindsight setup encountered issues"
                echo "  You can retry later with: bash $INSTALL_DIR/scripts/setup-hindsight.sh"
            }
        else
            warn "setup-hindsight.sh not found — skipping Hindsight setup"
            echo "  Set up later with: bash ~/mission-control/scripts/setup-hindsight.sh"
        fi
    else
        info "Skipping Hindsight — set up later with:"
        echo "  bash ~/mission-control/scripts/setup-hindsight.sh"
    fi
fi

# ── Done ─────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   Installation Complete!                  ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "Start the server:"
echo "  cd ~/mission-control"
echo "  npm run start:network"
echo ""
echo "Or start immediately (safe restart):"
cd "$INSTALL_DIR"
node node_modules/next/dist/bin/next start -p 3000 -H 0.0.0.0 \
    > /dev/null 2>&1 &
sleep 3
if curl -s -o /dev/null -w '' http://localhost:3000 2>/dev/null; then
    ok "Server running at http://localhost:3000"
else
    warn "Server may need a moment — try http://localhost:3000 in a few seconds"
fi
echo ""
