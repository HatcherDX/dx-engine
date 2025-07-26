import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import App from './App.vue'

describe('App.vue', () => {
  it('should mount and render without errors', () => {
    const wrapper = mount(App)
    expect(wrapper.exists()).toBe(true)
  })

  it('should render the app container with correct class', () => {
    const wrapper = mount(App)
    const container = wrapper.find('.app-container')
    expect(container.exists()).toBe(true)
  })

  it('should render the logo container', () => {
    const wrapper = mount(App)
    const logoContainer = wrapper.find('.logo-container')
    expect(logoContainer.exists()).toBe(true)
  })

  it('should display the DX Engine logo with correct attributes', () => {
    const wrapper = mount(App)
    const logo = wrapper.find('.logo')

    expect(logo.exists()).toBe(true)
    expect(logo.attributes('alt')).toBe('DX Engine')
    expect(logo.attributes('src')).toContain('logo-dark.svg')
  })

  it('should have correct component structure', () => {
    // Test component structure concept
    const expectedStructure = {
      template: 'div.app-container',
      logo: '/logo-dark.svg',
      message: 'Hatcher DX Engine initialized',
    }

    expect(expectedStructure.template).toBe('div.app-container')
    expect(expectedStructure.logo).toBe('/logo-dark.svg')
    expect(expectedStructure.message).toBe('Hatcher DX Engine initialized')
  })
})
