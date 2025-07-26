/**
 * Development Console Filter
 * Filters only very specific, known harmless DevTools noise
 * while preserving all important error messages for debugging
 */

interface ConsoleFilterOptions {
  enabled: boolean
}

/**
 * Known harmless patterns that can be safely filtered
 * These are VERY specific to avoid hiding real issues
 */
const HARMLESS_PATTERNS = [
  // Autofill API not available in Electron (DevTools tries to use Chrome-specific APIs)
  /Request Autofill\.enable failed.*'Autofill\.enable' wasn't found/,
  /Request Autofill\.setAddresses failed.*'Autofill\.setAddresses' wasn't found/,

  // DevTools remote resource loading failures (trying to load from appspot.com)
  /chrome-devtools-frontend\.appspot\.com.*Unexpected token.*HTTP\/1\.1 4/,
  /Unexpected token 'H'.*HTTP\/1\.1 4.*is not valid JSON/,
  /devtools:\/\/devtools\/.*Unexpected token 'H'/,

  // Known harmless Electron/macOS warnings
  /Secure coding is not enabled for restorable state/,
  /CoreText note: Client requested name/,

  // Engine version warnings (non-critical development warnings)
  /Unsupported engine: wanted.*current:/,

  // Node deprecation warnings that don't affect functionality
  /deprecated subdependencies found:/,

  // PNPM lockfile warnings in development
  /`node_modules` is present\. Lockfile only installation will make it out-of-date/,
]

/**
 * Setup console filtering for development
 * Only filters very specific harmless DevTools messages
 */
export function setupDevConsoleFilter(
  options: ConsoleFilterOptions = { enabled: true }
) {
  if (!options.enabled || process.env.NODE_ENV !== 'development') {
    return
  }

  // Store original console methods
  const originalConsoleError = console.error
  const originalConsoleWarn = console.warn
  const originalConsoleLog = console.log

  console.error = (...args: unknown[]) => {
    const message = args.join(' ')

    // Only filter if message matches our VERY specific harmless patterns
    const isHarmless = HARMLESS_PATTERNS.some((pattern) =>
      pattern.test(message)
    )

    if (!isHarmless) {
      // Show ALL other errors - this is critical for debugging
      originalConsoleError.apply(console, ['[MAIN]', ...args])
    }
    // Harmless messages are silently ignored
  }

  console.warn = (...args: unknown[]) => {
    const message = args.join(' ')

    // Only filter if message matches our VERY specific harmless patterns
    const isHarmless = HARMLESS_PATTERNS.some((pattern) =>
      pattern.test(message)
    )

    if (!isHarmless) {
      // Show ALL other warnings - this is important for debugging
      originalConsoleWarn.apply(console, ['[MAIN]', ...args])
    }
    // Harmless messages are silently ignored
  }

  console.log = (...args: unknown[]) => {
    const message = args.join(' ')

    // Only filter if message matches our VERY specific harmless patterns
    const isHarmless = HARMLESS_PATTERNS.some((pattern) =>
      pattern.test(message)
    )

    if (!isHarmless) {
      // Show ALL other logs - preserve debugging information
      originalConsoleLog.apply(console, ['[MAIN]', ...args])
    }
    // Harmless messages are silently ignored
  }

  return {
    restore: () => {
      console.error = originalConsoleError
      console.warn = originalConsoleWarn
      console.log = originalConsoleLog
    },
  }
}

/**
 * Check if a message matches harmless patterns
 */
export function isHarmlessDevToolsMessage(message: string): boolean {
  return HARMLESS_PATTERNS.some((pattern) => pattern.test(message))
}
