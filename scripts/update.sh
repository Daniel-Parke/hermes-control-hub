#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Mission Control — Deploy Script
# ═══════════════════════════════════════════════════════════════
# Safely pulls latest code from main, rebuilds, and restarts.
#
# Usage:
#   bash scripts/update.sh [--restart-only]
#
# This script is designed to be called by the update API endpoint.
# It handles: git pull, npm install, build, and restart.
#
# Safety:
#   - Lock file prevents concurrent deploys
#   - Build failure aborts without restart
#   - Atomic git operations (reset --hard origin/main)
# ═══════════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
LOCK_FILE="/tmp/mc-deploy.lock"
LOG_FILE="$HOME/.hermes/logs/mc-update.log"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# ── Lock Guard ────────────────────────────────────────────────
cleanup() {
    rm -f "$LOCK_FILE"
}
trap cleanup EXIT

if [ -f "$LOCK_FILE" ]; then
    LOCK_PID=$(cat "$LOCK_FILE" 2>/dev/null)
    if [ -n "$LOCK_PID" ] && kill -0 "$LOCK_PID" 2>/dev/null; then
        log "ERROR: Deploy already running (PID $LOCK_PID)"
        exit 1
    fi
    log "WARNING: Stale lock file found, removing"
    rm -f "$LOCK_FILE"
fi
echo $$ > "$LOCK_FILE"

# ── Parse Arguments ──────────────────────────────────────────
RESTART_ONLY=false
if [ "${1:-}" = "--restart-only" ]; then
    RESTART_ONLY=true
fi

cd "$APP_DIR"

# ── Git Update ───────────────────────────────────────────────
if [ "$RESTART_ONLY" = false ]; then
    log "Fetching latest from origin/main..."
    git fetch origin main --quiet 2>>"$LOG_FILE"

    log "Checking out main branch..."
    git checkout main --quiet 2>>"$LOG_FILE"

    log "Resetting to origin/main..."
    git reset --hard origin/main --quiet 2>>"$LOG_FILE"

    log "Code updated to $(git rev-parse --short HEAD)"

    # ── Dependencies ───────────────────────────────────────────
    if git diff --name-only HEAD@{1} HEAD 2>/dev/null | grep -q "package-lock.json\|package.json"; then
        log "package.json changed — running npm install..."
        npm install --prefer-offline 2>>"$LOG_FILE"
        log "Dependencies installed"
    else
        log "No dependency changes — skipping npm install"
    fi

    # ── Build ──────────────────────────────────────────────────
    log "Building production bundle..."
    if ! npm run build >>"$LOG_FILE" 2>&1; then
        log "ERROR: Build failed — aborting deploy"
        exit 1
    fi
    log "Build successful"
fi

# ── Restart Server ────────────────────────────────────────────
log "Restarting server..."
bash "$SCRIPT_DIR/restart.sh"
log "Update complete"
