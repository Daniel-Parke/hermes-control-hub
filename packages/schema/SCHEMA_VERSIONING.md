# Schema versioning

## Current versions

| Artifact | Constant | Location |
|----------|-----------|----------|
| Mission record | `MISSION_SCHEMA_VERSION` (`1.0.0`) | `src/mission-v1.ts` |
| Template pack manifest | `TEMPLATE_PACK_SCHEMA_VERSION` (`1.0.0`) | `src/template-pack-v1.ts` |

## Bump policy

- **Patch** (`1.0.x`): documentation-only or additive optional fields ignored by older readers.
- **Minor** (`1.x.0`): new optional fields; maintain backward compatibility for existing files.
- **Major** (`x.0.0`): breaking shape changes; provide migration notes and a migration window in Control Hub release notes.

## Generated JSON Schema

Run `npm run generate:json` in `packages/schema` after changing Zod schemas. Commit updated files under `json/`.

## Changelog

See `CHANGELOG.md` in this package.
