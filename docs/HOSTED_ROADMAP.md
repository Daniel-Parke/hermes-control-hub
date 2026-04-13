# Hosted Hermes + Mission Control (roadmap)

This milestone is **design-only** until product requirements are locked. No placeholder HTTP routes are shipped in OSS.

## Target properties

- Hermes home directory and Mission Control data co-located on the same host or container pair.
- Shared environment layer (`HERMES_HOME`, `MC_DATA_DIR`, optional `AC_DEPLOYMENT_MODE=hosted`, central API URL for billing or telemetry only if needed).
- Future: authenticated upload/download of Hermes home archives for migration; object storage abstraction; quotas.

## Implementation gate

Work proceeds in a dedicated milestone after local + commercial self-host are stable: API contracts, auth model, and storage backend must be specified before coding.
