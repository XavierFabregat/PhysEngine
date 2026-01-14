# Contributing to PhysEngine

Thank you for your interest in contributing! This document outlines the development workflow.

## Development Workflow

We use a **branch-based workflow** with pull requests for all changes.

### Branches

- **`main`** - Production-ready code, always stable
  - Tagged releases are published to npm from here
  - Protected - requires PR approval
  - CI must pass before merge
  
- **`dev`** - Active development branch
  - All feature work happens here
  - May be unstable
  - Merge to `main` via PR when stable

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/XavierFabregat/PhysEngine.git
   cd PhysEngine
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Install GitHub CLI** (if not already installed)
   ```bash
   # macOS
   brew install gh
   
   # Other platforms: https://cli.github.com/
   ```

4. **Authenticate GitHub CLI**
   ```bash
   gh auth login
   ```

## Making Changes

### 1. Start from `dev` Branch

```bash
# Switch to dev branch
git checkout dev

# Make sure it's up to date
git pull origin dev
```

### 2. Create a Feature Branch (Optional)

For larger features, create a branch from `dev`:

```bash
# Create feature branch
git checkout -b feature/my-feature

# Or for bugs
git checkout -b fix/bug-description
```

### 3. Make Your Changes

```bash
# Edit files
# ...

# Run tests frequently
pnpm test

# Build to check for errors
pnpm build

# Try the examples
pnpm example:orbit
```

### 4. Commit Your Changes

```bash
# Stage changes
git add .

# Commit with descriptive message
git commit -m "feat: add normalize function to Vector2"

# Or for fixes
git commit -m "fix: correct AABB overlap edge case"
```

**Commit Message Convention:**
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `test:` - Test additions/changes
- `refactor:` - Code refactoring
- `perf:` - Performance improvements
- `chore:` - Maintenance tasks

### 5. Push and Create PR to `dev`

**If working directly on `dev`:**
```bash
git push origin dev
```

**If working on feature branch:**
```bash
# Push feature branch
git push origin feature/my-feature

# Create PR to dev using GitHub CLI
gh pr create --base dev --title "Add normalize function" --body "Implements vector normalization with tests"

# Or interactive mode (asks questions)
gh pr create --base dev
```

### 6. Review and Merge

```bash
# View your PRs
gh pr list

# Check PR status
gh pr view

# If CI passes, merge
gh pr merge --squash  # Squash commits
# or
gh pr merge --merge   # Keep all commits
```

## Releasing to `main`

When `dev` is stable and ready for release:

### 1. Create PR from `dev` to `main`

```bash
# Make sure dev is up to date
git checkout dev
git pull origin dev

# Create release PR
gh pr create \
  --base main \
  --head dev \
  --title "Release v0.2.0" \
  --body "**Changes:**
- Added XYZ feature
- Fixed ABC bug
- Updated documentation

**Tests:** 293/293 passing
**Breaking changes:** None"
```

### 2. Review and Merge

```bash
# Once CI passes and ready
gh pr merge --merge  # Keep full history for releases
```

### 3. Tag and Publish

```bash
# Switch to main
git checkout main
git pull origin main

# Bump version
pnpm version patch  # 0.1.0 → 0.1.1
# or
pnpm version minor  # 0.1.0 → 0.2.0

# This creates a git tag and updates package.json

# Push with tags (triggers automated publish)
git push --follow-tags
```

GitHub Actions will automatically:
1. Run tests
2. Build
3. Publish to npm via Trusted Publishing

### 4. Sync `dev` with `main`

```bash
# Merge main back to dev to keep in sync
git checkout dev
git merge main
git push origin dev
```

## Quick Reference

### Daily Development

```bash
# Work on dev
git checkout dev
git pull origin dev

# Make changes, test
pnpm test
pnpm build

# Commit and push
git add .
git commit -m "feat: my feature"
git push origin dev
```

### Feature Branch Workflow

```bash
# Create feature branch from dev
git checkout dev
git checkout -b feature/my-feature

# Work, commit
git add .
git commit -m "feat: implement feature"

# Push and PR to dev
git push origin feature/my-feature
gh pr create --base dev

# After merge, delete branch
git checkout dev
git branch -d feature/my-feature
```

### Release Workflow

```bash
# PR dev → main
gh pr create --base main --head dev --title "Release v0.X.0"

# After merge
git checkout main
git pull
pnpm version minor
git push --follow-tags  # Triggers automated publish

# Sync dev
git checkout dev
git merge main
git push origin dev
```

## Testing

Always test before pushing:

```bash
# Run all tests
pnpm test:run

# Type check
pnpm typecheck

# Build
pnpm build

# Try examples
pnpm example:orbit
pnpm example:balls
pnpm example:swarm
```

## GitHub CLI Commands Cheat Sheet

```bash
# Create PR
gh pr create                    # Interactive
gh pr create --base dev         # To dev branch
gh pr create --draft            # Draft PR

# View PRs
gh pr list                      # List all PRs
gh pr view                      # View current PR
gh pr view 123                  # View specific PR
gh pr status                    # Your PRs

# Manage PRs
gh pr checkout 123              # Check out PR locally
gh pr diff                      # View changes
gh pr merge --squash            # Squash and merge
gh pr merge --merge             # Merge commit
gh pr merge --rebase            # Rebase and merge

# Other
gh pr review --approve          # Approve PR
gh pr comment "LGTM"           # Add comment
gh pr close                     # Close PR
```

## Questions?

Open an issue or ask in discussions!

