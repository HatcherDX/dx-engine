/**
 * @fileoverview Comprehensive test suite for ConfigModal component.
 *
 * @description
 * Tests all functionality including modal visibility, permission modes,
 * general settings toggles, status line format, quick actions, and save/export.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick, type ComponentPublicInstance } from 'vue'
import ConfigModal from './ConfigModal.vue'
import BaseIcon from '../atoms/BaseIcon.vue'
import BaseButton from '../atoms/BaseButton.vue'

/**
 * Type definition for Config Modal VM instance.
 */
interface ConfigModalVM {
  config: {
    permissionMode: string
    autoSave: boolean
    showNotifications: boolean
    statusLineFormat: string
  }
  saveConfig: () => void
  exportConfig: () => void
  importConfig: () => void
  resetToDefaults: () => void
}

/**
 * Mock notifications composable.
 */
const mockSuccess = vi.fn()
const mockWarning = vi.fn()

vi.mock('../../composables/useNotifications', () => ({
  useNotifications: () => ({
    success: mockSuccess,
    warning: mockWarning,
    error: vi.fn(),
    info: vi.fn(),
  }),
}))

/**
 * Mock localStorage.
 */
let mockLocalStorage: Record<string, string> = {}

describe('ConfigModal.vue', () => {
  let wrapper: VueWrapper<ComponentPublicInstance>

  /**
   * Setup before each test.
   */
  beforeEach(() => {
    // Clean up DOM before each test
    document.body.innerHTML = ''

    mockLocalStorage = {}
    mockSuccess.mockClear()
    mockWarning.mockClear()

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          mockLocalStorage[key] = value
        }),
        removeItem: vi.fn((key: string) => {
          delete mockLocalStorage[key]
        }),
        clear: vi.fn(() => {
          mockLocalStorage = {}
        }),
      },
      writable: true,
      configurable: true,
    })

    // Mock window.Blob and URL for export functionality
    global.window.Blob = vi.fn((content, options) => ({
      content,
      options,
    })) as unknown as typeof Blob

    global.window.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    global.window.URL.revokeObjectURL = vi.fn()

    // Mock document.createElement ONLY for 'a' elements (export functionality)
    const originalCreateElement = document.createElement.bind(document)
    const mockAnchor = {
      href: '',
      download: '',
      click: vi.fn(),
    }
    vi.spyOn(document, 'createElement').mockImplementation(
      (tagName: string) => {
        if (tagName === 'a') {
          return mockAnchor as unknown as HTMLAnchorElement
        }
        return originalCreateElement(tagName)
      }
    )
  })

  /**
   * Cleanup after each test.
   */
  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    // Clean up DOM after each test
    document.body.innerHTML = ''
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  /**
   * Helper to mount component.
   */
  const createWrapper = (props = {}, options = {}) => {
    return mount(ConfigModal, {
      props: {
        visible: true,
        ...props,
      },
      global: {
        components: {
          BaseIcon,
          BaseButton,
        },
        stubs: {
          BaseIcon: true,
          BaseButton: true,
          ...options.stubs,
        },
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
      expect(wrapper.find('.modal-overlay').exists()).toBe(false)
    })

    it('should render modal overlay when visible is true', () => {
      wrapper = createWrapper({ visible: true })
      expect(wrapper.find('.modal-overlay').exists()).toBe(true)
    })

    it('should render modal title "Configuration Settings"', () => {
      wrapper = createWrapper()
      expect(wrapper.find('.modal-title').text()).toBe('Configuration Settings')
    })

    it('should render close button with aria-label', () => {
      wrapper = createWrapper()
      const closeButton = wrapper.find('.close-button')
      expect(closeButton.exists()).toBe(true)
      expect(closeButton.attributes('aria-label')).toBe('Close')
    })

    it('should render permission mode section', () => {
      wrapper = createWrapper()
      const sections = wrapper.findAll('.section-title')
      expect(sections[0].text()).toBe('Permission Mode')
    })

    it('should render 3 permission mode options', () => {
      wrapper = createWrapper()
      const radioInputs = wrapper.findAll('input[type="radio"]')
      expect(radioInputs).toHaveLength(3)
    })

    it('should render general settings section', () => {
      wrapper = createWrapper()
      const sections = wrapper.findAll('.section-title')
      expect(sections[1].text()).toBe('General Settings')
    })

    it('should render 4 toggle settings', () => {
      wrapper = createWrapper()
      const toggles = wrapper.findAll('.toggle-item')
      expect(toggles).toHaveLength(4)
    })

    it('should render quick actions section', () => {
      wrapper = createWrapper()
      expect(wrapper.find('.actions-section').exists()).toBe(true)
      expect(wrapper.find('.action-buttons').exists()).toBe(true)
    })

    it('should render info section', () => {
      wrapper = createWrapper()
      expect(wrapper.find('.info-section').exists()).toBe(true)
    })

    it('should render footer with Cancel and Save buttons', () => {
      wrapper = createWrapper()
      const footer = wrapper.find('.modal-footer')
      expect(footer.exists()).toBe(true)
    })
  })

  describe('Permission Mode Settings', () => {
    it('should initialize with "acceptEdits" permission mode', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as ConfigModalVM

      expect(vm.config.permissionMode).toBe('acceptEdits')
    })

    it('should render all three permission options', () => {
      wrapper = createWrapper()
      const optionTitles = wrapper.findAll('.option-title')

      expect(optionTitles[0].text()).toBe('Ask')
      expect(optionTitles[1].text()).toBe('Accept Edits')
      expect(optionTitles[2].text()).toBe('Accept All')
    })

    it('should render permission option descriptions', () => {
      wrapper = createWrapper()
      const descriptions = wrapper.findAll('.option-description')

      expect(descriptions[0].text()).toContain('Prompt before every tool use')
      expect(descriptions[1].text()).toContain('Auto-accept file edits')
      expect(descriptions[2].text()).toContain('use with caution')
    })

    it('should change permission mode to "ask"', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as ConfigModalVM
      const radioInputs = wrapper.findAll('input[type="radio"]')

      await radioInputs[0].setValue(true)
      await nextTick()

      expect(vm.config.permissionMode).toBe('ask')
    })

    it('should change permission mode to "acceptAll"', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as ConfigModalVM
      const radioInputs = wrapper.findAll('input[type="radio"]')

      await radioInputs[2].setValue(true)
      await nextTick()

      expect(vm.config.permissionMode).toBe('acceptAll')
    })

    it('should have "acceptEdits" radio checked by default', () => {
      wrapper = createWrapper()
      const radioInputs = wrapper.findAll('input[type="radio"]')

      expect((radioInputs[1].element as HTMLInputElement).checked).toBe(true)
    })
  })

  describe('General Settings Toggles', () => {
    it('should have all toggles enabled by default', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as ConfigModalVM

      expect(vm.config.spinnerTipsEnabled).toBe(true)
      expect(vm.config.statusLineEnabled).toBe(true)
      expect(vm.config.notificationsEnabled).toBe(true)
      expect(vm.config.autoSave).toBe(true)
    })

    it('should render Spinner Tips toggle', () => {
      wrapper = createWrapper()
      const toggleLabels = wrapper.findAll('.toggle-label span')

      expect(toggleLabels[0].text()).toBe('Spinner Tips')
    })

    it('should render Status Line toggle', () => {
      wrapper = createWrapper()
      const toggleLabels = wrapper.findAll('.toggle-label span')

      expect(toggleLabels[1].text()).toBe('Status Line')
    })

    it('should render Notifications toggle', () => {
      wrapper = createWrapper()
      const toggleLabels = wrapper.findAll('.toggle-label span')

      expect(toggleLabels[2].text()).toBe('Notifications')
    })

    it('should render Auto-save toggle', () => {
      wrapper = createWrapper()
      const toggleLabels = wrapper.findAll('.toggle-label span')

      expect(toggleLabels[3].text()).toBe('Auto-save')
    })

    it('should toggle spinnerTipsEnabled', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as ConfigModalVM
      const checkboxes = wrapper.findAll('input[type="checkbox"]')

      expect(vm.config.spinnerTipsEnabled).toBe(true)
      await checkboxes[0].setValue(false)
      expect(vm.config.spinnerTipsEnabled).toBe(false)
    })

    it('should toggle statusLineEnabled', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as ConfigModalVM
      const checkboxes = wrapper.findAll('input[type="checkbox"]')

      expect(vm.config.statusLineEnabled).toBe(true)
      await checkboxes[1].setValue(false)
      expect(vm.config.statusLineEnabled).toBe(false)
    })

    it('should toggle notificationsEnabled', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as ConfigModalVM
      const checkboxes = wrapper.findAll('input[type="checkbox"]')

      expect(vm.config.notificationsEnabled).toBe(true)
      await checkboxes[2].setValue(false)
      expect(vm.config.notificationsEnabled).toBe(false)
    })

    it('should toggle autoSave', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as ConfigModalVM
      const checkboxes = wrapper.findAll('input[type="checkbox"]')

      expect(vm.config.autoSave).toBe(true)
      await checkboxes[3].setValue(false)
      expect(vm.config.autoSave).toBe(false)
    })

    it('should render toggle descriptions', () => {
      wrapper = createWrapper()
      const descriptions = wrapper.findAll('.toggle-description')

      expect(descriptions[0].text()).toContain('Show helpful tips')
      expect(descriptions[1].text()).toContain('Display status line')
      expect(descriptions[2].text()).toContain('Show desktop notifications')
      expect(descriptions[3].text()).toContain('Automatically save')
    })
  })

  describe('Status Line Format Section', () => {
    it('should show status line format input when statusLineEnabled is true', () => {
      wrapper = createWrapper()
      expect(wrapper.find('#status-format').exists()).toBe(true)
      expect(wrapper.find('.input-label').text()).toBe('Status Line Format')
    })

    it('should hide status line format input when statusLineEnabled is false', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as ConfigModalVM

      vm.config.statusLineEnabled = false
      await nextTick()

      expect(wrapper.find('#status-format').exists()).toBe(false)
    })

    it('should have default status line format', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as ConfigModalVM

      expect(vm.config.statusLineFormat).toBe('{{model}} | {{tokens}}')
    })

    it('should update status line format when input changes', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as ConfigModalVM
      const input = wrapper.find('#status-format')

      await input.setValue('{{model}} - {{cost}}')
      await nextTick()

      expect(vm.config.statusLineFormat).toBe('{{model}} - {{cost}}')
    })

    it('should render input hint with available variables', () => {
      wrapper = createWrapper()
      const hint = wrapper.find('.input-hint')

      expect(hint.text()).toContain('{{ model }}')
      expect(hint.text()).toContain('{{ tokens }}')
      expect(hint.text()).toContain('{{ cost }}')
      expect(hint.text()).toContain('{{ time }}')
    })
  })

  describe('Save Functionality', () => {
    it('should save config to localStorage when Save button is clicked', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      const vm = wrapper.vm as unknown as ConfigModalVM
      await nextTick()

      // Modify config
      vm.config.permissionMode = 'ask'
      vm.config.spinnerTipsEnabled = false

      // Click save button
      const buttons = wrapper.findAll('button')
      const saveButton = buttons.find((btn) =>
        btn.text().includes('Save Settings')
      )
      await saveButton!.trigger('click')
      await nextTick()

      // Verify localStorage was called
      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        'hatcher-config-settings',
        expect.stringContaining('"permissionMode":"ask"')
      )
    })

    it('should emit save event with config', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      const vm = wrapper.vm as unknown as ConfigModalVM
      await nextTick()

      vm.config.permissionMode = 'acceptAll'

      const buttons = wrapper.findAll('button')
      const saveButton = buttons.find((btn) =>
        btn.text().includes('Save Settings')
      )
      await saveButton!.trigger('click')
      await nextTick()

      expect(wrapper.emitted('save')).toBeTruthy()
      expect(wrapper.emitted('save')![0][0]).toEqual(
        expect.objectContaining({
          permissionMode: 'acceptAll',
        })
      )
    })

    it('should emit close event after save', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      await nextTick()

      const buttons = wrapper.findAll('button')
      const saveButton = buttons.find((btn) =>
        btn.text().includes('Save Settings')
      )
      await saveButton!.trigger('click')
      await nextTick()

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should show success notification when saving', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as ConfigModalVM

      vm.handleSave()
      await nextTick()

      expect(mockSuccess).toHaveBeenCalledWith(
        'Configuration saved successfully'
      )
    })

    it('should call handleSave when Save button is clicked', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as ConfigModalVM

      vm.handleSave()
      await nextTick()

      expect(wrapper.emitted('save')).toBeTruthy()
      expect(wrapper.emitted('close')).toBeTruthy()
      expect(mockSuccess).toHaveBeenCalled()
    })
  })

  describe('Reset Configuration', () => {
    it('should reset config to defaults when Reset button is clicked', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      const vm = wrapper.vm as unknown as ConfigModalVM
      await nextTick()

      // Modify config
      vm.config.permissionMode = 'ask'
      vm.config.spinnerTipsEnabled = false
      vm.config.statusLineFormat = 'custom format'

      // Click reset button
      const buttons = wrapper.findAll('button')
      const resetButton = buttons.find((btn) =>
        btn.text().includes('Reset to Defaults')
      )
      await resetButton!.trigger('click')
      await nextTick()

      // Verify reset to defaults
      expect(vm.config.permissionMode).toBe('acceptEdits')
      expect(vm.config.spinnerTipsEnabled).toBe(true)
      expect(vm.config.statusLineFormat).toBe('{{model}} | {{tokens}}')
    })

    it('should show warning notification when resetting', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as ConfigModalVM

      vm.handleResetConfig()
      await nextTick()

      expect(mockWarning).toHaveBeenCalledWith(
        'Configuration reset to defaults'
      )
    })

    it('should call handleResetConfig when Reset button is clicked', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as ConfigModalVM

      const _originalConfig = { ...vm.config }
      vm.config.permissionMode = 'ask'

      vm.handleResetConfig()
      await nextTick()

      expect(vm.config.permissionMode).toBe('acceptEdits')
      expect(mockWarning).toHaveBeenCalled()
    })
  })

  describe('Export Configuration', () => {
    it('should export config as JSON when Export button is clicked', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      const vm = wrapper.vm as unknown as ConfigModalVM
      await nextTick()

      vm.config.permissionMode = 'ask'

      const buttons = wrapper.findAll('button')
      const exportButton = buttons.find((btn) =>
        btn.text().includes('Export Config')
      )
      await exportButton!.trigger('click')
      await nextTick()

      expect(window.Blob).toHaveBeenCalled()
      expect(window.URL.createObjectURL).toHaveBeenCalled()
      expect(document.createElement).toHaveBeenCalledWith('a')
    })

    it('should create correct blob for export', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as ConfigModalVM

      vm.config.permissionMode = 'acceptAll'
      vm.handleExportConfig()

      expect(window.Blob).toHaveBeenCalledWith(
        [expect.stringContaining('"permissionMode": "acceptAll"')],
        { type: 'application/json' }
      )
    })

    it('should set correct filename for export', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as ConfigModalVM

      vm.handleExportConfig()

      const mockAnchor = document.createElement('a') as HTMLAnchorElement
      expect(mockAnchor.download).toBe('hatcher-config.json')
    })

    it('should show success notification when exporting', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as ConfigModalVM

      vm.handleExportConfig()
      await nextTick()

      expect(mockSuccess).toHaveBeenCalledWith('Configuration exported')
    })

    it('should revoke object URL after export', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as ConfigModalVM

      vm.handleExportConfig()

      expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    })
  })

  describe('Modal Interactions', () => {
    it('should emit close event when close button is clicked', async () => {
      wrapper = createWrapper()
      const closeButton = wrapper.find('.close-button')
      await closeButton.trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should emit close event when overlay is clicked', async () => {
      wrapper = createWrapper()
      const overlay = wrapper.find('.modal-overlay')
      await overlay.trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should not emit close when modal container is clicked', async () => {
      wrapper = createWrapper()
      const container = wrapper.find('.modal-container')
      await container.trigger('click')

      expect(wrapper.emitted('close')).toBeFalsy()
    })

    it('should call handleOverlayClick when overlay is clicked', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as ConfigModalVM

      vm.handleOverlayClick()

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should emit close event when Cancel button is clicked', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      await nextTick()

      const buttons = wrapper.findAll('button')
      const cancelButton = buttons.find((btn) => btn.text() === 'Cancel')
      await cancelButton!.trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
    })
  })

  describe('Component Lifecycle', () => {
    it('should initialize with default config values', () => {
      wrapper = createWrapper({ visible: false })
      const vm = wrapper.vm as unknown as ConfigModalVM

      expect(vm.config).toEqual({
        permissionMode: 'acceptEdits',
        spinnerTipsEnabled: true,
        statusLineEnabled: true,
        notificationsEnabled: true,
        autoSave: true,
        statusLineFormat: '{{model}} | {{tokens}}',
      })
    })

    it('should cleanup properly when unmounted', () => {
      wrapper = createWrapper()
      expect(() => wrapper.unmount()).not.toThrow()
    })
  })

  describe('Accessibility', () => {
    it('should have proper aria-label on close button', () => {
      wrapper = createWrapper()
      const closeButton = wrapper.find('.close-button')
      expect(closeButton.attributes('aria-label')).toBe('Close')
    })

    it('should have proper label for status format input', () => {
      wrapper = createWrapper()
      const label = wrapper.find('.input-label')
      expect(label.attributes('for')).toBe('status-format')
    })

    it('should have proper radio button structure', () => {
      wrapper = createWrapper()
      const radioInputs = wrapper.findAll('input[type="radio"]')
      expect(radioInputs).toHaveLength(3)
      radioInputs.forEach((radio) => {
        expect(radio.attributes('name')).toBe('permission')
      })
    })

    it('should have proper checkbox structure', () => {
      wrapper = createWrapper()
      const checkboxes = wrapper.findAll('input[type="checkbox"]')
      expect(checkboxes).toHaveLength(4)
    })
  })

  describe('Edge Cases', () => {
    it('should handle rapid toggle changes', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as ConfigModalVM
      const checkboxes = wrapper.findAll('input[type="checkbox"]')

      await checkboxes[0].setValue(false)
      await checkboxes[0].setValue(true)
      await checkboxes[0].setValue(false)

      expect(vm.config.spinnerTipsEnabled).toBe(false)
    })

    it('should handle empty status line format', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as ConfigModalVM
      const input = wrapper.find('#status-format')

      await input.setValue('')
      await nextTick()

      expect(vm.config.statusLineFormat).toBe('')
    })

    it('should handle long status line format', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as ConfigModalVM
      const input = wrapper.find('#status-format')

      const longFormat =
        '{{model}} | {{tokens}} | {{cost}} | {{time}} | more stuff'
      await input.setValue(longFormat)
      await nextTick()

      expect(vm.config.statusLineFormat).toBe(longFormat)
    })

    it('should handle multiple rapid permission mode changes', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as ConfigModalVM
      const radioInputs = wrapper.findAll('input[type="radio"]')

      await radioInputs[0].setValue(true)
      await radioInputs[1].setValue(true)
      await radioInputs[2].setValue(true)

      expect(vm.config.permissionMode).toBe('acceptAll')
    })

    it('should handle disabling and re-enabling status line', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as ConfigModalVM

      expect(wrapper.find('#status-format').exists()).toBe(true)

      vm.config.statusLineEnabled = false
      await nextTick()
      expect(wrapper.find('#status-format').exists()).toBe(false)

      vm.config.statusLineEnabled = true
      await nextTick()
      expect(wrapper.find('#status-format').exists()).toBe(true)
    })
  })

  describe('Integration Tests', () => {
    it('should complete full workflow: change settings and save', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      await nextTick()

      const vm = wrapper.vm as unknown as ConfigModalVM

      // Change permission mode
      const radioInputs = wrapper.findAll('input[type="radio"]')
      await radioInputs[0].setValue(true)

      // Toggle some settings
      const checkboxes = wrapper.findAll('input[type="checkbox"]')
      await checkboxes[0].setValue(false)
      await checkboxes[2].setValue(false)

      // Change status line format
      const input = wrapper.find('#status-format')
      await input.setValue('{{model}} - {{cost}}')

      expect(vm.config.permissionMode).toBe('ask')
      expect(vm.config.spinnerTipsEnabled).toBe(false)
      expect(vm.config.notificationsEnabled).toBe(false)
      expect(vm.config.statusLineFormat).toBe('{{model}} - {{cost}}')

      // Save settings
      const buttons = wrapper.findAll('button')
      const saveButton = buttons.find((btn) =>
        btn.text().includes('Save Settings')
      )
      await saveButton!.trigger('click')
      await nextTick()

      expect(window.localStorage.setItem).toHaveBeenCalled()
      expect(wrapper.emitted('save')).toBeTruthy()
      expect(wrapper.emitted('close')).toBeTruthy()
      expect(mockSuccess).toHaveBeenCalledWith(
        'Configuration saved successfully'
      )
    })

    it('should complete full workflow: reset and export', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      await nextTick()

      const vm = wrapper.vm as unknown as ConfigModalVM

      // Change some settings
      vm.config.permissionMode = 'acceptAll'
      vm.config.spinnerTipsEnabled = false

      // Reset to defaults
      const buttons = wrapper.findAll('button')
      const resetButton = buttons.find((btn) =>
        btn.text().includes('Reset to Defaults')
      )
      await resetButton!.trigger('click')
      await nextTick()

      expect(vm.config.permissionMode).toBe('acceptEdits')
      expect(mockWarning).toHaveBeenCalledWith(
        'Configuration reset to defaults'
      )

      // Export configuration
      const exportButton = buttons.find((btn) =>
        btn.text().includes('Export Config')
      )
      await exportButton!.trigger('click')
      await nextTick()

      expect(window.Blob).toHaveBeenCalled()
      expect(mockSuccess).toHaveBeenCalledWith('Configuration exported')
    })

    it('should complete full workflow: cancel without saving', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      await nextTick()

      const vm = wrapper.vm as unknown as ConfigModalVM

      // Change settings
      vm.config.permissionMode = 'ask'
      vm.config.autoSave = false

      // Click cancel
      const buttons = wrapper.findAll('button')
      const cancelButton = buttons.find((btn) => btn.text() === 'Cancel')
      await cancelButton!.trigger('click')

      // Verify only close was emitted, no save
      expect(wrapper.emitted('save')).toBeFalsy()
      expect(wrapper.emitted('close')).toBeTruthy()
      expect(window.localStorage.setItem).not.toHaveBeenCalled()
    })
  })

  describe('ConfigSettings Type Validation', () => {
    it('should have all required config properties', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as ConfigModalVM

      expect(vm.config).toHaveProperty('permissionMode')
      expect(vm.config).toHaveProperty('spinnerTipsEnabled')
      expect(vm.config).toHaveProperty('statusLineEnabled')
      expect(vm.config).toHaveProperty('notificationsEnabled')
      expect(vm.config).toHaveProperty('autoSave')
      expect(vm.config).toHaveProperty('statusLineFormat')
    })

    it('should accept valid permission mode values', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as ConfigModalVM

      vm.config.permissionMode = 'ask'
      expect(vm.config.permissionMode).toBe('ask')

      vm.config.permissionMode = 'acceptEdits'
      expect(vm.config.permissionMode).toBe('acceptEdits')

      vm.config.permissionMode = 'acceptAll'
      expect(vm.config.permissionMode).toBe('acceptAll')
    })

    it('should have boolean types for toggle settings', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as ConfigModalVM

      expect(typeof vm.config.spinnerTipsEnabled).toBe('boolean')
      expect(typeof vm.config.statusLineEnabled).toBe('boolean')
      expect(typeof vm.config.notificationsEnabled).toBe('boolean')
      expect(typeof vm.config.autoSave).toBe('boolean')
    })

    it('should have string type for statusLineFormat', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as ConfigModalVM

      expect(typeof vm.config.statusLineFormat).toBe('string')
    })
  })
})
