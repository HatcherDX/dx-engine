import { CommandRunner } from './CommandRunner'
import { Logger } from '../utils/logger'
import { v4 as uuidv4 } from 'uuid'
import type {
  TaskCommandOptions,
  BackgroundTask,
  CommandResult,
  TaskRunner as TaskRunnerInterface,
  CommandProgress,
} from '../types/commands'

export class TaskRunner extends CommandRunner implements TaskRunnerInterface {
  private tasks = new Map<string, BackgroundTask>()
  protected logger = new Logger('TaskRunner')

  async runBackground(
    command: string,
    options: TaskCommandOptions = {}
  ): Promise<string> {
    const taskId = uuidv4()
    const task: BackgroundTask = {
      id: taskId,
      command,
      status: 'running',
      startTime: new Date(),
    }

    this.tasks.set(taskId, task)
    this.logger.info(`Starting background task ${taskId}: ${command}`)

    // Start command in background
    this.executeBackgroundTask(taskId, command, options).catch((error) => {
      this.logger.error(`Background task ${taskId} failed:`, error)
      this.updateTaskStatus(taskId, 'failed')
    })

    return taskId
  }

  async getTasks(): Promise<BackgroundTask[]> {
    return Array.from(this.tasks.values())
  }

  async getTask(taskId: string): Promise<BackgroundTask | null> {
    return this.tasks.get(taskId) || null
  }

  async cancelTask(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId)
    if (!task || task.status !== 'running') {
      return false
    }

    const cancelled = await this.cancel(taskId)
    if (cancelled) {
      this.updateTaskStatus(taskId, 'cancelled')
      this.logger.info(`Background task ${taskId} cancelled`)
    }

    return cancelled
  }

  async clearCompleted(): Promise<void> {
    const completedTasks = Array.from(this.tasks.entries()).filter(
      ([, task]) => task.status === 'completed' || task.status === 'failed'
    )

    for (const [taskId] of completedTasks) {
      this.tasks.delete(taskId)
    }

    this.logger.info(`Cleared ${completedTasks.length} completed tasks`)
  }

  private async executeBackgroundTask(
    taskId: string,
    command: string,
    options: TaskCommandOptions
  ): Promise<void> {
    const task = this.tasks.get(taskId)
    if (!task) return

    // Listen to command events
    const onProgress = (id: string, progress: CommandProgress) => {
      if (id === taskId) {
        this.updateTaskProgress(taskId, progress)
      }
    }

    const onComplete = (id: string, result: CommandResult) => {
      if (id === taskId) {
        this.updateTaskResult(taskId, result)
        this.off('command-progress', onProgress)
        this.off('command-complete', onComplete)
        this.off('command-error', onError)
      }
    }

    const onError = (id: string, error: Error) => {
      if (id === taskId) {
        this.updateTaskError(taskId, error)
        this.off('command-progress', onProgress)
        this.off('command-complete', onComplete)
        this.off('command-error', onError)
      }
    }

    this.on('command-progress', onProgress)
    this.on('command-complete', onComplete)
    this.on('command-error', onError)

    // Execute the command
    await this.stream(command, options)
  }

  private updateTaskStatus(
    taskId: string,
    status: BackgroundTask['status']
  ): void {
    const task = this.tasks.get(taskId)
    if (!task) return

    task.status = status
    if (
      status === 'completed' ||
      status === 'failed' ||
      status === 'cancelled'
    ) {
      task.endTime = new Date()
    }
  }

  private updateTaskProgress(taskId: string, progress: CommandProgress): void {
    const task = this.tasks.get(taskId)
    if (!task) return

    task.progress = progress
  }

  private updateTaskResult(taskId: string, result: CommandResult): void {
    const task = this.tasks.get(taskId)
    if (!task) return

    task.result = result
    task.status = result.success ? 'completed' : 'failed'
    task.endTime = new Date()
  }

  private updateTaskError(taskId: string, error: Error): void {
    const task = this.tasks.get(taskId)
    if (!task) return

    task.status = 'failed'
    task.endTime = new Date()
    task.result = {
      success: false,
      exitCode: -1,
      stdout: '',
      stderr: error.message,
      duration: Date.now() - task.startTime.getTime(),
      command: task.command,
    }
  }

  // Utility methods for different task categories
  async runBuild(
    buildCommand: string,
    options: TaskCommandOptions = {}
  ): Promise<string> {
    return this.runBackground(buildCommand, {
      ...options,
      category: 'build',
      priority: 'normal',
    })
  }

  async runTests(
    testCommand: string,
    options: TaskCommandOptions = {}
  ): Promise<string> {
    return this.runBackground(testCommand, {
      ...options,
      category: 'test',
      priority: 'high',
    })
  }

  async runDeploy(
    deployCommand: string,
    options: TaskCommandOptions = {}
  ): Promise<string> {
    return this.runBackground(deployCommand, {
      ...options,
      category: 'deploy',
      priority: 'high',
    })
  }

  async runAnalysis(
    analysisCommand: string,
    options: TaskCommandOptions = {}
  ): Promise<string> {
    return this.runBackground(analysisCommand, {
      ...options,
      category: 'analysis',
      priority: 'low',
      background: true,
    })
  }

  // Get tasks by category
  async getTasksByCategory(
    category?: TaskCommandOptions['category']
  ): Promise<BackgroundTask[]> {
    const allTasks = await this.getTasks()
    return allTasks.filter((task) => {
      // Simple category matching - in a real implementation you'd store category in task
      if (!category) return true

      const cmd = task.command.toLowerCase()
      switch (category) {
        case 'build':
          return cmd.includes('build') || cmd.includes('compile')
        case 'test':
          return cmd.includes('test') || cmd.includes('spec')
        case 'deploy':
          return cmd.includes('deploy') || cmd.includes('publish')
        case 'analysis':
          return (
            cmd.includes('lint') ||
            cmd.includes('analyze') ||
            cmd.includes('audit')
          )
        default:
          return true
      }
    })
  }

  // Get running tasks count
  async getRunningTasksCount(): Promise<number> {
    const tasks = await this.getTasks()
    return tasks.filter((task) => task.status === 'running').length
  }

  // Get task statistics
  async getTaskStats(): Promise<{
    total: number
    running: number
    completed: number
    failed: number
    cancelled: number
  }> {
    const tasks = await this.getTasks()

    return {
      total: tasks.length,
      running: tasks.filter((t) => t.status === 'running').length,
      completed: tasks.filter((t) => t.status === 'completed').length,
      failed: tasks.filter((t) => t.status === 'failed').length,
      cancelled: tasks.filter((t) => t.status === 'cancelled').length,
    }
  }

  // Cleanup all tasks
  cleanup(): void {
    super.cleanup()
    this.tasks.clear()
    this.logger.info('All background tasks cleared')
  }
}
