/**
 * @fileoverview Test suite for Activity icon component.
 *
 * @description
 * Simple test for static SVG icon component to achieve 100% coverage.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Activity from './Activity.vue'

describe('Activity.vue', () => {
  it('should render SVG with correct attributes', () => {
    const wrapper = mount(Activity)

    const svg = wrapper.find('svg')
    expect(svg.exists()).toBe(true)
    expect(svg.attributes('xmlns')).toBe('http://www.w3.org/2000/svg')
    expect(svg.attributes('fill')).toBe('none')
    expect(svg.attributes('viewBox')).toBe('0 0 24 24')
    expect(svg.attributes('stroke-width')).toBe('1.5')
    expect(svg.attributes('stroke')).toBe('currentColor')
  })

  it('should contain the activity path element', () => {
    const wrapper = mount(Activity)

    const path = wrapper.find('path')
    expect(path.exists()).toBe(true)
    expect(path.attributes('stroke-linecap')).toBe('round')
    expect(path.attributes('stroke-linejoin')).toBe('round')
    expect(path.attributes('d')).toBeTruthy()
  })

  it('should have correct component name', () => {
    const wrapper = mount(Activity)
    expect(wrapper.vm.$options.name).toBe('ActivityIcon')
  })
})
