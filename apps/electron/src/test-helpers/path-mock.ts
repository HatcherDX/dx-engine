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

    // Handle special __dirname case
    const processedArgs = validArgs.map((arg) => {
      if (arg === '__dirname' && process.platform === 'win32') {
        return 'C:\\test\\electron'
      }
      if (arg === '__dirname') {
        return '/test/electron'
      }
      return arg
    })

    // Join with platform-specific separator
    const joined = processedArgs.join(sep)

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
      // If it's a relative path, make it absolute
      if (!joined.startsWith('C:')) {
        return `C:\\test\\electron\\${joined}`
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
