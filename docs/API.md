# API Reference

All API routes return a standard envelope:

```typescript
{ data?: T; error?: string }
```

Import the type from `@/types/hermes`:

```typescript
import type { ApiResponse } from "@/types/hermes";
```

All error handlers must call `logApiError(route, context, error)` from `@/lib/api-logger`.

---

## Agent

### GET /api/agent/files

List agent behaviour files (SOUL.md, HERMES.md, etc.).

**Response:**

```json
{
  "data": [
    { "key": "soul", "name": "SOUL.md", "content": "# SOUL\n...", "path": "~/.hermes/SOUL.md" }
  ]
}
```

### GET /api/agent/files/[key]

Read a single behaviour file by key (e.g. `soul`, `hermes`, `agents`, `user`).

### PUT /api/agent/files/[key]

Update a behaviour file. Body fields are whitelisted — unknown fields are ignored.

```json
{ "content": "# Updated content\n..." }
```

### GET /api/agent/agents-md

Read the project-level AGENTS.md file.

### PUT /api/agent/agents-md

Update the project-level AGENTS.md file.

```json
{ "content": "# Updated AGENTS.md\n..." }
```

### GET /api/agent/env

Read environment variables from `~/.hermes/.env`. Secrets are masked as `sk-...abcd`.

### GET /api/agent/profiles

List all agent profiles (main + specialist profiles from `~/.hermes/profiles/`).

**Response:**

```json
{
  "data": {
    "profiles": [
      {
        "id": "default",
        "name": "Bob",
        "description": "Main agent — full access to all tools and skills",
        "personality": "technical",
        "isDefault": true,
        "skillsCount": 85,
        "toolsCount": 0,
        "files": [
          { "key": "soul", "name": "SOUL.md", "path": "~/.hermes/SOUL.md", "exists": true, "size": 1234, "lastModified": "2026-04-10T..." }
        ]
      },
      {
        "id": "mc-qa-engineer",
        "name": "Qa Engineer",
        "description": "Quality assurance and testing",
        "personality": "analytical",
        "isDefault": false,
        "skillsCount": 75,
        "toolsCount": 0,
        "files": [...]
      }
    ]
  }
}
```

### PUT /api/agent/personality

Update the personality setting for a specific profile's `config.yaml`.

```json
{
  "profile": "mc-qa-engineer",
  "personality": "analytical"
}
```

If `profile` is omitted or `"default"`, updates the main agent's config.

---

## Agents

### GET /api/agents

List currently running agent processes with PID, profile, last activity, and status.

---

## Config

### GET /api/config

Read `~/.hermes/config.yaml` parsed into sections.

### PUT /api/config

Update config. A backup is created automatically before saving.

```json
{ "content": "full config.yaml content as string" }
```

---

## Cron

### GET /api/cron

List all cron jobs with status, schedule, and last run time.

### POST /api/cron

Create a new cron job.

```json
{
  "name": "Daily health check",
  "prompt": "Check system health and report",
  "schedule": "0 9 * * *",
  "deliver": "discord:1492416245520400495"
}
```

### PUT /api/cron

Update an existing cron job.

### DELETE /api/cron

Remove a cron job. Query param: `?id=<job-id>`.

---

## Gateway

### GET /api/gateway

Read gateway status and platform connections (Discord, Telegram, etc.).

---

## Logs

### GET /api/logs

Read recent log entries from `~/.hermes/logs/`.

---

## Memory

### GET /api/memory

Search holographic memory facts. Query param: `?q=<search-term>`.

### POST /api/memory

Create a new memory fact.

```json
{ "content": "fact content", "tags": "tag1,tag2", "category": "general" }
```

### PUT /api/memory

Update an existing memory fact.

```json
{ "id": 123, "content": "updated content", "tags": "new,tags" }
```

### DELETE /api/memory

Remove a memory fact. Query param: `?id=<fact-id>`.

### GET /api/memory/hindsight

Query the Hindsight knowledge graph memory. Requires Hindsight to be installed and configured.

**Query params:**

| Param | Description | Required |
|-------|-------------|----------|
| `action` | One of: `list`, `recall`, `reflect`, `directives`, `mental-models`, `health` | No (default: `list`) |
| `query` | Search query (required for `recall` and `reflect`) | Depends on action |
| `budget` | Token budget for recall/reflect | No |
| `bank` | Memory bank name | No (default: `hermes`) |
| `limit` | Max results for `list` | No |

**Actions:**

- `list` — List stored memories (supports `query` as search filter)
- `recall` — Semantic search for relevant memories given a `query`
- `reflect` — Generate insights from memories matching `query`
- `directives` — List stored directives
- `mental-models` — List stored mental models
- `health` — Check Hindsight server health

The Mission Control Memory page (Hindsight tab) does not call `list` on load; it only requests memories when the user clicks **Recall** (`action=recall` with `query`).

**Response:**

```json
{
  "data": {
    "available": true,
    "memories": [...]
  }
}
```

### POST /api/memory/hindsight

Retain a new memory in Hindsight.

```json
{
  "content": "The production API uses port 8080 internally",
  "tags": ["infrastructure", "api"],
  "bank": "hermes"
}
```

`bank` defaults to `"hermes"` if omitted.

---

## Missions

### GET /api/missions

List all missions with status, timestamps, and output.

### POST /api/missions

Dispatch a new mission.

```json
{
  "templateId": "bug-fix",
  "prompt": "Fix the login timeout issue",
  "profile": "mc-qa-engineer",
  "scope": "half-day",
  "timeout": 10
}
```

### DELETE /api/missions

Cancel a running mission. Query param: `?id=<mission-id>`.

### GET /api/missions/health

Check mission system health (scheduler status, active count).

---

## Monitor

### GET /api/monitor

Aggregated system status: model, provider, uptime, gateway connection, active agents, memory stats.

---

## Personalities

### GET /api/personalities

List available agent personalities.

### PUT /api/personalities

Update personality configuration.

---

## Sessions

### GET /api/sessions

List conversation sessions across all platforms. Supports filtering.

### GET /api/sessions/[id]

Read a single session transcript by ID.

---

## Skills

### GET /api/skills

List all available skills.

### GET /api/skills/[name]

Read a single skill's SKILL.md by name. Supports profile-aware lookup.

**Query params:**

| Param | Description | Default |
|-------|-------------|---------|
| `profile` | Profile ID to search in | `default` |

Searches the profile's skills directory first, then falls back to the default `~/.hermes/skills/` directory.

**Response:**

```json
{
  "data": {
    "name": "mission-control",
    "path": "~/.hermes/skills/mission-control/SKILL.md",
    "content": "# Mission Control\n...",
    "size": 4567,
    "lastModified": "2026-04-10T..."
  }
}
```

### PUT /api/skills/[name]/toggle

Toggle a skill on or off for a profile by managing the `skills.disabled` list in `config.yaml`.

```json
{
  "profile": "mc-qa-engineer",
  "enabled": false
}
```

- `enabled: false` — adds the skill to `skills.disabled`
- `enabled: true` — removes it from `skills.disabled`
- `profile` defaults to `"default"` if omitted

### GET /api/skills/[...path]

Read a skill file (SKILL.md or linked files under references/, templates/, scripts/).

---

## Status

### GET /api/status

Basic health check endpoint. Returns `{ "status": "ok" }`.

---

## Stories (Story Weaver)

### GET /api/stories

List all stories. Query params: `?id=<story-id>` for single story.

### POST /api/stories

Create a new story.

```json
{
  "title": "The Last Signal",
  "genre": ["sci-fi", "mystery"],
  "era": ["far-future"],
  "mood": ["tense", "contemplative"],
  "characters": ["Captain Voss", "AI companion"],
  "chapters": 12,
  "wordsPerChapter": 1500,
  "premise": "A deep-space captain receives a signal from a ship lost 200 years ago"
}
```

### PUT /api/stories

Update story (chapter generation, rewrite, extend).

### DELETE /api/stories

Delete a story. Query param: `?id=<story-id>`.

---

## Templates

### GET /api/templates

List all mission templates (built-in + custom).

### POST /api/templates

Create a custom mission template.

### DELETE /api/templates

Remove a custom template. Query param: `?id=<template-id>`.

---

## Tools

### GET /api/tools

List toolsets per platform (Discord, Telegram, CLI).

### PUT /api/tools

Update toolset configuration for a platform.

---

## Update

### GET /api/update

Check for available updates from the remote repository.

### POST /api/update

Trigger an update or restart. Uses a lock file to prevent concurrent deploys.

```json
{ "action": "update" }
```

**Actions:**

| Action | Behaviour |
|--------|-----------|
| `update` | Fetch from `origin/main`, checkout, reset hard, npm install (if needed), build, restart. Aborts without restart if build fails. |
| `restart` | Restart the server only (no git/build). |

If `action` is omitted, defaults to `"update"`.

**Response (update):**

```json
{
  "data": {
    "action": "update",
    "status": "started",
    "newHash": "abc1234"
  }
}
```

Returns `409` if an update is already in progress (lock file detected).
