/**
 * @fileoverview Tests for commands module exports.
 *
 * @description
 * Validates that all command-related exports are properly available through the main
 * index file. This ensures the public API surface is correctly exposed for consumers.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { describe, it, expect } from 'vitest'
import * as CommandsModule from './index'

describe('Commands Module Exports', () => {
  describe('Class Exports', () => {
    it('should export CommandRunner class', () => {
      expect(CommandsModule.CommandRunner).toBeDefined()
      expect(typeof CommandsModule.CommandRunner).toBe('function')
    })

    it('should export GitRunner class', () => {
      expect(CommandsModule.GitRunner).toBeDefined()
      expect(typeof CommandsModule.GitRunner).toBe('function')
    })

    it('should export TaskRunner class', () => {
      expect(CommandsModule.TaskRunner).toBeDefined()
      expect(typeof CommandsModule.TaskRunner).toBe('function')
    })
  })

  describe('Module Structure', () => {
    it('should export all expected main classes', () => {
      const expectedExports = ['CommandRunner', 'GitRunner', 'TaskRunner']

      expectedExports.forEach((exportName) => {
        expect(CommandsModule).toHaveProperty(exportName)
        expect(
          typeof CommandsModule[exportName as keyof typeof CommandsModule]
        ).toBe('function')
      })
    })

    it('should be able to instantiate exported classes', () => {
      expect(() => new CommandsModule.CommandRunner()).not.toThrow()
      expect(() => new CommandsModule.GitRunner()).not.toThrow()
      expect(() => new CommandsModule.TaskRunner()).not.toThrow()
    })
  })

  describe('Class Inheritance', () => {
    it('should verify GitRunner extends CommandRunner', () => {
      const gitRunner = new CommandsModule.GitRunner()
      expect(gitRunner).toBeInstanceOf(CommandsModule.CommandRunner)
    })

    it('should verify TaskRunner extends CommandRunner', () => {
      const taskRunner = new CommandsModule.TaskRunner()
      expect(taskRunner).toBeInstanceOf(CommandsModule.CommandRunner)
    })
  })

  describe('Common Interface Methods', () => {
    it('should verify all runners have execute method', () => {
      const commandRunner = new CommandsModule.CommandRunner()
      const gitRunner = new CommandsModule.GitRunner()
      const taskRunner = new CommandsModule.TaskRunner()

      expect(typeof commandRunner.execute).toBe('function')
      expect(typeof gitRunner.execute).toBe('function')
      expect(typeof taskRunner.execute).toBe('function')
    })

    it('should verify all runners have cleanup method', () => {
      const commandRunner = new CommandsModule.CommandRunner()
      const gitRunner = new CommandsModule.GitRunner()
      const taskRunner = new CommandsModule.TaskRunner()

      expect(typeof commandRunner.cleanup).toBe('function')
      expect(typeof gitRunner.cleanup).toBe('function')
      expect(typeof taskRunner.cleanup).toBe('function')

      // Clean up instances to prevent resource leaks
      commandRunner.cleanup()
      gitRunner.cleanup()
      taskRunner.cleanup()
    })
  })

  describe('GitRunner Specific Methods', () => {
    it('should verify GitRunner has Git-specific methods', () => {
      const gitRunner = new CommandsModule.GitRunner()

      const gitMethods = [
        'status',
        'add',
        'commit',
        'push',
        'pull',
        'branch',
        'checkout',
        'quickCommit',
      ]

      gitMethods.forEach((method) => {
        expect(typeof gitRunner[method as keyof CommandsModule.GitRunner]).toBe(
          'function'
        )
      })

      gitRunner.cleanup()
    })
  })

  describe('TaskRunner Specific Methods', () => {
    it('should verify TaskRunner has task management methods', () => {
      const taskRunner = new CommandsModule.TaskRunner()

      const taskMethods = [
        'runBackground',
        'getTasks',
        'getTask',
        'cancelTask',
        'clearCompleted',
      ]

      taskMethods.forEach((method) => {
        expect(
          typeof taskRunner[method as keyof CommandsModule.TaskRunner]
        ).toBe('function')
      })

      taskRunner.cleanup()
    })

    it('should verify TaskRunner has utility methods', () => {
      const taskRunner = new CommandsModule.TaskRunner()

      const utilityMethods = [
        'runBuild',
        'runTests',
        'runDeploy',
        'runAnalysis',
        'getTasksByCategory',
        'getRunningTasksCount',
        'getTaskStats',
      ]

      utilityMethods.forEach((method) => {
        expect(
          typeof taskRunner[method as keyof CommandsModule.TaskRunner]
        ).toBe('function')
      })

      taskRunner.cleanup()
    })
  })
})
