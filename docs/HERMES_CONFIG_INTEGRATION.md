# hermes-config repository integration



The separate **`hermes-config`** repository (operator-specific automation and dotfiles) is **not vendored inside Control Hub**. When that repo is present on a machine, use this checklist so paths stay consistent with Control Hub and Hermes.



## Environment variables



| Variable | Role |

|----------|------|

| `HERMES_HOME` | Hermes agent data root (default `~/.hermes`). Scripts and Control Hub must agree. |

| `CH_DATA_DIR` / `CONTROL_HUB_DATA_DIR` | Control Hub JSON root (default `~/control-hub/data`). Mission files must live here for nested Hermes `mark_job_run` updates. |



## What to verify in hermes-config scripts



1. **No hard-coded `~/.hermes/control-hub/data`** unless you intentionally set `CH_DATA_DIR` to that path (legacy layout).

2. **Backup/sync jobs** should include `~/control-hub/data` (or your explicit `CH_DATA_DIR`) alongside `HERMES_HOME`.

3. **CI or deploy hooks** that invoke `curl` against Control Hub should target the real host/port and send `X-CH-API-Key` when `CH_API_KEY` is set.



## Control Hub scripts in this repo



| Script | Notes |

|--------|------|

| `scripts/setup.sh` | Creates `CH_DATA_DIR` directories (default `~/control-hub/data`). |

| `scripts/backup-hermes-config.sh` | Backs up `CH_DATA_DIR` when present, else legacy `HERMES_HOME/control-hub/data`. |



When you add or clone `hermes-config`, inventory its shell scripts and align any data paths with the table above.

