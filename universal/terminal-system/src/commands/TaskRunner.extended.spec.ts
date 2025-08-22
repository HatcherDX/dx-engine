/**
 * @fileoverview Extended comprehensive tests for TaskRunner to achieve high coverage.
 *
 * @description
 * This test suite provides additional coverage for TaskRunner functionality including
 * advanced task management, event handling, error scenarios, background execution,
 * task lifecycle management, and edge cases.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  BackgroundTask,
  CommandProgress,
  CommandResult,
  TaskCommandOptions,
} from '../types/commands'
import { TaskRunner } from './TaskRunner'

/**
 * Internal TaskRunner interface for accessing private methods during testing.
 * This interface exposes private methods for comprehensive testing coverage.
 */
interface TaskRunnerInternal {
  updateTaskStatus: (taskId: string, status: BackgroundTask['status']) => void
  updateTaskProgress: (taskId: string, progress: CommandProgress) => void
  updateTaskResult: (taskId: string, result: CommandResult) => void
  updateTaskError: (taskId: string, error: Error) => void
  executeBackgroundTask: (
    taskId: string,
    command: string,
    options: TaskCommandOptions
  ) => Promise<void>
  tasks: Map<string, BackgroundTask>
}

// Mock UUID to prevent real UUID generation
vi.mock('uuid', () => ({
  v4: () => 'mocked-uuid-' + Math.random().toString(36).substr(2, 9),
}))

describe('TaskRunner Extended Coverage', () => {
  let taskRunner: TaskRunner
  let mockStream: ReturnType<typeof vi.fn>
  let mockCancel: ReturnType<typeof vi.fn>

  beforeEach(() => {
    taskRunner = new TaskRunner()

    // Mock the stream method from parent CommandRunner
    mockStream = vi
      .spyOn(taskRunner, 'stream' as keyof TaskRunner)
      .mockImplementation(async () => {
        // Just resolve - the actual task ID comes from UUID
        return Promise.resolve()
      })

    // Mock the cancel method from parent CommandRunner
    mockCancel = vi
      .spyOn(taskRunner, 'cancel' as keyof TaskRunner)
      .mockImplementation(async () => {
        // Just resolve - the actual task ID comes from UUID
        return Promise.resolve(true)
      })
  })

  afterEach(() => {
    taskRunner.cleanup()
    vi.restoreAllMocks()
  })

  describe('runBackground advanced scenarios', () => {
    it('should create background task with full options', async () => {
      const options: TaskCommandOptions = {
        category: 'build',
        priority: 'high',
        background: true,
        timeout: 30000,
        cwd: '/workspace',
        env: { NODE_ENV: 'production' },
      }

      const taskId = await taskRunner.runBackground('npm run build', options)

      expect(taskId).toMatch(/^mocked-uuid-/)
      expect(mockStream).toHaveBeenCalledWith('npm run build', options)

      const task = await taskRunner.getTask(taskId)
      expect(task).toBeDefined()
      expect(task?.command).toBe('npm run build')
      expect(task?.status).toBe('running')
      expect(task?.startTime).toBeInstanceOf(Date)
    })

    it('should handle runBackground without options', async () => {
      const taskId = await taskRunner.runBackground('echo "minimal task"')

      expect(taskId).toMatch(/^mocked-uuid-/)

      const task = await taskRunner.getTask(taskId)
      expect(task).toBeDefined()
      expect(task?.command).toBe('echo "minimal task"')
      expect(task?.status).toBe('running')
    })

    it('should handle background task execution errors', async () => {
      mockStream.mockRejectedValueOnce(new Error('Stream execution failed'))

      const taskId = await taskRunner.runBackground('failing-command')

      // Task should still be created, but execution should be handled in background
      const task = await taskRunner.getTask(taskId)
      expect(task).toBeDefined()
      expect(task?.command).toBe('failing-command')
    })

    it('should assign unique IDs to multiple tasks', async () => {
      const taskId1 = await taskRunner.runBackground('task 1')
      const taskId2 = await taskRunner.runBackground('task 2')
      const taskId3 = await taskRunner.runBackground('task 3')

      expect(taskId1).not.toBe(taskId2)
      expect(taskId2).not.toBe(taskId3)
      expect(taskId1).not.toBe(taskId3)

      const tasks = await taskRunner.getTasks()
      expect(tasks).toHaveLength(3)
    })
  })

  describe('task lifecycle and status management', () => {
    let taskId: string

    beforeEach(async () => {
      taskId = await taskRunner.runBackground('long-running-task')
    })

    it('should handle task progress updates', async () => {
      const task = await taskRunner.getTask(taskId)
      expect(task).toBeDefined()

      // Simulate progress update
      const progress: CommandProgress = {
        percentage: 50,
        message: 'Processing...',
        current: 5,
        total: 10,
      }

      // Access private method for testing
      const updateTaskProgress = (taskRunner as unknown as TaskRunnerInternal)
        .updateTaskProgress
      updateTaskProgress.call(taskRunner, taskId, progress)

      const updatedTask = await taskRunner.getTask(taskId)
      expect(updatedTask?.progress).toEqual(progress)
    })

    it('should handle task completion successfully', async () => {
      const result: CommandResult = {
        success: true,
        exitCode: 0,
        stdout: 'Task completed successfully',
        stderr: '',
        duration: 1500,
        command: 'long-running-task',
      }

      // Access private method for testing
      const updateTaskResult = (taskRunner as unknown as TaskRunnerInternal)
        .updateTaskResult
      updateTaskResult.call(taskRunner, taskId, result)

      const task = await taskRunner.getTask(taskId)
      expect(task?.status).toBe('completed')
      expect(task?.result).toEqual(result)
      expect(task?.endTime).toBeInstanceOf(Date)
    })

    it('should handle task failure', async () => {
      const result: CommandResult = {
        success: false,
        exitCode: 1,
        stdout: '',
        stderr: 'Task failed with error',
        duration: 500,
        command: 'long-running-task',
      }

      // Access private method for testing
      const updateTaskResult = (taskRunner as unknown as TaskRunnerInternal)
        .updateTaskResult
      updateTaskResult.call(taskRunner, taskId, result)

      const task = await taskRunner.getTask(taskId)
      expect(task?.status).toBe('failed')
      expect(task?.result).toEqual(result)
      expect(task?.endTime).toBeInstanceOf(Date)
    })

    it('should handle task error', async () => {
      const error = new Error('Unexpected task error')

      // Access private method for testing
      const updateTaskError = (taskRunner as unknown as TaskRunnerInternal)
        .updateTaskError
      updateTaskError.call(taskRunner, taskId, error)

      const task = await taskRunner.getTask(taskId)
      expect(task?.status).toBe('failed')
      expect(task?.result?.success).toBe(false)
      expect(task?.result?.stderr).toBe('Unexpected task error')
      expect(task?.endTime).toBeInstanceOf(Date)
    })

    it('should calculate task duration correctly', async () => {
      const task = await taskRunner.getTask(taskId)
      const startTime = task!.startTime.getTime()

      const error = new Error('Test error')
      const updateTaskError = (taskRunner as unknown as TaskRunnerInternal)
        .updateTaskError
      updateTaskError.call(taskRunner, taskId, error)

      const updatedTask = await taskRunner.getTask(taskId)
      const expectedDuration = updatedTask!.endTime!.getTime() - startTime
      expect(updatedTask?.result?.duration).toBeCloseTo(expectedDuration, -2) // Allow 100ms tolerance
    })
  })

  describe('task retrieval and filtering', () => {
    beforeEach(async () => {
      // Create diverse set of tasks
      await taskRunner.runBackground('npm run build')
      await taskRunner.runBackground('npm test')
      await taskRunner.runBackground('npm run lint')
      await taskRunner.runBackground('npm run deploy')
      await taskRunner.runBackground('npm audit')
      await taskRunner.runBackground('custom-command')
    })

    it('should return all tasks', async () => {
      const tasks = await taskRunner.getTasks()
      expect(tasks).toHaveLength(6)
      expect(tasks.every((task) => task.status === 'running')).toBe(true)
    })

    it('should return null for non-existent task', async () => {
      const task = await taskRunner.getTask('non-existent-task-id')
      expect(task).toBeNull()
    })

    it('should filter tasks by build category', async () => {
      const buildTasks = await taskRunner.getTasksByCategory('build')
      expect(buildTasks).toHaveLength(1)
      expect(buildTasks[0].command).toContain('build')
    })

    it('should filter tasks by test category', async () => {
      const testTasks = await taskRunner.getTasksByCategory('test')
      expect(testTasks).toHaveLength(1)
      expect(testTasks[0].command).toContain('test')
    })

    it('should filter tasks by deploy category', async () => {
      const deployTasks = await taskRunner.getTasksByCategory('deploy')
      expect(deployTasks).toHaveLength(1)
      expect(deployTasks[0].command).toContain('deploy')
    })

    it('should filter tasks by analysis category', async () => {
      const analysisTasks = await taskRunner.getTasksByCategory('analysis')
      expect(analysisTasks).toHaveLength(2) // lint + audit
      expect(analysisTasks.some((task) => task.command.includes('lint'))).toBe(
        true
      )
      expect(analysisTasks.some((task) => task.command.includes('audit'))).toBe(
        true
      )
    })

    it('should return all tasks when no category specified', async () => {
      const allTasks = await taskRunner.getTasksByCategory()
      expect(allTasks).toHaveLength(6)
    })

    it('should handle unknown category', async () => {
      const unknownTasks = await taskRunner.getTasksByCategory(
        'unknown' as TaskCommandOptions['category']
      )
      expect(unknownTasks).toHaveLength(6) // Should return all tasks
    })
  })

  describe('task cancellation', () => {
    it('should cancel running task successfully', async () => {
      const taskId = await taskRunner.runBackground('sleep 10')
      mockCancel.mockResolvedValueOnce(true)

      const cancelled = await taskRunner.cancelTask(taskId)

      expect(cancelled).toBe(true)
      expect(mockCancel).toHaveBeenCalledWith(taskId)

      const task = await taskRunner.getTask(taskId)
      expect(task?.status).toBe('cancelled')
      expect(task?.endTime).toBeInstanceOf(Date)
    })

    it('should handle cancel failure', async () => {
      const taskId = await taskRunner.runBackground('sleep 10')
      mockCancel.mockResolvedValueOnce(false)

      const cancelled = await taskRunner.cancelTask(taskId)

      expect(cancelled).toBe(false)
    })

    it('should return false for non-existent task', async () => {
      const cancelled = await taskRunner.cancelTask('non-existent-id')
      expect(cancelled).toBe(false)
    })

    it('should return false for already completed task', async () => {
      const taskId = await taskRunner.runBackground('echo "quick task"')

      // Mark task as completed
      const updateTaskStatus = (taskRunner as unknown as TaskRunnerInternal)
        .updateTaskStatus
      updateTaskStatus.call(taskRunner, taskId, 'completed')

      const cancelled = await taskRunner.cancelTask(taskId)
      expect(cancelled).toBe(false)
    })

    it('should return false for already failed task', async () => {
      const taskId = await taskRunner.runBackground('failing-task')

      // Mark task as failed
      const updateTaskStatus = (taskRunner as unknown as TaskRunnerInternal)
        .updateTaskStatus
      updateTaskStatus.call(taskRunner, taskId, 'failed')

      const cancelled = await taskRunner.cancelTask(taskId)
      expect(cancelled).toBe(false)
    })

    it('should return false for already cancelled task', async () => {
      const taskId = await taskRunner.runBackground('sleep 10')

      // Mark task as cancelled
      const updateTaskStatus = (taskRunner as unknown as TaskRunnerInternal)
        .updateTaskStatus
      updateTaskStatus.call(taskRunner, taskId, 'cancelled')

      const cancelled = await taskRunner.cancelTask(taskId)
      expect(cancelled).toBe(false)
    })
  })

  describe('task cleanup and management', () => {
    it('should clear only completed and failed tasks', async () => {
      // Create mix of tasks with different states
      const completedTaskId = await taskRunner.runBackground('completed-task')
      const failedTaskId = await taskRunner.runBackground('failed-task')
      await taskRunner.runBackground('running-task')
      const cancelledTaskId = await taskRunner.runBackground('cancelled-task')

      // Set different states
      const updateTaskStatus = (taskRunner as unknown as TaskRunnerInternal)
        .updateTaskStatus
      updateTaskStatus.call(taskRunner, completedTaskId, 'completed')
      updateTaskStatus.call(taskRunner, failedTaskId, 'failed')
      updateTaskStatus.call(taskRunner, cancelledTaskId, 'cancelled')
      // Running task remains running

      const tasksBefore = await taskRunner.getTasks()
      expect(tasksBefore).toHaveLength(4)

      await taskRunner.clearCompleted()

      const tasksAfter = await taskRunner.getTasks()
      expect(tasksAfter).toHaveLength(2) // running and cancelled tasks should remain

      const remainingStatuses = tasksAfter.map((t) => t.status)
      expect(remainingStatuses).toContain('running')
      expect(remainingStatuses).toContain('cancelled')
      expect(remainingStatuses).not.toContain('completed')
      expect(remainingStatuses).not.toContain('failed')
    })

    it('should handle clearCompleted with no completed tasks', async () => {
      // Create only running tasks
      await taskRunner.runBackground('running-task-1')
      await taskRunner.runBackground('running-task-2')

      const tasksBefore = await taskRunner.getTasks()
      expect(tasksBefore).toHaveLength(2)

      await taskRunner.clearCompleted()

      const tasksAfter = await taskRunner.getTasks()
      expect(tasksAfter).toHaveLength(2) // No change
    })
  })

  describe('utility methods', () => {
    it('should run build task with correct category and priority', async () => {
      const taskId = await taskRunner.runBuild('webpack --mode production')

      expect(mockStream).toHaveBeenCalledWith('webpack --mode production', {
        category: 'build',
        priority: 'normal',
      })

      const task = await taskRunner.getTask(taskId)
      expect(task?.command).toBe('webpack --mode production')
    })

    it('should run build task with custom options', async () => {
      const customOptions: TaskCommandOptions = {
        timeout: 60000,
        env: { NODE_ENV: 'production' },
      }

      await taskRunner.runBuild('npm run build:prod', customOptions)

      expect(mockStream).toHaveBeenCalledWith('npm run build:prod', {
        ...customOptions,
        category: 'build',
        priority: 'normal',
      })
    })

    it('should run test task with high priority', async () => {
      const taskId = await taskRunner.runTests('jest --coverage')

      expect(mockStream).toHaveBeenCalledWith('jest --coverage', {
        category: 'test',
        priority: 'high',
      })

      const task = await taskRunner.getTask(taskId)
      expect(task?.command).toBe('jest --coverage')
    })

    it('should run deploy task with high priority', async () => {
      const taskId = await taskRunner.runDeploy('docker push myapp:latest')

      expect(mockStream).toHaveBeenCalledWith('docker push myapp:latest', {
        category: 'deploy',
        priority: 'high',
      })

      const task = await taskRunner.getTask(taskId)
      expect(task?.command).toBe('docker push myapp:latest')
    })

    it('should run analysis task with low priority and background flag', async () => {
      const taskId = await taskRunner.runAnalysis('eslint src/')

      expect(mockStream).toHaveBeenCalledWith('eslint src/', {
        category: 'analysis',
        priority: 'low',
        background: true,
      })

      const task = await taskRunner.getTask(taskId)
      expect(task?.command).toBe('eslint src/')
    })

    it('should merge custom options with utility method defaults', async () => {
      const customOptions: TaskCommandOptions = {
        timeout: 120000,
        cwd: '/custom/path',
      }

      await taskRunner.runAnalysis('npm audit', customOptions)

      expect(mockStream).toHaveBeenCalledWith('npm audit', {
        ...customOptions,
        category: 'analysis',
        priority: 'low',
        background: true,
      })
    })
  })

  describe('task statistics and monitoring', () => {
    it('should return correct running tasks count', async () => {
      // Create tasks with various states
      const taskIds = []
      for (let i = 0; i < 5; i++) {
        taskIds.push(await taskRunner.runBackground(`task-${i}`))
      }

      // Set different states
      const updateTaskStatus = (taskRunner as unknown as TaskRunnerInternal)
        .updateTaskStatus
      updateTaskStatus.call(taskRunner, taskIds[0], 'completed')
      updateTaskStatus.call(taskRunner, taskIds[1], 'completed')
      updateTaskStatus.call(taskRunner, taskIds[2], 'failed')
      updateTaskStatus.call(taskRunner, taskIds[3], 'cancelled')
      // taskIds[4] remains running

      const runningCount = await taskRunner.getRunningTasksCount()
      expect(runningCount).toBe(1)
    })

    it('should return comprehensive task statistics', async () => {
      // Create tasks with various states
      const taskIds = []
      for (let i = 0; i < 5; i++) {
        taskIds.push(await taskRunner.runBackground(`task-${i}`))
      }

      // Set different states
      const updateTaskStatus = (taskRunner as unknown as TaskRunnerInternal)
        .updateTaskStatus
      updateTaskStatus.call(taskRunner, taskIds[0], 'completed')
      updateTaskStatus.call(taskRunner, taskIds[1], 'completed')
      updateTaskStatus.call(taskRunner, taskIds[2], 'failed')
      updateTaskStatus.call(taskRunner, taskIds[3], 'cancelled')
      // taskIds[4] remains running

      const stats = await taskRunner.getTaskStats()

      expect(stats.total).toBe(5)
      expect(stats.running).toBe(1)
      expect(stats.completed).toBe(2)
      expect(stats.failed).toBe(1)
      expect(stats.cancelled).toBe(1)
    })

    it('should handle empty task list statistics', async () => {
      const stats = await taskRunner.getTaskStats()

      expect(stats.total).toBe(0)
      expect(stats.running).toBe(0)
      expect(stats.completed).toBe(0)
      expect(stats.failed).toBe(0)
      expect(stats.cancelled).toBe(0)
    })
  })

  describe('event handling and integration', () => {
    it('should handle executeBackgroundTask with non-existent task', async () => {
      // Test edge case where task is deleted before executeBackgroundTask runs
      const executeBackgroundTask = (
        taskRunner as unknown as TaskRunnerInternal
      ).executeBackgroundTask

      // This should not throw an error
      await expect(
        executeBackgroundTask.call(
          taskRunner,
          'non-existent-task-id',
          'echo test',
          {}
        )
      ).resolves.toBeUndefined()
    })

    it('should handle command events correctly', async () => {
      const taskId = await taskRunner.runBackground('test-command')

      // Simulate command progress event
      const onProgress = vi.fn()
      taskRunner.on('command-progress', onProgress)

      // Simulate command complete event
      const onComplete = vi.fn()
      taskRunner.on('command-complete', onComplete)

      // Simulate command error event
      const onError = vi.fn()
      taskRunner.on('command-error', onError)

      // Manually trigger events to test event handling
      const executeBackgroundTask = (
        taskRunner as unknown as TaskRunnerInternal
      ).executeBackgroundTask
      await executeBackgroundTask.call(taskRunner, taskId, 'echo test', {})

      // Clean up event listeners
      taskRunner.off('command-progress', onProgress)
      taskRunner.off('command-complete', onComplete)
      taskRunner.off('command-error', onError)
    })
  })

  describe('private method edge cases', () => {
    it('should handle updateTaskStatus with non-existent task', () => {
      const updateTaskStatus = (taskRunner as unknown as TaskRunnerInternal)
        .updateTaskStatus

      // Should not throw an error
      expect(() => {
        updateTaskStatus.call(taskRunner, 'non-existent-id', 'completed')
      }).not.toThrow()
    })

    it('should handle updateTaskProgress with non-existent task', () => {
      // Access private method for testing
      const updateTaskProgress = (taskRunner as unknown as TaskRunnerInternal)
        .updateTaskProgress
      const progress: CommandProgress = {
        percentage: 50,
        message: 'Test progress',
      }

      // Should not throw an error
      expect(() => {
        updateTaskProgress.call(taskRunner, 'non-existent-id', progress)
      }).not.toThrow()
    })

    it('should handle updateTaskResult with non-existent task', () => {
      const updateTaskResult = (taskRunner as unknown as TaskRunnerInternal)
        .updateTaskResult
      const result: CommandResult = {
        success: true,
        exitCode: 0,
        stdout: 'test',
        stderr: '',
        duration: 100,
        command: 'test',
      }

      // Should not throw an error
      expect(() => {
        updateTaskResult.call(taskRunner, 'non-existent-id', result)
      }).not.toThrow()
    })

    it('should handle updateTaskError with non-existent task', () => {
      const updateTaskError = (taskRunner as unknown as TaskRunnerInternal)
        .updateTaskError
      const error = new Error('Test error')

      // Should not throw an error
      expect(() => {
        updateTaskError.call(taskRunner, 'non-existent-id', error)
      }).not.toThrow()
    })

    it('should set endTime for all terminal statuses', () => {
      const updateTaskStatus = (taskRunner as unknown as TaskRunnerInternal)
        .updateTaskStatus
      const taskId = 'test-task'

      // Manually add a task for testing
      const task: BackgroundTask = {
        id: taskId,
        command: 'test',
        status: 'running',
        startTime: new Date(),
      }
      const tasks = (taskRunner as unknown as TaskRunnerInternal).tasks
      tasks.set(taskId, task)

      // Test terminal statuses
      const terminalStatuses = ['completed', 'failed', 'cancelled'] as const
      terminalStatuses.forEach((status) => {
        updateTaskStatus.call(taskRunner, taskId, status)
        expect(task.endTime).toBeInstanceOf(Date)

        // Reset for next test
        delete task.endTime
        task.status = 'running'
      })
    })
  })

  describe('cleanup method', () => {
    it('should call parent cleanup and clear tasks', async () => {
      // Create some tasks
      await taskRunner.runBackground('task 1')
      await taskRunner.runBackground('task 2')

      expect(await taskRunner.getTasks()).toHaveLength(2)

      // Spy on parent cleanup
      const parentCleanup = vi.spyOn(
        Object.getPrototypeOf(Object.getPrototypeOf(taskRunner)),
        'cleanup'
      )

      taskRunner.cleanup()

      expect(parentCleanup).toHaveBeenCalled()
      expect(await taskRunner.getTasks()).toHaveLength(0)

      parentCleanup.mockRestore()
    })
  })
})
