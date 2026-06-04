/**
 * @fileoverview Comprehensive tests for MatrixExpander
 *
 * @description
 * Tests cover:
 * - Cartesian product generation
 * - Matrix expansion
 * - ID generation
 * - Instance counting
 *
 * Target: 100% code coverage
 */

import { describe, it, expect } from 'vitest'
import { MatrixExpander } from './MatrixExpander'
import type { ActionDefinition } from './types'

describe('MatrixExpander', () => {
  let expander: MatrixExpander

  beforeEach(() => {
    expander = new MatrixExpander()
  })

  describe('expand', () => {
    it('should return single instance when no matrix', () => {
      const action: ActionDefinition = {
        id: 'test',
        name: 'Test',
        command: 'pnpm test',
        dependencies: [],
      }

      const instances = expander.expand(action)

      expect(instances).toHaveLength(1)
      expect(instances[0].id).toBe('test')
      expect(instances[0].originalId).toBe('test')
      expect(instances[0].matrixVars).toEqual({})
    })

    it('should return single instance when matrix is empty', () => {
      const action: ActionDefinition = {
        id: 'test',
        name: 'Test',
        command: 'pnpm test',
        dependencies: [],
        matrix: {},
      }

      const instances = expander.expand(action)

      expect(instances).toHaveLength(1)
      expect(instances[0].matrixVars).toEqual({})
    })

    it('should expand single dimension matrix', () => {
      const action: ActionDefinition = {
        id: 'test',
        name: 'Test',
        command: 'pnpm test',
        dependencies: [],
        matrix: {
          node: ['18', '20', '22'],
        },
      }

      const instances = expander.expand(action)

      expect(instances).toHaveLength(3)
      expect(instances[0].id).toBe('test-18')
      expect(instances[0].matrixVars).toEqual({ node: '18' })
      expect(instances[1].id).toBe('test-20')
      expect(instances[1].matrixVars).toEqual({ node: '20' })
      expect(instances[2].id).toBe('test-22')
      expect(instances[2].matrixVars).toEqual({ node: '22' })
    })

    it('should expand two dimension matrix (Cartesian product)', () => {
      const action: ActionDefinition = {
        id: 'test',
        name: 'Test',
        command: 'pnpm test',
        dependencies: [],
        matrix: {
          os: ['linux', 'darwin'],
          node: ['18', '20'],
        },
      }

      const instances = expander.expand(action)

      // 2 OS × 2 Node = 4 combinations
      expect(instances).toHaveLength(4)

      const ids = instances.map((i) => i.id)
      expect(ids).toContain('test-linux-18')
      expect(ids).toContain('test-linux-20')
      expect(ids).toContain('test-darwin-18')
      expect(ids).toContain('test-darwin-20')
    })

    it('should expand three dimension matrix', () => {
      const action: ActionDefinition = {
        id: 'test',
        name: 'Test',
        command: 'pnpm test',
        dependencies: [],
        matrix: {
          os: ['linux', 'darwin'],
          node: ['18', '20'],
          arch: ['x64', 'arm64'],
        },
      }

      const instances = expander.expand(action)

      // 2 × 2 × 2 = 8 combinations
      expect(instances).toHaveLength(8)

      const ids = instances.map((i) => i.id)
      expect(ids).toContain('test-linux-18-x64')
      expect(ids).toContain('test-linux-18-arm64')
      expect(ids).toContain('test-linux-20-x64')
      expect(ids).toContain('test-linux-20-arm64')
      expect(ids).toContain('test-darwin-18-x64')
      expect(ids).toContain('test-darwin-18-arm64')
      expect(ids).toContain('test-darwin-20-x64')
      expect(ids).toContain('test-darwin-20-arm64')
    })

    it('should include matrix variables in each instance', () => {
      const action: ActionDefinition = {
        id: 'build',
        name: 'Build',
        command: 'build',
        dependencies: [],
        matrix: {
          platform: ['win32', 'darwin'],
          arch: ['x64', 'arm64'],
        },
      }

      const instances = expander.expand(action)

      const darwinArm64 = instances.find((i) => i.id === 'build-darwin-arm64')

      expect(darwinArm64).toBeDefined()
      expect(darwinArm64!.matrixVars).toEqual({
        platform: 'darwin',
        arch: 'arm64',
      })
    })

    it('should generate unique names for each instance', () => {
      const action: ActionDefinition = {
        id: 'test',
        name: 'Run Tests',
        command: 'test',
        dependencies: [],
        matrix: {
          os: ['linux', 'darwin'],
        },
      }

      const instances = expander.expand(action)

      expect(instances[0].name).toBe('Run Tests (linux)')
      expect(instances[1].name).toBe('Run Tests (darwin)')
    })

    it('should preserve original action properties', () => {
      const action: ActionDefinition = {
        id: 'test',
        name: 'Test',
        description: 'Run tests',
        command: 'pnpm test',
        dependencies: ['lint'],
        icon: 'test-icon',
        parallel: true,
        estimatedDuration: 30000,
        matrix: {
          node: ['18'],
        },
      }

      const instances = expander.expand(action)

      expect(instances[0].description).toBe('Run tests')
      expect(instances[0].command).toBe('pnpm test')
      expect(instances[0].dependencies).toEqual(['lint'])
      expect(instances[0].icon).toBe('test-icon')
      expect(instances[0].parallel).toBe(true)
      expect(instances[0].estimatedDuration).toBe(30000)
    })

    it('should handle numeric matrix values', () => {
      const action: ActionDefinition = {
        id: 'test',
        name: 'Test',
        command: 'test',
        dependencies: [],
        matrix: {
          node: [18, 20, 22],
        },
      }

      const instances = expander.expand(action)

      expect(instances).toHaveLength(3)
      expect(instances[0].matrixVars).toEqual({ node: 18 })
      expect(instances[1].matrixVars).toEqual({ node: 20 })
      expect(instances[2].matrixVars).toEqual({ node: 22 })
    })

    it('should handle mixed string and numeric values', () => {
      const action: ActionDefinition = {
        id: 'test',
        name: 'Test',
        command: 'test',
        dependencies: [],
        matrix: {
          os: ['linux', 'darwin'],
          node: [18, 20],
        },
      }

      const instances = expander.expand(action)

      const linuxNode18 = instances.find((i) => i.id === 'test-linux-18')

      expect(linuxNode18!.matrixVars).toEqual({ os: 'linux', node: 18 })
    })
  })

  describe('expandAll', () => {
    it('should expand multiple actions', () => {
      const actions: ActionDefinition[] = [
        {
          id: 'test',
          name: 'Test',
          command: 'test',
          dependencies: [],
          matrix: {
            node: ['18', '20'],
          },
        },
        {
          id: 'lint',
          name: 'Lint',
          command: 'lint',
          dependencies: [],
          // No matrix
        },
      ]

      const instances = expander.expandAll(actions)

      // test: 2 instances, lint: 1 instance = 3 total
      expect(instances).toHaveLength(3)

      const ids = instances.map((i) => i.id)
      expect(ids).toContain('test-18')
      expect(ids).toContain('test-20')
      expect(ids).toContain('lint')
    })

    it('should handle empty actions array', () => {
      const instances = expander.expandAll([])
      expect(instances).toHaveLength(0)
    })

    it('should expand all matrices correctly', () => {
      const actions: ActionDefinition[] = [
        {
          id: 'a',
          name: 'A',
          command: 'a',
          dependencies: [],
          matrix: { x: ['1', '2'] },
        },
        {
          id: 'b',
          name: 'B',
          command: 'b',
          dependencies: [],
          matrix: { y: ['3', '4'] },
        },
      ]

      const instances = expander.expandAll(actions)

      // a: 2 instances, b: 2 instances = 4 total
      expect(instances).toHaveLength(4)
    })
  })

  describe('getInstanceCount', () => {
    it('should return 1 when no matrix', () => {
      const action: ActionDefinition = {
        id: 'test',
        name: 'Test',
        command: 'test',
        dependencies: [],
      }

      expect(expander.getInstanceCount(action)).toBe(1)
    })

    it('should return 1 when matrix is empty', () => {
      const action: ActionDefinition = {
        id: 'test',
        name: 'Test',
        command: 'test',
        dependencies: [],
        matrix: {},
      }

      expect(expander.getInstanceCount(action)).toBe(1)
    })

    it('should count single dimension correctly', () => {
      const action: ActionDefinition = {
        id: 'test',
        name: 'Test',
        command: 'test',
        dependencies: [],
        matrix: {
          node: ['18', '20', '22'],
        },
      }

      expect(expander.getInstanceCount(action)).toBe(3)
    })

    it('should count two dimensions correctly (product)', () => {
      const action: ActionDefinition = {
        id: 'test',
        name: 'Test',
        command: 'test',
        dependencies: [],
        matrix: {
          os: ['linux', 'darwin', 'win32'],
          node: ['18', '20'],
        },
      }

      // 3 × 2 = 6
      expect(expander.getInstanceCount(action)).toBe(6)
    })

    it('should count three dimensions correctly', () => {
      const action: ActionDefinition = {
        id: 'test',
        name: 'Test',
        command: 'test',
        dependencies: [],
        matrix: {
          os: ['linux', 'darwin', 'win32'],
          node: ['18', '20', '22'],
          arch: ['x64', 'arm64'],
        },
      }

      // 3 × 3 × 2 = 18
      expect(expander.getInstanceCount(action)).toBe(18)
    })

    it('should count without generating instances', () => {
      const action: ActionDefinition = {
        id: 'test',
        name: 'Test',
        command: 'test',
        dependencies: [],
        matrix: {
          os: Array.from({ length: 100 }, (_, i) => `os-${i}`),
          node: Array.from({ length: 100 }, (_, i) => `node-${i}`),
        },
      }

      // 100 × 100 = 10,000 (should calculate, not generate)
      expect(expander.getInstanceCount(action)).toBe(10000)
    })
  })

  describe('edge cases', () => {
    it('should handle single value in matrix', () => {
      const action: ActionDefinition = {
        id: 'test',
        name: 'Test',
        command: 'test',
        dependencies: [],
        matrix: {
          node: ['20'],
        },
      }

      const instances = expander.expand(action)

      expect(instances).toHaveLength(1)
      expect(instances[0].id).toBe('test-20')
      expect(instances[0].matrixVars).toEqual({ node: '20' })
    })

    it('should handle very large matrices', () => {
      const action: ActionDefinition = {
        id: 'test',
        name: 'Test',
        command: 'test',
        dependencies: [],
        matrix: {
          os: ['linux', 'darwin', 'win32'],
          node: ['16', '18', '20', '22'],
          arch: ['x64', 'arm64'],
          env: ['dev', 'prod'],
        },
      }

      const instances = expander.expand(action)

      // 3 × 4 × 2 × 2 = 48 instances
      expect(instances).toHaveLength(48)
    })

    it('should handle special characters in matrix values', () => {
      const action: ActionDefinition = {
        id: 'test',
        name: 'Test',
        command: 'test',
        dependencies: [],
        matrix: {
          version: ['1.0.0', '2.0.0-beta.1'],
        },
      }

      const instances = expander.expand(action)

      expect(instances[0].id).toBe('test-1.0.0')
      expect(instances[1].id).toBe('test-2.0.0-beta.1')
    })

    it('should handle matrix with long key names', () => {
      const action: ActionDefinition = {
        id: 'test',
        name: 'Test',
        command: 'test',
        dependencies: [],
        matrix: {
          'very-long-matrix-key-name': ['value1', 'value2'],
        },
      }

      const instances = expander.expand(action)

      expect(instances).toHaveLength(2)
      expect(instances[0].matrixVars).toHaveProperty(
        'very-long-matrix-key-name',
        'value1'
      )
    })

    it('should maintain insertion order for matrix keys', () => {
      const action: ActionDefinition = {
        id: 'test',
        name: 'Test',
        command: 'test',
        dependencies: [],
        matrix: {
          z: ['1'],
          a: ['2'],
          m: ['3'],
        },
      }

      const instances = expander.expand(action)

      // ID should reflect insertion order (z-a-m, not a-m-z)
      expect(instances[0].id).toBe('test-1-2-3')
    })

    it('should handle action with matrix and dependencies', () => {
      const action: ActionDefinition = {
        id: 'test',
        name: 'Test',
        command: 'test',
        dependencies: ['lint', 'build'],
        matrix: {
          node: ['18', '20'],
        },
      }

      const instances = expander.expand(action)

      // Dependencies should be preserved in all instances
      expect(instances[0].dependencies).toEqual(['lint', 'build'])
      expect(instances[1].dependencies).toEqual(['lint', 'build'])
    })

    it('should handle empty matrix dimension', () => {
      const action: ActionDefinition = {
        id: 'test',
        name: 'Test',
        command: 'test',
        dependencies: [],
        matrix: {
          node: [],
        },
      }

      const instances = expander.expand(action)

      // Empty dimension means no combinations possible
      expect(instances).toHaveLength(0)
    })

    it('should handle action with all optional fields and matrix', () => {
      const action: ActionDefinition = {
        id: 'test',
        name: 'Test',
        description: 'Test action',
        command: 'test',
        icon: 'test-icon',
        dependencies: ['lint'],
        parallel: true,
        estimatedDuration: 30000,
        inputs: ['src/**/*.ts'],
        outputs: ['dist/**/*'],
        affectedBy: ['src/**/*'],
        cache: undefined,
        matrix: {
          node: ['18', '20'],
        },
      }

      const instances = expander.expand(action)

      expect(instances).toHaveLength(2)

      // All fields should be preserved
      expect(instances[0].description).toBe('Test action')
      expect(instances[0].icon).toBe('test-icon')
      expect(instances[0].parallel).toBe(true)
      expect(instances[0].estimatedDuration).toBe(30000)
      expect(instances[0].inputs).toEqual(['src/**/*.ts'])
      expect(instances[0].outputs).toEqual(['dist/**/*'])
      expect(instances[0].affectedBy).toEqual(['src/**/*'])
    })
  })
})
