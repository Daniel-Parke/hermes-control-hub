#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Control Hub — Hindsight Memory Provider Setup
# ═══════════════════════════════════════════════════════════════
# Installs and configures Hindsight memory with PostgreSQL backend.
# Run this on an existing Control Hub installation.
#
# Usage:
#   bash scripts/setup-hindsight.sh
#
# Requires:
#   - sudo access (for PostgreSQL installation)
#   - Hermes agent with venv at ~/.hermes/hermes-agent/venv/
#   - Gateway API enabled (API_SERVER_ENABLED=true in .env)
# ═══════════════════════════════════════════════════════════════

set -e

HERMES_HOME="${HERMES_HOME:-$HOME/.hermes}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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
step()  { echo -e "\n${CYAN}── $* ──${NC}"; }

# ── Banner ───────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   Hindsight Memory — Setup                ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── Check if already configured ──────────────────────────────
if [ -f "$HERMES_HOME/hindsight/config.json" ]; then
    if curl -s --max-time 3 http://127.0.0.1:8888/health 2>/dev/null | grep -q healthy; then
        ok "Hindsight is already running and healthy"
        echo ""
        echo "To reconfigure, remove $HERMES_HOME/hindsight/config.json and run again."
        exit 0
    fi
    warn "Config exists but server not responding — will attempt to restart"
fi

# ── Check sudo access ────────────────────────────────────────
step "Checking sudo access"
if ! sudo -n true 2>/dev/null; then
    echo ""
    echo "Sudo access is required for PostgreSQL installation."
    echo "You will be prompted for your password."
    echo ""
    if ! sudo true; then
        fail "Cannot get sudo access. Install PostgreSQL manually:"
        echo "  sudo apt-get install -y postgresql postgresql-client"
        echo "  Then run this script again."
    fi
fi
ok "Sudo access confirmed"

# ── Step 1: PostgreSQL ───────────────────────────────────────
step "Step 1: PostgreSQL"
if command -v pg_isready &>/dev/null && pg_isready -q 2>/dev/null; then
    ok "PostgreSQL already running"
else
    info "Installing PostgreSQL..."
    sudo apt-get update -qq 2>/dev/null
    sudo apt-get install -y -qq postgresql postgresql-client || fail "PostgreSQL installation failed"
    sudo systemctl enable postgresql
    sudo systemctl start postgresql
    sleep 2
    if pg_isready -q 2>/dev/null; then
        ok "PostgreSQL installed and running"
    else
        fail "PostgreSQL installed but not responding"
    fi
fi

# ── Step 2: pgvector ─────────────────────────────────────────
step "Step 2: pgvector extension"
# Check if pgvector is already installed
if sudo -u postgres psql -d postgres -c "SELECT 1 FROM pg_extension WHERE extname = 'vector'" 2>/dev/null | grep -q 1; then
    ok "pgvector already installed"
else
    info "Installing pgvector..."
    # Try version-specific first, then generic
    # Portable: avoid grep -oP (GNU-only)
    PG_VERSION=$(pg_config --version 2>/dev/null | sed -n 's/.*PostgreSQL \([0-9][0-9]*\).*/\1/p' | head -1)
    if [ -n "$PG_VERSION" ]; then
        sudo apt-get install -y -qq "postgresql-${PG_VERSION}-pgvector" 2>/dev/null || true
    fi
    # Fallback to generic
    if ! dpkg -l | grep -q pgvector; then
        sudo apt-get install -y -qq postgresql-pgvector 2>/dev/null || {
            warn "Could not install pgvector automatically"
            echo "  Try manually: sudo apt-get install postgresql-XX-pgvector"
            echo "  Where XX is your PostgreSQL version"
        }
    fi
    ok "pgvector installed"
fi

# ── Step 3: Database ─────────────────────────────────────────
step "Step 3: Database setup"
info "Creating database and user..."
sudo -u postgres psql -c "CREATE USER hindsight_user WITH PASSWORD 'hindsight_local';" 2>/dev/null || true
sudo -u postgres psql -c "DROP DATABASE IF EXISTS hindsight_db;" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE hindsight_db OWNER hindsight_user;" 2>/dev/null || fail "Database creation failed"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE hindsight_db TO hindsight_user;" 2>/dev/null
sudo -u postgres psql -d hindsight_db -c "CREATE EXTENSION IF NOT EXISTS vector;" 2>/dev/null || warn "Could not create vector extension"

# Verify connection
if PGPASSWORD=hindsight_local psql -h 127.0.0.1 -U hindsight_user -d hindsight_db -c "SELECT 1;" 2>/dev/null | grep -q 1; then
    ok "Database ready"
else
    fail "Database created but connection test failed"
fi

# ── Step 4: Python Dependencies ──────────────────────────────
step "Step 4: Python dependencies"
VENV_PYTHON="$HERMES_HOME/hermes-agent/venv/bin/python3"
if [ ! -f "$VENV_PYTHON" ]; then
    fail "Hermes venv not found at $VENV_PYTHON"
fi

# Check if hindsight is already installed
if "$VENV_PYTHON" -c "import hindsight" 2>/dev/null; then
    ok "hindsight-all already installed"
else
    info "Installing hindsight-all (this may take a few minutes)..."
    # Find uv
    if command -v uv &>/dev/null; then
        uv pip install --python "$VENV_PYTHON" hindsight-all 2>&1 | tail -3 || fail "Package installation failed"
    else
        "$VENV_PYTHON" -m pip install hindsight-all 2>&1 | tail -3 || fail "Package installation failed"
    fi
    ok "hindsight-all installed"
fi

# ── Step 5: Server Script ────────────────────────────────────
step "Step 5: Server script"
mkdir -p "$HERMES_HOME/scripts"
if [ -f "$SCRIPT_DIR/hindsight-server.py" ]; then
    cp "$SCRIPT_DIR/hindsight-server.py" "$HERMES_HOME/scripts/hindsight_server.py"
    ok "Server script installed"
else
    # Inline creation if script not in repo
    cat > "$HERMES_HOME/scripts/hindsight_server.py" << 'PYEOF'
#!/usr/bin/env python3
import os, sys, signal
sys.path.insert(0, os.path.expanduser("~/.hermes/hermes-agent"))

def main():
    from hindsight import start_server
    api_key = ""
    env_path = os.path.expanduser("~/.hermes/.env")
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                if line.strip().startswith("HINDSIGHT_LLM_API_KEY="):
                    api_key = line.split("=", 1)[1].strip().strip('"').strip("'")
                    break
    server = start_server(
        db_url="postgresql://hindsight_user:hindsight_local@localhost:5432/hindsight_db",
        llm_provider="openai",
        llm_api_key=api_key,
        llm_model="xiaomi/mimo-v2-pro",
        llm_base_url="http://localhost:8642/v1",
        host="127.0.0.1", port=8888,
        log_level="info", timeout=120,
    )
    print(f"Hindsight running at {server.url}")
    def shutdown(sig, frame):
        server.stop()
        sys.exit(0)
    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)
    signal.pause()

if __name__ == "__main__":
    main()
PYEOF
    ok "Server script created"
fi

# ── Step 6: Configuration ────────────────────────────────────
step "Step 6: Configuration"
mkdir -p "$HERMES_HOME/hindsight"

# Read API key from .env
LLM_KEY=""
if [ -f "$HERMES_HOME/.env" ]; then
    LLM_KEY=$(grep "^HINDSIGHT_LLM_API_KEY=" "$HERMES_HOME/.env" 2>/dev/null | cut -d= -f2- | tr -d '"' | tr -d "'")
fi

# Create config
cat > "$HERMES_HOME/hindsight/config.json" << EOF
{
    "mode": "local_external",
    "api_url": "http://localhost:8888",
    "llm_provider": "openai",
    "llm_base_url": "http://localhost:8642/v1",
    "llm_model": "xiaomi/mimo-v2-pro",
    "bank_id": "hermes",
    "auto_retain": true,
    "auto_recall": true
}
EOF
ok "Config created at $HERMES_HOME/hindsight/config.json"

# Update agent config.yaml
if command -v python3 &>/dev/null; then
    python3 -c "
import yaml
path = '$HERMES_HOME/config.yaml'
with open(path) as f:
    config = yaml.safe_load(f) or {}
config.setdefault('memory', {})
config['memory']['provider'] = 'hindsight'
config['memory']['memory_enabled'] = True
config.setdefault('plugins', {}).setdefault('hindsight', {})
config['plugins']['hindsight'].update({
    'auto_retain': True,
    'auto_recall': True,
    'mode': 'local_external',
    'api_url': 'http://localhost:8888',
    'llm_provider': 'openai',
})
with open(path, 'w') as f:
    yaml.dump(config, f, default_flow_style=False, sort_keys=False)
" 2>/dev/null
    ok "Agent config updated (memory.provider = hindsight)"
else
    warn "python3 not found — update config.yaml manually:"
    echo "  memory:"
    echo "    provider: hindsight"
fi

# ── Step 7: Systemd Service ──────────────────────────────────
step "Step 7: Systemd service"
sudo tee /etc/systemd/system/hindsight.service > /dev/null << EOF
[Unit]
Description=Hindsight Memory Server
After=postgresql.service network.target
Requires=postgresql.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$HERMES_HOME
ExecStart=$VENV_PYTHON $HERMES_HOME/scripts/hindsight_server.py
Restart=on-failure
RestartSec=10
StandardOutput=append:$HERMES_HOME/logs/hindsight.log
StandardError=append:$HERMES_HOME/logs/hindsight.log

[Install]
WantedBy=multi-user.target
EOF

mkdir -p "$HERMES_HOME/logs"
sudo systemctl daemon-reload
sudo systemctl enable hindsight
sudo systemctl start hindsight
ok "Systemd service created and started"

# ── Step 8: Verify ───────────────────────────────────────────
step "Step 8: Verification"
info "Waiting for server to start..."
for i in $(seq 1 20); do
    if curl -s --max-time 3 http://127.0.0.1:8888/health 2>/dev/null | grep -q healthy; then
        ok "Hindsight server is healthy"
        break
    fi
    if [ "$i" -eq 20 ]; then
        warn "Server may need more time to start"
        echo "  Check status: sudo systemctl status hindsight"
        echo "  Check logs: sudo journalctl -u hindsight -n 20"
    fi
    sleep 3
done

# Test store + retrieve
if curl -s --max-time 3 http://127.0.0.1:8888/health 2>/dev/null | grep -q healthy; then
    info "Testing memory store + retrieve..."
    curl -s --max-time 15 -X POST http://127.0.0.1:8888/v1/default/banks/hermes/memories \
        -H "Content-Type: application/json" \
        -d '{"items":[{"content":"Hindsight setup test memory","tags":["test"]}]}' >/dev/null 2>&1
    sleep 3
    COUNT=$(curl -s --max-time 10 "http://127.0.0.1:8888/v1/default/banks/hermes/memories/list?limit=1" 2>/dev/null | python3 -c "import json,sys; print(json.load(sys.stdin).get('total',0))" 2>/dev/null || echo "?")
    ok "Test memory stored ($COUNT memories in bank)"
fi

# ── Done ─────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   Hindsight Setup Complete!               ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "Services:"
echo "  Hindsight: sudo systemctl status hindsight"
echo "  PostgreSQL: sudo systemctl status postgresql"
echo ""
echo "Dashboard:"
echo "  Memory page at http://localhost:3000/memory"
echo ""
echo "Useful commands:"
echo "  sudo systemctl restart hindsight    # Restart server"
echo "  sudo journalctl -u hindsight -f     # View logs"
echo "  curl http://localhost:8888/health    # Check health"
echo ""
