# Upgrade Notes (OSS)

## Supported Runtime Variables

Control Hub OSS uses the following canonical variables:

| Variable | Purpose |
|---|---|
| `CH_EDITION` | Build/runtime edition value (`oss`) |
| `NEXT_PUBLIC_CH_EDITION` | Client-visible edition value |
| `CH_API_KEY` | Optional API key for mutating routes |
| `CH_API_KEYS_SCOPED_JSON` | Optional scoped key map (`read`, `write`, `admin`) |
| `CH_REQUEST_SIGNING_SECRET` | Optional request-signing secret |
| `CH_READ_ONLY` | Read-only mode for mutating routes |
| `CH_ENABLE_DEPLOY_API` | Deploy API enable gate |
| `CH_DATA_DIR` | Application data directory |
| `HERMES_HOME` | Hermes root directory |

## Upgrade Checklist

1. Pull latest changes.
2. Run `npm ci`.
3. Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.
4. Update environment variables to canonical names listed above.
5. Run `bash scripts/release.sh` for controlled release execution.
