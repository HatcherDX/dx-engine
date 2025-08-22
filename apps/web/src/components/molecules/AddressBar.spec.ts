import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import AddressBar from './AddressBar.vue'

// Mock child components
vi.mock('../atoms/BaseIcon.vue', () => ({
  default: {
    name: 'BaseIcon',
    props: ['name', 'size', 'color'],
    template: '<span class="base-icon" :data-name="name"></span>',
  },
}))

vi.mock('../atoms/BaseButton.vue', () => ({
  default: {
    name: 'BaseButton',
    props: ['disabled'],
    template:
      '<button data-testid="base-button" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
  },
}))

vi.mock('./AdaptiveBreadcrumb.vue', () => ({
  default: {
    name: 'AdaptiveBreadcrumb',
    props: ['breadcrumbContext'],
    template: '<div data-testid="adaptive-breadcrumb"></div>',
  },
}))

describe('AddressBar.vue', () => {
  let wrapper: VueWrapper<InstanceType<typeof AddressBar>>

  const defaultProps = {
    value: '',
    currentMode: 'generative' as const,
    disabled: false,
    breadcrumbContext: undefined,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Component Initialization', () => {
    it('should mount and render without errors', () => {
      wrapper = mount(AddressBar, { props: defaultProps })
      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('.address-bar').exists()).toBe(true)
    })

    it('should render all required elements', () => {
      wrapper = mount(AddressBar, { props: defaultProps })

      expect(wrapper.find('input').exists()).toBe(true)
      expect(wrapper.find('.address-breadcrumb').exists()).toBe(true)
      expect(wrapper.find('.address-actions').exists()).toBe(true)
      expect(wrapper.find('[data-testid="adaptive-breadcrumb"]').exists()).toBe(
        true
      )
    })

    it('should render execute button', () => {
      wrapper = mount(AddressBar, { props: defaultProps })
      const buttons = wrapper.findAll('[data-testid="base-button"]')
      expect(buttons.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Mode Configuration', () => {
    it('should display correct placeholder for generative mode', () => {
      wrapper = mount(AddressBar, {
        props: { ...defaultProps, currentMode: 'generative' },
      })
      const input = wrapper.find('input')
      expect(input.attributes('placeholder')).toBe('Ask AI or enter command...')
    })

    it('should display correct placeholder for visual mode', () => {
      wrapper = mount(AddressBar, {
        props: { ...defaultProps, currentMode: 'visual' },
      })
      const input = wrapper.find('input')
      expect(input.attributes('placeholder')).toBe(
        'Describe what you want to do...'
      )
    })

    it('should display correct placeholder for code mode', () => {
      wrapper = mount(AddressBar, {
        props: { ...defaultProps, currentMode: 'code' },
      })
      const input = wrapper.find('input')
      expect(input.attributes('placeholder')).toBe(
        'Search files, functions, or write code...'
      )
    })

    it('should display correct placeholder for timeline mode', () => {
      wrapper = mount(AddressBar, {
        props: { ...defaultProps, currentMode: 'timeline' },
      })
      const input = wrapper.find('input')
      expect(input.attributes('placeholder')).toBe(
        'Search timeline events or project history...'
      )
    })

    it('should handle unknown mode with default config', () => {
      wrapper = mount(AddressBar, {
        props: {
          ...defaultProps,
          currentMode: 'unknown' as
            | 'generative'
            | 'visual'
            | 'code'
            | 'timeline',
        },
      })
      const input = wrapper.find('input')
      expect(input.attributes('placeholder')).toBe('Enter command...')
    })
  })

  describe('Input Handling', () => {
    it('should emit update:value event when input changes', async () => {
      wrapper = mount(AddressBar, { props: defaultProps })
      const input = wrapper.find('input')

      await input.setValue('test value')
      expect(wrapper.emitted('update:value')).toBeTruthy()
      expect(wrapper.emitted('update:value')?.[0]?.[0]).toBe('test value')
    })

    it('should display current value', () => {
      wrapper = mount(AddressBar, {
        props: { ...defaultProps, value: 'current value' },
      })
      const input = wrapper.find('input')
      expect(input.element.value).toBe('current value')
    })

    it('should handle focus event', async () => {
      wrapper = mount(AddressBar, { props: defaultProps })
      const input = wrapper.find('input')

      await input.trigger('focus')
      await nextTick()

      expect(wrapper.find('.address-focused').exists()).toBe(true)
    })

    it('should handle blur event', async () => {
      wrapper = mount(AddressBar, { props: defaultProps })
      const input = wrapper.find('input')

      await input.trigger('focus')
      await nextTick()
      expect(wrapper.find('.address-focused').exists()).toBe(true)

      await input.trigger('blur')
      await nextTick()
      expect(wrapper.emitted('change')).toBeTruthy()
      expect(wrapper.find('.address-focused').exists()).toBe(false)
    })
  })

  describe('Keyboard Events', () => {
    it('should emit enter event on Enter key press', async () => {
      wrapper = mount(AddressBar, {
        props: { ...defaultProps, value: 'test command' },
      })
      const input = wrapper.find('input')

      await input.trigger('keydown', { key: 'Enter' })
      expect(wrapper.emitted('enter')).toBeTruthy()
      expect(wrapper.emitted('enter')?.[0]?.[0]).toBe('test command')
    })

    it('should execute command on Enter when input has value', async () => {
      wrapper = mount(AddressBar, {
        props: { ...defaultProps, value: 'test command' },
      })
      const input = wrapper.find('input')

      await input.trigger('keydown', { key: 'Enter' })
      expect(wrapper.emitted('execute')).toBeTruthy()
      expect(wrapper.emitted('execute')?.[0]?.[0]).toBe('test command')
      expect(wrapper.emitted('execute')?.[0]?.[1]).toBe('generative')
    })

    it('should not execute command on Enter when input is empty', async () => {
      wrapper = mount(AddressBar, { props: defaultProps })
      const input = wrapper.find('input')

      await input.trigger('keydown', { key: 'Enter' })
      expect(wrapper.emitted('execute')).toBeFalsy()
    })

    it('should blur input on Escape key', async () => {
      wrapper = mount(AddressBar, { props: defaultProps })
      const input = wrapper.find('input')

      input.element.blur = vi.fn()
      await input.trigger('keydown', { key: 'Escape' })
      expect(input.element.blur).toHaveBeenCalled()
    })
  })

  describe('Clear Button', () => {
    it('should show clear button when input has value and is focused', async () => {
      wrapper = mount(AddressBar, { props: { ...defaultProps, value: 'test' } })
      const input = wrapper.find('input')

      await input.trigger('focus')
      await nextTick()

      const buttons = wrapper.findAll('[data-testid="base-button"]')
      expect(buttons.length).toBe(2) // Clear + Execute buttons
    })

    it('should not show clear button when input is empty', async () => {
      wrapper = mount(AddressBar, { props: defaultProps })
      const input = wrapper.find('input')

      await input.trigger('focus')
      await nextTick()

      const buttons = wrapper.findAll('[data-testid="base-button"]')
      expect(buttons.length).toBe(1) // Only Execute button
    })

    it('should clear input when clear button is clicked', async () => {
      wrapper = mount(AddressBar, { props: { ...defaultProps, value: 'test' } })
      const input = wrapper.find('input')

      await input.trigger('focus')
      await nextTick()

      const buttons = wrapper.findAll('[data-testid="base-button"]')
      const clearButton = buttons[0] // First button should be clear button

      input.element.focus = vi.fn()
      await clearButton.trigger('click')
      await nextTick()

      expect(wrapper.emitted('update:value')).toBeTruthy()
      const updateEvents = wrapper.emitted('update:value') as string[][]
      expect(updateEvents[updateEvents.length - 1][0]).toBe('')
      expect(input.element.focus).toHaveBeenCalled()
    })
  })

  describe('Execute Button', () => {
    it('should enable execute button when input has value', () => {
      wrapper = mount(AddressBar, {
        props: { ...defaultProps, value: 'test command' },
      })
      const buttons = wrapper.findAll('[data-testid="base-button"]')
      const executeButton = buttons[buttons.length - 1] // Last button should be execute button

      expect(executeButton.attributes('disabled')).toBeUndefined()
    })

    it('should disable execute button when input is empty', () => {
      wrapper = mount(AddressBar, { props: defaultProps })
      const buttons = wrapper.findAll('[data-testid="base-button"]')
      const executeButton = buttons[buttons.length - 1]

      expect(executeButton.attributes('disabled')).toBeDefined()
    })

    it('should disable execute button when component is disabled', () => {
      wrapper = mount(AddressBar, {
        props: { ...defaultProps, value: 'test', disabled: true },
      })
      const buttons = wrapper.findAll('[data-testid="base-button"]')
      const executeButton = buttons[buttons.length - 1]

      expect(executeButton.attributes('disabled')).toBeDefined()
    })

    it('should execute command when execute button is clicked', async () => {
      wrapper = mount(AddressBar, {
        props: { ...defaultProps, value: ' test command ' },
      })
      const buttons = wrapper.findAll('[data-testid="base-button"]')
      const executeButton = buttons[buttons.length - 1]

      await executeButton.trigger('click')
      expect(wrapper.emitted('execute')).toBeTruthy()
      expect(wrapper.emitted('execute')?.[0]?.[0]).toBe('test command') // Trimmed
      expect(wrapper.emitted('execute')?.[0]?.[1]).toBe('generative')
    })
  })

  describe('Disabled State', () => {
    it('should apply disabled class when disabled', () => {
      wrapper = mount(AddressBar, {
        props: { ...defaultProps, disabled: true },
      })
      expect(wrapper.find('.address-disabled').exists()).toBe(true)
    })

    it('should not execute command when disabled', async () => {
      wrapper = mount(AddressBar, {
        props: { ...defaultProps, value: 'test', disabled: true },
      })
      const input = wrapper.find('input')

      await input.trigger('keydown', { key: 'Enter' })
      expect(wrapper.emitted('execute')).toBeFalsy()
    })
  })

  describe('Public Methods', () => {
    it('should focus input when focus method is called', () => {
      wrapper = mount(AddressBar, { props: defaultProps })
      const input = wrapper.find('input')

      input.element.focus = vi.fn()
      wrapper.vm.focus()
      expect(input.element.focus).toHaveBeenCalled()
    })

    it('should blur input when blur method is called', () => {
      wrapper = mount(AddressBar, { props: defaultProps })
      const input = wrapper.find('input')

      input.element.blur = vi.fn()
      wrapper.vm.blur()
      expect(input.element.blur).toHaveBeenCalled()
    })

    it('should clear input when clear method is called', async () => {
      wrapper = mount(AddressBar, { props: { ...defaultProps, value: 'test' } })
      const input = wrapper.find('input')

      input.element.focus = vi.fn()
      wrapper.vm.clear()
      await nextTick()

      expect(wrapper.emitted('update:value')).toBeTruthy()
      const updateEvents = wrapper.emitted('update:value') as string[][]
      expect(updateEvents[updateEvents.length - 1][0]).toBe('')
      expect(input.element.focus).toHaveBeenCalled()
    })
  })

  describe('CSS Classes', () => {
    it('should apply correct input classes', () => {
      wrapper = mount(AddressBar, { props: defaultProps })
      const input = wrapper.find('input')
      expect(input.classes()).toContain('address-input')
    })

    it('should apply address-bar class', () => {
      wrapper = mount(AddressBar, { props: defaultProps })
      expect(wrapper.find('.address-bar').exists()).toBe(true)
    })
  })

  describe('Breadcrumb Context', () => {
    it('should pass breadcrumb context to AdaptiveBreadcrumb', () => {
      const breadcrumbContext = { currentPath: '/test/path' }
      wrapper = mount(AddressBar, {
        props: { ...defaultProps, breadcrumbContext },
      })

      expect(wrapper.find('[data-testid="adaptive-breadcrumb"]').exists()).toBe(
        true
      )
    })

    it('should handle empty breadcrumb context', () => {
      wrapper = mount(AddressBar, { props: defaultProps })
      expect(wrapper.find('[data-testid="adaptive-breadcrumb"]').exists()).toBe(
        true
      )
    })
  })
})
