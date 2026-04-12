# Hermes Mission Control

A command centre dashboard for [Hermes Agent](https://github.com/NousResearch/hermes-agent). Monitor your agent fleet, dispatch missions, manage configurations, and control everything from one place.

![Dashboard](screenshots/Hermes_Dashboard.png)

---

## Features

| Feature | Description |
|---------|-------------|
| **Dashboard** | Live stats, active missions, system health, collapsible mission dispatch |
| **Missions** | 29 built-in templates across 8 categories, with 8 specialist agent profiles |
| **Agent Profiles** | QA, DevOps, SWE, Data, Data Science, Ops, Creative, Support specialists |
| **Cron Manager** | Schedule, edit, and monitor recurring tasks (1m to 7d intervals) |
| **Agent Behaviour** | Profile-centric editor with personality selection, file editing per profile |
| **Config Editor** | Full config.yaml editing with 27 sections + HERMES.md + .env viewer |
| **Session Browser** | View conversation transcripts across all gateways |
| **Memory** | Hindsight (semantic search) or Holographic (structured facts) memory management |
| **Personalities** | Per-profile personality configuration (technical, analytical, creative, etc.) |
| **Skills Manager** | Profile-aware skills with inline toggle switches and content viewer |
| **Tools Manager** | Profile-aware toolsets with per-tool toggles per platform |
| **Gateway** | Monitor platform connections (Discord, Telegram, etc.) |
| **Logs** | Browse recent log entries for quick triage |
| **Story Weaver** | Collaborative AI fiction — create worlds, write chapters, build stories |

---

## Quick Start

```bash
# Clone and install
git clone https://github.com/Daniel-Parke/hermes-mission-control.git ~/mission-control
cd ~/mission-control
bash scripts/install.sh
```

The installer will:
1. Check prerequisites (Node.js 18+, Hermes agent)
2. Install dependencies and build
3. Create 8 specialist agent profiles
4. Optionally set up Hindsight memory (PostgreSQL + semantic search)

The dashboard will be available at `http://localhost:3000` (or `http://localhost:$PORT` if you set the `PORT` environment variable; Next.js reads `PORT` for `npm run dev` / `npm run start`).

### Resilience: Mission Control vs Hermes

- **Scheduled missions and cron jobs** live in Hermes’ `~/.hermes/cron/jobs.json`. Once written, the **Hermes** process (for example the gateway) **runs** them on its scheduler tick. The Mission Control web app is only an editor for that file plus local dashboard data under `~/.hermes/mission-control/data/`.
- If **Mission Control (Next.js) stops**, jobs **keep firing** as long as **Hermes** is still running.
- If **Hermes stops**, nothing runs until you start Hermes again—there is no separate scheduler inside Mission Control.

### Platforms

- **Linux / macOS / WSL2:** fully supported (same as Hermes).
- **Windows (native):** use **WSL2** for Hermes and Mission Control so paths align with `~/.hermes`. Native Windows Node is not a supported target for this stack.

### Security-related environment variables

| Variable | Purpose |
|----------|---------|
| `MC_API_KEY` | When set, mutating API routes require header `X-MC-API-Key` or `Authorization: Bearer <key>`. |
| `MC_READ_ONLY` | Set to `1` or `true` to reject writes (503). |
| `MC_ENABLE_DEPLOY_API` | Set to `false` to block `POST /api/update` even in development. In **production**, deploy is off unless you set this to `true`. |
| `MC_UPDATE_GIT_BRANCH` | Branch for git pull/reset (default `main`; use `dev` if that matches your workflow). |
| `MC_ALLOWED_DEV_ORIGINS` | Comma-separated origins allowed with Next dev (see `next.config.ts`). |

Audit-style events append JSON lines to `~/.hermes/logs/mc-audit.log`. See [.env.example](.env.example).

### Testing

```bash
npm test          # Jest (unit + integration-style route tests)
npm run build && npm run test:e2e   # Playwright smoke (uses production server on port 3000)
```

---

## Prerequisites

- **Node.js** 18+
- **Hermes Agent** with data under `~/.hermes/` (or set **`HERMES_HOME`** to match Hermes; Mission Control defaults to `path.join(os.homedir(), '.hermes')` in Node, same idea as Hermes). Run `hermes update` first.

### Optional: Hindsight Memory

For long-term memory with semantic search, install Hindsight during setup:

```bash
# During install — answer "y" when prompted
bash scripts/install.sh

# Or install on existing setup
bash scripts/setup-hindsight.sh
```

Hindsight requires:
- PostgreSQL with pgvector extension
- ~2GB disk for Python packages (PyTorch, transformers)
- Sudo access for PostgreSQL installation

---

## Memory Providers

Mission Control supports multiple memory backends:

| Provider | Type | Features | Setup |
|----------|------|----------|-------|
| **Hindsight** | Knowledge graph | Semantic search, reflection, entities, directives | `bash scripts/setup-hindsight.sh` |
| **Holographic** | SQLite | Structured facts, trust scoring, categories | `hermes plugins install hermes-memory-store` |
| **None** | — | No persistent memory | Default if nothing configured |

The dashboard automatically detects your configured provider and adapts the Memory page accordingly. If no provider is configured, it shows an informative notice.

---

## Agent Profiles

8 specialist profiles are created during install:

| Profile | Focus | Skills |
|---------|-------|--------|
| QA Engineer | Testing, bug reproduction | 75 enabled |
| DevOps Engineer | Infrastructure, CI/CD | 72 enabled |
| SWE Engineer | Software development | 74 enabled |
| Data Engineer | Pipelines, ETL | 74 enabled |
| Data Scientist | ML/AI research | 75 enabled |
| Ops Director | Operations, coordination | 85 enabled |
| Creative Lead | Content, design | 88 enabled |
| Support Agent | User support, triage | 74 enabled |

Each profile has its own SOUL.md, AGENTS.md, USER.md, MEMORY.md, and skill/tool configuration. All profiles share the main agent's API keys.

---

## Scripts

| Script | Purpose |
|--------|---------|
| `install.sh` | One-command installer (fresh or reinstall) |
| `setup.sh` | Post-clone setup (npm install, build, test) |
| `setup-hindsight.sh` | Standalone Hindsight memory installer |
| `restart.sh` | Safe server restart (kill port 3000, start, health check) |
| `safe-restart.sh` | Minimal restart (kill + start, no health check) |
| `update.sh` | Pull from main, npm install (if needed), build, update profiles, restart |
| `backup-hermes-config.sh` | Backup/restore Hermes config |
| `hindsight-server.py` | Hindsight memory backend server |

---

## Development

```bash
cd ~/mission-control

# Development (hot reload)
npm run dev

# Production build
npm run build

# Start production server
npm run start:network    # LAN accessible
npm run start            # localhost only

# Run tests
npm test
```

---

## Configuration

Mission Control reads from `~/.hermes/config.yaml` — it never writes to this file directly.

Key config sections:
- `memory.provider` — Memory backend (hindsight, holographic, none)
- `plugins.hindsight` — Hindsight server configuration
- `platform_toolsets` — Which tools are available per platform
- `skills.disabled` — Skills to exclude from the prompt

---

## Deployment

```bash
# 1. Build (must pass before deploy)
cd ~/mission-control && npm run build

# 2. Kill existing server
fuser -k 3000/tcp 2>/dev/null; sleep 2

# 3. Start server (use background=true in terminal tool — NEVER use nohup ... &)
node node_modules/next/dist/bin/next start -p 3000 -H 0.0.0.0
```

Or use the Update API for zero-downtime-style deploys:

```bash
# Check for updates
curl http://localhost:3000/api/update

# Trigger update (pull + build + restart)
curl -X POST http://localhost:3000/api/update \
  -H "Content-Type: application/json" \
  -d '{"action": "update"}'

# Restart only
curl -X POST http://localhost:3000/api/update \
  -H "Content-Type: application/json" \
  -d '{"action": "restart"}'
```

The update endpoint uses a lock file (`/tmp/mc-deploy.lock`) to prevent concurrent deploys. Build failures abort without restarting the server.

---

## API

All API routes follow the `{ data?, error? }` envelope pattern:

```typescript
// Success
{ data: { profiles: [...] } }

// Error
{ error: "Profile not found" }
```

Error logging: all catch blocks call `logApiError(route, context, error)`.

---

## Requirements

- Node.js 18+
- Hermes Agent installed at `~/.hermes/`
- (Optional) PostgreSQL + pgvector for Hindsight memory
- (Optional) Python 3.11 + venv for Hindsight

---

## Documentation

Full documentation lives in the `docs/` directory:

| Document | Description |
|----------|-------------|
| [API Reference](docs/API.md) | All REST endpoints with request/response formats |
| [Architecture](docs/ARCHITECTURE.md) | System design, data flow, directory structure |
| [Contributing](docs/CONTRIBUTING.md) | Development workflow, code standards, PR checklist |
| [Branching](docs/BRANCHING.md) | Git branching strategy and agent permissions |

---

## Architecture

```
mission-control/
├── src/
│   ├── app/                    # Next.js pages + API routes
│   │   ├── api/                # REST endpoints ({ data?, error? } envelope)
│   │   ├── agent/              # Behaviour, Tools pages
│   │   ├── skills/             # Skills manager
│   │   ├── memory/             # Memory browser (provider-aware)
│   │   ├── config/             # Config editor (27+ sections)
│   │   ├── missions/           # Mission dispatch + tracking
│   │   ├── cron/               # Cron job manager
│   │   ├── sessions/           # Session browser
│   │   └── recroom/            # Creative activities
│   ├── components/             # React components
│   │   ├── memory/             # HindsightBrowser, HolographicBrowser
│   │   ├── layout/             # Sidebar, PageHeader
│   │   └── ui/                 # Button, Card, Modal, Badge, etc.
│   ├── lib/                    # Shared utilities
│   │   ├── memory-providers/   # Memory provider abstraction layer
│   │   ├── config-schema.ts    # Config section definitions
│   │   ├── hermes.ts           # Path constants, config helpers
│   │   ├── jobs-repository.ts # Atomic jobs.json read/write (Hermes-compatible)
│   │   ├── path-security.ts    # Profile/skill path allowlisting
│   │   └── utils.ts            # timeAgo, formatBytes, parseSchedule
│   └── types/                  # TypeScript interfaces
├── scripts/                    # Shell scripts
│   ├── install.sh              # One-command installer (with optional Hindsight)
│   ├── setup.sh                # Post-clone setup (npm install, build)
│   ├── setup-hindsight.sh      # Standalone Hindsight installer
│   ├── restart.sh              # Safe server restart (no nohup)
│   ├── safe-restart.sh         # Minimal restart script
│   ├── update.sh               # Git pull + build + restart
│   └── backup-hermes-config.sh # Config backup
└── data/                       # Mission + template JSON files
```

---

## License

MIT
