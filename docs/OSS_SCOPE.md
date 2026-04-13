# Mission Control Simple (OSS) scope

This document describes what the public **Mission Control Simple** edition includes relative to the full Hermes stack and the commercial Mission Control build.

## Included (Hermes-native surfaces)

- Dashboard, missions (CRUD, dispatch), basic cron against Hermes `jobs.json`, sessions, memory (including Hindsight / Holographic / None where supported), gateway, logs, config, skills, agent behaviour, personalities, Rec Room / Story Weaver where shipped in the OSS tree.
- Shared typed config and schema packages (`@agent-control-hub/schema`, `@agent-control-hub/config`).
- Schedule parsing for Hermes-compatible **simple** intervals (`every 15m`, `30m`, `every 2h`), cron expressions, and ISO one-shots. **Rich** compound intervals (`every 1h 30m`, `every 2d`, …) are **commercial-only** in the private monorepo.

## Excluded from the OSS artifact

The OSS publish **does not copy** commercial UI routes or APIs (operations, task lists, workspaces, packages, command room). Middleware still blocks those paths at runtime for Simple edition. Commercial-only template data and `mc-pro` are never present in the public dependency tree.

## Relationship to Hermes docs

Follow the official Hermes / Nous Research documentation for agent behaviour, jobs, and memory providers. Mission Control remains a control plane; model routing and local inference endpoints are configured in Hermes, not here.
