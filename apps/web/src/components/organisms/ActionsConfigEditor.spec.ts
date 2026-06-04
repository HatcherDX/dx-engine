/**
 * @fileoverview Tests for ActionsConfigEditor component.
 *
 * @description
 * Tests the Actions Configuration Editor including:
 * - List and DAG view modes
 * - CRUD operations
 * - YAML import/export
 * - Validation
 * - UI interactions
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ActionsConfigEditor from './ActionsConfigEditor.vue'
import type { ActionDefinition } from '@hatcherdx/hatcher-actions'

// Mock window.electronAPI
global.window.electronAPI = {
  invoke: vi.fn(),
} as unknown as typeof window.electronAPI

describe('ActionsConfigEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Component Mounting', () => {
    it('should mount successfully', () => {
      const wrapper = mount(ActionsConfigEditor, {
        props: {
          projectPath: '/test/project',
        },
      })

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('.actions-editor').exists()).toBe(true)
    })

    it('should show correct title', () => {
      const wrapper = mount(ActionsConfigEditor, {
        props: {
          projectPath: '/test/project',
        },
      })

      expect(wrapper.find('.actions-editor__title h2').text()).toBe(
        'Actions Configuration'
      )
    })
  })

  describe('View Mode Toggle', () => {
    it('should start in list view', () => {
      const wrapper = mount(ActionsConfigEditor, {
        props: {
          projectPath: '/test/project',
        },
      })

      expect(wrapper.find('.content__list-view').exists()).toBe(true)
      expect(wrapper.find('.content__dag-view').exists()).toBe(false)
    })

    it('should switch to DAG view when clicked', async () => {
      const wrapper = mount(ActionsConfigEditor, {
        props: {
          projectPath: '/test/project',
        },
      })

      const dagButton = wrapper.findAll('.view-toggle__btn')[1]
      await dagButton.trigger('click')

      expect(wrapper.find('.content__list-view').exists()).toBe(false)
      expect(wrapper.find('.content__dag-view').exists()).toBe(true)
    })
  })

  describe('Modal Interactions', () => {
    it('should open create modal when Add Action is clicked', async () => {
      const wrapper = mount(ActionsConfigEditor, {
        props: {
          projectPath: '/test/project',
        },
      })

      const addButton = wrapper.find('.actions-editor__btn--primary')
      await addButton.trigger('click')

      // Modal should be shown (CompactModal with v-if)
      expect(wrapper.vm.showEditModal).toBe(true)
    })

    it('should open import modal when Import is clicked', async () => {
      const wrapper = mount(ActionsConfigEditor, {
        props: {
          projectPath: '/test/project',
        },
      })

      const importButton = wrapper.findAll('.actions-editor__btn--secondary')[0]
      await importButton.trigger('click')

      expect(wrapper.vm.showImportModal).toBe(true)
    })
  })

  describe('Action Management', () => {
    it('should validate form correctly', async () => {
      const wrapper = mount(ActionsConfigEditor, {
        props: {
          projectPath: '/test/project',
        },
      })

      // Open create modal
      wrapper.vm.openCreateModal()
      await wrapper.vm.$nextTick()

      // Form should be invalid initially
      expect(wrapper.vm.isFormValid).toBe(false)

      // Fill required fields
      wrapper.vm.editForm.id = 'test-action'
      wrapper.vm.editForm.name = 'Test Action'
      wrapper.vm.editForm.command = 'echo "test"'
      await wrapper.vm.$nextTick()

      // Form should now be valid
      expect(wrapper.vm.isFormValid).toBe(true)
    })

    it('should add action when form is valid', async () => {
      const wrapper = mount(ActionsConfigEditor, {
        props: {
          projectPath: '/test/project',
        },
      })

      wrapper.vm.openCreateModal()
      wrapper.vm.editForm = {
        id: 'test-action',
        name: 'Test Action',
        description: 'Test description',
        command: 'echo "test"',
        icon: 'Circle',
        dependencies: [],
        parallel: false,
        estimatedDuration: 2000,
      }

      wrapper.vm.saveAction()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.actions.has('test-action')).toBe(true)
      expect(wrapper.vm.showEditModal).toBe(false)
    })
  })

  describe('Dependency Management', () => {
    it('should calculate action levels correctly', () => {
      const wrapper = mount(ActionsConfigEditor, {
        props: {
          projectPath: '/test/project',
        },
      })

      // Set up actions with dependencies
      wrapper.vm.actions.set('action-a', {
        id: 'action-a',
        name: 'Action A',
        description: '',
        command: 'echo "a"',
        dependencies: [],
      })

      wrapper.vm.actions.set('action-b', {
        id: 'action-b',
        name: 'Action B',
        description: '',
        command: 'echo "b"',
        dependencies: ['action-a'],
      })

      wrapper.vm.actions.set('action-c', {
        id: 'action-c',
        name: 'Action C',
        description: '',
        command: 'echo "c"',
        dependencies: ['action-b'],
      })

      const levels = wrapper.vm.calculateLevels()

      expect(levels.get('action-a')).toBe(0)
      expect(levels.get('action-b')).toBe(1)
      expect(levels.get('action-c')).toBe(2)
    })

    it('should detect circular dependencies', async () => {
      const wrapper = mount(ActionsConfigEditor, {
        props: {
          projectPath: '/test/project',
        },
      })

      // Create circular dependency: A -> B -> A
      wrapper.vm.actions.set('action-a', {
        id: 'action-a',
        name: 'Action A',
        description: '',
        command: 'echo "a"',
        dependencies: ['action-b'],
      })

      wrapper.vm.actions.set('action-b', {
        id: 'action-b',
        name: 'Action B',
        description: '',
        command: 'echo "b"',
        dependencies: ['action-a'],
      })

      wrapper.vm.validateConfiguration()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.validationErrors.length).toBeGreaterThan(0)
      expect(wrapper.vm.validationErrors[0]).toContain('Circular dependency')
    })

    it('should detect missing dependencies', async () => {
      const wrapper = mount(ActionsConfigEditor, {
        props: {
          projectPath: '/test/project',
        },
      })

      wrapper.vm.actions.set('action-a', {
        id: 'action-a',
        name: 'Action A',
        description: '',
        command: 'echo "a"',
        dependencies: ['non-existent'],
      })

      wrapper.vm.validateConfiguration()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.validationErrors.length).toBeGreaterThan(0)
      expect(wrapper.vm.validationErrors[0]).toContain('non-existent')
    })
  })

  describe('YAML Export', () => {
    it('should generate valid YAML', () => {
      const wrapper = mount(ActionsConfigEditor, {
        props: {
          projectPath: '/test/project',
        },
      })

      wrapper.vm.actions.set('test-action', {
        id: 'test-action',
        name: 'Test Action',
        description: 'Test description',
        command: 'echo "test"',
        icon: 'Circle',
        dependencies: [],
        parallel: false,
        estimatedDuration: 2000,
      })

      const yaml = wrapper.vm.generateYAML()

      expect(yaml).toContain('version: 1.0')
      expect(yaml).toContain('test-action:')
      expect(yaml).toContain("name: 'Test Action'")
      expect(yaml).toContain('command: \'echo "test"\'')
    })

    it('should include dependencies in YAML', () => {
      const wrapper = mount(ActionsConfigEditor, {
        props: {
          projectPath: '/test/project',
        },
      })

      wrapper.vm.actions.set('action-a', {
        id: 'action-a',
        name: 'Action A',
        description: '',
        command: 'echo "a"',
        dependencies: [],
      })

      wrapper.vm.actions.set('action-b', {
        id: 'action-b',
        name: 'Action B',
        description: '',
        command: 'echo "b"',
        dependencies: ['action-a'],
      })

      const yaml = wrapper.vm.generateYAML()

      expect(yaml).toContain('dependencies: [action-a]')
    })
  })

  describe('DAG Visualization', () => {
    it('should generate DAG nodes with correct positions', async () => {
      const wrapper = mount(ActionsConfigEditor, {
        props: {
          projectPath: '/test/project',
        },
      })

      wrapper.vm.actions.set('action-a', {
        id: 'action-a',
        name: 'Action A',
        description: '',
        command: 'echo "a"',
        dependencies: [],
      })

      wrapper.vm.actions.set('action-b', {
        id: 'action-b',
        name: 'Action B',
        description: '',
        command: 'echo "b"',
        dependencies: ['action-a'],
      })

      // Switch to DAG view
      wrapper.vm.viewMode = 'dag'
      await wrapper.vm.$nextTick()

      const nodes = wrapper.vm.dagNodes

      expect(nodes.length).toBe(2)
      expect(nodes[0].level).toBe(0)
      expect(nodes[1].level).toBe(1)
      expect(nodes[1].x).toBeGreaterThan(nodes[0].x)
    })

    it('should generate connections between dependent actions', async () => {
      const wrapper = mount(ActionsConfigEditor, {
        props: {
          projectPath: '/test/project',
        },
      })

      wrapper.vm.actions.set('action-a', {
        id: 'action-a',
        name: 'Action A',
        description: '',
        command: 'echo "a"',
        dependencies: [],
      })

      wrapper.vm.actions.set('action-b', {
        id: 'action-b',
        name: 'Action B',
        description: '',
        command: 'echo "b"',
        dependencies: ['action-a'],
      })

      wrapper.vm.viewMode = 'dag'
      await wrapper.vm.$nextTick()

      const connections = wrapper.vm.connections

      expect(connections.length).toBe(1)
      expect(connections[0].from).toBe('action-a')
      expect(connections[0].to).toBe('action-b')
      expect(connections[0].path).toContain('M ')
      expect(connections[0].path).toContain('C ')
    })
  })

  describe('Action Selection', () => {
    it('should select action when clicked', async () => {
      const wrapper = mount(ActionsConfigEditor, {
        props: {
          projectPath: '/test/project',
        },
      })

      const testAction: ActionDefinition = {
        id: 'test-action',
        name: 'Test Action',
        description: 'Test',
        command: 'echo "test"',
        dependencies: [],
      }

      wrapper.vm.actions.set('test-action', testAction)
      await wrapper.vm.$nextTick()

      wrapper.vm.selectAction(testAction)
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.selectedAction).toEqual(testAction)
    })

    it('should show detail panel when action is selected', async () => {
      const wrapper = mount(ActionsConfigEditor, {
        props: {
          projectPath: '/test/project',
        },
      })

      const testAction: ActionDefinition = {
        id: 'test-action',
        name: 'Test Action',
        description: 'Test description',
        command: 'echo "test"',
        dependencies: [],
      }

      wrapper.vm.actions.set('test-action', testAction)
      wrapper.vm.selectAction(testAction)
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.list-view__detail').exists()).toBe(true)
      expect(wrapper.find('.detail__header h3').text()).toBe('Test Action')
    })
  })

  describe('Events', () => {
    it('should emit save event when saving', async () => {
      const wrapper = mount(ActionsConfigEditor, {
        props: {
          projectPath: '/test/project',
        },
      })

      // Mock window.electronAPI.invoke for save
      vi.mocked(window.electronAPI.invoke).mockResolvedValue(undefined)

      wrapper.vm.actions.set('test-action', {
        id: 'test-action',
        name: 'Test Action',
        description: '',
        command: 'echo "test"',
        dependencies: [],
      })

      await wrapper.vm.saveConfiguration()

      expect(wrapper.emitted('save')).toBeTruthy()
      expect(wrapper.emitted('save')![0][0]).toContain('test-action')
    })

    it('should emit load event on mount', () => {
      const wrapper = mount(ActionsConfigEditor, {
        props: {
          projectPath: '/test/project',
        },
      })

      expect(wrapper.emitted('load')).toBeTruthy()
    })
  })
})
