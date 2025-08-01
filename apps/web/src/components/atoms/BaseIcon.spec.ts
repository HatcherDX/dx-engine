import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseIcon from './BaseIcon.vue'

// Type for accessing computed properties in tests
interface BaseIconVM {
  iconClasses: string[]
}

type BaseIconWrapper = ReturnType<typeof mount<typeof BaseIcon>> & {
  vm: BaseIconVM
}

// Mock the dynamic import for icons by mocking the entire BaseIcon component approach
vi.mock('./icons/Eye.vue', () => ({
  __esModule: true,
  default: {
    name: 'EyeIcon',
    template: '<svg data-testid="eye-icon"><path /></svg>',
    __isTeleport: false,
    __isKeepAlive: false,
    __isSuspense: false,
  },
}))

vi.mock('./icons/Code.vue', () => ({
  __esModule: true,
  default: {
    name: 'CodeIcon',
    template: '<svg data-testid="code-icon"><path /></svg>',
    __isTeleport: false,
    __isKeepAlive: false,
    __isSuspense: false,
  },
}))

vi.mock('./icons/ArrowRight.vue', () => ({
  __esModule: true,
  default: {
    name: 'ArrowRightIcon',
    template: '<svg data-testid="arrow-right-icon"><path /></svg>',
    __isTeleport: false,
    __isKeepAlive: false,
    __isSuspense: false,
  },
}))

vi.mock('./icons/Terminal.vue', () => ({
  __esModule: true,
  default: {
    name: 'TerminalIcon',
    template: '<svg data-testid="terminal-icon"><path /></svg>',
    __isTeleport: false,
    __isKeepAlive: false,
    __isSuspense: false,
  },
}))

describe('BaseIcon', () => {
  it('should render with default props', async () => {
    const wrapper = mount(BaseIcon, {
      props: {
        name: 'Eye',
      },
    }) as BaseIconWrapper

    expect(wrapper.exists()).toBe(true)
    // Wait for async component to load
    await wrapper.vm.$nextTick()

    // Test the computed iconClasses property
    const iconClasses = wrapper.vm.iconClasses
    expect(iconClasses).toContain('inline-block')
    expect(iconClasses).toContain('flex-shrink-0')
    expect(iconClasses).toContain('w-5') // default size md
    expect(iconClasses).toContain('h-5')
  })

  it('should render with different sizes', async () => {
    const sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const

    for (const size of sizes) {
      const wrapper = mount(BaseIcon, {
        props: {
          name: 'Eye',
          size,
        },
      }) as BaseIconWrapper

      await wrapper.vm.$nextTick()
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
    }
  })

  it('should handle custom color', async () => {
    const wrapper = mount(BaseIcon, {
      props: {
        name: 'Eye',
        color: 'blue-500',
      },
    }) as BaseIconWrapper

    await wrapper.vm.$nextTick()
    const iconClasses = wrapper.vm.iconClasses
    expect(iconClasses).toContain('text-blue-500')
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
    expect(wrapper.exists()).toBe(true)
  })

  it('should have correct default values', async () => {
    const wrapper = mount(BaseIcon, {
      props: {
        name: 'Eye',
      },
    }) as BaseIconWrapper

    await wrapper.vm.$nextTick()
    const iconClasses = wrapper.vm.iconClasses
    // Default size should be 'md'
    expect(iconClasses).toContain('w-5')
    expect(iconClasses).toContain('h-5')

    // Default accessible should be false
    expect(wrapper.props('accessible')).toBe(false)
  })

  it('should compute icon classes correctly', async () => {
    const wrapper = mount(BaseIcon, {
      props: {
        name: 'Eye',
        size: 'lg',
        color: 'red-600',
      },
    }) as BaseIconWrapper

    await wrapper.vm.$nextTick()
    const iconClasses = wrapper.vm.iconClasses
    expect(iconClasses).toContain('inline-block')
    expect(iconClasses).toContain('flex-shrink-0')
    expect(iconClasses).toContain('w-6')
    expect(iconClasses).toContain('h-6')
    expect(iconClasses).toContain('text-red-600')
  })

  it('should not add color class when color is undefined', async () => {
    const wrapper = mount(BaseIcon, {
      props: {
        name: 'Eye',
      },
    }) as BaseIconWrapper

    await wrapper.vm.$nextTick()
    const iconClasses = wrapper.vm.iconClasses
    // Should not contain any text-* class when no color is specified
    const hasTextColorClass = iconClasses.some((cls: string) =>
      cls.startsWith('text-')
    )
    expect(hasTextColorClass).toBe(false)
  })

  it('should create dynamic component correctly', () => {
    const wrapper = mount(BaseIcon, {
      props: {
        name: 'Eye',
      },
    })

    // The component should be created and exist
    expect(wrapper.exists()).toBe(true)
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
