/**
 * Platform-aware path.join mock for testing
 *
 * This helper ensures that path.join returns the correct path separator
 * for the current platform, preventing "File URL path must be absolute"
 * errors on Windows.
 */
export const createPathJoinMock = () => {
  const sep = process.platform === 'win32' ? '\\' : '/'
  return (...args: string[]) => {
    // Filter out undefined/null args
    const validArgs = args.filter((arg) => arg != null)

    // Join with platform-specific separator
    const joined = validArgs.join(sep)

    // Handle absolute paths on Windows
    if (process.platform === 'win32') {
      // If it starts with a drive letter, it's already absolute
      if (/^[A-Za-z]:/.test(joined)) {
        return joined
      }
      // If it starts with a separator, make it absolute with C: drive
      if (joined.startsWith(sep)) {
        return `C:${joined}`
      }
    }

    return joined
  }
}

/**
 * Default path module mock for vitest
 */
export const pathMock = {
  join: createPathJoinMock(),
  sep: process.platform === 'win32' ? '\\' : '/',
}
