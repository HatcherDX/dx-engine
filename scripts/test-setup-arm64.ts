/**
 * @fileoverview Test setup for ARM64 architecture validation.
 *
 * @description
 * Initializes test environment for ARM64 platforms, validates native
 * module availability, and configures architecture-specific mocks.
 *
 * @remarks
 * This setup file ensures that tests run correctly on ARM64 architectures
 * by detecting the platform, validating binaries, and setting up appropriate
 * mocks for modules that may not have ARM64 support.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @internal
 */

import { vi } from 'vitest'
import { arch, platform, cpus } from 'os'
import { existsSync } from 'fs'
import { join } from 'path'

// Architecture detection
const currentArch = arch()
const targetArch = process.env.TARGET_ARCH || currentArch
const isARM64 = targetArch === 'arm64' || targetArch === 'aarch64'
const isAppleSilicon = platform() === 'darwin' && isARM64
const isLinuxARM = platform() === 'linux' && isARM64
const isWindowsARM = platform() === 'win32' && isARM64

console.log('🧪 ARM64 Test Setup')
console.log('===================')
console.log(`Platform: ${platform()}`)
console.log(`Architecture: ${currentArch} -> ${targetArch}`)
console.log(`CPU: ${cpus()[0]?.model || 'Unknown'}`)
console.log(`Cores: ${cpus().length}`)
console.log(`ARM64 Mode: ${isARM64}`)
console.log('')

/**
 * Validates native module binary availability for ARM64.
 *
 * @param moduleName - Name of the module to validate
 * @returns True if ARM64 binary is available
 *
 * @internal
 * @since 1.0.0
 */
function validateARM64Binary(moduleName: string): boolean {
  try {
    const modulePath = join(process.cwd(), 'node_modules', moduleName)

    if (!existsSync(modulePath)) {
      console.log(`⚠️ ${moduleName}: Module not found`)
      return false
    }

    // Check for prebuilt binaries
    const prebuildsPath = join(modulePath, 'prebuilds')
    const buildPath = join(modulePath, 'build', 'Release')

    // Check for ARM64-specific prebuilds
    const arm64Markers = [
      join(prebuildsPath, `${platform()}-arm64`),
      join(prebuildsPath, `${platform()}-${targetArch}`),
      join(buildPath, `${moduleName}.node`),
    ]

    const hasARM64Binary = arm64Markers.some((path) => existsSync(path))

    if (hasARM64Binary) {
      console.log(`✅ ${moduleName}: ARM64 binary available`)
      return true
    } else {
      console.log(`❌ ${moduleName}: No ARM64 binary found`)
      return false
    }
  } catch (error) {
    console.log(`⚠️ ${moduleName}: Validation failed - ${error}`)
    return false
  }
}

/**
 * Critical native modules to validate.
 *
 * @internal
 * @since 1.0.0
 */
const NATIVE_MODULES_TO_CHECK = [
  'node-pty',
  'better-sqlite3',
  '@serialport/bindings-cpp',
]

// Validate native modules
console.log('🔍 Validating native modules for ARM64...')
const moduleStatus = new Map<string, boolean>()

for (const module of NATIVE_MODULES_TO_CHECK) {
  const isAvailable = validateARM64Binary(module)
  moduleStatus.set(module, isAvailable)
}

console.log('')

// Setup mocks for unavailable modules on ARM64
if (isARM64) {
  console.log('🎭 Setting up ARM64-specific mocks...')

  // Mock node-pty if not available on ARM64
  if (!moduleStatus.get('node-pty')) {
    console.log('   Mocking node-pty for ARM64')
    vi.mock('node-pty', () => ({
      spawn: vi.fn(() => ({
        pid: 12345,
        cols: 80,
        rows: 24,
        process: 'mock-shell',
        handleFlowControl: false,
        on: vi.fn(),
        resize: vi.fn(),
        write: vi.fn(),
        kill: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
      })),
      fork: vi.fn(),
      open: vi.fn(),
    }))
  }

  // Mock serialport if not available on ARM64
  if (!moduleStatus.get('@serialport/bindings-cpp')) {
    console.log('   Mocking @serialport/bindings-cpp for ARM64')
    vi.mock('@serialport/bindings-cpp', () => ({
      list: vi.fn().mockResolvedValue([]),
      open: vi.fn(),
      close: vi.fn(),
      read: vi.fn(),
      write: vi.fn(),
    }))
  }
}

// Platform-specific test utilities
global.ARM64_TEST_UTILS = {
  isARM64,
  isAppleSilicon,
  isLinuxARM,
  isWindowsARM,
  moduleStatus,
  skipIfNotARM64: (testFn: any) => {
    return isARM64 ? testFn : testFn.skip
  },
  skipIfARM64: (testFn: any) => {
    return isARM64 ? testFn.skip : testFn
  },
  skipIfNoNativeModule: (moduleName: string, testFn: any) => {
    return moduleStatus.get(moduleName) ? testFn : testFn.skip
  },
}

// Performance monitoring for ARM64
if (isARM64) {
  const startTime = Date.now()

  afterAll(() => {
    const duration = Date.now() - startTime
    console.log('')
    console.log('⏱️ ARM64 Test Performance')
    console.log(`   Total Duration: ${duration}ms`)
    console.log(`   Platform: ${platform()} ${targetArch}`)

    if (duration > 60000) {
      console.warn('⚠️ Tests took longer than expected on ARM64')
      console.warn('   Consider optimizing test suite for ARM64 performance')
    }
  })
}

// Export for use in tests
export {
  isARM64,
  isAppleSilicon,
  isLinuxARM,
  isWindowsARM,
  moduleStatus,
  validateARM64Binary,
}

// Extend global type definitions
declare global {
  var ARM64_TEST_UTILS: {
    isARM64: boolean
    isAppleSilicon: boolean
    isLinuxARM: boolean
    isWindowsARM: boolean
    moduleStatus: Map<string, boolean>
    skipIfNotARM64: (testFn: any) => any
    skipIfARM64: (testFn: any) => any
    skipIfNoNativeModule: (moduleName: string, testFn: any) => any
  }
}

console.log('✅ ARM64 test setup complete')
