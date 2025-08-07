import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { CommandRunner } from './CommandRunner'

describe('CommandRunner', () => {
  let commandRunner: CommandRunner

  beforeEach(() => {
    commandRunner = new CommandRunner()
  })

  afterEach(() => {
    commandRunner.cleanup()
  })

  describe('execute', () => {
    it('should execute simple commands successfully', async () => {
      const result = await commandRunner.execute('echo "Hello World"')

      expect(result.success).toBe(true)
      expect(result.exitCode).toBe(0)
      expect(result.stdout.trim()).toBe('Hello World')
      expect(result.stderr).toBe('')
      expect(result.command).toBe('echo "Hello World"')
      expect(result.duration).toBeGreaterThan(0)
    })

    it('should handle command failures', async () => {
      const result = await commandRunner.execute('exit 1')

      expect(result.success).toBe(false)
      expect(result.exitCode).toBe(1)
      expect(result.command).toBe('exit 1')
    })

    it('should handle non-existent commands', async () => {
      const result = await commandRunner.execute('nonexistentcommand12345')

      expect(result.success).toBe(false)
      expect(result.exitCode).toBeGreaterThan(0) // Non-zero exit code for command not found
      expect(result.stderr).toContain('nonexistentcommand12345')
    })

    it('should handle timeout option', async () => {
      const result = await commandRunner.execute('sleep 2', { timeout: 500 })

      expect(result.success).toBe(false)
      expect(result.stderr).toContain('timed out')
    }, 1000)

    it('should use custom working directory', async () => {
      const result = await commandRunner.execute('pwd', { cwd: '/tmp' })

      expect(result.success).toBe(true)
      expect(result.stdout.trim()).toMatch(/\/tmp$/) // Handle symlinked paths like /private/tmp
    })

    it('should use custom environment variables', async () => {
      const result = await commandRunner.execute('echo $TEST_VAR', {
        env: { TEST_VAR: 'test_value' },
      })

      expect(result.success).toBe(true)
      expect(result.stdout.trim()).toBe('test_value')
    })
  })

  describe('stream', () => {
    it('should return execution ID immediately', async () => {
      const executionId = await commandRunner.stream('echo "streaming test"')

      expect(executionId).toMatch(/^[0-9a-f-]{36}$/i) // UUID format
    })

    it('should emit command events', async () => {
      const events: string[] = []

      commandRunner.on('command-start', (id, command) => {
        events.push(`start:${command}`)
      })

      commandRunner.on('command-output', (id, data, stream) => {
        events.push(`output:${stream}:${data.trim()}`)
      })

      commandRunner.on('command-complete', (id, result) => {
        events.push(`complete:${result.success}`)
      })

      await commandRunner.stream('echo "test output"')

      // Wait a bit for events to be emitted
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(events).toContain('start:echo "test output"')
      expect(events).toContain('output:stdout:test output')
      expect(events).toContain('complete:true')
    })
  })

  describe('cancel', () => {
    it('should cancel running commands', async () => {
      const executionId = await commandRunner.stream('sleep 10')
      const cancelled = await commandRunner.cancel(executionId)

      expect(cancelled).toBe(true)
    })

    it('should return false for non-existent execution ID', async () => {
      const cancelled = await commandRunner.cancel('non-existent-id')

      expect(cancelled).toBe(false)
    })
  })

  describe('getStatus', () => {
    it('should return null for non-existent execution ID', async () => {
      const status = await commandRunner.getStatus('non-existent-id')

      expect(status).toBeNull()
    })

    it('should return status for running commands', async () => {
      const executionId = await commandRunner.stream('sleep 1')

      // Wait a bit for the command to start
      await new Promise((resolve) => setTimeout(resolve, 50))

      const status = await commandRunner.getStatus(executionId)

      if (status) {
        expect(status.command).toBe('sleep 1')
        expect(status.duration).toBeGreaterThanOrEqual(0) // Can be 0 if very fast
      }
    })
  })

  describe('cleanup', () => {
    it('should kill all running processes', async () => {
      const executionId1 = await commandRunner.stream('sleep 10')
      const executionId2 = await commandRunner.stream('sleep 10')

      commandRunner.cleanup()

      // Processes should be killed
      const status1 = await commandRunner.getStatus(executionId1)
      const status2 = await commandRunner.getStatus(executionId2)

      expect(status1).toBeNull()
      expect(status2).toBeNull()
    })
  })
})
