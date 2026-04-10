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
- **API routes return `{ data?, error? }`**
- **Loading + error states** for every async operation
- **Destructive actions need confirmation**
- **NEVER write to `~/.hermes/` directly** — always through API endpoints
- **`.env` keys displayed as `sk-...abcd` only**
- **Use `js-yaml` for YAML parsing**
- **String concatenation for paths, NOT `path.join`** (Turbopack NFT tracing issue)
- **Build before deploy:** `npm run build` must pass




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
cd ~/mission-control
npm run build
fuser -k 3000/tcp 2>/dev/null; sleep 1
nohup npx next start -p 3000 -H 0.0.0.0 > /tmp/mc.log 2>&1 &
```

**Critical:** `-H 0.0.0.0` required for network access. `fuser -k` is more reliable than `kill`.


## Design Philosophy

Mission Control is a command centre, not a file manager. The operator opens the dashboard and instantly knows: what agents are running, what missions are active, what's healthy, what needs attention. Then in 1-2 clicks they can dispatch a new mission.

**Aesthetic:** Dark base (#030712), neon accents (cyan, purple, pink, green, orange). Information-dense but scannable. Every pixel earns its place.

**Sidebar sections:** Main (Dashboard, Missions, Cron, Sessions, Memory, Gateway, Logs, Config) | Agent (Behaviour, Skills, Tools, Personalities) | Config Sections
