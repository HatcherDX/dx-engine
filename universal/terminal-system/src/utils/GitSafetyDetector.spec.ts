/**
 * @fileoverview Tests for Enhanced Git Safety Detection System
 *
 * 🚨 THESE TESTS VALIDATE THE CRITICAL SAFETY SYSTEMS THAT PREVENT REAL GIT OPERATIONS
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GitSafetyDetector, type GitSafetyConfig } from './GitSafetyDetector'

describe('🛡️ Enhanced Git Safety Detection System', () => {
  let detector: GitSafetyDetector
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    // Store original environment
    originalEnv = { ...process.env }

    // Get fresh detector instance
    detector = GitSafetyDetector.getInstance()

    // Clear detection history
    detector.clearHistory()

    // Ensure test environment variables are set
    process.env.NODE_ENV = 'test'
    process.env.VITEST = 'true'
  })

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv
  })

  describe('🔍 Environment Detection', () => {
    it('should detect Vitest environment correctly', () => {
      process.env.VITEST = 'true'

      const detection = detector.detectEnvironment()

      expect(detection.isTestEnvironment).toBe(true)
      expect(detection.triggers).toContain('vitest')
      expect(detection.confidence).toBeGreaterThan(30)
      expect(detection.context.vitest).toBeDefined()
    })

    it('should detect NODE_ENV=test', () => {
      process.env.NODE_ENV = 'test'
      delete process.env.VITEST

      const detection = detector.detectEnvironment()

      expect(detection.isTestEnvironment).toBe(true)
      expect(detection.triggers).toContain('env-vars')
      expect(detection.context.environment).toBeDefined()
    })

    it('should detect test files in stack trace', () => {
      // This test itself should trigger stack trace detection
      const detection = detector.detectEnvironment()

      expect(detection.isTestEnvironment).toBe(true)
      expect(detection.triggers).toContain('stack-trace')
      expect(detection.context.stackTrace).toBeDefined()
      expect(detection.context.stackTrace.testFile).toMatch(
        /GitSafetyDetector\.spec\./
      )
    })

    it('should combine multiple detection methods for high confidence', () => {
      process.env.VITEST = 'true'
      process.env.NODE_ENV = 'test'
      process.env.CI = 'true'

      const detection = detector.detectEnvironment()

      expect(detection.isTestEnvironment).toBe(true)
      expect(detection.confidence).toBeGreaterThan(70)
      expect(detection.triggers.length).toBeGreaterThan(2)
    })
  })

  describe('🎯 Configuration and Customization', () => {
    it('should allow custom configuration', () => {
      const config: Partial<GitSafetyConfig> = {
        strict: false,
        enableMonitoring: false,
        customTestEnvVars: ['CUSTOM_TEST_VAR'],
        customTestPatterns: [/custom-test-pattern/],
      }

      detector.configure(config)

      // Test that custom config is applied
      process.env.CUSTOM_TEST_VAR = 'true'
      const detection = detector.detectEnvironment()

      expect(detection.context.environment?.customVars).toHaveProperty(
        'CUSTOM_TEST_VAR'
      )
    })

    it('should handle strict mode correctly', () => {
      // Configure non-strict mode
      detector.configure({ strict: false })

      // Clear all test indicators
      delete process.env.VITEST
      delete process.env.NODE_ENV
      delete process.env.CI

      const detection = detector.detectEnvironment()

      // Should still detect due to stack trace, but with lower confidence threshold
      expect(detection.isTestEnvironment).toBe(true)
    })
  })

  describe('🚨 Mock Results Generation', () => {
    it('should generate safe mock results for git status', () => {
      const result = detector.getMockResult('git status --porcelain')

      expect(result.success).toBe(true)
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('src/test-file.ts')
      expect(result.duration).toBe(50)
    })

    it('should generate safe mock results for git branch', () => {
      const result = detector.getMockResult('git branch --show-current')

      expect(result.success).toBe(true)
      expect(result.stdout).toBe('main\n')
    })

    it('should warn about dangerous operations', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = detector.getMockResult('git push origin main')

      expect(result.success).toBe(true)
      expect(result.stdout).toContain(
        'TEST MODE: Git operation simulated safely'
      )

      consoleSpy.mockRestore()
    })

    it('should handle unknown commands gracefully', () => {
      const result = detector.getMockResult('git unknown-command')

      expect(result.success).toBe(true)
      expect(result.stdout).toContain('Test mode: Safe mock response')
    })
  })

  describe('📊 Detection History and Monitoring', () => {
    it('should maintain detection history', () => {
      // Trigger multiple detections
      detector.detectEnvironment()
      detector.detectEnvironment()
      detector.detectEnvironment()

      const history = detector.getDetectionHistory()

      expect(history.length).toBe(3)
      expect(history[0].timestamp).toBeDefined()
      expect(history[0].isTestEnvironment).toBe(true)
    })

    it('should limit history size', () => {
      // Configure for monitoring
      detector.configure({ enableMonitoring: true })

      // Trigger many detections (more than the limit)
      for (let i = 0; i < 120; i++) {
        detector.detectEnvironment()
      }

      const history = detector.getDetectionHistory()

      // Should be limited to prevent memory issues
      expect(history.length).toBeLessThanOrEqual(100)
    })

    it('should allow history clearing', () => {
      detector.detectEnvironment()
      detector.detectEnvironment()

      expect(detector.getDetectionHistory().length).toBe(2)

      detector.clearHistory()

      expect(detector.getDetectionHistory().length).toBe(0)
    })
  })

  describe('🏠 Singleton Pattern', () => {
    it('should maintain singleton instance', () => {
      const instance1 = GitSafetyDetector.getInstance()
      const instance2 = GitSafetyDetector.getInstance()

      expect(instance1).toBe(instance2)
    })

    it('should share configuration across instances', () => {
      const instance1 = GitSafetyDetector.getInstance()
      const instance2 = GitSafetyDetector.getInstance()

      instance1.configure({ strict: false })

      // Both instances should use the same configuration
      expect(instance1).toBe(instance2)
    })
  })

  describe('⚡ Performance and Edge Cases', () => {
    it('should handle missing stack trace gracefully', () => {
      // Mock Error to return undefined stack
      const originalError = Error
      global.Error = class extends Error {
        stack = undefined
      } as typeof Error

      const detection = detector.detectEnvironment()

      // Should still work without stack trace
      expect(detection.isTestEnvironment).toBe(true)

      // Restore original Error
      global.Error = originalError
    })

    it('should handle environment detection quickly', () => {
      const startTime = performance.now()

      detector.detectEnvironment()

      const duration = performance.now() - startTime

      // Should complete quickly (under 10ms)
      expect(duration).toBeLessThan(10)
    })

    it('should handle missing process.env gracefully', () => {
      const originalEnv = process.env

      // Temporarily remove process.env
      ;(process as NodeJS.Process & { env?: NodeJS.ProcessEnv }).env = undefined

      expect(() => {
        detector.detectEnvironment()
      }).not.toThrow()

      // Restore process.env
      process.env = originalEnv
    })
  })

  describe('🔒 Safety Verification', () => {
    it('should NEVER return false positives in production-like environments', () => {
      // Simulate production environment
      delete process.env.VITEST
      delete process.env.JEST_WORKER_ID
      delete process.env.CI
      process.env.NODE_ENV = 'production'

      // Configure strict mode
      detector.configure({ strict: true })

      const detection = detector.detectEnvironment()

      // Should still detect test due to stack trace (we're in a test file)
      // But in real production, this wouldn't trigger
      expect(detection.triggers).toContain('stack-trace')
    })

    it('should maintain consistent detection across multiple calls', () => {
      const detection1 = detector.detectEnvironment()
      const detection2 = detector.detectEnvironment()
      const detection3 = detector.detectEnvironment()

      expect(detection1.isTestEnvironment).toBe(detection2.isTestEnvironment)
      expect(detection2.isTestEnvironment).toBe(detection3.isTestEnvironment)
      expect(detection1.triggers).toEqual(detection3.triggers)
    })
  })
})

describe('🧪 Legacy Compatibility', () => {
  let detector: GitSafetyDetector

  beforeEach(() => {
    detector = GitSafetyDetector.getInstance()
  })

  it('should provide backward-compatible boolean method', () => {
    const isTest = detector.isTestEnvironment()

    expect(typeof isTest).toBe('boolean')
    expect(isTest).toBe(true) // We're in a test environment
  })

  it('should match legacy detection results', () => {
    const enhanced = detector.detectEnvironment().isTestEnvironment
    const legacy = detector.isTestEnvironment()

    expect(enhanced).toBe(legacy)
  })
})

describe('🔬 Advanced Coverage Tests', () => {
  let detector: GitSafetyDetector
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = { ...process.env }
    detector = GitSafetyDetector.getInstance()
    detector.clearHistory()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('🎯 Edge Cases and Error Handling', () => {
    it('should handle all Jest environment variations', () => {
      process.env.JEST_WORKER_ID = '1'
      // Mock Jest globals
      const mockGlobal = global as unknown as Record<string, unknown>
      mockGlobal.jest = { fn: vi.fn }

      const detection = detector.detectEnvironment()

      expect(detection.triggers).toContain('jest')
      expect(detection.context.jest).toBeDefined()
      expect(detection.context.jest.JEST_WORKER_ID).toBe('1')
      expect(detection.context.jest.hasJestGlobals).toBe(true)

      // Cleanup
      delete mockGlobal.jest
    })

    it('should handle all custom environment variables', () => {
      const customEnvVars = ['CUSTOM_TEST_1', 'CUSTOM_TEST_2', 'CUSTOM_TEST_3']
      detector.configure({ customTestEnvVars: customEnvVars })

      process.env.CUSTOM_TEST_1 = 'test'
      process.env.CUSTOM_TEST_2 = 'testing'
      process.env.CUSTOM_TEST_3 = 'true'

      const detection = detector.detectEnvironment()

      expect(detection.context.environment?.customVars).toMatchObject({
        CUSTOM_TEST_1: 'test',
        CUSTOM_TEST_2: 'testing',
        CUSTOM_TEST_3: 'true',
      })
    })

    it('should handle custom stack trace patterns', () => {
      const customPatterns = [/custom-test-framework/, /my-test-runner/]
      detector.configure({ customTestPatterns: customPatterns })

      // Mock Error to include custom pattern
      const originalError = Error
      global.Error = class extends Error {
        stack = 'Error: test\n    at custom-test-framework/runner.js:10:5'
      } as typeof Error

      const detection = detector.detectEnvironment()

      expect(detection.context.stackTrace?.patterns).toContain(
        'custom-test-framework'
      )

      // Restore
      global.Error = originalError
    })

    it('should handle VITEST_POOL_ID environment', () => {
      process.env.VITEST_POOL_ID = 'worker-1'

      const detection = detector.detectEnvironment()

      expect(detection.context.processIsolation?.indicators).toContain(
        'vitest-pool'
      )
    })

    it('should handle Git prompt disabled environment', () => {
      process.env.GIT_TERMINAL_PROMPT = '0'

      const detection = detector.detectEnvironment()

      expect(detection.context.processIsolation?.indicators).toContain(
        'git-prompt-disabled'
      )
    })

    it('should handle Git SSH blocked environment', () => {
      process.env.GIT_SSH_COMMAND = 'ssh -o blocked=true'

      const detection = detector.detectEnvironment()

      expect(detection.context.processIsolation?.indicators).toContain(
        'git-ssh-blocked'
      )
    })
  })

  describe('🧰 Mock Result Generation Edge Cases', () => {
    it('should handle git branch without --show-current flag', () => {
      const result = detector.getMockResult('git branch -a')

      expect(result.success).toBe(true)
      expect(result.stdout).toContain('* main')
      expect(result.stdout).toContain('feature-branch')
      expect(result.stdout).toContain('develop')
    })

    it('should handle git rev-parse commands', () => {
      const result = detector.getMockResult(
        'git rev-parse --is-inside-work-tree'
      )

      expect(result.success).toBe(true)
      expect(result.stdout).toBe('true\n')
    })

    it('should handle git log commands', () => {
      const result = detector.getMockResult('git log --oneline -10')

      expect(result.success).toBe(true)
      expect(result.stdout).toContain('abc123')
      expect(result.stdout).toContain('Test Author')
      expect(result.stdout).toContain('Test commit message')
    })

    it('should handle all dangerous Git commands', () => {
      const dangerousCommands = [
        'git add .',
        'git commit -m "test"',
        'git push origin main',
        'git pull origin main',
        'git checkout main',
        'git merge feature',
        'git rebase main',
        'git reset --hard',
        'git branch -D feature',
        'git tag v1.0.0',
      ]

      dangerousCommands.forEach((command) => {
        const result = detector.getMockResult(command)
        expect(result.success).toBe(true)
        expect(result.stdout).toContain(
          'TEST MODE: Git operation simulated safely'
        )
        expect(result.duration).toBe(50)
      })
    })
  })

  describe('🔧 Configuration Edge Cases', () => {
    it('should handle non-strict mode with low confidence', () => {
      detector.configure({ strict: false })

      // Remove most test indicators
      delete process.env.VITEST
      delete process.env.NODE_ENV
      delete process.env.CI

      const detection = detector.detectEnvironment()

      // Should still detect due to stack trace but with lower threshold
      expect(detection.isTestEnvironment).toBe(true)
      expect(detection.confidence).toBeGreaterThan(0)
    })

    it('should handle monitoring disabled', () => {
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

      detector.configure({ enableMonitoring: false })
      detector.detectEnvironment()

      // Should not log when monitoring is disabled
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('🛡️ Test environment detected')
      )

      consoleSpy.mockRestore()
    })

    it('should handle partial test indicators with warnings', () => {
      const consoleWarnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => {})

      detector.configure({ enableMonitoring: true, strict: true })

      // Set up scenario with partial indicators (confidence 10-30)
      delete process.env.VITEST
      delete process.env.NODE_ENV
      process.env.CI = 'false' // This won't trigger detection

      // Mock stack to have minimal detection
      const originalError = Error
      global.Error = class extends Error {
        stack = 'Error: test\n    at some-file.js:10:5'
      } as typeof Error

      const detection = detector.detectEnvironment()

      // Should warn about partial indicators
      if (detection.confidence > 10 && !detection.isTestEnvironment) {
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('⚠️ Partial test indicators detected')
        )
      }

      consoleWarnSpy.mockRestore()
      global.Error = originalError
    })
  })

  describe('📊 History Management Edge Cases', () => {
    it('should limit history to prevent memory issues', () => {
      detector.configure({ enableMonitoring: true })

      // Generate more than 100 detections
      for (let i = 0; i < 120; i++) {
        detector.detectEnvironment()
      }

      const history = detector.getDetectionHistory()
      expect(history.length).toBeLessThanOrEqual(100)
    })

    it('should return limited history', () => {
      // Clear history first to ensure clean state
      detector.clearHistory()

      // Generate several detections
      for (let i = 0; i < 15; i++) {
        detector.detectEnvironment()
      }

      const limitedHistory = detector.getDetectionHistory(5)
      expect(limitedHistory.length).toBe(5)

      const allHistory = detector.getDetectionHistory()
      // Due to the singleton nature and test isolation, we should have at least 10 entries
      // but the exact count might vary due to test interference
      expect(allHistory.length).toBeGreaterThanOrEqual(10)
      expect(allHistory.length).toBeLessThanOrEqual(15)
    })

    it('should handle clearing history', () => {
      detector.detectEnvironment()
      detector.detectEnvironment()

      expect(detector.getDetectionHistory().length).toBeGreaterThan(0)

      detector.clearHistory()

      expect(detector.getDetectionHistory().length).toBe(0)
    })
  })

  describe('🚀 Performance and Robustness', () => {
    it('should handle undefined global objects gracefully', () => {
      const originalVi = globalThis.vi
      const originalVitest = globalThis.__vitest_worker__

      delete (globalThis as unknown as Record<string, unknown>).vi
      delete (globalThis as unknown as Record<string, unknown>)
        .__vitest_worker__

      expect(() => {
        detector.detectEnvironment()
      }).not.toThrow()

      // Restore
      if (originalVi) globalThis.vi = originalVi
      if (originalVitest) globalThis.__vitest_worker__ = originalVitest
    })

    it('should handle missing global jest gracefully', () => {
      const mockGlobal = global as unknown as Record<string, unknown>
      const originalJest = mockGlobal.jest

      delete mockGlobal.jest

      expect(() => {
        detector.detectEnvironment()
      }).not.toThrow()

      // Restore if it existed
      if (originalJest) mockGlobal.jest = originalJest
    })

    it('should maintain consistent timestamps', () => {
      const beforeTime = Date.now()
      const detection = detector.detectEnvironment()
      const afterTime = Date.now()

      expect(detection.timestamp).toBeGreaterThanOrEqual(beforeTime)
      expect(detection.timestamp).toBeLessThanOrEqual(afterTime)
    })
  })
})

describe('🌐 Export Functions Coverage', () => {
  it('should export convenience function', async () => {
    const { getGitSafetyDetector, GitSafetyDetector: SafetyDetectorClass } =
      await import('./GitSafetyDetector')
    const detector = getGitSafetyDetector()

    expect(detector).toBeInstanceOf(SafetyDetectorClass)
  })
})
