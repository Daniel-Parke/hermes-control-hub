#!/bin/bash
# Stop Control Hub Next.js server on PORT (default 3000).
set -e
PORT="${PORT:-3000}"
if command -v fuser &>/dev/null; then
  fuser -k "${PORT}/tcp" 2>/dev/null || true
elif command -v lsof &>/dev/null; then
  for pid in $(lsof -ti:"$PORT" 2>/dev/null); do
    kill -9 "$pid" 2>/dev/null || true
  done
else
  echo "Install fuser (psmisc) or lsof to stop the server." >&2
  exit 1
fi
echo "Stopped listeners on port $PORT"
