/**
 * @fileoverview Test suite for Check icon component.
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
import Check from './Check.vue'

describe('Check.vue', () => {
  it('should render SVG with correct attributes', () => {
    const wrapper = mount(Check)

    const svg = wrapper.find('svg')
    expect(svg.exists()).toBe(true)
    expect(svg.attributes('xmlns')).toBe('http://www.w3.org/2000/svg')
    expect(svg.attributes('width')).toBe('24')
    expect(svg.attributes('height')).toBe('24')
    expect(svg.attributes('viewBox')).toBe('0 0 24 24')
    expect(svg.attributes('fill')).toBe('none')
    expect(svg.attributes('stroke')).toBe('currentColor')
    expect(svg.attributes('stroke-width')).toBe('2')
    expect(svg.attributes('stroke-linecap')).toBe('round')
    expect(svg.attributes('stroke-linejoin')).toBe('round')
  })

  it('should contain check polyline element', () => {
    const wrapper = mount(Check)

    const polyline = wrapper.find('polyline')
    expect(polyline.exists()).toBe(true)
    expect(polyline.attributes('points')).toBe('20 6 9 17 4 12')
  })
})
