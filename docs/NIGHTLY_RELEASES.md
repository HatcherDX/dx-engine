# Nightly Releases Configuration

## Overview

The Hatcher DX Engine now supports automated nightly releases using **semantic-release** with unified versioning across all monorepo packages.

## Key Features

### 🔄 Unified Versioning

- **ALL packages share the same version number** (currently 0.3.5)
- Single source of truth for project version
- No version mismatches between packages
- Follows best practices from Babel, Jest, and Lerna

### 🚀 Automated Release Pipeline

- **Daily nightly builds** at 2 AM UTC
- **Manual trigger** available via GitHub Actions
- **Multi-platform builds** (Windows, macOS, Linux, ARM64)
- **Conventional commits** for automatic versioning
- **Changelog generation** with each release

## Configuration Files

### `.releaserc.json`

Main semantic-release configuration with:

- Branch configuration (main, nightly)
- Plugin setup for changelog, Git, GitHub releases
- Unified version management via exec plugin
- Binary asset configuration for releases

### `.github/workflows/nightly-release.yml`

GitHub Actions workflow that:

- Runs daily at 2 AM UTC
- Checks for new commits in last 24 hours
- Creates nightly pre-release versions
- Builds binaries for all platforms
- Uploads artifacts to GitHub releases

### `scripts/version-sync.ts`

Utility script that:

- Updates all package.json files to the same version
- Ensures monorepo consistency
- Used by semantic-release during prepare phase

## Version Numbering

### Stable Releases (main branch)

- Format: `v0.3.5`, `v0.4.0`, `v1.0.0`
- Created from main branch
- Published as "latest" release

### Nightly Releases (nightly branch)

- Format: `v0.3.6-nightly.1`, `v0.3.6-nightly.2`
- Created from nightly branch
- Published as pre-release versions
- Incremental build numbers for each nightly

## Available Commands

```bash
# Sync all packages to same version
pnpm version:sync 0.3.5

# Create a release (requires GitHub token)
pnpm release

# Preview release without pushing
pnpm release:dry

# Create nightly release
pnpm release:nightly
```

## How to Activate

1. **Create nightly branch:**

   ```bash
   git checkout -b nightly
   git push origin nightly
   ```

2. **Configure GitHub secrets (if needed):**
   - `GITHUB_TOKEN` is automatically available in Actions
   - No additional secrets required for basic setup

3. **Wait for automatic trigger:**
   - Nightly releases start automatically at 2 AM UTC
   - Or trigger manually from GitHub Actions UI

## Commit Message Convention

Semantic-release uses conventional commits to determine version bumps:

- `fix:` - Patch release (0.3.5 → 0.3.6)
- `feat:` - Minor release (0.3.5 → 0.4.0)
- `BREAKING CHANGE:` - Major release (0.3.5 → 1.0.0)
- `chore:`, `docs:`, `style:` - No release

## Build Artifacts

Each release includes binaries for:

- **macOS**: Universal DMG and ZIP (x64 + ARM64)
- **Windows**: Installer EXE (x64 and ARM64)
- **Linux**: AppImage, DEB, Snap, tar.gz (x64 and ARM64)

## Monitoring Releases

- Check GitHub Actions: `Actions` tab → `Nightly Release` workflow
- View releases: `Releases` page on GitHub
- Download artifacts: Available on each release page

## Troubleshooting

### No release created

- Check if there are new commits since last release
- Verify commit messages follow conventional format
- Check GitHub Actions logs for errors

### Build failures

- Review platform-specific build logs
- Check native dependency compilation
- Verify Node.js and pnpm versions

### Version conflicts

- Run `pnpm version:sync` to align all packages
- Ensure no manual version changes in package.json files
- Check that semantic-release has write permissions

## Package Configuration

All packages now use version **0.3.5**:

- Root package
- Apps: electron, web, preload, docs
- Universal: terminal-system, git-genius, storage, shared-utils, shared-rendering
- Tooling: vite-plugin, translation-system, puppeteer-google-translate

## Security Notes

- Releases are signed with GitHub's automated signatures
- Changelog commits skip CI to avoid infinite loops
- Binary artifacts are built in isolated environments
- No credentials are stored in configuration files

## Future Enhancements

Potential improvements for the release pipeline:

- Code signing for Windows and macOS binaries
- Automatic update notifications in the app
- Beta channel for testing features
- Release notes translation
- Performance metrics in releases

---

Last updated: August 2025
Version: 1.0.0
