# Hermes Mission Control

A command centre dashboard for [Hermes Agent](https://github.com/NousResearch/hermes-agent). Monitor your agent fleet, dispatch missions, manage configurations, and control everything from one place.

Simply clone the repo, run the install script, and you are ready to control your agent from the dashboard!

![Dashboard](screenshots/Hermes_Dashboard_Resize.png)

## Features

**Dashboard** — Live stats, active missions, system & agent monitoring

**Missions** — Dispatch and track agent missions with 6 built-in templates. Create + save new missions as you go!

**Agent Behaviour** — Edit SOUL.md, HERMES.md, USER.md, MEMORY.md, AGENTS.md, and masked .env

**Config Editor** — Full config.yaml editing with 27 sections and auto-backup. Fully configure all aspects of your agent

**Cron Manager** — Schedule, edit and monitor recurring tasks, utilising Hermes pause/resume functionality

**Session Browser** — View conversation transcripts across all gateways

**Memory CRUD** — Manage holographic memory facts and view stored information

**Skills Browser** — Browse and view installed skills

**Tools Manager** — Toggle toolsets per platform (Discord, Telegram, CLI, etc.)

## Prerequisites

- **Node.js** 18 or later
- **Hermes Agent** installed and configured at `~/.hermes/`

## Quick Start

```bash
git clone https://github.com/Daniel-Parke/hermes-mission-control.git ~/mission-control
cd ~/mission-control
bash scripts/setup.sh
npm run start
```

The dashboard will be available at `http://localhost:3000`.

## Development

```bash
npm run dev           # Start dev server with hot reload
npm run build         # Production build
npm run test          # Run test suite (20 tests)
npm run start         # Production server
npm run start:network # Accessible on LAN
```

## Configuration

Mission Control reads from your existing Hermes installation. No additional configuration is needed if Hermes is already set up.

**Data storage:** Missions and custom templates are stored at `~/.hermes/mission-control/data/`. This keeps your data portable — it travels with your Hermes config, not the app directory.

**Environment variables** (optional, in `.env`):

| Variable | Default | Description |
|----------|---------|-------------|
| `HERMES_HOME` | `~/.hermes` | Path to Hermes home directory |
| `PORT` | `3000` | Server port |


## Architecture

- **Framework:** Next.js 16 (App Router) + TypeScript + Tailwind CSS
- **Data:** Direct file I/O on `~/.hermes/` + SQLite for memory
- **API:** RESTful routes under `/api/`
- **State:** React hooks (no external state management)
- **YAML:** js-yaml for all config parsing

All API routes import paths from `src/lib/hermes.ts` for consistency. The app reads from `~/.hermes/` but never writes to `config.yaml` directly.


## Screenshots

![Dashboard](screenshots/Hermes_Dashboard.png)

![Mission Dispatch](screenshots/Mission_Dispatch.png)

![Mission Template](screenshots/Mission_Template.png)

![Mission Page](screenshots/Mission_Page.png)

![Cron Job Config](screenshots/Cron_Job.png)

![Agent Behaviour](screenshots/Agent_Behaviour.png)

![Agent Personalities](screenshots/Agent_Personalities.png)

![Agent Skills](screenshots/Agent_Skills.png)

![Agent Tools](screenshots/Agent_Tools.png)

![Agent Configuration](screenshots/Agent_Configuration.png)

## License

MIT
