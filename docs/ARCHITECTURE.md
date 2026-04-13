# Architecture

## Overview

Hermes Mission Control is a Next.js 16 web application that provides a command centre dashboard for the Hermes agent ecosystem. It reads from the Hermes home directory (`~/.hermes/`) and exposes a REST API for all operations.

---

## Technology Stack

| Layer          | Technology                                           |
|----------------|------------------------------------------------------|
| Framework      | Next.js 16 (App Router) + TypeScript strict          |
| Styling        | Tailwind CSS v4 + Radix UI primitives                |
| Data           | Direct file I/O on `~/.hermes/` + SQLite (memory)    |
| API            | RESTful routes under `/api/`                         |
| State          | React hooks (no external state management)           |
| Fonts          | Literata, EB Garamond, Lora, Merriweather            |
| LLM            | Gateway API at `localhost:8642` (OpenAI-compatible)  |
| Testing        | Jest + Testing Library                               |

---

## Directory Structure

```
mission-control/
├── src/
│   ├── app/                          # Next.js App Router pages
│   │   ├── api/                      # REST API routes (25+ endpoints)
│   │   │   ├── agent/                # Behaviour files, env, AGENTS.md
│   │   │   ├── agents/               # Running agent detection
│   │   │   ├── config/               # config.yaml CRUD
│   │   │   ├── cron/                 # Cron job management
│   │   │   ├── gateway/              # Platform connection status
│   │   │   ├── logs/                 # Log reader
│   │   │   ├── memory/               # Holographic memory CRUD
│   │   │   ├── missions/             # Mission dispatch + health
│   │   │   ├── monitor/              # Aggregated system status
│   │   │   ├── personalities/        # Agent personality config
│   │   │   ├── sessions/             # Session browser
│   │   │   ├── skills/               # Skill file reader
│   │   │   ├── status/               # Health check
│   │   │   ├── stories/              # Story Weaver engine
│   │   │   ├── templates/            # Custom template CRUD
│   │   │   ├── tools/                # Toolset config per platform
│   │   │   └── update/               # Update checker + trigger
│   │   ├── agent/
│   │   │   ├── behaviour/            # Agent behaviour editor
│   │   │   └── tools/                # Tools manager
│   │   ├── config/                   # Config editor + per-section
│   │   ├── cron/                     # Cron manager UI
│   │   ├── gateway/                  # Gateway monitor UI
│   │   ├── logs/                     # Log viewer
│   │   ├── memory/                   # Memory CRUD UI
│   │   ├── missions/                 # Mission dispatch UI
│   │   ├── personalities/            # Personality manager UI
│   │   ├── recroom/                  # Rec Room (Story Weaver)
│   │   ├── sessions/                 # Session browser UI
│   │   ├── skills/                   # Skill browser UI
│   │   ├── page.tsx                  # Dashboard
│   │   └── layout.tsx                # Root layout + sidebar
│   ├── components/
│   │   ├── ui/                       # Reusable primitives
│   │   │   ├── AutoTextarea.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── CategoryAccordion.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── IntervalSelector.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── MissionTimeSelector.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── ProfileSelector.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── TemplateCard.tsx
│   │   │   ├── TimeoutSelector.tsx
│   │   │   └── Toast.tsx
│   │   ├── layout/
│   │   │   ├── MobileHeader.tsx
│   │   │   ├── PageHeader.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── SidebarContext.tsx
│   │   ├── memory/
│   │   │   └── HindsightBrowser.tsx   # Hindsight knowledge graph UI
│   │   └── story-weaver/
│   │       ├── ChapterList.tsx
│   │       ├── GenerateOverlay.tsx
│   │       ├── ReaderSettings.tsx
│   │       └── StoryCard.tsx
│   ├── lib/
│   │   ├── api.ts                    # Typed fetch wrappers
│   │   ├── api-logger.ts             # Error logging + safe JSON parsing
│   │   ├── hermes.ts                 # PATHS, HERMES_HOME, config readers
│   │   ├── utils.ts                  # Shared utilities
│   │   ├── theme.ts                  # Colour maps
│   │   ├── config-schema.ts          # Config section definitions
│   │   ├── behavior-files.ts         # Behaviour file metadata
│   │   ├── mission-helpers.ts        # Mission dispatch helpers
│   │   └── memory-providers/         # Memory provider abstraction layer
│   └── types/
│       └── hermes.ts                 # All TypeScript interfaces
├── config/
│   └── jest.setup.ts                 # Jest setup
├── docs/
│   ├── API.md                        # API reference
│   ├── ARCHITECTURE.md               # This file
│   ├── BRANCHING.md                  # Git branching strategy
│   └── CONTRIBUTING.md               # Contribution guide
├── hooks/
│   └── pre-push                      # Git pre-push hook
├── scripts/
│   ├── install.sh                    # One-command installer (fresh or reinstall)
│   ├── setup.sh                      # Post-clone setup (npm install, build, test)
│   ├── setup-hindsight.sh            # Standalone Hindsight memory installer
│   ├── restart.sh                    # Safe server restart (kill + start + health check)
│   ├── safe-restart.sh               # Minimal restart (kill + start)
│   ├── update.sh                     # Pull + npm install + build + profiles + restart
│   ├── backup-hermes-config.sh       # Config backup
│   └── hindsight-server.py           # Hindsight memory backend server
├── data/
│   ├── missions/                     # Mission JSON files
│   └── templates/                    # Custom template JSON files
├── screenshots/                      # README screenshots
└── .github/
    ├── workflows/
    │   ├── pr-check.yml              # Build + test on PRs to main
    │   └── branch-guard.yml          # Block direct pushes to main
    └── ISSUE_TEMPLATE/
        ├── bug_report.md
        └── feature_request.md
```

---

## Data Flow

```
Browser
  │
  ▼
Next.js App Router (src/app/)
  │
  ├── Pages (src/app/*/page.tsx)      ← React components with hooks
  │     │
  │     ▼
  │   fetch('/api/...')
  │
  └── API Routes (src/app/api/*/route.ts)
        │
        ├── Read: ~/.hermes/config.yaml, SOUL.md, etc.
        ├── Read: ~/.hermes/memory_store.db (SQLite)
        ├── Read: ~/.hermes/sessions/, logs/
        ├── Write: ~/mission-control/data/ (missions, templates, operations; `MC_DATA_DIR`)
        └── Gateway: localhost:8642 (LLM calls for Story Weaver)
```

**Key rule:** The app reads from `~/.hermes/` but NEVER writes to `config.yaml` directly — it uses the API endpoints which create backups before saving.

---

## Shared Utilities

### `src/lib/hermes.ts`

Central path definitions. All API routes import `PATHS` from here.

```typescript
export const PATHS = {
  config: HERMES_HOME + "/config.yaml",
  env: HERMES_HOME + "/.env",
  soul: HERMES_HOME + "/SOUL.md",
  // ... etc
}
```

### `src/lib/api-logger.ts`

- `logApiError(route, context, error)` — standardised error logging
- `safeJsonParse(text)` — parse JSON without throwing
- `safeReadJsonFile(path)` — read + parse JSON file safely

### `src/lib/utils.ts`

- `parseSchedule(schedule)` — parse cron/interval expressions
- `timeAgo(date)` — human-readable relative time
- `timeUntil(date)` — countdown to future time
- `formatBytes(bytes)` — human-readable file size
- `messageSummary(messages)` — summarise session messages

---

## Design Principles

1. **Command centre, not a file manager** — operator opens the dashboard and instantly knows what's running, what's healthy, what needs attention. 1-2 clicks to dispatch.

2. **Dark-first aesthetic** — base `#030712`, neon accents (cyan, purple, pink, green, orange). Information-dense but scannable.

3. **No external state management** — all state via React hooks (`useState`, `useEffect`, `useCallback`). No Redux, Zustand, or similar.

4. **Auto-refresh** — dashboard and status pages poll every 10 seconds via `useAutoRefresh` hook.

5. **TypeScript strict** — no `any`, no `@ts-ignore`. All types defined in `src/types/hermes.ts`.

6. **API envelope** — every route returns `{ data?, error? }`. Frontend extracts `.data`.

---

## Testing

```bash
npm test              # Run full suite
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

Test files live in `src/__tests__/`:

| File                     | Covers                      |
|--------------------------|-----------------------------|
| `utils.test.ts`          | Utility functions           |
| `hermes.test.ts`         | Config parsing, paths       |
| `api-memory.test.ts`     | Memory API routes           |
| `api-monitor.test.ts`    | Monitor API route           |
| `missions-api.test.ts`   | Mission dispatch API        |
| `templates-api.test.ts`  | Template CRUD API           |
| `profiles.test.ts`       | Agent profile management    |
| `prompt-builder.test.ts` | Story Weaver prompt builder |
| `update.test.ts`         | Update mechanism            |
| `setup.test.ts`          | Jest setup verification     |

---

## Hindsight Integration

Hindsight is a knowledge graph memory provider. Mission Control integrates via a Python bridge script.

**Architecture:**

```
Browser → /api/memory/hindsight → Next.js API route
                                      │
                                      ▼
                                child_process.exec()
                                      │
                                      ▼
                           ~/.hermes/scripts/hindsight_bridge.py
                                      │
                                      ▼
                           Hindsight server (PostgreSQL + pgvector)
```

**Key files:**
- `src/app/api/memory/hindsight/route.ts` — API route (GET for list/recall/reflect, POST for retain)
- `src/components/memory/HindsightBrowser.tsx` — React UI component
- `scripts/setup-hindsight.sh` — Installation script
- `scripts/hindsight-server.py` — Backend server (runs on port 8888)

**Supported actions:** `list`, `recall`, `reflect`, `retain`, `directives`, `mental-models`, `health`

The bridge script is invoked via `child_process.exec()` with a 15-second timeout. If Hindsight is unavailable, the API returns `{ data: { available: false, memories: [] } }` rather than throwing.

**Bridge script location (Hermes home):** Implementation is `HERMES_HOME/scripts/hindsight_bridge.py` (installed with Hermes, not vendored in this repo). Read that file and the installed `hindsight` package to see which subcommands invoke the LLM or embeddings vs database-only work. In typical setups, `recall` and `reflect` route model calls through the gateway (`localhost:8642`); `list` may be storage-only depending on version. The long-running server ([`scripts/hindsight-server.py`](scripts/hindsight-server.py)) exposes HTTP `http://127.0.0.1:8888/health` (see [`scripts/setup-hindsight.sh`](scripts/setup-hindsight.sh)); the Mission Control route does not call that URL directly—it always goes through the bridge executable.

**Memory UI:** [`HindsightBrowser`](src/components/memory/HindsightBrowser.tsx) loads the memory list only when the user runs **Recall** (`action=recall`). It calls `action=health` when a recall response indicates the backend is unavailable or on recall failure.

**Debugging gateway / Nous load:** Correlate timestamps in `HERMES_HOME/logs/gateway.log` with (1) Mission Control requests to `/api/memory/hindsight` and `/api/stories`, (2) Hermes agent and gateway traffic. Provider-side “sessions” or billing metrics reflect LLM usage, not the count of Hermes session files under `HERMES_HOME/sessions/` (those files are produced by the agent stack when recording is enabled, not by opening the Memory page).

---

## CI/CD

### GitHub Actions

- **pr-check.yml** — Runs `npm ci`, `npm run build`, `npm test` on every PR targeting `main`.
- **branch-guard.yml** — Blocks direct pushes to `main` (only merge commits allowed).

### Pre-push Hook

Local hook at `hooks/pre-push` prevents direct pushes to `main`. Install with:

```bash
cp hooks/pre-push .git/hooks/pre-push
```
