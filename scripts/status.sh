#!/bin/bash
# Quick status: PORT listening, optional PID file.
set -e
PORT="${PORT:-3000}"
PID_FILE="${HOME}/.hermes/logs/mc-server.pid"
if command -v ss &>/dev/null; then
  ss -tlnp 2>/dev/null | grep -q ":$PORT " && echo "Port $PORT: LISTEN" || echo "Port $PORT: closed"
elif command -v lsof &>/dev/null; then
  lsof -i ":$PORT" 2>/dev/null | head -5 || echo "Port $PORT: closed"
else
  echo "Install ss or lsof for port check."
fi
if [[ -f "$PID_FILE" ]]; then
  echo "PID file: $(cat "$PID_FILE" 2>/dev/null) (may be stale)"
fi
