import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CodeView from './CodeView.vue'

describe('CodeView', () => {
  it('renders correctly', () => {
    const wrapper = mount(CodeView)
    expect(wrapper.find('.code-view').exists()).toBe(true)
  })

  it('has address bar container slot', () => {
    const wrapper = mount(CodeView, {
      slots: {
        'address-bar': '<div class="test-addressbar">Test AddressBar</div>',
      },
    })
    expect(wrapper.find('.test-addressbar').exists()).toBe(true)
  })

  it('displays mode title and subtitle', () => {
    const wrapper = mount(CodeView)
    expect(wrapper.find('.mode-title').text()).toBe('Code Mode')
    expect(wrapper.find('.mode-subtitle').text()).toBe(
      'Professional Code Editor'
    )
  })
})
