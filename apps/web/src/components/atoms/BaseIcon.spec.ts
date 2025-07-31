import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseIcon from './BaseIcon.vue'

// Mock the icon imports
vi.mock('./icons/Eye.vue', () => ({
  default: {
    name: 'EyeIcon',
    template: '<svg data-testid="eye-icon"><path /></svg>',
    __isTeleport: false,
    __isKeepAlive: false,
    __isSuspense: false,
  },
}))

vi.mock('./icons/Code.vue', () => ({
  default: {
    name: 'CodeIcon',
    template: '<svg data-testid="code-icon"><path /></svg>',
    __isTeleport: false,
    __isKeepAlive: false,
    __isSuspense: false,
  },
}))

describe('BaseIcon', () => {
  it('should render with default props', () => {
    const wrapper = mount(BaseIcon, {
      props: {
        name: 'Eye',
      },
    })

    expect(wrapper.exists()).toBe(true)
    // Test the computed iconClasses property directly
    const iconClasses = wrapper.vm.iconClasses
    expect(iconClasses).toContain('inline-block')
    expect(iconClasses).toContain('flex-shrink-0')
  })

  it('should render with different sizes', () => {
    const sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const

    sizes.forEach((size) => {
      const wrapper = mount(BaseIcon, {
        props: {
          name: 'Eye',
          size,
        },
      })

      const iconClasses = wrapper.vm.iconClasses
      switch (size) {
        case 'xs':
          expect(iconClasses).toContain('w-3')
          expect(iconClasses).toContain('h-3')
          break
        case 'sm':
          expect(iconClasses).toContain('w-4')
          expect(iconClasses).toContain('h-4')
          break
        case 'md':
          expect(iconClasses).toContain('w-5')
          expect(iconClasses).toContain('h-5')
          break
        case 'lg':
          expect(iconClasses).toContain('w-6')
          expect(iconClasses).toContain('h-6')
          break
        case 'xl':
          expect(iconClasses).toContain('w-8')
          expect(iconClasses).toContain('h-8')
          break
      }
    })
  })

  it('should handle custom color', () => {
    const wrapper = mount(BaseIcon, {
      props: {
        name: 'Eye',
        color: 'blue-500',
      },
    })

    expect(wrapper.vm.iconClasses).toContain('text-blue-500')
  })

  it('should handle accessibility props when accessible is false', () => {
    const wrapper = mount(BaseIcon, {
      props: {
        name: 'Eye',
        accessible: false,
        ariaLabel: 'View item',
      },
    })

    // Test component props directly
    expect(wrapper.props('accessible')).toBe(false)
    expect(wrapper.props('ariaLabel')).toBe('View item')
  })

  it('should handle accessibility props when accessible is true', () => {
    const wrapper = mount(BaseIcon, {
      props: {
        name: 'Eye',
        accessible: true,
        ariaLabel: 'View item',
      },
    })

    expect(wrapper.props('accessible')).toBe(true)
    expect(wrapper.props('ariaLabel')).toBe('View item')
  })

  it('should load different icon names', () => {
    const wrapper = mount(BaseIcon, {
      props: {
        name: 'Code',
      },
    })

    expect(wrapper.exists()).toBe(true)
    expect(wrapper.vm.component).toBeTruthy()
  })

  it('should have correct default values', () => {
    const wrapper = mount(BaseIcon, {
      props: {
        name: 'Eye',
      },
    })

    const iconClasses = wrapper.vm.iconClasses
    // Default size should be 'md'
    expect(iconClasses).toContain('w-5')
    expect(iconClasses).toContain('h-5')

    // Default accessible should be false
    expect(wrapper.props('accessible')).toBe(false)
  })

  it('should compute icon classes correctly', () => {
    const wrapper = mount(BaseIcon, {
      props: {
        name: 'Eye',
        size: 'lg',
        color: 'red-600',
      },
    })

    const classes = wrapper.vm.iconClasses
    expect(classes).toContain('inline-block')
    expect(classes).toContain('flex-shrink-0')
    expect(classes).toContain('w-6')
    expect(classes).toContain('h-6')
    expect(classes).toContain('text-red-600')
  })

  it('should not add color class when color is undefined', () => {
    const wrapper = mount(BaseIcon, {
      props: {
        name: 'Eye',
      },
    })

    const classes = wrapper.vm.iconClasses
    // Should not contain any text-* class when no color is specified
    const hasTextColorClass = classes.some((cls) => cls.startsWith('text-'))
    expect(hasTextColorClass).toBe(false)
  })

  it('should create dynamic component correctly', () => {
    const wrapper = mount(BaseIcon, {
      props: {
        name: 'Eye',
      },
    })

    // The component should be created and exist
    expect(wrapper.vm.component).toBeTruthy()
  })

  it('should handle missing ariaLabel when accessible is true', () => {
    const wrapper = mount(BaseIcon, {
      props: {
        name: 'Eye',
        accessible: true,
      },
    })

    expect(wrapper.props('accessible')).toBe(true)
    expect(wrapper.props('ariaLabel')).toBeUndefined()
  })
})
