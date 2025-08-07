/**
 * @fileoverview Test suite for PlatformUtils functionality.
 *
 * @description
 * Comprehensive tests for the PlatformUtils class that provides
 * platform-specific utilities for shell configuration and system detection.
 *
 * @example
 * ```typescript
 * // Testing shell detection
 * vi.mock('node:os', () => ({ platform: () => 'win32' }))
 * const shell = PlatformUtils.getDefaultShell()
 * expect(shell).toBe('cmd.exe')
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PlatformUtils } from './platform'

// Mock node:os module with vi.hoisted
const platformUtilsMocks = vi.hoisted(() => {
  return {
    platform: vi.fn(() => 'linux'),
  }
})

vi.mock(
  'node:os',
  () => ({
    platform: platformUtilsMocks.platform,
  }),
  { virtual: false }
)

describe('PlatformUtils', () => {
  let originalProcess: typeof process

  beforeEach(() => {
    originalProcess = global.process
    // Clear all mocks before each test
    vi.clearAllMocks()
    // Reset to default platform
    platformUtilsMocks.platform.mockReturnValue('linux')
  })

  afterEach(() => {
    vi.clearAllMocks()
    global.process = originalProcess
  })

  describe('getDefaultShell', () => {
    /**
     * Tests default shell selection for Windows platform.
     *
     * @returns void
     * Should return cmd.exe as default shell on Windows
     *
     * @example
     * ```typescript
     * platformUtilsMocks.platform.mockReturnValue('win32')
     * const shell = PlatformUtils.getDefaultShell()
     * expect(shell).toBe('cmd.exe')
     * ```
     *
     * @public
     */
    it('should return cmd.exe for Windows platform', () => {
      platformUtilsMocks.platform.mockReturnValue('win32')

      global.process = {
        ...originalProcess,
        env: {},
      } as NodeJS.Process

      const shell = PlatformUtils.getDefaultShell()
      expect(shell).toBe('cmd.exe')
    })

    /**
     * Tests default shell with ComSpec environment variable on Windows.
     *
     * @returns void
     * Should return ComSpec value when available on Windows
     *
     * @example
     * ```typescript
     * platformUtilsMocks.platform.mockReturnValue('win32')
     * global.process.env = { ComSpec: 'C:\\Windows\\system32\\cmd.exe' }
     * const shell = PlatformUtils.getDefaultShell()
     * expect(shell).toBe('C:\\Windows\\system32\\cmd.exe')
     * ```
     *
     * @public
     */
    it('should use ComSpec environment variable on Windows', () => {
      platformUtilsMocks.platform.mockReturnValue('win32')

      global.process = {
        ...originalProcess,
        env: { ComSpec: 'C:\\Windows\\system32\\cmd.exe' },
      } as NodeJS.Process

      const shell = PlatformUtils.getDefaultShell()
      expect(shell).toBe('C:\\Windows\\system32\\cmd.exe')
    })

    /**
     * Tests default shell selection for unknown platform.
     *
     * @returns void
     * Should return /bin/sh as fallback for unknown platforms
     *
     * @example
     * ```typescript
     * platformUtilsMocks.platform.mockReturnValue('freebsd')
     * const shell = PlatformUtils.getDefaultShell()
     * expect(shell).toBe('/bin/sh')
     * ```
     *
     * @public
     */
    it('should return /bin/sh for unknown platform', () => {
      platformUtilsMocks.platform.mockReturnValue('freebsd')

      global.process = {
        ...originalProcess,
        env: {},
      } as NodeJS.Process

      const shell = PlatformUtils.getDefaultShell()
      expect(shell).toBe('/bin/sh')
    })

    /**
     * Tests default shell selection for macOS platform.
     *
     * @returns void
     * Should return /bin/bash as default shell on macOS
     *
     * @example
     * ```typescript
     * vi.mocked(platform).mockReturnValue('darwin')
     * const shell = PlatformUtils.getDefaultShell()
     * expect(shell).toBe('/bin/bash')
     * ```
     *
     * @public
     */
    it('should return /bin/bash for macOS platform', () => {
      platformUtilsMocks.platform.mockReturnValue('darwin')

      global.process = {
        ...originalProcess,
        env: {},
      } as NodeJS.Process

      const shell = PlatformUtils.getDefaultShell()
      expect(shell).toBe('/bin/bash')
    })

    /**
     * Tests default shell selection for Linux platform.
     *
     * @returns void
     * Should return /bin/bash as default shell on Linux
     *
     * @example
     * ```typescript
     * vi.mocked(platform).mockReturnValue('linux')
     * const shell = PlatformUtils.getDefaultShell()
     * expect(shell).toBe('/bin/bash')
     * ```
     *
     * @public
     */
    it('should return /bin/bash for Linux platform', () => {
      platformUtilsMocks.platform.mockReturnValue('linux')

      global.process = {
        ...originalProcess,
        env: {},
      } as NodeJS.Process

      const shell = PlatformUtils.getDefaultShell()
      expect(shell).toBe('/bin/bash')
    })

    /**
     * Tests Unix shell detection with SHELL environment variable.
     *
     * @param platformName - The platform to test
     * @returns void
     * Should use SHELL environment variable when available on Unix platforms
     *
     * @example
     * ```typescript
     * global.process.env = { SHELL: '/bin/zsh' }
     * const shell = PlatformUtils.getDefaultShell()
     * expect(shell).toBe('/bin/zsh')
     * ```
     *
     * @public
     */
    it.each(['darwin', 'linux'])(
      'should use SHELL environment variable on %s',
      (platformName) => {
        platformUtilsMocks.platform.mockReturnValue(platformName)

        global.process = {
          ...originalProcess,
          env: { SHELL: '/bin/zsh' },
        } as NodeJS.Process

        const shell = PlatformUtils.getDefaultShell()
        expect(shell).toBe('/bin/zsh')
      }
    )
  })

  describe('getHomeDirectory', () => {
    /**
     * Tests home directory detection using HOME environment variable.
     *
     * @returns void
     * Should return HOME environment variable when available
     *
     * @example
     * ```typescript
     * global.process.env = { HOME: '/home/user' }
     * const home = PlatformUtils.getHomeDirectory()
     * expect(home).toBe('/home/user')
     * ```
     *
     * @public
     */
    it('should return HOME environment variable', () => {
      global.process = {
        ...originalProcess,
        env: { HOME: '/home/user' },
        cwd: vi.fn(() => '/fallback'),
      } as NodeJS.Process

      const home = PlatformUtils.getHomeDirectory()
      expect(home).toBe('/home/user')
    })

    /**
     * Tests home directory detection using USERPROFILE environment variable.
     *
     * @returns void
     * Should return USERPROFILE when HOME is not available
     *
     * @example
     * ```typescript
     * global.process.env = { USERPROFILE: 'C:\\Users\\user' }
     * const home = PlatformUtils.getHomeDirectory()
     * expect(home).toBe('C:\\Users\\user')
     * ```
     *
     * @public
     */
    it('should return USERPROFILE when HOME is not available', () => {
      global.process = {
        ...originalProcess,
        env: { USERPROFILE: 'C:\\Users\\user' },
        cwd: vi.fn(() => '/fallback'),
      } as NodeJS.Process

      const home = PlatformUtils.getHomeDirectory()
      expect(home).toBe('C:\\Users\\user')
    })

    /**
     * Tests home directory fallback to current working directory.
     *
     * @returns void
     * Should return current working directory when no home variables are set
     *
     * @example
     * ```typescript
     * global.process.env = {}
     * global.process.cwd = vi.fn(() => '/current/dir')
     * const home = PlatformUtils.getHomeDirectory()
     * expect(home).toBe('/current/dir')
     * ```
     *
     * @public
     */
    it('should fallback to current working directory', () => {
      global.process = {
        ...originalProcess,
        env: {},
        cwd: vi.fn(() => '/current/working/directory'),
      } as NodeJS.Process

      const home = PlatformUtils.getHomeDirectory()
      expect(home).toBe('/current/working/directory')
      expect(global.process.cwd).toHaveBeenCalled()
    })
  })

  describe('getShellArgs', () => {
    /**
     * Tests shell arguments for Windows platform.
     *
     * @returns void
     * Should return empty array for Windows platform
     *
     * @example
     * ```typescript
     * platformUtilsMocks.platform.mockReturnValue('win32')
     * const args = PlatformUtils.getShellArgs()
     * expect(args).toEqual([])
     * ```
     *
     * @public
     */
    it('should return empty array for Windows platform', () => {
      platformUtilsMocks.platform.mockReturnValue('win32')

      const args = PlatformUtils.getShellArgs()
      expect(args).toEqual([])
    })

    /**
     * Tests shell arguments for macOS platform.
     *
     * @returns void
     * Should return login shell argument for macOS
     *
     * @example
     * ```typescript
     * platformUtilsMocks.platform.mockReturnValue('darwin')
     * const args = PlatformUtils.getShellArgs()
     * expect(args).toEqual(['-l'])
     * ```
     *
     * @public
     */
    it('should return [-l] for macOS platform', () => {
      platformUtilsMocks.platform.mockReturnValue('darwin')

      const args = PlatformUtils.getShellArgs()
      expect(args).toEqual(['-l'])
    })

    /**
     * Tests shell arguments for Linux platform.
     *
     * @returns void
     * Should return login shell argument for Linux
     *
     * @example
     * ```typescript
     * platformUtilsMocks.platform.mockReturnValue('linux')
     * const args = PlatformUtils.getShellArgs()
     * expect(args).toEqual(['-l'])
     * ```
     *
     * @public
     */
    it('should return [-l] for Linux platform', () => {
      platformUtilsMocks.platform.mockReturnValue('linux')

      const args = PlatformUtils.getShellArgs()
      expect(args).toEqual(['-l'])
    })

    /**
     * Tests shell arguments for unknown platform.
     *
     * @returns void
     * Should return empty array for unknown platforms
     *
     * @example
     * ```typescript
     * platformUtilsMocks.platform.mockReturnValue('freebsd')
     * const args = PlatformUtils.getShellArgs()
     * expect(args).toEqual([])
     * ```
     *
     * @public
     */
    it('should return empty array for unknown platform', () => {
      platformUtilsMocks.platform.mockReturnValue('freebsd')

      const args = PlatformUtils.getShellArgs()
      expect(args).toEqual([])
    })
  })

  describe('Platform detection methods', () => {
    /**
     * Tests Windows platform detection.
     *
     * @returns void
     * Should correctly identify Windows platform
     *
     * @example
     * ```typescript
     * platformUtilsMocks.platform.mockReturnValue('win32')
     * const isWin = PlatformUtils.isWindows()
     * expect(isWin).toBe(true)
     * ```
     *
     * @public
     */
    it('should correctly detect Windows platform', () => {
      platformUtilsMocks.platform.mockReturnValue('win32')

      expect(PlatformUtils.isWindows()).toBe(true)
      expect(PlatformUtils.isMacOS()).toBe(false)
      expect(PlatformUtils.isLinux()).toBe(false)
    })

    /**
     * Tests macOS platform detection.
     *
     * @returns void
     * Should correctly identify macOS platform
     *
     * @example
     * ```typescript
     * platformUtilsMocks.platform.mockReturnValue('darwin')
     * const isMac = PlatformUtils.isMacOS()
     * expect(isMac).toBe(true)
     * ```
     *
     * @public
     */
    it('should correctly detect macOS platform', () => {
      platformUtilsMocks.platform.mockReturnValue('darwin')

      expect(PlatformUtils.isWindows()).toBe(false)
      expect(PlatformUtils.isMacOS()).toBe(true)
      expect(PlatformUtils.isLinux()).toBe(false)
    })

    /**
     * Tests Linux platform detection.
     *
     * @returns void
     * Should correctly identify Linux platform
     *
     * @example
     * ```typescript
     * platformUtilsMocks.platform.mockReturnValue('linux')
     * const isLinux = PlatformUtils.isLinux()
     * expect(isLinux).toBe(true)
     * ```
     *
     * @public
     */
    it('should correctly detect Linux platform', () => {
      platformUtilsMocks.platform.mockReturnValue('linux')

      expect(PlatformUtils.isWindows()).toBe(false)
      expect(PlatformUtils.isMacOS()).toBe(false)
      expect(PlatformUtils.isLinux()).toBe(true)
    })

    /**
     * Tests platform detection for unknown platform.
     *
     * @returns void
     * Should return false for all detection methods on unknown platform
     *
     * @example
     * ```typescript
     * platformUtilsMocks.platform.mockReturnValue('freebsd')
     * expect(PlatformUtils.isWindows()).toBe(false)
     * expect(PlatformUtils.isMacOS()).toBe(false)
     * expect(PlatformUtils.isLinux()).toBe(false)
     * ```
     *
     * @public
     */
    it('should return false for all detection methods on unknown platform', () => {
      platformUtilsMocks.platform.mockReturnValue('freebsd')

      expect(PlatformUtils.isWindows()).toBe(false)
      expect(PlatformUtils.isMacOS()).toBe(false)
      expect(PlatformUtils.isLinux()).toBe(false)
    })
  })
})
