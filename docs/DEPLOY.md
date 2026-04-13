# Deploying Mission Control

## Host and port

Next.js reads **`PORT`** (default 3000). For LAN access bind to all interfaces (e.g. `HOSTNAME=0.0.0.0` with `npm run start` or your process manager). Behind a reverse proxy, terminate TLS at nginx/Caddy/Traefik and forward HTTP to the app.

## Required environment

| Variable | Purpose |
|----------|---------|
| `HERMES_HOME` | Hermes agent data root (must match the running agent). |
| `MC_DATA_DIR` | Mission Control JSON root (default `~/mission-control/data`). |
| `MC_API_KEY` | **Strongly recommended** in any shared or remote deployment; required header `X-MC-API-Key` or `Authorization: Bearer` for mutating routes. |
| `MC_READ_ONLY` | Set to `1` for read-only UI/API. |

Never expose mutating APIs to the public internet without authentication.

## Docker

```bash
docker compose build
docker compose up -d
```

Mount real `HERMES_HOME` and `MC_DATA_DIR` volumes that match your agent host, or use bind mounts to host paths.

## TLS

Use a reverse proxy with automatic certificates (Let’s Encrypt). Do not commit TLS material into the repo.
