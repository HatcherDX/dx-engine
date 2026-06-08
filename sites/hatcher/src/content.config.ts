/**
 * @fileoverview Astro content-collection config for the Starlight docs collection.
 *
 * @description
 * Registers the `docs` collection backed by Starlight's own loader and schema so
 * `src/content/docs/**` is served as Starlight documentation. Marketing pages live
 * outside this collection as plain Astro pages under `src/pages/`.
 *
 * @since 0.0.0
 * @internal
 */
import { defineCollection } from 'astro:content'
import { docsLoader } from '@astrojs/starlight/loaders'
import { docsSchema } from '@astrojs/starlight/schema'

export const collections = {
  docs: defineCollection({
    // Starlight's loader (NOT a generic glob() — that is for non-Starlight content).
    loader: docsLoader(),
    schema: docsSchema(),
  }),
}
