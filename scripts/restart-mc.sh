#!/usr/bin/env bash
# Restart Mission Control production server on PORT (default 3000). Frees the port if something is already listening.
set -euo pipefail
PORT="${PORT:-3000}"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

if command -v fuser >/dev/null 2>&1; then
  fuser -k "${PORT}/tcp" 2>/dev/null || true
elif command -v lsof >/dev/null 2>&1; then
  pid="$(lsof -ti:"${PORT}" -sTCP:LISTEN || true)"
  if [[ -n "${pid}" ]]; then
    kill "${pid}" 2>/dev/null || true
  fi
fi
sleep 1

export MC_EDITION="${MC_EDITION:-simple}"
export NEXT_PUBLIC_MC_EDITION="${NEXT_PUBLIC_MC_EDITION:-$MC_EDITION}"

npm run start
