# Deployment — `hatcher.rs` (Cloudflare Pages)

The public website lives at **`sites/hatcher`** (`@hatcherdx/hatcher`) and deploys
to **[hatcher.rs](https://hatcher.rs)** as a fully static [Astro](https://astro.build)
site on **Cloudflare Pages**. There is **one** Pages project, no Worker, no adapter.

> **Status:** Phase 1 scaffold (home `/`, stub `/ide`, Starlight docs at `/ide/docs`).
> The site is a neutral pre-launch placeholder; `public/robots.txt` currently
> disallows indexing — flip it at launch. See the **Repo Architecture** page
> (`/architecture/`) for the repo and build topology.
>
> **Historical note:** the previous `apps/docs` → GitHub Pages → `hatche.rs`
> deploy (workflow `deploy-docs.yml`, a `CNAME` file) has been removed from the
> repo. If `hatche.rs` DNS still points at GitHub Pages (`185.199.x.x`),
> decommission or repoint it as part of the cutover to `hatcher.rs`.

## Cloudflare Pages project settings

Workers & Pages → create project → connect the Git repo → **Settings → Build**:

| Setting          | Value                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------- |
| Build system     | **V2+** (monorepo support)                                                                  |
| Root directory   | **repo root** (default)                                                                     |
| Build command    | `pnpm install --ignore-scripts && pnpm exec turbo run build --filter=@hatcherdx/hatcher...` |
| Output directory | `sites/hatcher/dist`                                                                        |
| Env var          | `PNPM_VERSION=10.6.1`                                                                       |

- **`--ignore-scripts` is required.** Cloudflare runs `pnpm install` against the
  whole workspace; without it pnpm tries to compile the Electron native modules
  (`better-sqlite3`, `argon2`, `node-pty`, `lz4`, `lzma-native`, `@electron/rebuild`)
  on the Linux container and fails/wastes quota. The static site has **no** native
  deps (`sharp` is avoided via the passthrough image service), so skipping install
  scripts is safe. **Do NOT** edit root `onlyBuiltDependencies` to "fix" this — that
  would break the Electron app's local native build.
- The `...` in the filter also builds workspace deps (no-op until `ui/`/`widgets/`
  land).

### Build watch paths (Settings → Build → Build watch paths → Include)

```
sites/hatcher/*
packages/*
ui/*
widgets/*
pnpm-lock.yaml
pnpm-workspace.yaml
package.json
turbo.json
.prettierrc
```

`ui/*` and `widgets/*` are pre-included so a future shared-component change triggers
a deploy.

## Custom domain

1. Confirm `hatcher.rs` is registered and its zone is on **Cloudflare nameservers**.
2. Workers & Pages → project → **Custom domains** → add `hatcher.rs` (CNAME
   flattening handles the apex).
3. `astro.config.mjs` `site` MUST equal the attached domain exactly
   (`https://hatcher.rs`).

**Deploy to the `*.pages.dev` preview first**, verify the output directory resolves
and the routes render, **then** attach the apex.

## Pre-launch hygiene

`*.pages.dev` preview URLs are public and indexable. While the site is a
placeholder, `public/robots.txt` disallows all indexing and `public/_headers`
sets baseline security headers. Consider **Cloudflare Access** on the project until
launch. **At launch:** remove `Disallow: /` from `robots.txt` and enable the
`Sitemap:` line (a `sitemap-index.xml` is generated on every build).

## Local development

```bash
# Dev server (hot reload)
corepack pnpm --filter @hatcherdx/hatcher dev

# Production build + type-check (mirrors CI)
corepack pnpm --filter @hatcherdx/hatcher build
corepack pnpm --filter @hatcherdx/hatcher check

# Preview the production build locally
corepack pnpm --filter @hatcherdx/hatcher preview

# Dry-run the exact Cloudflare build path
pnpm install --ignore-scripts && corepack pnpm exec turbo run build --filter=@hatcherdx/hatcher...
```

> Use `corepack pnpm` (pins **pnpm 10.6.1** per `packageManager`); a bare `pnpm`
> on PATH may be an older version.

## CI

`.github/workflows/ci.yml` includes a dedicated **`site-build`** job (isolated from
the Electron matrix): `fetch-depth: 0`, `pnpm install --ignore-scripts`, then
`turbo run build check --affected --filter=./sites/*`. The repo-wide `build` job
also builds the site (fast, turbo-cached).
