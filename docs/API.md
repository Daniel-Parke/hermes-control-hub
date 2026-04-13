# API Reference (OSS)

All API routes return the envelope:

```typescript
{ data?: T; error?: string }
```

All error handlers must call `logApiError(route, context, error)` from `@/lib/api-logger`.

## Route Inventory

| Route | Methods | Purpose |
|---|---|---|
| `/api/agent/files` | `GET` | List agent behavior files. |
| `/api/agent/files/[key]` | `GET`, `PUT` | Read/update one behavior file. |
| `/api/agent/personality` | `PUT` | Update selected personality config. |
| `/api/agent/profiles` | `GET` | List available Hermes profiles. |
| `/api/agents` | `GET` | Inspect running Hermes agent processes. |
| `/api/config` | `GET`, `PUT` | Read/update parsed config content. |
| `/api/config/model` | `GET`, `PUT` | Read/update model settings. |
| `/api/cron` | `GET`, `POST`, `PUT`, `DELETE` | Manage cron jobs. |
| `/api/gateway` | `GET` | Read gateway/platform status. |
| `/api/logs` | `GET` | Read recent Hermes logs. |
| `/api/memory` | `GET`, `POST`, `PUT`, `DELETE` | Manage holographic memory facts. |
| `/api/memory/hindsight` | `GET`, `POST` | Query/retain hindsight memory records. |
| `/api/missions` | `GET`, `POST` | List and dispatch missions. |
| `/api/missions/health` | `GET` | Mission subsystem health view. |
| `/api/monitor` | `GET` | Aggregated system monitoring snapshot. |
| `/api/personalities` | `GET`, `POST`, `PUT`, `DELETE` | Manage personality records. |
| `/api/sessions` | `GET` | List sessions with filters. |
| `/api/sessions/[id]` | `GET` | Read one session transcript. |
| `/api/skills` | `GET` | List skills inventory. |
| `/api/skills/[name]` | `GET` | Read one skill document. |
| `/api/skills/[name]/toggle` | `PUT` | Enable/disable a skill for a profile. |
| `/api/skills/[...path]` | `GET` | Read files under a skill tree. |
| `/api/status` | `GET` | Basic readiness endpoint. |
| `/api/stories` | `POST` | Create/update Story Weaver data. |
| `/api/templates` | `GET`, `POST` | List and create mission templates. |
| `/api/tools` | `GET`, `PUT` | Read/update toolset configuration. |
| `/api/update` | `GET`, `POST` | Check release status; run restart/release actions. |

## Auth and Safety Notes

- Mutating routes are gated by `CH_API_KEY` / scoped key policies when configured.
- Deploy actions (`/api/update` `POST`) are additionally gated by `CH_ENABLE_DEPLOY_API`.
- Signed request support can be enabled with `CH_REQUEST_SIGNING_SECRET`.
- Correlation IDs are accepted via `x-correlation-id` or `x-request-id`.
