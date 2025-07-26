#!/usr/bin/env tsx

import { readFileSync, writeFileSync } from 'fs'
import { execSync } from 'child_process'
import { glob } from 'glob'

// Types for TypeScript
type BumpType = 'major' | 'minor' | 'patch'

interface PackageJson {
  version: string
  [key: string]: any
}

interface VersionComponents {
  major: number
  minor: number
  patch: number
}

/**
 * Parse semantic version string into components
 * @param version - Semantic version string (e.g., "1.2.3")
 * @returns Version components object
 */
function parseVersion(version: string): VersionComponents {
  const [major, minor, patch] = version.split('.').map(Number)
  return { major, minor, patch }
}

/**
 * Generate new version based on bump type
 * @param currentVersion - Current version string
 * @param bumpType - Type of version bump
 * @returns New version string
 */
function generateNewVersion(
  currentVersion: string,
  bumpType: BumpType
): string {
  const { major, minor, patch } = parseVersion(currentVersion)

  switch (bumpType) {
    case 'major':
      return `${major + 1}.0.0`
    case 'minor':
      return `${major}.${minor + 1}.0`
    case 'patch':
      return `${major}.${minor}.${patch + 1}`
    default:
      throw new Error(`Invalid bump type: ${bumpType}`)
  }
}

/**
 * Update version in a package.json file
 * @param pkgPath - Path to package.json file
 * @param newVersion - New version to set
 * @returns Success status
 */
function updatePackageVersion(pkgPath: string, newVersion: string): boolean {
  try {
    const pkgContent: string = readFileSync(pkgPath, 'utf8')
    const pkg: PackageJson = JSON.parse(pkgContent)

    pkg.version = newVersion

    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
    console.log(`✅ Updated ${pkgPath}`)
    return true
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    console.warn(`⚠️  Warning: Could not update ${pkgPath}:`, errorMessage)
    return false
  }
}

/**
 * Main version bump function
 */
function main(): void {
  const args: string[] = process.argv.slice(2)

  if (args.length === 0) {
    console.error('❌ Usage: npm run version:bump <major|minor|patch|version>')
    console.error('\nExamples:')
    console.error('  npm run version:bump patch    # 0.3.0 -> 0.3.1')
    console.error('  npm run version:bump minor    # 0.3.0 -> 0.4.0')
    console.error('  npm run version:bump major    # 0.3.0 -> 1.0.0')
    console.error('  npm run version:bump 1.0.0    # Set specific version')
    process.exit(1)
  }

  const bumpTypeOrVersion: string = args[0]!

  // Find all package.json files in the monorepo
  const packagePaths: string[] = glob
    .sync('./*/package.json', { ignore: ['**/node_modules/**'] })
    .concat(glob.sync('./apps/*/package.json'))
    .concat(glob.sync('./universal/*/package.json'))
    .concat(['./package.json'])

  // Read current version from root package.json
  const rootPkgContent: string = readFileSync('./package.json', 'utf8')
  const rootPkg: PackageJson = JSON.parse(rootPkgContent)
  const currentVersion: string = rootPkg.version

  let newVersion: string

  if (['major', 'minor', 'patch'].includes(bumpTypeOrVersion)) {
    // Generate new version based on bump type
    newVersion = generateNewVersion(
      currentVersion,
      bumpTypeOrVersion as BumpType
    )
  } else {
    // Assume specific version provided
    newVersion = bumpTypeOrVersion
  }

  console.log(`🚀 Bumping version from ${currentVersion} to ${newVersion}`)
  console.log(`📦 Found ${packagePaths.length} package.json files to update`)
  console.log()

  // Update all package.json files
  let successCount: number = 0
  let errorCount: number = 0

  for (const pkgPath of packagePaths) {
    const success = updatePackageVersion(pkgPath, newVersion)
    if (success) {
      successCount++
    } else {
      errorCount++
    }
  }

  console.log()
  console.log(`✅ Version bump complete! New version: ${newVersion}`)
  console.log(
    `📊 Successfully updated: ${successCount}/${packagePaths.length} packages`
  )

  if (errorCount > 0) {
    console.log(`⚠️  Errors: ${errorCount} packages failed to update`)
  }

  console.log('\n📋 Next steps:')
  console.log('1. 📝 Update CHANGELOG.md')
  console.log(
    `2. 💾 Commit changes: git add . && git commit -m "bump: version ${newVersion}"`
  )
  console.log(`3. 🏷️  Create tag: git tag v${newVersion}`)
  console.log('4. 🚀 Push: git push && git push --tags')
}

// Handle process errors
process.on('uncaughtException', (error: Error) => {
  console.error('💥 Uncaught exception:', error.message)
  process.exit(1)
})

process.on('unhandledRejection', (reason: unknown) => {
  console.error('💥 Unhandled rejection:', reason)
  process.exit(1)
})

// Run the main function
main()
