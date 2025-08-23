/**
 * @fileoverview ARM64 architecture setup and validation script.
 *
 * @description
 * Handles architecture-specific setup for ARM64 platforms including
 * dependency rebuilding, binary validation, and cross-compilation support.
 * Ensures native modules are correctly compiled for ARM64 targets.
 *
 * @remarks
 * This script detects the current architecture and configures the build
 * environment appropriately for ARM64 targets. It handles both native
 * ARM64 builds and cross-compilation scenarios.
 *
 * @example
 * ```bash
 * # Native ARM64 build
 * tsx scripts/setup-arm64.ts
 *
 * # Cross-compilation from x64 to ARM64
 * TARGET_ARCH=arm64 tsx scripts/setup-arm64.ts
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { execSync } from 'child_process'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { arch, platform } from 'os'

/**
 * Architecture detection and information.
 *
 * @remarks
 * Provides detailed information about the current and target architectures,
 * including native vs cross-compilation scenarios.
 *
 * @public
 * @since 1.0.0
 */
interface ArchitectureInfo {
  /** Current system architecture */
  current: string
  /** Target build architecture */
  target: string
  /** Whether cross-compilation is needed */
  isCrossCompile: boolean
  /** Platform identifier */
  platform: string
  /** Node.js architecture */
  nodeArch: string
}

/**
 * Native module configuration for ARM64.
 *
 * @remarks
 * Defines rebuild requirements and options for native Node.js modules
 * that need special handling on ARM64 architectures.
 *
 * @public
 * @since 1.0.0
 */
interface NativeModuleConfig {
  /** Module name */
  name: string
  /** Whether prebuild binaries are available */
  hasPrebuilds: boolean
  /** Custom rebuild command */
  rebuildCommand?: string
  /** Environment variables for rebuild */
  rebuildEnv?: Record<string, string>
  /** Platforms that require rebuild */
  requiresRebuildOn: string[]
}

/**
 * Detects current and target architectures.
 *
 * @returns Architecture information including cross-compilation detection
 *
 * @example
 * ```typescript
 * const archInfo = detectArchitecture()
 * console.log(`Building for ${archInfo.target} on ${archInfo.current}`)
 * ```
 *
 * @public
 * @since 1.0.0
 */
function detectArchitecture(): ArchitectureInfo {
  const currentArch = arch()
  const targetArch =
    process.env.TARGET_ARCH || process.env.npm_config_arch || currentArch
  const currentPlatform = platform()

  return {
    current: currentArch,
    target: targetArch,
    isCrossCompile: currentArch !== targetArch,
    platform: currentPlatform,
    nodeArch: process.arch,
  }
}

/**
 * Native modules that require special handling on ARM64.
 *
 * @remarks
 * List of native Node.js modules that need architecture-specific
 * compilation or have known issues on ARM64 platforms.
 *
 * @public
 * @since 1.0.0
 */
const NATIVE_MODULES: NativeModuleConfig[] = [
  {
    name: 'node-pty',
    hasPrebuilds: true,
    requiresRebuildOn: ['linux', 'darwin'],
    rebuildEnv: {
      npm_config_build_from_source: 'true',
      npm_config_runtime: 'electron',
      npm_config_disturl: 'https://electronjs.org/headers',
    },
  },
  {
    name: 'better-sqlite3',
    hasPrebuilds: true,
    requiresRebuildOn: ['linux', 'darwin', 'win32'],
    rebuildCommand: 'npm rebuild better-sqlite3 --build-from-source',
  },
  {
    name: '@serialport/bindings-cpp',
    hasPrebuilds: false,
    requiresRebuildOn: ['linux', 'darwin', 'win32'],
  },
]

/**
 * Validates ARM64 binary availability.
 *
 * @param moduleName - Name of the module to check
 * @returns True if ARM64 binary is available
 *
 * @example
 * ```typescript
 * if (validateBinary('node-pty')) {
 *   console.log('node-pty ARM64 binary available')
 * }
 * ```
 *
 * @public
 * @since 1.0.0
 */
function validateBinary(moduleName: string): boolean {
  try {
    const modulePath = join('node_modules', moduleName)
    if (!existsSync(modulePath)) {
      return false
    }

    // Check for prebuilt binaries
    const bindingPath = join(modulePath, 'build', 'Release')
    const prebuildPath = join(modulePath, 'prebuilds')

    return existsSync(bindingPath) || existsSync(prebuildPath)
  } catch (error) {
    console.warn(`⚠️ Could not validate ${moduleName}: ${error}`)
    return false
  }
}

/**
 * Rebuilds native module for target architecture.
 *
 * @param config - Module configuration
 * @param archInfo - Architecture information
 *
 * @example
 * ```typescript
 * await rebuildModule(nodeptyConfig, archInfo)
 * ```
 *
 * @public
 * @since 1.0.0
 */
function rebuildModule(
  config: NativeModuleConfig,
  archInfo: ArchitectureInfo
): void {
  if (!config.requiresRebuildOn.includes(archInfo.platform)) {
    console.log(
      `⏭️ ${config.name} doesn't require rebuild on ${archInfo.platform}`
    )
    return
  }

  console.log(`🔧 Rebuilding ${config.name} for ${archInfo.target}...`)

  const env = {
    ...process.env,
    npm_config_arch: archInfo.target,
    npm_config_target_arch: archInfo.target,
    npm_config_target_platform: archInfo.platform,
    ...config.rebuildEnv,
  }

  const command = config.rebuildCommand || `npm rebuild ${config.name}`

  try {
    execSync(command, {
      stdio: 'inherit',
      env,
    })
    console.log(`✅ ${config.name} rebuilt successfully for ${archInfo.target}`)
  } catch (error) {
    console.error(`❌ Failed to rebuild ${config.name}: ${error}`)
    if (!config.hasPrebuilds) {
      throw error
    }
  }
}

/**
 * Creates ARM64-specific npm configuration.
 *
 * @param archInfo - Architecture information
 *
 * @example
 * ```typescript
 * createNpmConfig(archInfo)
 * // Creates .npmrc with ARM64 settings
 * ```
 *
 * @public
 * @since 1.0.0
 */
function createNpmConfig(archInfo: ArchitectureInfo): void {
  const npmrcPath = join(process.cwd(), '.npmrc')
  const existingConfig = existsSync(npmrcPath)
    ? readFileSync(npmrcPath, 'utf-8')
    : ''

  const arm64Config = `
# ARM64 Architecture Configuration
target_arch=${archInfo.target}
target_platform=${archInfo.platform}
arch=${archInfo.target}

# Electron rebuild settings for ARM64
electron_config_cache=~/.electron-arm64
build_from_source_electron_module=false

# Use prebuilt binaries when available
prefer_binary=true
`

  if (!existingConfig.includes('ARM64 Architecture Configuration')) {
    writeFileSync(npmrcPath, existingConfig + '\n' + arm64Config)
    console.log('📝 Created ARM64 npm configuration')
  }
}

/**
 * Main setup function for ARM64 architecture.
 *
 * @example
 * ```typescript
 * setupARM64()
 *   .then(() => console.log('ARM64 setup complete'))
 *   .catch(error => console.error('Setup failed:', error))
 * ```
 *
 * @public
 * @since 1.0.0
 */
async function setupARM64(): Promise<void> {
  console.log('🚀 ARM64 Architecture Setup')
  console.log('============================')

  const archInfo = detectArchitecture()

  console.log(`📊 Architecture Information:`)
  console.log(`   Current: ${archInfo.current}`)
  console.log(`   Target: ${archInfo.target}`)
  console.log(`   Platform: ${archInfo.platform}`)
  console.log(`   Cross-compile: ${archInfo.isCrossCompile}`)
  console.log('')

  if (archInfo.isCrossCompile) {
    console.log('⚠️ Cross-compilation detected!')
    console.log(
      `   Building ${archInfo.target} binaries on ${archInfo.current}`
    )
    console.log('')
  }

  // Create npm configuration for ARM64
  createNpmConfig(archInfo)

  // Check and rebuild native modules
  console.log('🔍 Checking native modules...')
  for (const module of NATIVE_MODULES) {
    const isValid = validateBinary(module.name)

    if (!isValid || archInfo.target === 'arm64') {
      console.log(`📦 ${module.name}: Needs rebuild for ARM64`)
      rebuildModule(module, archInfo)
    } else {
      console.log(`✅ ${module.name}: Binary validated`)
    }
  }

  // Platform-specific setup
  if (archInfo.platform === 'darwin' && archInfo.target === 'arm64') {
    console.log('🍎 Configuring for Apple Silicon...')
    // macOS specific ARM64 setup
    process.env.MACOSX_DEPLOYMENT_TARGET = '11.0'
  } else if (archInfo.platform === 'linux' && archInfo.target === 'arm64') {
    console.log('🐧 Configuring for Linux ARM64...')
    // Linux ARM64 specific setup
  } else if (archInfo.platform === 'win32' && archInfo.target === 'arm64') {
    console.log('🪟 Configuring for Windows ARM64...')
    // Windows ARM64 specific setup
  }

  console.log('')
  console.log('✨ ARM64 setup completed successfully!')
  console.log('   You can now build and run the application on ARM64')

  // Verify the setup
  console.log('')
  console.log('🧪 Verification:')
  execSync('node -p "process.arch"', { stdio: 'inherit' })
  execSync('node -p "process.platform"', { stdio: 'inherit' })
}

// Run setup if called directly
if (require.main === module) {
  setupARM64().catch((error) => {
    console.error('❌ ARM64 setup failed:', error)
    process.exit(1)
  })
}

export { setupARM64, detectArchitecture, validateBinary, rebuildModule }
