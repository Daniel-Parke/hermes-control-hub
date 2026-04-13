# Architecture (OSS / Simple edition)

Command Hub (Hermes) is a Next.js 16 (App Router) application: a command centre for the Hermes agent ecosystem. It reads from `HERMES_HOME` (default `~/.hermes/`) and writes app JSON under **`CH_DATA_DIR`** (legacy **`CH_DATA_DIR`**). **This document describes the open-source tree** — only routes and pages present in this repository are guaranteed to exist; middleware blocks legacy or commercial URL prefixes at runtime.

Maintainers: the full private monorepo (export pipeline, commercial edition, installer two-pass flow) is documented in the upstream **`ARCHITECTURE.md`** at the **agent-control-hub** repository root.

---

## Technology stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) + TypeScript strict |
| Styling | Tailwind CSS v4 + Radix UI primitives |
| Data | Direct file I/O on `HERMES_HOME` + SQLite (memory) where configured |
| API | REST routes under `/api/` (see [API.md](API.md)) |
| State | React hooks |
| Testing | Jest |

---

## Directory structure (high level)

```
command-hub/   (clone directory; npm package may still be named control-hub)
├── src/
│   ├── app/
│   │   ├── api/                 # REST handlers (agent, config, cron, missions, …)
│   │   ├── agent/               # Behaviour + tools UI
│   │   ├── config/
│   │   ├── cron/
│   │   ├── gateway/, logs/, memory/, missions/, …
│   │   ├── recroom/
│   │   ├── sessions/, skills/, personalities/
│   │   ├── page.tsx             # Dashboard
│   │   └── layout.tsx
│   ├── components/
│   ├── lib/                     # hermes.ts PATHS, utils, api-logger, …
│   └── types/
├── packages/
│   ├── schema/                  # @agent-control-hub/schema
│   └── config/                  # @agent-control-hub/config
├── config/                      # Jest etc.
├── scripts/
└── docs/                        # Operator docs (this tree)
```

---

## Data flow

```
Browser → Next.js pages → fetch('/api/...') → API routes → filesystem under HERMES_HOME + CH_DATA_DIR
Hermes runtime (separate process) → reads/writes same Hermes paths; executes cron jobs from jobs.json
```

**Rule:** Prefer API routes for writes; they can enforce auth (`CH_API_KEY`) and validation.

`CH_DATA_DIR` may contain subdirectories used by Hermes or other tooling. **Only features with UI and API code in this repository** are part of Command Hub Simple.

---

## Shared utilities

- **`src/lib/hermes.ts`** — `PATHS`, `HERMES_HOME`, config helpers.
- **`src/lib/api-logger.ts`** — `logApiError`, safe JSON helpers.
- **`src/lib/utils.ts`** — `parseSchedule` (Simple: delegates to `parseScheduleOss` only in the OSS artifact), `timeAgo`, etc.

---

## Design principles

1. **Command centre** — at-a-glance health and quick dispatch.
2. **TypeScript strict** — no `any`.
3. **API envelope** — `{ data?, error? }` for routes.

---

## Testing

```bash
npm test
```

Automated tests in this repository live **only** under `src/__tests__/oss/` (Simple edition contract, middleware, templates, scheduling surface). Deeper suites run in the upstream private monorepo.

---

## Hindsight (optional)

When installed, Hindsight integrates via `src/app/api/memory/hindsight/` and the bridge under Hermes home. See upstream Hermes documentation for provider details.

---

## CI

GitHub Actions run lint, typecheck, tests, and build on pushes/PRs. See `.github/workflows/`.
