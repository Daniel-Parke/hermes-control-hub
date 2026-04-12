#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Mission Control — Safe Restart
# ═══════════════════════════════════════════════════════════════
# Minimal restart script with no dependencies on nohup.
# Safe for both manual use and agent terminal tool.
#
# Usage:
#   bash scripts/safe-restart.sh
# ═══════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$HOME/.hermes/logs/mc-restart.log"

mkdir -p "$(dirname "$LOG_FILE")"

# Stop (fuser on Linux; lsof fallback on macOS)
stop_port_3000() {
    if command -v fuser &>/dev/null; then
        fuser -k 3000/tcp 2>/dev/null || true
    elif command -v lsof &>/dev/null; then
        for pid in $(lsof -ti:3000 2>/dev/null); do
            kill -9 "$pid" 2>/dev/null || true
        done
    fi
}
stop_port_3000
sleep 2

# Start — plain & only, no nohup
cd "$APP_DIR"
node node_modules/next/dist/bin/next start -p 3000 -H 0.0.0.0 \
    >>"$LOG_FILE" 2>&1 &
echo "Started (PID $!)"

# Wait for ready
for i in $(seq 1 15); do
    if curl -s -o /dev/null http://localhost:3000 2>/dev/null; then
        echo "Ready: http://localhost:3000"
        exit 0
    fi
    sleep 1
done

echo "Warning: server may need a moment"
