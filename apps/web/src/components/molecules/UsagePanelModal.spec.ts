/**
 * @fileoverview Tests for UsagePanelModal component.
 *
 * @description
 * Comprehensive tests covering props, computed properties, methods,
 * event handlers, and conditional rendering for the usage panel modal.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import UsagePanelModal from './UsagePanelModal.vue'

// Mock composables
const mockMetrics = ref({
  totalCalls: 2500,
  inputTokens: 150000,
  outputTokens: 75000,
  lastReset: new Date('2024-10-15T12:00:00Z').toISOString(),
})

const mockInfo = vi.fn()

vi.mock('../../composables/useAIMetrics', () => ({
  useAIMetrics: () => ({
    metrics: mockMetrics,
  }),
}))

vi.mock('../../composables/useNotifications', () => ({
  useNotifications: () => ({
    info: mockInfo,
  }),
}))

// Mock BaseIcon and BaseButton components
vi.mock('../atoms/BaseIcon.vue', () => ({
  default: {
    name: 'BaseIcon',
    props: ['name', 'size', 'class'],
    template: '<span class="base-icon" :data-name="name"></span>',
  },
}))

vi.mock('../atoms/BaseButton.vue', () => ({
  default: {
    name: 'BaseButton',
    props: ['variant', 'size'],
    template: '<button class="base-button"><slot /></button>',
  },
}))

describe('UsagePanelModal.vue', () => {
  const defaultProps = {
    visible: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Reset metrics to default values
    mockMetrics.value = {
      totalCalls: 2500,
      inputTokens: 150000,
      outputTokens: 75000,
      lastReset: new Date('2024-10-15T12:00:00Z').toISOString(),
    }
  })

  describe('Component Mounting and Props', () => {
    it('should mount without errors', () => {
      const wrapper = mount(UsagePanelModal, { props: defaultProps })
      expect(wrapper.exists()).toBe(true)
    })

    it('should render modal when visible is true', () => {
      const wrapper = mount(UsagePanelModal, { props: { visible: true } })
      const overlay = wrapper.find('.modal-overlay')
      expect(overlay.exists()).toBe(true)
    })

    it('should not render modal when visible is false', () => {
      const wrapper = mount(UsagePanelModal, { props: { visible: false } })
      const overlay = wrapper.find('.modal-overlay')
      expect(overlay.exists()).toBe(false)
    })

    it('should render modal title', () => {
      const wrapper = mount(UsagePanelModal, { props: defaultProps })
      const title = wrapper.find('.modal-title')
      expect(title.text()).toBe('Usage & Plan Limits')
    })
  })

  describe('Computed Properties: Percentages', () => {
    it('should calculate apiCallsPercentage correctly', () => {
      mockMetrics.value.totalCalls = 2500
      const wrapper = mount(UsagePanelModal, { props: defaultProps })

      // apiCalls: 2500 / 10000 = 25%
      const vm = wrapper.vm as unknown as {
        apiCallsPercentage: number
      }

      expect(vm.apiCallsPercentage).toBe(25)
    })

    it('should calculate tokensPercentage correctly', () => {
      mockMetrics.value.inputTokens = 150000
      mockMetrics.value.outputTokens = 75000
      const wrapper = mount(UsagePanelModal, { props: defaultProps })

      // totalTokens: 225000 / 5000000 = 4.5%
      const vm = wrapper.vm as unknown as {
        tokensPercentage: number
      }

      expect(vm.tokensPercentage).toBe(4.5)
    })

    it('should calculate rateLimitPercentage correctly', () => {
      const wrapper = mount(UsagePanelModal, { props: defaultProps })

      // requestsThisMinute: 12 / 60 = 20%
      const vm = wrapper.vm as unknown as {
        rateLimitPercentage: number
      }

      expect(vm.rateLimitPercentage).toBe(20)
    })

    it('should cap apiCallsPercentage at 100%', () => {
      mockMetrics.value.totalCalls = 15000 // exceeds limit of 10000
      const wrapper = mount(UsagePanelModal, { props: defaultProps })

      const vm = wrapper.vm as unknown as {
        apiCallsPercentage: number
      }

      expect(vm.apiCallsPercentage).toBe(100)
    })

    it('should cap tokensPercentage at 100%', () => {
      mockMetrics.value.inputTokens = 3000000
      mockMetrics.value.outputTokens = 3000000 // total 6M exceeds limit of 5M
      const wrapper = mount(UsagePanelModal, { props: defaultProps })

      const vm = wrapper.vm as unknown as {
        tokensPercentage: number
      }

      expect(vm.tokensPercentage).toBe(100)
    })
  })

  describe('Computed Properties: Status', () => {
    it('should return status-good when usage is below 70%', () => {
      mockMetrics.value.totalCalls = 5000 // 50%
      mockMetrics.value.inputTokens = 100000
      mockMetrics.value.outputTokens = 50000 // 3% tokens
      const wrapper = mount(UsagePanelModal, { props: defaultProps })

      const vm = wrapper.vm as unknown as {
        statusClass: string
        statusText: string
      }

      expect(vm.statusClass).toBe('status-good')
      expect(vm.statusText).toBe('Active')
    })

    it('should return status-warning when usage is between 70% and 90%', () => {
      mockMetrics.value.totalCalls = 7500 // 75%
      const wrapper = mount(UsagePanelModal, { props: defaultProps })

      const vm = wrapper.vm as unknown as {
        statusClass: string
        statusText: string
      }

      expect(vm.statusClass).toBe('status-warning')
      expect(vm.statusText).toBe('Moderate Usage')
    })

    it('should return status-critical when usage is 90% or above', () => {
      mockMetrics.value.totalCalls = 9500 // 95%
      const wrapper = mount(UsagePanelModal, { props: defaultProps })

      const vm = wrapper.vm as unknown as {
        statusClass: string
        statusText: string
      }

      expect(vm.statusClass).toBe('status-critical')
      expect(vm.statusText).toBe('Near Limit')
    })

    it('should use maximum percentage between apiCalls and tokens for status', () => {
      mockMetrics.value.totalCalls = 5000 // 50% API calls
      mockMetrics.value.inputTokens = 2000000
      mockMetrics.value.outputTokens = 2000000 // 80% tokens
      const wrapper = mount(UsagePanelModal, { props: defaultProps })

      const vm = wrapper.vm as unknown as {
        statusClass: string
      }

      // Should use 80% (tokens) for status, not 50% (api calls)
      expect(vm.statusClass).toBe('status-warning')
    })
  })

  describe('Computed Properties: Billing Dates', () => {
    it('should format billingStart correctly', () => {
      const wrapper = mount(UsagePanelModal, { props: defaultProps })

      const vm = wrapper.vm as unknown as {
        billingStart: string
      }

      // Oct 15, 2024
      expect(vm.billingStart).toMatch(/Oct/)
      expect(vm.billingStart).toMatch(/15/)
    })

    it('should format billingEnd correctly (one month after start)', () => {
      const wrapper = mount(UsagePanelModal, { props: defaultProps })

      const vm = wrapper.vm as unknown as {
        billingEnd: string
      }

      // Nov 15, 2024 (one month after Oct 15)
      expect(vm.billingEnd).toMatch(/Nov/)
      expect(vm.billingEnd).toMatch(/15/)
    })

    it('should format resetDate correctly with full date', () => {
      const wrapper = mount(UsagePanelModal, { props: defaultProps })

      const vm = wrapper.vm as unknown as {
        resetDate: string
      }

      // November 15, 2024
      expect(vm.resetDate).toMatch(/November/)
      expect(vm.resetDate).toMatch(/15/)
      expect(vm.resetDate).toMatch(/2024/)
    })
  })

  describe('Methods: getMeterClass', () => {
    it('should return "normal" for percentage below 70', () => {
      const wrapper = mount(UsagePanelModal, { props: defaultProps })

      const vm = wrapper.vm as unknown as {
        getMeterClass: (percentage: number) => string
      }

      expect(vm.getMeterClass(50)).toBe('normal')
      expect(vm.getMeterClass(69.9)).toBe('normal')
    })

    it('should return "warning" for percentage between 70 and 90', () => {
      const wrapper = mount(UsagePanelModal, { props: defaultProps })

      const vm = wrapper.vm as unknown as {
        getMeterClass: (percentage: number) => string
      }

      expect(vm.getMeterClass(70)).toBe('warning')
      expect(vm.getMeterClass(85)).toBe('warning')
      expect(vm.getMeterClass(89.9)).toBe('warning')
    })

    it('should return "critical" for percentage 90 or above', () => {
      const wrapper = mount(UsagePanelModal, { props: defaultProps })

      const vm = wrapper.vm as unknown as {
        getMeterClass: (percentage: number) => string
      }

      expect(vm.getMeterClass(90)).toBe('critical')
      expect(vm.getMeterClass(95)).toBe('critical')
      expect(vm.getMeterClass(100)).toBe('critical')
    })
  })

  describe('Methods: formatNumber', () => {
    it('should format numbers with commas', () => {
      const wrapper = mount(UsagePanelModal, { props: defaultProps })

      const vm = wrapper.vm as unknown as {
        formatNumber: (num: number) => string
      }

      expect(vm.formatNumber(1000)).toBe('1,000')
      expect(vm.formatNumber(1000000)).toBe('1,000,000')
      expect(vm.formatNumber(2500)).toBe('2,500')
    })

    it('should handle small numbers without commas', () => {
      const wrapper = mount(UsagePanelModal, { props: defaultProps })

      const vm = wrapper.vm as unknown as {
        formatNumber: (num: number) => string
      }

      expect(vm.formatNumber(100)).toBe('100')
      expect(vm.formatNumber(50)).toBe('50')
    })
  })

  describe('Event Handlers', () => {
    it('should emit close event when close button is clicked', async () => {
      const wrapper = mount(UsagePanelModal, { props: defaultProps })

      const closeButton = wrapper.find('.close-button')
      await closeButton.trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
      expect(wrapper.emitted('close')).toHaveLength(1)
    })

    it('should emit close event when overlay is clicked', async () => {
      const wrapper = mount(UsagePanelModal, { props: defaultProps })

      const overlay = wrapper.find('.modal-overlay')
      await overlay.trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should not emit close when clicking inside modal container', async () => {
      const wrapper = mount(UsagePanelModal, { props: defaultProps })

      const container = wrapper.find('.modal-container')
      await container.trigger('click')

      expect(wrapper.emitted('close')).toBeFalsy()
    })

    it('should call info notification when upgrade button is clicked', async () => {
      const wrapper = mount(UsagePanelModal, { props: defaultProps })

      // Find upgrade button (first button in footer with ghost variant)
      const upgradeButton = wrapper.findAll('.base-button')[0]
      await upgradeButton.trigger('click')

      expect(mockInfo).toHaveBeenCalledWith('Plan upgrades coming soon!')
    })

    it('should emit close when Close button in footer is clicked', async () => {
      const wrapper = mount(UsagePanelModal, { props: defaultProps })

      // Find Close button (second button in footer)
      const closeButton = wrapper.findAll('.base-button')[1]
      await closeButton.trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
    })
  })

  describe('Template Rendering', () => {
    it('should render plan name and billing period', () => {
      const wrapper = mount(UsagePanelModal, { props: defaultProps })

      const planName = wrapper.find('.plan-name')
      const planPeriod = wrapper.find('.plan-period')

      expect(planName.text()).toBe('Professional')
      expect(planPeriod.text()).toBe('Monthly')
    })

    it('should render all three usage meters', () => {
      const wrapper = mount(UsagePanelModal, { props: defaultProps })

      const meters = wrapper.findAll('.usage-meter')
      expect(meters).toHaveLength(3)
    })

    it('should render plan features grid with 6 features', () => {
      const wrapper = mount(UsagePanelModal, { props: defaultProps })

      const features = wrapper.findAll('.feature-item')
      expect(features).toHaveLength(6)
    })

    it('should render meter fill with correct width style', () => {
      mockMetrics.value.totalCalls = 7500 // 75%
      const wrapper = mount(UsagePanelModal, { props: defaultProps })

      const meterFills = wrapper.findAll('.meter-fill')
      const apiCallsMeter = meterFills[0]

      expect(apiCallsMeter.attributes('style')).toContain('width: 75%')
    })

    it('should apply correct meter class to meter fill', () => {
      mockMetrics.value.totalCalls = 9500 // 95% - critical
      const wrapper = mount(UsagePanelModal, { props: defaultProps })

      const meterFills = wrapper.findAll('.meter-fill')
      const apiCallsMeter = meterFills[0]

      expect(apiCallsMeter.classes()).toContain('critical')
    })

    it('should display formatted usage numbers in meters', () => {
      mockMetrics.value.totalCalls = 2500
      const wrapper = mount(UsagePanelModal, { props: defaultProps })

      const meterValues = wrapper.findAll('.meter-value')
      const apiCallsValue = meterValues[0]

      expect(apiCallsValue.text()).toContain('2,500')
      expect(apiCallsValue.text()).toContain('10,000')
    })

    it('should display usage percentage in meter footer', () => {
      mockMetrics.value.totalCalls = 2500 // 25%
      const wrapper = mount(UsagePanelModal, { props: defaultProps })

      const meterFooters = wrapper.findAll('.meter-footer')
      const apiCallsFooter = meterFooters[0]

      expect(apiCallsFooter.text()).toContain('25.0% used')
    })

    it('should display remaining count in meter footer', () => {
      mockMetrics.value.totalCalls = 2500 // 25%
      const wrapper = mount(UsagePanelModal, { props: defaultProps })

      const remainingText = wrapper.find('.meter-remaining')
      expect(remainingText.text()).toContain('7,500')
      expect(remainingText.text()).toContain('remaining')
    })

    it('should render billing info section', () => {
      const wrapper = mount(UsagePanelModal, { props: defaultProps })

      const infoSection = wrapper.find('.info-section')
      expect(infoSection.exists()).toBe(true)

      const infoItems = wrapper.findAll('.info-item')
      expect(infoItems).toHaveLength(2)
    })
  })

  describe('Edge Cases', () => {
    it('should handle zero usage correctly', () => {
      mockMetrics.value.totalCalls = 0
      mockMetrics.value.inputTokens = 0
      mockMetrics.value.outputTokens = 0
      const wrapper = mount(UsagePanelModal, { props: defaultProps })

      const vm = wrapper.vm as unknown as {
        apiCallsPercentage: number
        tokensPercentage: number
        statusClass: string
      }

      expect(vm.apiCallsPercentage).toBe(0)
      expect(vm.tokensPercentage).toBe(0)
      expect(vm.statusClass).toBe('status-good')
    })

    it('should handle exactly at threshold values', () => {
      mockMetrics.value.totalCalls = 7000 // exactly 70%
      const wrapper = mount(UsagePanelModal, { props: defaultProps })

      const vm = wrapper.vm as unknown as {
        statusClass: string
        statusText: string
        getMeterClass: (percentage: number) => string
      }

      expect(vm.statusClass).toBe('status-warning')
      expect(vm.statusText).toBe('Moderate Usage')
      expect(vm.getMeterClass(70)).toBe('warning')
    })

    it('should handle exactly at 90% threshold', () => {
      mockMetrics.value.totalCalls = 9000 // exactly 90%
      const wrapper = mount(UsagePanelModal, { props: defaultProps })

      const vm = wrapper.vm as unknown as {
        statusClass: string
        getMeterClass: (percentage: number) => string
      }

      expect(vm.statusClass).toBe('status-critical')
      expect(vm.getMeterClass(90)).toBe('critical')
    })
  })

  describe('usageData Computed Property', () => {
    it('should combine metrics correctly in usageData', () => {
      mockMetrics.value.totalCalls = 3000
      mockMetrics.value.inputTokens = 200000
      mockMetrics.value.outputTokens = 100000
      const wrapper = mount(UsagePanelModal, { props: defaultProps })

      const vm = wrapper.vm as unknown as {
        usageData: {
          apiCalls: number
          totalTokens: number
          requestsThisMinute: number
        }
      }

      expect(vm.usageData.apiCalls).toBe(3000)
      expect(vm.usageData.totalTokens).toBe(300000)
      expect(vm.usageData.requestsThisMinute).toBe(12)
    })
  })
})
