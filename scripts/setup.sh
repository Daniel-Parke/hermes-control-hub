#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Mission Control — Setup Script
# ═══════════════════════════════════════════════════════════════
# Run this after cloning the repository to set up Mission Control.
#
# Usage:
#   cd mission-control
#   bash scripts/setup.sh
#
# Prerequisites:
#   - Node.js 18+
#   - Hermes agent installed at ~/.hermes/
# ═══════════════════════════════════════════════════════════════

set -e

echo "╔══════════════════════════════════════════╗"
echo "║       Mission Control — Setup             ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# Detect HERMES_HOME
HERMES_HOME="${HERMES_HOME:-$HOME/.hermes}"
echo "Hermes Home: $HERMES_HOME"

# Verify Hermes is installed
if [ ! -f "$HERMES_HOME/config.yaml" ]; then
    echo "⚠  config.yaml not found at $HERMES_HOME/config.yaml"
    echo "   Make sure Hermes agent is installed and configured."
    echo "   See: https://github.com/NousResearch/hermes-agent"
    exit 1
fi
echo "✓ Hermes config found"

# Check for holographic memory (optional)
echo ""
if [ -f "$HERMES_HOME/memory_store.db" ]; then
    echo "✓ Holographic memory detected"
else
    echo "ℹ  Holographic memory not found — Memory page will show an install notice."
    echo "   To enable: hermes plugins install hermes-memory-store"
fi

# Create data directories
echo ""
echo "Creating data directories..."
mkdir -p "$HERMES_HOME/mission-control/data/missions"
mkdir -p "$HERMES_HOME/mission-control/data/templates"
echo "✓ Data directories created at $HERMES_HOME/mission-control/data/"

# Install dependencies
echo ""
echo "Installing dependencies..."
npm install
echo "✓ Dependencies installed"

# Build
echo ""
echo "Building production bundle..."
npm run build
echo "✓ Build complete"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║       Setup Complete!                     ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "Start the server:"
echo "  npm run start          # localhost only"
echo "  npm run start:network  # accessible on LAN"
echo ""
echo "Or for development:"
echo "  npm run dev            # hot reload on localhost:3000"
echo ""
