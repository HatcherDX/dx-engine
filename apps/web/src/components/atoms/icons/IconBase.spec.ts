/**
 * @fileoverview Comprehensive test suite for IconBase component to achieve 100% coverage.
 *
 * @description
 * Tests all functionality of the IconBase component including props, computed properties,
 * styling, and edge cases to ensure robust icon rendering.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import IconBase from './IconBase.vue'

describe('IconBase.vue', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test wrapper variable requires type assertion for test isolation
  let wrapper: VueWrapper<any>

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('🎯 Component Initialization and Default Props', () => {
    it('should mount successfully with default props', () => {
      wrapper = mount(IconBase)

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('svg').exists()).toBe(true)
    })

    it('should render with default prop values', () => {
      wrapper = mount(IconBase)

      const svg = wrapper.find('svg')
      expect(svg.attributes('width')).toBe('24')
      expect(svg.attributes('height')).toBe('24')
      expect(svg.attributes('viewBox')).toBe('0 0 24 24')
      expect(svg.attributes('fill')).toBe('none')
      expect(svg.classes()).toContain('hatcher-icon')
      expect(svg.classes()).toContain('stroke-icon')
    })

    it('should have correct default computed values', () => {
      wrapper = mount(IconBase)

      expect(wrapper.vm.size).toBe(24)
      expect(wrapper.vm.color).toBe('currentColor')
      expect(wrapper.vm.strokeWidth).toBe(1.5)
      expect(wrapper.vm.viewBox).toBe(24)
      expect(wrapper.vm.class).toBe('')
      expect(wrapper.vm.useStroke).toBe(true)
    })
  })

  describe('🎯 Props and Attributes', () => {
    it('should handle custom size as number', () => {
      wrapper = mount(IconBase, {
        props: { size: 32 },
      })

      const svg = wrapper.find('svg')
      expect(svg.attributes('width')).toBe('32')
      expect(svg.attributes('height')).toBe('32')
    })

    it('should handle custom size as string', () => {
      wrapper = mount(IconBase, {
        props: { size: '48px' },
      })

      const svg = wrapper.find('svg')
      expect(svg.attributes('width')).toBe('48px')
      expect(svg.attributes('height')).toBe('48px')
    })

    it('should handle custom viewBox', () => {
      wrapper = mount(IconBase, {
        props: { viewBox: 16 },
      })

      const svg = wrapper.find('svg')
      expect(svg.attributes('viewBox')).toBe('0 0 16 16')
    })

    it('should handle custom color', () => {
      wrapper = mount(IconBase, {
        props: { color: '#ff0000' },
      })

      const svg = wrapper.find('svg')
      expect(svg.element.style.stroke).toBe('#ff0000')
    })

    it('should handle custom stroke width as number', () => {
      wrapper = mount(IconBase, {
        props: { strokeWidth: 2 },
      })

      const svg = wrapper.find('svg')
      expect(svg.element.style.strokeWidth).toBe('2')
    })

    it('should handle custom stroke width as string', () => {
      wrapper = mount(IconBase, {
        props: { strokeWidth: '2.5' },
      })

      const svg = wrapper.find('svg')
      expect(svg.element.style.strokeWidth).toBe('2.5')
    })

    it('should handle custom CSS classes', () => {
      wrapper = mount(IconBase, {
        props: { class: 'custom-icon-class another-class' },
      })

      const svg = wrapper.find('svg')
      expect(svg.classes()).toContain('hatcher-icon')
      expect(svg.classes()).toContain('custom-icon-class')
      expect(svg.classes()).toContain('another-class')
      expect(svg.classes()).toContain('stroke-icon')
    })
  })

  describe('🎯 Stroke vs Fill Mode', () => {
    it('should apply stroke styling when useStroke is true (default)', () => {
      wrapper = mount(IconBase, {
        props: {
          useStroke: true,
          color: '#0066cc',
          strokeWidth: 1.8,
        },
      })

      const svg = wrapper.find('svg')
      expect(svg.classes()).toContain('stroke-icon')
      expect(svg.classes()).not.toContain('fill-icon')
      expect(svg.element.style.stroke).toBe('#0066cc')
      expect(svg.element.style.strokeWidth).toBe('1.8')
      expect(svg.element.style.strokeLinecap).toBe('round')
      expect(svg.element.style.strokeLinejoin).toBe('round')
      expect(svg.element.style.fill).toBe('')
    })

    it('should apply fill styling when useStroke is false', () => {
      wrapper = mount(IconBase, {
        props: {
          useStroke: false,
          color: '#ff6600',
        },
      })

      const svg = wrapper.find('svg')
      expect(svg.classes()).toContain('fill-icon')
      expect(svg.classes()).not.toContain('stroke-icon')
      expect(svg.element.style.fill).toBe('#ff6600')
      expect(svg.element.style.stroke).toBe('')
      expect(svg.element.style.strokeWidth).toBe('')
    })
  })

  describe('🎯 Computed Properties Coverage', () => {
    it('should compute iconClass correctly with custom classes', () => {
      wrapper = mount(IconBase, {
        props: {
          class: 'my-custom-class',
          useStroke: true,
        },
      })

      expect(wrapper.vm.iconClass).toBe('my-custom-class stroke-icon')
    })

    it('should compute iconClass correctly with fill mode', () => {
      wrapper = mount(IconBase, {
        props: {
          class: 'fill-mode-class',
          useStroke: false,
        },
      })

      expect(wrapper.vm.iconClass).toBe('fill-mode-class fill-icon')
    })

    it('should compute iconClass correctly without custom classes', () => {
      wrapper = mount(IconBase, {
        props: {
          useStroke: true,
        },
      })

      expect(wrapper.vm.iconClass).toBe('stroke-icon')
    })

    it('should filter out empty/falsy classes', () => {
      wrapper = mount(IconBase, {
        props: {
          class: '', // empty string should be filtered out
          useStroke: false,
        },
      })

      expect(wrapper.vm.iconClass).toBe('fill-icon')
    })

    it('should compute iconStyle for stroke mode with all properties', () => {
      wrapper = mount(IconBase, {
        props: {
          useStroke: true,
          color: 'blue',
          strokeWidth: 3,
        },
      })

      const expectedStyle = {
        stroke: 'blue',
        strokeWidth: 3,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      }

      expect(wrapper.vm.iconStyle).toEqual(expectedStyle)
    })

    it('should compute iconStyle for fill mode', () => {
      wrapper = mount(IconBase, {
        props: {
          useStroke: false,
          color: 'green',
        },
      })

      const expectedStyle = {
        fill: 'green',
      }

      expect(wrapper.vm.iconStyle).toEqual(expectedStyle)
    })
  })

  describe('🎯 Slot Content', () => {
    it('should render slot content correctly', () => {
      wrapper = mount(IconBase, {
        slots: {
          default:
            '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>',
        },
      })

      const path = wrapper.find('path')
      expect(path.exists()).toBe(true)
      expect(path.attributes('d')).toBe(
        'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'
      )
    })

    it('should render multiple SVG elements in slot', () => {
      wrapper = mount(IconBase, {
        slots: {
          default: `
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v6"/>
            <path d="m21 12-6-6"/>
          `,
        },
      })

      expect(wrapper.find('circle').exists()).toBe(true)
      expect(wrapper.findAll('path')).toHaveLength(2)
    })
  })

  describe('🎯 Edge Cases and Complex Scenarios', () => {
    it('should handle all props together in complex scenario', () => {
      wrapper = mount(IconBase, {
        props: {
          size: '64px',
          color: 'rgba(255, 0, 0, 0.5)',
          strokeWidth: '2.5',
          viewBox: 32,
          class: 'large-icon important',
          useStroke: true,
        },
        slots: {
          default: '<rect x="4" y="4" width="24" height="24" rx="2"/>',
        },
      })

      const svg = wrapper.find('svg')

      // Check attributes
      expect(svg.attributes('width')).toBe('64px')
      expect(svg.attributes('height')).toBe('64px')
      expect(svg.attributes('viewBox')).toBe('0 0 32 32')

      // Check classes
      expect(svg.classes()).toContain('hatcher-icon')
      expect(svg.classes()).toContain('large-icon')
      expect(svg.classes()).toContain('important')
      expect(svg.classes()).toContain('stroke-icon')

      // Check styles
      expect(svg.element.style.stroke).toBe('rgba(255, 0, 0, 0.5)')
      expect(svg.element.style.strokeWidth).toBe('2.5')
      expect(svg.element.style.strokeLinecap).toBe('round')
      expect(svg.element.style.strokeLinejoin).toBe('round')

      // Check slot content
      expect(wrapper.find('rect').exists()).toBe(true)
    })

    it('should handle zero/minimum values', () => {
      wrapper = mount(IconBase, {
        props: {
          size: 0,
          strokeWidth: 0,
          viewBox: 1,
        },
      })

      const svg = wrapper.find('svg')
      expect(svg.attributes('width')).toBe('0')
      expect(svg.attributes('height')).toBe('0')
      expect(svg.attributes('viewBox')).toBe('0 0 1 1')
      expect(svg.element.style.strokeWidth).toBe('0')
    })

    it('should handle special color values', () => {
      const specialColors = [
        'transparent',
        'inherit',
        'currentColor',
        'var(--primary-color)',
        'hsl(120, 100%, 50%)',
        '#fff',
      ]

      specialColors.forEach((color) => {
        wrapper = mount(IconBase, {
          props: { color, useStroke: true },
        })

        const svg = wrapper.find('svg')
        expect(svg.element.style.stroke).toBeTruthy()

        wrapper.unmount()
      })
    })
  })

  describe('🎯 Accessibility and Semantic Structure', () => {
    it('should have proper accessibility attributes', () => {
      wrapper = mount(IconBase)

      const svg = wrapper.find('svg')
      expect(svg.attributes('aria-hidden')).toBe('true')
      expect(svg.attributes('xmlns')).toBe('http://www.w3.org/2000/svg')
      expect(svg.attributes('fill')).toBe('none')
    })

    it('should maintain consistent SVG structure', () => {
      wrapper = mount(IconBase, {
        slots: {
          default: '<g><path d="M1 1"/><circle r="5"/></g>',
        },
      })

      expect(wrapper.find('svg').exists()).toBe(true)
      expect(wrapper.find('g').exists()).toBe(true)
      expect(wrapper.find('path').exists()).toBe(true)
      expect(wrapper.find('circle').exists()).toBe(true)
    })
  })
})
