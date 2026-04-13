# Edition components (Simple vs commercial)

Control Hub Simple is produced from an **upstream private monorepo** via an allowlisted OSS export. These patterns keep commercial-only code out of this repository.

## 1. Commercial-only routes and APIs

Commercial UI and APIs are **omitted from this tree** (not merely hidden). [`src/middleware.ts`](../src/middleware.ts) still blocks legacy commercial URL prefixes in Simple edition as defense in depth.

When adding features upstream, new commercial surfaces must stay in **excluded paths** in the private publish allowlist—not in files that sync here.

## 2. Shared URL, Simple UI

When the same route supports both editions upstream, the Simple UI often lives in `*-oss.tsx` modules, for example:

- [`src/app/missions/missions-page-oss.tsx`](../src/app/missions/missions-page-oss.tsx)
- [`src/app/cron/cron-page-oss.tsx`](../src/app/cron/cron-page-oss.tsx)

The route `page.tsx` selects the commercial shell only in commercial builds upstream.

## 3. Shared Hermes logic

Hermes paths, shared types, and schema packages that are safe for Simple may ship in both trees. **Scheduling, orchestration, and proprietary template logic** must remain upstream-only.

## 4. Tests in this repository

Only [`src/__tests__/oss/`](../src/__tests__/oss) is published here. The full unit and commercial suites run in the private monorepo.

## 5. Screen inventory (high level)

| Area | Simple (this repo) | Commercial (upstream only) |
|------|--------------------|------------------------------|
| Missions / cron | OSS page modules + shared APIs | Extended UI, rich scheduling |
| Operations, task lists, workspaces, packages, command room | Not shipped | Full UI + APIs |
| Config, gateway, logs, memory, skills, sessions | Shared | Same + optional overlays later |

Update this table when major surfaces change upstream.
