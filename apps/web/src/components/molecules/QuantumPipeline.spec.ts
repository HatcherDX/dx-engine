/**
 * @fileoverview Comprehensive test suite for QuantumPipeline.vue component
 *
 * @description
 * Complete test coverage for all functionality including component rendering,
 * user interactions, computed properties, helper functions, and async operations.
 * Targets 100% statement, branch, function, and line coverage.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @internal
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import QuantumPipeline from './QuantumPipeline.vue'

// Mock child components
vi.mock('../atoms/QuantumNode.vue', () => ({
  default: {
    name: 'QuantumNode',
    template:
      '<div class="quantum-node" :data-status="status">QuantumNode</div>',
    props: [
      'designation',
      'operation',
      'status',
      'progress',
      'energyLevel',
      'quantumStability',
      'actionIcon',
      'dataFlow',
      'quantumThreads',
      'recentLogs',
    ],
  },
}))

vi.mock('../atoms/EnergyConnection.vue', () => ({
  default: {
    name: 'EnergyConnection',
    template:
      '<div class="energy-connection" :data-status="status" :data-active="isActive">EnergyConnection</div>',
    props: [
      'height',
      'status',
      'isActive',
      'showDataPulses',
      'showStatusIndicator',
    ],
  },
}))

vi.mock('../atoms/BaseIcon.vue', () => ({
  default: {
    name: 'BaseIcon',
    template:
      '<div class="base-icon" :data-name="name" :data-size="size" :class="$attrs.class">BaseIcon</div>',
    props: ['name', 'size'],
  },
}))

// Mock composables
const mockQuantumActions = {
  actions: ref([]),
  isRunning: ref(false),
  overallProgress: ref(0),
  pipelineStatus: ref('idle'),
  executeActions: vi.fn(),
  resetPipeline: vi.fn(),
}

const mockSmartPipeline = {
  isEnabled: ref(false),
  enableSmartPipeline: vi.fn(),
  disableSmartPipeline: vi.fn(),
}

vi.mock('../../composables/useQuantumActions', () => ({
  useQuantumActions: () => mockQuantumActions,
}))

vi.mock('../../composables/useSmartPipeline', () => ({
  useSmartPipeline: () => mockSmartPipeline,
}))

describe('QuantumPipeline.vue', () => {
  // Test data
  const mockActions = [
    {
      id: 'code-quality',
      designation: 'Q1',
      operation: 'Code Quality',
      status: 'pending',
      progress: 0,
      energyLevel: 50,
      quantumStability: 85,
      actionIcon: 'CheckSquare',
      dataFlow: 'input',
      quantumThreads: 2,
      logs: ['Starting code quality check'],
    },
    {
      id: 'type-check',
      designation: 'Q2',
      operation: 'Type Check',
      status: 'running',
      progress: 45,
      energyLevel: 75,
      quantumStability: 90,
      actionIcon: 'Shield',
      dataFlow: 'processing',
      quantumThreads: 3,
      logs: ['Type checking in progress', 'Analyzing types'],
    },
    {
      id: 'unit-tests',
      designation: 'Q3',
      operation: 'Unit Tests',
      status: 'success',
      progress: 100,
      energyLevel: 100,
      quantumStability: 95,
      actionIcon: 'TestTube',
      dataFlow: 'output',
      quantumThreads: 4,
      logs: ['All tests passed', 'Coverage: 95%', 'Tests completed'],
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    mockQuantumActions.actions.value = []
    mockQuantumActions.isRunning.value = false
    mockQuantumActions.overallProgress.value = 0
    mockQuantumActions.pipelineStatus.value = 'idle'
    mockSmartPipeline.isEnabled.value = false
  })

  describe('🎯 Basic Rendering', () => {
    it('should mount and render with default props', () => {
      const wrapper = mount(QuantumPipeline)

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('.actions-pipeline').exists()).toBe(true)
      expect(wrapper.find('.pipeline-header').exists()).toBe(true)
      expect(wrapper.find('.pipeline-flow').exists()).toBe(true)
    })

    it('should render with isExpanded prop', () => {
      const wrapper = mount(QuantumPipeline, {
        props: { isExpanded: true },
      })

      expect(wrapper.find('.actions-pipeline').classes()).toContain(
        'pipeline-expanded'
      )
    })

    it('should render status indicator with correct class', () => {
      mockQuantumActions.pipelineStatus.value = 'executing'
      const wrapper = mount(QuantumPipeline)

      const statusIndicator = wrapper.find('.status-indicator')
      expect(statusIndicator.exists()).toBe(true)
      expect(statusIndicator.classes()).toContain('status-executing')
    })

    it('should render expandable content', () => {
      const wrapper = mount(QuantumPipeline)

      expect(wrapper.find('.expandable-content').exists()).toBe(true)
      expect(wrapper.find('.title-text').text()).toBe('hatcher::actions')
      expect(wrapper.find('.test-trigger').exists()).toBe(true)
    })
  })

  describe('🎯 Pipeline Active State', () => {
    it('should add pipeline-active class when running', () => {
      mockQuantumActions.isRunning.value = true
      const wrapper = mount(QuantumPipeline)

      expect(wrapper.find('.actions-pipeline').classes()).toContain(
        'pipeline-active'
      )
    })

    it('should not add pipeline-active class when not running', () => {
      mockQuantumActions.isRunning.value = false
      const wrapper = mount(QuantumPipeline)

      expect(wrapper.find('.actions-pipeline').classes()).not.toContain(
        'pipeline-active'
      )
    })
  })

  describe('🎯 Test Trigger Button', () => {
    it('should render Play icon when not running', () => {
      mockQuantumActions.isRunning.value = false
      const wrapper = mount(QuantumPipeline)

      const icon = wrapper.find('.test-trigger .base-icon')
      expect(icon.attributes('data-name')).toBe('Play')
      expect(icon.classes()).not.toContain('spinning')
    })

    it('should render Loader icon with spinning class when running', () => {
      mockQuantumActions.isRunning.value = true
      const wrapper = mount(QuantumPipeline)

      const icon = wrapper.find('.test-trigger .base-icon')
      expect(icon.attributes('data-name')).toBe('Loader')
      expect(icon.classes()).toContain('spinning')
    })

    it('should be disabled when running', () => {
      mockQuantumActions.isRunning.value = true
      const wrapper = mount(QuantumPipeline)

      const button = wrapper.find('.test-trigger')
      expect(button.attributes('disabled')).toBeDefined()
    })

    it('should call executeActions when clicked and not running', async () => {
      mockQuantumActions.isRunning.value = false
      const wrapper = mount(QuantumPipeline)

      const button = wrapper.find('.test-trigger')
      await button.trigger('click')

      expect(mockQuantumActions.executeActions).toHaveBeenCalledOnce()
    })

    it('should not call executeActions when clicked and running', async () => {
      mockQuantumActions.isRunning.value = true
      const wrapper = mount(QuantumPipeline)

      const button = wrapper.find('.test-trigger')
      await button.trigger('click')

      expect(mockQuantumActions.executeActions).not.toHaveBeenCalled()
    })
  })

  describe('🎯 Pipeline Flow and Actions', () => {
    it('should render actions when provided', () => {
      mockQuantumActions.actions.value = mockActions
      const wrapper = mount(QuantumPipeline)

      const steps = wrapper.findAll('.pipeline-step')
      expect(steps).toHaveLength(3)

      const quantumNodes = wrapper.findAll('.quantum-node')
      expect(quantumNodes).toHaveLength(3)
    })

    it('should render action info for each action', () => {
      mockQuantumActions.actions.value = mockActions
      const wrapper = mount(QuantumPipeline)

      const actionNames = wrapper.findAll('.action-name')
      expect(actionNames).toHaveLength(3)
      expect(actionNames[0].text()).toBe('Code Quality')
      expect(actionNames[1].text()).toBe('Type Check')
      expect(actionNames[2].text()).toBe('Unit Tests')
    })

    it('should render energy connections between actions', () => {
      mockQuantumActions.actions.value = mockActions
      const wrapper = mount(QuantumPipeline)

      const connections = wrapper.findAll('.energy-connection')
      expect(connections).toHaveLength(2) // n-1 connections for n actions
    })

    it('should not render energy connection after last action', () => {
      mockQuantumActions.actions.value = [mockActions[0]]
      const wrapper = mount(QuantumPipeline)

      const connections = wrapper.findAll('.energy-connection')
      expect(connections).toHaveLength(0)
    })
  })

  describe('🎯 Progress Indicator', () => {
    it('should not render progress when overallProgress is 0', () => {
      mockQuantumActions.overallProgress.value = 0
      const wrapper = mount(QuantumPipeline)

      expect(wrapper.find('.simple-progress').exists()).toBe(false)
    })

    it('should render progress when overallProgress > 0', () => {
      mockQuantumActions.overallProgress.value = 65.7
      const wrapper = mount(QuantumPipeline)

      const progress = wrapper.find('.simple-progress')
      expect(progress.exists()).toBe(true)
      expect(wrapper.find('.progress-text').text()).toBe('66%')
    })

    it('should apply progress-running class for running status', () => {
      mockQuantumActions.overallProgress.value = 50
      mockQuantumActions.pipelineStatus.value = 'executing'
      const wrapper = mount(QuantumPipeline)

      expect(wrapper.find('.progress-text').classes()).toContain(
        'progress-running'
      )
    })

    it('should apply progress-success class for completed status', () => {
      mockQuantumActions.overallProgress.value = 100
      mockQuantumActions.pipelineStatus.value = 'completed'
      const wrapper = mount(QuantumPipeline)

      expect(wrapper.find('.progress-text').classes()).toContain(
        'progress-success'
      )
    })

    it('should apply progress-failed class for failed status', () => {
      mockQuantumActions.overallProgress.value = 25
      mockQuantumActions.pipelineStatus.value = 'failed'
      const wrapper = mount(QuantumPipeline)

      expect(wrapper.find('.progress-text').classes()).toContain(
        'progress-failed'
      )
    })
  })

  describe('🎯 Helper Functions', () => {
    it('getConnectionHeight should return varying heights', () => {
      const wrapper = mount(QuantumPipeline)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const component = wrapper.vm as any

      expect(component.getConnectionHeight(0)).toBe(64)
      expect(component.getConnectionHeight(1)).toBe(48)
      expect(component.getConnectionHeight(2)).toBe(56)
      expect(component.getConnectionHeight(3)).toBe(72)
      expect(component.getConnectionHeight(4)).toBe(60)
      expect(component.getConnectionHeight(5)).toBe(64) // cycles back
    })

    it('getCommandForAction should return correct commands', () => {
      const wrapper = mount(QuantumPipeline)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const component = wrapper.vm as any

      expect(component.getCommandForAction('code-quality')).toBe('pnpm lint')
      expect(component.getCommandForAction('type-check')).toBe('pnpm typecheck')
      expect(component.getCommandForAction('format')).toBe('pnpm format')
      expect(component.getCommandForAction('unit-tests')).toBe('pnpm test')
      expect(component.getCommandForAction('build')).toBe('pnpm build')
      expect(component.getCommandForAction('unknown')).toBe('')
    })
  })

  describe('🎯 getConnectionStatus Function', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test requires flexible typing for validation testing
    let wrapper: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test requires flexible typing for validation testing
    let component: any

    beforeEach(() => {
      wrapper = mount(QuantumPipeline)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      component = wrapper.vm as any
    })

    it('should return "failed" when current action failed', () => {
      const currentAction = { ...mockActions[0], status: 'failed' }
      const nextAction = mockActions[1]

      expect(component.getConnectionStatus(currentAction, nextAction)).toBe(
        'failed'
      )
    })

    it('should return "active" when current success and next running', () => {
      const currentAction = { ...mockActions[0], status: 'success' }
      const nextAction = { ...mockActions[1], status: 'running' }

      expect(component.getConnectionStatus(currentAction, nextAction)).toBe(
        'active'
      )
    })

    it('should return "active" when current success and next initializing', () => {
      const currentAction = { ...mockActions[0], status: 'success' }
      const nextAction = { ...mockActions[1], status: 'initializing' }

      expect(component.getConnectionStatus(currentAction, nextAction)).toBe(
        'active'
      )
    })

    it('should return "completed" when current success and next success', () => {
      const currentAction = { ...mockActions[0], status: 'success' }
      const nextAction = { ...mockActions[1], status: 'success' }

      expect(component.getConnectionStatus(currentAction, nextAction)).toBe(
        'completed'
      )
    })

    it('should return "active" when current running', () => {
      const currentAction = { ...mockActions[0], status: 'running' }

      expect(component.getConnectionStatus(currentAction)).toBe('active')
    })

    it('should return "active" when current initializing', () => {
      const currentAction = { ...mockActions[0], status: 'initializing' }

      expect(component.getConnectionStatus(currentAction)).toBe('active')
    })

    it('should return "pending" for other statuses', () => {
      const currentAction = { ...mockActions[0], status: 'pending' }

      expect(component.getConnectionStatus(currentAction)).toBe('pending')
    })

    it('should handle missing nextAction', () => {
      const currentAction = { ...mockActions[0], status: 'success' }

      expect(component.getConnectionStatus(currentAction, undefined)).toBe(
        'pending'
      )
    })
  })

  describe('🎯 isConnectionActive Function', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test requires flexible typing for validation testing
    let wrapper: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test requires flexible typing for validation testing
    let component: any

    beforeEach(() => {
      wrapper = mount(QuantumPipeline)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      component = wrapper.vm as any
    })

    it('should return true when current action is running', () => {
      const currentAction = { ...mockActions[0], status: 'running' }

      expect(component.isConnectionActive(currentAction)).toBe(true)
    })

    it('should return true when current action is initializing', () => {
      const currentAction = { ...mockActions[0], status: 'initializing' }

      expect(component.isConnectionActive(currentAction)).toBe(true)
    })

    it('should return true when current success and next running', () => {
      const currentAction = { ...mockActions[0], status: 'success' }
      const nextAction = { ...mockActions[1], status: 'running' }

      expect(component.isConnectionActive(currentAction, nextAction)).toBe(true)
    })

    it('should return true when current success and next initializing', () => {
      const currentAction = { ...mockActions[0], status: 'success' }
      const nextAction = { ...mockActions[1], status: 'initializing' }

      expect(component.isConnectionActive(currentAction, nextAction)).toBe(true)
    })

    it('should return false when current success and next not running/initializing', () => {
      const currentAction = { ...mockActions[0], status: 'success' }
      const nextAction = { ...mockActions[1], status: 'pending' }

      expect(component.isConnectionActive(currentAction, nextAction)).toBe(
        false
      )
    })

    it('should return false when current success but no next action', () => {
      const currentAction = { ...mockActions[0], status: 'success' }

      // When nextAction is undefined, the expression evaluates to undefined due to short-circuit evaluation
      const result = component.isConnectionActive(currentAction, undefined)
      expect(!!result).toBe(false) // Convert to boolean for assertion
    })

    it('should return false for other statuses', () => {
      const currentAction = { ...mockActions[0], status: 'pending' }

      expect(component.isConnectionActive(currentAction)).toBe(false)
    })
  })

  describe('🎯 handleStepClick Function', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test requires flexible typing for validation testing
    let wrapper: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test requires flexible typing for validation testing
    let component: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test requires flexible typing for validation testing
    let consoleSpy: any

    beforeEach(() => {
      wrapper = mount(QuantumPipeline)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      component = wrapper.vm as any
      consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      vi.spyOn(console, 'error').mockImplementation(() => {})
      mockQuantumActions.actions.value = mockActions
    })

    afterEach(() => {
      consoleSpy.mockRestore()
    })

    it('should execute actions when clicking first step and not running', async () => {
      mockQuantumActions.isRunning.value = false

      await component.handleStepClick(mockActions[0], 0)

      expect(mockQuantumActions.executeActions).toHaveBeenCalledOnce()
    })

    it('should not execute actions when clicking first step and running', async () => {
      mockQuantumActions.isRunning.value = true

      await component.handleStepClick(mockActions[0], 0)

      expect(mockQuantumActions.executeActions).not.toHaveBeenCalled()
    })

    it('should reset pipeline when clicking second step with conditions met', async () => {
      mockQuantumActions.isRunning.value = false
      mockQuantumActions.actions.value = [
        { ...mockActions[0], status: 'success' },
        mockActions[1],
      ]

      await component.handleStepClick(mockActions[1], 1)

      expect(mockQuantumActions.resetPipeline).toHaveBeenCalledOnce()
    })

    it('should not reset pipeline when running', async () => {
      mockQuantumActions.isRunning.value = true
      mockQuantumActions.actions.value = [
        { ...mockActions[0], status: 'success' },
        mockActions[1],
      ]

      await component.handleStepClick(mockActions[1], 1)

      expect(mockQuantumActions.resetPipeline).not.toHaveBeenCalled()
    })

    it('should not reset pipeline when all actions are pending', async () => {
      mockQuantumActions.isRunning.value = false
      mockQuantumActions.actions.value = [
        { ...mockActions[0], status: 'pending' },
        { ...mockActions[1], status: 'pending' },
      ]

      await component.handleStepClick(mockActions[1], 1)

      expect(mockQuantumActions.resetPipeline).not.toHaveBeenCalled()
    })

    it('should disable smart pipeline when enabled and clicking third step', async () => {
      mockSmartPipeline.isEnabled.value = true

      await component.handleStepClick(mockActions[2], 2)

      expect(mockSmartPipeline.disableSmartPipeline).toHaveBeenCalledOnce()
      expect(consoleSpy).toHaveBeenCalledWith('Smart pipeline disabled')
    })

    it('should enable smart pipeline when disabled and clicking third step', async () => {
      mockSmartPipeline.isEnabled.value = false
      mockSmartPipeline.enableSmartPipeline.mockResolvedValue(undefined)

      await component.handleStepClick(mockActions[2], 2)

      expect(mockSmartPipeline.enableSmartPipeline).toHaveBeenCalledOnce()
      expect(consoleSpy).toHaveBeenCalledWith('Smart pipeline enabled')
    })

    it('should handle smart pipeline enable error', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})
      mockSmartPipeline.isEnabled.value = false
      const error = new Error('Smart pipeline failed')
      mockSmartPipeline.enableSmartPipeline.mockRejectedValue(error)

      await component.handleStepClick(mockActions[2], 2)

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to toggle smart pipeline:',
        error
      )
      consoleErrorSpy.mockRestore()
    })

    it('should log modal message for other step indices', async () => {
      await component.handleStepClick(mockActions[0], 3)
      await component.handleStepClick(mockActions[0], 4)
      await component.handleStepClick(mockActions[0], 99)

      expect(consoleSpy).toHaveBeenCalledWith(
        'Open modal for:',
        mockActions[0].operation
      )
      expect(consoleSpy).toHaveBeenCalledTimes(3)
    })
  })

  describe('🎯 Step Button Interactions', () => {
    it('should trigger handleStepClick when step button is clicked', async () => {
      mockQuantumActions.actions.value = mockActions
      const wrapper = mount(QuantumPipeline)

      const stepButtons = wrapper.findAll('.step-button')
      expect(stepButtons).toHaveLength(3)

      // Mock the handleStepClick method
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const handleStepClickSpy = vi.spyOn(wrapper.vm as any, 'handleStepClick')

      await stepButtons[0].trigger('click')

      expect(handleStepClickSpy).toHaveBeenCalledWith(mockActions[0], 0)
    })
  })

  describe('🎯 Component Props and Data Integration', () => {
    it('should render action commands correctly', () => {
      mockQuantumActions.actions.value = mockActions
      const wrapper = mount(QuantumPipeline)

      const commands = wrapper.findAll('.action-command')
      expect(commands[0].text()).toBe('pnpm lint')
      expect(commands[1].text()).toBe('pnpm typecheck')
      expect(commands[2].text()).toBe('pnpm test')
    })

    it('should pass correct props to QuantumNode', () => {
      mockQuantumActions.actions.value = [mockActions[0]]
      const wrapper = mount(QuantumPipeline)

      const quantumNode = wrapper.findComponent({ name: 'QuantumNode' })
      expect(quantumNode.props()).toEqual({
        designation: 'Q1',
        operation: 'Code Quality',
        status: 'pending',
        progress: 0,
        energyLevel: 50,
        quantumStability: 85,
        actionIcon: 'CheckSquare',
        dataFlow: 'input',
        quantumThreads: 2,
        recentLogs: ['Starting code quality check'],
      })
    })

    it('should pass correct props to EnergyConnection', () => {
      mockQuantumActions.actions.value = mockActions.slice(0, 2)
      const wrapper = mount(QuantumPipeline)

      const energyConnection = wrapper.findComponent({
        name: 'EnergyConnection',
      })
      expect(energyConnection.exists()).toBe(true)
      expect(energyConnection.props()).toEqual({
        height: 64, // getConnectionHeight(0)
        status: 'pending', // from getConnectionStatus
        isActive: false, // from isConnectionActive
        showDataPulses: true,
        showStatusIndicator: true, // index 0 % 2 === 0
      })
    })

    it('should show correct status indicator for different statuses', () => {
      const statuses = ['idle', 'pending', 'executing', 'completed', 'failed']

      statuses.forEach((status) => {
        mockQuantumActions.pipelineStatus.value = status
        const wrapper = mount(QuantumPipeline)

        const statusIndicator = wrapper.find('.status-indicator')
        expect(statusIndicator.classes()).toContain(`status-${status}`)
      })
    })
  })

  describe('🎯 Edge Cases and Error Handling', () => {
    it('should handle empty actions array', () => {
      mockQuantumActions.actions.value = []
      const wrapper = mount(QuantumPipeline)

      expect(wrapper.findAll('.pipeline-step')).toHaveLength(0)
      expect(wrapper.findAll('.energy-connection')).toHaveLength(0)
    })

    it('should handle undefined action properties gracefully', () => {
      const incompleteAction = {
        id: 'incomplete',
        designation: 'Q1',
        operation: 'Incomplete',
        status: 'pending',
        logs: [],
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test requires flexible typing for validation testing
      mockQuantumActions.actions.value = [incompleteAction as any]
      const wrapper = mount(QuantumPipeline)

      expect(wrapper.find('.quantum-node').exists()).toBe(true)
      expect(wrapper.find('.action-name').text()).toBe('Incomplete')
    })

    it('should slice recent logs correctly', () => {
      const actionWithManyLogs = {
        ...mockActions[0],
        logs: ['log1', 'log2', 'log3', 'log4', 'log5', 'log6'],
      }

      mockQuantumActions.actions.value = [actionWithManyLogs]
      const wrapper = mount(QuantumPipeline)

      const quantumNode = wrapper.findComponent({ name: 'QuantumNode' })
      expect(quantumNode.props('recentLogs')).toEqual(['log4', 'log5', 'log6'])
    })

    it('should handle smart pipeline error correctly', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})
      mockSmartPipeline.disableSmartPipeline.mockImplementation(() => {
        throw new Error('Disable failed')
      })
      mockSmartPipeline.isEnabled.value = true

      const wrapper = mount(QuantumPipeline)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const component = wrapper.vm as any

      await component.handleStepClick(mockActions[2], 2)

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to toggle smart pipeline:',
        expect.any(Error)
      )
      consoleErrorSpy.mockRestore()
    })
  })

  describe('🎯 Computed Property Reactivity', () => {
    it('should update progress color class when pipeline status changes', async () => {
      mockQuantumActions.overallProgress.value = 50
      const wrapper = mount(QuantumPipeline)

      // Test different status changes
      mockQuantumActions.pipelineStatus.value = 'executing'
      await nextTick()
      expect(wrapper.find('.progress-text').classes()).toContain(
        'progress-running'
      )

      mockQuantumActions.pipelineStatus.value = 'completed'
      await nextTick()
      expect(wrapper.find('.progress-text').classes()).toContain(
        'progress-success'
      )

      mockQuantumActions.pipelineStatus.value = 'failed'
      await nextTick()
      expect(wrapper.find('.progress-text').classes()).toContain(
        'progress-failed'
      )
    })
  })
})
