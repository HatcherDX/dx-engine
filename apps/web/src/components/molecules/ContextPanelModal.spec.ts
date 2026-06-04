/**
 * @fileoverview Comprehensive test suite for ContextPanelModal component.
 *
 * @description
 * Tests all functionality including modal visibility, context window progress,
 * message stats, recommendations, and clear functionality.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick, ref, computed, type ComponentPublicInstance } from 'vue'
import ContextPanelModal from './ContextPanelModal.vue'
import BaseIcon from '../atoms/BaseIcon.vue'
import BaseButton from '../atoms/BaseButton.vue'

/**
 * Type definition for Context Panel Modal VM instance.
 */
interface Recommendation {
  message: string
  icon: string
  type: string
}

interface ContextPanelModalVM {
  progressClass: string
  totalTokens: number
  contextPercentage: number
  totalMessages: number
  recommendations: Recommendation[]
  clearAllContext: () => void
}

/**
 * Mock AI metrics composable.
 */
const mockMetrics = ref({
  totalCalls: 10,
  inputTokens: 50000,
  outputTokens: 30000,
  estimatedCost: 0.1,
  lastReset: '2025-01-15T10:30:00.000Z',
  byModel: {},
})

const mockResetMetrics = vi.fn()

vi.mock('../../composables/useAIMetrics', () => ({
  useAIMetrics: () => ({
    metrics: mockMetrics,
    totalTokens: computed(
      () => mockMetrics.value.inputTokens + mockMetrics.value.outputTokens
    ),
    averageTokensPerCall: computed(() => {
      if (mockMetrics.value.totalCalls === 0) return 0
      return Math.round(
        (mockMetrics.value.inputTokens + mockMetrics.value.outputTokens) /
          mockMetrics.value.totalCalls
      )
    }),
    resetMetrics: mockResetMetrics,
  }),
}))

/**
 * Mock notifications composable.
 */
const mockSuccess = vi.fn()

vi.mock('../../composables/useNotifications', () => ({
  useNotifications: () => ({
    success: mockSuccess,
    warning: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}))

describe('ContextPanelModal.vue', () => {
  let wrapper: VueWrapper<ComponentPublicInstance>

  /**
   * Reset mocks before each test.
   */
  beforeEach(() => {
    mockMetrics.value = {
      totalCalls: 10,
      inputTokens: 50000,
      outputTokens: 30000,
      estimatedCost: 0.1,
      lastReset: '2025-01-15T10:30:00.000Z',
      byModel: {},
    }
    mockSuccess.mockClear()
    mockResetMetrics.mockClear()
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
    return mount(ContextPanelModal, {
      props: {
        visible: true,
        messageCount: 25,
        userMessageCount: 13,
        aiMessageCount: 12,
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

    it('should render modal title "Context Usage"', () => {
      wrapper = createWrapper()
      expect(wrapper.find('.modal-title').text()).toBe('Context Usage')
    })

    it('should render close button with aria-label', () => {
      wrapper = createWrapper()
      const closeButton = wrapper.find('.close-button')
      expect(closeButton.exists()).toBe(true)
      expect(closeButton.attributes('aria-label')).toBe('Close')
    })

    it('should render context window card', () => {
      wrapper = createWrapper()
      expect(wrapper.find('.context-card').exists()).toBe(true)
      expect(wrapper.find('.card-header').text()).toContain('Context Window')
    })

    it('should render progress bar', () => {
      wrapper = createWrapper()
      expect(wrapper.find('.progress-bar').exists()).toBe(true)
      expect(wrapper.find('.progress-fill').exists()).toBe(true)
    })

    it('should render progress labels', () => {
      wrapper = createWrapper()
      const labels = wrapper.find('.progress-labels')
      expect(labels.exists()).toBe(true)
      expect(labels.text()).toContain('tokens')
    })

    it('should render percentage display', () => {
      wrapper = createWrapper()
      const percentage = wrapper.find('.percentage-display')
      expect(percentage.exists()).toBe(true)
      expect(percentage.text()).toContain('% used')
    })

    it('should render stats grid with 4 stat cards', () => {
      wrapper = createWrapper()
      const statCards = wrapper.findAll('.stat-card')
      expect(statCards).toHaveLength(4)
    })

    it('should render info section with 2 info items', () => {
      wrapper = createWrapper()
      const infoItems = wrapper.findAll('.info-item')
      expect(infoItems).toHaveLength(2)
    })

    it('should render footer with Clear and Close buttons', () => {
      wrapper = createWrapper()
      const footer = wrapper.find('.modal-footer')
      expect(footer.exists()).toBe(true)
    })
  })

  describe('Context Window Display', () => {
    it('should calculate currentTokens correctly', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as ContextPanelModalVM

      // 50000 + 30000 = 80000
      expect(vm.currentTokens).toBe(80000)
    })

    it('should cap currentTokens at maxTokens (200k)', () => {
      mockMetrics.value.inputTokens = 150000
      mockMetrics.value.outputTokens = 150000
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as ContextPanelModalVM

      // Should be capped at 200000
      expect(vm.currentTokens).toBe(200000)
    })

    it('should calculate contextPercentage correctly', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as ContextPanelModalVM

      // (80000 / 200000) * 100 = 40%
      expect(vm.contextPercentage).toBe(40)
    })

    it('should display formatted token count', () => {
      wrapper = createWrapper()
      const current = wrapper.find('.current')
      expect(current.text()).toBe('80,000 tokens')
    })

    it('should display max tokens', () => {
      wrapper = createWrapper()
      const max = wrapper.find('.max')
      expect(max.text()).toBe('/ 200,000')
    })

    it('should display percentage with one decimal', () => {
      wrapper = createWrapper()
      const percentage = wrapper.find('.percentage-display')
      expect(percentage.text()).toBe('40.0% used')
    })

    it('should update progress bar width based on percentage', () => {
      wrapper = createWrapper()
      const progressFill = wrapper.find('.progress-fill')
      expect(progressFill.attributes('style')).toContain('width: 40%')
    })
  })

  describe('Progress Class Logic', () => {
    it('should have "normal" class when usage is below 70%', () => {
      // 40% usage
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as ContextPanelModalVM

      expect(vm.progressClass).toBe('normal')
      expect(wrapper.find('.progress-fill').classes()).toContain('normal')
      expect(wrapper.find('.percentage-display').classes()).toContain('normal')
    })

    it('should have "warning" class when usage is 70-89%', async () => {
      // 75% usage: 150000 tokens
      mockMetrics.value.inputTokens = 90000
      mockMetrics.value.outputTokens = 60000
      wrapper = createWrapper()
      await nextTick()
      const vm = wrapper.vm as unknown as ContextPanelModalVM

      expect(vm.progressClass).toBe('warning')
      expect(wrapper.find('.progress-fill').classes()).toContain('warning')
    })

    it('should have "critical" class when usage is 90% or above', async () => {
      // 95% usage: 190000 tokens
      mockMetrics.value.inputTokens = 110000
      mockMetrics.value.outputTokens = 80000
      wrapper = createWrapper()
      await nextTick()
      const vm = wrapper.vm as unknown as ContextPanelModalVM

      expect(vm.progressClass).toBe('critical')
      expect(wrapper.find('.progress-fill').classes()).toContain('critical')
    })
  })

  describe('Message Stats Display', () => {
    it('should display Total Messages stat', () => {
      wrapper = createWrapper({ messageCount: 25 })
      const statLabels = wrapper.findAll('.stat-label')
      const statValues = wrapper.findAll('.stat-value')

      expect(statLabels[0].text()).toBe('Total Messages')
      expect(statValues[0].text()).toBe('25')
    })

    it('should display User Messages stat', () => {
      wrapper = createWrapper({ userMessageCount: 13 })
      const statLabels = wrapper.findAll('.stat-label')
      const statValues = wrapper.findAll('.stat-value')

      expect(statLabels[1].text()).toBe('User Messages')
      expect(statValues[1].text()).toBe('13')
    })

    it('should display AI Messages stat', () => {
      wrapper = createWrapper({ aiMessageCount: 12 })
      const statLabels = wrapper.findAll('.stat-label')
      const statValues = wrapper.findAll('.stat-value')

      expect(statLabels[2].text()).toBe('AI Messages')
      expect(statValues[2].text()).toBe('12')
    })

    it('should display Avg Tokens/Msg stat', () => {
      wrapper = createWrapper({ messageCount: 25 })
      const statLabels = wrapper.findAll('.stat-label')
      const statValues = wrapper.findAll('.stat-value')

      expect(statLabels[3].text()).toBe('Avg Tokens/Msg')
      // 80000 / 25 = 3200
      expect(statValues[3].text()).toBe('3200')
    })

    it('should compute avgTokensPerMessage correctly', () => {
      wrapper = createWrapper({ messageCount: 25 })
      const vm = wrapper.vm as unknown as ContextPanelModalVM

      // 80000 / 25 = 3200
      expect(vm.avgTokensPerMessage).toBe(3200)
    })

    it('should return 0 for avgTokensPerMessage when messageCount is 0', () => {
      wrapper = createWrapper({ messageCount: 0 })
      const vm = wrapper.vm as unknown as ContextPanelModalVM

      expect(vm.avgTokensPerMessage).toBe(0)
    })
  })

  describe('Recommendations Logic', () => {
    it('should show no recommendations when usage is below 70% and messages < 50', () => {
      // 40% usage, 25 messages
      wrapper = createWrapper({ messageCount: 25 })
      const vm = wrapper.vm as unknown as ContextPanelModalVM

      expect(vm.recommendations).toHaveLength(0)
      expect(wrapper.find('.recommendations').exists()).toBe(false)
    })

    it('should show warning recommendation when usage is 70-89%', async () => {
      // 75% usage
      mockMetrics.value.inputTokens = 90000
      mockMetrics.value.outputTokens = 60000
      wrapper = createWrapper({ messageCount: 25 })
      await nextTick()
      const vm = wrapper.vm as unknown as ContextPanelModalVM

      expect(vm.recommendations).toHaveLength(1)
      expect(vm.recommendations[0].icon).toBe('AlertCircle')
      expect(vm.recommendations[0].message).toContain('Context is filling up')
    })

    it('should show critical recommendation when usage is >= 90%', async () => {
      // 95% usage
      mockMetrics.value.inputTokens = 110000
      mockMetrics.value.outputTokens = 80000
      wrapper = createWrapper({ messageCount: 25 })
      await nextTick()
      const vm = wrapper.vm as unknown as ContextPanelModalVM

      expect(vm.recommendations).toHaveLength(1)
      expect(vm.recommendations[0].icon).toBe('AlertCircle')
      expect(vm.recommendations[0].message).toContain('Context is nearly full')
    })

    it('should show long conversation recommendation when messages > 50', () => {
      wrapper = createWrapper({ messageCount: 60 })
      const vm = wrapper.vm as unknown as ContextPanelModalVM

      expect(vm.recommendations).toHaveLength(1)
      expect(vm.recommendations[0].icon).toBe('RotateCcw')
      expect(vm.recommendations[0].message).toContain(
        'Long conversation detected'
      )
    })

    it('should show multiple recommendations when conditions met', async () => {
      // 95% usage + 60 messages
      mockMetrics.value.inputTokens = 110000
      mockMetrics.value.outputTokens = 80000
      wrapper = createWrapper({ messageCount: 60 })
      await nextTick()
      const vm = wrapper.vm as unknown as ContextPanelModalVM

      expect(vm.recommendations).toHaveLength(2)
      expect(vm.recommendations[0].message).toContain('Context is nearly full')
      expect(vm.recommendations[1].message).toContain(
        'Long conversation detected'
      )
    })

    it('should render recommendations section when recommendations exist', async () => {
      mockMetrics.value.inputTokens = 110000
      mockMetrics.value.outputTokens = 80000
      wrapper = createWrapper({ messageCount: 60 })
      await nextTick()

      const recommendations = wrapper.find('.recommendations')
      expect(recommendations.exists()).toBe(true)
      expect(wrapper.findAll('.recommendation-item')).toHaveLength(2)
    })
  })

  describe('formatNumber Helper', () => {
    it('should format numbers with commas', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as ContextPanelModalVM

      expect(vm.formatNumber(1000)).toBe('1,000')
      expect(vm.formatNumber(10000)).toBe('10,000')
      expect(vm.formatNumber(100000)).toBe('100,000')
      expect(vm.formatNumber(1000000)).toBe('1,000,000')
    })

    it('should format small numbers without commas', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as ContextPanelModalVM

      expect(vm.formatNumber(100)).toBe('100')
      expect(vm.formatNumber(999)).toBe('999')
    })

    it('should format zero correctly', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as ContextPanelModalVM

      expect(vm.formatNumber(0)).toBe('0')
    })
  })

  describe('Computed Properties', () => {
    it('should compute totalMessages from props', () => {
      wrapper = createWrapper({ messageCount: 42 })
      const vm = wrapper.vm as unknown as ContextPanelModalVM

      expect(vm.totalMessages).toBe(42)
    })

    it('should compute userMessages from props', () => {
      wrapper = createWrapper({ userMessageCount: 20 })
      const vm = wrapper.vm as unknown as ContextPanelModalVM

      expect(vm.userMessages).toBe(20)
    })

    it('should compute aiMessages from props', () => {
      wrapper = createWrapper({ aiMessageCount: 22 })
      const vm = wrapper.vm as unknown as ContextPanelModalVM

      expect(vm.aiMessages).toBe(22)
    })
  })

  describe('Clear Functionality', () => {
    it('should emit clear event when Clear button is clicked', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      await nextTick()

      const buttons = wrapper.findAll('button')
      const clearButton = buttons.find((btn) =>
        btn.text().includes('Clear Context')
      )
      await clearButton!.trigger('click')
      await nextTick()

      expect(wrapper.emitted('clear')).toBeTruthy()
    })

    it('should emit close event after clear', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      await nextTick()

      const buttons = wrapper.findAll('button')
      const clearButton = buttons.find((btn) =>
        btn.text().includes('Clear Context')
      )
      await clearButton!.trigger('click')
      await nextTick()

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should show success notification when clearing', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as ContextPanelModalVM

      vm.handleClear()
      await nextTick()

      expect(mockSuccess).toHaveBeenCalledWith('Context cleared successfully')
    })

    it('should call handleClear when Clear button is clicked', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as ContextPanelModalVM

      vm.handleClear()
      await nextTick()

      expect(wrapper.emitted('clear')).toBeTruthy()
      expect(wrapper.emitted('close')).toBeTruthy()
      expect(mockSuccess).toHaveBeenCalled()
    })
  })

  describe('Modal Interactions', () => {
    it('should emit close event when close button is clicked', async () => {
      wrapper = createWrapper()
      const closeButton = wrapper.find('.close-button')
      await closeButton.trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should emit close event when overlay is clicked', async () => {
      wrapper = createWrapper()
      const overlay = wrapper.find('.modal-overlay')
      await overlay.trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should not emit close when modal container is clicked', async () => {
      wrapper = createWrapper()
      const container = wrapper.find('.modal-container')
      await container.trigger('click')

      expect(wrapper.emitted('close')).toBeFalsy()
    })

    it('should call handleOverlayClick when overlay is clicked', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as ContextPanelModalVM

      vm.handleOverlayClick()

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should emit close event when Close button is clicked', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      await nextTick()

      const buttons = wrapper.findAll('button')
      const closeButton = buttons.find((btn) => btn.text() === 'Close')
      await closeButton!.trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
    })
  })

  describe('Component Lifecycle', () => {
    it('should initialize with default prop values', () => {
      wrapper = createWrapper({ visible: false })
      const vm = wrapper.vm as unknown as ContextPanelModalVM

      expect(vm.totalMessages).toBe(25) // default from createWrapper
      expect(vm.userMessages).toBe(13)
      expect(vm.aiMessages).toBe(12)
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

    it('should have semantic HTML structure', () => {
      wrapper = createWrapper()
      expect(wrapper.find('h2.modal-title').exists()).toBe(true)
      expect(wrapper.find('h3.section-title').exists()).toBe(false) // only when recommendations exist
    })

    it('should have proper button elements', () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      const buttons = wrapper.findAll('button')
      expect(buttons.length).toBeGreaterThanOrEqual(2) // close + clear + close
    })
  })

  describe('Edge Cases', () => {
    it('should handle zero tokens correctly', async () => {
      mockMetrics.value.inputTokens = 0
      mockMetrics.value.outputTokens = 0
      wrapper = createWrapper()
      await nextTick()
      const vm = wrapper.vm as unknown as ContextPanelModalVM

      expect(vm.currentTokens).toBe(0)
      expect(vm.contextPercentage).toBe(0)
      expect(wrapper.find('.current').text()).toBe('0 tokens')
    })

    it('should handle exactly 200k tokens', async () => {
      mockMetrics.value.inputTokens = 100000
      mockMetrics.value.outputTokens = 100000
      wrapper = createWrapper()
      await nextTick()
      const vm = wrapper.vm as unknown as ContextPanelModalVM

      expect(vm.currentTokens).toBe(200000)
      expect(vm.contextPercentage).toBe(100)
    })

    it('should handle zero messages correctly', () => {
      wrapper = createWrapper({
        messageCount: 0,
        userMessageCount: 0,
        aiMessageCount: 0,
      })
      const vm = wrapper.vm as unknown as ContextPanelModalVM

      expect(vm.totalMessages).toBe(0)
      expect(vm.avgTokensPerMessage).toBe(0)
    })

    it('should handle exactly 50 messages (boundary)', () => {
      wrapper = createWrapper({ messageCount: 50 })
      const vm = wrapper.vm as unknown as ContextPanelModalVM

      // Should NOT show long conversation warning (> 50)
      const hasLongConversationRec = vm.recommendations.some(
        (r: Recommendation) => r.message.includes('Long conversation')
      )
      expect(hasLongConversationRec).toBe(false)
    })

    it('should handle exactly 51 messages (over boundary)', () => {
      wrapper = createWrapper({ messageCount: 51 })
      const vm = wrapper.vm as unknown as ContextPanelModalVM

      // Should show long conversation warning (> 50)
      const hasLongConversationRec = vm.recommendations.some(
        (r: Recommendation) => r.message.includes('Long conversation')
      )
      expect(hasLongConversationRec).toBe(true)
    })

    it('should handle exactly 70% usage (warning boundary)', async () => {
      // 70% usage: 140000 tokens
      mockMetrics.value.inputTokens = 84000
      mockMetrics.value.outputTokens = 56000
      wrapper = createWrapper()
      await nextTick()
      const vm = wrapper.vm as unknown as ContextPanelModalVM

      expect(vm.contextPercentage).toBe(70)
      expect(vm.progressClass).toBe('warning')
    })

    it('should handle exactly 90% usage (critical boundary)', async () => {
      // 90% usage: 180000 tokens
      mockMetrics.value.inputTokens = 108000
      mockMetrics.value.outputTokens = 72000
      wrapper = createWrapper()
      await nextTick()
      const vm = wrapper.vm as unknown as ContextPanelModalVM

      expect(vm.contextPercentage).toBe(90)
      expect(vm.progressClass).toBe('critical')
    })
  })

  describe('Integration Tests', () => {
    it('should complete full workflow: view context and close', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      await nextTick()

      // Verify initial state
      expect(wrapper.find('.modal-overlay').exists()).toBe(true)
      expect(wrapper.find('.context-card').exists()).toBe(true)
      expect(wrapper.findAll('.stat-card')).toHaveLength(4)

      // Close modal
      const buttons = wrapper.findAll('button')
      const closeButton = buttons.find((btn) => btn.text() === 'Close')
      await closeButton!.trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should complete full workflow: view context and clear', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      await nextTick()

      // Verify initial state
      expect(wrapper.find('.modal-overlay').exists()).toBe(true)

      // Clear context
      const buttons = wrapper.findAll('button')
      const clearButton = buttons.find((btn) =>
        btn.text().includes('Clear Context')
      )
      await clearButton!.trigger('click')
      await nextTick()

      expect(wrapper.emitted('clear')).toBeTruthy()
      expect(wrapper.emitted('close')).toBeTruthy()
      expect(mockSuccess).toHaveBeenCalledWith('Context cleared successfully')
    })

    it('should complete full workflow: high usage with recommendations', async () => {
      // 95% usage + 60 messages
      mockMetrics.value.inputTokens = 110000
      mockMetrics.value.outputTokens = 80000
      wrapper = createWrapper(
        { messageCount: 60 },
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      await nextTick()

      // Verify high usage state
      const vm = wrapper.vm as unknown as ContextPanelModalVM
      expect(vm.contextPercentage).toBe(95)
      expect(vm.progressClass).toBe('critical')
      expect(vm.recommendations).toHaveLength(2)

      // Verify recommendations are rendered
      expect(wrapper.find('.recommendations').exists()).toBe(true)
      expect(wrapper.findAll('.recommendation-item')).toHaveLength(2)

      // Clear context
      const buttons = wrapper.findAll('button')
      const clearButton = buttons.find((btn) =>
        btn.text().includes('Clear Context')
      )
      await clearButton!.trigger('click')

      expect(wrapper.emitted('clear')).toBeTruthy()
    })
  })

  describe('Reactive State Updates', () => {
    it('should update display when metrics change', async () => {
      wrapper = createWrapper()
      let vm = wrapper.vm as unknown as ContextPanelModalVM

      // Initial state: 40% usage
      expect(vm.contextPercentage).toBe(40)

      // Update metrics to 95% usage
      mockMetrics.value.inputTokens = 110000
      mockMetrics.value.outputTokens = 80000
      await nextTick()

      vm = wrapper.vm as unknown as ContextPanelModalVM
      expect(vm.contextPercentage).toBe(95)
      expect(vm.progressClass).toBe('critical')
    })

    it('should update recommendations when conditions change', async () => {
      wrapper = createWrapper({ messageCount: 25 })
      let vm = wrapper.vm as unknown as ContextPanelModalVM

      // Initial: no recommendations
      expect(vm.recommendations).toHaveLength(0)

      // Update to show recommendations
      mockMetrics.value.inputTokens = 110000
      mockMetrics.value.outputTokens = 80000
      await nextTick()

      vm = wrapper.vm as unknown as ContextPanelModalVM
      expect(vm.recommendations).toHaveLength(1)
    })

    it('should update stats when props change', async () => {
      wrapper = createWrapper({ messageCount: 10 })
      let vm = wrapper.vm as unknown as ContextPanelModalVM

      expect(vm.totalMessages).toBe(10)

      await wrapper.setProps({ messageCount: 50 })
      await nextTick()

      vm = wrapper.vm as unknown as ContextPanelModalVM
      expect(vm.totalMessages).toBe(50)
    })
  })
})
