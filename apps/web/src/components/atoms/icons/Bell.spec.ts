/**
 * @fileoverview Test suite for Bell icon component.
 *
 * @description
 * Test for icon component that uses IconBase wrapper to achieve 100% coverage.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Bell from './Bell.vue'

describe('Bell.vue', () => {
  it('should render IconBase with correct stroke-width', () => {
    const wrapper = mount(Bell)

    const iconBase = wrapper.findComponent({ name: 'IconBase' })
    expect(iconBase.exists()).toBe(true)
    expect(iconBase.props('strokeWidth')).toBe(1.5)
  })

  it('should render bell path elements', () => {
    const wrapper = mount(Bell)

    const paths = wrapper.findAll('path')
    expect(paths).toHaveLength(2)

    // Bell body path
    expect(paths[0].attributes('d')).toBe(
      'M10 5a2 2 0 1 1 4 0c0 1.5.5 2 1 3s1 2.5 1 4v3a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-3c0-1.5.5-3 1-4s1-1.5 1-3z'
    )

    // Bell clapper path
    expect(paths[1].attributes('d')).toBe('M10.5 19a1.5 1.5 0 0 0 3 0')
  })

  it('should have correct component name and inherit attrs', () => {
    const wrapper = mount(Bell)
    expect(wrapper.vm.$options.name).toBe('BellIcon')
    expect(wrapper.vm.$options.inheritAttrs).toBe(false)
  })

  it('should pass through attributes to IconBase', () => {
    const wrapper = mount(Bell, {
      props: {
        size: 32,
        color: 'blue',
      },
    })

    const iconBase = wrapper.findComponent({ name: 'IconBase' })
    expect(iconBase.props('size')).toBe(32)
    expect(iconBase.props('color')).toBe('blue')
  })
})
