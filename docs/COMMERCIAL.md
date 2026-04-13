# Commercial Mission Control

Commercial builds add Taskforce-style surfaces (operations, task lists, workspaces, packages, command room), rich schedule parsing, and optional Ed25519 license verification via the private **mc-pro** package (scoped npm).

## License environment

- `MC_EDITION=commercial`
- `NEXT_PUBLIC_MC_EDITION=commercial`
- `AC_LICENSE_KEY` — signed JWT / token verified with `AC_LICENSE_ED25519_PUBLIC_PEM`

Mutating commercial APIs require a valid license when `MC_EDITION=commercial`, in addition to `MC_API_KEY` when that key is configured.

## Distribution

- **Private npm** for the scoped **mc-pro** package (registry or tarball in Docker build).
- **Docker**: use a build secret or pre-built layer that installs the commercial package without committing sources to the OSS repository.

Never push `packages/mc-pro` source to the public `hermes-mission-control` remote. Use `tools/publish-oss/sync.ts` for one-way OSS exports only.
