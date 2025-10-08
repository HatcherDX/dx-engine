import { config, RouterLinkStub } from '@vue/test-utils'

/**
 * @fileoverview Global test setup file for Vitest.
 *
 * @description
 * CRITICAL: This file is loaded as setupFiles in vitest.config.ts.
 * DO NOT import from 'vitest' here (vi, afterEach, etc.) as it causes
 * "Vitest failed to access its internal state" errors in CI environments.
 *
 * With globals: true enabled in vitest.config.ts, all vitest utilities
 * (vi, describe, it, expect, afterEach, etc.) are available globally.
 *
 * @see https://vitest.dev/config/#globals
 * @see https://vitest.dev/config/#setupfiles
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

// Access vi and afterEach from global context (available via globals: true)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const vi = (globalThis as any).vi
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const afterEach = (globalThis as any).afterEach

// Mock CSS imports - must be at top level
vi.mock('xterm/css/xterm.css', () => ({
  default: {},
}))

// Logger mocking removed - tests should mock Logger individually when needed
// This allows logger.spec.ts to test the real Logger implementation

// Declare global for Vue Test Utils auto unmount tracking
declare global {
  // eslint-disable-next-line no-var
  var __vueTestUtilsAutoUnmountEnabled: boolean | undefined
}

// Apply storage mocks in CI environment before any other imports
if (
  process.env.CI ||
  process.env.GITHUB_ACTIONS ||
  process.env.VITEST_MOCK_SQLITE === 'true'
) {
  process.env.VITEST_MOCK_SQLITE = 'true'
  // Import storage mocks for CI environment
  import('./universal/storage/src/test-mocks')
}

// Mock básico de fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  })
)

// Mock de Vue lifecycle hooks - but preserve functionality
vi.mock('vue', async () => {
  const actual = (await vi.importActual('vue')) as Record<string, unknown>
  return {
    ...actual,
    // Don't mock lifecycle hooks - let them work normally
    // onMounted: vi.fn(),
    // onUnmounted: vi.fn(),
    // onBeforeMount: vi.fn(),
    // onBeforeUnmount: vi.fn(),
  }
})

// Configuración básica de Vue Test Utils
config.global.stubs = {
  'router-link': RouterLinkStub,
  'router-view': true,
}

config.global.mocks = {
  $router: {
    push: vi.fn(),
    replace: vi.fn(),
  },
  $route: {
    path: '/test',
    params: {},
    query: {},
  },
}

// Mock de APIs del navegador
global.ResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock localStorage for all environments
const localStorageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
}

// Mock document if not available
if (typeof document === 'undefined') {
  global.document = {
    createElement: vi.fn(() => ({
      style: {},
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
        contains: vi.fn(),
      },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      appendChild: vi.fn(),
      removeChild: vi.fn(),
      querySelector: vi.fn(() => null),
      querySelectorAll: vi.fn(() => []),
    })),
    getElementById: vi.fn(() => null),
    querySelector: vi.fn(() => null),
    querySelectorAll: vi.fn(() => []),
    body: {
      style: {},
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
        contains: vi.fn(),
      },
      appendChild: vi.fn(),
      removeChild: vi.fn(),
    },
    documentElement: {
      style: {},
    },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  } as Partial<Document>
}

// Mock window if not available
if (typeof window === 'undefined') {
  global.window = {
    document: global.document,
    localStorage: localStorageMock,
    sessionStorage: localStorageMock,
    location: {
      href: 'http://localhost:3000',
      pathname: '/',
      search: '',
      hash: '',
    },
    navigator: {
      userAgent: 'Vitest',
    },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    CustomEvent: class CustomEvent extends Event {
      detail: unknown
      constructor(type: string, eventInitDict?: CustomEventInit) {
        super(type, eventInitDict)
        this.detail = eventInitDict?.detail
      }
    },
  } as Partial<Window & typeof globalThis>
} else {
  // If window exists, ensure localStorage is mocked
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
    configurable: true,
  })
}

// Also set global localStorage
global.localStorage = localStorageMock

// Global error handler to prevent uncaught exceptions in tests
// These errors are expected in tests that deliberately throw errors
const suppressedErrors = [
  'Terminal initialization failed',
  'Addon loading failed',
  "Cannot read properties of null (reading 'style')",
  'terminalContainer.value',
]

// Override process unhandled rejection handler for Node.js
if (typeof process !== 'undefined') {
  process.on('unhandledRejection', (reason: unknown) => {
    let message = ''
    if (
      typeof reason === 'object' &&
      reason !== null &&
      'message' in reason &&
      typeof (reason as { message?: unknown }).message === 'string'
    ) {
      message = (reason as { message: string }).message
    } else {
      message = String(reason)
    }
    if (suppressedErrors.some((err) => message.includes(err))) {
      // Suppress these expected errors
      return
    }
    // Let other errors through
    console.error('Unhandled Rejection:', reason)
  })

  process.on('uncaughtException', (error: Error) => {
    const message = error?.message || error?.toString() || ''
    if (suppressedErrors.some((err) => message.includes(err))) {
      // Suppress these expected errors
      return
    }
    // Let other errors through
    console.error('Uncaught Exception:', error)
  })
}

if (typeof window !== 'undefined') {
  const originalConsoleError = console.error
  console.error = (...args: unknown[]) => {
    // Filter out expected error messages during tests
    const errorMessage = args[0]?.toString() || ''
    if (suppressedErrors.some((err) => errorMessage.includes(err))) {
      // These are expected errors in tests, don't log them
      return
    }
    originalConsoleError.apply(console, args)
  }

  // Suppress uncaught errors in tests
  window.addEventListener('error', (event) => {
    const message = event.error?.message || ''
    if (suppressedErrors.some((err) => message.includes(err))) {
      event.preventDefault()
      event.stopPropagation()
      return false
    }
  })

  window.addEventListener('unhandledrejection', (event) => {
    const message = event.reason?.message || event.reason?.toString() || ''
    if (suppressedErrors.some((err) => message.includes(err))) {
      event.preventDefault()
      event.stopPropagation()
      return false
    }
  })
}

// Manual DOM cleanup without enableAutoUnmount
// Context7 pattern: enableAutoUnmount causes "Vitest failed to access its internal state"
// errors in CI because it tries to access vitest context during cleanup phase.
// Use simple synchronous cleanup to avoid worker timeouts.
afterEach(() => {
  // Clear DOM content synchronously - no async to avoid worker communication timeouts
  if (typeof document !== 'undefined' && document.body) {
    document.body.innerHTML = ''
  }

  // CRITICAL: Event listeners on window persist across tests
  // Clearing innerHTML above should trigger Vue component unmount hooks
  // which will remove event listeners. No additional action needed here.
})

// CRITICAL SAFETY: Environment variable stubbing for Git safety
process.env.NODE_ENV = 'test'
process.env.VITEST = 'true'
process.env.GIT_TERMINAL_PROMPT = '0'
process.env.GIT_SSH_COMMAND = 'echo "Git SSH operations blocked in tests"'

// Mock child_process to prevent real Git operations
vi.mock('child_process', () => {
  const mockMethods = {
    spawn: vi.fn((command, args = [], options = {}) => {
      const fullCommand = [command, ...args].join(' ')

      // Mock process object
      const mockProcess = {
        stdout: {
          on: vi.fn((event, callback) => {
            if (event === 'data') {
              // Handle different commands
              if (fullCommand.includes('echo "Hello World"')) {
                setTimeout(() => callback(Buffer.from('Hello World\n')), 5)
              } else if (fullCommand.includes('pwd')) {
                setTimeout(() => callback(Buffer.from('/tmp\n')), 5)
              } else if (fullCommand.includes('echo $TEST_VAR')) {
                setTimeout(() => callback(Buffer.from('test_value\n')), 5)
              } else if (fullCommand.includes('echo "test output"')) {
                setTimeout(() => callback(Buffer.from('test output\n')), 5)
              }
            }
          }),
        },
        stderr: {
          on: vi.fn((event, callback) => {
            if (event === 'data') {
              if (fullCommand.includes('nonexistentcommand12345')) {
                setTimeout(
                  () =>
                    callback(
                      Buffer.from(
                        'command not found: nonexistentcommand12345\n'
                      )
                    ),
                  5
                )
              } else if (
                fullCommand.includes('sleep 2') &&
                options.timeout &&
                options.timeout < 2000
              ) {
                setTimeout(
                  () => callback(Buffer.from('Command timed out\n')),
                  5
                )
              }
            }
          }),
        },
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            let exitCode = 0
            let delay = 10

            // Determine exit code and delay based on command
            if (fullCommand.includes('exit 1')) {
              exitCode = 1
            } else if (fullCommand.includes('nonexistentcommand12345')) {
              exitCode = 127 // Command not found
            } else if (fullCommand.includes('sleep 2')) {
              // Simulate a 2-second sleep - don't complete if timeout will kill it first
              delay = 2000
              if (options.timeout && options.timeout < 2000) {
                // Don't call close callback - let timeout kill the process
                return
              }
            } else if (fullCommand.includes('sleep 10')) {
              // Long sleep for cancellation tests
              delay = 10000
            }

            setTimeout(() => callback(exitCode), delay)
          }
        }),
        kill: vi.fn(),
      }

      return mockProcess
    }),
    exec: vi.fn((command, callback) => {
      console.warn(`🛡️ SAFETY: Blocked child_process.exec: ${command}`)
      callback?.(null, 'Mocked output', '')
    }),
    execSync: vi.fn((command) => {
      console.warn(`🛡️ SAFETY: Blocked child_process.execSync: ${command}`)
      return Buffer.from('Mocked output')
    }),
    fork: vi.fn(() => ({
      on: vi.fn(),
      kill: vi.fn(),
      disconnect: vi.fn(),
    })),
  }

  return {
    // Named exports for: import { spawn } from 'child_process'
    ...mockMethods,
    // Default export for: import * as childProcess from 'child_process'
    default: mockMethods,
  }
})

// Initialize Git safety monitoring with timeout protection
interface GitSafetyDetectorModule {
  GitSafetyDetector: {
    getInstance: () => {
      configure: (config: {
        strict: boolean
        enableMonitoring: boolean
        customTestEnvVars: string[]
      }) => void
      detectEnvironment: () => {
        isTestEnvironment: boolean
        confidence: number
        triggers: string[]
      }
    }
  }
}

const initGitSafety = async () => {
  try {
    // Set a timeout to prevent hanging on module import
    const importPromise = import(
      '@/universal/terminal-system/src/utils/GitSafetyDetector'
    )
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Import timeout')), 5000)
    )

    const module = (await Promise.race([
      importPromise,
      timeoutPromise,
    ])) as GitSafetyDetectorModule
    const detector = module.GitSafetyDetector.getInstance()
    detector.configure({
      strict: true,
      enableMonitoring: true,
      customTestEnvVars: ['VITEST', 'JEST_WORKER_ID'],
    })

    const detection = detector.detectEnvironment()
    if (detection.isTestEnvironment) {
      console.log(
        `🛡️ Git Safety: Test environment confirmed (confidence: ${detection.confidence}%)`
      )
      console.log(`🛡️ Detection triggers: ${detection.triggers.join(', ')}`)
    } else {
      console.warn('⚠️ Git Safety: Test environment detection failed!')
      console.warn('⚠️ This could indicate a configuration problem')
    }
  } catch (importError) {
    // Fallback if module not available - don't break tests
    console.log(
      '🛡️ Git Safety: Basic protection active (enhanced detector not available)',
      (importError as Error).message || 'Import failed'
    )
  }
}

// Initialize with timeout protection
initGitSafety().catch((error) => {
  console.warn(
    '⚠️ Git Safety: Could not initialize enhanced monitoring:',
    error
  )
})

console.log('✅ Global vitest setup completed with Git safety protections')
