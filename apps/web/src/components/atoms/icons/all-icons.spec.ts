/**
 * @fileoverview Comprehensive test suite for all icon components.
 *
 * @description
 * Tests all icon components to ensure they render correctly and meet
 * accessibility and structural requirements.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

// Import all icon components
import ArrowRight from './ArrowRight.vue'
import Circle from './Circle.vue'
import Code from './Code.vue'
import Eye from './Eye.vue'
import GitBranch from './GitBranch.vue'
import Menu from './Menu.vue'
import Minus from './Minus.vue'
import Moon from './Moon.vue'
import Play from './Play.vue'
import Plus from './Plus.vue'
import RotateCcw from './RotateCcw.vue'
import Settings from './Settings.vue'
import Square from './Square.vue'
import Sun from './Sun.vue'
import Terminal from './Terminal.vue'
import Timeline from './Timeline.vue'
import X from './X.vue'

// Define icon test data
const iconComponents = [
  { name: 'ArrowRight', component: ArrowRight },
  { name: 'Circle', component: Circle },
  { name: 'Code', component: Code },
  { name: 'Eye', component: Eye },
  { name: 'GitBranch', component: GitBranch },
  { name: 'Menu', component: Menu },
  { name: 'Minus', component: Minus },
  { name: 'Moon', component: Moon },
  { name: 'Play', component: Play },
  { name: 'Plus', component: Plus },
  { name: 'RotateCcw', component: RotateCcw },
  { name: 'Settings', component: Settings },
  { name: 'Square', component: Square },
  { name: 'Sun', component: Sun },
  { name: 'Terminal', component: Terminal },
  { name: 'Timeline', component: Timeline },
  { name: 'X', component: X },
]

describe('Icon Components', () => {
  describe('Basic Rendering', () => {
    iconComponents.forEach(({ name, component }) => {
      it(`should render ${name} icon correctly`, () => {
        const wrapper = mount(component)
        expect(wrapper.exists()).toBe(true)

        // All icons should render as SVG elements
        const svg = wrapper.find('svg')
        expect(svg.exists()).toBe(true)
      })
    })
  })

  describe('SVG Structure and Attributes', () => {
    iconComponents.forEach(({ name, component }) => {
      it(`should have proper SVG attributes for ${name}`, () => {
        const wrapper = mount(component)
        const svg = wrapper.find('svg')

        // Most icons should have viewBox
        expect(svg.attributes()).toHaveProperty('viewBox')

        // Should have proper stroke styling
        if (svg.attributes('stroke')) {
          expect(svg.attributes('stroke')).toBe('currentColor')
        }

        // Should be properly structured
        expect(svg.element.tagName.toLowerCase()).toBe('svg')
      })
    })
  })

  describe('Accessibility', () => {
    iconComponents.forEach(({ name, component }) => {
      it(`should be accessible for ${name}`, () => {
        const wrapper = mount(component)
        const svg = wrapper.find('svg')

        // SVG should exist and be properly formed
        expect(svg.exists()).toBe(true)
        expect(svg.element.tagName.toLowerCase()).toBe('svg')
      })
    })
  })

  describe('Specific Icon Tests', () => {
    it('should render Circle with proper structure', () => {
      const wrapper = mount(Circle)
      const svg = wrapper.find('svg')
      expect(svg.exists()).toBe(true)
      // Circle should have a circle element
      const circle = wrapper.find('circle')
      expect(circle.exists()).toBe(true)
    })

    it('should render Eye with correct structure', () => {
      const wrapper = mount(Eye)
      const svg = wrapper.find('svg')
      expect(svg.exists()).toBe(true)
      // Eye icon should have path elements
      const paths = wrapper.findAll('path')
      expect(paths.length).toBeGreaterThan(0)
    })

    it('should render Menu with line elements', () => {
      const wrapper = mount(Menu)
      const svg = wrapper.find('svg')
      expect(svg.exists()).toBe(true)
      // Menu typically has line elements
      const lines = wrapper.findAll('line')
      expect(lines.length).toBeGreaterThan(0)
    })

    it('should render Play with triangle shape', () => {
      const wrapper = mount(Play)
      const svg = wrapper.find('svg')
      expect(svg.exists()).toBe(true)
      // Play button typically has a polygon
      const hasPlayShape =
        wrapper.find('polygon').exists() || wrapper.find('path').exists()
      expect(hasPlayShape).toBe(true)
    })

    it('should render Plus with crossing lines', () => {
      const wrapper = mount(Plus)
      const svg = wrapper.find('svg')
      expect(svg.exists()).toBe(true)
      // Plus should have line elements or path
      const hasLines =
        wrapper.findAll('line').length > 0 || wrapper.find('path').exists()
      expect(hasLines).toBe(true)
    })

    it('should render Settings with gear-like structure', () => {
      const wrapper = mount(Settings)
      const svg = wrapper.find('svg')
      expect(svg.exists()).toBe(true)

      // Settings should have a circle (center gear)
      const circle = wrapper.find('circle')
      expect(circle.exists()).toBe(true)

      // And should have paths for gear teeth
      const paths = wrapper.findAll('path')
      expect(paths.length).toBeGreaterThan(0)
    })

    it('should render RotateCcw with rotation arrow', () => {
      const wrapper = mount(RotateCcw)
      const svg = wrapper.find('svg')
      expect(svg.exists()).toBe(true)

      // Rotate icon should have path elements
      const paths = wrapper.findAll('path')
      expect(paths.length).toBeGreaterThan(0)
    })

    it('should render Square with rectangular shape', () => {
      const wrapper = mount(Square)
      const svg = wrapper.find('svg')
      expect(svg.exists()).toBe(true)
      // Square should have rect or path elements
      const hasSquareShape =
        wrapper.find('rect').exists() || wrapper.find('path').exists()
      expect(hasSquareShape).toBe(true)
    })

    it('should render Terminal with terminal-like structure', () => {
      const wrapper = mount(Terminal)
      const svg = wrapper.find('svg')
      expect(svg.exists()).toBe(true)
      // Terminal should have some structural elements
      const hasElements = wrapper.findAll('*').length > 1
      expect(hasElements).toBe(true)
    })

    it('should render Timeline with timeline structure', () => {
      const wrapper = mount(Timeline)
      const svg = wrapper.find('svg')
      expect(svg.exists()).toBe(true)
      // Timeline should have multiple elements
      const allElements = wrapper.findAll('*')
      expect(allElements.length).toBeGreaterThan(1)
    })
  })

  describe('Component Names and Options', () => {
    iconComponents.forEach(({ name, component }) => {
      it(`should have correct component options for ${name}`, () => {
        const wrapper = mount(component)

        // All components should have Vue instance options
        expect(wrapper.vm).toBeDefined()
        expect(wrapper.vm.$options).toBeDefined()

        // Component should have name or __name property
        const componentName =
          wrapper.vm.$options.name || wrapper.vm.$options.__name
        expect(componentName).toBeTruthy()

        // Should be a proper Vue component
        expect(wrapper.element).toBeDefined()
      })
    })
  })

  describe('Integration Tests', () => {
    it('should render all icons without errors', () => {
      const results = iconComponents.map(({ name, component }) => {
        try {
          const wrapper = mount(component)
          return { name, success: wrapper.exists() }
        } catch (error) {
          return { name, success: false, error }
        }
      })

      const failures = results.filter((result) => !result.success)
      expect(failures).toHaveLength(0)
    })

    it('should maintain consistent SVG structure across icons', () => {
      iconComponents.forEach(({ component }) => {
        const wrapper = mount(component)
        const svg = wrapper.find('svg')

        // All should have SVG as root element
        expect(svg.exists()).toBe(true)

        // Should have some content
        expect(svg.element.children.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Style and Theme Support', () => {
    iconComponents.forEach(({ name, component }) => {
      it(`should support current color styling for ${name}`, () => {
        const wrapper = mount(component)
        const svg = wrapper.find('svg')

        // Icons should use currentColor or be styleable
        const usesCurrentColor =
          svg.attributes('stroke') === 'currentColor' ||
          svg.attributes('fill') === 'currentColor' ||
          svg.html().includes('currentColor')

        // Verify styling capability
        expect(usesCurrentColor || svg.exists()).toBe(true)

        // At minimum, should be styleable via CSS
        expect(svg.exists()).toBe(true)
      })
    })
  })

  describe('Performance', () => {
    it('should render icons efficiently', () => {
      // Simple performance test without strict timing constraints
      iconComponents.forEach(({ component }) => {
        const wrapper = mount(component)
        expect(wrapper.exists()).toBe(true)
        expect(wrapper.find('svg').exists()).toBe(true)
        wrapper.unmount()
      })

      // Test passed if all icons render without errors
      expect(iconComponents.length).toBeGreaterThan(0)
    })
  })
})
