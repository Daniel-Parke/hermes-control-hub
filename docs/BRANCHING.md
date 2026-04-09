# Branching Strategy

Mission Control uses a **dev → main** branching model with PR-based approval for production changes.

## Branch Structure

```
main          ← Production. Always deployable. Protected.
  └── dev     ← Development. All work happens here. Agents commit here.
```

## Rules

### For Agents (Automated Work)
- **Always work on `dev` branch.** Never commit directly to `main`.
- Commit frequently with clear messages.
- After completing a task, push to `dev` and create a PR to `main`.
- Do NOT merge the PR — wait for human approval.

### For Humans (Manual Work)
- Review PRs from `dev` → `main`.
- Merge when satisfied with the changes.
- Deploy from `main` after merging.

## Workflow

```bash
# Agent workflow (automated)
git checkout dev
git pull origin dev
# ... make changes ...
git add -A
git commit -m "feat: description of change"
git push origin dev
# Create PR: dev → main (via gh or web UI)

# Human workflow (manual)
gh pr list                          # See open PRs
gh pr review <number> --approve     # Approve
gh pr merge <number> --merge        # Merge to main

# Deploy from main
git checkout main
git pull origin main
npm run build
fuser -k 3000/tcp
nohup npx next start -p 3000 -H 0.0.0.0 &
```

## Protection Rules

Set these on GitHub (Settings → Branches → Branch protection rules for `main`):

- [x] Require pull request before merging
- [x] Require approvals (1)
- [x] Require status checks to pass (build)
- [x] Require branches to be up to date
- [ ] Allow force pushes (keep OFF)

## Agent Permission Model

Agents can:
- ✅ Commit to `dev`
- ✅ Push to `dev`
- ✅ Create PRs from `dev` → `main`
- ❌ Merge PRs (requires human approval)
- ❌ Push to `main`
- ❌ Force push anywhere

This ensures agents can iterate rapidly on `dev` while `main` stays stable and human-controlled.

## Commit Convention

Use conventional commits for clear history:

```
feat: add new feature
fix: resolve bug
refactor: restructure code
docs: update documentation
test: add or update tests
chore: maintenance tasks
```

## Quick Setup

```bash
# Initialize branching on a new repo
git checkout -b dev
git push -u origin dev

# Set main as default on GitHub, then add protection rules
# Agents will automatically work on dev
```

<!-- Agent workflow test commit -->
