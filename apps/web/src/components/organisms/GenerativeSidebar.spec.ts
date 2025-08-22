import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import GenerativeSidebar from './GenerativeSidebar.vue'

// Type definition for GenerativeSidebar component instance - NO ANY TYPES ALLOWED
interface GenerativeSidebarInstance
  extends InstanceType<typeof GenerativeSidebar> {
  aiModels: Array<{ id: string; name: string; description: string }>
  selectedModelId: string
  selectModel: (modelId: string) => void
  [key: string]: unknown
}

// Mock child components
vi.mock('../atoms/BaseLogo.vue', () => ({
  default: {
    name: 'BaseLogo',
    template: '<div class="base-logo">Logo</div>',
  },
}))

describe('GenerativeSidebar.vue', () => {
  it('should mount and render without errors', () => {
    const wrapper = mount(GenerativeSidebar)
    expect(wrapper.exists()).toBe(true)
  })

  it('should render background tasks section', () => {
    const wrapper = mount(GenerativeSidebar)
    const tasksSection = wrapper.find('.tasks-section')
    expect(tasksSection.exists()).toBe(true)
  })

  it('should display section title', () => {
    const wrapper = mount(GenerativeSidebar)
    const title = wrapper.find('.section-title')
    expect(title.text()).toBe('Background Tasks')
  })

  it('should render task list', () => {
    const wrapper = mount(GenerativeSidebar)
    const tasksList = wrapper.find('.tasks-list')
    expect(tasksList.exists()).toBe(true)
  })

  it('should render task rows', () => {
    const wrapper = mount(GenerativeSidebar)
    const taskRows = wrapper.findAll('.task-row')
    expect(taskRows.length).toBeGreaterThan(0)
  })

  it('should display task status indicators', () => {
    const wrapper = mount(GenerativeSidebar)
    const statusIndicators = wrapper.findAll('.status-indicator')
    expect(statusIndicators.length).toBeGreaterThan(0)
  })

  it('should show different status classes', () => {
    const wrapper = mount(GenerativeSidebar)

    // Check that status indicators exist with the expected classes
    const successStatus = wrapper.find('.status-success')
    const runningStatus = wrapper.find('.status-running')
    const inactiveStatus = wrapper.find('.status-inactive')

    // At least one of each status should exist based on the component's default data
    expect(successStatus.exists()).toBe(true)
    expect(runningStatus.exists()).toBe(true)
    expect(inactiveStatus.exists()).toBe(true)
  })

  it('should render task titles and commands', () => {
    const wrapper = mount(GenerativeSidebar)
    const taskTitles = wrapper.findAll('.task-title')
    const taskCommands = wrapper.findAll('.task-command')

    expect(taskTitles.length).toBeGreaterThan(0)
    expect(taskCommands.length).toBeGreaterThan(0)
  })

  it('should handle task click events', async () => {
    const wrapper = mount(GenerativeSidebar)
    const firstTask = wrapper.find('.task-row')

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await firstTask.trigger('click')

    expect(consoleSpy).toHaveBeenCalledWith('Task clicked:', expect.any(String))
    consoleSpy.mockRestore()
  })

  it('should not render logo section (branding removed)', () => {
    const wrapper = mount(GenerativeSidebar)
    const logoSection = wrapper.find('.logo-section')
    expect(logoSection.exists()).toBe(false)
  })

  it('should not render BaseLogo component (branding removed)', () => {
    const wrapper = mount(GenerativeSidebar)
    const logo = wrapper.findComponent({ name: 'BaseLogo' })
    expect(logo.exists()).toBe(false)
  })

  it('should apply correct task status classes', () => {
    const wrapper = mount(GenerativeSidebar)

    // Test that different status classes are applied in the DOM
    const statusSuccess = wrapper.find('.status-success')
    const statusRunning = wrapper.find('.status-running')
    const statusInactive = wrapper.find('.status-inactive')

    // At least one of each status should exist in the default tasks
    expect(
      statusSuccess.exists() ||
        statusRunning.exists() ||
        statusInactive.exists()
    ).toBe(true)
  })

  it('should have initial background tasks data', () => {
    const wrapper = mount(GenerativeSidebar)

    // Test that tasks are rendered in the DOM instead of accessing internal data
    const taskRows = wrapper.findAll('.task-row')
    const taskTitles = wrapper.findAll('.task-title')
    const taskCommands = wrapper.findAll('.task-command')
    const statusIndicators = wrapper.findAll('.status-indicator')

    expect(taskRows.length).toBeGreaterThan(0)
    expect(taskTitles.length).toBeGreaterThan(0)
    expect(taskCommands.length).toBeGreaterThan(0)
    expect(statusIndicators.length).toBeGreaterThan(0)

    // Verify structure exists
    expect(taskRows.length).toBe(taskTitles.length)
    expect(taskRows.length).toBe(statusIndicators.length)
  })

  it('should handle error status correctly', () => {
    const wrapper = mount(GenerativeSidebar)
    const vm = wrapper.vm as GenerativeSidebarInstance

    // Test the getStatusClass function with error status
    const errorClass = vm.getStatusClass('error')
    expect(errorClass).toBe('status-error')
  })

  it('should handle unknown status with default case', () => {
    const wrapper = mount(GenerativeSidebar)
    const vm = wrapper.vm as GenerativeSidebarInstance

    // Test the getStatusClass function with an unknown status
    const unknownClass = vm.getStatusClass(
      'unknown' as 'success' | 'running' | 'error' | 'inactive'
    )
    expect(unknownClass).toBe('status-inactive')
  })

  it('should apply all status classes correctly', () => {
    const wrapper = mount(GenerativeSidebar)
    const vm = wrapper.vm as GenerativeSidebarInstance

    // Test all status cases
    expect(vm.getStatusClass('success')).toBe('status-success')
    expect(vm.getStatusClass('running')).toBe('status-running')
    expect(vm.getStatusClass('error')).toBe('status-error')
    expect(vm.getStatusClass('inactive')).toBe('status-inactive')
    expect(
      vm.getStatusClass(
        'any-other' as 'success' | 'running' | 'error' | 'inactive'
      )
    ).toBe('status-inactive')
  })
})
