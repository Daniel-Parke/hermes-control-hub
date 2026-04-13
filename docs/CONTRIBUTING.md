# Contributing

## Workflow

1. Branch from `dev`.
2. Implement change with tests.
3. Run:
   - `npm run lint`
   - `npx tsc --noEmit -p tsconfig.json`
   - `npm test`
   - `npm run test:coverage`
   - `npm run build`
4. Open PR to `dev`.
5. Merge to `main` only through reviewed PR flow.

## Standards

- TypeScript strict mode only.
- API routes return `{ data?, error? }`.
- All mutating routes enforce auth/read-only/deploy policy gates.
- Filesystem writes must use validated paths under allowed roots.
- Do not commit runtime artifacts (`.next`, `coverage`, `test-results`, databases, logs).

## Testing

- Add or update tests for every code change.
- Prefer contract assertions over weak truthy checks.
- Keep OSS tests in `src/__tests__/oss`.
- CI runs on Linux and macOS; local validation should match that matrix.

## Documentation

- Update docs in the same PR when behavior or configuration changes.
- Use OSS terminology consistently.
- Keep docs implementation-accurate and remove stale references.
