/**
 * @fileoverview System Event Bus for coordinating system-wide events.
 *
 * @description
 * Centralized event coordination system for DX Engine that handles:
 * - Project lifecycle events
 * - Git operations coordination
 * - Terminal system communication
 * - Cross-component event routing
 *
 * @example
 * ```typescript
 * import { systemEventBus } from './SystemEventBus'
 *
 * // Listen for project events
 * systemEventBus.on('projectOpened', (project) => {
 *   console.log(`Project opened: ${project.name}`)
 * })
 *
 * // Emit project event
 * systemEventBus.emitProjectEvent('projectOpened', projectData)
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { EventEmitter } from '../core/EventEmitter'
import type { SystemLogger } from './SystemLogger'
import { systemLogger } from './SystemLogger'

/**
 * Project event types for system coordination.
 *
 * @public
 */
export type ProjectEventType =
  | 'projectOpening'
  | 'projectOpened'
  | 'projectClosed'
  | 'projectConfigChanged'
  | 'projectScanStarted'
  | 'projectScanCompleted'

/**
 * Git event types for timeline coordination.
 *
 * @public
 */
export type GitEventType =
  | 'gitOperationStarted'
  | 'gitOperationCompleted'
  | 'gitOperationFailed'
  | 'gitRepositoryChanged'
  | 'gitBranchChanged'
  | 'gitStatusChanged'

/**
 * System event types for internal coordination.
 *
 * @public
 */
export type SystemEventType =
  | 'terminalSystemReady'
  | 'systemTerminalsInitialized'
  | 'loggingSystemReady'
  | 'componentInitialized'
  | 'systemError'
  | 'systemWarning'

/**
 * Project event data interface.
 *
 * @public
 */
export interface ProjectEventData {
  /** Project root path */
  rootPath: string
  /** Project name */
  name: string
  /** Project type (detected from package.json, etc.) */
  type?: string[]
  /** Package.json data if available */
  packageJson?: Record<string, unknown>
  /** Additional project metadata */
  metadata?: Record<string, unknown>
}

/**
 * Git event data interface.
 *
 * @public
 */
export interface GitEventData {
  /** Git operation name */
  operation: string
  /** Repository path */
  repositoryPath: string
  /** Operation result data */
  result?: unknown
  /** Error information if operation failed */
  error?: Error
  /** Operation execution time in milliseconds */
  executionTime?: number
  /** Additional operation context */
  context?: Record<string, unknown>
}

/**
 * System event data interface.
 *
 * @public
 */
export interface SystemEventData {
  /** Component or system name */
  component: string
  /** Event message */
  message: string
  /** Additional event data */
  data?: Record<string, unknown>
  /** Error information for error events */
  error?: Error
}

/**
 * SystemEventBus - Centralized event coordination for DX Engine.
 *
 * @remarks
 * The SystemEventBus serves as the central nervous system for DX Engine,
 * coordinating events between:
 * - Project management system
 * - Git operations (git-genius integration)
 * - Terminal system (both interactive and read-only)
 * - Vue.js frontend components
 * - Logging and monitoring systems
 *
 * Features:
 * - Type-safe event emission and handling
 * - Automatic logging integration
 * - Event filtering and routing
 * - Performance monitoring
 * - Error handling and recovery
 *
 * @example
 * ```typescript
 * // Initialize event bus
 * const eventBus = new SystemEventBus()
 *
 * // Setup project event handling
 * eventBus.on('projectOpened', (projectData) => {
 *   console.log(`Project ${projectData.name} opened`)
 *   // Initialize project-specific services
 * })
 *
 * // Setup git event handling
 * eventBus.on('gitOperationCompleted', (gitData) => {
 *   console.log(`Git ${gitData.operation} completed`)
 *   // Update UI, refresh status, etc.
 * })
 * ```
 *
 * @public
 */
export class SystemEventBus extends EventEmitter<{
  // Project events
  projectOpening: [ProjectEventData]
  projectOpened: [ProjectEventData]
  projectClosed: [ProjectEventData]
  projectConfigChanged: [ProjectEventData]
  projectScanStarted: [ProjectEventData]
  projectScanCompleted: [ProjectEventData]

  // Git events
  gitOperationStarted: [GitEventData]
  gitOperationCompleted: [GitEventData]
  gitOperationFailed: [GitEventData]
  gitRepositoryChanged: [GitEventData]
  gitBranchChanged: [GitEventData]
  gitStatusChanged: [GitEventData]

  // System events
  terminalSystemReady: [SystemEventData]
  systemTerminalsInitialized: [SystemEventData]
  loggingSystemReady: [SystemEventData]
  componentInitialized: [SystemEventData]
  systemError: [SystemEventData]
  systemWarning: [SystemEventData]
}> {
  private logger: SystemLogger
  private eventCounter = 0
  private performanceMetrics = new Map<string, number[]>()

  /**
   * Create SystemEventBus instance.
   *
   * @param logger - SystemLogger instance (optional, uses default)
   *
   * @public
   */
  constructor(logger?: SystemLogger) {
    super()
    this.logger = logger || systemLogger
    this.setupInternalEventHandlers()
  }

  /**
   * Emit a project lifecycle event.
   *
   * @param eventType - Type of project event
   * @param projectData - Project data
   * @returns Promise resolving when event is processed
   *
   * @example
   * ```typescript
   * await eventBus.emitProjectEvent('projectOpened', {
   *   rootPath: '/path/to/project',
   *   name: 'my-project',
   *   type: ['node'],
   *   packageJson: { name: '@org/project' }
   * })
   * ```
   *
   * @public
   */
  public async emitProjectEvent(
    eventType: ProjectEventType,
    projectData: ProjectEventData
  ): Promise<void> {
    const startTime = Date.now()
    this.eventCounter++

    // Log project event to System terminal
    this.logger.info(this.formatProjectEventMessage(eventType, projectData), {
      eventType,
      projectPath: projectData.rootPath,
      projectName: projectData.name,
    })

    // Emit the event
    this.emit(eventType, projectData)

    // Track performance
    this.trackEventPerformance(eventType, Date.now() - startTime)
  }

  /**
   * Emit a git operation event.
   *
   * @param eventType - Type of git event
   * @param gitData - Git operation data
   * @returns Promise resolving when event is processed
   *
   * @example
   * ```typescript
   * await eventBus.emitGitEvent('gitOperationCompleted', {
   *   operation: 'status',
   *   repositoryPath: '/path/to/repo',
   *   result: statusData,
   *   executionTime: 150
   * })
   * ```
   *
   * @public
   */
  public async emitGitEvent(
    eventType: GitEventType,
    gitData: GitEventData
  ): Promise<void> {
    const startTime = Date.now()
    this.eventCounter++

    // Log git event to Timeline terminal (handled by GitCommandLogger)
    if (eventType === 'gitOperationCompleted') {
      this.logger.logResult(
        'GIT',
        this.formatGitEventMessage(eventType, gitData),
        'timeline',
        {
          operation: gitData.operation,
          executionTime: gitData.executionTime,
          context: gitData.context,
        }
      )
    } else if (eventType === 'gitOperationFailed') {
      this.logger.logResult(
        'ERROR',
        this.formatGitEventMessage(eventType, gitData),
        'timeline',
        {
          operation: gitData.operation,
          error: gitData.error,
          context: gitData.context,
        }
      )
    }

    // Emit the event
    this.emit(eventType, gitData)

    // Track performance
    this.trackEventPerformance(eventType, Date.now() - startTime)
  }

  /**
   * Emit a system-level event.
   *
   * @param eventType - Type of system event
   * @param systemData - System event data
   * @returns Promise resolving when event is processed
   *
   * @example
   * ```typescript
   * await eventBus.emitSystemEvent('terminalSystemReady', {
   *   component: 'ReadOnlyTerminalManager',
   *   message: 'System terminals initialized'
   * })
   * ```
   *
   * @public
   */
  public async emitSystemEvent(
    eventType: SystemEventType,
    systemData: SystemEventData
  ): Promise<void> {
    const startTime = Date.now()
    this.eventCounter++

    // Log system event
    if (eventType === 'systemError') {
      this.logger.error(systemData.message, 'system', {
        component: systemData.component,
        error: systemData.error,
        data: systemData.data,
      })
    } else if (eventType === 'systemWarning') {
      this.logger.warn(systemData.message, 'system', {
        component: systemData.component,
        data: systemData.data,
      })
    } else {
      this.logger.info(`[${systemData.component}] ${systemData.message}`, {
        eventType,
        component: systemData.component,
        data: systemData.data,
      })
    }

    // Emit the event
    this.emit(eventType, systemData)

    // Track performance
    this.trackEventPerformance(eventType, Date.now() - startTime)
  }

  /**
   * Get event performance metrics.
   *
   * @param eventType - Event type to get metrics for (optional)
   * @returns Performance metrics data
   *
   * @public
   */
  public getEventMetrics(eventType?: string): Record<
    string,
    {
      count: number
      averageTime: number
      totalTime: number
      minTime: number
      maxTime: number
    }
  > {
    const metrics: Record<
      string,
      {
        count: number
        averageTime: number
        totalTime: number
        minTime: number
        maxTime: number
      }
    > = {}

    for (const [type, times] of this.performanceMetrics.entries()) {
      if (!eventType || type === eventType) {
        metrics[type] = {
          count: times.length,
          averageTime: times.reduce((a, b) => a + b, 0) / times.length,
          totalTime: times.reduce((a, b) => a + b, 0),
          minTime: Math.min(...times),
          maxTime: Math.max(...times),
        }
      }
    }

    return metrics
  }

  /**
   * Clear performance metrics.
   *
   * @param eventType - Specific event type to clear (optional, clears all if not provided)
   *
   * @public
   */
  public clearEventMetrics(eventType?: string): void {
    if (eventType) {
      this.performanceMetrics.delete(eventType)
    } else {
      this.performanceMetrics.clear()
    }
  }

  /**
   * Get total event count.
   *
   * @returns Total number of events processed
   *
   * @public
   */
  public getEventCount(): number {
    return this.eventCounter
  }

  /**
   * Setup internal event handlers for system coordination.
   *
   * @private
   */
  private setupInternalEventHandlers(): void {
    // Project lifecycle coordination
    this.on('projectOpened', (projectData) => {
      this.emitSystemEvent('componentInitialized', {
        component: 'ProjectSystem',
        message: `Project ${projectData.name} opened successfully`,
        data: { projectPath: projectData.rootPath },
      })
    })

    // Terminal system coordination
    this.on('terminalSystemReady', () => {
      this.logger.info('Terminal system initialization completed')
    })
  }

  /**
   * Format project event message for logging.
   *
   * @param eventType - Project event type
   * @param projectData - Project data
   * @returns Formatted message string
   *
   * @private
   */
  private formatProjectEventMessage(
    eventType: ProjectEventType,
    projectData: ProjectEventData
  ): string {
    switch (eventType) {
      case 'projectOpening':
        return `Opening project: ${projectData.name}`
      case 'projectOpened': {
        const types = projectData.type?.join(', ') || 'Unknown'
        return `Project opened: ${projectData.name} [${types}]`
      }
      case 'projectClosed':
        return `Project closed: ${projectData.name}`
      case 'projectConfigChanged':
        return `Project configuration updated: ${projectData.name}`
      case 'projectScanStarted':
        return `Scanning project files: ${projectData.name}`
      case 'projectScanCompleted':
        return `Project scan completed: ${projectData.name}`
      default:
        return `Project ${eventType}: ${projectData.name}`
    }
  }

  /**
   * Format git event message for logging.
   *
   * @param eventType - Git event type
   * @param gitData - Git data
   * @returns Formatted message string
   *
   * @private
   */
  private formatGitEventMessage(
    eventType: GitEventType,
    gitData: GitEventData
  ): string {
    const timeStr = gitData.executionTime ? ` (${gitData.executionTime}ms)` : ''

    switch (eventType) {
      case 'gitOperationStarted':
        return `Git ${gitData.operation} started`
      case 'gitOperationCompleted':
        return `Git ${gitData.operation} completed${timeStr}`
      case 'gitOperationFailed': {
        const errorMsg = gitData.error?.message || 'Unknown error'
        return `Git ${gitData.operation} failed: ${errorMsg}${timeStr}`
      }
      case 'gitRepositoryChanged':
        return 'Repository state changed'
      case 'gitBranchChanged':
        return 'Branch changed'
      case 'gitStatusChanged':
        return 'Working directory status changed'
      default:
        return `Git ${eventType}: ${gitData.operation}${timeStr}`
    }
  }

  /**
   * Track event performance metrics.
   *
   * @param eventType - Event type
   * @param executionTime - Event processing time in milliseconds
   *
   * @private
   */
  private trackEventPerformance(
    eventType: string,
    executionTime: number
  ): void {
    if (!this.performanceMetrics.has(eventType)) {
      this.performanceMetrics.set(eventType, [])
    }

    const times = this.performanceMetrics.get(eventType)!
    times.push(executionTime)

    // Keep only last 100 measurements to prevent memory growth
    if (times.length > 100) {
      times.shift()
    }
  }
}

/**
 * Default system event bus instance for convenience.
 *
 * @example
 * ```typescript
 * import { systemEventBus } from './SystemEventBus'
 *
 * systemEventBus.on('projectOpened', (project) => {
 *   console.log(`Project opened: ${project.name}`)
 * })
 * ```
 *
 * @public
 */
export const systemEventBus = new SystemEventBus()
