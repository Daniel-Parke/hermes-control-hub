# Mission Control Simple (OSS) scope

This repository ships **Mission Control Simple**: a Next.js control plane for [Hermes Agent](https://github.com/NousResearch/hermes-agent). Execution stays in Hermes; this app edits `jobs.json`, mission JSON, and `config.yaml` through audited APIs.

## Included in this tree

- Dashboard, missions (CRUD, dispatch), cron against Hermes `jobs.json`, sessions, memory (Hindsight / Holographic / None where supported), gateway, logs, config, skills, agent behaviour, personalities, Rec Room / Story Weaver (where present in this repo).
- Shared packages: `@agent-control-hub/schema`, `@agent-control-hub/config` (vendored under `packages/`).
- Schedule parsing for Hermes-style **simple** intervals (`every 15m`, `30m`, `every 2h`), cron strings, and ISO one-shots. Extended interval syntax beyond that is not part of this OSS build.

## Not in this repository

Commercial-only UI routes and APIs are **not present as source files** in this export (e.g. multi-step operations console, task-list coordinator UI, workspace registry UI, package bundles UI, command room). If a URL path is blocked, **middleware** returns `/edition-not-available` or a JSON error for APIs. Data directories under `MC_DATA_DIR` may still exist on disk from other tools; absence of a route here means there is no bundled UI for that feature in OSS.

## Hermes documentation

Follow upstream Hermes / Nous Research docs for agent behaviour, jobs, and memory providers. Model endpoints are configured in Hermes, not Mission Control.
