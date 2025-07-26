#!/usr/bin/env tsx

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Types for TypeScript
interface IconConfig {
  sourceImage: string
  outputDir: string
  platforms: Platform[]
}

interface IconSize {
  size: number
  name: string
}

interface GenerationResult {
  success: boolean
  created: number
  total: number
  errors: string[]
}

type Platform = 'macos' | 'windows'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Parse command line arguments and create configuration
 * @returns Icon generation configuration
 */
function parseConfig(): IconConfig {
  const args = process.argv.slice(2)

  return {
    sourceImage: args[0] || 'brand/egg.png',
    outputDir: args[1] || 'apps/electron/build',
    platforms: (args[2]?.split(',') as Platform[]) || ['macos', 'windows'],
  }
}

/**
 * Check if required system dependencies are available
 * @param platforms - Platforms to check dependencies for
 * @returns Whether all dependencies are available
 */
function checkDependencies(platforms: Platform[]): boolean {
  try {
    if (platforms.includes('macos')) {
      execSync('which sips', { stdio: 'ignore' })
      execSync('which iconutil', { stdio: 'ignore' })
    }
    return true
  } catch (error: unknown) {
    console.log('⚠️  Some tools are not available, but continuing...')
    return false
  }
}

/**
 * Generate macOS icons from source image
 * @param sourcePath - Path to source image
 * @param outputPath - Output directory path
 * @returns Generation result
 */
function generateMacOSIcons(
  sourcePath: string,
  outputPath: string
): GenerationResult {
  const iconsetDir: string = path.join(outputPath, 'icon.iconset')
  const errors: string[] = []

  if (!fs.existsSync(iconsetDir)) {
    fs.mkdirSync(iconsetDir, { recursive: true })
  }

  console.log('📱 Generating macOS icons...')

  const iconSizes: IconSize[] = [
    { size: 16, name: 'icon_16x16.png' },
    { size: 32, name: 'icon_16x16@2x.png' },
    { size: 32, name: 'icon_32x32.png' },
    { size: 64, name: 'icon_32x32@2x.png' },
    { size: 128, name: 'icon_128x128.png' },
    { size: 256, name: 'icon_128x128@2x.png' },
    { size: 256, name: 'icon_256x256.png' },
    { size: 512, name: 'icon_256x256@2x.png' },
    { size: 512, name: 'icon_512x512.png' },
    { size: 1024, name: 'icon_512x512@2x.png' },
  ]

  let successCount: number = 0

  iconSizes.forEach(({ size, name }: IconSize) => {
    const iconPath: string = path.join(iconsetDir, name)
    try {
      execSync(`sips -z ${size} ${size} "${sourcePath}" --out "${iconPath}"`, {
        stdio: 'pipe',
      })
      successCount++
    } catch (error: unknown) {
      const errorMessage = `Error creating ${name}`
      console.log(`⚠️  ${errorMessage}`)
      errors.push(errorMessage)
    }
  })

  console.log(`✅ Created ${successCount}/${iconSizes.length} PNG icons`)

  // Create .icns file
  try {
    console.log('🍎 Creating .icns file...')
    execSync(
      `iconutil -c icns "${iconsetDir}" -o "${path.join(outputPath, 'icon.icns')}"`,
      { stdio: 'pipe' }
    )
    console.log('✅ .icns icon created successfully!')
  } catch (error: unknown) {
    const errorMessage = 'Error creating .icns file'
    console.log(`⚠️  ${errorMessage}`)
    errors.push(errorMessage)
  }

  return {
    success: successCount > 0,
    created: successCount,
    total: iconSizes.length,
    errors,
  }
}

/**
 * Generate Windows icons from source image
 * @param sourcePath - Path to source image
 * @param outputPath - Output directory path
 * @param hasTools - Whether system tools are available
 * @returns Generation result
 */
function generateWindowsIcons(
  sourcePath: string,
  outputPath: string,
  hasTools: boolean
): GenerationResult {
  const errors: string[] = []

  try {
    console.log('🪟 Creating .ico file...')
    const icoPath: string = path.join(outputPath, 'icon.ico')

    if (hasTools) {
      // Create a 256x256 PNG first
      const tempPng: string = path.join(outputPath, 'temp-256.png')
      execSync(`sips -z 256 256 "${sourcePath}" --out "${tempPng}"`, {
        stdio: 'pipe',
      })
      fs.renameSync(tempPng, icoPath)
    } else {
      // Copy original image as fallback
      fs.copyFileSync(sourcePath, icoPath)
    }

    console.log('✅ .ico icon created!')

    return {
      success: true,
      created: 1,
      total: 1,
      errors,
    }
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error creating .ico'
    console.log(`⚠️  Error creating .ico: ${errorMessage}`)
    errors.push(errorMessage)

    return {
      success: false,
      created: 0,
      total: 1,
      errors,
    }
  }
}

/**
 * Main icon generation function
 */
function main(): void {
  const config: IconConfig = parseConfig()

  console.log('🎨 Generating icons for Electron application...')
  console.log(`📸 Source image: ${config.sourceImage}`)
  console.log(`📁 Output directory: ${config.outputDir}`)
  console.log(`🖥️  Platforms: ${config.platforms.join(', ')}`)
  console.log()

  const rootDir: string = path.join(__dirname, '..')
  const sourcePath: string = path.join(rootDir, config.sourceImage)
  const outputPath: string = path.join(rootDir, config.outputDir)

  // Verify source image exists
  if (!fs.existsSync(sourcePath)) {
    console.error(`❌ Source image not found: ${config.sourceImage}`)
    console.log('💡 Usage: npm run icons [image] [directory] [platforms]')
    console.log(
      '💡 Example: npm run icons brand/egg-white.png apps/electron/build macos,windows'
    )
    process.exit(1)
  }

  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true })
  }

  const hasTools: boolean = checkDependencies(config.platforms)
  const results: GenerationResult[] = []

  try {
    // Generate macOS icons
    if (config.platforms.includes('macos') && hasTools) {
      const macOSResult = generateMacOSIcons(sourcePath, outputPath)
      results.push(macOSResult)
    }

    // Generate Windows icons
    if (config.platforms.includes('windows')) {
      const windowsResult = generateWindowsIcons(
        sourcePath,
        outputPath,
        hasTools
      )
      results.push(windowsResult)
    }

    // Summary
    const totalCreated: number = results.reduce(
      (sum, result) => sum + result.created,
      0
    )
    const totalExpected: number = results.reduce(
      (sum, result) => sum + result.total,
      0
    )
    const allErrors: string[] = results.flatMap((result) => result.errors)

    console.log()
    console.log('🎉 Icon generation complete!')
    console.log(`📊 Created ${totalCreated}/${totalExpected} icons`)
    console.log(`📁 Files created in: ${outputPath}`)

    if (allErrors.length > 0) {
      console.log(`⚠️  ${allErrors.length} errors occurred during generation`)
    }

    console.log('🔄 To apply changes, run: npm run build:dev')
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Fatal error:', errorMessage)
    process.exit(1)
  }
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
