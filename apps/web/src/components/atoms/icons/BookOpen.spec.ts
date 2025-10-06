/**
 * @fileoverview Test suite for BookOpen icon component.
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
import BookOpen from './BookOpen.vue'

describe('BookOpen.vue', () => {
  it('should render SVG with correct attributes', () => {
    const wrapper = mount(BookOpen)

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

  it('should contain book path elements', () => {
    const wrapper = mount(BookOpen)

    const paths = wrapper.findAll('path')
    expect(paths).toHaveLength(2)
    expect(paths[0].attributes('d')).toBe(
      'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z'
    )
    expect(paths[1].attributes('d')).toBe(
      'M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z'
    )
  })
})
