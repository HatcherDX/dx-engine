// sites/hatcher/astro.config.mjs
// SPDX-License-Identifier: LicenseRef-Hatcher-Proprietary
import { defineConfig, passthroughImageService } from 'astro/config'
import starlight from '@astrojs/starlight'
// import sitemap from '@astrojs/sitemap' // enable per build-spec §15.9

export default defineConfig({
  // Canonical origin — MUST equal the attached Cloudflare custom domain (apex, no trailing slash).
  site: 'https://hatcher.rs',

  // Fully static (Astro default output:'static'); no adapter, no `base` (root domain).
  // 'directory' format + trailingSlash:'always' keep one canonical URL form site-wide,
  // consistent with Starlight's directory-style doc URLs.
  build: { format: 'directory' },
  trailingSlash: 'always',

  // Phase 1 has no images to optimize; avoid the native `sharp` build under
  // Cloudflare's `--ignore-scripts` install (build-spec §0.3).
  image: { service: passthroughImageService() },

  integrations: [
    starlight({
      title: 'Hatcher Docs',
      // Cede the site-wide /404 to the marketing `src/pages/404.astro` (build-spec §7).
      // Without this, Starlight injects its own /404 and the routes collide.
      disable404Route: true,
      // Hatcher brand theme (golden accent, dark-first, Cinzel) + the Cinzel webfont.
      customCss: ['./src/styles/starlight.css'],
      head: [
        {
          tag: 'link',
          attrs: { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        },
        {
          tag: 'link',
          attrs: {
            rel: 'preconnect',
            href: 'https://fonts.gstatic.com',
            crossorigin: true,
          },
        },
        {
          tag: 'link',
          attrs: {
            rel: 'stylesheet',
            href: 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&display=swap',
          },
        },
      ],
      // Starlight owns ONLY the docs collection; marketing pages live outside it.
      // Pagefind search is built in (no astro-pagefind). No i18n / versioning in Phase 1.
      sidebar: [
        // Architecture is top-level (it encompasses the IDE) — a sibling of /ide, NOT nested under it.
        {
          label: 'Architecture',
          items: [{ label: 'Repo Architecture', link: '/architecture/' }],
        },
        {
          label: 'IDE',
          items: [
            { label: 'Overview', link: '/ide/docs/' },
            { label: 'Getting Started', link: '/ide/docs/getting-started/' },
          ],
        },
      ],
    }),
    // sitemap(),
  ],
})
