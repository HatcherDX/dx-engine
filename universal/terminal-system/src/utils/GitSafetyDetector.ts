/**
 * @fileoverview Enhanced Git safety detection system to prevent real Git operations in tests.
 *
 * @description
 * This module provides comprehensive safety detection mechanisms that work alongside the existing
 * GitRunner safety system. It includes multiple detection strategies, monitoring capabilities,
 * and enhanced logging to ensure zero risk of real Git operations during test execution.
 *
 * @example
 * ```typescript
 * import { GitSafetyDetector } from './GitSafetyDetector'
 *
 * const detector = GitSafetyDetector.getInstance()
 *
 * if (detector.isTestEnvironment()) {
 *   console.log('🛡️ Test environment detected - Git operations will be mocked')
 *   return detector.getMockResult(command)
 * }
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { Logger } from './logger'

/**
 * Detection result with detailed information about the environment analysis.
 *
 * @public
 */
export interface SafetyDetectionResult {
  /** Whether we're in a test environment */
  isTestEnvironment: boolean
  /** Specific detection methods that triggered */
  triggers: string[]
  /** Confidence level (0-100) */
  confidence: number
  /** Additional context information */
  context: Record<string, unknown>
  /** Timestamp when detection was performed */
  timestamp: number
}

/**
 * Configuration options for Git safety detection.
 *
 * @public
 */
export interface GitSafetyConfig {
  /** Enable strict detection mode (default: true) */
  strict: boolean
  /** Enable detection monitoring/logging (default: true) */
  enableMonitoring: boolean
  /** Custom environment variables to check */
  customTestEnvVars: string[]
  /** Additional stack trace patterns to detect */
  customTestPatterns: RegExp[]
}

/**
 * Singleton Git safety detector with enhanced detection capabilities.
 *
 * @remarks
 * This class provides a comprehensive safety system that extends beyond the existing
 * GitRunner protection. It includes multiple detection strategies, monitoring,
 * and detailed logging to ensure complete protection against accidental Git operations.
 *
 * Key improvements over basic detection:
 * - Multiple independent detection methods with confidence scoring
 * - Stack trace analysis with pattern matching
 * - Environment variable validation
 * - Process isolation verification
 * - Monitoring and alerting capabilities
 * - Detailed logging for audit trails
 *
 * @public
 */
export class GitSafetyDetector {
  /** Singleton instance */
  private static instance: GitSafetyDetector | null = null

  /** Logger for safety events */
  private logger = new Logger('GitSafetyDetector')

  /** Configuration options */
  private config: GitSafetyConfig = {
    strict: true,
    enableMonitoring: true,
    customTestEnvVars: [],
    customTestPatterns: [],
  }

  /** Detection history for monitoring */
  private detectionHistory: SafetyDetectionResult[] = []

  /** Private constructor for singleton pattern */
  private constructor() {
    this.initializeMonitoring()
  }

  /**
   * Gets the singleton instance of GitSafetyDetector.
   *
   * @returns The singleton GitSafetyDetector instance
   * @public
   */
  static getInstance(): GitSafetyDetector {
    if (!GitSafetyDetector.instance) {
      GitSafetyDetector.instance = new GitSafetyDetector()
    }
    return GitSafetyDetector.instance
  }

  /**
   * Configures the safety detector with custom options.
   *
   * @param config - Configuration options to apply
   * @public
   */
  configure(config: Partial<GitSafetyConfig>): void {
    this.config = { ...this.config, ...config }
    this.logger.info('Git safety detector configured:', this.config)
  }

  /**
   * Performs comprehensive test environment detection with detailed analysis.
   *
   * @remarks
   * This method uses multiple independent detection strategies and provides
   * detailed information about why the environment was classified as a test.
   * It includes confidence scoring and maintains a history for monitoring.
   *
   * @returns Detailed detection result with triggers and confidence
   * @public
   */
  detectEnvironment(): SafetyDetectionResult {
    const triggers: string[] = []
    const context: Record<string, unknown> = {}
    let confidence = 0

    const env = process.env || {}

    // 1. Vitest-specific detection (highest confidence)
    if (this.detectVitest()) {
      triggers.push('vitest')
      confidence += 40
      context.vitest = {
        VITEST: env.VITEST,
        hasVitestGlobals:
          typeof (globalThis as { vi?: unknown }).vi !== 'undefined',
        hasVitestWorker:
          typeof (globalThis as { __vitest_worker__?: unknown })
            .__vitest_worker__ !== 'undefined',
      }
    }

    // 2. Jest detection
    if (this.detectJest()) {
      triggers.push('jest')
      confidence += 35
      context.jest = {
        JEST_WORKER_ID: env.JEST_WORKER_ID,
        hasJestGlobals:
          typeof (global as Record<string, unknown>).jest !== 'undefined',
      }
    }

    // 3. Environment variable detection
    if (this.detectTestEnvironmentVars()) {
      triggers.push('env-vars')
      confidence += 20
      context.environment = {
        NODE_ENV: env.NODE_ENV,
        CI: env.CI,
        customVars: this.config.customTestEnvVars.reduce(
          (acc, varName) => {
            acc[varName] = env[varName]
            return acc
          },
          {} as Record<string, string | undefined>
        ),
      }
    }

    // 4. Stack trace analysis
    const stackAnalysis = this.analyzeStackTrace()
    if (stackAnalysis.isTest) {
      triggers.push('stack-trace')
      confidence += 15
      context.stackTrace = stackAnalysis
    }

    // 5. Process isolation detection
    const isolationAnalysis = this.detectProcessIsolation()
    if (isolationAnalysis.isIsolated) {
      triggers.push('process-isolation')
      confidence += 10
      context.processIsolation = isolationAnalysis
    }

    // 6. Mock function detection
    if (this.detectMockFunctions()) {
      triggers.push('mock-functions')
      confidence += 5
      context.mockDetection = true
    }

    const result: SafetyDetectionResult = {
      isTestEnvironment: confidence >= (this.config.strict ? 15 : 30),
      triggers,
      confidence: Math.min(confidence, 100),
      context,
      timestamp: Date.now(),
    }

    // Store in history and log
    this.recordDetection(result)

    return result
  }

  /**
   * Simple boolean check for test environment (backward compatibility).
   *
   * @returns true if we're in a test environment
   * @public
   */
  isTestEnvironment(): boolean {
    return this.detectEnvironment().isTestEnvironment
  }

  /**
   * Gets safe mock results for Git commands during testing.
   *
   * @param command - The Git command that would have been executed
   * @returns Safe mock CommandResult
   * @public
   */
  getMockResult(command: string): {
    success: boolean
    exitCode: number
    stdout: string
    stderr: string
    duration: number
    command: string
  } {
    const baseResult = {
      success: true,
      exitCode: 0,
      stderr: '',
      duration: 50,
      command,
    }

    // Enhanced mock responses based on command patterns
    if (command.includes('git status --porcelain')) {
      return {
        ...baseResult,
        stdout: ' M src/test-file.ts\n?? src/new-file.ts\n',
      }
    }

    if (command.includes('git branch --show-current')) {
      return { ...baseResult, stdout: 'main\n' }
    }

    // For dangerous operations, check first for safety
    if (this.isDangerousGitCommand(command)) {
      this.logger.warn(
        `🛡️ SAFETY: Prevented dangerous Git operation in test: ${command}`
      )
      return {
        ...baseResult,
        stdout: 'TEST MODE: Git operation simulated safely\n',
      }
    }

    if (command.includes('git branch') && !command.includes('--show-current')) {
      return {
        ...baseResult,
        stdout: '* main\n  feature-branch\n  develop\n',
      }
    }

    if (command.includes('git rev-parse --is-inside-work-tree')) {
      return { ...baseResult, stdout: 'true\n' }
    }

    if (command.includes('git log')) {
      return {
        ...baseResult,
        stdout:
          'abc123|Test Author|2024-01-01 12:00:00|Test commit message\n' +
          'def456|Test Author|2024-01-01 11:00:00|Previous commit\n',
      }
    }

    return {
      ...baseResult,
      stdout: 'Test mode: Safe mock response\n',
    }
  }

  /**
   * Gets the detection history for monitoring purposes.
   *
   * @param limit - Maximum number of recent detections to return
   * @returns Array of recent detection results
   * @public
   */
  getDetectionHistory(limit = 10): SafetyDetectionResult[] {
    return this.detectionHistory.slice(-limit)
  }

  /**
   * Clears the detection history.
   *
   * @public
   */
  clearHistory(): void {
    this.detectionHistory = []
    this.logger.info('Detection history cleared')
  }

  // Private detection methods

  private detectVitest(): boolean {
    const env = process.env || {}
    interface VitestGlobals {
      vi?: unknown
      __vitest_worker__?: unknown
    }
    return (
      env.VITEST === 'true' ||
      (typeof (globalThis as VitestGlobals).vi !== 'undefined' &&
        typeof (globalThis as VitestGlobals).__vitest_worker__ !== 'undefined')
    )
  }

  private detectJest(): boolean {
    const env = process.env || {}
    return (
      env.JEST_WORKER_ID !== undefined &&
      typeof (global as Record<string, unknown>).jest !== 'undefined'
    )
  }

  private detectTestEnvironmentVars(): boolean {
    const env = process.env || {}
    const testVars = [
      'NODE_ENV',
      'CI',
      'TESTING',
      'TEST_ENV',
      ...this.config.customTestEnvVars,
    ]

    return testVars.some((varName) => {
      const value = env[varName]
      return value === 'test' || value === 'testing' || value === 'true'
    })
  }

  private analyzeStackTrace(): {
    isTest: boolean
    testFramework?: string
    testFile?: string
    patterns: string[]
  } {
    const stack = new Error().stack || ''
    const patterns: string[] = []
    let testFramework: string | undefined
    let testFile: string | undefined

    // Built-in patterns
    const builtInPatterns = [
      /\.spec\./,
      /\.test\./,
      /vitest/,
      /jest/,
      /mocha/,
      /jasmine/,
    ]

    // Check built-in patterns
    for (const pattern of [
      ...builtInPatterns,
      ...this.config.customTestPatterns,
    ]) {
      if (pattern.test(stack)) {
        patterns.push(pattern.source)
      }
    }

    // Detect framework
    if (stack.includes('vitest')) testFramework = 'vitest'
    else if (stack.includes('jest')) testFramework = 'jest'
    else if (stack.includes('mocha')) testFramework = 'mocha'

    // Extract test file
    const fileMatch = stack.match(/([^/\\]+\.(spec|test)\.[jt]s)/i)
    if (fileMatch) testFile = fileMatch[1]

    return {
      isTest: patterns.length > 0,
      testFramework,
      testFile,
      patterns,
    }
  }

  private detectProcessIsolation(): {
    isIsolated: boolean
    indicators: string[]
  } {
    const indicators: string[] = []
    const env = process.env || {}

    // Check for Vitest fork pool indicators
    if (env.VITEST_POOL_ID) {
      indicators.push('vitest-pool')
    }

    // Check for isolated process indicators
    if (env.GIT_TERMINAL_PROMPT === '0') {
      indicators.push('git-prompt-disabled')
    }

    if (env.GIT_SSH_COMMAND?.includes('blocked')) {
      indicators.push('git-ssh-blocked')
    }

    return {
      isIsolated: indicators.length > 0,
      indicators,
    }
  }

  private detectMockFunctions(): boolean {
    // Check if common Git-related methods are mocked by examining global state
    try {
      // Check for Vitest mocking indicators in global scope
      if (typeof (globalThis as { vi?: unknown }).vi !== 'undefined') {
        // We're in a Vitest environment, mocks are likely active
        return true
      }

      // Check for Jest mocking indicators
      if (typeof (global as Record<string, unknown>).jest !== 'undefined') {
        return true
      }

      return false
    } catch {
      return false
    }
  }

  private isDangerousGitCommand(command: string): boolean {
    const dangerousPatterns = [
      /git\s+add/,
      /git\s+commit/,
      /git\s+push/,
      /git\s+pull/,
      /git\s+checkout/,
      /git\s+merge/,
      /git\s+rebase/,
      /git\s+reset/,
      /git\s+branch.*-[dD]/,
      /git\s+tag/,
    ]

    return dangerousPatterns.some((pattern) => pattern.test(command))
  }

  private recordDetection(result: SafetyDetectionResult): void {
    // Add to history
    this.detectionHistory.push(result)

    // Keep history manageable
    if (this.detectionHistory.length > 100) {
      this.detectionHistory = this.detectionHistory.slice(-50)
    }

    // Log important detections
    if (this.config.enableMonitoring) {
      if (result.isTestEnvironment) {
        this.logger.info(
          `🛡️ Test environment detected (confidence: ${result.confidence}%):`,
          result.triggers
        )
      } else if (result.confidence > 10) {
        this.logger.warn(
          `⚠️ Partial test indicators detected (confidence: ${result.confidence}%):`,
          result.triggers
        )
      }
    }
  }

  private initializeMonitoring(): void {
    if (this.config.enableMonitoring) {
      // Log initialization
      this.logger.info('🛡️ Git Safety Detector initialized')

      // Immediate environment check
      const detection = this.detectEnvironment()
      if (detection.isTestEnvironment) {
        this.logger.info(
          '✅ Test environment confirmed - Git operations will be safely mocked'
        )
      }
    }
  }
}

/**
 * Convenience function to get the singleton detector instance.
 *
 * @returns GitSafetyDetector singleton instance
 * @public
 */
export const getGitSafetyDetector = (): GitSafetyDetector =>
  GitSafetyDetector.getInstance()
