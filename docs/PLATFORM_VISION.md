# Control Hub platform vision (OSS)



Control Hub is the **Next.js control plane** for [Hermes Agent](https://github.com/NousResearch/hermes-agent): missions, cron, configuration, sessions, memory, and day-to-day operator workflows. Execution remains in **Hermes** (gateway, scheduler). This app edits Hermes and Control Hub JSON through audited REST routes.



## Architecture (layers)



```mermaid

flowchart TB

  UI[Next.js UI]

  API[API routes]

  FS[(HERMES_HOME + CH_DATA_DIR)]

  H[Hermes runtime]

  UI --> API

  API --> FS

  H --> FS

```



- **`HERMES_HOME`** (`~/.hermes`): `config.yaml`, `cron/jobs.json`, sessions, skills, logs.

- **`CH_DATA_DIR`** (default `~/control-hub/data`): missions, templates, stories, Rec Room data, and other JSON used by this build. Some directory names may exist for compatibility with broader Hermes tooling; **this OSS app only ships UIs and APIs present in the repository** (see [OSS_SCOPE.md](OSS_SCOPE.md)).



## Scheduling



- Cron jobs are rows in **`HERMES_HOME/cron/jobs.json`**. Control Hub uses a file lock compatible with Hermes.

- Recurring jobs use **`repeat.times: null`** for infinite runs (Hermes canonical).

- **`parseSchedule`** accepts interval expressions, ISO one-shots, and five- or six-field cron strings; invalid input is rejected on user-facing routes.



## Core features in OSS



| Area | Role |

|------|------|

| Model / provider | `GET`/`PUT /api/config/model` — validated updates, masked keys, audit. |

| Missions | CRUD, dispatch, templates (built-in set in OSS). |

| Cron | CRUD against Hermes `jobs.json`. |

| Config / sessions / memory / gateway / logs / skills / personalities | Hermes-aligned surfaces as shipped in this repo. |



This document describes only the OSS product surface in this repository.



## Security



- Mutating routes use **`CH_API_KEY`** when set (`src/lib/api-auth.ts`).

- Config writes use whitelisted sections; model updates go through **`/api/config/model`**.



## Related docs



- [MIGRATION.md](../MIGRATION.md) — data directory migration.

- [DEPLOY.md](DEPLOY.md) — host, port, TLS, Docker.

- [HERMES_CONFIG_INTEGRATION.md](HERMES_CONFIG_INTEGRATION.md) — optional `hermes-config` checklist.

