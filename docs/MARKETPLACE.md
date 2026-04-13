# Template packs and schema

Template pack manifests and mission JSON share versioned contracts in **`@agent-control-hub/schema`** (this repo: `packages/schema`).

- Zod schemas are the source of truth in `packages/schema/src`.
- Generated JSON Schema files live under `packages/schema/json/` (`mission-v1.schema.json`, `template-pack-v1.schema.json`). Regenerate with `npm run generate:json -w @agent-control-hub/schema` from this repository root.

See [SCHEMA_VERSIONING.md](../packages/schema/SCHEMA_VERSIONING.md) for version bumps and compatibility.
