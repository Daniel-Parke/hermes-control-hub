# Changelog

## Unreleased

### Breaking / data layout

- Default **Control Hub data directory** is now **`$HOME/control-hub/data`** (was `$HERMES_HOME/control-hub/data`). Set **`CH_DATA_DIR`** if you keep files in the old location. See [MIGRATION.md](MIGRATION.md).

### Added

- **`CH_DATA_DIR` / `CONTROL_HUB_DATA_DIR`** documented in `.env.example`.
- **`GET`/`PUT /api/config/model`** for audited model/provider updates; Config → Model UI uses this route.
- **Task lists**, **packages**, **workspaces** APIs and minimal UI pages; **Command Room** MVP shell.
- **Operations**: `POST /api/operations/[id]` with `dispatchCurrentStep` creates a saved mission from the current step’s built-in template.
- **Dockerfile** and **`docker-compose.yml`** example; **[docs/DEPLOY.md](docs/DEPLOY.md)**.
- **[docs/PLATFORM_VISION.md](docs/PLATFORM_VISION.md)** platform overview.

### Changed

- **`parseSchedule`**: invalid input no longer falls back to a 15-minute interval; supports optional **six-field** cron.
- **Cron / missions**: recurring jobs use **`repeat.times: null`** instead of `-1`.
- **Dashboard**: “Continue work” handoff panel with link to latest session.
