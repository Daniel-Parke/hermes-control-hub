# hermes-config repository integration

The separate **`hermes-config`** repository (operator-specific automation and dotfiles) is **not vendored inside Mission Control**. When that repo is present on a machine, use this checklist so paths stay consistent with Mission Control and Hermes.

## Environment variables

| Variable | Role |
|----------|------|
| `HERMES_HOME` | Hermes agent data root (default `~/.hermes`). Scripts and Mission Control must agree. |
| `MC_DATA_DIR` / `MISSION_CONTROL_DATA_DIR` | Mission Control JSON root (default `~/mission-control/data`). Mission files must live here for nested Hermes `mark_job_run` updates. |

## What to verify in hermes-config scripts

1. **No hard-coded `~/.hermes/mission-control/data`** unless you intentionally set `MC_DATA_DIR` to that path (legacy layout).
2. **Backup/sync jobs** should include `~/mission-control/data` (or your explicit `MC_DATA_DIR`) alongside `HERMES_HOME`.
3. **CI or deploy hooks** that invoke `curl` against Mission Control should target the real host/port and send `X-MC-API-Key` when `MC_API_KEY` is set.

## Mission Control scripts in this repo

| Script | Notes |
|--------|------|
| `scripts/setup.sh` | Creates `MC_DATA_DIR` directories (default `~/mission-control/data`). |
| `scripts/backup-hermes-config.sh` | Backs up `MC_DATA_DIR` when present, else legacy `HERMES_HOME/mission-control/data`. |

When you add or clone `hermes-config`, inventory its shell scripts and align any data paths with the table above.
