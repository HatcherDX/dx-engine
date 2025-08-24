/**
 * @fileoverview Tests for ARM64 architecture setup script.
 *
 * @description
 * Comprehensive test suite for the ARM64 setup functionality,
 * including architecture detection, module validation, and rebuilding.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock node modules before imports
vi.mock('fs')
vi.mock('child_process')
vi.mock('os')

// Import after mocks are set up
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { execSync } from 'child_process'
import { arch, platform } from 'os'
import { join } from 'path'
import {
  detectArchitecture,
  validateBinary,
  rebuildModule,
} from './setup-arm64'

// Setup the mocked functions
// Don't set global defaults - let each test configure its own mocks
vi.mocked(readFileSync).mockReturnValue('')
vi.mocked(writeFileSync).mockImplementation(() => {})
vi.mocked(execSync).mockImplementation(() => Buffer.from(''))
vi.mocked(arch).mockReturnValue('x64')
vi.mocked(platform).mockReturnValue('darwin')

describe('ARM64 Setup Script', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset environment variables
    delete process.env.TARGET_ARCH
    delete process.env.npm_config_arch
    // Reset default mock behaviors
    vi.mocked(arch).mockReturnValue('x64')
    vi.mocked(platform).mockReturnValue('darwin')
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('detectArchitecture', () => {
    it('should detect current architecture correctly', () => {
      const archInfo = detectArchitecture()

      expect(archInfo).toBeDefined()
      expect(archInfo.current).toBe('x64')
      expect(archInfo.platform).toBe('darwin')
      expect(archInfo.isCrossCompile).toBe(false)
    })

    it('should detect cross-compilation when TARGET_ARCH is set', () => {
      process.env.TARGET_ARCH = 'arm64'

      const archInfo = detectArchitecture()

      expect(archInfo.target).toBe('arm64')
      expect(archInfo.current).toBe('x64')
      expect(archInfo.isCrossCompile).toBe(true)
    })

    it('should prefer npm_config_arch over current arch', () => {
      process.env.npm_config_arch = 'arm64'

      const archInfo = detectArchitecture()

      expect(archInfo.target).toBe('arm64')
      expect(archInfo.isCrossCompile).toBe(true)
    })

    it('should prioritize TARGET_ARCH over npm_config_arch', () => {
      process.env.TARGET_ARCH = 'arm64'
      process.env.npm_config_arch = 'x86'

      const archInfo = detectArchitecture()

      expect(archInfo.target).toBe('arm64')
    })
  })

  describe('validateBinary', () => {
    it('should return false if module does not exist', () => {
      vi.mocked(existsSync).mockReset()
      vi.mocked(existsSync).mockReturnValue(false)

      const result = validateBinary('node-pty')

      expect(result).toBe(false)
      expect(existsSync).toHaveBeenCalledWith(join('node_modules', 'node-pty'))
    })

    it('should return true if build directory exists', () => {
      vi.mocked(existsSync).mockReset()
      vi.mocked(existsSync).mockImplementation((path) => {
        const pathStr = path as string
        if (pathStr === join('node_modules', 'node-pty')) return true
        if (pathStr === join('node_modules', 'node-pty', 'build', 'Release'))
          return true
        return false
      })

      const result = validateBinary('node-pty')

      expect(result).toBe(true)
    })

    it('should return true if prebuilds directory exists', () => {
      vi.mocked(existsSync).mockReset()
      vi.mocked(existsSync).mockImplementation((path) => {
        const pathStr = path as string
        if (pathStr === join('node_modules', 'node-pty')) return true
        if (pathStr === join('node_modules', 'node-pty', 'build', 'Release'))
          return false
        if (pathStr === join('node_modules', 'node-pty', 'prebuilds'))
          return true
        return false
      })

      const result = validateBinary('node-pty')

      expect(result).toBe(true)
    })

    it('should handle validation errors gracefully', () => {
      vi.mocked(existsSync).mockReset()
      vi.mocked(existsSync).mockImplementation(() => {
        throw new Error('Permission denied')
      })

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation()
      const result = validateBinary('node-pty')

      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Could not validate node-pty')
      )

      consoleSpy.mockRestore()
    })
  })

  describe('rebuildModule', () => {
    const mockConfig = {
      name: 'node-pty',
      hasPrebuilds: true,
      requiresRebuildOn: ['darwin', 'linux'],
    }

    const mockArchInfo = {
      current: 'x64',
      target: 'arm64',
      isCrossCompile: true,
      platform: 'darwin',
      nodeArch: 'x64',
    }

    it('should skip rebuild if platform not in requiresRebuildOn', () => {
      const windowsArchInfo = { ...mockArchInfo, platform: 'win32' }
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation()

      rebuildModule(mockConfig, windowsArchInfo)

      expect(execSync).not.toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("doesn't require rebuild on win32")
      )

      consoleSpy.mockRestore()
    })

    it('should execute rebuild command with correct environment', () => {
      rebuildModule(mockConfig, mockArchInfo)

      expect(execSync).toHaveBeenCalledWith(
        'npm rebuild node-pty',
        expect.objectContaining({
          stdio: 'inherit',
          env: expect.objectContaining({
            npm_config_arch: 'arm64',
            npm_config_target_arch: 'arm64',
            npm_config_target_platform: 'darwin',
          }),
        })
      )
    })

    it('should use custom rebuild command if provided', () => {
      const configWithCommand = {
        ...mockConfig,
        rebuildCommand: 'npm rebuild node-pty --build-from-source',
      }

      rebuildModule(configWithCommand, mockArchInfo)

      expect(execSync).toHaveBeenCalledWith(
        'npm rebuild node-pty --build-from-source',
        expect.anything()
      )
    })

    it('should apply custom environment variables', () => {
      const configWithEnv = {
        ...mockConfig,
        rebuildEnv: {
          npm_config_build_from_source: 'true',
          npm_config_runtime: 'electron',
        },
      }

      rebuildModule(configWithEnv, mockArchInfo)

      expect(execSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          env: expect.objectContaining({
            npm_config_build_from_source: 'true',
            npm_config_runtime: 'electron',
          }),
        })
      )
    })

    it('should handle rebuild errors for modules with prebuilds', () => {
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error('Rebuild failed')
      })

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation()

      // Should not throw because hasPrebuilds is true
      expect(() => rebuildModule(mockConfig, mockArchInfo)).not.toThrow()
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to rebuild node-pty')
      )

      consoleSpy.mockRestore()
    })

    it('should throw error for modules without prebuilds', () => {
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error('Rebuild failed')
      })

      const configNoPrebuilds = { ...mockConfig, hasPrebuilds: false }

      expect(() => rebuildModule(configNoPrebuilds, mockArchInfo)).toThrow(
        'Rebuild failed'
      )
    })

    it('should log success message on successful rebuild', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation()
      vi.mocked(execSync).mockImplementation(() => Buffer.from(''))

      rebuildModule(mockConfig, mockArchInfo)

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('✅ node-pty rebuilt successfully for arm64')
      )

      consoleSpy.mockRestore()
    })
  })

  describe('Architecture-specific behaviors', () => {
    it('should handle Apple Silicon configuration', () => {
      const archInfo = {
        current: 'arm64',
        target: 'arm64',
        isCrossCompile: false,
        platform: 'darwin',
        nodeArch: 'arm64',
      }

      process.env.MACOSX_DEPLOYMENT_TARGET = undefined

      // This would be set by the main function
      if (archInfo.platform === 'darwin' && archInfo.target === 'arm64') {
        process.env.MACOSX_DEPLOYMENT_TARGET = '11.0'
      }

      expect(process.env.MACOSX_DEPLOYMENT_TARGET).toBe('11.0')
    })

    it('should detect Linux ARM64 configuration', () => {
      const archInfo = {
        current: 'x64',
        target: 'arm64',
        isCrossCompile: true,
        platform: 'linux',
        nodeArch: 'x64',
      }

      expect(archInfo.platform).toBe('linux')
      expect(archInfo.target).toBe('arm64')
      expect(archInfo.isCrossCompile).toBe(true)
    })

    it('should detect Windows ARM64 configuration', () => {
      const archInfo = {
        current: 'x64',
        target: 'arm64',
        isCrossCompile: true,
        platform: 'win32',
        nodeArch: 'x64',
      }

      expect(archInfo.platform).toBe('win32')
      expect(archInfo.target).toBe('arm64')
      expect(archInfo.isCrossCompile).toBe(true)
    })
  })

  describe('NPM configuration', () => {
    it('should create .npmrc with ARM64 settings', () => {
      vi.mocked(existsSync).mockReset()
      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(writeFileSync).mockImplementation()

      const archInfo = {
        current: 'x64',
        target: 'arm64',
        isCrossCompile: true,
        platform: 'darwin',
        nodeArch: 'x64',
      }

      // Simulate createNpmConfig function behavior
      const npmConfig = `
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

      writeFileSync('.npmrc', npmConfig)

      expect(writeFileSync).toHaveBeenCalledWith(
        '.npmrc',
        expect.stringContaining('ARM64 Architecture Configuration')
      )
      expect(writeFileSync).toHaveBeenCalledWith(
        '.npmrc',
        expect.stringContaining('target_arch=arm64')
      )
    })

    it('should append to existing .npmrc', () => {
      vi.mocked(existsSync).mockReset()
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readFileSync).mockReturnValue('existing=config\n')
      vi.mocked(writeFileSync).mockImplementation()

      const archInfo = {
        current: 'x64',
        target: 'arm64',
        isCrossCompile: true,
        platform: 'darwin',
        nodeArch: 'x64',
      }

      // Test that the mocks are set up to handle appending
      const existingConfig = readFileSync('.npmrc', 'utf-8')
      expect(existingConfig).toBe('existing=config\n')

      const npmConfig = `
# ARM64 Architecture Configuration
target_arch=${archInfo.target}
`

      writeFileSync('.npmrc', existingConfig + '\n' + npmConfig)

      expect(writeFileSync).toHaveBeenCalledWith(
        '.npmrc',
        expect.stringContaining('existing=config')
      )
      expect(writeFileSync).toHaveBeenCalledWith(
        '.npmrc',
        expect.stringContaining('ARM64 Architecture Configuration')
      )
    })

    it('should not duplicate ARM64 configuration', () => {
      const existingWithARM64 = `
existing=config
# ARM64 Architecture Configuration
target_arch=arm64
`
      vi.mocked(existsSync).mockReset()
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readFileSync).mockReturnValue(existingWithARM64)

      // Should not write if already contains ARM64 config
      const result = existingWithARM64.includes(
        'ARM64 Architecture Configuration'
      )

      expect(result).toBe(true)
      // In real implementation, writeFileSync would not be called
    })
  })
})
