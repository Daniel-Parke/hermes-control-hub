# Control Hub — Agent Development Guide

§

Extends `~/.hermes/AGENT.md` (base instructions). This file adds project-specific context for working on the Control Hub web application.

§

> **Always read `~/.hermes/AGENT.md` first.** It contains the universal rules, execution loop, and repository structure that apply to all agents.

§

> **For architecture, design rules, and current state, load the `control-hub` skill.** It has the full project documentation.

§

## Development Environment

§

```bash

cd ~/control-hub

npm run dev     # Start dev server (port 3000)

npm run build   # Production build

npm run start   # Start production server

```

§

## Project Structure

§

```

control-hub/

├── src/

│   ├── app/

│   │   ├── api/                    # REST API routes

│   │   │   ├── agent/files/        # Behaviour file CRUD

│   │   │   ├── agent/agents-md/    # AGENTS.md scanning + CRUD

│   │   │   ├── agent/profiles/     # Agent profile CRUD

│   │   │   ├── tools/              # Toolset config per platform

│   │   │   ├── missions/           # Mission CRUD + dispatch

│   │   │   ├── config/             # Config YAML CRUD

│   │   │   ├── cron/               # Cron job management

│   │   │   ├── sessions/           # Session browser

│   │   │   ├── memory/             # Holographic memory CRUD

│   │   │   ├── agents/             # Running agent detection

│   │   │   ├── monitor/            # Aggregated system status

│   │   │   ├── templates/          # Custom template CRUD

│   │   │   └── ...                 # Other endpoints

│   │   ├── agent/

│   │   │   ├── agents/            # Agents page (profile CRUD)

│   │   │   └── tools/              # Tools Manager

│   │   ├── page.tsx                # Dashboard

│   │   ├── missions/page.tsx       # Missions page

│   │   ├── cron/page.tsx           # Cron manager

│   │   ├── sessions/page.tsx       # Session browser

│   │   ├── memory/             # Memory CRUD

│   │   ├── config/             # Config editor

│   │   ├── recroom/            # Rec Room — creative activities

│   │   │   ├── page.tsx        # Hub — activity selection

│   │   │   ├── creative-canvas/  # p5.js generative art

│   │   │   ├── ascii-studio/     # ASCII art & animation

│   │   │   └── story-weaver/     # Interactive fiction

│   │   └── layout.tsx              # Root layout with sidebar

│   ├── components/

│   │   ├── recroom/            # Rec Room shared components

│   │   │   ├── PromptBuilder.tsx   # Universal prompt input

│   │   │   ├── OutputViewer.tsx    # Output renderer

│   │   │   ├── ActivityCard.tsx    # Activity preview card

│   │   │   ├── ActivityLayout.tsx  # Page wrapper

│   │   │   └── SaveLoadManager.tsx # Save/load/export

│   │   ├── ui/                     # Primitives (Button, Card, Modal, etc.)

│   │   └── layout/                 # Sidebar, PageHeader

│   ├── lib/

│   │   ├── api.ts                  # Typed fetch wrappers

│   │   ├── config-schema.ts        # Config section definitions

│   │   ├── theme.ts                # Shared theme maps

│   │   ├── utils.ts                # timeAgo, timeUntil, formatBytes

│   │   └── recroom/

│   │       └── prompt-templates.ts # LLM system prompts per activity

│   └── types/

│       └── hermes.ts               # All TypeScript interfaces

├── data/

│   ├── missions/                   # Mission JSON files

│   └── templates/                  # Custom template JSON files

├── public/                         # Static assets

├── next.config.ts                  # Next.js config

├── tailwind.config.ts              # Tailwind config

└── package.json

```

§

## Key Conventions

§

- **TypeScript strict** — no `any`, no `@ts-ignore`

- **API routes return `{ data?, error? }`** — all routes use `ApiResponse<T>` from `@/types/hermes`

- **Error logging** — all catch blocks call `logApiError(route, context, error)` from `@/lib/api-logger`

- **Loading + error states** for every async operation

- **Destructive actions need confirmation**

- **NEVER write to `~/.hermes/` directly** — always through API endpoints

- **`.env` keys displayed as `sk-...abcd` only**

- **Use `js-yaml` for YAML parsing**

- **String concatenation for paths, NOT `path.join`** (Turbopack NFT tracing issue)

- **Build before deploy:** `npm run build` must pass

- **Security** — whitelist body fields in PUT handlers (no mass assignment), validate paths with `path.resolve()` + `startsWith()`

§

## Shared Utilities

§

- `src/lib/utils.ts` — `parseSchedule()`, `CronJobData`, `messageSummary()`, `timeAgo()`, `timeUntil()`, `formatBytes()`

- `src/lib/api-logger.ts` — `logApiError()`, `safeJsonParse()`, `safeReadJsonFile()`

- `src/lib/hermes.ts` — `PATHS`, `CH_DATA_DIR`, `HERMES_HOME`, `getDefaultModelConfig()`, `getDiscordHomeChannel()`

§

## Git Workflow

§

**Always work on `dev` branch. Never commit to `main`.**

§

```bash

# Before starting work

cd ~/control-hub

git checkout dev

git pull origin dev

§

# After making changes

git add -A

git commit -m "type: description"

git push origin dev

§

# Create PR for review

curl -X POST https://api.github.com/repos/Daniel-Parke/hermes-control-hub/pulls \

  -H "Authorization: Bearer $GITHUB_TOKEN" \

  -H "Content-Type: application/json" \

  -d '{"title":"description","body":"what changed","head":"dev","base":"main"}'

```

§

**Rules:**

- Use conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`

- Always `npm run build` before pushing

- Never merge your own PRs

- If merge conflict: stop and report to user

§

## Deployment

§

```bash

# Step 1: Build (foreground, safe — exits when done)

cd ~/control-hub && npm run build

§

# Step 2: Kill existing server

fuser -k 3000/tcp 2>/dev/null; sleep 2

§

# Step 3: Start server (MUST use background=true, NOT &)

# Use the terminal tool with background=true to start the server.

# NEVER use nohup ... & — the hermes terminal tool's pipe inheritance

# will cause the agent to freeze. See npm-service-restart skill.

```

§

In code, deploy via:

```

terminal(command="cd ~/control-hub && node node_modules/next/dist/bin/next start -p 3000 -H 0.0.0.0", background=true)

sleep 3

curl -s -o /dev/null -w "%{http_code}" http://localhost:3000

```



**Scripts:**

- `scripts/restart.sh` — Stop and restart the server (no git/build)

- `scripts/update.sh` — Pull from main, build, restart

- `scripts/install.sh` — Standalone installer (fresh or reinstall)

- `scripts/setup.sh` — Post-clone setup (npm install, build)



**Critical:** `-H 0.0.0.0` required for network access. `fuser -k` is more reliable than `kill`. MUST use `background=true` on the terminal tool — never use `nohup ... &` which causes pipe inheritance deadlock. See `npm-service-restart` skill for full details.

§

## Design Philosophy

§

Control Hub is a command centre, not a file manager. The operator opens the dashboard and instantly knows: what agents are running, what missions are active, what's healthy, what needs attention. Then in 1-2 clicks they can dispatch a new mission.

§

**Aesthetic:** Dark base (#030712), neon accents (cyan, purple, pink, green, orange). Information-dense but scannable. Every pixel earns its place.

§

**Sidebar sections:** Main (Dashboard, Missions, Cron, Sessions, Memory, Gateway, Logs, Config) | Agents (Agents) | Operations (Skills, Tools, Personalities, HERMES.md, Environment) | Config Sections

