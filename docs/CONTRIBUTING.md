# Contributing



This guide applies to **this repository** (Control Hub Simple / OSS). Run **`npm test`** for the Jest suite: it executes **only** tests under `src/__tests__/oss/` (Simple-edition surface). There is no commercial test project here.



## Upstream source



Control Hub is **released from a private monorepo** using an allowlisted export. Most day-to-day development and review may happen upstream; this public tree is the supported **OSS artifact**. Non-trivial changes merged here should be mirrored upstream so the next `publish:oss` export does not overwrite your work. Maintainers may restrict or decline community PRs that do not align with the product roadmap.



## Getting Started



```bash

# Clone and set up

git clone https://github.com/Daniel-Parke/hermes-control-hub.git ~/control-hub

cd ~/control-hub

bash scripts/setup.sh    # npm install + build

```



## Documentation map



| Doc | Purpose |

|-----|---------|

| [ARCHITECTURE.md](ARCHITECTURE.md) | OSS tree layout, data flow, testing surface |

| [API.md](API.md) | REST endpoints |

| [DEPLOY.md](DEPLOY.md) | Env vars, TLS, Docker |

| [HERMES_CONFIG_INTEGRATION.md](HERMES_CONFIG_INTEGRATION.md) | Align with Hermes + hermes-config |

| [OSS_SCOPE.md](OSS_SCOPE.md) | What Simple edition includes / excludes |

| [EDITION_COMPONENTS.md](EDITION_COMPONENTS.md) | When to use `*-oss` vs commercial-only routes |

| [UPGRADE.md](UPGRADE.md) | Renames, `CH_*` vs `CH_*` env migration |

| [BRANCHING.md](BRANCHING.md) | `dev` → `main`, branch protection |



Maintainers: the private **agent-control-hub** monorepo holds `docs/RELEASE_PLAYBOOK.md`, `docs/NAMING_AND_ENV.md`, and root `ARCHITECTURE.md` (full stack + export pipeline).



---



## Development Workflow



### Branch Strategy



All work happens on `dev`. `main` is protected — never push directly.



```bash

# Start work

git checkout dev

git pull origin dev

git checkout -b feature/your-feature-name



# Make changes, then commit

git add -A

git commit -m "feat: description of change"



# Push and create PR

git push origin feature/your-feature-name

# Create PR: feature/your-feature-name → dev

```



See [BRANCHING.md](BRANCHING.md) for full branching rules.



### Commit Convention



Use conventional commits:



```

feat: add new feature

fix: resolve bug

refactor: restructure code

docs: update documentation

test: add or update tests

chore: maintenance tasks

```



---



## Development Commands



```bash

npm run dev           # Dev server with hot reload (port 3000)

npm run build         # Production build (MUST pass before commit)

npm test              # Jest (OSS suite for Simple edition)

npm run test:watch    # Watch mode for TDD

npm run test:coverage # Coverage report

npm run lint          # ESLint check

```



**Always run `npm run build` before pushing.** The build must pass.



---



## Code Standards



### TypeScript



- **Strict mode** — no `any`, no `@ts-ignore`

- All types defined in `src/types/hermes.ts`

- Use proper generics for API responses



### API Routes



Every route follows this pattern:



```typescript

import { ApiResponse } from "@/types/hermes";

import { logApiError } from "@/lib/api-logger";



export async function GET(): Promise<Response> {

  try {

    const data = await fetchData();

    return Response.json({ data });

  } catch (error) {

    logApiError("/api/example", "GET", error);

    return Response.json({ error: "Description" }, { status: 500 });

  }

}

```



### UI Components



- Loading + error states for every async operation

- Destructive actions need confirmation dialogs

- Use components from `src/components/ui/` (Button, Card, Modal, etc.)

- Use `clsx` + `tailwind-merge` for conditional classes



### Path Handling



**Use string concatenation, NOT `path.join`** (Turbopack NFT tracing issue):



```typescript

// Correct

const filePath = HERMES_HOME + "/config.yaml";



// Wrong

const filePath = path.join(HERMES_HOME, "config.yaml");

```



### Security



- `.env` keys displayed as `sk-...abcd` only — never expose raw secrets

- Whitelist body fields in PUT handlers (no mass assignment)

- Validate file paths with `path.resolve()` + `startsWith()`

- Never write to `~/.hermes/` directly — use API endpoints



---



## Testing



### Writing Tests



Tests live in `src/__tests__/`. Name pattern: `<module>.test.ts`.



```typescript

import { timeAgo } from "@/lib/utils";



describe("timeAgo", () => {

  it("returns 'just now' for recent dates", () => {

    expect(timeAgo(new Date())).toBe("just now");

  });

});

```



### Running Tests



```bash

npm test                    # Jest (OSS project)

npm run test:watch          # Watch mode

npm run test:coverage       # With coverage report

npm test -- --testPathPattern=utils  # Run specific test file

```



---



## Adding New Features



### New Page



1. Create `src/app/your-page/page.tsx`

2. Add to sidebar in `src/components/layout/Sidebar.tsx`

3. If it needs an API, create `src/app/api/your-endpoint/route.ts`

4. Add types to `src/types/hermes.ts`



### New API Route



1. Create `src/app/api/your-route/route.ts`

2. Use `ApiResponse<T>` envelope pattern

3. Import paths from `src/lib/hermes.ts`

4. Error handling with `logApiError()`

5. Add test in `src/__tests__/`



### New UI Component



1. Create in `src/components/ui/` (reusable) or `src/components/<feature>/` (feature-specific)

2. Use Tailwind CSS + Radix UI primitives

3. Export with proper TypeScript types



---



## PR Checklist



Before submitting a PR:



- [ ] `npm run build` passes

- [ ] `npm test` passes

- [ ] No `any` types or `@ts-ignore` comments

- [ ] API routes use `ApiResponse<T>` envelope

- [ ] Error handlers use `logApiError()`

- [ ] Destructive actions have confirmation

- [ ] Secrets masked in UI (`sk-...abcd`)

- [ ] String concatenation for paths (not `path.join`)

- [ ] British English spelling in UI text



---



## Deployment



### Manual



```bash

# 1. Build (must pass)

cd ~/control-hub && npm run build



# 2. Kill existing server

fuser -k 3000/tcp 2>/dev/null; sleep 2



# 3. Start (bind for LAN if needed)

node node_modules/next/dist/bin/next start -p 3000 -H 0.0.0.0

```



### Via API



```bash

curl -X POST http://localhost:3000/api/update \

  -H "Content-Type: application/json" \

  -d '{"action": "update"}'

```



The update endpoint fetches from `origin/main`, runs `npm install` if `package.json` changed, builds, and restarts. A lock file prevents concurrent deploys. Build failures abort without restarting.



### Scripts



```bash

bash scripts/restart.sh         # Restart only (no git/build)

bash scripts/update.sh          # Pull + build + restart

bash scripts/update.sh --restart-only  # Restart only (same as restart.sh)

```



---



## Project Structure



See [ARCHITECTURE.md](ARCHITECTURE.md) for directory layout and data flow.



## API Reference



See [API.md](API.md) for API endpoints and request/response formats.

