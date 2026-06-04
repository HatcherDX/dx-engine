/**
 * @fileoverview Integration tests for ActionScheduler with real shell commands.
 *
 * @description
 * Tests the complete flow including:
 * - Real command execution (echo, pnpm commands)
 * - Dependency resolution
 * - Error handling
 *
 * Note: These tests require a mocked IPC layer since we're not running in Electron.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ActionScheduler } from './ActionScheduler'
import type { ActionDefinition, ExecutionContext } from './types'

describe('ActionScheduler Integration Tests', () => {
  let mockIPC: {
    invoke: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    mockIPC = {
      invoke: vi.fn(),
    }
  })

  describe('Real Command Execution', () => {
    it('should execute echo command successfully', async () => {
      const actions: ActionDefinition[] = [
        {
          id: 'echo-test',
          name: 'Echo Test',
          description: 'Test echo command',
          command: 'echo "Integration Test Success"',
          dependencies: [],
        },
      ]

      // Mock the IPC invoke to simulate real command execution
      mockIPC.invoke.mockResolvedValueOnce({
        exitCode: 0,
        stdout: 'Integration Test Success\n',
        stderr: '',
      })

      const scheduler = new ActionScheduler(actions, {
        failFast: true,
        maxParallel: 4,
        timeout: 5000,
        retries: 0,
      })

      const context: ExecutionContext = {
        projectPath: process.cwd(),
        ipc: mockIPC,
      }

      const results = await scheduler.execute(context)

      expect(results).toHaveLength(1)
      expect(results[0].status).toBe('success')
      expect(results[0].exitCode).toBe(0)
      expect(results[0].output).toContain('Integration Test Success')
      expect(mockIPC.invoke).toHaveBeenCalledWith('actions:execute', {
        command: 'echo "Integration Test Success"',
        cwd: process.cwd(),
      })
    })

    it('should handle command with exit code 1', async () => {
      const actions: ActionDefinition[] = [
        {
          id: 'failing-command',
          name: 'Failing Command',
          description: 'Command that exits with code 1',
          command: 'exit 1',
          dependencies: [],
        },
      ]

      mockIPC.invoke.mockResolvedValueOnce({
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

      const context: ExecutionContext = {
        projectPath: process.cwd(),
        ipc: mockIPC,
      }

      const results = await scheduler.execute(context)

      expect(results).toHaveLength(1)
      expect(results[0].status).toBe('failed')
      expect(results[0].exitCode).toBe(1)
      expect(results[0].error).toContain('Command failed')
    })
  })

  describe('Dependency Chain', () => {
    it('should execute actions in correct dependency order', async () => {
      const actions: ActionDefinition[] = [
        {
          id: 'step-1',
          name: 'Step 1',
          description: 'First step',
          command: 'echo "Step 1 complete"',
          dependencies: [],
        },
        {
          id: 'step-2',
          name: 'Step 2',
          description: 'Second step (depends on step-1)',
          command: 'echo "Step 2 complete"',
          dependencies: ['step-1'],
        },
        {
          id: 'step-3',
          name: 'Step 3',
          description: 'Third step (depends on step-2)',
          command: 'echo "Step 3 complete"',
          dependencies: ['step-2'],
        },
      ]

      // Mock each command execution - need to handle each command differently
      mockIPC.invoke.mockImplementation(async (_channel, { command }) => {
        if (command.includes('Step 1')) {
          return {
            exitCode: 0,
            stdout: 'Step 1 complete\n',
            stderr: '',
          }
        } else if (command.includes('Step 2')) {
          return {
            exitCode: 0,
            stdout: 'Step 2 complete\n',
            stderr: '',
          }
        } else if (command.includes('Step 3')) {
          return {
            exitCode: 0,
            stdout: 'Step 3 complete\n',
            stderr: '',
          }
        }
        return {
          exitCode: 1,
          stdout: '',
          stderr: 'Unknown command',
        }
      })

      const scheduler = new ActionScheduler(actions, {
        failFast: true,
        maxParallel: 4,
        timeout: 5000,
        retries: 0,
      })

      const context: ExecutionContext = {
        projectPath: process.cwd(),
        ipc: mockIPC,
      }

      const results = await scheduler.execute(context)

      expect(results).toHaveLength(3)
      expect(results[0].actionId).toBe('step-1')
      expect(results[0].status).toBe('success')
      expect(results[1].actionId).toBe('step-2')
      expect(results[1].status).toBe('success')
      expect(results[2].actionId).toBe('step-3')
      expect(results[2].status).toBe('success')
    })

    it('should skip dependent actions when fail-fast is enabled', async () => {
      const actions: ActionDefinition[] = [
        {
          id: 'failing-action',
          name: 'Failing Action',
          description: 'This will fail',
          command: 'exit 1',
          dependencies: [],
        },
        {
          id: 'dependent-action',
          name: 'Dependent Action',
          description: 'Depends on failing action',
          command: 'echo "Should not execute"',
          dependencies: ['failing-action'],
        },
      ]

      mockIPC.invoke.mockResolvedValueOnce({
        exitCode: 1,
        stdout: '',
        stderr: 'Error occurred',
      })

      const scheduler = new ActionScheduler(actions, {
        failFast: true,
        maxParallel: 4,
        timeout: 5000,
        retries: 0,
      })

      const context: ExecutionContext = {
        projectPath: process.cwd(),
        ipc: mockIPC,
      }

      const results = await scheduler.execute(context)

      expect(results).toHaveLength(2)
      expect(results[0].actionId).toBe('failing-action')
      expect(results[0].status).toBe('failed')
      expect(results[1].actionId).toBe('dependent-action')
      expect(results[1].status).toBe('skipped')
      expect(results[1].error).toContain('failed dependencies')
    })
  })

  describe('Validation', () => {
    it('should pass validation for valid actions', () => {
      const actions: ActionDefinition[] = [
        {
          id: 'action-1',
          name: 'Action 1',
          description: 'No dependencies',
          command: 'echo "test"',
          dependencies: [],
        },
        {
          id: 'action-2',
          name: 'Action 2',
          description: 'Depends on action-1',
          command: 'echo "test2"',
          dependencies: ['action-1'],
        },
      ]

      const scheduler = new ActionScheduler(actions, {
        failFast: true,
        maxParallel: 4,
        timeout: 5000,
        retries: 0,
      })

      const validation = scheduler.validate()

      expect(validation.valid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('should fail validation for missing dependencies', () => {
      const actions: ActionDefinition[] = [
        {
          id: 'action-1',
          name: 'Action 1',
          description: 'Depends on non-existent action',
          command: 'echo "test"',
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
          description: 'Depends on B',
          command: 'echo "A"',
          dependencies: ['action-b'],
        },
        {
          id: 'action-b',
          name: 'Action B',
          description: 'Depends on A (circular)',
          command: 'echo "B"',
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

  describe('Execution Order', () => {
    it('should calculate correct execution levels', () => {
      const actions: ActionDefinition[] = [
        {
          id: 'lint',
          name: 'Lint',
          description: 'Run linter',
          command: 'pnpm lint',
          dependencies: [],
        },
        {
          id: 'format-check',
          name: 'Format Check',
          description: 'Check code formatting',
          command: 'pnpm run format:check',
          dependencies: [],
        },
        {
          id: 'test',
          name: 'Test',
          description: 'Run tests',
          command: 'pnpm test',
          dependencies: ['lint', 'format-check'],
        },
      ]

      const scheduler = new ActionScheduler(actions, {
        failFast: true,
        maxParallel: 4,
        timeout: 5000,
        retries: 0,
      })

      const order = scheduler.getExecutionOrder()

      // Level 0: lint and format-check (no dependencies, run in parallel)
      expect(order[0]).toHaveLength(2)
      expect(order[0]).toContain('lint')
      expect(order[0]).toContain('format-check')

      // Level 1: test (depends on both lint and format-check)
      expect(order[1]).toEqual(['test'])
    })
  })

  describe('Callbacks', () => {
    it('should invoke onActionStart and onActionComplete callbacks', async () => {
      const actions: ActionDefinition[] = [
        {
          id: 'callback-test',
          name: 'Callback Test',
          description: 'Test callbacks',
          command: 'echo "test"',
          dependencies: [],
        },
      ]

      mockIPC.invoke.mockResolvedValueOnce({
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
      const onActionComplete = vi.fn()

      const context: ExecutionContext = {
        projectPath: process.cwd(),
        ipc: mockIPC,
        onActionStart,
        onActionComplete,
      }

      await scheduler.execute(context)

      // Verify callbacks were called
      expect(onActionStart).toHaveBeenCalledTimes(1)
      expect(onActionStart).toHaveBeenCalledWith(actions[0])

      expect(onActionComplete).toHaveBeenCalledTimes(1)
      expect(onActionComplete).toHaveBeenCalledWith(
        actions[0],
        expect.objectContaining({
          actionId: 'callback-test',
          status: 'success',
          exitCode: 0,
        })
      )
    })
  })
})
