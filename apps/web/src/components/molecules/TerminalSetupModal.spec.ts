/**
 * @fileoverview Comprehensive test suite for TerminalSetupModal component.
 *
 * @description
 * Tests all functionality of the TerminalSetupModal component including
 * form controls, theme selection, user interactions, and event emissions.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick, type ComponentPublicInstance } from 'vue'
import TerminalSetupModal from './TerminalSetupModal.vue'

// Mock BaseButton component
vi.mock('../atoms/BaseButton.vue', () => ({
  default: {
    name: 'BaseButton',
    template:
      '<button data-testid="base-button" :class="variant" @click="$emit(\'click\')"><slot /></button>',
    props: ['variant'],
    emits: ['click'],
  },
}))

// Mock BaseIcon component
vi.mock('../atoms/BaseIcon.vue', () => ({
  default: {
    name: 'BaseIcon',
    template: '<span data-testid="base-icon" :class="name"></span>',
    props: ['name', 'size'],
  },
}))

// Mock useNotifications composable
const mockSuccess = vi.fn()
vi.mock('../../composables/useNotifications', () => ({
  useNotifications: () => ({
    success: mockSuccess,
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
}))

describe('TerminalSetupModal', () => {
  let wrapper: VueWrapper<ComponentPublicInstance>

  const defaultProps = {
    visible: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Component Mounting and Props', () => {
    it('should mount without errors when visible is true', () => {
      wrapper = mount(TerminalSetupModal, {
        props: defaultProps,
      })

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('.modal-overlay').exists()).toBe(true)
      expect(wrapper.find('.modal-container').exists()).toBe(true)
    })

    it('should not render modal when visible is false', () => {
      wrapper = mount(TerminalSetupModal, {
        props: {
          visible: false,
        },
      })

      expect(wrapper.find('.modal-overlay').exists()).toBe(false)
    })

    it('should display modal title', () => {
      wrapper = mount(TerminalSetupModal, {
        props: defaultProps,
      })

      const title = wrapper.find('.modal-title')
      expect(title.exists()).toBe(true)
      expect(title.text()).toBe('Terminal Settings')
    })
  })

  describe('Default Values', () => {
    beforeEach(() => {
      wrapper = mount(TerminalSetupModal, {
        props: defaultProps,
      })
    })

    it('should have default shell value of zsh', () => {
      const shellSelect = wrapper.find('#shell')
      expect((shellSelect.element as HTMLSelectElement).value).toBe('zsh')
    })

    it('should have default font family of SF Mono', () => {
      const fontSelect = wrapper.find('#fontFamily')
      expect((fontSelect.element as HTMLSelectElement).value).toBe(
        "'SF Mono', Monaco"
      )
    })

    it('should have default font size of 14', () => {
      const fontSizeSlider = wrapper.find('#fontSize')
      expect((fontSizeSlider.element as HTMLInputElement).value).toBe('14')
    })

    it('should have default theme of dracula selected', () => {
      // Find the dracula theme radio (should be checked by default via v-model)
      const vm = wrapper.vm as unknown as { selectedTheme: string }
      expect(vm.selectedTheme).toBe('dracula')
    })

    it('should have default cursor style of block', () => {
      const vm = wrapper.vm as unknown as { cursorStyle: string }
      expect(vm.cursorStyle).toBe('block')
    })

    it('should have enableBell unchecked by default', () => {
      const vm = wrapper.vm as unknown as { enableBell: boolean }
      expect(vm.enableBell).toBe(false)
    })

    it('should have blinkCursor checked by default', () => {
      const vm = wrapper.vm as unknown as { blinkCursor: boolean }
      expect(vm.blinkCursor).toBe(true)
    })

    it('should have copyOnSelect checked by default', () => {
      const vm = wrapper.vm as unknown as { copyOnSelect: boolean }
      expect(vm.copyOnSelect).toBe(true)
    })
  })

  describe('Shell Selection', () => {
    beforeEach(() => {
      wrapper = mount(TerminalSetupModal, {
        props: defaultProps,
      })
    })

    it('should change shell value when option is selected', async () => {
      const shellSelect = wrapper.find('#shell')

      await shellSelect.setValue('bash')
      expect((shellSelect.element as HTMLSelectElement).value).toBe('bash')

      await shellSelect.setValue('fish')
      expect((shellSelect.element as HTMLSelectElement).value).toBe('fish')

      await shellSelect.setValue('powershell')
      expect((shellSelect.element as HTMLSelectElement).value).toBe(
        'powershell'
      )
    })

    it('should have all shell options available', () => {
      const options = wrapper.find('#shell').findAll('option')
      const values = options.map((option) => option.element.value)

      expect(values).toContain('bash')
      expect(values).toContain('zsh')
      expect(values).toContain('fish')
      expect(values).toContain('powershell')
    })
  })

  describe('Font Settings', () => {
    beforeEach(() => {
      wrapper = mount(TerminalSetupModal, {
        props: defaultProps,
      })
    })

    it('should change font family when option is selected', async () => {
      const fontSelect = wrapper.find('#fontFamily')

      await fontSelect.setValue("'Fira Code', monospace")
      expect((fontSelect.element as HTMLSelectElement).value).toBe(
        "'Fira Code', monospace"
      )

      await fontSelect.setValue("'JetBrains Mono', monospace")
      expect((fontSelect.element as HTMLSelectElement).value).toBe(
        "'JetBrains Mono', monospace"
      )

      await fontSelect.setValue("'Cascadia Code', monospace")
      expect((fontSelect.element as HTMLSelectElement).value).toBe(
        "'Cascadia Code', monospace"
      )
    })

    it('should change font size when slider is moved', async () => {
      const fontSizeSlider = wrapper.find('#fontSize')
      const vm = wrapper.vm as unknown as { fontSize: number | string }

      await fontSizeSlider.setValue(18)
      await nextTick()

      // v-model on range input can return string, convert to compare
      expect(Number(vm.fontSize)).toBe(18)
      expect((fontSizeSlider.element as HTMLInputElement).value).toBe('18')
    })

    it('should display font size in label', async () => {
      const vm = wrapper.vm as unknown as { fontSize: number }
      vm.fontSize = 20
      await nextTick()

      const label = wrapper.find('label[for="fontSize"]')
      expect(label.text()).toContain('20px')
    })
  })

  describe('Theme Selection', () => {
    beforeEach(() => {
      wrapper = mount(TerminalSetupModal, {
        props: defaultProps,
      })
    })

    it('should render all 4 theme options', () => {
      const themeOptions = wrapper.findAll('.theme-option')
      expect(themeOptions).toHaveLength(4)
    })

    it('should display theme names correctly', () => {
      const themeNames = wrapper.findAll('.theme-name').map((el) => el.text())

      expect(themeNames).toContain('Dracula')
      expect(themeNames).toContain('Nord')
      expect(themeNames).toContain('Monokai')
      expect(themeNames).toContain('Solarized')
    })

    it('should change selected theme when radio is clicked', async () => {
      const vm = wrapper.vm as unknown as { selectedTheme: string }

      // Get all theme radio inputs
      const themeInputs = wrapper
        .findAll('.theme-option input[type="radio"]')
        .map((w) => w.element as HTMLInputElement)

      // Find Nord theme radio
      const nordRadio = themeInputs.find((input) => input.value === 'nord')
      expect(nordRadio).toBeDefined()

      if (nordRadio) {
        await wrapper
          .findAll('.theme-option input[type="radio"]')
          .find((w) => (w.element as HTMLInputElement).value === 'nord')
          ?.setValue(true)
        await nextTick()

        expect(vm.selectedTheme).toBe('nord')
      }
    })

    it('should display theme color preview', () => {
      const themeColors = wrapper.findAll('.theme-color')

      // Each theme has 3 colors (bg, fg, accent), so 4 themes * 3 = 12
      expect(themeColors.length).toBeGreaterThanOrEqual(12)
    })
  })

  describe('Cursor Style Selection', () => {
    beforeEach(() => {
      wrapper = mount(TerminalSetupModal, {
        props: defaultProps,
      })
    })

    it('should render all 3 cursor style options', () => {
      const cursorOptions = wrapper.findAll('.radio-option')
      expect(cursorOptions.length).toBeGreaterThanOrEqual(3)
    })

    it('should change cursor style when radio is clicked', async () => {
      const vm = wrapper.vm as unknown as { cursorStyle: string }

      // Get all cursor style radio inputs
      const cursorInputs = wrapper
        .findAll('.cursor-options input[type="radio"]')
        .map((w) => w.element as HTMLInputElement)

      // Find underline cursor radio
      const underlineRadio = cursorInputs.find(
        (input) => input.value === 'underline'
      )
      expect(underlineRadio).toBeDefined()

      if (underlineRadio) {
        await wrapper
          .findAll('.cursor-options input[type="radio"]')
          .find((w) => (w.element as HTMLInputElement).value === 'underline')
          ?.setValue(true)
        await nextTick()

        expect(vm.cursorStyle).toBe('underline')
      }
    })

    it('should display cursor style labels', () => {
      const text = wrapper.find('.cursor-options').text()

      expect(text).toContain('Block')
      expect(text).toContain('Underline')
      expect(text).toContain('Bar')
    })
  })

  describe('Checkbox Options', () => {
    beforeEach(() => {
      wrapper = mount(TerminalSetupModal, {
        props: defaultProps,
      })
    })

    it('should toggle enableBell checkbox', async () => {
      const vm = wrapper.vm as unknown as { enableBell: boolean }

      expect(vm.enableBell).toBe(false)

      const checkboxes = wrapper.findAll('.checkbox input[type="checkbox"]')
      const enableBellCheckbox = checkboxes[0]

      await enableBellCheckbox.setValue(true)
      await nextTick()

      expect(vm.enableBell).toBe(true)

      await enableBellCheckbox.setValue(false)
      await nextTick()

      expect(vm.enableBell).toBe(false)
    })

    it('should toggle blinkCursor checkbox', async () => {
      const vm = wrapper.vm as unknown as { blinkCursor: boolean }

      expect(vm.blinkCursor).toBe(true)

      const checkboxes = wrapper.findAll('.checkbox input[type="checkbox"]')
      const blinkCursorCheckbox = checkboxes[1]

      await blinkCursorCheckbox.setValue(false)
      await nextTick()

      expect(vm.blinkCursor).toBe(false)

      await blinkCursorCheckbox.setValue(true)
      await nextTick()

      expect(vm.blinkCursor).toBe(true)
    })

    it('should toggle copyOnSelect checkbox', async () => {
      const vm = wrapper.vm as unknown as { copyOnSelect: boolean }

      expect(vm.copyOnSelect).toBe(true)

      const checkboxes = wrapper.findAll('.checkbox input[type="checkbox"]')
      const copyOnSelectCheckbox = checkboxes[2]

      await copyOnSelectCheckbox.setValue(false)
      await nextTick()

      expect(vm.copyOnSelect).toBe(false)

      await copyOnSelectCheckbox.setValue(true)
      await nextTick()

      expect(vm.copyOnSelect).toBe(true)
    })

    it('should display checkbox labels', () => {
      const checkboxText = wrapper.find('.checkboxes').text()

      expect(checkboxText).toContain('Enable bell')
      expect(checkboxText).toContain('Blinking cursor')
      expect(checkboxText).toContain('Copy on select')
    })
  })

  describe('Close Button Interactions', () => {
    beforeEach(() => {
      wrapper = mount(TerminalSetupModal, {
        props: defaultProps,
      })
    })

    it('should emit close event when X button is clicked', async () => {
      const closeButton = wrapper.find('.close-button')

      await closeButton.trigger('click')
      await nextTick()

      expect(wrapper.emitted('close')).toBeTruthy()
      expect(wrapper.emitted('close')?.length).toBe(1)
    })

    it('should emit close event when Cancel button is clicked', async () => {
      const buttons = wrapper.findAll('[data-testid="base-button"]')
      const cancelButton = buttons.find((btn) => btn.text() === 'Cancel')

      expect(cancelButton).toBeDefined()

      await cancelButton?.trigger('click')
      await nextTick()

      expect(wrapper.emitted('close')).toBeTruthy()
    })
  })

  describe('Save Functionality', () => {
    beforeEach(() => {
      wrapper = mount(TerminalSetupModal, {
        props: defaultProps,
      })
    })

    it('should emit save event with correct data when Save button is clicked', async () => {
      const vm = wrapper.vm as unknown as {
        shell: string
        fontFamily: string
        fontSize: number
        selectedTheme: string
        cursorStyle: string
        enableBell: boolean
        blinkCursor: boolean
        copyOnSelect: boolean
      }

      // Set custom values
      vm.shell = 'bash'
      vm.fontFamily = "'Fira Code', monospace"
      vm.fontSize = 16
      vm.selectedTheme = 'nord'
      vm.cursorStyle = 'bar'
      vm.enableBell = true
      vm.blinkCursor = false
      vm.copyOnSelect = false

      await nextTick()

      const buttons = wrapper.findAll('[data-testid="base-button"]')
      const saveButton = buttons.find((btn) => btn.classes('primary'))

      expect(saveButton).toBeDefined()

      await saveButton?.trigger('click')
      await nextTick()

      const saveEvents = wrapper.emitted('save')
      expect(saveEvents).toBeTruthy()
      expect(saveEvents?.length).toBe(1)

      const emittedData = saveEvents?.[0][0] as {
        shell: string
        fontFamily: string
        fontSize: number
        theme: string
        cursorStyle: string
        options: {
          enableBell: boolean
          blinkCursor: boolean
          copyOnSelect: boolean
        }
      }

      expect(emittedData).toEqual({
        shell: 'bash',
        fontFamily: "'Fira Code', monospace",
        fontSize: 16,
        theme: 'nord',
        cursorStyle: 'bar',
        options: {
          enableBell: true,
          blinkCursor: false,
          copyOnSelect: false,
        },
      })
    })

    it('should call success notification on save', async () => {
      const buttons = wrapper.findAll('[data-testid="base-button"]')
      const saveButton = buttons.find((btn) => btn.classes('primary'))

      await saveButton?.trigger('click')
      await nextTick()

      expect(mockSuccess).toHaveBeenCalledWith('Terminal settings saved!')
      expect(mockSuccess).toHaveBeenCalledTimes(1)
    })

    it('should emit close event after save', async () => {
      const buttons = wrapper.findAll('[data-testid="base-button"]')
      const saveButton = buttons.find((btn) => btn.classes('primary'))

      await saveButton?.trigger('click')
      await nextTick()

      const closeEvents = wrapper.emitted('close')
      expect(closeEvents).toBeTruthy()
    })

    it('should save with default values if unchanged', async () => {
      const buttons = wrapper.findAll('[data-testid="base-button"]')
      const saveButton = buttons.find((btn) => btn.classes('primary'))

      await saveButton?.trigger('click')
      await nextTick()

      const saveEvents = wrapper.emitted('save')
      const emittedData = saveEvents?.[0][0] as {
        shell: string
        fontFamily: string
        fontSize: number
        theme: string
        cursorStyle: string
        options: {
          enableBell: boolean
          blinkCursor: boolean
          copyOnSelect: boolean
        }
      }

      expect(emittedData).toEqual({
        shell: 'zsh',
        fontFamily: "'SF Mono', Monaco",
        fontSize: 14,
        theme: 'dracula',
        cursorStyle: 'block',
        options: {
          enableBell: false,
          blinkCursor: true,
          copyOnSelect: true,
        },
      })
    })
  })

  describe('Overlay Click Behavior', () => {
    beforeEach(() => {
      wrapper = mount(TerminalSetupModal, {
        props: defaultProps,
      })
    })

    it('should emit close when clicking overlay', async () => {
      const overlay = wrapper.find('.modal-overlay')

      await overlay.trigger('click')
      await nextTick()

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should not emit close when clicking inside modal container', async () => {
      const modalContainer = wrapper.find('.modal-container')

      await modalContainer.trigger('click')
      await nextTick()

      // Should not emit because of @click.stop
      expect(wrapper.emitted('close')).toBeFalsy()
    })
  })

  describe('Visual Elements and Accessibility', () => {
    beforeEach(() => {
      wrapper = mount(TerminalSetupModal, {
        props: defaultProps,
      })
    })

    it('should have proper section titles', () => {
      const sectionTitles = wrapper
        .findAll('.section-title')
        .map((el) => el.text())

      expect(sectionTitles).toContain('Shell')
      expect(sectionTitles).toContain('Font')
      expect(sectionTitles).toContain('Color Theme')
      expect(sectionTitles).toContain('Cursor')
      expect(sectionTitles).toContain('Options')
    })

    it('should have aria-label on close button', () => {
      const closeButton = wrapper.find('.close-button')
      expect(closeButton.attributes('aria-label')).toBe('Close')
    })

    it('should have proper input labels with for attributes', () => {
      const shellLabel = wrapper.find('label[for="shell"]')
      expect(shellLabel.exists()).toBe(true)
      expect(shellLabel.text()).toBe('Default Shell')

      const fontFamilyLabel = wrapper.find('label[for="fontFamily"]')
      expect(fontFamilyLabel.exists()).toBe(true)
      expect(fontFamilyLabel.text()).toBe('Font Family')

      const fontSizeLabel = wrapper.find('label[for="fontSize"]')
      expect(fontSizeLabel.exists()).toBe(true)
      expect(fontSizeLabel.text()).toContain('Font Size')
    })

    it('should display icons in header and save button', () => {
      const icons = wrapper.findAll('[data-testid="base-icon"]')

      // Header icon (Terminal), Close icon (X), Save icon (Settings)
      expect(icons.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('Edge Cases', () => {
    it('should handle rapid value changes', async () => {
      wrapper = mount(TerminalSetupModal, {
        props: defaultProps,
      })

      const vm = wrapper.vm as unknown as { fontSize: number }

      // Rapid changes
      vm.fontSize = 10
      await nextTick()
      vm.fontSize = 24
      await nextTick()
      vm.fontSize = 16
      await nextTick()

      expect(vm.fontSize).toBe(16)
    })

    it('should handle switching between all themes', async () => {
      wrapper = mount(TerminalSetupModal, {
        props: defaultProps,
      })

      const vm = wrapper.vm as unknown as { selectedTheme: string }

      const themes = ['dracula', 'nord', 'monokai', 'solarized']

      for (const theme of themes) {
        vm.selectedTheme = theme
        await nextTick()
        expect(vm.selectedTheme).toBe(theme)
      }
    })

    it('should handle switching between all cursor styles', async () => {
      wrapper = mount(TerminalSetupModal, {
        props: defaultProps,
      })

      const vm = wrapper.vm as unknown as { cursorStyle: string }

      const styles = ['block', 'underline', 'bar']

      for (const style of styles) {
        vm.cursorStyle = style
        await nextTick()
        expect(vm.cursorStyle).toBe(style)
      }
    })

    it('should handle boundary values for font size', async () => {
      wrapper = mount(TerminalSetupModal, {
        props: defaultProps,
      })

      const fontSizeSlider = wrapper.find('#fontSize')

      // Min value
      await fontSizeSlider.setValue(10)
      expect((fontSizeSlider.element as HTMLInputElement).value).toBe('10')

      // Max value
      await fontSizeSlider.setValue(24)
      expect((fontSizeSlider.element as HTMLInputElement).value).toBe('24')
    })
  })

  describe('Component State Management', () => {
    it('should maintain state when toggling visibility', async () => {
      wrapper = mount(TerminalSetupModal, {
        props: { visible: true },
      })

      const vm = wrapper.vm as unknown as {
        shell: string
        fontSize: number
      }

      // Change values
      vm.shell = 'fish'
      vm.fontSize = 18
      await nextTick()

      // Hide modal
      await wrapper.setProps({ visible: false })
      await nextTick()

      // Show modal again
      await wrapper.setProps({ visible: true })
      await nextTick()

      // Values should be preserved
      expect(vm.shell).toBe('fish')
      expect(vm.fontSize).toBe(18)
    })
  })
})
