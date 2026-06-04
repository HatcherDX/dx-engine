/**
 * @fileoverview Tests for CommandPalette component.
 *
 * @description
 * Comprehensive test suite for the VS Code-style command palette component
 * including search functionality, keyboard navigation, command execution,
 * and state management.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick, type ComponentPublicInstance } from 'vue'
import CommandPalette from './CommandPalette.vue'

/**
 * Mock Command type matching @hatcherdx/ai-cli.
 */
interface MockCommand {
  name: string
  description: string
  category: string
}

describe('CommandPalette.vue', () => {
  let wrapper: VueWrapper<ComponentPublicInstance>

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  const mockCommands: MockCommand[] = [
    {
      name: 'Switch Model',
      description: 'Change the AI model',
      category: 'Settings',
    },
    {
      name: 'View Metrics',
      description: 'Show usage metrics',
      category: 'Analytics',
    },
    {
      name: 'Clear Session',
      description: 'Clear current session',
      category: 'Session',
    },
    {
      name: 'Open Config',
      description: 'Open configuration file',
      category: 'Settings',
    },
  ]

  const createWrapper = (props = {}) => {
    return mount(CommandPalette, {
      props: {
        visible: false,
        commands: mockCommands,
        ...props,
      },
    })
  }

  describe('Rendering', () => {
    it('should mount and render without errors', () => {
      wrapper = createWrapper()
      expect(wrapper.exists()).toBe(true)
    })

    it('should not render when visible is false', () => {
      wrapper = createWrapper({ visible: false })
      expect(wrapper.find('.command-palette-overlay').exists()).toBe(false)
    })

    it('should render when visible is true', () => {
      wrapper = createWrapper({ visible: true })
      expect(wrapper.find('.command-palette-overlay').exists()).toBe(true)
    })

    it('should render search input', () => {
      wrapper = createWrapper({ visible: true })
      const searchInput = wrapper.find('.search-input')
      expect(searchInput.exists()).toBe(true)
      expect(searchInput.attributes('placeholder')).toBe('Type a command...')
    })

    it('should render all command items', () => {
      wrapper = createWrapper({ visible: true })
      const commandItems = wrapper.findAll('.command-item')
      expect(commandItems).toHaveLength(mockCommands.length)
    })

    it('should render command details correctly', () => {
      wrapper = createWrapper({ visible: true })
      const firstCommand = wrapper.findAll('.command-item')[0]

      expect(firstCommand.find('.command-name').text()).toBe('Switch Model')
      expect(firstCommand.find('.command-description').text()).toBe(
        'Change the AI model'
      )
      expect(firstCommand.find('.command-category').text()).toBe('Settings')
    })

    it('should apply selected class to first command by default', () => {
      wrapper = createWrapper({ visible: true })
      const firstCommand = wrapper.findAll('.command-item')[0]
      expect(firstCommand.classes()).toContain('selected')
    })

    it('should render with empty commands array', () => {
      wrapper = createWrapper({ visible: true, commands: [] })
      expect(wrapper.find('.empty-state').exists()).toBe(true)
      expect(wrapper.find('.empty-state').text()).toContain('No commands found')
    })
  })

  describe('Search Functionality', () => {
    it('should filter commands by name', async () => {
      wrapper = createWrapper({ visible: true })
      const searchInput = wrapper.find('.search-input')

      await searchInput.setValue('Model')
      await nextTick()

      const commandItems = wrapper.findAll('.command-item')
      expect(commandItems).toHaveLength(1)
      expect(commandItems[0].find('.command-name').text()).toBe('Switch Model')
    })

    it('should filter commands by description', async () => {
      wrapper = createWrapper({ visible: true })
      const searchInput = wrapper.find('.search-input')

      await searchInput.setValue('usage')
      await nextTick()

      const commandItems = wrapper.findAll('.command-item')
      expect(commandItems).toHaveLength(1)
      expect(commandItems[0].find('.command-name').text()).toBe('View Metrics')
    })

    it('should be case-insensitive', async () => {
      wrapper = createWrapper({ visible: true })
      const searchInput = wrapper.find('.search-input')

      await searchInput.setValue('METRICS')
      await nextTick()

      const commandItems = wrapper.findAll('.command-item')
      expect(commandItems).toHaveLength(1)
      expect(commandItems[0].find('.command-name').text()).toBe('View Metrics')
    })

    it('should show empty state when no matches found', async () => {
      wrapper = createWrapper({ visible: true })
      const searchInput = wrapper.find('.search-input')

      await searchInput.setValue('nonexistent')
      await nextTick()

      expect(wrapper.find('.empty-state').exists()).toBe(true)
      expect(wrapper.find('.empty-state').text()).toContain(
        'No commands found for "nonexistent"'
      )
    })

    it('should show all commands when search is cleared', async () => {
      wrapper = createWrapper({ visible: true })
      const searchInput = wrapper.find('.search-input')

      await searchInput.setValue('Model')
      await nextTick()
      expect(wrapper.findAll('.command-item')).toHaveLength(1)

      await searchInput.setValue('')
      await nextTick()
      expect(wrapper.findAll('.command-item')).toHaveLength(mockCommands.length)
    })

    it('should filter multiple matches', async () => {
      wrapper = createWrapper({ visible: true })
      const searchInput = wrapper.find('.search-input')

      await searchInput.setValue('Open')
      await nextTick()

      const commandItems = wrapper.findAll('.command-item')
      expect(commandItems).toHaveLength(1) // Only "Open Config" matches
    })
  })

  describe('Keyboard Navigation', () => {
    it('should navigate down with arrow down key', async () => {
      wrapper = createWrapper({ visible: true })
      const searchInput = wrapper.find('.search-input')

      await searchInput.trigger('keydown.down')
      await nextTick()

      const commandItems = wrapper.findAll('.command-item')
      expect(commandItems[1].classes()).toContain('selected')
    })

    it('should navigate up with arrow up key', async () => {
      wrapper = createWrapper({ visible: true })
      const searchInput = wrapper.find('.search-input')

      // Navigate down first
      await searchInput.trigger('keydown.down')
      await nextTick()

      // Navigate back up
      await searchInput.trigger('keydown.up')
      await nextTick()

      const commandItems = wrapper.findAll('.command-item')
      expect(commandItems[0].classes()).toContain('selected')
    })

    it('should wrap to last command when pressing up on first item', async () => {
      wrapper = createWrapper({ visible: true })
      const searchInput = wrapper.find('.search-input')

      await searchInput.trigger('keydown.up')
      await nextTick()

      const commandItems = wrapper.findAll('.command-item')
      expect(commandItems[commandItems.length - 1].classes()).toContain(
        'selected'
      )
    })

    it('should wrap to first command when pressing down on last item', async () => {
      wrapper = createWrapper({ visible: true })
      const searchInput = wrapper.find('.search-input')

      // Navigate to last item
      for (let i = 0; i < mockCommands.length; i++) {
        await searchInput.trigger('keydown.down')
        await nextTick()
      }

      const commandItems = wrapper.findAll('.command-item')
      expect(commandItems[0].classes()).toContain('selected')
    })

    it('should not navigate when no commands available', async () => {
      wrapper = createWrapper({ visible: true, commands: [] })
      const searchInput = wrapper.find('.search-input')

      await searchInput.trigger('keydown.down')
      await nextTick()

      expect(wrapper.find('.empty-state').exists()).toBe(true)
    })

    it('should execute selected command with enter key', async () => {
      wrapper = createWrapper({ visible: true })
      const searchInput = wrapper.find('.search-input')

      await searchInput.trigger('keydown.enter')
      await nextTick()

      expect(wrapper.emitted('execute')).toBeTruthy()
      expect(wrapper.emitted('execute')![0]).toEqual(['Switch Model'])
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should close palette with escape key', async () => {
      wrapper = createWrapper({ visible: true })
      const searchInput = wrapper.find('.search-input')

      await searchInput.trigger('keydown.escape')
      await nextTick()

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should not execute command when enter pressed with no results', async () => {
      wrapper = createWrapper({ visible: true })
      const searchInput = wrapper.find('.search-input')

      await searchInput.setValue('nonexistent')
      await nextTick()

      await searchInput.trigger('keydown.enter')
      await nextTick()

      expect(wrapper.emitted('execute')).toBeFalsy()
    })
  })

  describe('Mouse Interaction', () => {
    it('should select command on mouseenter', async () => {
      wrapper = createWrapper({ visible: true })
      const commandItems = wrapper.findAll('.command-item')

      await commandItems[2].trigger('mouseenter')
      await nextTick()

      expect(commandItems[2].classes()).toContain('selected')
    })

    it('should execute command on click', async () => {
      wrapper = createWrapper({ visible: true })
      const commandItems = wrapper.findAll('.command-item')

      await commandItems[1].trigger('click')
      await nextTick()

      expect(wrapper.emitted('execute')).toBeTruthy()
      expect(wrapper.emitted('execute')![0]).toEqual(['View Metrics'])
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should close when clicking overlay', async () => {
      wrapper = createWrapper({ visible: true })
      const overlay = wrapper.find('.command-palette-overlay')

      await overlay.trigger('click')
      await nextTick()

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should not close when clicking inside palette', async () => {
      wrapper = createWrapper({ visible: true })
      const palette = wrapper.find('.command-palette')

      await palette.trigger('click')
      await nextTick()

      expect(wrapper.emitted('close')).toBeFalsy()
    })
  })

  describe('Visibility and Focus Management', () => {
    it('should render search input when becoming visible', async () => {
      wrapper = createWrapper({ visible: false })

      // Component uses v-if, so overlay should not exist when visible=false
      expect(wrapper.find('.command-palette-overlay').exists()).toBe(false)

      await wrapper.setProps({ visible: true })
      await nextTick()

      // Component should now exist and be visible
      expect(wrapper.find('.command-palette-overlay').exists()).toBe(true)
      expect(wrapper.find('.search-input').exists()).toBe(true)
    })

    it('should reset search query when opening', async () => {
      wrapper = createWrapper({ visible: true })
      let searchInput = wrapper.find('.search-input')

      await searchInput.setValue('test query')
      await nextTick()

      // Verify search query is set
      expect((searchInput.element as HTMLInputElement).value).toBe('test query')

      await wrapper.setProps({ visible: false })
      await nextTick()

      await wrapper.setProps({ visible: true })
      await nextTick()

      // Need to re-query the input since the component was destroyed and recreated
      searchInput = wrapper.find('.search-input')

      // Search query should be reset (component was destroyed and recreated)
      expect((searchInput.element as HTMLInputElement).value).toBe('')
    })

    it('should reset selected index when opening', async () => {
      wrapper = createWrapper({ visible: true })
      const searchInput = wrapper.find('.search-input')

      await searchInput.trigger('keydown.down')
      await searchInput.trigger('keydown.down')
      await nextTick()

      await wrapper.setProps({ visible: false })
      await nextTick()

      await wrapper.setProps({ visible: true })
      await nextTick()

      const commandItems = wrapper.findAll('.command-item')
      expect(commandItems[0].classes()).toContain('selected')
    })
  })

  describe('Selection Bounds Management', () => {
    it('should reset selection when filtered results change', async () => {
      wrapper = createWrapper({ visible: true })
      const searchInput = wrapper.find('.search-input')

      // Navigate to third item
      await searchInput.trigger('keydown.down')
      await searchInput.trigger('keydown.down')
      await nextTick()

      // Filter to only one result
      await searchInput.setValue('Model')
      await nextTick()

      // Selection should reset to first (and only) item
      const commandItems = wrapper.findAll('.command-item')
      expect(commandItems).toHaveLength(1)
      expect(commandItems[0].classes()).toContain('selected')
    })

    it('should handle selection reset when results become empty', async () => {
      wrapper = createWrapper({ visible: true })
      const searchInput = wrapper.find('.search-input')

      await searchInput.setValue('nonexistent')
      await nextTick()

      expect(wrapper.find('.empty-state').exists()).toBe(true)
      expect(wrapper.findAll('.command-item')).toHaveLength(0)
    })

    it('should maintain valid selection when results expand', async () => {
      wrapper = createWrapper({ visible: true })
      const searchInput = wrapper.find('.search-input')

      // Filter to one result
      await searchInput.setValue('Model')
      await nextTick()

      // Clear filter
      await searchInput.setValue('')
      await nextTick()

      // Selection should still be valid
      const commandItems = wrapper.findAll('.command-item')
      expect(commandItems[0].classes()).toContain('selected')
    })
  })

  describe('Command Execution', () => {
    it('should emit execute event with correct command name', async () => {
      wrapper = createWrapper({ visible: true })
      const commandItems = wrapper.findAll('.command-item')

      await commandItems[2].trigger('click')
      await nextTick()

      expect(wrapper.emitted('execute')).toBeTruthy()
      expect(wrapper.emitted('execute')![0]).toEqual(['Clear Session'])
    })

    it('should emit close event after execution', async () => {
      wrapper = createWrapper({ visible: true })
      const commandItems = wrapper.findAll('.command-item')

      await commandItems[0].trigger('click')
      await nextTick()

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should execute command from keyboard navigation', async () => {
      wrapper = createWrapper({ visible: true })
      const searchInput = wrapper.find('.search-input')

      await searchInput.trigger('keydown.down')
      await searchInput.trigger('keydown.down')
      await nextTick()

      await searchInput.trigger('keydown.enter')
      await nextTick()

      expect(wrapper.emitted('execute')).toBeTruthy()
      expect(wrapper.emitted('execute')![0]).toEqual(['Clear Session'])
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty commands prop', () => {
      wrapper = createWrapper({ visible: true, commands: [] })
      expect(wrapper.find('.empty-state').exists()).toBe(true)
    })

    it('should handle undefined commands prop', () => {
      wrapper = createWrapper({ visible: true, commands: undefined })
      expect(wrapper.find('.empty-state').exists()).toBe(true)
    })

    it('should handle rapid navigation', async () => {
      wrapper = createWrapper({ visible: true })
      const searchInput = wrapper.find('.search-input')

      for (let i = 0; i < 10; i++) {
        await searchInput.trigger('keydown.down')
      }
      await nextTick()

      const commandItems = wrapper.findAll('.command-item')
      const selectedIndex = commandItems.findIndex((item) =>
        item.classes().includes('selected')
      )
      expect(selectedIndex).toBeGreaterThanOrEqual(0)
      expect(selectedIndex).toBeLessThan(mockCommands.length)
    })

    it('should handle rapid search changes', async () => {
      wrapper = createWrapper({ visible: true })
      const searchInput = wrapper.find('.search-input')

      await searchInput.setValue('M')
      await searchInput.setValue('Mo')
      await searchInput.setValue('Mod')
      await searchInput.setValue('Model')
      await nextTick()

      const commandItems = wrapper.findAll('.command-item')
      expect(commandItems).toHaveLength(1)
    })

    it('should handle special characters in search', async () => {
      wrapper = createWrapper({ visible: true })
      const searchInput = wrapper.find('.search-input')

      await searchInput.setValue('Model@#$')
      await nextTick()

      expect(wrapper.find('.empty-state').exists()).toBe(true)
    })
  })

  describe('Accessibility', () => {
    it('should have proper input type', () => {
      wrapper = createWrapper({ visible: true })
      const searchInput = wrapper.find('.search-input')
      expect(searchInput.attributes('type')).toBe('text')
    })

    it('should have descriptive placeholder', () => {
      wrapper = createWrapper({ visible: true })
      const searchInput = wrapper.find('.search-input')
      expect(searchInput.attributes('placeholder')).toBe('Type a command...')
    })

    it('should apply selected class for visual indication', () => {
      wrapper = createWrapper({ visible: true })
      const firstCommand = wrapper.findAll('.command-item')[0]
      expect(firstCommand.classes()).toContain('selected')
    })
  })

  describe('Component State', () => {
    it('should initialize with empty search query', () => {
      wrapper = createWrapper({ visible: true })
      const searchInput = wrapper.find('.search-input')
      expect((searchInput.element as HTMLInputElement).value).toBe('')
    })

    it('should initialize with first item selected', () => {
      wrapper = createWrapper({ visible: true })
      const commandItems = wrapper.findAll('.command-item')
      expect(commandItems[0].classes()).toContain('selected')
    })

    it('should maintain search state during navigation', async () => {
      wrapper = createWrapper({ visible: true })
      const searchInput = wrapper.find('.search-input')

      await searchInput.setValue('test')
      await searchInput.trigger('keydown.down')
      await nextTick()

      expect((searchInput.element as HTMLInputElement).value).toBe('test')
    })
  })

  describe('Integration', () => {
    it('should handle complete search and execute flow', async () => {
      wrapper = createWrapper({ visible: true })
      const searchInput = wrapper.find('.search-input')

      await searchInput.setValue('Metrics')
      await nextTick()

      await searchInput.trigger('keydown.enter')
      await nextTick()

      expect(wrapper.emitted('execute')).toBeTruthy()
      expect(wrapper.emitted('execute')![0]).toEqual(['View Metrics'])
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should handle mouse and keyboard interaction together', async () => {
      wrapper = createWrapper({ visible: true })
      const searchInput = wrapper.find('.search-input')
      const commandItems = wrapper.findAll('.command-item')

      await searchInput.trigger('keydown.down')
      await nextTick()

      await commandItems[0].trigger('mouseenter')
      await nextTick()

      expect(commandItems[0].classes()).toContain('selected')
    })

    it('should handle visibility toggle with state reset', async () => {
      wrapper = createWrapper({ visible: true })
      let searchInput = wrapper.find('.search-input')

      // Set some state - use a search term that matches our mock commands
      await searchInput.setValue('Model')
      await searchInput.trigger('keydown.down')
      await nextTick()

      // Verify state is set
      expect((searchInput.element as HTMLInputElement).value).toBe('Model')
      let commandItems = wrapper.findAll('.command-item')
      expect(commandItems.length).toBeGreaterThan(0)

      // Hide the palette (component gets destroyed with v-if)
      await wrapper.setProps({ visible: false })
      await nextTick()

      // Component should not exist when hidden
      expect(wrapper.find('.command-palette-overlay').exists()).toBe(false)

      // Show it again (component gets recreated)
      await wrapper.setProps({ visible: true })
      await nextTick()

      // Need to re-query elements since component was recreated
      searchInput = wrapper.find('.search-input')
      commandItems = wrapper.findAll('.command-item')

      // State should be reset: search cleared and first item selected
      expect((searchInput.element as HTMLInputElement).value).toBe('')
      expect(commandItems[0].classes()).toContain('selected')
    })
  })
})
