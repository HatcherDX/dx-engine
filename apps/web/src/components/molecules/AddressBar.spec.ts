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
      // Use visual mode to test breadcrumb rendering (generative mode hides breadcrumb)
      wrapper = mount(AddressBar, {
        props: { ...defaultProps, currentMode: 'visual' },
      })

      expect(wrapper.find('input').exists()).toBe(true)
      expect(wrapper.find('.address-breadcrumb').exists()).toBe(true)
      expect(wrapper.find('.address-actions').exists()).toBe(true)
      expect(wrapper.find('[data-testid="adaptive-breadcrumb"]').exists()).toBe(
        true
      )
    })

    it('should hide breadcrumb in generative mode', () => {
      wrapper = mount(AddressBar, { props: defaultProps })

      expect(wrapper.find('input').exists()).toBe(true)
      expect(wrapper.find('.address-breadcrumb').exists()).toBe(false)
      expect(wrapper.find('.address-actions').exists()).toBe(true)
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
      expect(input.attributes('placeholder')).toBe('Enter command...')
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
    it('should pass breadcrumb context to AdaptiveBreadcrumb in non-generative modes', () => {
      const breadcrumbContext = { currentPath: '/test/path' }
      wrapper = mount(AddressBar, {
        props: { ...defaultProps, currentMode: 'visual', breadcrumbContext },
      })

      expect(wrapper.find('[data-testid="adaptive-breadcrumb"]').exists()).toBe(
        true
      )
    })

    it('should handle empty breadcrumb context in non-generative modes', () => {
      wrapper = mount(AddressBar, {
        props: { ...defaultProps, currentMode: 'code' },
      })
      expect(wrapper.find('[data-testid="adaptive-breadcrumb"]').exists()).toBe(
        true
      )
    })

    it('should not render breadcrumb in generative mode', () => {
      wrapper = mount(AddressBar, { props: defaultProps })
      expect(wrapper.find('[data-testid="adaptive-breadcrumb"]').exists()).toBe(
        false
      )
    })
  })

  describe('Command Mode', () => {
    it('should detect command mode when input starts with /', async () => {
      wrapper = mount(AddressBar, {
        props: { ...defaultProps, value: '/help' },
      })
      const vm = wrapper.vm as {
        isCommandMode: boolean
      }
      expect(vm.isCommandMode).toBe(true)
    })

    it('should not detect command mode in non-generative modes', async () => {
      wrapper = mount(AddressBar, {
        props: { ...defaultProps, currentMode: 'visual', value: '/help' },
      })
      const vm = wrapper.vm as {
        isCommandMode: boolean
      }
      expect(vm.isCommandMode).toBe(false)
    })

    it('should not detect command mode when input does not start with /', async () => {
      wrapper = mount(AddressBar, {
        props: { ...defaultProps, value: 'normal input' },
      })
      const vm = wrapper.vm as {
        isCommandMode: boolean
      }
      expect(vm.isCommandMode).toBe(false)
    })
  })

  describe('Command Suggestions - onMounted with electronAPI', () => {
    beforeEach(() => {
      // Mock window.electronAPI
      Object.defineProperty(window, 'electronAPI', {
        writable: true,
        configurable: true,
        value: {
          commands: {
            list: vi.fn().mockResolvedValue([
              {
                name: 'help',
                description: 'Show help',
                category: 'general',
              },
              {
                name: 'search',
                description: 'Search files',
                category: 'navigation',
              },
            ]),
            execute: vi.fn(),
          },
        },
      })
    })

    afterEach(() => {
      delete (window as { electronAPI?: unknown }).electronAPI
    })

    it('should load commands from electronAPI on mount', async () => {
      wrapper = mount(AddressBar, { props: defaultProps })
      await nextTick()
      await nextTick()

      const vm = wrapper.vm as {
        availableCommands: { name: string; description: string }[]
      }

      expect(window.electronAPI?.commands.list).toHaveBeenCalled()
      expect(vm.availableCommands.length).toBe(2)
      expect(vm.availableCommands[0].name).toBe('help')
    })

    it('should handle electronAPI commands.list error', async () => {
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})
      Object.defineProperty(window, 'electronAPI', {
        writable: true,
        configurable: true,
        value: {
          commands: {
            list: vi.fn().mockRejectedValue(new Error('Failed to load')),
          },
        },
      })

      wrapper = mount(AddressBar, { props: defaultProps })
      await nextTick()
      await nextTick()

      expect(consoleError).toHaveBeenCalledWith(
        '[AddressBar] Failed to load commands:',
        expect.any(Error)
      )
      consoleError.mockRestore()
    })

    it('should not load commands when electronAPI is not available', async () => {
      delete (window as { electronAPI?: unknown }).electronAPI

      wrapper = mount(AddressBar, { props: defaultProps })
      await nextTick()

      const vm = wrapper.vm as {
        availableCommands: { name: string }[]
      }
      expect(vm.availableCommands.length).toBe(0)
    })
  })

  describe('Command Filtering', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'electronAPI', {
        writable: true,
        configurable: true,
        value: {
          commands: {
            list: vi.fn().mockResolvedValue([
              { name: 'help', description: 'Show help', category: 'general' },
              {
                name: 'search',
                description: 'Search files',
                category: 'navigation',
              },
              { name: 'test', description: 'Run tests', category: 'testing' },
            ]),
          },
        },
      })
    })

    afterEach(() => {
      delete (window as { electronAPI?: unknown }).electronAPI
    })

    it('should show all commands when input is just /', async () => {
      wrapper = mount(AddressBar, { props: { ...defaultProps, value: '/' } })
      await nextTick()
      await nextTick()

      const input = wrapper.find('input')
      await input.trigger('focus')
      await nextTick()

      const vm = wrapper.vm as {
        filteredCommands: { name: string }[]
      }
      expect(vm.filteredCommands.length).toBe(3)
    })

    it('should filter commands by name', async () => {
      wrapper = mount(AddressBar, { props: { ...defaultProps, value: '/hel' } })
      await nextTick()
      await nextTick()

      const input = wrapper.find('input')
      await input.trigger('focus')
      await nextTick()

      const vm = wrapper.vm as {
        filteredCommands: { name: string }[]
      }
      expect(vm.filteredCommands.length).toBe(1)
      expect(vm.filteredCommands[0].name).toBe('help')
    })

    it('should filter commands by description', async () => {
      wrapper = mount(AddressBar, {
        props: { ...defaultProps, value: '/files' },
      })
      await nextTick()
      await nextTick()

      const input = wrapper.find('input')
      await input.trigger('focus')
      await nextTick()

      const vm = wrapper.vm as {
        filteredCommands: { name: string }[]
      }
      expect(vm.filteredCommands.length).toBe(1)
      expect(vm.filteredCommands[0].name).toBe('search')
    })

    it('should return empty array when not in command mode', async () => {
      wrapper = mount(AddressBar, {
        props: { ...defaultProps, value: 'normal input' },
      })
      await nextTick()
      await nextTick()

      const vm = wrapper.vm as {
        filteredCommands: { name: string }[]
      }
      expect(vm.filteredCommands.length).toBe(0)
    })
  })

  describe('Command Suggestions Display', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'electronAPI', {
        writable: true,
        configurable: true,
        value: {
          commands: {
            list: vi
              .fn()
              .mockResolvedValue([
                { name: 'help', description: 'Show help', category: 'general' },
              ]),
          },
        },
      })
    })

    afterEach(() => {
      delete (window as { electronAPI?: unknown }).electronAPI
    })

    it('should show command suggestions when in command mode and focused', async () => {
      wrapper = mount(AddressBar, { props: { ...defaultProps, value: '/' } })
      await nextTick()
      await nextTick()

      const input = wrapper.find('input')
      await input.trigger('focus')
      await nextTick()

      expect(wrapper.find('.command-suggestions').exists()).toBe(true)
    })

    it('should not show command suggestions when not focused', async () => {
      wrapper = mount(AddressBar, { props: { ...defaultProps, value: '/' } })
      await nextTick()
      await nextTick()

      expect(wrapper.find('.command-suggestions').exists()).toBe(false)
    })

    it('should render command suggestions with names and descriptions', async () => {
      wrapper = mount(AddressBar, { props: { ...defaultProps, value: '/' } })
      await nextTick()
      await nextTick()

      const input = wrapper.find('input')
      await input.trigger('focus')
      await nextTick()

      const commandName = wrapper.find('.command-name')
      const commandDescription = wrapper.find('.command-description')

      expect(commandName.text()).toContain('/help')
      expect(commandDescription.text()).toBe('Show help')
    })
  })

  describe('Command Navigation with Keyboard', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'electronAPI', {
        writable: true,
        configurable: true,
        value: {
          commands: {
            list: vi.fn().mockResolvedValue([
              { name: 'help', description: 'Show help', category: 'general' },
              { name: 'search', description: 'Search files', category: 'nav' },
              { name: 'test', description: 'Run tests', category: 'testing' },
            ]),
            execute: vi.fn().mockResolvedValue({ success: true }),
          },
        },
      })
    })

    afterEach(() => {
      delete (window as { electronAPI?: unknown }).electronAPI
    })

    it('should navigate down with ArrowDown key', async () => {
      wrapper = mount(AddressBar, { props: { ...defaultProps, value: '/' } })
      await nextTick()
      await nextTick()

      const input = wrapper.find('input')
      await input.trigger('focus')
      await nextTick()

      const vm = wrapper.vm as {
        selectedCommandIndex: number
      }

      expect(vm.selectedCommandIndex).toBe(0)

      await input.trigger('keydown', { key: 'ArrowDown' })
      expect(vm.selectedCommandIndex).toBe(1)

      await input.trigger('keydown', { key: 'ArrowDown' })
      expect(vm.selectedCommandIndex).toBe(2)
    })

    it('should not navigate past last command', async () => {
      wrapper = mount(AddressBar, { props: { ...defaultProps, value: '/' } })
      await nextTick()
      await nextTick()

      const input = wrapper.find('input')
      await input.trigger('focus')
      await nextTick()

      const vm = wrapper.vm as {
        selectedCommandIndex: number
      }

      await input.trigger('keydown', { key: 'ArrowDown' })
      await input.trigger('keydown', { key: 'ArrowDown' })
      await input.trigger('keydown', { key: 'ArrowDown' })
      await input.trigger('keydown', { key: 'ArrowDown' })

      expect(vm.selectedCommandIndex).toBe(2) // Should stay at last index
    })

    it('should navigate up with ArrowUp key', async () => {
      wrapper = mount(AddressBar, { props: { ...defaultProps, value: '/' } })
      await nextTick()
      await nextTick()

      const input = wrapper.find('input')
      await input.trigger('focus')
      await nextTick()

      const vm = wrapper.vm as {
        selectedCommandIndex: number
      }

      // Navigate down first
      await input.trigger('keydown', { key: 'ArrowDown' })
      await input.trigger('keydown', { key: 'ArrowDown' })
      expect(vm.selectedCommandIndex).toBe(2)

      // Navigate up
      await input.trigger('keydown', { key: 'ArrowUp' })
      expect(vm.selectedCommandIndex).toBe(1)

      await input.trigger('keydown', { key: 'ArrowUp' })
      expect(vm.selectedCommandIndex).toBe(0)
    })

    it('should not navigate before first command', async () => {
      wrapper = mount(AddressBar, { props: { ...defaultProps, value: '/' } })
      await nextTick()
      await nextTick()

      const input = wrapper.find('input')
      await input.trigger('focus')
      await nextTick()

      const vm = wrapper.vm as {
        selectedCommandIndex: number
      }

      await input.trigger('keydown', { key: 'ArrowUp' })
      expect(vm.selectedCommandIndex).toBe(0) // Should stay at first index
    })

    it('should autocomplete command with Tab key', async () => {
      wrapper = mount(AddressBar, { props: { ...defaultProps, value: '/' } })
      await nextTick()
      await nextTick()

      const input = wrapper.find('input')
      await input.trigger('focus')
      await nextTick()

      await input.trigger('keydown', { key: 'Tab' })
      await nextTick()

      expect(wrapper.emitted('update:value')).toBeTruthy()
      const updateEvents = wrapper.emitted('update:value') as string[][]
      expect(updateEvents[updateEvents.length - 1][0]).toBe('/help')
    })

    it('should execute selected command with Enter key', async () => {
      const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})

      wrapper = mount(AddressBar, { props: { ...defaultProps, value: '/' } })
      await nextTick()
      await nextTick()

      const input = wrapper.find('input')
      await input.trigger('focus')
      await nextTick()

      await input.trigger('keydown', { key: 'Enter' })
      await nextTick()
      await nextTick()

      expect(window.electronAPI?.commands.execute).toHaveBeenCalledWith('help')
      consoleLog.mockRestore()
    })
  })

  describe('Command Execution', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'electronAPI', {
        writable: true,
        configurable: true,
        value: {
          commands: {
            list: vi
              .fn()
              .mockResolvedValue([
                { name: 'help', description: 'Show help', category: 'general' },
              ]),
            execute: vi.fn(),
          },
        },
      })
    })

    afterEach(() => {
      delete (window as { electronAPI?: unknown }).electronAPI
    })

    it('should execute command successfully and clear input', async () => {
      const mockExecute = vi
        .fn()
        .mockResolvedValue({ success: true, data: { action: 'show-help' } })
      Object.defineProperty(window, 'electronAPI', {
        writable: true,
        configurable: true,
        value: {
          commands: {
            list: vi
              .fn()
              .mockResolvedValue([
                { name: 'help', description: 'Show help', category: 'general' },
              ]),
            execute: mockExecute,
          },
        },
      })

      const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})

      wrapper = mount(AddressBar, { props: { ...defaultProps, value: '/' } })
      await nextTick()
      await nextTick()

      const vm = wrapper.vm as {
        selectCommand: (command: {
          name: string
          description: string
          category: string
        }) => Promise<void>
      }

      await vm.selectCommand({
        name: 'help',
        description: 'Show help',
        category: 'general',
      })
      await nextTick()

      expect(mockExecute).toHaveBeenCalledWith('help')
      expect(wrapper.emitted('update:value')).toBeTruthy()
      expect(wrapper.emitted('execute')).toBeTruthy()
      expect(wrapper.emitted('execute')?.[0]?.[0]).toBe('show-help')

      consoleLog.mockRestore()
    })

    it('should handle command execution failure', async () => {
      const mockExecute = vi
        .fn()
        .mockResolvedValue({ success: false, message: 'Command failed' })
      Object.defineProperty(window, 'electronAPI', {
        writable: true,
        configurable: true,
        value: {
          commands: {
            execute: mockExecute,
          },
        },
      })

      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})
      const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})

      wrapper = mount(AddressBar, { props: defaultProps })
      await nextTick()

      const vm = wrapper.vm as {
        selectCommand: (command: {
          name: string
          description: string
          category: string
        }) => Promise<void>
      }

      await vm.selectCommand({
        name: 'fail',
        description: 'Failing command',
        category: 'test',
      })
      await nextTick()

      expect(consoleError).toHaveBeenCalledWith(
        '[AddressBar] Command execution failed:',
        'Command failed'
      )

      consoleError.mockRestore()
      consoleLog.mockRestore()
    })

    it('should handle command execution error', async () => {
      const mockExecute = vi.fn().mockRejectedValue(new Error('Network error'))
      Object.defineProperty(window, 'electronAPI', {
        writable: true,
        configurable: true,
        value: {
          commands: {
            execute: mockExecute,
          },
        },
      })

      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})
      const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})

      wrapper = mount(AddressBar, { props: defaultProps })
      await nextTick()

      const vm = wrapper.vm as {
        selectCommand: (command: {
          name: string
          description: string
          category: string
        }) => Promise<void>
      }

      await vm.selectCommand({
        name: 'error',
        description: 'Error command',
        category: 'test',
      })
      await nextTick()

      expect(consoleError).toHaveBeenCalledWith(
        '[AddressBar] Failed to execute command:',
        expect.any(Error)
      )

      consoleError.mockRestore()
      consoleLog.mockRestore()
    })

    it('should warn when electronAPI commands is not available', async () => {
      delete (window as { electronAPI?: unknown }).electronAPI

      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})

      wrapper = mount(AddressBar, { props: defaultProps })
      await nextTick()

      const vm = wrapper.vm as {
        selectCommand: (command: {
          name: string
          description: string
          category: string
        }) => Promise<void>
      }

      await vm.selectCommand({
        name: 'test',
        description: 'Test command',
        category: 'test',
      })

      expect(consoleWarn).toHaveBeenCalledWith(
        '[AddressBar] Commands API not available'
      )

      consoleWarn.mockRestore()
    })

    it('should not emit execute event if command has no action', async () => {
      const mockExecute = vi.fn().mockResolvedValue({ success: true, data: {} })
      Object.defineProperty(window, 'electronAPI', {
        writable: true,
        configurable: true,
        value: {
          commands: {
            execute: mockExecute,
          },
        },
      })

      const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})

      wrapper = mount(AddressBar, { props: defaultProps })
      await nextTick()

      const vm = wrapper.vm as {
        selectCommand: (command: {
          name: string
          description: string
          category: string
        }) => Promise<void>
      }

      await vm.selectCommand({
        name: 'noaction',
        description: 'No action command',
        category: 'test',
      })
      await nextTick()

      expect(wrapper.emitted('execute')).toBeFalsy()

      consoleLog.mockRestore()
    })
  })

  describe('Command Suggestion Interaction', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'electronAPI', {
        writable: true,
        configurable: true,
        value: {
          commands: {
            list: vi.fn().mockResolvedValue([
              { name: 'help', description: 'Show help', category: 'general' },
              { name: 'search', description: 'Search files', category: 'nav' },
            ]),
            execute: vi
              .fn()
              .mockResolvedValue({ success: true, data: { action: 'action' } }),
          },
        },
      })
    })

    afterEach(() => {
      delete (window as { electronAPI?: unknown }).electronAPI
    })

    it('should select command on mouseenter', async () => {
      wrapper = mount(AddressBar, { props: { ...defaultProps, value: '/' } })
      await nextTick()
      await nextTick()

      const input = wrapper.find('input')
      await input.trigger('focus')
      await nextTick()

      const vm = wrapper.vm as {
        selectedCommandIndex: number
      }

      const suggestions = wrapper.findAll('.command-suggestion')
      await suggestions[1].trigger('mouseenter')

      expect(vm.selectedCommandIndex).toBe(1)
    })

    it('should execute command on click', async () => {
      const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})

      wrapper = mount(AddressBar, { props: { ...defaultProps, value: '/' } })
      await nextTick()
      await nextTick()

      const input = wrapper.find('input')
      await input.trigger('focus')
      await nextTick()

      const suggestions = wrapper.findAll('.command-suggestion')
      await suggestions[0].trigger('click')
      await nextTick()
      await nextTick()

      expect(window.electronAPI?.commands.execute).toHaveBeenCalledWith('help')

      consoleLog.mockRestore()
    })
  })
})
