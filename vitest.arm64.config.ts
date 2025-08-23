/**
 * @fileoverview Vitest configuration for ARM64 architecture testing.
 *
 * @description
 * Specialized test configuration for ARM64 platforms including Apple Silicon,
 * Linux ARM64, and Windows on ARM. Handles architecture-specific testing
 * requirements and native module validation.
 *
 * @remarks
 * This configuration detects the current architecture and adjusts test
 * behavior accordingly. It includes specific handling for native modules
 * that may behave differently on ARM64 architectures.
 *
 * @example
 * ```bash
 * # Run ARM64-specific tests
 * vitest --config vitest.arm64.config.ts
 *
 * # Run with architecture override
 * TARGET_ARCH=arm64 vitest --config vitest.arm64.config.ts
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { defineConfig } from 'vitest/config'
import { arch, platform } from 'os'
import path from 'path'

// Detect current architecture
const currentArch = arch()
const targetArch = process.env.TARGET_ARCH || currentArch
const isARM64 = targetArch === 'arm64' || targetArch === 'aarch64'
const isAppleSilicon = platform() === 'darwin' && isARM64
const isLinuxARM = platform() === 'linux' && isARM64
const isWindowsARM = platform() === 'win32' && isARM64

console.log('🏗️ ARM64 Test Configuration')
console.log(`   Platform: ${platform()}`)
console.log(`   Current Arch: ${currentArch}`)
console.log(`   Target Arch: ${targetArch}`)
console.log(`   Is ARM64: ${isARM64}`)
console.log(`   Apple Silicon: ${isAppleSilicon}`)
console.log(`   Linux ARM: ${isLinuxARM}`)
console.log(`   Windows ARM: ${isWindowsARM}`)

export default defineConfig({
  test: {
    name: 'arm64',

    // Test environment
    environment: 'node',

    // Global setup for ARM64
    globalSetup: ['./scripts/test-setup-arm64.ts'],

    // Architecture-specific test patterns
    include: [
      // Include all standard tests
      'apps/**/*.{test,spec}.{js,ts}',
      'universal/**/*.{test,spec}.{js,ts}',
      'tooling/**/*.{test,spec}.{js,ts}',
      'scripts/**/*.{test,spec}.{js,ts}',

      // ARM64-specific tests
      '**/*.arm64.{test,spec}.{js,ts}',
      ...(isAppleSilicon ? ['**/*.apple-silicon.{test,spec}.{js,ts}'] : []),
      ...(isLinuxARM ? ['**/*.linux-arm.{test,spec}.{js,ts}'] : []),
      ...(isWindowsARM ? ['**/*.win-arm.{test,spec}.{js,ts}'] : []),
    ],

    // Exclude non-ARM64 tests
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/docs/**',
      'apps/docs/**',
      // Skip x64-specific tests on ARM64
      ...(isARM64 ? ['**/*.x64.{test,spec}.{js,ts}'] : []),
    ],

    // Environment variables for ARM64 testing
    env: {
      VITEST_ARM64: 'true',
      TARGET_ARCH: targetArch,
      IS_ARM64: String(isARM64),
      IS_APPLE_SILICON: String(isAppleSilicon),
      IS_LINUX_ARM: String(isLinuxARM),
      IS_WINDOWS_ARM: String(isWindowsARM),
      // Native module testing flags
      TEST_NATIVE_MODULES: 'true',
      TEST_NODE_PTY: isARM64 ? 'mock' : 'real',
      TEST_BETTER_SQLITE: isARM64 ? 'real' : 'real',
    },

    // Longer timeouts for ARM64 (especially emulated)
    testTimeout: isARM64 ? 30000 : 10000,
    hookTimeout: isARM64 ? 30000 : 10000,

    // Coverage configuration for ARM64
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: `./coverage/arm64-${platform()}-${targetArch}`,
      exclude: [
        'node_modules',
        'test',
        '*.config.*',
        '**/*.d.ts',
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/types/**',
        // Exclude x64-specific code on ARM64
        ...(isARM64 ? ['**/*.x64.ts', '**/*.x86.ts'] : []),
      ],
    },

    // Reporter configuration
    reporters: process.env.CI
      ? ['default', 'junit', 'json']
      : ['default', 'hanging-process'],

    outputFile: {
      junit: `./test-results/arm64-${platform()}-${targetArch}-junit.xml`,
      json: `./test-results/arm64-${platform()}-${targetArch}-results.json`,
    },

    // Thread configuration for ARM64
    pool: 'threads',
    poolOptions: {
      threads: {
        // Fewer threads on ARM64 to avoid resource contention
        minThreads: isARM64 ? 1 : 2,
        maxThreads: isARM64 ? 2 : 4,
      },
    },

    // Architecture-specific setup files
    setupFiles: [
      './vitest.setup.ts',
      ...(isARM64 ? ['./scripts/test-setup-arm64.ts'] : []),
      ...(isAppleSilicon ? ['./scripts/test-setup-apple-silicon.ts'] : []),
    ],

    // Mock configuration for native modules on ARM64
    ...(isARM64 && {
      deps: {
        inline: [
          // Inline mocks for modules that might not have ARM64 binaries
          'node-pty',
          '@serialport/bindings-cpp',
          'usb-detection',
        ],
      },
    }),
  },

  // Build configuration for ARM64
  build: {
    target: isARM64 ? 'node18' : 'node20',
    rollupOptions: {
      external: [
        // External native modules
        'node-pty',
        'better-sqlite3',
        'electron',
        '@serialport/bindings-cpp',
        'usb-detection',
      ],
    },
  },

  // Resolve configuration
  resolve: {
    alias: {
      // Architecture-specific module resolution
      ...(isARM64 && {
        'node-pty': path.resolve(__dirname, 'mocks/node-pty-arm64.ts'),
      }),
    },
    conditions: [
      // Prefer ARM64 builds when available
      ...(isARM64 ? ['arm64', 'aarch64'] : []),
      'node',
      'default',
    ],
  },

  // Define architecture flags
  define: {
    'process.env.IS_ARM64': JSON.stringify(isARM64),
    'process.env.IS_APPLE_SILICON': JSON.stringify(isAppleSilicon),
    'process.env.IS_LINUX_ARM': JSON.stringify(isLinuxARM),
    'process.env.IS_WINDOWS_ARM': JSON.stringify(isWindowsARM),
    'process.env.TARGET_ARCH': JSON.stringify(targetArch),
  },
})
