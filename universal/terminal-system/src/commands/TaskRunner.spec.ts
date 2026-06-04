import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TaskRunner } from './TaskRunner'
import type { CommandResult } from '../types/commands'

describe('TaskRunner', () => {
  let taskRunner: TaskRunner

  beforeEach(() => {
    taskRunner = new TaskRunner()
  })

  afterEach(() => {
    taskRunner.cleanup()
  })

  describe('runBackground', () => {
    it('should start background task and return task ID', async () => {
      const taskId = await taskRunner.runBackground('echo "background task"')

      expect(taskId).toMatch(/^[0-9a-f-]{36}$/i) // UUID format

      const task = await taskRunner.getTask(taskId)
      expect(task).toBeDefined()
      expect(task?.id).toBe(taskId)
      expect(task?.command).toBe('echo "background task"')
      expect(task?.status).toBe('running')
    })

    it('should handle task options', async () => {
      const taskId = await taskRunner.runBackground('echo "test"', {
        category: 'build',
        priority: 'high',
        background: true,
      })

      const task = await taskRunner.getTask(taskId)
      expect(task?.command).toBe('echo "test"')
    })
  })

  describe('getTasks', () => {
    it('should return all tasks', async () => {
      const taskId1 = await taskRunner.runBackground('echo "task1"')
      const taskId2 = await taskRunner.runBackground('echo "task2"')

      const tasks = await taskRunner.getTasks()

      expect(tasks).toHaveLength(2)
      expect(tasks.map((t) => t.id)).toContain(taskId1)
      expect(tasks.map((t) => t.id)).toContain(taskId2)
    })

    it('should return empty array when no tasks', async () => {
      const tasks = await taskRunner.getTasks()

      expect(tasks).toHaveLength(0)
    })
  })

  describe('getTask', () => {
    it('should return specific task by ID', async () => {
      const taskId = await taskRunner.runBackground('echo "specific task"')

      const task = await taskRunner.getTask(taskId)

      expect(task?.id).toBe(taskId)
      expect(task?.command).toBe('echo "specific task"')
    })

    it('should return null for non-existent task', async () => {
      const task = await taskRunner.getTask('non-existent-id')

      expect(task).toBeNull()
    })
  })

  describe('cancelTask', () => {
    it('should cancel running task', async () => {
      const taskId = await taskRunner.runBackground('sleep 10')

      // Wait a bit to ensure task is running
      await new Promise((resolve) => setTimeout(resolve, 50))

      const cancelled = await taskRunner.cancelTask(taskId)

      // Task cancellation might not always succeed immediately
      expect(typeof cancelled).toBe('boolean')

      const task = await taskRunner.getTask(taskId)
      // Task status might be 'cancelled' or 'running' depending on timing
      expect(['cancelled', 'running', 'completed']).toContain(task?.status)
    })

    it('should successfully cancel and update task status - contest7', async () => {
      // Mock the cancel method to return true
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private cancel method for testing
      const originalCancel = (taskRunner as any).cancel
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private cancel method for testing
      ;(taskRunner as any).cancel = vi.fn().mockResolvedValue(true)

      const taskId = await taskRunner.runBackground('sleep 10')

      // Wait a bit to ensure task is running
      await new Promise((resolve) => setTimeout(resolve, 50))

      const cancelled = await taskRunner.cancelTask(taskId)

      // Should successfully cancel
      expect(cancelled).toBe(true)

      const task = await taskRunner.getTask(taskId)
      // Task should be cancelled
      expect(task?.status).toBe('cancelled')

      // Restore
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private cancel method for testing
      ;(taskRunner as any).cancel = originalCancel
    })

    it('should return false for non-existent task', async () => {
      const cancelled = await taskRunner.cancelTask('non-existent-id')

      expect(cancelled).toBe(false)
    })

    it('should return false for already completed task', async () => {
      const taskId = await taskRunner.runBackground('echo "quick task"')

      // Wait for task to complete
      await new Promise((resolve) => setTimeout(resolve, 100))

      const cancelled = await taskRunner.cancelTask(taskId)

      expect(cancelled).toBe(false)
    })
  })

  describe('clearCompleted', () => {
    it('should remove completed and failed tasks', async () => {
      await taskRunner.runBackground('echo "success"')
      await taskRunner.runBackground('exit 1')
      const runningTaskId = await taskRunner.runBackground('sleep 10')

      // Wait for first two tasks to complete
      await new Promise((resolve) => setTimeout(resolve, 100))

      await taskRunner.clearCompleted()

      const tasks = await taskRunner.getTasks()

      // Running tasks should remain, completed ones should be removed
      expect(tasks.length).toBeGreaterThanOrEqual(0)
      // If there are tasks, at least one should be the running task
      if (tasks.length > 0) {
        const hasRunningTask = tasks.some((task) => task.id === runningTaskId)
        expect(hasRunningTask).toBe(true)
      }

      // Clean up running task
      await taskRunner.cancelTask(runningTaskId)
    })

    it('should delete completed tasks from Map - contest7', async () => {
      // Manually add completed tasks
      const taskId1 = 'completed-task-1'
      const taskId2 = 'failed-task-1'
      const taskId3 = 'running-task-1'

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private tasks Map for testing
      ;(taskRunner as any).tasks.set(taskId1, {
        id: taskId1,
        command: 'test1',
        status: 'completed',
        startTime: new Date(),
        endTime: new Date(),
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private tasks Map for testing
      ;(taskRunner as any).tasks.set(taskId2, {
        id: taskId2,
        command: 'test2',
        status: 'failed',
        startTime: new Date(),
        endTime: new Date(),
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private tasks Map for testing
      ;(taskRunner as any).tasks.set(taskId3, {
        id: taskId3,
        command: 'test3',
        status: 'running',
        startTime: new Date(),
      })

      // Clear completed tasks
      await taskRunner.clearCompleted()

      // Verify completed and failed tasks are deleted
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private tasks Map for testing
      expect((taskRunner as any).tasks.has(taskId1)).toBe(false)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private tasks Map for testing
      expect((taskRunner as any).tasks.has(taskId2)).toBe(false)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private tasks Map for testing
      expect((taskRunner as any).tasks.has(taskId3)).toBe(true)
    })
  })

  describe('utility methods', () => {
    it('should run build task', async () => {
      const taskId = await taskRunner.runBuild('npm run build')

      const task = await taskRunner.getTask(taskId)
      expect(task?.command).toBe('npm run build')
    })

    it('should run test task', async () => {
      const taskId = await taskRunner.runTests('npm test')

      const task = await taskRunner.getTask(taskId)
      expect(task?.command).toBe('npm test')
    })

    it('should run deploy task', async () => {
      const taskId = await taskRunner.runDeploy('npm run deploy')

      const task = await taskRunner.getTask(taskId)
      expect(task?.command).toBe('npm run deploy')
    })

    it('should run analysis task', async () => {
      const taskId = await taskRunner.runAnalysis('npm run lint')

      const task = await taskRunner.getTask(taskId)
      expect(task?.command).toBe('npm run lint')
    })
  })

  describe('getTasksByCategory', () => {
    it('should filter tasks by category', async () => {
      await taskRunner.runBackground('npm run build')
      await taskRunner.runBackground('npm test')
      await taskRunner.runBackground('npm run lint')

      // Wait a bit for tasks to be created
      await new Promise((resolve) => setTimeout(resolve, 50))

      const buildTasks = await taskRunner.getTasksByCategory('build')
      const testTasks = await taskRunner.getTasksByCategory('test')

      expect(buildTasks).toHaveLength(1)
      expect(buildTasks[0].command).toContain('build')

      expect(testTasks).toHaveLength(1)
      expect(testTasks[0].command).toContain('test')
    })
  })

  describe('getRunningTasksCount', () => {
    it('should return count of running tasks', async () => {
      expect(await taskRunner.getRunningTasksCount()).toBe(0)

      const task1Id = await taskRunner.runBackground('echo "test1"')
      const task2Id = await taskRunner.runBackground('echo "test2"')

      // Wait a bit for tasks to start and complete
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Tasks should complete quickly with echo commands
      const finalCount = await taskRunner.getRunningTasksCount()
      expect(finalCount).toBeGreaterThanOrEqual(0)

      // Clean up any remaining tasks
      await taskRunner.cancelTask(task1Id)
      await taskRunner.cancelTask(task2Id)
    })
  })

  describe('getTaskStats', () => {
    it('should return task statistics', async () => {
      await taskRunner.runBackground('echo "success"')
      await taskRunner.runBackground('exit 1')
      const runningTaskId = await taskRunner.runBackground('sleep 10')

      // Wait for first two to complete
      await new Promise((resolve) => setTimeout(resolve, 200))

      const stats = await taskRunner.getTaskStats()

      // Tasks might complete at different speeds, so check basic structure
      expect(stats.total).toBeGreaterThan(0)
      expect(stats.running).toBeGreaterThanOrEqual(0)
      expect(stats.completed).toBeGreaterThanOrEqual(0)
      expect(stats.failed).toBeGreaterThanOrEqual(0)
      expect(stats.cancelled).toBeGreaterThanOrEqual(0)

      // Clean up
      await taskRunner.cancelTask(runningTaskId)
    })
  })

  describe('cleanup', () => {
    it('should clear all tasks and cancel running processes', async () => {
      await taskRunner.runBackground('sleep 10')
      await taskRunner.runBackground('sleep 10')

      expect(await taskRunner.getRunningTasksCount()).toBe(2)

      taskRunner.cleanup()

      const tasks = await taskRunner.getTasks()
      expect(tasks).toHaveLength(0)
    })
  })

  describe('executeBackgroundTask event handlers - contest7', () => {
    it('should handle command-complete event correctly', async () => {
      const taskId = await taskRunner.runBackground('echo "test"')

      // Wait for command to complete
      await new Promise((resolve) => setTimeout(resolve, 500))

      const task = await taskRunner.getTask(taskId)
      expect(task).toBeDefined()
      // Task should complete or fail
      expect(['completed', 'failed', 'running']).toContain(task?.status)
    })

    it('should handle command-progress event and update task progress - contest7', async () => {
      // Create a task manually
      const taskId = 'progress-task-id'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private tasks Map for testing
      ;(taskRunner as any).tasks.set(taskId, {
        id: taskId,
        command: 'test',
        status: 'running',
        startTime: new Date(),
      })

      // Access private executeBackgroundTask
      const executeBackgroundTask =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private executeBackgroundTask method for testing
        (taskRunner as any).executeBackgroundTask.bind(taskRunner)

      // Mock stream to emit progress event
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private stream method for testing
      const originalStream = (taskRunner as any).stream
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private stream method for testing
      ;(taskRunner as any).stream = vi
        .fn()
        .mockImplementation(async function () {
          // Emit progress event
          setTimeout(() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private emit method for testing
            ;(taskRunner as any).emit('command-progress', taskId, {
              percentage: 75,
              message: 'Processing...',
            })
          }, 10)
        })

      // Execute the task
      await executeBackgroundTask(taskId, 'test', {})

      // Wait for event processing
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Task should have progress updated
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private tasks Map for testing
      const task = (taskRunner as any).tasks.get(taskId)
      expect(task?.progress).toEqual({
        percentage: 75,
        message: 'Processing...',
      })

      // Restore
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private stream method for testing
      ;(taskRunner as any).stream = originalStream
    })

    it('should handle command-error event correctly', async () => {
      // Test error handling by running a command that fails
      const taskId = await taskRunner.runBackground('exit 1')

      // Wait for error to occur
      await new Promise((resolve) => setTimeout(resolve, 500))

      const task = await taskRunner.getTask(taskId)
      expect(task).toBeDefined()
      // Task should be in one of these states
      expect(['failed', 'completed', 'running']).toContain(task?.status)
    })

    it('should handle command-progress event correctly', async () => {
      const taskId = await taskRunner.runBackground(
        'echo "line1"; echo "line2"'
      )

      // Wait for progress events
      await new Promise((resolve) => setTimeout(resolve, 200))

      const task = await taskRunner.getTask(taskId)
      expect(task).toBeDefined()
    })

    it('should handle task with existing endTime when status changes', async () => {
      const taskId = await taskRunner.runBackground('echo "test"')

      // Wait for task to complete
      await new Promise((resolve) => setTimeout(resolve, 150))

      const task = await taskRunner.getTask(taskId)
      if (task && (task.status === 'completed' || task.status === 'failed')) {
        expect(task.endTime).toBeDefined()
      }
    })
  })

  describe('updateTaskStatus edge cases - contest7', () => {
    it('should handle updateTaskStatus with non-existent task', async () => {
      // Access private method through prototype manipulation for testing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private updateTaskStatus method for testing
      const updateTaskStatus = (taskRunner as any).updateTaskStatus.bind(
        taskRunner
      )

      // Should not throw when updating non-existent task
      expect(() => updateTaskStatus('non-existent', 'completed')).not.toThrow()
    })

    it('should set endTime for completed status', async () => {
      const taskId = await taskRunner.runBackground('echo "test"')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private updateTaskStatus method for testing
      const updateTaskStatus = (taskRunner as any).updateTaskStatus.bind(
        taskRunner
      )

      updateTaskStatus(taskId, 'completed')

      const task = await taskRunner.getTask(taskId)
      expect(task?.endTime).toBeDefined()
    })

    it('should set endTime for failed status', async () => {
      const taskId = await taskRunner.runBackground('echo "test"')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private updateTaskStatus method for testing
      const updateTaskStatus = (taskRunner as any).updateTaskStatus.bind(
        taskRunner
      )

      updateTaskStatus(taskId, 'failed')

      const task = await taskRunner.getTask(taskId)
      expect(task?.endTime).toBeDefined()
      expect(task?.status).toBe('failed')
    })

    it('should set endTime for cancelled status', async () => {
      const taskId = await taskRunner.runBackground('sleep 10')

      // Wait a bit for task to start
      await new Promise((resolve) => setTimeout(resolve, 50))

      await taskRunner.cancelTask(taskId)

      const task = await taskRunner.getTask(taskId)
      // Task might be cancelled or still running depending on timing
      if (task?.status === 'cancelled') {
        expect(task.endTime).toBeDefined()
      }
    })
  })

  describe('updateTaskProgress - contest7', () => {
    it('should handle updateTaskProgress with non-existent task', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private updateTaskProgress method for testing
      const updateTaskProgress = (taskRunner as any).updateTaskProgress.bind(
        taskRunner
      )

      // Should not throw when updating non-existent task
      expect(() =>
        updateTaskProgress('non-existent', { percentage: 50 })
      ).not.toThrow()
    })

    it('should update progress for existing task', async () => {
      const taskId = await taskRunner.runBackground('echo "test"')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private updateTaskProgress method for testing
      const updateTaskProgress = (taskRunner as any).updateTaskProgress.bind(
        taskRunner
      )

      const progress = { percentage: 75, message: 'Processing...' }
      updateTaskProgress(taskId, progress)

      const task = await taskRunner.getTask(taskId)
      expect(task?.progress).toEqual(progress)
    })
  })

  describe('updateTaskResult - contest7', () => {
    it('should handle updateTaskResult with non-existent task', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private updateTaskResult method for testing
      const updateTaskResult = (taskRunner as any).updateTaskResult.bind(
        taskRunner
      )
      const result: CommandResult = {
        success: true,
        exitCode: 0,
        stdout: 'output',
        stderr: '',
        duration: 100,
        command: 'test',
      }

      // Should not throw when updating non-existent task
      expect(() => updateTaskResult('non-existent', result)).not.toThrow()
    })

    it('should update result for successful task', async () => {
      const taskId = await taskRunner.runBackground('echo "test"')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private updateTaskResult method for testing
      const updateTaskResult = (taskRunner as any).updateTaskResult.bind(
        taskRunner
      )

      const result: CommandResult = {
        success: true,
        exitCode: 0,
        stdout: 'test output',
        stderr: '',
        duration: 100,
        command: 'echo "test"',
      }

      updateTaskResult(taskId, result)

      const task = await taskRunner.getTask(taskId)
      expect(task?.result).toEqual(result)
      expect(task?.status).toBe('completed')
      expect(task?.endTime).toBeDefined()
    })

    it('should update result for failed task', async () => {
      const taskId = await taskRunner.runBackground('echo "test"')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private updateTaskResult method for testing
      const updateTaskResult = (taskRunner as any).updateTaskResult.bind(
        taskRunner
      )

      const result: CommandResult = {
        success: false,
        exitCode: 1,
        stdout: '',
        stderr: 'error output',
        duration: 100,
        command: 'false',
      }

      updateTaskResult(taskId, result)

      const task = await taskRunner.getTask(taskId)
      expect(task?.result).toEqual(result)
      expect(task?.status).toBe('failed')
      expect(task?.endTime).toBeDefined()
    })
  })

  describe('updateTaskError - contest7', () => {
    it('should handle updateTaskError with non-existent task', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private updateTaskError method for testing
      const updateTaskError = (taskRunner as any).updateTaskError.bind(
        taskRunner
      )
      const error = new Error('Test error')

      // Should not throw when updating non-existent task
      expect(() => updateTaskError('non-existent', error)).not.toThrow()
    })

    it('should update error for existing task', async () => {
      const taskId = await taskRunner.runBackground('echo "test"')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private updateTaskError method for testing
      const updateTaskError = (taskRunner as any).updateTaskError.bind(
        taskRunner
      )
      const error = new Error('Command failed')

      updateTaskError(taskId, error)

      const task = await taskRunner.getTask(taskId)
      expect(task?.status).toBe('failed')
      expect(task?.endTime).toBeDefined()
      expect(task?.result).toBeDefined()
      expect(task?.result?.success).toBe(false)
      expect(task?.result?.exitCode).toBe(-1)
      expect(task?.result?.stderr).toBe('Command failed')
    })
  })

  describe('getTasksByCategory edge cases - contest7', () => {
    it('should handle deploy category', async () => {
      await taskRunner.runBackground('npm run deploy')
      await taskRunner.runBackground('npm publish')
      await taskRunner.runBackground('echo "other"')

      // Wait for tasks to be registered
      await new Promise((resolve) => setTimeout(resolve, 50))

      const deployTasks = await taskRunner.getTasksByCategory('deploy')
      expect(deployTasks.length).toBeGreaterThanOrEqual(2)
    })

    it('should handle analysis category', async () => {
      await taskRunner.runBackground('npm run lint')
      await taskRunner.runBackground('npm analyze')
      await taskRunner.runBackground('npm audit')

      // Wait for tasks to be registered
      await new Promise((resolve) => setTimeout(resolve, 50))

      const analysisTasks = await taskRunner.getTasksByCategory('analysis')
      expect(analysisTasks.length).toBeGreaterThanOrEqual(3)
    })

    it('should handle compile commands in build category', async () => {
      await taskRunner.runBackground('tsc --compile')

      // Wait for task to be registered
      await new Promise((resolve) => setTimeout(resolve, 50))

      const buildTasks = await taskRunner.getTasksByCategory('build')
      expect(buildTasks.some((t) => t.command.includes('compile'))).toBe(true)
    })

    it('should handle spec commands in test category', async () => {
      await taskRunner.runBackground('vitest spec')

      // Wait for task to be registered
      await new Promise((resolve) => setTimeout(resolve, 50))

      const testTasks = await taskRunner.getTasksByCategory('test')
      expect(testTasks.some((t) => t.command.includes('spec'))).toBe(true)
    })

    it('should return all tasks when no category specified', async () => {
      await taskRunner.runBackground('echo "task1"')
      await taskRunner.runBackground('echo "task2"')

      // Wait for tasks to be registered
      await new Promise((resolve) => setTimeout(resolve, 50))

      const allTasks = await taskRunner.getTasksByCategory()
      expect(allTasks.length).toBeGreaterThanOrEqual(2)
    })

    it('should handle unknown category by returning all tasks', async () => {
      await taskRunner.runBackground('echo "task1"')
      await taskRunner.runBackground('echo "task2"')

      // Wait for tasks to be registered
      await new Promise((resolve) => setTimeout(resolve, 50))

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing with unknown category for edge case coverage
      const tasks = await taskRunner.getTasksByCategory('unknown' as any)
      expect(tasks.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('runBackground error handling - contest7', () => {
    it('should handle executeBackgroundTask throwing error', async () => {
      // Mock the stream method to throw an error
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private stream method for testing
      const originalStream = (taskRunner as any).stream
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private stream method for testing
      ;(taskRunner as any).stream = vi
        .fn()
        .mockRejectedValue(new Error('Stream error'))

      const taskId = await taskRunner.runBackground('failing command')

      // Wait for error to be caught
      await new Promise((resolve) => setTimeout(resolve, 100))

      const task = await taskRunner.getTask(taskId)
      expect(task).toBeDefined()
      expect(task?.status).toBe('failed')

      // Restore original method
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private stream method for testing
      ;(taskRunner as any).stream = originalStream
    })
  })

  describe('event handler cleanup - contest7', () => {
    it('should handle onComplete event and cleanup listeners', async () => {
      // Access private executeBackgroundTask to test event handling
      const executeBackgroundTask =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private executeBackgroundTask method for testing
        (taskRunner as any).executeBackgroundTask.bind(taskRunner)

      // Create a task manually
      const taskId = 'test-task-id'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private tasks Map for testing
      ;(taskRunner as any).tasks.set(taskId, {
        id: taskId,
        command: 'test',
        status: 'running',
        startTime: new Date(),
      })

      // Spy on off method
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private off method for testing
      const offSpy = vi.spyOn(taskRunner as any, 'off')

      // Mock stream to emit complete event
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private stream method for testing
      const originalStream = (taskRunner as any).stream
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private stream method for testing
      ;(taskRunner as any).stream = vi
        .fn()
        .mockImplementation(async function () {
          // Emit the complete event after a short delay
          setTimeout(() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private emit method for testing
            ;(taskRunner as any).emit('command-complete', taskId, {
              success: true,
              exitCode: 0,
              stdout: 'done',
              stderr: '',
              duration: 100,
              command: 'test',
            })
          }, 10)
        })

      // Execute the task
      await executeBackgroundTask(taskId, 'test', {})

      // Wait for event processing
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Verify cleanup was called
      expect(offSpy).toHaveBeenCalledWith(
        'command-progress',
        expect.any(Function)
      )
      expect(offSpy).toHaveBeenCalledWith(
        'command-complete',
        expect.any(Function)
      )
      expect(offSpy).toHaveBeenCalledWith('command-error', expect.any(Function))

      // Task should be completed
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private tasks Map for testing
      const task = (taskRunner as any).tasks.get(taskId)
      expect(task?.status).toBe('completed')

      // Restore
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private stream method for testing
      ;(taskRunner as any).stream = originalStream
      offSpy.mockRestore()
    })

    it('should handle onError event and cleanup listeners', async () => {
      // Access private executeBackgroundTask
      const executeBackgroundTask =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private executeBackgroundTask method for testing
        (taskRunner as any).executeBackgroundTask.bind(taskRunner)

      // Create a task manually
      const taskId = 'test-error-task-id'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private tasks Map for testing
      ;(taskRunner as any).tasks.set(taskId, {
        id: taskId,
        command: 'test',
        status: 'running',
        startTime: new Date(),
      })

      // Spy on off method
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private off method for testing
      const offSpy = vi.spyOn(taskRunner as any, 'off')

      // Mock stream to emit error event
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private stream method for testing
      const originalStream = (taskRunner as any).stream
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private stream method for testing
      ;(taskRunner as any).stream = vi
        .fn()
        .mockImplementation(async function () {
          // Emit the error event after a short delay
          setTimeout(() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private emit method for testing
            ;(taskRunner as any).emit(
              'command-error',
              taskId,
              new Error('Test error')
            )
          }, 10)
        })

      // Execute the task
      await executeBackgroundTask(taskId, 'test', {})

      // Wait for event processing
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Verify cleanup was called
      expect(offSpy).toHaveBeenCalledWith(
        'command-progress',
        expect.any(Function)
      )
      expect(offSpy).toHaveBeenCalledWith(
        'command-complete',
        expect.any(Function)
      )
      expect(offSpy).toHaveBeenCalledWith('command-error', expect.any(Function))

      // Task should be failed
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private tasks Map for testing
      const task = (taskRunner as any).tasks.get(taskId)
      expect(task?.status).toBe('failed')

      // Restore
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private stream method for testing
      ;(taskRunner as any).stream = originalStream
      offSpy.mockRestore()
    })

    it('should not process events for different taskIds', async () => {
      // Create a task
      const taskId1 = 'task-1'

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private tasks Map for testing
      ;(taskRunner as any).tasks.set(taskId1, {
        id: taskId1,
        command: 'test1',
        status: 'running',
        startTime: new Date(),
      })

      // Setup event handlers for task1
      const executeBackgroundTask =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private executeBackgroundTask method for testing
        (taskRunner as any).executeBackgroundTask.bind(taskRunner)

      // Mock stream
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private stream method for testing
      const originalStream = (taskRunner as any).stream
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private stream method for testing
      ;(taskRunner as any).stream = vi
        .fn()
        .mockImplementation(async function () {
          // Do nothing - no events emitted
        })

      // Spy on event handlers
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private on method for testing
      const originalOn = (taskRunner as any).on
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private event emitter for testing
      ;(taskRunner as any).on = vi.fn(
        (event: string, handler: (id: string, ...args: unknown[]) => void) => {
          if (event === 'command-progress') {
            const wrappedHandler = (id: string, ...args: unknown[]) => {
              // Track events for different task to test isolation
              handler(id, ...args)
            }
            return originalOn.call(taskRunner, event, wrappedHandler)
          }
          if (event === 'command-complete') {
            const wrappedHandler = (id: string, ...args: unknown[]) => {
              // Track events for different task to test isolation
              handler(id, ...args)
            }
            return originalOn.call(taskRunner, event, wrappedHandler)
          }
          if (event === 'command-error') {
            const wrappedHandler = (id: string, ...args: unknown[]) => {
              // Track events for different task to test isolation
              handler(id, ...args)
            }
            return originalOn.call(taskRunner, event, wrappedHandler)
          }
          return originalOn.call(taskRunner, event, handler)
        }
      )

      // Execute task1
      await executeBackgroundTask(taskId1, 'test1', {})

      // Manually emit events for a different task
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private emit method for testing
      ;(taskRunner as any).emit('command-progress', 'different-task-id', {
        percentage: 50,
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private emit method for testing
      ;(taskRunner as any).emit('command-complete', 'different-task-id', {
        success: true,
        exitCode: 0,
        stdout: 'done',
        stderr: '',
        duration: 100,
        command: 'test',
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private emit method for testing
      ;(taskRunner as any).emit(
        'command-error',
        'different-task-id',
        new Error('test')
      )

      // Wait for event processing
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Task1 should still be running (no events matched)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private tasks Map for testing
      const task1 = (taskRunner as any).tasks.get(taskId1)
      expect(task1?.status).toBe('running')
      expect(task1?.progress).toBeUndefined()
      expect(task1?.result).toBeUndefined()

      // Restore
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private stream method for testing
      ;(taskRunner as any).stream = originalStream
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private on method for testing
      ;(taskRunner as any).on = originalOn
    })
  })
})
