import * as os from 'node:os'

/**
 * Platform-specific utilities
 */
export class PlatformUtils {
  /**
   * Get the default shell for the current platform
   */
  static getDefaultShell(): string {
    const currentPlatform = os.platform()

    switch (currentPlatform) {
      case 'win32':
        return process.env.ComSpec || 'cmd.exe'
      case 'darwin':
      case 'linux':
        return process.env.SHELL || '/bin/bash'
      default:
        return '/bin/sh'
    }
  }

  /**
   * Get shell arguments for the current platform
   */
  static getShellArgs(): string[] {
    const currentPlatform = os.platform()

    switch (currentPlatform) {
      case 'win32':
        return []
      case 'darwin':
      case 'linux':
        return ['-l'] // Login shell
      default:
        return []
    }
  }

  /**
   * Get the user's home directory
   */
  static getHomeDirectory(): string {
    return process.env.HOME || process.env.USERPROFILE || process.cwd()
  }

  /**
   * Check if running on Windows
   */
  static isWindows(): boolean {
    return os.platform() === 'win32'
  }

  /**
   * Check if running on macOS
   */
  static isMacOS(): boolean {
    return os.platform() === 'darwin'
  }

  /**
   * Check if running on Linux
   */
  static isLinux(): boolean {
    return os.platform() === 'linux'
  }
}
