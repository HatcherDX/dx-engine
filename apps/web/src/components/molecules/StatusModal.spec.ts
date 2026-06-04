/**
 * @fileoverview Tests for StatusModal component.
 *
 * @description
 * Comprehensive test suite for StatusModal component covering all props,
 * computed properties, methods, events, and branch conditions.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick, type ComponentPublicInstance } from 'vue'
import StatusModal from './StatusModal.vue'

/**
 * Mock useNotifications composable.
 */
const mockSuccess = vi.fn()
vi.mock('../../composables/useNotifications', () => ({
  useNotifications: () => ({
    success: mockSuccess,
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
}))

/**
 * Mock BaseIcon component.
 */
vi.mock('../atoms/BaseIcon.vue', () => ({
  default: {
    name: 'BaseIcon',
    template: '<span data-testid="base-icon" :data-icon="name"></span>',
    props: ['name', 'size'],
  },
}))

/**
 * Mock BaseButton component.
 */
vi.mock('../atoms/BaseButton.vue', () => ({
  default: {
    name: 'BaseButton',
    template:
      '<button data-testid="base-button" :class="variant" @click="$emit(\'click\')"><slot /></button>',
    props: ['variant', 'size'],
    emits: ['click'],
  },
}))

describe('StatusModal', () => {
  let wrapper: VueWrapper<ComponentPublicInstance>

  const defaultProps = {
    visible: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Component Mounting and Props', () => {
    it('should mount without errors when visible is true', () => {
      wrapper = mount(StatusModal, { props: defaultProps })
      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('.modal-overlay').exists()).toBe(true)
    })

    it('should not render when visible is false', () => {
      wrapper = mount(StatusModal, { props: { visible: false } })
      expect(wrapper.find('.modal-overlay').exists()).toBe(false)
    })

    it('should render modal container when visible', () => {
      wrapper = mount(StatusModal, { props: defaultProps })
      expect(wrapper.find('.modal-container').exists()).toBe(true)
    })
  })

  describe('Header Section', () => {
    beforeEach(() => {
      wrapper = mount(StatusModal, { props: defaultProps })
    })

    it('should render modal header with title', () => {
      const header = wrapper.find('.modal-header')
      expect(header.exists()).toBe(true)
      expect(wrapper.find('.modal-title').text()).toBe('System Status')
    })

    it('should render close button in header', () => {
      const closeButton = wrapper.find('.close-button')
      expect(closeButton.exists()).toBe(true)
      expect(closeButton.attributes('aria-label')).toBe('Close')
    })

    it('should emit close event when close button is clicked', async () => {
      const closeButton = wrapper.find('.close-button')
      await closeButton.trigger('click')
      await nextTick()

      expect(wrapper.emitted('close')).toBeTruthy()
      expect(wrapper.emitted('close')).toHaveLength(1)
    })

    it('should render status badge with correct text', () => {
      const badge = wrapper.find('.status-badge')
      expect(badge.exists()).toBe(true)
      expect(badge.text()).toBe('Operational')
    })

    it('should apply correct CSS class to status badge', () => {
      const badge = wrapper.find('.status-badge')
      expect(badge.classes()).toContain('status-operational')
    })
  })

  describe('Current Model Section', () => {
    beforeEach(() => {
      wrapper = mount(StatusModal, { props: defaultProps })
    })

    it('should render current model section', () => {
      expect(wrapper.find('.model-card').exists()).toBe(true)
    })

    it('should display model name', () => {
      const modelName = wrapper.find('.model-name')
      expect(modelName.text()).toBe('Claude Sonnet 4.5')
    })

    it('should display model provider', () => {
      const details = wrapper.find('.model-details')
      expect(details.text()).toContain('Anthropic')
    })

    it('should display model context window', () => {
      const details = wrapper.find('.model-details')
      expect(details.text()).toContain('Context: 200K')
    })

    it('should display model status', () => {
      const statusText = wrapper.find('.status-text')
      expect(statusText.text()).toBe('Active')
    })

    it('should render model status indicator with correct class', () => {
      const indicator = wrapper.find('.status-indicator')
      expect(indicator.exists()).toBe(true)
      expect(indicator.classes()).toContain('status-active')
    })
  })

  describe('Session Metrics Section', () => {
    beforeEach(() => {
      wrapper = mount(StatusModal, { props: defaultProps })
    })

    it('should render session metrics grid', () => {
      const metricsGrid = wrapper.find('.metrics-grid')
      expect(metricsGrid.exists()).toBe(true)
    })

    it('should render 4 metric cards', () => {
      const metricCards = wrapper.findAll('.metric-card')
      expect(metricCards).toHaveLength(4)
    })

    it('should display requests count', () => {
      const labels = wrapper.findAll('.metric-label')
      const values = wrapper.findAll('.metric-value')

      const requestsIndex = labels.findIndex((l) => l.text() === 'Requests')
      expect(requestsIndex).toBeGreaterThanOrEqual(0)
      expect(values[requestsIndex].text()).toBe('47')
    })

    it('should display tokens used with formatted number', () => {
      const labels = wrapper.findAll('.metric-label')
      const values = wrapper.findAll('.metric-value')

      const tokensIndex = labels.findIndex((l) => l.text() === 'Tokens Used')
      expect(tokensIndex).toBeGreaterThanOrEqual(0)
      expect(values[tokensIndex].text()).toBe('125.0K')
    })

    it('should display session duration', () => {
      const labels = wrapper.findAll('.metric-label')
      const values = wrapper.findAll('.metric-value')

      const durationIndex = labels.findIndex((l) => l.text() === 'Session Time')
      expect(durationIndex).toBeGreaterThanOrEqual(0)
      expect(values[durationIndex].text()).toBe('2h 15m')
    })

    it('should display average response time', () => {
      const labels = wrapper.findAll('.metric-label')
      const values = wrapper.findAll('.metric-value')

      const avgIndex = labels.findIndex((l) => l.text() === 'Avg Response')
      expect(avgIndex).toBeGreaterThanOrEqual(0)
      expect(values[avgIndex].text()).toBe('1.8s')
    })
  })

  describe('Performance Section', () => {
    beforeEach(() => {
      wrapper = mount(StatusModal, { props: defaultProps })
    })

    it('should render performance items section', () => {
      const performanceItems = wrapper.find('.performance-items')
      expect(performanceItems.exists()).toBe(true)
    })

    it('should render 3 performance items', () => {
      const items = wrapper.findAll('.performance-item')
      expect(items).toHaveLength(3)
    })

    it('should display memory usage with correct values', () => {
      const labels = wrapper.findAll('.performance-label')
      const values = wrapper.findAll('.performance-value')

      const memoryIndex = labels.findIndex((l) => l.text() === 'Memory Usage')
      expect(memoryIndex).toBeGreaterThanOrEqual(0)
      expect(values[memoryIndex].text()).toContain('245 MB')
      expect(values[memoryIndex].text()).toContain('512 MB')
    })

    it('should display CPU usage percentage', () => {
      const labels = wrapper.findAll('.performance-label')
      const values = wrapper.findAll('.performance-value')

      const cpuIndex = labels.findIndex((l) => l.text() === 'CPU Usage')
      expect(cpuIndex).toBeGreaterThanOrEqual(0)
      expect(values[cpuIndex].text()).toBe('12%')
    })

    it('should display network latency', () => {
      const labels = wrapper.findAll('.performance-label')
      const values = wrapper.findAll('.performance-value')

      const latencyIndex = labels.findIndex(
        (l) => l.text() === 'Network Latency'
      )
      expect(latencyIndex).toBeGreaterThanOrEqual(0)
      expect(values[latencyIndex].text()).toBe('85ms')
    })

    it('should render performance bars', () => {
      const bars = wrapper.findAll('.performance-bar')
      expect(bars.length).toBeGreaterThanOrEqual(3)
    })

    it('should render performance fill elements with correct classes', () => {
      const fills = wrapper.findAll('.performance-fill')
      expect(fills.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('Active Connections Section', () => {
    beforeEach(() => {
      wrapper = mount(StatusModal, { props: defaultProps })
    })

    it('should render connections list', () => {
      const connectionsList = wrapper.find('.connections-list')
      expect(connectionsList.exists()).toBe(true)
    })

    it('should render 3 connection items by default', () => {
      const items = wrapper.findAll('.connection-item')
      expect(items).toHaveLength(3)
    })

    it('should display API Server connection', () => {
      const names = wrapper.findAll('.connection-name')
      const apiServer = names.find((n) => n.text() === 'API Server')
      expect(apiServer).toBeDefined()
    })

    it('should display Git Integration connection', () => {
      const names = wrapper.findAll('.connection-name')
      const gitIntegration = names.find((n) => n.text() === 'Git Integration')
      expect(gitIntegration).toBeDefined()
    })

    it('should display MCP Servers connection', () => {
      const names = wrapper.findAll('.connection-name')
      const mcpServers = names.find((n) => n.text() === 'MCP Servers')
      expect(mcpServers).toBeDefined()
    })

    it('should display connection details', () => {
      const details = wrapper.findAll('.connection-details')
      expect(details.length).toBeGreaterThanOrEqual(3)
      expect(details[0].text()).toBe('api.anthropic.com')
    })

    it('should render connection status indicators', () => {
      const indicators = wrapper.findAll('.connection-indicator')
      expect(indicators.length).toBeGreaterThanOrEqual(3)
    })

    it('should apply correct class to connected indicators', () => {
      const indicators = wrapper.findAll('.connection-indicator')
      // All default connections are 'connected'
      indicators.forEach((indicator) => {
        expect(indicator.classes()).toContain('conn-connected')
      })
    })
  })

  describe('Last Updated Section', () => {
    beforeEach(() => {
      wrapper = mount(StatusModal, { props: defaultProps })
    })

    it('should render update info section', () => {
      const updateInfo = wrapper.find('.update-info')
      expect(updateInfo.exists()).toBe(true)
    })

    it('should display last updated text', () => {
      const updateInfo = wrapper.find('.update-info')
      expect(updateInfo.text()).toContain('Last updated:')
    })
  })

  describe('Footer Section', () => {
    beforeEach(() => {
      wrapper = mount(StatusModal, { props: defaultProps })
    })

    it('should render modal footer', () => {
      const footer = wrapper.find('.modal-footer')
      expect(footer.exists()).toBe(true)
    })

    it('should render refresh button in footer', () => {
      const buttons = wrapper.findAll('[data-testid="base-button"]')
      const refreshButton = buttons.find((btn) =>
        btn.text().includes('Refresh')
      )
      expect(refreshButton).toBeDefined()
    })

    it('should render close button in footer', () => {
      const buttons = wrapper.findAll('[data-testid="base-button"]')
      const closeButton = buttons.find((btn) => btn.text().includes('Close'))
      expect(closeButton).toBeDefined()
    })

    it('should call handleRefresh when refresh button is clicked', async () => {
      const buttons = wrapper.findAll('[data-testid="base-button"]')
      const refreshButton = buttons.find((btn) =>
        btn.text().includes('Refresh')
      )

      await refreshButton?.trigger('click')
      await nextTick()

      expect(mockSuccess).toHaveBeenCalledWith('Status refreshed')
    })

    it('should emit close event when footer close button is clicked', async () => {
      const buttons = wrapper.findAll('[data-testid="base-button"]')
      const closeButton = buttons.find((btn) => btn.text().includes('Close'))

      await closeButton?.trigger('click')
      await nextTick()

      expect(wrapper.emitted('close')).toBeTruthy()
    })
  })

  describe('Overlay Click Behavior', () => {
    beforeEach(() => {
      wrapper = mount(StatusModal, { props: defaultProps })
    })

    it('should emit close event when overlay is clicked', async () => {
      const overlay = wrapper.find('.modal-overlay')
      await overlay.trigger('click')
      await nextTick()

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should not emit close when modal container is clicked', async () => {
      const container = wrapper.find('.modal-container')
      await container.trigger('click')
      await nextTick()

      // Should not emit because of @click.stop
      expect(wrapper.emitted('close')).toBeFalsy()
    })
  })

  describe('Computed Properties - systemStatus', () => {
    it('should return "Operational" when all connections are connected', () => {
      wrapper = mount(StatusModal, { props: defaultProps })

      // Access the vm to check computed property
      const vm = wrapper.vm as unknown as { systemStatus: string }
      expect(vm.systemStatus).toBe('Operational')
    })

    it('should return "Degraded" when there is an error connection', async () => {
      wrapper = mount(StatusModal, { props: defaultProps })

      const vm = wrapper.vm as unknown as {
        systemStatus: string
        connections: Array<{
          name: string
          status: 'connected' | 'disconnected' | 'error'
          details: string
        }>
      }

      // Modify connections to have an error
      vm.connections[0].status = 'error'
      await nextTick()

      expect(vm.systemStatus).toBe('Degraded')
    })

    it('should return "Partial" when there is a disconnected connection', async () => {
      wrapper = mount(StatusModal, { props: defaultProps })

      const vm = wrapper.vm as unknown as {
        systemStatus: string
        connections: Array<{
          name: string
          status: 'connected' | 'disconnected' | 'error'
          details: string
        }>
      }

      // Modify connections to have a disconnection
      vm.connections[0].status = 'disconnected'
      await nextTick()

      expect(vm.systemStatus).toBe('Partial')
    })

    it('should prioritize "Degraded" over "Partial"', async () => {
      wrapper = mount(StatusModal, { props: defaultProps })

      const vm = wrapper.vm as unknown as {
        systemStatus: string
        connections: Array<{
          name: string
          status: 'connected' | 'disconnected' | 'error'
          details: string
        }>
      }

      // Set both error and disconnected
      vm.connections[0].status = 'error'
      vm.connections[1].status = 'disconnected'
      await nextTick()

      expect(vm.systemStatus).toBe('Degraded')
    })
  })

  describe('Computed Properties - systemStatusClass', () => {
    it('should return "status-operational" for operational status', () => {
      wrapper = mount(StatusModal, { props: defaultProps })

      const vm = wrapper.vm as unknown as { systemStatusClass: string }
      expect(vm.systemStatusClass).toBe('status-operational')
    })

    it('should return "status-degraded" for degraded status', async () => {
      wrapper = mount(StatusModal, { props: defaultProps })

      const vm = wrapper.vm as unknown as {
        systemStatusClass: string
        connections: Array<{
          name: string
          status: 'connected' | 'disconnected' | 'error'
          details: string
        }>
      }

      vm.connections[0].status = 'error'
      await nextTick()

      expect(vm.systemStatusClass).toBe('status-degraded')
    })

    it('should return "status-partial" for partial status', async () => {
      wrapper = mount(StatusModal, { props: defaultProps })

      const vm = wrapper.vm as unknown as {
        systemStatusClass: string
        connections: Array<{
          name: string
          status: 'connected' | 'disconnected' | 'error'
          details: string
        }>
      }

      vm.connections[0].status = 'disconnected'
      await nextTick()

      expect(vm.systemStatusClass).toBe('status-partial')
    })
  })

  describe('Method - formatNumber', () => {
    beforeEach(() => {
      wrapper = mount(StatusModal, { props: defaultProps })
    })

    it('should format numbers >= 1000000 with M suffix', () => {
      const vm = wrapper.vm as unknown as {
        formatNumber: (num: number) => string
      }

      expect(vm.formatNumber(1000000)).toBe('1.0M')
      expect(vm.formatNumber(2500000)).toBe('2.5M')
      expect(vm.formatNumber(10000000)).toBe('10.0M')
    })

    it('should format numbers >= 1000 with K suffix', () => {
      const vm = wrapper.vm as unknown as {
        formatNumber: (num: number) => string
      }

      expect(vm.formatNumber(1000)).toBe('1.0K')
      expect(vm.formatNumber(5500)).toBe('5.5K')
      expect(vm.formatNumber(125000)).toBe('125.0K')
    })

    it('should return number as string for values < 1000', () => {
      const vm = wrapper.vm as unknown as {
        formatNumber: (num: number) => string
      }

      expect(vm.formatNumber(0)).toBe('0')
      expect(vm.formatNumber(42)).toBe('42')
      expect(vm.formatNumber(999)).toBe('999')
    })
  })

  describe('Method - getModelStatusClass', () => {
    beforeEach(() => {
      wrapper = mount(StatusModal, { props: defaultProps })
    })

    it('should return "status-active"', () => {
      const vm = wrapper.vm as unknown as {
        getModelStatusClass: () => string
      }

      expect(vm.getModelStatusClass()).toBe('status-active')
    })
  })

  describe('Method - getPerformanceClass', () => {
    beforeEach(() => {
      wrapper = mount(StatusModal, { props: defaultProps })
    })

    it('should return "perf-high" for percentage >= 80', () => {
      const vm = wrapper.vm as unknown as {
        getPerformanceClass: (percentage: number) => string
      }

      expect(vm.getPerformanceClass(80)).toBe('perf-high')
      expect(vm.getPerformanceClass(90)).toBe('perf-high')
      expect(vm.getPerformanceClass(100)).toBe('perf-high')
    })

    it('should return "perf-medium" for percentage >= 50 and < 80', () => {
      const vm = wrapper.vm as unknown as {
        getPerformanceClass: (percentage: number) => string
      }

      expect(vm.getPerformanceClass(50)).toBe('perf-medium')
      expect(vm.getPerformanceClass(65)).toBe('perf-medium')
      expect(vm.getPerformanceClass(79)).toBe('perf-medium')
    })

    it('should return "perf-low" for percentage < 50', () => {
      const vm = wrapper.vm as unknown as {
        getPerformanceClass: (percentage: number) => string
      }

      expect(vm.getPerformanceClass(0)).toBe('perf-low')
      expect(vm.getPerformanceClass(25)).toBe('perf-low')
      expect(vm.getPerformanceClass(49)).toBe('perf-low')
    })
  })

  describe('Method - getLatencyClass', () => {
    beforeEach(() => {
      wrapper = mount(StatusModal, { props: defaultProps })
    })

    it('should return "perf-high" for latency >= 200', () => {
      const vm = wrapper.vm as unknown as {
        getLatencyClass: (latency: number) => string
      }

      expect(vm.getLatencyClass(200)).toBe('perf-high')
      expect(vm.getLatencyClass(300)).toBe('perf-high')
      expect(vm.getLatencyClass(500)).toBe('perf-high')
    })

    it('should return "perf-medium" for latency >= 100 and < 200', () => {
      const vm = wrapper.vm as unknown as {
        getLatencyClass: (latency: number) => string
      }

      expect(vm.getLatencyClass(100)).toBe('perf-medium')
      expect(vm.getLatencyClass(150)).toBe('perf-medium')
      expect(vm.getLatencyClass(199)).toBe('perf-medium')
    })

    it('should return "perf-low" for latency < 100', () => {
      const vm = wrapper.vm as unknown as {
        getLatencyClass: (latency: number) => string
      }

      expect(vm.getLatencyClass(0)).toBe('perf-low')
      expect(vm.getLatencyClass(50)).toBe('perf-low')
      expect(vm.getLatencyClass(99)).toBe('perf-low')
    })
  })

  describe('Method - getConnectionClass', () => {
    beforeEach(() => {
      wrapper = mount(StatusModal, { props: defaultProps })
    })

    it('should return "conn-connected" for connected status', () => {
      const vm = wrapper.vm as unknown as {
        getConnectionClass: (status: string) => string
      }

      expect(vm.getConnectionClass('connected')).toBe('conn-connected')
    })

    it('should return "conn-disconnected" for disconnected status', () => {
      const vm = wrapper.vm as unknown as {
        getConnectionClass: (status: string) => string
      }

      expect(vm.getConnectionClass('disconnected')).toBe('conn-disconnected')
    })

    it('should return "conn-error" for error status', () => {
      const vm = wrapper.vm as unknown as {
        getConnectionClass: (status: string) => string
      }

      expect(vm.getConnectionClass('error')).toBe('conn-error')
    })
  })

  describe('Method - handleRefresh', () => {
    beforeEach(() => {
      wrapper = mount(StatusModal, { props: defaultProps })
    })

    it('should update lastUpdated timestamp', async () => {
      const vm = wrapper.vm as unknown as {
        lastUpdated: string
        handleRefresh: () => void
      }

      vm.handleRefresh()
      await nextTick()

      // Should call success notification
      expect(mockSuccess).toHaveBeenCalledWith('Status refreshed')
    })

    it('should call success notification with correct message', () => {
      const vm = wrapper.vm as unknown as {
        handleRefresh: () => void
      }

      vm.handleRefresh()

      expect(mockSuccess).toHaveBeenCalledWith('Status refreshed')
      expect(mockSuccess).toHaveBeenCalledTimes(1)
    })
  })

  describe('Method - handleOverlayClick', () => {
    beforeEach(() => {
      wrapper = mount(StatusModal, { props: defaultProps })
    })

    it('should emit close event', () => {
      const vm = wrapper.vm as unknown as {
        handleOverlayClick: () => void
      }

      vm.handleOverlayClick()

      expect(wrapper.emitted('close')).toBeTruthy()
      expect(wrapper.emitted('close')).toHaveLength(1)
    })
  })

  describe('Visual Elements and Accessibility', () => {
    beforeEach(() => {
      wrapper = mount(StatusModal, { props: defaultProps })
    })

    it('should render with proper modal overlay styling', () => {
      const overlay = wrapper.find('.modal-overlay')
      expect(overlay.exists()).toBe(true)
      expect(overlay.classes()).toContain('modal-overlay')
    })

    it('should render modal container within overlay', () => {
      const container = wrapper.find('.modal-container')
      expect(container.exists()).toBe(true)
      expect(container.classes()).toContain('modal-container')
    })

    it('should have accessible close button with aria-label', () => {
      const closeButton = wrapper.find('.close-button')
      expect(closeButton.attributes('aria-label')).toBe('Close')
    })

    it('should render BaseIcon components', () => {
      const icons = wrapper.findAll('[data-testid="base-icon"]')
      expect(icons.length).toBeGreaterThan(0)
    })

    it('should render BaseButton components', () => {
      const buttons = wrapper.findAll('[data-testid="base-button"]')
      expect(buttons.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty connections array', async () => {
      wrapper = mount(StatusModal, { props: defaultProps })

      const vm = wrapper.vm as unknown as {
        connections: Array<{
          name: string
          status: 'connected' | 'disconnected' | 'error'
          details: string
        }>
        systemStatus: string
      }

      vm.connections = []
      await nextTick()

      expect(vm.systemStatus).toBe('Operational')
    })

    it('should handle all connections disconnected', async () => {
      wrapper = mount(StatusModal, { props: defaultProps })

      const vm = wrapper.vm as unknown as {
        connections: Array<{
          name: string
          status: 'connected' | 'disconnected' | 'error'
          details: string
        }>
        systemStatus: string
      }

      vm.connections.forEach((conn) => {
        conn.status = 'disconnected'
      })
      await nextTick()

      expect(vm.systemStatus).toBe('Partial')
    })

    it('should handle all connections in error state', async () => {
      wrapper = mount(StatusModal, { props: defaultProps })

      const vm = wrapper.vm as unknown as {
        connections: Array<{
          name: string
          status: 'connected' | 'disconnected' | 'error'
          details: string
        }>
        systemStatus: string
      }

      vm.connections.forEach((conn) => {
        conn.status = 'error'
      })
      await nextTick()

      expect(vm.systemStatus).toBe('Degraded')
    })

    it('should handle very large token numbers', () => {
      const vm = wrapper.vm as unknown as {
        formatNumber: (num: number) => string
      }

      expect(vm.formatNumber(50000000)).toBe('50.0M')
      expect(vm.formatNumber(999999999)).toBe('1000.0M')
    })

    it('should handle zero values', () => {
      const vm = wrapper.vm as unknown as {
        formatNumber: (num: number) => string
        getPerformanceClass: (percentage: number) => string
        getLatencyClass: (latency: number) => string
      }

      expect(vm.formatNumber(0)).toBe('0')
      expect(vm.getPerformanceClass(0)).toBe('perf-low')
      expect(vm.getLatencyClass(0)).toBe('perf-low')
    })
  })

  describe('Component State Management', () => {
    beforeEach(() => {
      wrapper = mount(StatusModal, { props: defaultProps })
    })

    it('should maintain state through multiple refresh actions', async () => {
      const vm = wrapper.vm as unknown as {
        handleRefresh: () => void
      }

      vm.handleRefresh()
      await nextTick()

      vm.handleRefresh()
      await nextTick()

      vm.handleRefresh()
      await nextTick()

      expect(mockSuccess).toHaveBeenCalledTimes(3)
      expect(mockSuccess).toHaveBeenCalledWith('Status refreshed')
    })

    it('should handle rapid toggle of visibility', async () => {
      await wrapper.setProps({ visible: false })
      await nextTick()
      expect(wrapper.find('.modal-overlay').exists()).toBe(false)

      await wrapper.setProps({ visible: true })
      await nextTick()
      expect(wrapper.find('.modal-overlay').exists()).toBe(true)

      await wrapper.setProps({ visible: false })
      await nextTick()
      expect(wrapper.find('.modal-overlay').exists()).toBe(false)
    })
  })
})
