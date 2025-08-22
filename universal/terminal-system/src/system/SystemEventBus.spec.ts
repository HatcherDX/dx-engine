/**
 * @fileoverview Comprehensive tests for SystemEventBus.
 *
 * @description
 * Tests for centralized event coordination system including:
 * - Project lifecycle event management
 * - Git operation event coordination
 * - System event routing and handling
 * - Event listener management
 * - Cross-module communication
 * - Performance metrics tracking
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  SystemEventBus,
  systemEventBus,
  type ProjectEventType,
  type GitEventType,
  type SystemEventType,
  type ProjectEventData,
  type GitEventData,
  type SystemEventData,
} from './SystemEventBus'

/**
 * Mock interface for SystemLogger in event bus tests.
 */
interface MockEventBusLogger {
  info: ReturnType<typeof vi.fn>
  warn: ReturnType<typeof vi.fn>
  error: ReturnType<typeof vi.fn>
  logCommand: ReturnType<typeof vi.fn>
  logResult: ReturnType<typeof vi.fn>
}

describe('SystemEventBus', () => {
  let eventBus: SystemEventBus
  let mockLogger: MockEventBusLogger

  beforeEach(() => {
    // Mock the logger dependency
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      logCommand: vi.fn(),
      logResult: vi.fn(),
      on: vi.fn(),
      emit: vi.fn(),
    }

    eventBus = new SystemEventBus(mockLogger)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Constructor', () => {
    it('should create SystemEventBus instance', () => {
      expect(eventBus).toBeInstanceOf(SystemEventBus)
    })

    it('should initialize with provided logger', () => {
      const customLogger = { info: vi.fn() } as unknown as Record<
        string,
        ReturnType<typeof vi.fn>
      >
      const customEventBus = new SystemEventBus(customLogger)

      expect(customEventBus).toBeInstanceOf(SystemEventBus)
    })

    it('should initialize with performance tracking', () => {
      expect(eventBus.getEventCount()).toBe(0)
      expect(eventBus.getEventMetrics()).toEqual({})
    })
  })

  describe('Project Event Management', () => {
    describe('emitProjectEvent()', () => {
      it('should emit project opening event', async () => {
        const projectData: ProjectEventData = {
          rootPath: '/test/project',
          name: 'Test Project',
          type: ['node'],
        }

        await eventBus.emitProjectEvent('projectOpening', projectData)

        expect(mockLogger.info).toHaveBeenCalledWith(
          'Opening project: Test Project',
          expect.objectContaining({
            eventType: 'projectOpening',
            projectPath: '/test/project',
            projectName: 'Test Project',
          })
        )
        expect(eventBus.getEventCount()).toBe(1)
      })

      it('should emit project opened event', async () => {
        const projectData: ProjectEventData = {
          rootPath: '/existing/project',
          name: 'Existing Project',
          type: ['vue'],
        }

        await eventBus.emitProjectEvent('projectOpened', projectData)

        expect(mockLogger.info).toHaveBeenCalledWith(
          'Project opened: Existing Project [vue]',
          expect.objectContaining({
            eventType: 'projectOpened',
            projectPath: '/existing/project',
            projectName: 'Existing Project',
          })
        )
        expect(eventBus.getEventCount()).toBe(2) // projectOpened + internal componentInitialized
      })

      it('should emit project closed event', async () => {
        const projectData: ProjectEventData = {
          rootPath: '/closed/project',
          name: 'Closed Project',
        }

        await eventBus.emitProjectEvent('projectClosed', projectData)

        expect(mockLogger.info).toHaveBeenCalledWith(
          'Project closed: Closed Project',
          expect.objectContaining({
            eventType: 'projectClosed',
            projectPath: '/closed/project',
            projectName: 'Closed Project',
          })
        )
      })

      it('should emit project config changed event', async () => {
        const projectData: ProjectEventData = {
          rootPath: '/config/project',
          name: 'Config Project',
          metadata: { configFiles: ['package.json', 'vite.config.ts'] },
        }

        await eventBus.emitProjectEvent('projectConfigChanged', projectData)

        expect(mockLogger.info).toHaveBeenCalledWith(
          'Project configuration updated: Config Project',
          expect.objectContaining({
            eventType: 'projectConfigChanged',
            projectPath: '/config/project',
            projectName: 'Config Project',
          })
        )
      })

      it('should emit project scan started event', async () => {
        const projectData: ProjectEventData = {
          rootPath: '/scan/project',
          name: 'Scan Project',
        }

        await eventBus.emitProjectEvent('projectScanStarted', projectData)

        expect(mockLogger.info).toHaveBeenCalledWith(
          'Scanning project files: Scan Project',
          expect.objectContaining({
            eventType: 'projectScanStarted',
          })
        )
      })

      it('should emit project scan completed event', async () => {
        const projectData: ProjectEventData = {
          rootPath: '/scan/project',
          name: 'Scan Project',
          metadata: { filesScanned: 150 },
        }

        await eventBus.emitProjectEvent('projectScanCompleted', projectData)

        expect(mockLogger.info).toHaveBeenCalledWith(
          'Project scan completed: Scan Project',
          expect.objectContaining({
            eventType: 'projectScanCompleted',
          })
        )
      })

      it('should handle project with no type specified', async () => {
        const projectData: ProjectEventData = {
          rootPath: '/unknown/project',
          name: 'Unknown Project',
        }

        await eventBus.emitProjectEvent('projectOpened', projectData)

        expect(mockLogger.info).toHaveBeenCalledWith(
          'Project opened: Unknown Project [Unknown]',
          expect.any(Object)
        )
      })

      it('should handle project with package.json data', async () => {
        const projectData: ProjectEventData = {
          rootPath: '/package/project',
          name: 'Package Project',
          packageJson: {
            name: '@org/package-project',
            version: '1.0.0',
            dependencies: { vue: '^3.0.0' },
          },
        }

        await eventBus.emitProjectEvent('projectOpened', projectData)

        expect(mockLogger.info).toHaveBeenCalled()
        expect(eventBus.getEventCount()).toBe(2) // projectOpened + internal componentInitialized
      })

      it('should increment event counter', async () => {
        const projectData: ProjectEventData = {
          rootPath: '/test1',
          name: 'Test 1',
        }

        expect(eventBus.getEventCount()).toBe(0)

        await eventBus.emitProjectEvent('projectOpening', projectData)
        expect(eventBus.getEventCount()).toBe(1)

        await eventBus.emitProjectEvent('projectOpened', projectData)
        expect(eventBus.getEventCount()).toBe(3) // projectOpening + projectOpened + componentInitialized
      })

      it('should track event performance metrics', async () => {
        const projectData: ProjectEventData = {
          rootPath: '/perf/project',
          name: 'Performance Project',
        }

        await eventBus.emitProjectEvent('projectOpened', projectData)

        const metrics = eventBus.getEventMetrics('projectOpened')
        expect(metrics).toHaveProperty('projectOpened')
        expect(metrics.projectOpened.count).toBe(1)
        expect(typeof metrics.projectOpened.averageTime).toBe('number')
      })

      it('should emit events to listeners', async () => {
        const listener = vi.fn()
        eventBus.on('projectOpened', listener)

        const projectData: ProjectEventData = {
          rootPath: '/listener/project',
          name: 'Listener Project',
        }

        await eventBus.emitProjectEvent('projectOpened', projectData)

        expect(listener).toHaveBeenCalledWith(projectData)
      })
    })
  })

  describe('Git Event Management', () => {
    describe('emitGitEvent()', () => {
      it('should emit git operation started event', async () => {
        const gitData: GitEventData = {
          operation: 'status',
          repositoryPath: '/repo/path',
        }

        await eventBus.emitGitEvent('gitOperationStarted', gitData)

        expect(eventBus.getEventCount()).toBe(1)

        const metrics = eventBus.getEventMetrics('gitOperationStarted')
        expect(metrics.gitOperationStarted.count).toBe(1)
      })

      it('should emit git operation completed event with logging', async () => {
        const gitData: GitEventData = {
          operation: 'status',
          repositoryPath: '/repo/path',
          result: { staged: [], modified: ['file.ts'] },
          executionTime: 150,
          context: { branch: 'main' },
        }

        await eventBus.emitGitEvent('gitOperationCompleted', gitData)

        expect(mockLogger.logResult).toHaveBeenCalledWith(
          'GIT',
          'Git status completed (150ms)',
          'timeline',
          expect.objectContaining({
            operation: 'status',
            executionTime: 150,
            context: { branch: 'main' },
          })
        )
        expect(eventBus.getEventCount()).toBe(1)
      })

      it('should emit git operation failed event with error logging', async () => {
        const error = new Error('Permission denied')
        const gitData: GitEventData = {
          operation: 'push',
          repositoryPath: '/repo/path',
          error,
          executionTime: 3000,
          context: { remote: 'origin', branch: 'main' },
        }

        await eventBus.emitGitEvent('gitOperationFailed', gitData)

        expect(mockLogger.logResult).toHaveBeenCalledWith(
          'ERROR',
          'Git push failed: Permission denied (3000ms)',
          'timeline',
          expect.objectContaining({
            operation: 'push',
            error,
            context: { remote: 'origin', branch: 'main' },
          })
        )
      })

      it('should emit git repository changed event', async () => {
        const gitData: GitEventData = {
          operation: 'pull',
          repositoryPath: '/repo/path',
          result: { files: ['file1.ts', 'file2.ts'] },
        }

        await eventBus.emitGitEvent('gitRepositoryChanged', gitData)

        expect(eventBus.getEventCount()).toBe(1)
      })

      it('should emit git branch changed event', async () => {
        const gitData: GitEventData = {
          operation: 'checkout',
          repositoryPath: '/repo/path',
          context: { fromBranch: 'main', toBranch: 'feature/new' },
        }

        await eventBus.emitGitEvent('gitBranchChanged', gitData)

        expect(eventBus.getEventCount()).toBe(1)
      })

      it('should emit git status changed event', async () => {
        const gitData: GitEventData = {
          operation: 'add',
          repositoryPath: '/repo/path',
          result: { staged: ['file.ts'] },
        }

        await eventBus.emitGitEvent('gitStatusChanged', gitData)

        expect(eventBus.getEventCount()).toBe(1)
      })

      it('should handle git events without execution time', async () => {
        const gitData: GitEventData = {
          operation: 'status',
          repositoryPath: '/repo/path',
        }

        await eventBus.emitGitEvent('gitOperationCompleted', gitData)

        expect(mockLogger.logResult).toHaveBeenCalledWith(
          'GIT',
          'Git status completed',
          'timeline',
          expect.objectContaining({
            operation: 'status',
            executionTime: undefined,
          })
        )
      })

      it('should emit git events to listeners', async () => {
        const listener = vi.fn()
        eventBus.on('gitOperationCompleted', listener)

        const gitData: GitEventData = {
          operation: 'commit',
          repositoryPath: '/repo/path',
        }

        await eventBus.emitGitEvent('gitOperationCompleted', gitData)

        expect(listener).toHaveBeenCalledWith(gitData)
      })
    })
  })

  describe('System Event Management', () => {
    describe('emitSystemEvent()', () => {
      it('should emit terminal system ready event', async () => {
        const systemData: SystemEventData = {
          component: 'TerminalSystem',
          message: 'Terminal system initialization completed',
          data: { terminalsCount: 3 },
        }

        await eventBus.emitSystemEvent('terminalSystemReady', systemData)

        expect(mockLogger.info).toHaveBeenCalledWith(
          '[TerminalSystem] Terminal system initialization completed',
          expect.objectContaining({
            eventType: 'terminalSystemReady',
            component: 'TerminalSystem',
            data: { terminalsCount: 3 },
          })
        )
        expect(eventBus.getEventCount()).toBe(1)
      })

      it('should emit system terminals initialized event', async () => {
        const systemData: SystemEventData = {
          component: 'ReadOnlyTerminalManager',
          message: 'System terminals initialized',
          data: { count: 5 },
        }

        await eventBus.emitSystemEvent('systemTerminalsInitialized', systemData)

        expect(mockLogger.info).toHaveBeenCalledWith(
          '[ReadOnlyTerminalManager] System terminals initialized',
          expect.any(Object)
        )
      })

      it('should emit logging system ready event', async () => {
        const systemData: SystemEventData = {
          component: 'SystemLogger',
          message: 'Logging system ready',
        }

        await eventBus.emitSystemEvent('loggingSystemReady', systemData)

        expect(mockLogger.info).toHaveBeenCalledWith(
          '[SystemLogger] Logging system ready',
          expect.any(Object)
        )
      })

      it('should emit component initialized event', async () => {
        const systemData: SystemEventData = {
          component: 'GitRunner',
          message: 'Git runner initialized',
          data: { gitVersion: '2.40.0' },
        }

        await eventBus.emitSystemEvent('componentInitialized', systemData)

        expect(mockLogger.info).toHaveBeenCalledWith(
          '[GitRunner] Git runner initialized',
          expect.objectContaining({
            component: 'GitRunner',
            data: { gitVersion: '2.40.0' },
          })
        )
      })

      it('should emit system error event with error logging', async () => {
        const error = new Error('Critical system failure')
        const systemData: SystemEventData = {
          component: 'CoreSystem',
          message: 'Critical failure detected',
          error,
          data: { severity: 'critical' },
        }

        await eventBus.emitSystemEvent('systemError', systemData)

        expect(mockLogger.error).toHaveBeenCalledWith(
          'Critical failure detected',
          'system',
          expect.objectContaining({
            component: 'CoreSystem',
            error,
            data: { severity: 'critical' },
          })
        )
      })

      it('should emit system warning event with warn logging', async () => {
        const systemData: SystemEventData = {
          component: 'MemoryManager',
          message: 'High memory usage detected',
          data: { usage: '85%' },
        }

        await eventBus.emitSystemEvent('systemWarning', systemData)

        expect(mockLogger.warn).toHaveBeenCalledWith(
          'High memory usage detected',
          'system',
          expect.objectContaining({
            component: 'MemoryManager',
            data: { usage: '85%' },
          })
        )
      })

      it('should emit system events to listeners', async () => {
        const listener = vi.fn()
        eventBus.on('systemError', listener)

        const systemData: SystemEventData = {
          component: 'TestComponent',
          message: 'Test error',
          error: new Error('Test'),
        }

        await eventBus.emitSystemEvent('systemError', systemData)

        expect(listener).toHaveBeenCalledWith(systemData)
      })
    })
  })

  describe('Performance Metrics', () => {
    describe('getEventMetrics()', () => {
      beforeEach(async () => {
        // Create sample events for metrics testing
        const projectData: ProjectEventData = {
          rootPath: '/test',
          name: 'Test Project',
        }

        await eventBus.emitProjectEvent('projectOpened', projectData)
        await eventBus.emitProjectEvent('projectOpened', projectData)

        const gitData: GitEventData = {
          operation: 'status',
          repositoryPath: '/repo',
        }

        await eventBus.emitGitEvent('gitOperationCompleted', gitData)
      })

      it('should return all event metrics when no filter specified', () => {
        const metrics = eventBus.getEventMetrics()

        expect(metrics).toHaveProperty('projectOpened')
        expect(metrics).toHaveProperty('gitOperationCompleted')

        expect(metrics.projectOpened.count).toBe(2)
        expect(metrics.gitOperationCompleted.count).toBe(1)

        expect(typeof metrics.projectOpened.averageTime).toBe('number')
        expect(typeof metrics.projectOpened.totalTime).toBe('number')
        expect(typeof metrics.projectOpened.minTime).toBe('number')
        expect(typeof metrics.projectOpened.maxTime).toBe('number')
      })

      it('should filter metrics by event type', () => {
        const projectMetrics = eventBus.getEventMetrics('projectOpened')

        expect(projectMetrics).toHaveProperty('projectOpened')
        expect(projectMetrics).not.toHaveProperty('gitOperationCompleted')
        expect(projectMetrics.projectOpened.count).toBe(2)
      })

      it('should return empty metrics for unknown event type', () => {
        const metrics = eventBus.getEventMetrics('unknownEventType')

        expect(metrics).toEqual({})
      })

      it('should calculate metrics correctly', () => {
        const metrics = eventBus.getEventMetrics('projectOpened')
        const projectMetrics = metrics.projectOpened

        expect(projectMetrics.count).toBe(2)
        expect(projectMetrics.totalTime).toBeGreaterThanOrEqual(0)
        expect(projectMetrics.averageTime).toBe(
          projectMetrics.totalTime / projectMetrics.count
        )
        expect(projectMetrics.minTime).toBeLessThanOrEqual(
          projectMetrics.maxTime
        )
      })
    })

    describe('clearEventMetrics()', () => {
      beforeEach(async () => {
        const projectData: ProjectEventData = {
          rootPath: '/test',
          name: 'Test Project',
        }

        await eventBus.emitProjectEvent('projectOpened', projectData)

        const gitData: GitEventData = {
          operation: 'status',
          repositoryPath: '/repo',
        }

        await eventBus.emitGitEvent('gitOperationCompleted', gitData)
      })

      it('should clear all metrics when no event type specified', () => {
        expect(Object.keys(eventBus.getEventMetrics())).toHaveLength(3) // projectOpened, gitOperationCompleted, componentInitialized

        eventBus.clearEventMetrics()

        expect(eventBus.getEventMetrics()).toEqual({})
      })

      it('should clear specific event type metrics', () => {
        expect(eventBus.getEventMetrics()).toHaveProperty('projectOpened')
        expect(eventBus.getEventMetrics()).toHaveProperty(
          'gitOperationCompleted'
        )

        eventBus.clearEventMetrics('projectOpened')

        const metrics = eventBus.getEventMetrics()
        expect(metrics).not.toHaveProperty('projectOpened')
        expect(metrics).toHaveProperty('gitOperationCompleted')
      })

      it('should handle clearing non-existent event type', () => {
        expect(() => {
          eventBus.clearEventMetrics('nonExistentEvent')
        }).not.toThrow()
      })
    })

    describe('getEventCount()', () => {
      it('should start with zero events', () => {
        expect(eventBus.getEventCount()).toBe(0)
      })

      it('should increment count for each event', async () => {
        const projectData: ProjectEventData = {
          rootPath: '/test',
          name: 'Test',
        }

        expect(eventBus.getEventCount()).toBe(0)

        await eventBus.emitProjectEvent('projectOpened', projectData)
        expect(eventBus.getEventCount()).toBe(2) // projectOpened + internal componentInitialized

        await eventBus.emitProjectEvent('projectClosed', projectData)
        expect(eventBus.getEventCount()).toBe(3) // projectOpened + componentInitialized + projectClosed

        const gitData: GitEventData = {
          operation: 'status',
          repositoryPath: '/repo',
        }

        await eventBus.emitGitEvent('gitOperationCompleted', gitData)
        expect(eventBus.getEventCount()).toBe(4) // projectOpened + componentInitialized + projectClosed + gitOperationCompleted
      })
    })
  })

  describe('Event Listener Management', () => {
    it('should support project event listeners', async () => {
      const listener = vi.fn()
      eventBus.on('projectOpened', listener)

      const projectData: ProjectEventData = {
        rootPath: '/test',
        name: 'Test Project',
      }

      await eventBus.emitProjectEvent('projectOpened', projectData)

      expect(listener).toHaveBeenCalledWith(projectData)
    })

    it('should support git event listeners', async () => {
      const listener = vi.fn()
      eventBus.on('gitOperationCompleted', listener)

      const gitData: GitEventData = {
        operation: 'commit',
        repositoryPath: '/repo',
      }

      await eventBus.emitGitEvent('gitOperationCompleted', gitData)

      expect(listener).toHaveBeenCalledWith(gitData)
    })

    it('should support system event listeners', async () => {
      const listener = vi.fn()
      eventBus.on('systemError', listener)

      const systemData: SystemEventData = {
        component: 'TestComponent',
        message: 'Test error',
      }

      await eventBus.emitSystemEvent('systemError', systemData)

      expect(listener).toHaveBeenCalledWith(systemData)
    })

    it('should support multiple listeners for same event type', async () => {
      const listener1 = vi.fn()
      const listener2 = vi.fn()

      eventBus.on('projectOpened', listener1)
      eventBus.on('projectOpened', listener2)

      const projectData: ProjectEventData = {
        rootPath: '/test',
        name: 'Test Project',
      }

      await eventBus.emitProjectEvent('projectOpened', projectData)

      expect(listener1).toHaveBeenCalledWith(projectData)
      expect(listener2).toHaveBeenCalledWith(projectData)
    })

    it('should support removing all listeners', async () => {
      const projectListener = vi.fn()
      const gitListener = vi.fn()
      const systemListener = vi.fn()

      eventBus.on('projectOpened', projectListener)
      eventBus.on('gitOperationCompleted', gitListener)
      eventBus.on('systemError', systemListener)

      eventBus.removeAllListeners()

      await eventBus.emitProjectEvent('projectOpened', {
        rootPath: '/test',
        name: 'Test',
      })
      await eventBus.emitGitEvent('gitOperationCompleted', {
        operation: 'status',
        repositoryPath: '/repo',
      })
      await eventBus.emitSystemEvent('systemError', {
        component: 'Test',
        message: 'Error',
      })

      expect(projectListener).not.toHaveBeenCalled()
      expect(gitListener).not.toHaveBeenCalled()
      expect(systemListener).not.toHaveBeenCalled()
    })

    it('should return this for method chaining', () => {
      const result = eventBus.on('projectOpened', vi.fn())

      expect(result).toBe(eventBus)
    })
  })

  describe('Internal Event Coordination', () => {
    it('should coordinate project opened with component initialization', async () => {
      const componentListener = vi.fn()
      eventBus.on('componentInitialized', componentListener)

      const projectData: ProjectEventData = {
        rootPath: '/test/project',
        name: 'Test Project',
      }

      await eventBus.emitProjectEvent('projectOpened', projectData)

      // Should trigger internal component initialization event
      expect(componentListener).toHaveBeenCalledWith({
        component: 'ProjectSystem',
        message: 'Project Test Project opened successfully',
        data: { projectPath: '/test/project' },
      })
    })

    it('should handle terminal system ready events', async () => {
      const systemData: SystemEventData = {
        component: 'TerminalSystem',
        message: 'Terminal system ready',
      }

      await eventBus.emitSystemEvent('terminalSystemReady', systemData)

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Terminal system initialization completed'
      )
    })
  })

  describe('Type Safety and Integration', () => {
    it('should work with all ProjectEventType values', async () => {
      const projectEventTypes: ProjectEventType[] = [
        'projectOpening',
        'projectOpened',
        'projectClosed',
        'projectConfigChanged',
        'projectScanStarted',
        'projectScanCompleted',
      ]

      const projectData: ProjectEventData = {
        rootPath: '/test',
        name: 'Test Project',
      }

      for (const eventType of projectEventTypes) {
        await eventBus.emitProjectEvent(eventType, projectData)
        expect(mockLogger.info).toHaveBeenCalled()
      }

      expect(eventBus.getEventCount()).toBe(projectEventTypes.length + 1) // +1 for internal componentInitialized from projectOpened
    })

    it('should work with all GitEventType values', async () => {
      const gitEventTypes: GitEventType[] = [
        'gitOperationStarted',
        'gitOperationCompleted',
        'gitOperationFailed',
        'gitRepositoryChanged',
        'gitBranchChanged',
        'gitStatusChanged',
      ]

      const gitData: GitEventData = {
        operation: 'test',
        repositoryPath: '/repo',
      }

      for (const eventType of gitEventTypes) {
        await eventBus.emitGitEvent(eventType, gitData)
      }

      expect(eventBus.getEventCount()).toBe(gitEventTypes.length)
    })

    it('should work with all SystemEventType values', async () => {
      const systemEventTypes: SystemEventType[] = [
        'terminalSystemReady',
        'systemTerminalsInitialized',
        'loggingSystemReady',
        'componentInitialized',
        'systemError',
        'systemWarning',
      ]

      const systemData: SystemEventData = {
        component: 'TestComponent',
        message: 'Test message',
      }

      for (const eventType of systemEventTypes) {
        await eventBus.emitSystemEvent(eventType, systemData)
      }

      expect(eventBus.getEventCount()).toBe(systemEventTypes.length)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle events with minimal data', async () => {
      const minimalProject: ProjectEventData = {
        rootPath: '/minimal',
        name: 'Minimal',
      }

      const minimalGit: GitEventData = {
        operation: 'minimal',
        repositoryPath: '/minimal',
      }

      const minimalSystem: SystemEventData = {
        component: 'Minimal',
        message: 'Minimal message',
      }

      await expect(
        eventBus.emitProjectEvent('projectOpened', minimalProject)
      ).resolves.not.toThrow()

      await expect(
        eventBus.emitGitEvent('gitOperationCompleted', minimalGit)
      ).resolves.not.toThrow()

      await expect(
        eventBus.emitSystemEvent('systemError', minimalSystem)
      ).resolves.not.toThrow()
    })

    it('should handle git events without error in failed operations', async () => {
      const gitData: GitEventData = {
        operation: 'push',
        repositoryPath: '/repo',
        // No error property
      }

      await eventBus.emitGitEvent('gitOperationFailed', gitData)

      expect(mockLogger.logResult).toHaveBeenCalledWith(
        'ERROR',
        'Git push failed: Unknown error',
        'timeline',
        expect.any(Object)
      )
    })

    it('should handle system events without error property', async () => {
      const systemData: SystemEventData = {
        component: 'TestComponent',
        message: 'Error without error object',
        // No error property
      }

      await eventBus.emitSystemEvent('systemError', systemData)

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error without error object',
        'system',
        expect.objectContaining({
          component: 'TestComponent',
          error: undefined,
        })
      )
    })

    it('should handle rapid event emission efficiently', async () => {
      const startTime = Date.now()

      const projectData: ProjectEventData = {
        rootPath: '/rapid',
        name: 'Rapid Project',
      }

      // Emit many events rapidly
      const promises = []
      for (let i = 0; i < 50; i++) {
        promises.push(eventBus.emitProjectEvent('projectOpened', projectData))
      }

      await Promise.all(promises)

      const endTime = Date.now()
      const executionTime = endTime - startTime

      // Should complete within reasonable time
      expect(executionTime).toBeLessThan(1000)
      expect(eventBus.getEventCount()).toBe(100) // 50 projectOpened events + 50 internal componentInitialized events
    })
  })

  describe('Performance and Memory Management', () => {
    it('should limit performance metrics history to 100 entries', async () => {
      const projectData: ProjectEventData = {
        rootPath: '/perf',
        name: 'Performance Test',
      }

      // Emit more than 100 events
      const promises = []
      for (let i = 0; i < 110; i++) {
        promises.push(eventBus.emitProjectEvent('projectOpened', projectData))
      }

      await Promise.all(promises)

      const metrics = eventBus.getEventMetrics('projectOpened')
      expect(metrics.projectOpened.count).toBeLessThanOrEqual(100)
    })

    it('should maintain performance with many listeners', async () => {
      // Add many listeners
      for (let i = 0; i < 50; i++) {
        eventBus.on('projectOpened', vi.fn())
      }

      const startTime = Date.now()

      const projectData: ProjectEventData = {
        rootPath: '/perf',
        name: 'Performance Test',
      }

      await eventBus.emitProjectEvent('projectOpened', projectData)

      const endTime = Date.now()

      // Should still execute quickly
      expect(endTime - startTime).toBeLessThan(100)
    })
  })

  describe('Integration with Default Instance', () => {
    it('should provide systemEventBus default instance', () => {
      expect(systemEventBus).toBeInstanceOf(SystemEventBus)
    })

    it('should be separate from manually created instances', async () => {
      const manualEventBus = new SystemEventBus(mockLogger)

      const projectData: ProjectEventData = {
        rootPath: '/default',
        name: 'Default Project',
      }

      await systemEventBus.emitProjectEvent('projectOpened', projectData)
      await manualEventBus.emitProjectEvent('projectOpened', projectData)

      expect(systemEventBus.getEventCount()).toBe(2) // projectOpened + internal componentInitialized
      expect(manualEventBus.getEventCount()).toBe(2) // projectOpened + internal componentInitialized
    })
  })
})
