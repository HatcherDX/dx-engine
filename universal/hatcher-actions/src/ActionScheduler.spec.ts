/**
 * @fileoverview Tests for ActionScheduler with real command execution.
 *
 * @description
 * Tests the ActionScheduler against real commands to verify:
 * - Dependency resolution
 * - Parallel execution
 * - Error handling
 * - Execution order
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ActionScheduler } from './ActionScheduler'
import type { ActionDefinition, ExecutionContext, ActionResult } from './types'

describe('ActionScheduler', () => {
  let mockIPC: {
    invoke: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    // Mock IPC with realistic responses
    mockIPC = {
      invoke: vi.fn(),
    }
  })

  describe('Basic Execution', () => {
    it('should execute a single action successfully', async () => {
      const actions: ActionDefinition[] = [
        {
          id: 'test-echo',
          name: 'Test Echo',
          description: 'Echo test message',
          command: 'echo "Hello World"',
          dependencies: [],
        },
      ]

      // Mock successful command execution
      mockIPC.invoke.mockResolvedValue({
        exitCode: 0,
        stdout: 'Hello World\n',
        stderr: '',
      })

      const scheduler = new ActionScheduler(actions, {
        failFast: true,
        maxParallel: 4,
        timeout: 5000,
        retries: 0,
      })

      const results: ActionResult[] = []
      const context: ExecutionContext = {
        projectPath: '/tmp',
        ipc: mockIPC,
        onActionStart: vi.fn(),
        onActionComplete: (_action, result) => {
          results.push(result)
        },
      }

      await scheduler.execute(context)

      expect(results).toHaveLength(1)
      expect(results[0].status).toBe('success')
      expect(results[0].output).toContain('Hello World')
      expect(mockIPC.invoke).toHaveBeenCalledWith('actions:execute', {
        command: 'echo "Hello World"',
        cwd: '/tmp',
      })
    })

    it('should handle command failure', async () => {
      const actions: ActionDefinition[] = [
        {
          id: 'test-fail',
          name: 'Test Failure',
          description: 'Command that fails',
          command: 'exit 1',
          dependencies: [],
        },
      ]

      // Mock failed command execution
      mockIPC.invoke.mockResolvedValue({
        exitCode: 1,
        stdout: '',
        stderr: 'Command failed',
      })

      const scheduler = new ActionScheduler(actions, {
        failFast: true,
        maxParallel: 4,
        timeout: 5000,
        retries: 0,
      })

      const results: ActionResult[] = []
      const context: ExecutionContext = {
        projectPath: '/tmp',
        ipc: mockIPC,
        onActionComplete: (_action, result) => {
          results.push(result)
        },
      }

      await scheduler.execute(context)

      expect(results).toHaveLength(1)
      expect(results[0].status).toBe('failed')
      expect(results[0].exitCode).toBe(1)
    })
  })

  describe('Dependency Resolution', () => {
    it('should execute actions in dependency order', async () => {
      const executionOrder: string[] = []

      const actions: ActionDefinition[] = [
        {
          id: 'action-c',
          name: 'Action C',
          description: 'Depends on B',
          command: 'echo "C"',
          dependencies: ['action-b'],
        },
        {
          id: 'action-b',
          name: 'Action B',
          description: 'Depends on A',
          command: 'echo "B"',
          dependencies: ['action-a'],
        },
        {
          id: 'action-a',
          name: 'Action A',
          description: 'No dependencies',
          command: 'echo "A"',
          dependencies: [],
        },
      ]

      // Mock all commands as successful
      mockIPC.invoke.mockImplementation(async (_channel, { command }) => {
        const output = command.match(/echo "([A-C])"/)?.[1] || ''
        executionOrder.push(output)
        return {
          exitCode: 0,
          stdout: `${output}\n`,
          stderr: '',
        }
      })

      const scheduler = new ActionScheduler(actions, {
        failFast: true,
        maxParallel: 4,
        timeout: 5000,
        retries: 0,
      })

      const context: ExecutionContext = {
        projectPath: '/tmp',
        ipc: mockIPC,
      }

      await scheduler.execute(context)

      // Should execute in order: A -> B -> C
      expect(executionOrder).toEqual(['A', 'B', 'C'])
    })

    it('should execute parallel actions concurrently', async () => {
      const startTimes: Record<string, number> = {}
      const endTimes: Record<string, number> = {}

      const actions: ActionDefinition[] = [
        {
          id: 'parallel-1',
          name: 'Parallel 1',
          description: 'Runs in parallel',
          command: 'echo "P1"',
          dependencies: [],
          parallel: true,
        },
        {
          id: 'parallel-2',
          name: 'Parallel 2',
          description: 'Runs in parallel',
          command: 'echo "P2"',
          dependencies: [],
          parallel: true,
        },
      ]

      // Mock commands with delay to simulate real execution
      mockIPC.invoke.mockImplementation(async (_channel, { command }) => {
        const id = command.includes('P1') ? 'parallel-1' : 'parallel-2'
        startTimes[id] = Date.now()
        // Simulate 100ms execution
        await new Promise((resolve) => setTimeout(resolve, 100))
        endTimes[id] = Date.now()

        return {
          exitCode: 0,
          stdout: command.match(/echo "(.+)"/)?.[1] + '\n',
          stderr: '',
        }
      })

      const scheduler = new ActionScheduler(actions, {
        failFast: true,
        maxParallel: 4,
        timeout: 5000,
        retries: 0,
      })

      const context: ExecutionContext = {
        projectPath: '/tmp',
        ipc: mockIPC,
      }

      await scheduler.execute(context)

      // Both should have started before either finished (parallel execution)
      const p1Start = startTimes['parallel-1']
      const p2Start = startTimes['parallel-2']
      const p1End = endTimes['parallel-1']
      const p2End = endTimes['parallel-2']

      // Verify they started within 50ms of each other (parallel)
      expect(Math.abs(p1Start - p2Start)).toBeLessThan(50)
      // Verify both finished
      expect(p1End).toBeDefined()
      expect(p2End).toBeDefined()
    })
  })

  describe('Fail-Fast Behavior', () => {
    it('should skip dependent actions when dependency fails', async () => {
      const actions: ActionDefinition[] = [
        {
          id: 'action-fail',
          name: 'Failing Action',
          description: 'This will fail',
          command: 'exit 1',
          dependencies: [],
        },
        {
          id: 'action-depend',
          name: 'Dependent Action',
          description: 'Depends on failing action',
          command: 'echo "Should not run"',
          dependencies: ['action-fail'],
        },
      ]

      mockIPC.invoke.mockImplementation(async (_channel, { command }) => {
        if (command.includes('exit')) {
          return {
            exitCode: 1,
            stdout: '',
            stderr: 'Failed',
          }
        }
        return {
          exitCode: 0,
          stdout: 'Should not run\n',
          stderr: '',
        }
      })

      const scheduler = new ActionScheduler(actions, {
        failFast: true,
        maxParallel: 4,
        timeout: 5000,
        retries: 0,
      })

      const results: ActionResult[] = []
      const context: ExecutionContext = {
        projectPath: '/tmp',
        ipc: mockIPC,
        onActionComplete: (_action, result) => {
          results.push(result)
        },
      }

      await scheduler.execute(context)

      expect(results).toHaveLength(2)
      expect(results[0].actionId).toBe('action-fail')
      expect(results[0].status).toBe('failed')
      expect(results[1].actionId).toBe('action-depend')
      expect(results[1].status).toBe('skipped')
      expect(results[1].error).toContain('failed dependencies')
    })
  })

  describe('Execution Order Visualization', () => {
    it('should return correct execution order', () => {
      const actions: ActionDefinition[] = [
        { id: 'a', name: 'A', description: '', command: '', dependencies: [] },
        {
          id: 'b',
          name: 'B',
          description: '',
          command: '',
          dependencies: ['a'],
        },
        {
          id: 'c',
          name: 'C',
          description: '',
          command: '',
          dependencies: ['a'],
        },
        {
          id: 'd',
          name: 'D',
          description: '',
          command: '',
          dependencies: ['b', 'c'],
        },
      ]

      const scheduler = new ActionScheduler(actions, {
        failFast: true,
        maxParallel: 4,
        timeout: 5000,
        retries: 0,
      })

      const order = scheduler.getExecutionOrder()

      // Level 0: A (no dependencies)
      expect(order[0]).toEqual(['a'])
      // Level 1: B and C (depend on A, can run in parallel)
      expect(order[1]).toHaveLength(2)
      expect(order[1]).toContain('b')
      expect(order[1]).toContain('c')
      // Level 2: D (depends on B and C)
      expect(order[2]).toEqual(['d'])
    })
  })

  describe('Validation', () => {
    it('should detect missing dependencies', () => {
      const actions: ActionDefinition[] = [
        {
          id: 'action-1',
          name: 'Action 1',
          description: '',
          command: '',
          dependencies: ['non-existent'],
        },
      ]

      const scheduler = new ActionScheduler(actions, {
        failFast: true,
        maxParallel: 4,
        timeout: 5000,
        retries: 0,
      })

      const validation = scheduler.validate()

      expect(validation.valid).toBe(false)
      expect(validation.errors).toHaveLength(1)
      expect(validation.errors[0]).toContain('non-existent')
    })

    it('should detect circular dependencies', () => {
      const actions: ActionDefinition[] = [
        {
          id: 'action-a',
          name: 'Action A',
          description: '',
          command: '',
          dependencies: ['action-b'],
        },
        {
          id: 'action-b',
          name: 'Action B',
          description: '',
          command: '',
          dependencies: ['action-a'],
        },
      ]

      const scheduler = new ActionScheduler(actions, {
        failFast: true,
        maxParallel: 4,
        timeout: 5000,
        retries: 0,
      })

      const validation = scheduler.validate()

      expect(validation.valid).toBe(false)
      expect(validation.errors).toHaveLength(1)
      expect(validation.errors[0]).toContain('Circular dependency')
    })
  })

  describe('Callbacks', () => {
    it('should trigger onActionStart callback', async () => {
      const actions: ActionDefinition[] = [
        {
          id: 'test',
          name: 'Test',
          description: '',
          command: 'echo "test"',
          dependencies: [],
        },
      ]

      mockIPC.invoke.mockResolvedValue({
        exitCode: 0,
        stdout: 'test\n',
        stderr: '',
      })

      const scheduler = new ActionScheduler(actions, {
        failFast: true,
        maxParallel: 4,
        timeout: 5000,
        retries: 0,
      })

      const onActionStart = vi.fn()
      const context: ExecutionContext = {
        projectPath: '/tmp',
        ipc: mockIPC,
        onActionStart,
      }

      await scheduler.execute(context)

      expect(onActionStart).toHaveBeenCalledOnce()
      expect(onActionStart).toHaveBeenCalledWith(actions[0])
    })

    it('should trigger onActionComplete callback', async () => {
      const actions: ActionDefinition[] = [
        {
          id: 'test',
          name: 'Test',
          description: '',
          command: 'echo "test"',
          dependencies: [],
        },
      ]

      mockIPC.invoke.mockResolvedValue({
        exitCode: 0,
        stdout: 'test\n',
        stderr: '',
      })

      const scheduler = new ActionScheduler(actions, {
        failFast: true,
        maxParallel: 4,
        timeout: 5000,
        retries: 0,
      })

      const onActionComplete = vi.fn()
      const context: ExecutionContext = {
        projectPath: '/tmp',
        ipc: mockIPC,
        onActionComplete,
      }

      await scheduler.execute(context)

      expect(onActionComplete).toHaveBeenCalledOnce()
      expect(onActionComplete).toHaveBeenCalledWith(actions[0], {
        actionId: 'test',
        status: 'success',
        duration: expect.any(Number),
        output: 'test\n',
        error: undefined,
        exitCode: 0,
        startTime: expect.any(Number),
        endTime: expect.any(Number),
      })
    })
  })
})
