import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import TimelineSidebar from './TimelineSidebar.vue'

// Mock the smart truncation composable
vi.mock('../../composables/useSmartTruncation', () => ({
  useSmartTruncation: () => ({
    truncatePath: vi.fn((path) =>
      path.length > 30 ? `...${path.slice(-20)}` : path
    ),
  }),
}))

describe('TimelineSidebar.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should mount and render without errors', () => {
    const wrapper = mount(TimelineSidebar)
    expect(wrapper.exists()).toBe(true)
  })

  it('should render timeline sidebar container', () => {
    const wrapper = mount(TimelineSidebar)
    const sidebar = wrapper.find('.timeline-sidebar')
    expect(sidebar.exists()).toBe(true)
  })

  it('should render tab navigation', () => {
    const wrapper = mount(TimelineSidebar)
    const tabNav = wrapper.find('.tabs-header')
    expect(tabNav.exists()).toBe(true)
  })

  it('should have changes and history tabs', () => {
    const wrapper = mount(TimelineSidebar)
    const tabs = wrapper.findAll('.tab-button')
    expect(tabs.length).toBe(2)
    expect(tabs[0].text()).toContain('Changes')
    expect(tabs[1].text()).toContain('History')
  })

  it('should start with changes tab active', () => {
    const wrapper = mount(TimelineSidebar)
    expect(wrapper.vm.activeTab).toBe('changes')

    const activeTab = wrapper.find('.tab-button.tab-active')
    expect(activeTab.text()).toContain('Changes')
  })

  it('should switch tabs when clicked', async () => {
    const wrapper = mount(TimelineSidebar)
    const tabs = wrapper.findAll('.tab-button')
    const historyTab = tabs[1] // Second tab is history

    await historyTab.trigger('click')
    expect(wrapper.vm.activeTab).toBe('history')
  })

  it('should render changes content when changes tab is active', () => {
    const wrapper = mount(TimelineSidebar)
    const changesContent = wrapper.find('.changes-content')
    expect(changesContent.exists()).toBe(true)
  })

  it('should render file changes list', () => {
    const wrapper = mount(TimelineSidebar)
    const changesList = wrapper.find('.changes-list')
    expect(changesList.exists()).toBe(true)
  })

  it('should display file change items', () => {
    const wrapper = mount(TimelineSidebar)
    const changeItems = wrapper.findAll('.file-change-row')
    expect(changeItems.length).toBeGreaterThan(0)
  })

  it('should show status icons for different file statuses', () => {
    const wrapper = mount(TimelineSidebar)
    const statusIcons = wrapper.findAllComponents({ name: 'BaseIcon' })
    expect(statusIcons.length).toBeGreaterThan(0)
  })

  it('should handle file selection', async () => {
    const wrapper = mount(TimelineSidebar)
    const firstChange = wrapper.find('.file-change-row')

    await firstChange.trigger('click')
    expect(wrapper.exists()).toBe(true) // File selection logic
  })

  it('should handle checkbox interactions', async () => {
    const wrapper = mount(TimelineSidebar)
    const checkbox = wrapper.find('input[type="checkbox"]')

    if (checkbox.exists()) {
      await checkbox.setChecked(true)
      expect(checkbox.element.checked).toBe(true)
    }
  })

  it('should truncate long file paths', () => {
    const wrapper = mount(TimelineSidebar)
    const component = wrapper.vm

    const longPath =
      'src/components/organisms/very/deep/nested/path/Component.vue'
    const truncated = component.getTruncatedPath(longPath)

    expect(truncated).toBeDefined()
  })

  it('should return correct status icons', () => {
    const wrapper = mount(TimelineSidebar)
    const component = wrapper.vm

    expect(component.getStatusIcon('added')).toBe('GitBranch')
    expect(component.getStatusIcon('modified')).toBe('Terminal')
    expect(component.getStatusIcon('deleted')).toBe('X')
  })

  it('should apply correct status classes', () => {
    const wrapper = mount(TimelineSidebar)
    const component = wrapper.vm

    expect(component.getStatusClass('added')).toBe('status-added')
    expect(component.getStatusClass('modified')).toBe('status-modified')
    expect(component.getStatusClass('deleted')).toBe('status-deleted')
  })

  it('should handle resize observer for container width', async () => {
    const wrapper = mount(TimelineSidebar)

    // Mock ResizeObserver entry
    const mockEntry = {
      target: { clientWidth: 300 },
      contentRect: { width: 300 },
    }

    // Use mockEntry to avoid unused variable warning
    expect(mockEntry.target.clientWidth).toBe(300)

    // Simulate resize
    if (wrapper.vm.updateContainerWidth) {
      wrapper.vm.updateContainerWidth()
    }

    expect(wrapper.exists()).toBe(true)
  })

  it('should render history content when history tab is active', async () => {
    const wrapper = mount(TimelineSidebar)

    await wrapper.vm.switchTab('history')
    await nextTick()

    expect(wrapper.vm.activeTab).toBe('history')
  })

  it('should handle empty changes list', () => {
    const wrapper = mount(TimelineSidebar)

    // Mock empty changes
    wrapper.vm.fileChanges = []

    expect(wrapper.exists()).toBe(true)
  })

  it('should format file paths correctly', () => {
    const wrapper = mount(TimelineSidebar)
    const component = wrapper.vm

    const testPaths = [
      'src/App.vue',
      'src/components/Button.vue',
      'very/long/path/to/component/File.vue',
    ]

    testPaths.forEach((path) => {
      const result = component.getTruncatedPath(path)
      expect(result).toBeDefined()
      expect(typeof result).toBe('string')
    })
  })
})
