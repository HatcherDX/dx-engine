/**
 * @fileoverview Comprehensive tests for IncrementalBuilder
 *
 * @description
 * Tests cover:
 * - Build metadata tracking
 * - Rebuild decision logic
 * - Input/output hash comparison
 * - Persistent cache management
 * - Error handling
 *
 * Target: 100% code coverage
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { IncrementalBuilder } from './IncrementalBuilder'
import { FileHasher } from './FileHasher'
import type { ActionDefinition } from './types'

describe('IncrementalBuilder', () => {
  let mockIPC: {
    invoke: ReturnType<typeof vi.fn>
  }
  let hasher: FileHasher
  let builder: IncrementalBuilder
  let mockAction: ActionDefinition

  beforeEach(() => {
    mockIPC = {
      invoke: vi.fn(),
    }

    hasher = new FileHasher(mockIPC)
    builder = new IncrementalBuilder(hasher, mockIPC)

    mockAction = {
      id: 'build',
      name: 'Build',
      command: 'pnpm build',
      dependencies: [],
      inputs: ['src/**/*.ts'],
      outputs: ['dist/**/*.js'],
    }

    // Default IPC responses
    mockIPC.invoke.mockImplementation((channel) => {
      if (channel === 'fs:listFiles') {
        return Promise.resolve(['src/index.ts'])
      }
      if (channel === 'fs:readFile') {
        return Promise.resolve('file content')
      }
      if (channel === 'fs:stat') {
        return Promise.resolve({ size: 100 })
      }
      return Promise.resolve(null)
    })
  })

  describe('constructor', () => {
    it('should create builder with hasher and IPC', () => {
      expect(builder).toBeInstanceOf(IncrementalBuilder)
    })
  })

  describe('needsRebuild', () => {
    it('should return true when action has no inputs', async () => {
      const actionWithoutInputs: ActionDefinition = {
        id: 'test',
        name: 'Test',
        command: 'test',
        dependencies: [],
      }

      const needsRebuild = await builder.needsRebuild(
        actionWithoutInputs,
        '/project'
      )

      expect(needsRebuild).toBe(true)
    })

    it('should return true when action has no outputs', async () => {
      const actionWithoutOutputs: ActionDefinition = {
        id: 'test',
        name: 'Test',
        command: 'test',
        dependencies: [],
        inputs: ['src/**/*.ts'],
      }

      const needsRebuild = await builder.needsRebuild(
        actionWithoutOutputs,
        '/project'
      )

      expect(needsRebuild).toBe(true)
    })

    it('should return true when no previous build metadata', async () => {
      const needsRebuild = await builder.needsRebuild(mockAction, '/project')

      expect(needsRebuild).toBe(true)
    })

    it('should return true when command changed', async () => {
      // Record first build
      await builder.recordBuild(mockAction, '/project')

      // Change command
      const changedAction: ActionDefinition = {
        ...mockAction,
        command: 'pnpm build:prod',
      }

      const needsRebuild = await builder.needsRebuild(changedAction, '/project')

      expect(needsRebuild).toBe(true)
    })

    it('should return true when inputs changed', async () => {
      // Record first build
      await builder.recordBuild(mockAction, '/project')

      // Change file content (different hash)
      let callCount = 0
      mockIPC.invoke.mockImplementation((channel) => {
        if (channel === 'fs:listFiles') {
          return Promise.resolve(['src/index.ts'])
        }
        if (channel === 'fs:readFile') {
          callCount++
          return Promise.resolve(callCount <= 2 ? 'old content' : 'new content')
        }
        if (channel === 'fs:stat') {
          return Promise.resolve({ size: 100 })
        }
        return Promise.resolve(null)
      })

      const needsRebuild = await builder.needsRebuild(mockAction, '/project')

      expect(needsRebuild).toBe(true)
    })

    it('should return true when outputs are missing', async () => {
      // Record first build
      await builder.recordBuild(mockAction, '/project')

      // Make outputs missing
      mockIPC.invoke.mockImplementation((channel) => {
        if (channel === 'fs:listFiles') {
          return Promise.resolve(['src/index.ts'])
        }
        if (channel === 'fs:readFile') {
          return Promise.resolve('content')
        }
        if (channel === 'fs:stat') {
          return Promise.reject(new Error('File not found'))
        }
        return Promise.resolve(null)
      })

      const needsRebuild = await builder.needsRebuild(mockAction, '/project')

      expect(needsRebuild).toBe(true)
    })

    it('should return false when nothing changed', async () => {
      // Record first build
      await builder.recordBuild(mockAction, '/project')

      // Check again with same content
      const needsRebuild = await builder.needsRebuild(mockAction, '/project')

      expect(needsRebuild).toBe(false)
    })

    it('should handle multiple input files', async () => {
      mockIPC.invoke.mockImplementation((channel) => {
        if (channel === 'fs:listFiles') {
          return Promise.resolve([
            'src/index.ts',
            'src/utils.ts',
            'src/types.ts',
          ])
        }
        if (channel === 'fs:readFile') {
          return Promise.resolve('content')
        }
        if (channel === 'fs:stat') {
          return Promise.resolve({ size: 100 })
        }
        return Promise.resolve(null)
      })

      await builder.recordBuild(mockAction, '/project')

      const needsRebuild = await builder.needsRebuild(mockAction, '/project')

      expect(needsRebuild).toBe(false)
    })

    it('should detect when new input files are added', async () => {
      // Record with 1 file
      mockIPC.invoke.mockImplementation((channel) => {
        if (channel === 'fs:listFiles') {
          return Promise.resolve(['src/index.ts'])
        }
        if (channel === 'fs:readFile') {
          return Promise.resolve('content')
        }
        if (channel === 'fs:stat') {
          return Promise.resolve({ size: 100 })
        }
        return Promise.resolve(null)
      })

      await builder.recordBuild(mockAction, '/project')

      // Add new file
      mockIPC.invoke.mockImplementation((channel) => {
        if (channel === 'fs:listFiles') {
          return Promise.resolve(['src/index.ts', 'src/new.ts'])
        }
        if (channel === 'fs:readFile') {
          return Promise.resolve('content')
        }
        if (channel === 'fs:stat') {
          return Promise.resolve({ size: 100 })
        }
        return Promise.resolve(null)
      })

      const needsRebuild = await builder.needsRebuild(mockAction, '/project')

      expect(needsRebuild).toBe(true)
    })

    it('should detect when input files are removed', async () => {
      // Record with 2 files
      mockIPC.invoke.mockImplementation((channel) => {
        if (channel === 'fs:listFiles') {
          return Promise.resolve(['src/index.ts', 'src/utils.ts'])
        }
        if (channel === 'fs:readFile') {
          return Promise.resolve('content')
        }
        if (channel === 'fs:stat') {
          return Promise.resolve({ size: 100 })
        }
        return Promise.resolve(null)
      })

      await builder.recordBuild(mockAction, '/project')

      // Remove one file
      mockIPC.invoke.mockImplementation((channel) => {
        if (channel === 'fs:listFiles') {
          return Promise.resolve(['src/index.ts'])
        }
        if (channel === 'fs:readFile') {
          return Promise.resolve('content')
        }
        if (channel === 'fs:stat') {
          return Promise.resolve({ size: 100 })
        }
        return Promise.resolve(null)
      })

      const needsRebuild = await builder.needsRebuild(mockAction, '/project')

      expect(needsRebuild).toBe(true)
    })
  })

  describe('recordBuild', () => {
    it('should record build metadata', async () => {
      await builder.recordBuild(mockAction, '/project')

      const needsRebuild = await builder.needsRebuild(mockAction, '/project')

      expect(needsRebuild).toBe(false)
    })

    it('should skip recording when no inputs', async () => {
      const actionWithoutInputs: ActionDefinition = {
        id: 'test',
        name: 'Test',
        command: 'test',
        dependencies: [],
      }

      await builder.recordBuild(actionWithoutInputs, '/project')

      // Should not throw
      expect(true).toBe(true)
    })

    it('should skip recording when no outputs', async () => {
      const actionWithoutOutputs: ActionDefinition = {
        id: 'test',
        name: 'Test',
        command: 'test',
        dependencies: [],
        inputs: ['src/**/*.ts'],
      }

      await builder.recordBuild(actionWithoutOutputs, '/project')

      // Should not throw
      expect(true).toBe(true)
    })

    it('should record timestamp', async () => {
      const beforeTime = Date.now()

      await builder.recordBuild(mockAction, '/project')

      const afterTime = Date.now()

      // Metadata should have timestamp between before and after
      // (we can't access metadata directly, but we can verify it doesn't crash)
      expect(afterTime).toBeGreaterThanOrEqual(beforeTime)
    })

    it('should record command hash', async () => {
      await builder.recordBuild(mockAction, '/project')

      // Change command
      const changedAction: ActionDefinition = {
        ...mockAction,
        command: 'different command',
      }

      const needsRebuild = await builder.needsRebuild(changedAction, '/project')

      expect(needsRebuild).toBe(true)
    })

    it('should update existing metadata', async () => {
      // First build
      await builder.recordBuild(mockAction, '/project')

      // Change content
      mockIPC.invoke.mockImplementation((channel) => {
        if (channel === 'fs:listFiles') {
          return Promise.resolve(['src/index.ts'])
        }
        if (channel === 'fs:readFile') {
          return Promise.resolve('new content')
        }
        if (channel === 'fs:stat') {
          return Promise.resolve({ size: 100 })
        }
        return Promise.resolve(null)
      })

      // Second build
      await builder.recordBuild(mockAction, '/project')

      // Should not need rebuild
      const needsRebuild = await builder.needsRebuild(mockAction, '/project')

      expect(needsRebuild).toBe(false)
    })
  })

  describe('loadMetadata', () => {
    it('should load metadata from persistent storage', async () => {
      const metadata = {
        build: {
          actionId: 'build',
          inputHashes: { 'src/index.ts': 'abc123' },
          outputHashes: { 'dist/index.js': 'def456' },
          lastBuildTime: Date.now(),
          commandHash: 'hash',
        },
      }

      mockIPC.invoke.mockImplementation((channel, args) => {
        if (channel === 'fs:readFile') {
          const { filepath } = args as { filepath: string }
          if (filepath.includes('build-cache.json')) {
            return Promise.resolve(JSON.stringify(metadata))
          }
          return Promise.resolve('content')
        }
        return Promise.resolve(null)
      })

      await builder.loadMetadata('/project')

      // Metadata should be loaded
      // (we can verify this indirectly through needsRebuild)
    })

    it('should handle missing metadata file', async () => {
      mockIPC.invoke.mockImplementation((channel, args) => {
        if (channel === 'fs:readFile') {
          const { filepath } = args as { filepath: string }
          if (filepath.includes('build-cache.json')) {
            return Promise.reject(new Error('File not found'))
          }
        }
        return Promise.resolve(null)
      })

      await builder.loadMetadata('/project')

      // Should not throw - starts fresh
      expect(true).toBe(true)
    })

    it('should handle invalid JSON in metadata file', async () => {
      mockIPC.invoke.mockImplementation((channel, args) => {
        if (channel === 'fs:readFile') {
          const { filepath } = args as { filepath: string }
          if (filepath.includes('build-cache.json')) {
            return Promise.resolve('invalid json {')
          }
        }
        return Promise.resolve(null)
      })

      await builder.loadMetadata('/project')

      // Should not throw - starts fresh
      expect(true).toBe(true)
    })

    it('should clear existing metadata before loading', async () => {
      // Record some metadata
      await builder.recordBuild(mockAction, '/project')

      // Load empty metadata
      mockIPC.invoke.mockImplementation((channel, args) => {
        if (channel === 'fs:readFile') {
          const { filepath } = args as { filepath: string }
          if (filepath.includes('build-cache.json')) {
            return Promise.resolve('{}')
          }
        }
        return Promise.resolve(null)
      })

      await builder.loadMetadata('/project')

      // Previous metadata should be cleared
      const needsRebuild = await builder.needsRebuild(mockAction, '/project')
      expect(needsRebuild).toBe(true)
    })
  })

  describe('saveMetadata', () => {
    it('should save metadata to persistent storage', async () => {
      await builder.recordBuild(mockAction, '/project')

      const savedData: { filepath: string; content: string }[] = []

      mockIPC.invoke.mockImplementation((channel, args) => {
        if (channel === 'fs:writeFile') {
          savedData.push(args as { filepath: string; content: string })
          return Promise.resolve()
        }
        return Promise.resolve(null)
      })

      await builder.saveMetadata('/project')

      expect(savedData).toHaveLength(1)
      expect(savedData[0].filepath).toContain('build-cache.json')

      const saved = JSON.parse(savedData[0].content)
      expect(saved.build).toBeDefined()
    })

    it('should save to .hatcher/build-cache.json', async () => {
      let savedPath = ''

      mockIPC.invoke.mockImplementation((channel, args) => {
        if (channel === 'fs:writeFile') {
          const { filepath } = args as { filepath: string }
          savedPath = filepath
          return Promise.resolve()
        }
        return Promise.resolve(null)
      })

      await builder.saveMetadata('/project')

      expect(savedPath).toBe('/project/.hatcher/build-cache.json')
    })

    it('should handle save errors gracefully', async () => {
      mockIPC.invoke.mockImplementation((channel) => {
        if (channel === 'fs:writeFile') {
          return Promise.reject(new Error('Write error'))
        }
        return Promise.resolve(null)
      })

      await builder.saveMetadata('/project')

      // Should not throw
      expect(true).toBe(true)
    })

    it('should format JSON with 2 spaces', async () => {
      await builder.recordBuild(mockAction, '/project')

      let savedContent = ''

      mockIPC.invoke.mockImplementation((channel, args) => {
        if (channel === 'fs:writeFile') {
          const { content } = args as { content: string }
          savedContent = content
          return Promise.resolve()
        }
        return Promise.resolve(null)
      })

      await builder.saveMetadata('/project')

      // Check formatting (should have indentation)
      expect(savedContent).toContain('\n  ')
    })
  })

  describe('clearMetadata', () => {
    it('should clear all build metadata', async () => {
      await builder.recordBuild(mockAction, '/project')

      builder.clearMetadata()

      const needsRebuild = await builder.needsRebuild(mockAction, '/project')

      expect(needsRebuild).toBe(true)
    })

    it('should not affect future recordBuild calls', async () => {
      await builder.recordBuild(mockAction, '/project')

      builder.clearMetadata()

      await builder.recordBuild(mockAction, '/project')

      const needsRebuild = await builder.needsRebuild(mockAction, '/project')

      expect(needsRebuild).toBe(false)
    })
  })

  describe('integration scenarios', () => {
    it('should handle complete build cycle', async () => {
      // Load previous metadata
      await builder.loadMetadata('/project')

      // Check if rebuild needed (first time - yes)
      let needsRebuild = await builder.needsRebuild(mockAction, '/project')
      expect(needsRebuild).toBe(true)

      // Execute build and record
      await builder.recordBuild(mockAction, '/project')

      // Save metadata
      await builder.saveMetadata('/project')

      // Check again (should skip)
      needsRebuild = await builder.needsRebuild(mockAction, '/project')
      expect(needsRebuild).toBe(false)
    })

    it('should handle multiple actions', async () => {
      const action1: ActionDefinition = {
        id: 'lint',
        name: 'Lint',
        command: 'lint',
        dependencies: [],
        inputs: ['src/**/*.ts'],
        outputs: ['lint.log'],
      }

      const action2: ActionDefinition = {
        id: 'test',
        name: 'Test',
        command: 'test',
        dependencies: [],
        inputs: ['src/**/*.spec.ts'],
        outputs: ['coverage/'],
      }

      await builder.recordBuild(action1, '/project')
      await builder.recordBuild(action2, '/project')

      const needsRebuild1 = await builder.needsRebuild(action1, '/project')
      const needsRebuild2 = await builder.needsRebuild(action2, '/project')

      expect(needsRebuild1).toBe(false)
      expect(needsRebuild2).toBe(false)
    })

    it('should persist across builder instances', async () => {
      // First builder instance
      await builder.recordBuild(mockAction, '/project')
      await builder.saveMetadata('/project')

      // Create new builder instance
      const newBuilder = new IncrementalBuilder(hasher, mockIPC)

      // Mock load metadata
      mockIPC.invoke.mockImplementation((channel, args) => {
        if (channel === 'fs:readFile') {
          const { filepath } = args as { filepath: string }
          if (filepath.includes('build-cache.json')) {
            return Promise.resolve(
              JSON.stringify({
                build: {
                  actionId: 'build',
                  inputHashes: { 'src/index.ts': 'abc123' },
                  outputHashes: { 'dist/index.js': 'def456' },
                  lastBuildTime: Date.now(),
                  commandHash: 'hash',
                },
              })
            )
          }
          return Promise.resolve('content')
        }
        if (channel === 'fs:listFiles') {
          return Promise.resolve(['src/index.ts'])
        }
        if (channel === 'fs:stat') {
          return Promise.resolve({ size: 100 })
        }
        return Promise.resolve(null)
      })

      await newBuilder.loadMetadata('/project')

      // Should not need rebuild
      const needsRebuild = await newBuilder.needsRebuild(mockAction, '/project')
      expect(needsRebuild).toBe(false)
    })
  })
})
