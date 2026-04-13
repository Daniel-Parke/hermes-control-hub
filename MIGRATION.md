# Mission Control migrations

## 2026-04 — Default mission data directory

**Change:** Mission Control now stores missions, templates, operations, stories, and Rec Room data under **`$HOME/mission-control/data/`** by default (unless **`MC_DATA_DIR`** or **`MISSION_CONTROL_DATA_DIR`** is set). The previous default was **`$HERMES_HOME/mission-control/data/`** (typically `~/.hermes/mission-control/data/`).

**Why:** Nested Hermes cron (`mark_job_run`) updates mission JSON under `$HOME/mission-control/data/missions/`. Aligning MC’s default avoids silent misses when Hermes posts results back to disk.

**If you already have data under `~/.hermes/mission-control/data/`:**

1. Move or symlink the tree to the new location, for example:
   - `mkdir -p ~/mission-control/data`
   - `mv ~/.hermes/mission-control/data/* ~/mission-control/data/`  
     (or use `rsync` if you prefer a copy-then-verify flow)
2. Or set **`MC_DATA_DIR`** to your existing absolute path (no move required), e.g. in `.env.local`:
   - `MC_DATA_DIR=/home/you/.hermes/mission-control/data`

**Cron repeat:** Recurring jobs created by MC now use **`repeat.times: null`** for “run forever”, matching Hermes’ canonical form (instead of `-1`).
