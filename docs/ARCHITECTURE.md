# Architecture (OSS)

Control Hub OSS is a Next.js App Router application for operating Hermes agents. The repository is self-contained and documents only the runtime surface shipped in this OSS build.

## Stack

- Next.js + TypeScript
- Tailwind + component primitives
- File-based persistence under `HERMES_HOME` and `CH_DATA_DIR`
- REST API handlers under `src/app/api`
- Jest test suite under `src/__tests__/oss`

## Layout

```
hermes-control-hub/
├── src/
│   ├── app/              # Pages and API routes
│   ├── components/       # UI components
│   ├── lib/              # Utilities, auth, filesystem helpers
│   ├── types/            # Shared TypeScript contracts
│   └── __tests__/oss/    # OSS contract and behavior tests
├── docs/                 # Operator and contributor documentation
├── scripts/              # Setup, restart, release helpers
└── config/               # Jest and build configuration
```

## Runtime Data Flow

1. Browser requests pages and API routes.
2. API routes validate request policy (auth/read-only/deploy gates).
3. Routes read and write data in Hermes directories.
4. Responses return the `{ data?, error? }` envelope.

## Security Contract

- Mutating routes require API authorization when configured.
- Deploy routes honor `CH_ENABLE_DEPLOY_API` and request-signing policy.
- Path inputs are normalized and validated before filesystem operations.
- Audit entries include correlation IDs for traceability.

## Testing Contract

- Keep OSS behavior tests in `src/__tests__/oss`.
- Validate API contracts, path safety, scheduler semantics, and auth behavior.
- Enforce lint, typecheck, tests, and build in CI before release.
