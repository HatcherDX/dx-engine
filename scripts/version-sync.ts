#!/usr/bin/env tsx

/**
 * @fileoverview Unified version synchronization script for monorepo packages.
 *
 * @description
 * Ensures all packages in the monorepo maintain the same version number.
 * This script is used by semantic-release during the prepare phase to update
 * all package.json files with the new release version.
 *
 * @remarks
 * This script supports the unified versioning strategy where ALL packages
 * in the monorepo share the same version number, following best practices
 * used by major projects like Babel, Jest, and Lerna.
 *
 * @example
 * ```bash
 * # Update all packages to version 0.3.5
 * pnpm tsx scripts/version-sync.ts 0.3.5
 *
 * # Use with semantic-release
 * # Configured in .releaserc.json prepareCmd
 * ```
 *
 * @author Hatcher DX Team
 * @since 0.3.5
 * @public
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { glob } from 'glob'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '..')

/**
 * Updates the version in a package.json file.
 *
 * @param filePath - Path to the package.json file
 * @param newVersion - The new version to set
 * @returns True if updated successfully, false otherwise
 *
 * @example
 * ```typescript
 * const success = updatePackageVersion('/path/to/package.json', '0.3.5')
 * console.log(success ? 'Updated' : 'Failed')
 * ```
 *
 * @throws {@link Error}
 * Thrown when the file cannot be read or written
 *
 * @public
 */
export function updatePackageVersion(
  filePath: string,
  newVersion: string
): boolean {
  try {
    if (!existsSync(filePath)) {
      console.warn(`⚠️  File not found: ${filePath}`)
      return false
    }

    const content = readFileSync(filePath, 'utf-8')
    const pkg = JSON.parse(content)
    const oldVersion = pkg.version

    if (oldVersion === newVersion) {
      console.log(
        `✓ ${filePath.replace(rootDir, '.')} already at v${newVersion}`
      )
      return true
    }

    pkg.version = newVersion
    writeFileSync(filePath, JSON.stringify(pkg, null, 2) + '\n')
    console.log(
      `✅ ${filePath.replace(rootDir, '.')} updated: v${oldVersion} → v${newVersion}`
    )
    return true
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error)
    return false
  }
}

/**
 * Main function to synchronize versions across all packages.
 *
 * @remarks
 * Finds all package.json files in the monorepo (excluding node_modules,
 * dist, and build directories) and updates them to the specified version.
 *
 * @example
 * ```typescript
 * // Called directly from command line
 * // pnpm tsx scripts/version-sync.ts 0.3.5
 * ```
 *
 * @public
 */
export async function main() {
  const newVersion = process.argv[2]

  if (!newVersion) {
    console.error('❌ Please provide a version number as argument')
    console.error('Usage: pnpm tsx scripts/version-sync.ts <version>')
    process.exit(1)
  }

  console.log(`\n🔄 Synchronizing all packages to version ${newVersion}...\n`)

  // Find all package.json files
  const patterns = [
    'package.json',
    'apps/*/package.json',
    'universal/*/package.json',
    'tooling/*/package.json',
  ]

  const files: string[] = []
  for (const pattern of patterns) {
    const matches = await glob(pattern, {
      cwd: rootDir,
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/.vitepress/**',
      ],
      absolute: true,
    })
    files.push(...matches)
  }

  // Remove duplicates
  const uniqueFiles = [...new Set(files)]
  console.log(`Found ${uniqueFiles.length} package.json files to update\n`)

  // Update all files
  let successCount = 0
  let failCount = 0

  for (const file of uniqueFiles) {
    if (updatePackageVersion(file, newVersion)) {
      successCount++
    } else {
      failCount++
    }
  }

  console.log(`\n✨ Version sync complete!`)
  console.log(`   ✅ Updated: ${successCount} files`)
  if (failCount > 0) {
    console.log(`   ❌ Failed: ${failCount} files`)
    process.exit(1)
  }
}

// Run the script only if executed directly (not imported)
// Check if we're in test environment
const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST
if (!isTest && import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })
}
