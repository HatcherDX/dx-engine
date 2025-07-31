import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import GenerativeSidebar from './GenerativeSidebar.vue'

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

  it('should render logo section', () => {
    const wrapper = mount(GenerativeSidebar)
    const logoSection = wrapper.find('.logo-section')
    expect(logoSection.exists()).toBe(true)
  })

  it('should render BaseLogo component', () => {
    const wrapper = mount(GenerativeSidebar)
    const logo = wrapper.findComponent({ name: 'BaseLogo' })
    expect(logo.exists()).toBe(true)
  })

  it('should apply correct task status classes', () => {
    const wrapper = mount(GenerativeSidebar)

    // Test that different status classes are applied in the DOM
    const statusIndicators = wrapper.findAll('.status-indicator')
    const statusClasses = statusIndicators
      .map((indicator) =>
        Array.from(indicator.element.classList).find((cls) =>
          cls.startsWith('status-')
        )
      )
      .filter(Boolean)

    expect(statusClasses.length).toBeGreaterThan(0)
    expect(statusClasses).toContain('status-success')
    expect(statusClasses).toContain('status-running')
    expect(statusClasses).toContain('status-inactive')
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
})
