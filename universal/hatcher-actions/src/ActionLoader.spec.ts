/**
 * @fileoverview Comprehensive tests for ActionLoader
 *
 * @description
 * Tests cover:
 * - YAML parsing
 * - Schema validation
 * - Circular dependency detection
 * - Group actions
 * - Error handling
 *
 * Target: 100% code coverage
 */

import { describe, it, expect } from 'vitest'
import { ActionLoader } from './ActionLoader'
import type { ActionsConfig } from './types'

describe('ActionLoader', () => {
  let loader: ActionLoader

  beforeEach(() => {
    loader = new ActionLoader()
  })

  describe('parseConfig', () => {
    it('should parse valid YAML configuration', () => {
      const yaml = `
version: '1.0'
project: 'test-project'
actions:
  lint:
    name: 'Lint Code'
    command: 'pnpm lint'
  test:
    name: 'Run Tests'
    command: 'pnpm test'
`

      const config = loader.parseConfig(yaml)

      expect(config.version).toBe('1.0')
      expect(config.project).toBe('test-project')
      expect(config.actions.lint).toBeDefined()
      expect(config.actions.test).toBeDefined()
    })

    it('should throw on malformed YAML', () => {
      const invalidYAML = `
version: '1.0'
project: [invalid yaml structure
`

      expect(() => loader.parseConfig(invalidYAML)).toThrow()
    })

    it('should throw when version is missing', () => {
      const yaml = `
project: 'test-project'
actions:
  lint:
    name: 'Lint'
    command: 'pnpm lint'
`

      expect(() => loader.parseConfig(yaml)).toThrow(/version/)
    })

    it('should throw when project is missing', () => {
      const yaml = `
version: '1.0'
actions:
  lint:
    name: 'Lint'
    command: 'pnpm lint'
`

      expect(() => loader.parseConfig(yaml)).toThrow(/project/)
    })

    it('should throw when actions is missing', () => {
      const yaml = `
version: '1.0'
project: 'test-project'
`

      expect(() => loader.parseConfig(yaml)).toThrow(/actions/)
    })

    it('should throw when actions is not an object', () => {
      const yaml = `
version: '1.0'
project: 'test-project'
actions: 'invalid'
`

      expect(() => loader.parseConfig(yaml)).toThrow(/actions/)
    })

    it('should throw when action is missing name', () => {
      const yaml = `
version: '1.0'
project: 'test-project'
actions:
  lint:
    command: 'pnpm lint'
`

      expect(() => loader.parseConfig(yaml)).toThrow(/name/)
    })

    it('should throw when action is missing command', () => {
      const yaml = `
version: '1.0'
project: 'test-project'
actions:
  lint:
    name: 'Lint'
`

      expect(() => loader.parseConfig(yaml)).toThrow(/command/)
    })

    it('should throw when action has invalid dependency', () => {
      const yaml = `
version: '1.0'
project: 'test-project'
actions:
  test:
    name: 'Test'
    command: 'pnpm test'
    dependencies: ['nonexistent']
`

      expect(() => loader.parseConfig(yaml)).toThrow(/dependency/)
    })

    it('should allow action with valid dependencies', () => {
      const yaml = `
version: '1.0'
project: 'test-project'
actions:
  lint:
    name: 'Lint'
    command: 'pnpm lint'
  test:
    name: 'Test'
    command: 'pnpm test'
    dependencies: ['lint']
`

      const config = loader.parseConfig(yaml)
      expect(config.actions.test.dependencies).toEqual(['lint'])
    })

    it('should detect circular dependencies (direct)', () => {
      const yaml = `
version: '1.0'
project: 'test-project'
actions:
  a:
    name: 'A'
    command: 'echo a'
    dependencies: ['b']
  b:
    name: 'B'
    command: 'echo b'
    dependencies: ['a']
`

      expect(() => loader.parseConfig(yaml)).toThrow(/Circular dependency/)
    })

    it('should detect circular dependencies (indirect)', () => {
      const yaml = `
version: '1.0'
project: 'test-project'
actions:
  a:
    name: 'A'
    command: 'echo a'
    dependencies: ['b']
  b:
    name: 'B'
    command: 'echo b'
    dependencies: ['c']
  c:
    name: 'C'
    command: 'echo c'
    dependencies: ['a']
`

      expect(() => loader.parseConfig(yaml)).toThrow(/Circular dependency/)
    })

    it('should detect self-referencing dependency', () => {
      const yaml = `
version: '1.0'
project: 'test-project'
actions:
  a:
    name: 'A'
    command: 'echo a'
    dependencies: ['a']
`

      expect(() => loader.parseConfig(yaml)).toThrow(/Circular dependency/)
    })

    it('should allow complex non-circular dependency graph', () => {
      const yaml = `
version: '1.0'
project: 'test-project'
actions:
  lint:
    name: 'Lint'
    command: 'pnpm lint'
  test:
    name: 'Test'
    command: 'pnpm test'
    dependencies: ['lint']
  build:
    name: 'Build'
    command: 'pnpm build'
    dependencies: ['lint', 'test']
`

      const config = loader.parseConfig(yaml)
      expect(config.actions.build.dependencies).toEqual(['lint', 'test'])
    })
  })

  describe('toActionDefinitions', () => {
    it('should convert config to action definitions', () => {
      const config: ActionsConfig = {
        version: '1.0',
        project: 'test-project',
        actions: {
          lint: {
            name: 'Lint Code',
            command: 'pnpm lint',
          },
          test: {
            name: 'Run Tests',
            command: 'pnpm test',
            dependencies: ['lint'],
          },
        },
        groups: {},
      }

      const actions = loader.toActionDefinitions(config)

      expect(actions).toHaveLength(2)
      expect(actions[0].id).toBe('lint')
      expect(actions[0].dependencies).toEqual([])
      expect(actions[1].id).toBe('test')
      expect(actions[1].dependencies).toEqual(['lint'])
    })

    it('should set default values', () => {
      const config: ActionsConfig = {
        version: '1.0',
        project: 'test',
        actions: {
          test: {
            name: 'Test',
            command: 'test',
          },
        },
        groups: {},
      }

      const actions = loader.toActionDefinitions(config)

      expect(actions[0].dependencies).toEqual([])
      expect(actions[0].parallel).toBe(false)
      expect(actions[0].estimatedDuration).toBe(5000)
    })

    it('should preserve optional fields', () => {
      const config: ActionsConfig = {
        version: '1.0',
        project: 'test',
        actions: {
          test: {
            name: 'Test',
            command: 'test',
            description: 'Test description',
            icon: 'test-icon',
            parallel: true,
            estimatedDuration: 3000,
          },
        },
        groups: {},
      }

      const actions = loader.toActionDefinitions(config)

      expect(actions[0].description).toBe('Test description')
      expect(actions[0].icon).toBe('test-icon')
      expect(actions[0].parallel).toBe(true)
      expect(actions[0].estimatedDuration).toBe(3000)
    })
  })

  describe('getGroupActions', () => {
    it('should get actions for a specific group', () => {
      const config: ActionsConfig = {
        version: '1.0',
        project: 'test',
        actions: {
          lint: {
            name: 'Lint',
            command: 'lint',
          },
          test: {
            name: 'Test',
            command: 'test',
          },
          build: {
            name: 'Build',
            command: 'build',
          },
        },
        groups: {
          'pre-commit': ['lint', 'test'],
        },
      }

      const groupActions = loader.getGroupActions(config, 'pre-commit')

      expect(groupActions).toHaveLength(2)
      expect(groupActions[0].id).toBe('lint')
      expect(groupActions[1].id).toBe('test')
    })

    it('should throw when group does not exist', () => {
      const config: ActionsConfig = {
        version: '1.0',
        project: 'test',
        actions: {},
        groups: {},
      }

      expect(() => loader.getGroupActions(config, 'nonexistent')).toThrow(
        /not found/
      )
    })

    it('should warn and skip actions that are not defined', () => {
      const consoleWarnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => {})

      const config: ActionsConfig = {
        version: '1.0',
        project: 'test',
        actions: {
          lint: {
            name: 'Lint',
            command: 'lint',
          },
        },
        groups: {
          'pre-commit': ['lint', 'nonexistent'],
        },
      }

      const groupActions = loader.getGroupActions(config, 'pre-commit')

      expect(groupActions).toHaveLength(1)
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('nonexistent')
      )

      consoleWarnSpy.mockRestore()
    })

    it('should include all action properties in group actions', () => {
      const config: ActionsConfig = {
        version: '1.0',
        project: 'test',
        actions: {
          test: {
            name: 'Test',
            command: 'test',
            dependencies: ['lint'],
            parallel: true,
            estimatedDuration: 3000,
            icon: 'test-icon',
            affectedBy: ['src/**/*.ts'],
            matrix: { node: ['18', '20'] },
            cache: undefined,
          },
        },
        groups: {
          ci: ['test'],
        },
      }

      const groupActions = loader.getGroupActions(config, 'ci')

      expect(groupActions[0].dependencies).toEqual(['lint'])
      expect(groupActions[0].parallel).toBe(true)
      expect(groupActions[0].estimatedDuration).toBe(3000)
      expect(groupActions[0].icon).toBe('test-icon')
      expect(groupActions[0].affectedBy).toEqual(['src/**/*.ts'])
      expect(groupActions[0].matrix).toEqual({ node: ['18', '20'] })
    })

    it('should handle empty group', () => {
      const config: ActionsConfig = {
        version: '1.0',
        project: 'test',
        actions: {
          test: {
            name: 'Test',
            command: 'test',
          },
        },
        groups: {
          empty: [],
        },
      }

      const groupActions = loader.getGroupActions(config, 'empty')
      expect(groupActions).toHaveLength(0)
    })

    it('should handle group with only undefined actions', () => {
      const consoleWarnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => {})

      const config: ActionsConfig = {
        version: '1.0',
        project: 'test',
        actions: {
          test: {
            name: 'Test',
            command: 'test',
          },
        },
        groups: {
          'all-missing': ['missing1', 'missing2'],
        },
      }

      const groupActions = loader.getGroupActions(config, 'all-missing')

      expect(groupActions).toHaveLength(0)
      expect(consoleWarnSpy).toHaveBeenCalledTimes(2)

      consoleWarnSpy.mockRestore()
    })
  })

  describe('complex scenarios', () => {
    it('should parse real-world monorepo configuration', () => {
      const yaml = `
version: '1.0'
project: 'dx-engine'

actions:
  lint-workspace:
    name: 'Lint Workspace'
    command: 'pnpm lint'
    parallel: false

  test-storage:
    name: 'Test Storage'
    command: 'pnpm --filter @hatcherdx/storage test'
    dependencies: ['lint-workspace']

  test-terminal:
    name: 'Test Terminal'
    command: 'pnpm --filter @hatcherdx/terminal-system test'
    dependencies: ['lint-workspace']

  build-all:
    name: 'Build All'
    command: 'pnpm build'
    dependencies: ['test-storage', 'test-terminal']

groups:
  pre-commit:
    - lint-workspace
  ci:
    - lint-workspace
    - test-storage
    - test-terminal
    - build-all
`

      const config = loader.parseConfig(yaml)
      const actions = loader.toActionDefinitions(config)
      const ciActions = loader.getGroupActions(config, 'ci')

      expect(config.project).toBe('dx-engine')
      expect(actions).toHaveLength(4)
      expect(ciActions).toHaveLength(4)
      expect(config.actions['build-all'].dependencies).toEqual([
        'test-storage',
        'test-terminal',
      ])
    })

    it('should handle configuration with all optional fields', () => {
      const yaml = `
version: '1.0'
project: 'test-project'

actions:
  test:
    name: 'Run Tests'
    description: 'Execute all unit tests'
    command: 'pnpm test'
    icon: 'test-tube'
    dependencies: ['lint']
    parallel: true
    estimatedDuration: 30000
    affectedBy:
      - 'src/**/*.ts'
      - '!**/*.spec.ts'
    matrix:
      os: ['linux', 'darwin']
      node: ['18', '20']

  lint:
    name: 'Lint Code'
    command: 'pnpm lint'

groups:
  ci:
    - lint
    - test
`

      const config = loader.parseConfig(yaml)

      expect(config.actions.test.description).toBe('Execute all unit tests')
      expect(config.actions.test.icon).toBe('test-tube')
      expect(config.actions.test.parallel).toBe(true)
      expect(config.actions.test.estimatedDuration).toBe(30000)
      expect(config.actions.test.affectedBy).toEqual([
        'src/**/*.ts',
        '!**/*.spec.ts',
      ])
      expect(config.actions.test.matrix).toEqual({
        os: ['linux', 'darwin'],
        node: ['18', '20'],
      })
    })

    it('should handle configuration with multiple groups', () => {
      const config: ActionsConfig = {
        version: '1.0',
        project: 'test',
        actions: {
          lint: { name: 'Lint', command: 'lint' },
          test: { name: 'Test', command: 'test' },
          build: { name: 'Build', command: 'build' },
          deploy: { name: 'Deploy', command: 'deploy' },
        },
        groups: {
          'pre-commit': ['lint'],
          ci: ['lint', 'test', 'build'],
          production: ['build', 'deploy'],
        },
      }

      const preCommit = loader.getGroupActions(config, 'pre-commit')
      const ci = loader.getGroupActions(config, 'ci')
      const production = loader.getGroupActions(config, 'production')

      expect(preCommit).toHaveLength(1)
      expect(ci).toHaveLength(3)
      expect(production).toHaveLength(2)
    })

    it('should handle empty configuration', () => {
      const yaml = `
version: '1.0'
project: 'empty-project'
actions: {}
groups: {}
`

      const config = loader.parseConfig(yaml)
      const actions = loader.toActionDefinitions(config)

      expect(actions).toHaveLength(0)
    })
  })
})
