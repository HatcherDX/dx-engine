import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import VisualView from './VisualView.vue'

describe('VisualView', () => {
  it('renders correctly', () => {
    const wrapper = mount(VisualView)
    expect(wrapper.find('.visual-view').exists()).toBe(true)
  })

  it('has address bar container slot', () => {
    const wrapper = mount(VisualView, {
      slots: {
        'address-bar': '<div class="test-addressbar">Test AddressBar</div>',
      },
    })
    expect(wrapper.find('.test-addressbar').exists()).toBe(true)
  })

  it('displays mode title and subtitle', () => {
    const wrapper = mount(VisualView)
    expect(wrapper.find('.mode-title').text()).toBe('Visual Mode')
    expect(wrapper.find('.mode-subtitle').text()).toBe('Visual-to-Code Bridge')
  })
})
