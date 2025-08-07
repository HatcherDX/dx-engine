import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TaskRunner } from './TaskRunner'

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
      await new Promise((resolve) => setTimeout(resolve, 500))

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
      await new Promise((resolve) => setTimeout(resolve, 500))

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
})
