/**
 * @fileoverview Comprehensive test suite for CircleLoading component.
 *
 * @description
 * Tests all functionality of the CircleLoading component including
 * different size variants, computed properties, conditional rendering,
 * props handling, and component structure.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CircleLoading from './CircleLoading.vue'

describe('CircleLoading', () => {
  describe('🎯 Basic Rendering', () => {
    it('renders with default props', () => {
      const wrapper = mount(CircleLoading)

      expect(wrapper.find('.circle-loading').exists()).toBe(true)
      expect(wrapper.find('.circle-loading--md').exists()).toBe(true)
      expect(wrapper.find('.circle-loading__spinner').exists()).toBe(true)
      expect(wrapper.find('.circle-loading__svg').exists()).toBe(true)
    })

    it('renders SVG structure correctly', () => {
      const wrapper = mount(CircleLoading)

      const svg = wrapper.find('.circle-loading__svg')
      expect(svg.attributes('viewBox')).toBe('0 0 50 50')
      expect(svg.attributes('xmlns')).toBe('http://www.w3.org/2000/svg')

      const circles = wrapper.findAll('circle')
      expect(circles).toHaveLength(2)

      // Test track circle
      const track = wrapper.find('.circle-loading__track')
      expect(track.attributes('cx')).toBe('25')
      expect(track.attributes('cy')).toBe('25')
      expect(track.attributes('r')).toBe('20')
      expect(track.attributes('fill')).toBe('none')
      expect(track.attributes('stroke-width')).toBe('4')

      // Test progress circle
      const progress = wrapper.find('.circle-loading__progress')
      expect(progress.attributes('cx')).toBe('25')
      expect(progress.attributes('cy')).toBe('25')
      expect(progress.attributes('r')).toBe('20')
      expect(progress.attributes('fill')).toBe('none')
      expect(progress.attributes('stroke-width')).toBe('4')
    })
  })

  describe('🎯 Size Variants', () => {
    it('applies small size class', () => {
      const wrapper = mount(CircleLoading, {
        props: {
          size: 'sm',
        },
      })

      expect(wrapper.find('.circle-loading--sm').exists()).toBe(true)
      expect(wrapper.find('.circle-loading--md').exists()).toBe(false)
      expect(wrapper.find('.circle-loading--lg').exists()).toBe(false)
    })

    it('applies medium size class (default)', () => {
      const wrapper = mount(CircleLoading, {
        props: {
          size: 'md',
        },
      })

      expect(wrapper.find('.circle-loading--md').exists()).toBe(true)
      expect(wrapper.find('.circle-loading--sm').exists()).toBe(false)
      expect(wrapper.find('.circle-loading--lg').exists()).toBe(false)
    })

    it('applies large size class', () => {
      const wrapper = mount(CircleLoading, {
        props: {
          size: 'lg',
        },
      })

      expect(wrapper.find('.circle-loading--lg').exists()).toBe(true)
      expect(wrapper.find('.circle-loading--sm').exists()).toBe(false)
      expect(wrapper.find('.circle-loading--md').exists()).toBe(false)
    })
  })

  describe('🎯 Text Display', () => {
    it('displays text when provided', () => {
      const wrapper = mount(CircleLoading, {
        props: {
          text: 'Loading...',
        },
      })

      const textElement = wrapper.find('.circle-loading__text')
      expect(textElement.exists()).toBe(true)
      expect(textElement.text()).toBe('Loading...')
    })

    it('does not display text element when text is empty', () => {
      const wrapper = mount(CircleLoading, {
        props: {
          text: '',
        },
      })

      expect(wrapper.find('.circle-loading__text').exists()).toBe(false)
    })

    it('does not display text element when text prop is not provided', () => {
      const wrapper = mount(CircleLoading)

      expect(wrapper.find('.circle-loading__text').exists()).toBe(false)
    })

    it('displays custom text content', () => {
      const wrapper = mount(CircleLoading, {
        props: {
          text: 'Please wait while we process your request...',
        },
      })

      const textElement = wrapper.find('.circle-loading__text')
      expect(textElement.text()).toBe(
        'Please wait while we process your request...'
      )
    })
  })

  describe('🎯 Icon Display - showEgg computed property', () => {
    it('shows icon when size is lg and showIcon is true (default)', () => {
      const wrapper = mount(CircleLoading, {
        props: {
          size: 'lg',
          showIcon: true,
        },
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const vm = wrapper.vm as any
      expect(vm.showEgg).toBe(true)
      expect(wrapper.find('.circle-loading__icon').exists()).toBe(true)

      const iconComponent = wrapper.findComponent({ name: 'BaseIcon' })
      expect(iconComponent.exists()).toBe(true)
      expect(iconComponent.props('name')).toBe('Egg') // Default icon
    })

    it('does not show icon when size is lg but showIcon is false', () => {
      const wrapper = mount(CircleLoading, {
        props: {
          size: 'lg',
          showIcon: false,
        },
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const vm = wrapper.vm as any
      expect(vm.showEgg).toBe(false)
      expect(wrapper.find('.circle-loading__icon').exists()).toBe(false)
    })

    it('does not show icon when size is md even with showIcon true', () => {
      const wrapper = mount(CircleLoading, {
        props: {
          size: 'md',
          showIcon: true,
        },
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const vm = wrapper.vm as any
      expect(vm.showEgg).toBe(false)
      expect(wrapper.find('.circle-loading__icon').exists()).toBe(false)
    })

    it('does not show icon when size is sm even with showIcon true', () => {
      const wrapper = mount(CircleLoading, {
        props: {
          size: 'sm',
          showIcon: true,
        },
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const vm = wrapper.vm as any
      expect(vm.showEgg).toBe(false)
      expect(wrapper.find('.circle-loading__icon').exists()).toBe(false)
    })

    it('shows custom icon when provided', () => {
      const wrapper = mount(CircleLoading, {
        props: {
          size: 'lg',
          showIcon: true,
          icon: 'Rocket',
        },
      })

      const iconComponent = wrapper.findComponent({ name: 'BaseIcon' })
      expect(iconComponent.props('name')).toBe('Rocket')
    })
  })

  describe('🎯 Icon Size - iconSize computed property', () => {
    it('returns xs for sm size', () => {
      const wrapper = mount(CircleLoading, {
        props: {
          size: 'sm',
        },
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const vm = wrapper.vm as any
      expect(vm.iconSize).toBe('xs')
    })

    it('returns lg for lg size', () => {
      const wrapper = mount(CircleLoading, {
        props: {
          size: 'lg',
          showIcon: true,
        },
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const vm = wrapper.vm as any
      expect(vm.iconSize).toBe('lg')

      // Verify icon gets the correct size when displayed
      const iconComponent = wrapper.findComponent({ name: 'BaseIcon' })
      expect(iconComponent.props('size')).toBe('lg')
    })

    it('returns sm for md size (default case)', () => {
      const wrapper = mount(CircleLoading, {
        props: {
          size: 'md',
        },
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const vm = wrapper.vm as any
      expect(vm.iconSize).toBe('sm')
    })

    it('passes correct icon size to BaseIcon component', () => {
      const wrapper = mount(CircleLoading, {
        props: {
          size: 'lg',
          showIcon: true,
        },
      })

      const iconComponent = wrapper.findComponent({ name: 'BaseIcon' })
      expect(iconComponent.props('size')).toBe('lg')
    })
  })

  describe('🎯 Props Default Values', () => {
    it('uses default values when no props provided', () => {
      const wrapper = mount(CircleLoading)

      expect(wrapper.find('.circle-loading--md').exists()).toBe(true) // size: 'md'
      expect(wrapper.find('.circle-loading__text').exists()).toBe(false) // text: ''
      expect(wrapper.find('.circle-loading__icon').exists()).toBe(false) // showIcon: true but size is 'md', so showEgg is false

      // Verify computed properties with defaults
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const vm = wrapper.vm as any
      expect(vm.showEgg).toBe(false) // showIcon: true but size: 'md'
      expect(vm.iconSize).toBe('sm') // size: 'md' -> 'sm'
    })

    it('uses default icon when not provided', () => {
      const wrapper = mount(CircleLoading, {
        props: {
          size: 'lg',
          showIcon: true,
        },
      })

      const iconComponent = wrapper.findComponent({ name: 'BaseIcon' })
      expect(iconComponent.props('name')).toBe('Egg') // Default icon
    })
  })

  describe('🎯 Complex Scenarios and Edge Cases', () => {
    it('handles all props together - lg size with text and custom icon', () => {
      const wrapper = mount(CircleLoading, {
        props: {
          size: 'lg',
          text: 'Processing your request...',
          icon: 'Target',
          showIcon: true,
        },
      })

      // Verify size class
      expect(wrapper.find('.circle-loading--lg').exists()).toBe(true)

      // Verify text display
      const textElement = wrapper.find('.circle-loading__text')
      expect(textElement.exists()).toBe(true)
      expect(textElement.text()).toBe('Processing your request...')

      // Verify icon display
      expect(wrapper.find('.circle-loading__icon').exists()).toBe(true)
      const iconComponent = wrapper.findComponent({ name: 'BaseIcon' })
      expect(iconComponent.props('name')).toBe('Target')
      expect(iconComponent.props('size')).toBe('lg')

      // Verify computed properties
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const vm = wrapper.vm as any
      expect(vm.showEgg).toBe(true)
      expect(vm.iconSize).toBe('lg')
    })

    it('handles sm size with text and showIcon false', () => {
      const wrapper = mount(CircleLoading, {
        props: {
          size: 'sm',
          text: 'Loading...',
          showIcon: false,
        },
      })

      expect(wrapper.find('.circle-loading--sm').exists()).toBe(true)
      expect(wrapper.find('.circle-loading__text').exists()).toBe(true)
      expect(wrapper.find('.circle-loading__icon').exists()).toBe(false)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const vm = wrapper.vm as any
      expect(vm.showEgg).toBe(false)
      expect(vm.iconSize).toBe('xs')
    })

    it('handles md size with all props', () => {
      const wrapper = mount(CircleLoading, {
        props: {
          size: 'md',
          text: 'Medium loading...',
          icon: 'Clock',
          showIcon: true,
        },
      })

      expect(wrapper.find('.circle-loading--md').exists()).toBe(true)
      expect(wrapper.find('.circle-loading__text').exists()).toBe(true)
      expect(wrapper.find('.circle-loading__icon').exists()).toBe(false) // showEgg is false for md size

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const vm = wrapper.vm as any
      expect(vm.showEgg).toBe(false) // showIcon: true but size: 'md'
      expect(vm.iconSize).toBe('sm')
    })
  })

  describe('🎯 Component Structure and Mounting', () => {
    it('mounts and unmounts without errors', () => {
      const wrapper = mount(CircleLoading)
      expect(wrapper.exists()).toBe(true)
      wrapper.unmount()
    })

    it('has correct component structure', () => {
      const wrapper = mount(CircleLoading, {
        props: {
          size: 'lg',
          text: 'Test',
          showIcon: true,
        },
      })

      // Root element
      const root = wrapper.find('.circle-loading')
      expect(root.exists()).toBe(true)

      // Spinner container
      const spinner = wrapper.find('.circle-loading__spinner')
      expect(spinner.exists()).toBe(true)

      // SVG element
      const svg = wrapper.find('.circle-loading__svg')
      expect(svg.exists()).toBe(true)

      // Icon container (only for lg size with showIcon true)
      const iconContainer = wrapper.find('.circle-loading__icon')
      expect(iconContainer.exists()).toBe(true)

      // Text element
      const text = wrapper.find('.circle-loading__text')
      expect(text.exists()).toBe(true)
    })

    it('verifies BaseIcon component integration', () => {
      const wrapper = mount(CircleLoading, {
        props: {
          size: 'lg',
          showIcon: true,
          icon: 'Loader',
        },
      })

      const baseIcon = wrapper.findComponent({ name: 'BaseIcon' })
      expect(baseIcon.exists()).toBe(true)
      expect(baseIcon.props('name')).toBe('Loader')
      expect(baseIcon.props('size')).toBe('lg')
    })
  })

  describe('🎯 Computed Properties Coverage', () => {
    it('covers all branches of showEgg computed property', () => {
      // Case 1: showIcon: true, size: 'lg' -> true
      const wrapper1 = mount(CircleLoading, {
        props: { showIcon: true, size: 'lg' },
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test requires flexible typing for validation testing
      expect((wrapper1.vm as any).showEgg).toBe(true)

      // Case 2: showIcon: false, size: 'lg' -> false
      const wrapper2 = mount(CircleLoading, {
        props: { showIcon: false, size: 'lg' },
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test requires flexible typing for validation testing
      expect((wrapper2.vm as any).showEgg).toBe(false)

      // Case 3: showIcon: true, size: 'md' -> false
      const wrapper3 = mount(CircleLoading, {
        props: { showIcon: true, size: 'md' },
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test requires flexible typing for validation testing
      expect((wrapper3.vm as any).showEgg).toBe(false)

      // Case 4: showIcon: true, size: 'sm' -> false
      const wrapper4 = mount(CircleLoading, {
        props: { showIcon: true, size: 'sm' },
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test requires flexible typing for validation testing
      expect((wrapper4.vm as any).showEgg).toBe(false)
    })

    it('covers all branches of iconSize computed property', () => {
      // Case 1: size: 'sm' -> 'xs'
      const wrapper1 = mount(CircleLoading, { props: { size: 'sm' } })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test requires flexible typing for validation testing
      expect((wrapper1.vm as any).iconSize).toBe('xs')

      // Case 2: size: 'lg' -> 'lg'
      const wrapper2 = mount(CircleLoading, { props: { size: 'lg' } })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test requires flexible typing for validation testing
      expect((wrapper2.vm as any).iconSize).toBe('lg')

      // Case 3: size: 'md' (default) -> 'sm'
      const wrapper3 = mount(CircleLoading, { props: { size: 'md' } })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test requires flexible typing for validation testing
      expect((wrapper3.vm as any).iconSize).toBe('sm')

      // Case 4: no size (uses default 'md') -> 'sm'
      const wrapper4 = mount(CircleLoading)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test requires flexible typing for validation testing
      expect((wrapper4.vm as any).iconSize).toBe('sm')
    })
  })
})
