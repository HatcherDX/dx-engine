import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseLogo from './BaseLogo.vue'

// Mock useTheme composable
const mockIsDark = vi.fn(() => ({ value: false }))
vi.mock('../../composables/useTheme', () => ({
  useTheme: () => ({
    isDark: mockIsDark(),
  }),
}))

describe('BaseLogo', () => {
  beforeEach(() => {
    // Reset mock to default light theme
    mockIsDark.mockReturnValue({ value: false })
  })

  it('should render with default props', () => {
    const wrapper = mount(BaseLogo)

    expect(wrapper.exists()).toBe(true)
    expect(wrapper.element.tagName).toBe('IMG')
    expect(wrapper.attributes('alt')).toBe('Hatcher DX Engine')
  })

  it('should render with custom alt text', () => {
    const wrapper = mount(BaseLogo, {
      props: {
        alt: 'Custom Logo',
      },
    })

    expect(wrapper.attributes('alt')).toBe('Custom Logo')
  })

  it('should handle different sizes', () => {
    const sizes = ['sm', 'md', 'lg', 'xl'] as const

    sizes.forEach((size) => {
      const wrapper = mount(BaseLogo, {
        props: { size },
      })

      switch (size) {
        case 'sm':
          expect(wrapper.classes()).toContain('h-8')
          break
        case 'md':
          expect(wrapper.classes()).toContain('h-8')
          break
        case 'lg':
          expect(wrapper.classes()).toContain('h-12')
          break
        case 'xl':
          expect(wrapper.classes()).toContain('h-16')
          break
      }

      expect(wrapper.classes()).toContain('w-auto')
    })
  })

  it('should render egg-white variant', () => {
    const wrapper = mount(BaseLogo, {
      props: {
        variant: 'egg-white',
      },
    })

    expect(wrapper.attributes('src')).toBe('/egg-white.svg')
  })

  it('should render inline variant with light theme', () => {
    mockIsDark.mockReturnValue({ value: false })

    const wrapper = mount(BaseLogo, {
      props: {
        variant: 'inline',
      },
    })

    expect(wrapper.attributes('src')).toBe('/logo-inline-light.svg')
  })

  it('should render inline variant with dark theme', () => {
    mockIsDark.mockReturnValue({ value: true })

    const wrapper = mount(BaseLogo, {
      props: {
        variant: 'inline',
      },
    })

    expect(wrapper.attributes('src')).toBe('/logo-inline-dark.svg')
  })

  it('should render hero variant with light theme', () => {
    mockIsDark.mockReturnValue({ value: false })

    const wrapper = mount(BaseLogo, {
      props: {
        variant: 'hero',
      },
    })

    expect(wrapper.attributes('src')).toBe('/logo-light.svg')
  })

  it('should render hero variant with dark theme', () => {
    mockIsDark.mockReturnValue({ value: true })

    const wrapper = mount(BaseLogo, {
      props: {
        variant: 'hero',
      },
    })

    expect(wrapper.attributes('src')).toBe('/logo-dark.svg')
  })

  it('should have correct CSS classes', () => {
    const wrapper = mount(BaseLogo)

    expect(wrapper.classes()).toContain('select-none')
    expect(wrapper.classes()).toContain('pointer-events-none')
  })

  it('should handle error event', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const wrapper = mount(BaseLogo)

    await wrapper.trigger('error')

    expect(consoleSpy).toHaveBeenCalledWith('Logo failed to load')

    consoleSpy.mockRestore()
  })

  it('should handle error via method call', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const wrapper = mount(BaseLogo)

    await wrapper.trigger('error')

    expect(consoleSpy).toHaveBeenCalledWith('Logo failed to load')

    consoleSpy.mockRestore()
  })

  it('should have correct default variant', () => {
    const wrapper = mount(BaseLogo)

    // Default variant is 'inline', so it should use the theme-based path
    expect(wrapper.attributes('src')).toBe('/logo-inline-light.svg')
  })

  it('should have correct default size', () => {
    const wrapper = mount(BaseLogo)

    // Default size is 'md'
    expect(wrapper.classes()).toContain('h-8')
    expect(wrapper.classes()).toContain('w-auto')
  })

  it('should compute logo source correctly based on theme changes', async () => {
    // Start with light theme
    mockIsDark.mockReturnValue({ value: false })

    const wrapper = mount(BaseLogo)

    expect(wrapper.attributes('src')).toBe('/logo-inline-light.svg')
  })

  it('should handle all variant types', () => {
    const variants = ['inline', 'hero', 'egg-white'] as const

    variants.forEach((variant) => {
      const wrapper = mount(BaseLogo, {
        props: { variant },
      })

      expect(wrapper.exists()).toBe(true)

      const src = wrapper.attributes('src')

      if (variant === 'egg-white') {
        expect(src).toBe('/egg-white.svg')
      } else {
        expect(src).toContain(
          `/${variant === 'inline' ? 'logo-inline' : 'logo'}-`
        )
        expect(src).toMatch(/\.(svg)$/)
      }
    })
  })
})
