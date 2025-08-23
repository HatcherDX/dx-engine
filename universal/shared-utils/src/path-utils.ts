/**
 * @fileoverview Cross-platform path utilities for consistent path handling.
 *
 * @description
 * Provides utilities for normalizing and handling paths across Windows,
 * macOS, and Linux. Ensures consistent behavior regardless of platform.
 *
 * @remarks
 * These utilities handle platform-specific path separators, resolve
 * home directories, normalize paths, and provide safe path operations
 * that work consistently across all operating systems.
 *
 * @example
 * ```typescript
 * import { normalizePath, toPosixPath, toSystemPath } from '@hatcherdx/shared-utils/path'
 *
 * const path = normalizePath('C:\\Users\\test\\file.txt')
 * const posix = toPosixPath('C:\\Users\\test\\file.txt')
 * const system = toSystemPath('/Users/test/file.txt')
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { join, sep, posix, win32, dirname, basename, extname } from 'path'
import { homedir, platform } from 'os'

/**
 * Detects the current platform.
 *
 * @remarks
 * Provides boolean flags for platform detection to simplify
 * conditional logic in cross-platform code.
 *
 * @example
 * ```typescript
 * if (isWindows) {
 *   // Windows-specific code
 * }
 * ```
 *
 * @public
 * @since 1.0.0
 */
export const isWindows = platform() === 'win32'
export const isMacOS = platform() === 'darwin'
export const isLinux = platform() === 'linux'

/**
 * Normalizes a path to use the current platform's separator.
 *
 * @param path - The path to normalize
 * @returns Normalized path with correct separators for the current platform
 *
 * @example
 * ```typescript
 * // On Windows
 * normalizePath('/Users/test/file.txt') // Returns 'C:\\Users\\test\\file.txt'
 *
 * // On Unix
 * normalizePath('C:\\Users\\test\\file.txt') // Returns '/Users/test/file.txt'
 * ```
 *
 * @public
 * @since 1.0.0
 */
export function normalizePath(path: string): string {
  // Replace all path separators with the current platform's separator
  return path.replace(/[/\\]+/g, sep)
}

/**
 * Converts a path to POSIX format (forward slashes).
 *
 * @param path - The path to convert
 * @returns Path with forward slashes
 *
 * @example
 * ```typescript
 * toPosixPath('C:\\Users\\test\\file.txt') // Returns 'C:/Users/test/file.txt'
 * ```
 *
 * @public
 * @since 1.0.0
 */
export function toPosixPath(path: string): string {
  return path.replace(/\\/g, '/')
}

/**
 * Converts a path to Windows format (backslashes).
 *
 * @param path - The path to convert
 * @returns Path with backslashes
 *
 * @example
 * ```typescript
 * toWindowsPath('/Users/test/file.txt') // Returns '\\Users\\test\\file.txt'
 * ```
 *
 * @public
 * @since 1.0.0
 */
export function toWindowsPath(path: string): string {
  return path.replace(/\//g, '\\')
}

/**
 * Converts a path to the current system's format.
 *
 * @param path - The path to convert
 * @returns Path formatted for the current operating system
 *
 * @example
 * ```typescript
 * toSystemPath('/Users/test/file.txt') // Returns correct format for current OS
 * ```
 *
 * @public
 * @since 1.0.0
 */
export function toSystemPath(path: string): string {
  return isWindows ? toWindowsPath(path) : toPosixPath(path)
}

/**
 * Resolves a home directory path (~) to an absolute path.
 *
 * @param path - Path that may contain ~ for home directory
 * @returns Absolute path with home directory resolved
 *
 * @example
 * ```typescript
 * resolveHome('~/Documents/file.txt') // Returns '/Users/username/Documents/file.txt'
 * ```
 *
 * @public
 * @since 1.0.0
 */
export function resolveHome(path: string): string {
  if (path.startsWith('~')) {
    return join(homedir(), path.slice(1))
  }
  return path
}

/**
 * Safely joins path segments regardless of platform.
 *
 * @param paths - Path segments to join
 * @returns Joined path with correct separators
 *
 * @example
 * ```typescript
 * safejoin('Users', 'test', 'file.txt') // Returns correct path for OS
 * ```
 *
 * @public
 * @since 1.0.0
 */
export function safeJoin(...paths: string[]): string {
  return join(...paths.map((p) => normalizePath(p)))
}

/**
 * Gets the appropriate path separator for the current platform.
 *
 * @returns Path separator ('\\' on Windows, '/' on Unix)
 *
 * @example
 * ```typescript
 * const separator = getPathSeparator() // Returns '\\' or '/'
 * ```
 *
 * @public
 * @since 1.0.0
 */
export function getPathSeparator(): string {
  return sep
}

/**
 * Checks if a path is absolute.
 *
 * @param path - Path to check
 * @returns True if path is absolute, false otherwise
 *
 * @example
 * ```typescript
 * isAbsolutePath('/Users/test') // Returns true
 * isAbsolutePath('./relative') // Returns false
 * ```
 *
 * @public
 * @since 1.0.0
 */
export function isAbsolutePath(path: string): boolean {
  if (isWindows) {
    return win32.isAbsolute(path)
  }
  return posix.isAbsolute(path)
}

/**
 * Extracts the directory, filename, and extension from a path.
 *
 * @param path - Path to parse
 * @returns Object containing dir, name, and ext
 *
 * @example
 * ```typescript
 * parsePath('/Users/test/file.txt')
 * // Returns { dir: '/Users/test', name: 'file', ext: '.txt' }
 * ```
 *
 * @public
 * @since 1.0.0
 */
export function parsePath(path: string): {
  dir: string
  name: string
  ext: string
} {
  const normalizedPath = normalizePath(path)
  const dir = dirname(normalizedPath)
  const base = basename(normalizedPath)
  const ext = extname(normalizedPath)
  const name = base.slice(0, base.length - ext.length)

  return { dir, name, ext }
}

/**
 * Creates a platform-appropriate temp file path.
 *
 * @param filename - Name for the temp file
 * @returns Full path to temp file location
 *
 * @example
 * ```typescript
 * getTempPath('cache.json') // Returns '/tmp/cache.json' or 'C:\\Temp\\cache.json'
 * ```
 *
 * @public
 * @since 1.0.0
 */
export function getTempPath(filename: string): string {
  const tmpdir =
    process.env.TMPDIR || process.env.TMP || process.env.TEMP || '/tmp'
  return join(tmpdir, filename)
}

/**
 * Ensures a path uses forward slashes for URLs/URIs.
 *
 * @param path - Path to convert
 * @returns Path with forward slashes suitable for URLs
 *
 * @example
 * ```typescript
 * toUrlPath('C:\\Users\\test\\file.txt') // Returns 'file:///C:/Users/test/file.txt'
 * ```
 *
 * @public
 * @since 1.0.0
 */
export function toUrlPath(path: string): string {
  const posixPath = toPosixPath(path)
  if (isAbsolutePath(path) && !path.startsWith('file://')) {
    return `file:///${posixPath.replace(/^\//, '')}`
  }
  return posixPath
}
