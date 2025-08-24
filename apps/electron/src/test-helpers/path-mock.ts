/**
 * Platform-aware path.join mock for testing
 *
 * This helper ensures that path.join returns the correct path separator
 * for the current platform, preventing "File URL path must be absolute"
 * errors on Windows.
 */
export const createPathJoinMock = () => {
  return (...args: string[]) => {
    // Use backslashes on Windows, forward slashes elsewhere
    const separator = process.platform === 'win32' ? '\\' : '/'
    return args.join(separator)
  }
}

/**
 * Default path module mock for vitest
 */
export const pathMock = {
  join: createPathJoinMock(),
}
