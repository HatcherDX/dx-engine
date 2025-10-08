import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import App from './App.vue'

// Simple smoke tests for the terminal demo app
describe('Terminal Demo App', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()
  })

  it('should render the app header', () => {
    const wrapper = mount(App)
    expect(wrapper.find('h1').exists()).toBe(true)
    expect(wrapper.find('h1').text()).toContain('Terminal System Lab')
  })

  it('should show control buttons', () => {
    const wrapper = mount(App)
    expect(wrapper.find('.btn-primary').exists()).toBe(true)
    expect(wrapper.find('.btn-primary').text()).toBe('New Terminal')
  })

  it('should display backend info', () => {
    const wrapper = mount(App)
    expect(wrapper.find('.backend-info').exists()).toBe(true)
  })

  it('should have zoom controls', () => {
    const wrapper = mount(App)
    expect(wrapper.find('.zoom-controls').exists()).toBe(true)
    expect(wrapper.find('.zoom-display').exists()).toBe(true)
    expect(wrapper.find('.zoom-display').text()).toBe('100%')
  })

  it('should have theme selector', () => {
    const wrapper = mount(App)
    expect(wrapper.find('.theme-selector').exists()).toBe(true)
    const options = wrapper.find('.theme-selector').findAll('option')
    expect(options.length).toBe(3)
    expect(options[0].text()).toBe('Dark')
    expect(options[1].text()).toBe('Light')
    expect(options[2].text()).toBe('VSCode')
  })

  it('should show terminal container', () => {
    const wrapper = mount(App)
    expect(wrapper.find('.terminal-container').exists()).toBe(true)
  })

  it('should handle window resize', async () => {
    const wrapper = mount(App)

    // Trigger window resize
    window.dispatchEvent(new Event('resize'))
    await nextTick()

    // Component should still be mounted
    expect(wrapper.exists()).toBe(true)
  })
})
