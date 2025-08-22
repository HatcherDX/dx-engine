#!/usr/bin/env tsx

import fs from 'fs'
import path from 'path'

// Types for TypeScript
interface FileMapping {
  source: string
  destination: string
}

const projectRoot: string = process.cwd()

const filesToCopy: FileMapping[] = [
  {
    source: '.env.example',
    destination: '.env',
  },
  {
    source: 'apps/electron/.env.development.example',
    destination: 'apps/electron/.env.development',
  },
  {
    source: 'apps/electron/.env.production.example',
    destination: 'apps/electron/.env.production',
  },
]

/**
 * Copy environment files from examples if they don't exist
 */
export function setupEnvironmentFiles(): void {
  console.log('🔧 Setting up environment files...')

  let filesCreated: number = 0

  filesToCopy.forEach(({ source, destination }: FileMapping) => {
    const sourcePath: string = path.join(projectRoot, source)
    const destPath: string = path.join(projectRoot, destination)

    if (fs.existsSync(sourcePath) && !fs.existsSync(destPath)) {
      try {
        fs.copyFileSync(sourcePath, destPath)
        console.log(`✅ Created ${destination} from ${source}`)
        filesCreated++
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error'
        console.error(`❌ Failed to create ${destination}:`, errorMessage)
      }
    } else if (!fs.existsSync(sourcePath)) {
      console.warn(`⚠️  Source file not found: ${source}`)
    } else {
      console.log(`⏭️  ${destination} already exists, skipping`)
    }
  })

  console.log(`🎉 Environment setup complete! Created ${filesCreated} files.`)
}

// Run the setup only when this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupEnvironmentFiles()
}

// Export for testing
export { filesToCopy, projectRoot }
