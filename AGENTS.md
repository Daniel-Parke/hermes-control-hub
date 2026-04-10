# Mission Control — Agent Development Guide

Extends `~/.hermes/AGENT.md` (base instructions). This file adds project-specific context for working on the Mission Control web application.

> **Always read `~/.hermes/AGENT.md` first.** It contains the universal rules, execution loop, and repository structure that apply to all agents.

> **For architecture, design rules, and current state, load the `mission-control` skill.** It has the full project documentation.


## Development Environment

```bash
cd ~/mission-control
npm run dev     # Start dev server (port 3000)
npm run build   # Production build
npm run start   # Start production server
```


## Project Structure

```
mission-control/
├── src/
│   ├── app/
│   │   ├── api/                    # REST API routes
│   │   │   ├── agent/files/        # Behaviour file CRUD
│   │   │   ├── agent/agents-md/    # AGENTS.md scanning + CRUD
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
│   │   │   ├── behaviour/          # Agent Behaviour editor
│   │   │   └── tools/              # Tools Manager
│   │   ├── page.tsx                # Dashboard
│   │   ├── missions/page.tsx       # Missions page
│   │   ├── cron/page.tsx           # Cron manager
│   │   ├── sessions/page.tsx       # Session browser
│   │   ├── memory/page.tsx         # Memory CRUD
│   │   ├── config/page.tsx         # Config editor
│   │   └── layout.tsx              # Root layout with sidebar
│   ├── components/
│   │   ├── ui/                     # Primitives (Button, Card, Modal, etc.)
│   │   └── layout/                 # Sidebar, PageHeader
│   ├── lib/
│   │   ├── api.ts                  # Typed fetch wrappers
│   │   ├── config-schema.ts        # Config section definitions
│   │   ├── theme.ts                # Shared theme maps
│   │   └── utils.ts                # timeAgo, timeUntil, formatBytes
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


## Key Conventions

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

## Shared Utilities

- `src/lib/utils.ts` — `parseSchedule()`, `CronJobData`, `getMissionProgressSteps()`, `messageSummary()`, `validateSessionCompletion()`, `timeAgo()`, `timeUntil()`, `formatBytes()`
- `src/lib/api-logger.ts` — `logApiError()`, `safeJsonParse()`, `safeReadJsonFile()`
- `src/lib/hermes.ts` — `PATHS`, `HERMES_HOME`, `getDefaultModelConfig()`, `getDiscordHomeChannel()`




## Git Workflow

**Always work on `dev` branch. Never commit to `main`.**

```bash
# Before starting work
cd ~/mission-control
git checkout dev
git pull origin dev

# After making changes
git add -A
git commit -m "type: description"
git push origin dev

# Create PR for review
curl -X POST https://api.github.com/repos/Daniel-Parke/hermes-mission-control/pulls \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"description","body":"what changed","head":"dev","base":"main"}'
```

**Rules:**
- Use conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`
- Always `npm run build` before pushing
- Never merge your own PRs
- If merge conflict: stop and report to user

## Deployment

```bash
# Step 1: Build (foreground, safe — exits when done)
cd ~/mission-control && npm run build

# Step 2: Kill existing server
fuser -k 3000/tcp 2>/dev/null; sleep 2

# Step 3: Start server (MUST use background=true, NOT &)
# Use the terminal tool with background=true to start the server.
# NEVER use nohup ... & — the hermes terminal tool's pipe inheritance
# will cause the agent to freeze. See npm-service-restart skill.
```

In code, deploy via:
```
terminal(command="cd ~/mission-control && node node_modules/next/dist/bin/next start -p 3000 -H 0.0.0.0", background=true)
sleep 3
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```

**Critical:** `-H 0.0.0.0` required for network access. `fuser -k` is more reliable than `kill`. MUST use `background=true` on the terminal tool — never use `nohup ... &` which causes pipe inheritance deadlock. See `npm-service-restart` skill for full details.


## Design Philosophy

Mission Control is a command centre, not a file manager. The operator opens the dashboard and instantly knows: what agents are running, what missions are active, what's healthy, what needs attention. Then in 1-2 clicks they can dispatch a new mission.

**Aesthetic:** Dark base (#030712), neon accents (cyan, purple, pink, green, orange). Information-dense but scannable. Every pixel earns its place.

**Sidebar sections:** Main (Dashboard, Missions, Cron, Sessions, Memory, Gateway, Logs, Config) | Agent (Behaviour, Skills, Tools, Personalities) | Config Sections
