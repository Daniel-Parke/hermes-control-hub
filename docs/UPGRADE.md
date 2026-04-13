# Upgrade notes (OSS / Simple edition)

## Extended edition

Advanced Command Hub capabilities (additional operator workflows, extended scheduling helpers, and related UIs) are **not part of this open-source repository**.

This project is **Command Hub Simple**. For questions about other offerings, contact the maintainers through the channels listed on the project homepage.

---

## Renaming from “Control Hub” and legacy env vars

The product is now **Command Hub**. The public Git repository is **hermes-control-hub** (previously published as `hermes-control-hub`).

### Clone / install path

- Default app data directory is now **`$HOME/command-hub/data`** (was `~/control-hub/data`). Set **`CH_DATA_DIR`** or legacy **`CH_DATA_DIR`** if you keep data in the old location.
- Default installer clone directory is **`~/command-hub`** unless you set **`INSTALL_DIR`**.

### Environment variables (canonical vs legacy)

| Prefer | Legacy (still works) |
|--------|----------------------|
| `CH_EDITION` | `CH_EDITION` |
| `NEXT_PUBLIC_CH_EDITION` | `NEXT_PUBLIC_CH_EDITION` |
| `CH_API_KEY` | `CH_API_KEY` |
| `CH_DATA_DIR` | `CH_DATA_DIR`, `CONTROL_HUB_DATA_DIR` |
| `CH_READ_ONLY` | `CH_READ_ONLY` |
| `CH_ENABLE_DEPLOY_API` | `CH_ENABLE_DEPLOY_API` |

API clients may send **`X-CH-API-Key`** or legacy **`X-CH-API-Key`**.

### Git remote

After the GitHub repository rename, update your remote:

```bash
git remote set-url origin https://github.com/<owner>/hermes-control-hub.git
```
