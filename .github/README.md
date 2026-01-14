# GitHub Workflows

## Git Workflow Overview

### Branch Strategy

```
main (protected)
  ↑
  │ PR (when stable)
  │
dev (active development)
  ↑
  │ PR (for features)
  │
feature/xyz (optional)
```

### Development Cycle

1. **Work on `dev`** - All changes go here first
2. **PR to `dev`** - If using feature branches
3. **Test on `dev`** - CI validates changes
4. **PR `dev` → `main`** - When ready for release
5. **Tag on `main`** - Auto-publishes to npm

See [CONTRIBUTING.md](../CONTRIBUTING.md) for detailed workflow.

---

## CI Workflow (`ci.yml`)

Runs on every push and pull request to `main` or `dev` branches.

**Tests on:**
- Node.js 18.x, 20.x, 22.x
- Runs type checking, tests, and build

**Branch Strategy:**
- `main` - Production releases only (protected, requires PR)
- `dev` - Active development (all work happens here)

**When it runs:**
- Every push to `dev` or `main`
- Every PR to `dev` or `main`
- Must pass before merging PRs

## Publish Workflow (`publish.yml`)

Automatically publishes to npm when you push a version tag using **Trusted Publishing** (OpenID Connect).

**Why Trusted Publishing?**
- ✅ No secrets to manage
- ✅ No token expiration
- ✅ More secure (cryptographic proof of identity)
- ✅ No 2FA bypass needed

### Setup

**Prerequisites:**
- Package must exist on npm (do first manual publish)
- GitHub repo must be public

**Setup Steps:**

1. **First Manual Publish** (one time)
   ```bash
   npm login
   pnpm build
   npm publish --access public
   ```

2. **Configure Trusted Publishing on npm**
   - Go to [npmjs.com](https://www.npmjs.com/package/@xavifabregat/physengine/access)
   - Or: npmjs.com → Your Packages → `@xavifabregat/physengine` → Publishing Access
   - Click **Add Trusted Publisher**
   - Configure:
     ```
     Provider: GitHub Actions
     Repository Owner: XavierFabregat
     Repository name: PhysEngine
     Workflow filename: publish.yml
     Environment name: (leave empty)
     ```
   - Click **Add**

3. **That's it!** Future releases are automatic:
   ```bash
   pnpm version patch
   git push --follow-tags
   ```

The workflow uses OpenID Connect (OIDC) - no tokens or secrets needed. The `id-token: write` permission handles authentication.

### Usage

Once Trusted Publishing is configured, releasing is automatic:

```bash
# Update version
pnpm version patch  # 0.1.0 → 0.1.1
pnpm version minor  # 0.1.0 → 0.2.0
pnpm version major  # 0.1.0 → 1.0.0

# Push with tags (triggers publish workflow)
git push --follow-tags
```

The workflow will:
1. ✅ Run all tests
2. ✅ Build the library
3. ✅ Publish to npm with provenance
4. ❌ Cancel if tests fail

### Troubleshooting

**Publish fails with "403 Forbidden" or "401 Unauthorized":**
- Trusted Publishing not configured → follow setup steps above
- Wrong repository/workflow name in trusted publisher config
- GitHub repo is private → must be public for Trusted Publishing

**Publish fails with "404 Not Found":**
- Package doesn't exist yet → do manual first publish
- Package name changed → update trusted publisher config on npm

### Manual Publish

You can still publish manually:

```bash
pnpm build
npm publish
```

---

## GitHub CLI Workflow

### Daily Development

```bash
# Start work on dev
git checkout dev
git pull origin dev

# Make changes and commit
git add .
git commit -m "feat: add feature"
git push origin dev
```

### Using Feature Branches

```bash
# Create feature branch from dev
git checkout dev
git checkout -b feature/my-feature

# Work and commit
git add .
git commit -m "feat: implement feature"

# Push and create PR to dev
git push origin feature/my-feature
gh pr create --base dev --title "Add my feature"

# View PR status
gh pr view

# After CI passes, merge
gh pr merge --squash

# Clean up
git checkout dev
git pull origin dev
git branch -d feature/my-feature
```

### Release Process

```bash
# Create release PR (dev → main)
git checkout dev
gh pr create \
  --base main \
  --head dev \
  --title "Release v0.2.0" \
  --body "Release notes..."

# View and merge when ready
gh pr view
gh pr merge --merge  # Keep full history

# Tag and publish (triggers automated workflow)
git checkout main
git pull origin main
pnpm version minor  # 0.1.0 → 0.2.0
git push --follow-tags

# Sync dev with main
git checkout dev
git merge main
git push origin dev
```

### Useful Commands

```bash
# View all PRs
gh pr list

# Check CI status
gh pr checks

# View PR diff
gh pr diff

# Review PR
gh pr review --approve
gh pr review --comment --body "Looks good!"

# Close without merging
gh pr close
```

