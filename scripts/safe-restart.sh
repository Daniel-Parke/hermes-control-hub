#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Control Hub — Safe Restart
# ═══════════════════════════════════════════════════════════════
# Minimal restart script with no dependencies on nohup.
# Safe for both manual use and agent terminal tool.
#
# Usage:
#   bash scripts/safe-restart.sh
#   PORT=8080 bash scripts/safe-restart.sh
# ═══════════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
PORT="${PORT:-3000}"
LOG_FILE="$HOME/.hermes/logs/ch-restart.log"

mkdir -p "$(dirname "$LOG_FILE")"

# Stop (fuser on Linux; lsof fallback on macOS)
stop_server() {
    if command -v fuser &>/dev/null; then
        fuser -k "$PORT/tcp" 2>/dev/null || true
    elif command -v lsof &>/dev/null; then
        for pid in $(lsof -ti:"$PORT" 2>/dev/null); do
            kill -9 "$pid" 2>/dev/null || true
        done
    fi
}
stop_server
sleep 2

# Start — plain & only, no nohup
cd "$APP_DIR"
node node_modules/next/dist/bin/next start -p "$PORT" -H 0.0.0.0 \
    >>"$LOG_FILE" 2>&1 &
SERVER_PID=$!
echo "Started (PID $SERVER_PID, port $PORT)"

# Wait for ready
for i in $(seq 1 15); do
    if curl -s -o /dev/null "http://localhost:$PORT" 2>/dev/null; then
        echo "Ready: http://localhost:$PORT"
        exit 0
    fi
    # Check if process is still alive
    if ! kill -0 "$SERVER_PID" 2>/dev/null; then
        echo "Error: server process died (check $LOG_FILE)"
        exit 1
    fi
    sleep 1
done

echo "Warning: server may need a moment — try http://localhost:$PORT"
