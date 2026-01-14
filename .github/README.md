# GitHub Workflows

## CI Workflow (`ci.yml`)

Runs on every push and pull request to `main` or `develop` branches.

**Tests on:**
- Node.js 18.x, 20.x, 22.x
- Runs type checking, tests, and build

## Publish Workflow (`publish.yml`)

Automatically publishes to npm when you push a version tag.

**Two methods supported:**
1. ✅ **Trusted Publishing** (Recommended - more secure, no secrets)
2. ⚠️ **Access Token** (Fallback - requires manual token management)

### Method 1: Trusted Publishing (Recommended)

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

The workflow uses OpenID Connect (OIDC) - no tokens needed. The `id-token: write` permission handles authentication.

---

### Method 2: Access Token (Legacy Fallback)

Only use this if Trusted Publishing doesn't work for you.

1. **Create Granular Access Token on npm**
   
   Go to [npmjs.com](https://www.npmjs.com) → Settings → Access Tokens → Generate New Token → **Granular Access Token**
   
   **Token Configuration Checklist:**
   ```
   ✅ Name: "GitHub Actions - PhysEngine"
   ✅ Expiration: 365 days (1 year)
   ✅ Packages and scopes: 
      • Select "Only select packages and scopes"
      • Add package: physengine
   ✅ Permissions: Read and write
   ✅ Organizations: (leave empty)
   ✅ IP ranges: (leave empty - GitHub Actions IPs change)
   ✅ Bypass 2FA: true (REQUIRED if you have 2FA enabled)
   ```
   
   **Why "Bypass 2FA"?**
   - GitHub Actions can't enter 2FA codes
   - Token is scoped to one package only (secure)
   - Token expires after 1 year (forces renewal)
   
   ⚠️ Copy the token immediately (shown only once!)

2. **Add to GitHub Secrets**
   - Repository → Settings → Secrets and variables → Actions
   - New repository secret
   - Name: `NPM_TOKEN`
   - Value: (paste your npm token)

### Usage

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

### Token Management

**Important:**
- Granular tokens can expire (set expiration when creating)
- You can create up to 1000 tokens
- Each token can access up to 50 packages/scopes
- If token expires, workflow will fail → create new token and update GitHub secret

**Security Best Practices:**
- ✅ Set expiration (forces periodic review)
- ✅ Enable "Bypass 2FA" for automation
- ✅ Limit to specific package only
- ✅ Use read-write (not legacy tokens)
- ❌ Don't use personal tokens with broad access

### Troubleshooting

**Publish fails with "403 Forbidden":**
- Token doesn't have write access → recreate with read-write
- Package name not in token scope → add `physengine` to token
- Token expired → create new token, update GitHub secret

**Publish fails with "OTP required":**
- "Bypass 2FA" is `false` → recreate token with bypass enabled
- Account requires 2FA but token can't bypass → token config issue

**How to update expired token:**
```bash
# 1. Create new token on npmjs.com (same settings)
# 2. Update GitHub secret:
#    Repo → Settings → Secrets → NPM_TOKEN → Update
# 3. Next tag push will use new token
```

### Manual Publish

You can still publish manually:

```bash
pnpm build
npm publish
```

