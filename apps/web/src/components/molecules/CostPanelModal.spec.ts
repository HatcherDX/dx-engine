/**
 * @fileoverview Comprehensive test suite for CostPanelModal component.
 *
 * @description
 * Tests all functionality including modal visibility, metrics display,
 * model breakdown, number formatting, date formatting, and reset functionality.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick, ref, computed, type ComponentPublicInstance } from 'vue'
import CostPanelModal from './CostPanelModal.vue'
import BaseIcon from '../atoms/BaseIcon.vue'
import BaseButton from '../atoms/BaseButton.vue'
import type { AIMetrics } from '../../composables/useAIMetrics'

/**
 * Type definition for Cost Panel Modal VM instance.
 */
interface CostPanelModalVM {
  totalCost: number
  modelBreakdown: Array<{
    model: string
    calls: number
    cost: number
  }>
  formatCurrency: (value: number) => string
  formatNumber: (value: number) => string
  formatDate: (date: string) => string
  resetMetrics: () => void
}

/**
 * Mock composables.
 */
const mockMetrics = ref<AIMetrics>({
  totalCalls: 10,
  inputTokens: 5000,
  outputTokens: 3000,
  estimatedCost: 0.075,
  lastReset: '2025-01-15T10:30:00.000Z',
  byModel: {
    'Claude Code': {
      calls: 6,
      inputTokens: 3000,
      outputTokens: 2000,
      cost: 0.045,
    },
    'GPT-5': {
      calls: 4,
      inputTokens: 2000,
      outputTokens: 1000,
      cost: 0.03,
    },
  },
})

const mockTotalTokens = computed(
  () => mockMetrics.value.inputTokens + mockMetrics.value.outputTokens
)
const mockAverageTokensPerCall = computed(() => {
  if (mockMetrics.value.totalCalls === 0) return 0
  return Math.round(mockTotalTokens.value / mockMetrics.value.totalCalls)
})
const mockResetMetrics = vi.fn()

vi.mock('../../composables/useAIMetrics', () => ({
  useAIMetrics: () => ({
    metrics: mockMetrics,
    totalTokens: mockTotalTokens,
    averageTokensPerCall: mockAverageTokensPerCall,
    resetMetrics: mockResetMetrics,
  }),
}))

vi.mock('../../composables/useNotifications', () => ({
  useNotifications: () => ({
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}))

describe('CostPanelModal.vue', () => {
  let wrapper: VueWrapper<ComponentPublicInstance>

  /**
   * Reset mocks before each test.
   */
  beforeEach(() => {
    vi.clearAllMocks()
    mockMetrics.value = {
      totalCalls: 10,
      inputTokens: 5000,
      outputTokens: 3000,
      estimatedCost: 0.075,
      lastReset: '2025-01-15T10:30:00.000Z',
      byModel: {
        'Claude Code': {
          calls: 6,
          inputTokens: 3000,
          outputTokens: 2000,
          cost: 0.045,
        },
        'GPT-5': {
          calls: 4,
          inputTokens: 2000,
          outputTokens: 1000,
          cost: 0.03,
        },
      },
    }
  })

  /**
   * Cleanup after each test.
   */
  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  /**
   * Helper to mount component.
   */
  const createWrapper = (props = {}, options = {}) => {
    return mount(CostPanelModal, {
      props: {
        visible: true,
        ...props,
      },
      global: {
        components: {
          BaseIcon,
          BaseButton,
        },
        stubs: {
          BaseIcon: true,
          BaseButton: true,
          ...options.stubs,
        },
      },
    })
  }

  describe('Rendering', () => {
    it('should mount and render without errors', () => {
      wrapper = createWrapper()
      expect(wrapper.exists()).toBe(true)
    })

    it('should not render when visible is false', () => {
      wrapper = createWrapper({ visible: false })
      expect(wrapper.find('.modal-overlay').exists()).toBe(false)
    })

    it('should render modal overlay when visible is true', () => {
      wrapper = createWrapper({ visible: true })
      expect(wrapper.find('.modal-overlay').exists()).toBe(true)
    })

    it('should render modal title "API Usage & Costs"', () => {
      wrapper = createWrapper()
      expect(wrapper.find('.modal-title').text()).toBe('API Usage & Costs')
    })

    it('should render close button with aria-label', () => {
      wrapper = createWrapper()
      const closeButton = wrapper.find('.close-button')
      expect(closeButton.exists()).toBe(true)
      expect(closeButton.attributes('aria-label')).toBe('Close')
    })

    it('should render all 4 metric cards', () => {
      wrapper = createWrapper()
      const metricCards = wrapper.findAll('.metric-card')
      expect(metricCards).toHaveLength(4)
    })

    it('should render Total Calls metric', () => {
      wrapper = createWrapper()
      const labels = wrapper.findAll('.metric-label')
      expect(labels[0].text()).toBe('Total Calls')
      const values = wrapper.findAll('.metric-value')
      expect(values[0].text()).toBe('10')
    })

    it('should render Total Tokens metric', () => {
      wrapper = createWrapper()
      const labels = wrapper.findAll('.metric-label')
      expect(labels[1].text()).toBe('Total Tokens')
      const values = wrapper.findAll('.metric-value')
      expect(values[1].text()).toBe('8,000')
    })

    it('should render Estimated Cost metric', () => {
      wrapper = createWrapper()
      const labels = wrapper.findAll('.metric-label')
      expect(labels[2].text()).toBe('Estimated Cost')
      const values = wrapper.findAll('.metric-value')
      expect(values[2].text()).toBe('$0.0750')
    })

    it('should render Avg Tokens/Call metric', () => {
      wrapper = createWrapper()
      const labels = wrapper.findAll('.metric-label')
      expect(labels[3].text()).toBe('Avg Tokens/Call')
      const values = wrapper.findAll('.metric-value')
      expect(values[3].text()).toBe('800')
    })

    it('should render token breakdown (input/output)', () => {
      wrapper = createWrapper()
      const metricSub = wrapper.find('.metric-sub')
      expect(metricSub.text()).toContain('5,000 in')
      expect(metricSub.text()).toContain('3,000 out')
    })

    it('should render model breakdown section when models exist', () => {
      wrapper = createWrapper()
      expect(wrapper.find('.breakdown-section').exists()).toBe(true)
      expect(wrapper.find('.section-title').text()).toBe('Breakdown by Model')
    })

    it('should render all model items in breakdown', () => {
      wrapper = createWrapper()
      const modelItems = wrapper.findAll('.model-item')
      expect(modelItems).toHaveLength(2)
    })

    it('should render info section', () => {
      wrapper = createWrapper()
      expect(wrapper.find('.info-section').exists()).toBe(true)
      const infoItems = wrapper.findAll('.info-item')
      expect(infoItems).toHaveLength(2)
    })

    it('should render footer with Reset and Close buttons', () => {
      wrapper = createWrapper()
      expect(wrapper.find('.modal-footer').exists()).toBe(true)
    })
  })

  describe('Model Breakdown Display', () => {
    it('should display model names correctly', () => {
      wrapper = createWrapper()
      const modelNames = wrapper.findAll('.model-name')
      expect(modelNames[0].text()).toBe('Claude Code')
      expect(modelNames[1].text()).toBe('GPT-5')
    })

    it('should display model calls count', () => {
      wrapper = createWrapper()
      const statValues = wrapper.findAll('.stat-value')
      // First model (Claude Code) - calls
      expect(statValues[0].text()).toBe('6')
      // Second model (GPT-5) - calls
      expect(statValues[3].text()).toBe('4')
    })

    it('should display model token counts', () => {
      wrapper = createWrapper()
      const statValues = wrapper.findAll('.stat-value')
      // First model (Claude Code) - tokens (3000 + 2000)
      expect(statValues[1].text()).toBe('5,000')
      // Second model (GPT-5) - tokens (2000 + 1000)
      expect(statValues[4].text()).toBe('3,000')
    })

    it('should display model costs', () => {
      wrapper = createWrapper()
      const statValues = wrapper.findAll('.stat-value')
      // First model (Claude Code) - cost
      expect(statValues[2].text()).toBe('$0.0450')
      // Second model (GPT-5) - cost
      expect(statValues[5].text()).toBe('$0.0300')
    })

    it('should sort models by cost (descending)', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as CostPanelModalVM

      // Claude Code has higher cost (0.045) than GPT-5 (0.03)
      expect(vm.modelBreakdown[0].name).toBe('Claude Code')
      expect(vm.modelBreakdown[1].name).toBe('GPT-5')
    })
  })

  describe('Empty State', () => {
    it('should render empty state when no models', async () => {
      mockMetrics.value.byModel = {}
      wrapper = createWrapper()
      await nextTick()

      expect(wrapper.find('.empty-state').exists()).toBe(true)
      expect(wrapper.find('.breakdown-section').exists()).toBe(false)
    })

    it('should display empty state message', async () => {
      mockMetrics.value.byModel = {}
      wrapper = createWrapper()
      await nextTick()

      const emptyState = wrapper.find('.empty-state')
      expect(emptyState.text()).toContain('No API usage yet')
      expect(emptyState.text()).toContain(
        'Start a conversation to see metrics appear here'
      )
    })
  })

  describe('formatNumber Helper', () => {
    it('should format numbers with commas', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as CostPanelModalVM

      expect(vm.formatNumber(1000)).toBe('1,000')
      expect(vm.formatNumber(1000000)).toBe('1,000,000')
      expect(vm.formatNumber(5000)).toBe('5,000')
    })

    it('should format small numbers without commas', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as CostPanelModalVM

      expect(vm.formatNumber(100)).toBe('100')
      expect(vm.formatNumber(50)).toBe('50')
    })

    it('should handle zero', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as CostPanelModalVM

      expect(vm.formatNumber(0)).toBe('0')
    })
  })

  describe('formatDate Helper', () => {
    it('should format ISO date strings correctly', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as CostPanelModalVM

      const result = vm.formatDate('2025-01-15T10:30:00.000Z')
      // Result will vary by locale but should contain month and day
      expect(result).toContain('Jan')
      expect(result).toContain('15')
    })

    it('should include time in formatted date', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as CostPanelModalVM

      const result = vm.formatDate('2025-01-15T10:30:00.000Z')
      // Should contain time components (format varies by locale)
      expect(result.length).toBeGreaterThan(10)
    })
  })

  describe('modelBreakdown Computed Property', () => {
    it('should convert byModel object to array', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as CostPanelModalVM

      expect(Array.isArray(vm.modelBreakdown)).toBe(true)
      expect(vm.modelBreakdown).toHaveLength(2)
    })

    it('should include model name in each item', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as CostPanelModalVM

      expect(vm.modelBreakdown[0]).toHaveProperty('name')
      expect(vm.modelBreakdown[1]).toHaveProperty('name')
    })

    it('should include all model stats', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as CostPanelModalVM

      expect(vm.modelBreakdown[0]).toHaveProperty('calls')
      expect(vm.modelBreakdown[0]).toHaveProperty('inputTokens')
      expect(vm.modelBreakdown[0]).toHaveProperty('outputTokens')
      expect(vm.modelBreakdown[0]).toHaveProperty('cost')
    })

    it('should return empty array when no models', async () => {
      mockMetrics.value.byModel = {}
      wrapper = createWrapper()
      await nextTick()
      const vm = wrapper.vm as unknown as CostPanelModalVM

      expect(vm.modelBreakdown).toEqual([])
    })
  })

  describe('Reset Functionality', () => {
    it('should call resetMetrics when Reset button clicked', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      await nextTick()

      const buttons = wrapper.findAll('button')
      const resetButton = buttons.find((btn) => btn.text().includes('Reset'))
      await resetButton!.trigger('click')

      expect(mockResetMetrics).toHaveBeenCalled()
    })

    it('should call handleReset method', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as CostPanelModalVM
      const spy = vi.spyOn(vm, 'handleReset')

      vm.handleReset()

      expect(spy).toHaveBeenCalled()
      expect(mockResetMetrics).toHaveBeenCalled()
    })
  })

  describe('Modal Interactions', () => {
    it('should emit close event when close button clicked', async () => {
      wrapper = createWrapper()
      const closeButton = wrapper.find('.close-button')
      await closeButton.trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should emit close event when overlay clicked', async () => {
      wrapper = createWrapper()
      const overlay = wrapper.find('.modal-overlay')
      await overlay.trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should not emit close when modal container clicked', async () => {
      wrapper = createWrapper()
      const container = wrapper.find('.modal-container')
      await container.trigger('click')

      expect(wrapper.emitted('close')).toBeFalsy()
    })

    it('should call handleOverlayClick when overlay clicked', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as CostPanelModalVM

      vm.handleOverlayClick()

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should emit close when Close button clicked', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      await nextTick()

      const buttons = wrapper.findAll('button')
      const closeButton = buttons.find(
        (btn) => btn.text().includes('Close') && !btn.text().includes('Reset')
      )
      await closeButton!.trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
    })
  })

  describe('Component Lifecycle', () => {
    it('should initialize with metrics from composable', () => {
      wrapper = createWrapper({ visible: false })
      const vm = wrapper.vm as unknown as CostPanelModalVM

      // Composable metrics should be available
      expect(vm.metrics.totalCalls).toBe(10)
      expect(vm.totalTokens).toBe(8000)
      expect(vm.averageTokensPerCall).toBe(800)
    })

    it('should cleanup properly when unmounted', () => {
      wrapper = createWrapper()
      expect(() => wrapper.unmount()).not.toThrow()
    })
  })

  describe('Accessibility', () => {
    it('should have proper aria-label on close button', () => {
      wrapper = createWrapper()
      const closeButton = wrapper.find('.close-button')
      expect(closeButton.attributes('aria-label')).toBe('Close')
    })

    it('should have proper semantic structure', () => {
      wrapper = createWrapper()
      expect(wrapper.find('.modal-title').element.tagName).toBe('H2')
      expect(wrapper.find('.section-title').element.tagName).toBe('H3')
    })
  })

  describe('Edge Cases', () => {
    it('should handle zero total calls', async () => {
      mockMetrics.value.totalCalls = 0
      mockMetrics.value.inputTokens = 0
      mockMetrics.value.outputTokens = 0
      mockMetrics.value.estimatedCost = 0
      wrapper = createWrapper()
      await nextTick()

      const values = wrapper.findAll('.metric-value')
      expect(values[0].text()).toBe('0')
      expect(values[3].text()).toBe('0') // Average should be 0
    })

    it('should handle very large numbers', async () => {
      mockMetrics.value.inputTokens = 1000000
      mockMetrics.value.outputTokens = 500000
      wrapper = createWrapper()
      await nextTick()

      const values = wrapper.findAll('.metric-value')
      expect(values[1].text()).toBe('1,500,000')
    })

    it('should handle single model', async () => {
      mockMetrics.value.byModel = {
        'Claude Code': {
          calls: 10,
          inputTokens: 5000,
          outputTokens: 3000,
          cost: 0.075,
        },
      }
      wrapper = createWrapper()
      await nextTick()

      const modelItems = wrapper.findAll('.model-item')
      expect(modelItems).toHaveLength(1)
    })

    it('should handle multiple models with same cost', async () => {
      mockMetrics.value.byModel = {
        'Model A': {
          calls: 5,
          inputTokens: 2500,
          outputTokens: 1500,
          cost: 0.03,
        },
        'Model B': {
          calls: 5,
          inputTokens: 2500,
          outputTokens: 1500,
          cost: 0.03,
        },
      }
      wrapper = createWrapper()
      await nextTick()

      const vm = wrapper.vm as unknown as CostPanelModalVM
      expect(vm.modelBreakdown).toHaveLength(2)
    })
  })

  describe('Integration Tests', () => {
    it('should complete full workflow: view metrics and reset', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      await nextTick()

      // Verify metrics are displayed
      const values = wrapper.findAll('.metric-value')
      expect(values[0].text()).toBe('10')

      // Reset metrics
      const buttons = wrapper.findAll('button')
      const resetButton = buttons.find((btn) => btn.text().includes('Reset'))
      await resetButton!.trigger('click')

      expect(mockResetMetrics).toHaveBeenCalled()
    })

    it('should complete full workflow: view breakdown and close', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      await nextTick()

      // Verify breakdown is shown
      const modelItems = wrapper.findAll('.model-item')
      expect(modelItems).toHaveLength(2)

      // Close modal
      const buttons = wrapper.findAll('button')
      const closeButton = buttons.find(
        (btn) => btn.text().includes('Close') && !btn.text().includes('Reset')
      )
      await closeButton!.trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
    })
  })

  describe('Computed Properties from Composable', () => {
    it('should use totalTokens from composable', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as CostPanelModalVM

      expect(vm.totalTokens).toBe(8000)
    })

    it('should use averageTokensPerCall from composable', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as CostPanelModalVM

      expect(vm.averageTokensPerCall).toBe(800)
    })

    it('should reactively update when metrics change', async () => {
      wrapper = createWrapper()

      // Change metrics
      mockMetrics.value.totalCalls = 20
      mockMetrics.value.inputTokens = 10000
      mockMetrics.value.outputTokens = 6000

      await nextTick()

      const vm = wrapper.vm as unknown as CostPanelModalVM
      expect(vm.totalTokens).toBe(16000)
      expect(vm.averageTokensPerCall).toBe(800)
    })
  })
})
