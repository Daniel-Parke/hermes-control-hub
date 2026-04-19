#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Control Hub — Install Script
# ═══════════════════════════════════════════════════════════════
# One-command installer for Control Hub (Hermes Control Hub OSS).
# Handles fresh install, re-install, optional Hermes bootstrap (two-pass), and Hindsight.
#
# Usage:
#   cd <repo> && bash scripts/install.sh
#   # Or standalone (auto-clones); INSTALL_DIR defaults to ~/control-hub:
#   bash install.sh
#
# Environment (non-interactive / CI / VPS):
#   CH_INSTALL_NONINTERACTIVE=1  or  CI=1
#     Requires either a working `hermes` on PATH, or:
#     INSTALL_HERMES=yes   — run upstream Hermes install + `hermes setup`, then exit (re-run this script after)
#     INSTALL_HERMES=no    — continue without Hermes CLI (limited profile/gateway steps)
#   INSTALL_HERMES_SKIP_RECONFIRM=1 — with INSTALL_HERMES=yes, skip second confirmation (automation only)
#
# Hermes two-pass: if you choose to install Hermes when prompted, this script runs the official
# installer and `hermes setup`, then exits — run install.sh again to finish Control Hub setup.
#
# Override: INSTALL_DIR=/path/to/hub bash scripts/install.sh
# Prerequisites: Node.js 18+, git. Hermes recommended (see prompts).
# ═══════════════════════════════════════════════════════════════

set -e

REPO_URL="${REPO_URL:-https://github.com/Daniel-Parke/hermes-control-hub.git}"
INSTALL_DIR="${INSTALL_DIR:-$HOME/control-hub}"
BRANCH="${BRANCH:-main}"

SCRIPT_PATH="${BASH_SOURCE[0]:-$0}"
SCRIPT_REPO_ROOT="$(cd "$(dirname "$SCRIPT_PATH")/.." && pwd -P)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}ℹ${NC}  $*"; }
ok()    { echo -e "${GREEN}✓${NC}  $*"; }
warn()  { echo -e "${YELLOW}⚠${NC}  $*"; }
fail()  { echo -e "${RED}✗${NC}  $*"; exit 1; }

hermes_cli_ok() {
  command -v hermes &>/dev/null && hermes --version &>/dev/null
}

noninteractive() {
  [[ "${CI:-}" == "1" || "${CH_INSTALL_NONINTERACTIVE:-}" == "1" ]]
}

HERMES_HOME="${HERMES_HOME:-$HOME/.hermes}"
HERMES_INSTALL_URL="https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   Control Hub — Installer                 ║"
echo "╚══════════════════════════════════════════╝"
echo ""

if ! command -v node &>/dev/null; then
    fail "Node.js not found. Install Node.js 18+ first: https://nodejs.org"
fi
NODE_MAJOR=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 18 ]; then
    fail "Node.js 18+ required (found $(node -v))"
fi
ok "Node.js $(node -v)"

# ── Hermes CLI: optional install (two-pass) or continue without ───────────
if ! hermes_cli_ok; then
    if noninteractive; then
        case "${INSTALL_HERMES:-}" in
            yes|YES|1|true|True)
                info "Installing Hermes (non-interactive)..."
                curl -fsSL "$HERMES_INSTALL_URL" | bash
                hermes setup || warn "hermes setup exited non-zero — complete setup manually, then re-run this script"
                echo ""
                ok "Hermes install step finished."
                echo ""
                echo "════════════════════════════════════════════════════════════"
                echo "  Next: open a new terminal if \`hermes\` is not on PATH, then run:"
                echo "    bash $(basename "$SCRIPT_PATH")"
                echo "  (from your Control Hub repo or re-download install.sh)"
                echo "  Full path hint: $SCRIPT_PATH"
                echo "════════════════════════════════════════════════════════════"
                exit 0
                ;;
            no|NO|0|false|False)
                warn "Hermes CLI not found; continuing without Hermes. Profile creation and some Hermes steps will be skipped."
                ;;
            *)
                fail "Non-interactive install: set INSTALL_HERMES=yes (install Hermes then exit) or INSTALL_HERMES=no (continue without Hermes CLI), or preinstall Hermes on PATH."
                ;;
        esac
    else
        while true; do
            read -p "Hermes CLI not found. Install Hermes now? [Y/n]: " -r REPLY_H
            echo ""
            if [[ "$REPLY_H" =~ ^[Nn]$ ]]; then
                warn "Continuing without Hermes. Some steps will be skipped. Install Hermes later and re-run this script for full setup."
                break
            fi
            read -p "This will require running install.sh again once Hermes install has completed. Continue? [Y/n]: " -r REPLY_C
            echo ""
            if [[ "$REPLY_C" =~ ^[Nn]$ ]]; then
                info "Back to Hermes install offer."
                continue
            fi
            info "Running official Hermes installer..."
            curl -fsSL "$HERMES_INSTALL_URL" | bash
            info "Running hermes setup..."
            hermes setup || warn "hermes setup exited non-zero — complete setup manually if needed"
            echo ""
            ok "Hermes install step finished."
            echo ""
            echo "════════════════════════════════════════════════════════════"
            echo "  Re-run this script to finish Control Hub setup:"
            echo "    bash scripts/install.sh"
            echo "  (from your repo clone, or the path you used to start the installer)"
            echo "════════════════════════════════════════════════════════════"
            exit 0
        done
    fi
fi

if hermes_cli_ok && [ -f "$HERMES_HOME/config.yaml" ]; then
    ok "Hermes config found at $HERMES_HOME/config.yaml"
elif hermes_cli_ok; then
    warn "Hermes CLI present but no $HERMES_HOME/config.yaml yet — run \`hermes setup\` if the dashboard misbehaves."
else
    warn "Proceeding without Hermes CLI — Hermes-specific steps will be skipped."
fi

if ! command -v git &>/dev/null; then
    fail "git not found. Install git first."
fi

# ── Handle Existing Installation ─────────────────────────────
if [ -d "$INSTALL_DIR" ]; then
    echo ""
    warn "Existing installation found at $INSTALL_DIR"
    EXISTING_ABS="$(cd "$INSTALL_DIR" && pwd -P)"
    if [ "$SCRIPT_REPO_ROOT" = "$EXISTING_ABS" ]; then
        echo ""
        fail "Cannot reinstall in place: this script lives inside $INSTALL_DIR.

Use an in-place update instead:
  cd $INSTALL_DIR && git pull origin $BRANCH && bash scripts/setup.sh

Or remove the directory manually from another path, then run this installer again."
    fi
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
info "Cloning Control Hub..."
if ! git clone --branch "$BRANCH" --single-branch "$REPO_URL" "$INSTALL_DIR" 2>&1; then
    fail "Clone failed. Check your internet connection and try again."
fi
ok "Cloned to $INSTALL_DIR"

# ── Enable Gateway API Server ────────────────────────────────
if hermes_cli_ok && [ -f "$HERMES_HOME/config.yaml" ]; then
    if [ ! -f "$HERMES_HOME/.env" ] || ! grep -q "API_SERVER_ENABLED=true" "$HERMES_HOME/.env" 2>/dev/null; then
        info "Enabling gateway API server for Rec Room..."
        mkdir -p "$HERMES_HOME"
        echo "" >> "$HERMES_HOME/.env"
        echo "# Enable API server for Control Hub Rec Room" >> "$HERMES_HOME/.env"
        echo "API_SERVER_ENABLED=true" >> "$HERMES_HOME/.env"
        ok "API server enabled"
    fi
else
    info "Skipping Hermes gateway .env tweak (Hermes not fully configured)."
fi

cd "$INSTALL_DIR"
if [ ! -f "scripts/setup.sh" ]; then
    fail "setup.sh not found after clone"
fi
bash scripts/setup.sh

# ── Create agent profiles (Hermes) ───────────────────────────
if hermes_cli_ok && [ -f "$HERMES_HOME/config.yaml" ]; then
    echo ""
    info "Setting up Control Hub agent profiles..."
    PROFILE_TEMPLATES="$INSTALL_DIR/scripts/profiles"
    PROFILES=("qa-engineer" "devops-engineer" "swe-engineer")
    for profile in "${PROFILES[@]}"; do
        PROFILE_DIR="$HERMES_HOME/profiles/$profile"
        if [ -d "$PROFILE_DIR" ]; then
            ok "Profile '$profile' already exists"
        else
            info "Creating profile: $profile"
            hermes profile create "$profile" --clone --no-alias 2>/dev/null || true
            if [ -f "$PROFILE_TEMPLATES/$profile/SOUL.md" ]; then
                cp "$PROFILE_TEMPLATES/$profile/SOUL.md" "$PROFILE_DIR/SOUL.md"
            fi
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
else
    info "Skipping Hermes profile bootstrap (no Hermes CLI or config). Re-run install.sh after Hermes is ready."
fi

# ── Optional: Hindsight Memory Setup ─────────────────────────
echo ""
echo "════════════════════════════════════════════════════════════"
echo "  Memory Provider Setup (Optional)"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "  Hindsight provides long-term memory with semantic search"
echo "  using a knowledge graph. Requires PostgreSQL + ~2GB disk."
echo ""
echo "  If your Hermes memory provider already differs, see docs: OSS_SCOPE.md,"
echo "  HERMES_CONFIG_INTEGRATION.md — this script will not overwrite your config."
echo ""

HINDSIGHT_ALREADY=false
if [ -f "$HERMES_HOME/hindsight/config.json" ]; then
    if curl -s --max-time 3 http://127.0.0.1:8888/health 2>/dev/null | grep -q healthy; then
        ok "Hindsight already configured and running"
        HINDSIGHT_ALREADY=true
    fi
fi

if [ "$HINDSIGHT_ALREADY" = false ]; then
    if noninteractive; then
        case "${INSTALL_HINDSIGHT:-auto}" in
            yes|YES|1|true|True)
                if [ -f "$INSTALL_DIR/scripts/setup-hindsight.sh" ]; then
                    bash "$INSTALL_DIR/scripts/setup-hindsight.sh" || warn "Hindsight setup encountered issues"
                else
                    warn "setup-hindsight.sh not found — skipping"
                fi
                ;;
            no|NO|0|false|False)
                info "Skipping Hindsight (INSTALL_HINDSIGHT=no)"
                ;;
            *)
                info "Skipping Hindsight prompt (non-interactive). Set INSTALL_HINDSIGHT=yes|no to control."
                ;;
        esac
    else
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
                echo "  Set up later with: bash $INSTALL_DIR/scripts/setup-hindsight.sh"
            fi
        else
            info "Skipping Hindsight — set up later with:"
            echo "  bash $INSTALL_DIR/scripts/setup-hindsight.sh"
        fi
    fi
fi

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   Installation Complete!                  ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "Start the server:"
echo "  cd $INSTALL_DIR"
echo "  npm run start:network"
echo ""
ok "Install complete. Start the server with: cd $INSTALL_DIR && npm run start:network"
