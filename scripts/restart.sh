#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Mission Control — Restart Script
# ═══════════════════════════════════════════════════════════════
# Safely stops and restarts the Mission Control web server.
# No git operations, no build — just a clean restart.
#
# Usage:
#   bash scripts/restart.sh
#
# Called by:
#   - update.sh (after git pull + build)
#   - POST /api/update { action: "restart" }
#
# NOTE: Uses plain & NOT nohup — nohup causes agent terminal freeze.
# ═══════════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$HOME/.hermes/logs/mc-restart.log"
PID_FILE="$HOME/.hermes/logs/mc-server.pid"

mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

cd "$APP_DIR"

# ── Stop Existing Server ─────────────────────────────────────
log "Stopping server on port 3000..."
fuser -k 3000/tcp 2>/dev/null || true
sleep 2

# Remove stale PID file
rm -f "$PID_FILE"

# ── Start Server ─────────────────────────────────────────────
log "Starting server on port 3000..."
# Use plain & — NOT nohup (causes agent terminal freeze)
node node_modules/next/dist/bin/next start -p 3000 -H 0.0.0.0 \
    >>"$LOG_FILE" 2>&1 &
SERVER_PID=$!
echo "$SERVER_PID" > "$PID_FILE"
log "Server started (PID $SERVER_PID)"

# ── Wait for Ready ───────────────────────────────────────────
for i in $(seq 1 15); do
    if curl -s -o /dev/null -w '' http://localhost:3000 2>/dev/null; then
        log "Server is ready on http://localhost:3000"
        exit 0
    fi
    sleep 1
done

log "WARNING: Server may not be ready yet (timeout after 15s)"
exit 0
