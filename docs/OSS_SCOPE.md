# Control Hub Simple (OSS) scope



This repository ships **Control Hub Simple**: a Next.js control plane for [Hermes Agent](https://github.com/NousResearch/hermes-agent). Execution stays in Hermes; this app edits `jobs.json`, mission JSON, and `config.yaml` through audited APIs.



## Included in this tree



- Dashboard, missions (CRUD, dispatch), cron against Hermes `jobs.json`, sessions, memory (Hindsight / Holographic / None where supported), gateway, logs, config, skills, agent behaviour, personalities, Rec Room / Story Weaver (where present in this repo).

- Shared packages: `@agent-control-hub/schema`, `@agent-control-hub/config` (vendored under `packages/`).

- Schedule parsing for Hermes-style **simple** intervals (`every 15m`, `30m`, `every 2h`), cron strings, and ISO one-shots. In this export, `parseSchedule` in `utils.ts` delegates **only** to `parseScheduleOss` (no rich multi-unit intervals such as `every 1h 30m`, no `every 2d` / `every 1w` on the Simple surface).



## Not in this repository



Commercial-only UI routes and APIs are **not present as source files** in this export (e.g. multi-step operations console, task-list coordinator UI, workspace registry UI, package bundles UI, command room). If a URL path is blocked, **middleware** returns `/edition-not-available` or a JSON error for APIs. Data directories under `CH_DATA_DIR` may still exist on disk from other tools; absence of a route here means there is no bundled UI for that feature in OSS.



## Memory providers (Hindsight, Holographic, none)



- **Hindsight:** Facts are managed through Hermes agent tools (for example retain/recall flows). This dashboard does **not** offer full CRUD on Hindsight facts; it surfaces status and guidance.

- **Holographic:** Structured facts may be read and edited via Control Hub APIs where configured.

- **None / unset:** Memory UI reflects that no provider is configured; follow Hermes CLI/docs to set up a provider.



## Models and profiles



**Inference endpoints and default models** are defined in Hermes (`config.yaml` per profile, environment, etc.), not in Control Hub core. This app exposes **config editing** and mission/cron payloads that include **per-run model fields** where the schema allows, so you can vary models mission-by-mission or job-by-job for token/cost tuning. Changing a profile’s default model is done through the **Config** editor (profile `config.yaml`), not via a dedicated profiles mutation API.



## Hermes documentation



Follow upstream Hermes / Nous Research docs for agent behaviour, jobs, and memory providers. Model endpoints are configured in Hermes, not Control Hub.

