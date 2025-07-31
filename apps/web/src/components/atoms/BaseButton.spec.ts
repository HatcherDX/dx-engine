import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseButton from './BaseButton.vue'

describe('BaseButton', () => {
  it('should render with default props', () => {
    const wrapper = mount(BaseButton)

    expect(wrapper.exists()).toBe(true)
    expect(wrapper.element.tagName).toBe('BUTTON')
    expect(wrapper.classes()).toContain('inline-flex')
    expect(wrapper.classes()).toContain('items-center')
    expect(wrapper.classes()).toContain('justify-center')
  })

  it('should render with custom variant', () => {
    const wrapper = mount(BaseButton, {
      props: {
        variant: 'secondary',
      },
    })

    expect(wrapper.classes()).toContain('bg-neutral-100')
    expect(wrapper.classes()).toContain('text-neutral-900')
  })

  it('should render with custom size', () => {
    const wrapper = mount(BaseButton, {
      props: {
        size: 'lg',
      },
    })

    expect(wrapper.classes()).toContain('px-6')
    expect(wrapper.classes()).toContain('py-3')
    expect(wrapper.classes()).toContain('text-base')
    expect(wrapper.classes()).toContain('rounded-lg')
  })

  it('should render with all variant types', () => {
    const variants = [
      'primary',
      'secondary',
      'ghost',
      'danger',
      'outline',
    ] as const

    variants.forEach((variant) => {
      const wrapper = mount(BaseButton, {
        props: { variant },
      })

      expect(wrapper.exists()).toBe(true)

      // Check variant-specific classes
      switch (variant) {
        case 'primary':
          expect(wrapper.classes()).toContain('bg-primary-600')
          break
        case 'secondary':
          expect(wrapper.classes()).toContain('bg-neutral-100')
          break
        case 'ghost':
          expect(wrapper.classes()).toContain('bg-transparent')
          break
        case 'danger':
          expect(wrapper.classes()).toContain('bg-error-600')
          break
        case 'outline':
          expect(wrapper.classes()).toContain('border')
          expect(wrapper.classes()).toContain('border-neutral-300')
          break
      }
    })
  })

  it('should render with all size types', () => {
    const sizes = ['sm', 'md', 'lg'] as const

    sizes.forEach((size) => {
      const wrapper = mount(BaseButton, {
        props: { size },
      })

      expect(wrapper.exists()).toBe(true)

      // Check size-specific classes
      switch (size) {
        case 'sm':
          expect(wrapper.classes()).toContain('px-3')
          expect(wrapper.classes()).toContain('py-1.5')
          expect(wrapper.classes()).toContain('text-sm')
          break
        case 'md':
          expect(wrapper.classes()).toContain('px-4')
          expect(wrapper.classes()).toContain('py-2')
          expect(wrapper.classes()).toContain('text-sm')
          break
        case 'lg':
          expect(wrapper.classes()).toContain('px-6')
          expect(wrapper.classes()).toContain('py-3')
          expect(wrapper.classes()).toContain('text-base')
          break
      }
    })
  })

  it('should handle disabled state', () => {
    const wrapper = mount(BaseButton, {
      props: {
        disabled: true,
      },
    })

    expect(wrapper.attributes('disabled')).toBeDefined()
    expect(wrapper.classes()).toContain('disabled:opacity-50')
    expect(wrapper.classes()).toContain('disabled:cursor-not-allowed')
  })

  it('should handle fullWidth prop', () => {
    const wrapper = mount(BaseButton, {
      props: {
        fullWidth: true,
      },
    })

    expect(wrapper.classes()).toContain('w-full')
  })

  it('should emit click event when clicked', async () => {
    const wrapper = mount(BaseButton)

    await wrapper.trigger('click')

    expect(wrapper.emitted('click')).toHaveLength(1)
    expect(wrapper.emitted('click')![0][0]).toBeInstanceOf(MouseEvent)
  })

  it('should not emit click event when disabled', async () => {
    const wrapper = mount(BaseButton, {
      props: {
        disabled: true,
      },
    })

    await wrapper.trigger('click')

    expect(wrapper.emitted('click')).toBeFalsy()
  })

  it('should render slot content', () => {
    const wrapper = mount(BaseButton, {
      slots: {
        default: 'Click me!',
      },
    })

    expect(wrapper.text()).toBe('Click me!')
  })

  it('should handle click with event object', async () => {
    const wrapper = mount(BaseButton)

    await wrapper.trigger('click')

    expect(wrapper.emitted('click')).toHaveLength(1)
    expect(wrapper.emitted('click')![0][0]).toBeInstanceOf(MouseEvent)
  })

  it('should not handle click when disabled via method', async () => {
    const wrapper = mount(BaseButton, {
      props: {
        disabled: true,
      },
    })

    await wrapper.trigger('click')

    expect(wrapper.emitted('click')).toBeFalsy()
  })

  it('should have focus states in classes', () => {
    const wrapper = mount(BaseButton)

    expect(wrapper.classes()).toContain('focus:outline-none')
    expect(wrapper.classes()).toContain('focus:ring-2')
    expect(wrapper.classes()).toContain('focus:ring-offset-2')
  })

  it('should have transition classes', () => {
    const wrapper = mount(BaseButton)

    expect(wrapper.classes()).toContain('transition-all')
    expect(wrapper.classes()).toContain('duration-200')
  })

  it('should handle complex slot content', () => {
    const wrapper = mount(BaseButton, {
      slots: {
        default: '<span class="test-icon">Icon</span> Button Text',
      },
    })

    expect(wrapper.html()).toContain('<span class="test-icon">Icon</span>')
    expect(wrapper.text()).toContain('Button Text')
  })
})
