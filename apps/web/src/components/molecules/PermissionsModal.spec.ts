/**
 * @fileoverview Comprehensive test suite for PermissionsModal component.
 *
 * @description
 * Tests all functionality including modal visibility, permission mode selection,
 * tool category management, auto-approve/reject actions, save functionality,
 * and localStorage integration.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import type { ComponentPublicInstance } from 'vue'
import PermissionsModal from './PermissionsModal.vue'
import BaseIcon from '../atoms/BaseIcon.vue'
import BaseButton from '../atoms/BaseButton.vue'

/**
 * Type definition for tool item.
 */
interface ToolItem {
  name: string
  approved: boolean
  rejected: boolean
  autoApprove?: boolean
  requireApproval?: boolean
}

/**
 * Type definition for Permissions Modal VM instance.
 */
interface PermissionsModalVM {
  fileTools: ToolItem[]
  shellTools: ToolItem[]
  gitTools: ToolItem[]
  webTools: ToolItem[]
  permissionMode: string
  approveAll: () => void
  rejectAll: () => void
  savePermissions: () => void
}

/**
 * Mock composables.
 */
vi.mock('../../composables/useNotifications', () => ({
  useNotifications: () => ({
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}))

describe('PermissionsModal.vue', () => {
  let wrapper: VueWrapper<ComponentPublicInstance>

  /**
   * Setup before each test.
   */
  beforeEach(() => {
    // Clear localStorage
    window.localStorage.clear()
  })

  /**
   * Helper to mount component.
   */
  const createWrapper = (props = {}) => {
    return mount(PermissionsModal, {
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

    it('should render modal title', () => {
      wrapper = createWrapper()
      expect(wrapper.find('.modal-title').text()).toBe('Tool Permissions')
    })

    it('should render all permission mode badges', () => {
      wrapper = createWrapper()
      const badges = wrapper.findAll('.mode-badge')
      expect(badges).toHaveLength(3)
      expect(badges[0].text()).toContain('Ask')
      expect(badges[1].text()).toContain('Accept Edits')
      expect(badges[2].text()).toContain('Accept All')
    })

    it('should render all tool categories', () => {
      wrapper = createWrapper()
      const categories = wrapper.findAll('.tool-category')
      expect(categories).toHaveLength(4) // File, Shell, Git, Web
    })

    it('should render file operations tools', () => {
      wrapper = createWrapper()
      const fileTools = wrapper.findAll('.tool-item')
      expect(fileTools.length).toBeGreaterThan(0)
    })
  })

  describe('Permission Mode Selection', () => {
    it('should have "acceptEdits" as default mode', () => {
      wrapper = createWrapper()
      const activeModeBadge = wrapper.find('.mode-badge.active')
      expect(activeModeBadge.text()).toContain('Accept Edits')
    })

    it('should switch to "ask" mode when clicked', async () => {
      wrapper = createWrapper()
      const askBadge = wrapper.findAll('.mode-badge')[0]
      await askBadge.trigger('click')
      expect(askBadge.classes()).toContain('active')
    })

    it('should switch to "acceptAll" mode when clicked', async () => {
      wrapper = createWrapper()
      const acceptAllBadge = wrapper.findAll('.mode-badge')[2]
      await acceptAllBadge.trigger('click')
      expect(acceptAllBadge.classes()).toContain('active')
    })

    it('should display correct description for "ask" mode', async () => {
      wrapper = createWrapper()
      const askBadge = wrapper.findAll('.mode-badge')[0]
      await askBadge.trigger('click')
      const description = wrapper.find('.mode-description')
      expect(description.text()).toContain('Prompt before every tool use')
    })

    it('should display correct description for "acceptEdits" mode', () => {
      wrapper = createWrapper()
      const description = wrapper.find('.mode-description')
      expect(description.text()).toContain('Auto-approve file edits')
    })

    it('should display correct description for "acceptAll" mode', async () => {
      wrapper = createWrapper()
      const acceptAllBadge = wrapper.findAll('.mode-badge')[2]
      await acceptAllBadge.trigger('click')
      const description = wrapper.find('.mode-description')
      expect(description.text()).toContain('Auto-approve all tool uses')
    })

    it('should return empty string for unknown mode', async () => {
      wrapper = createWrapper()
      // Access component instance to test getModeDescription directly
      const vm = wrapper.vm as unknown as PermissionsModalVM
      expect(vm.getModeDescription('unknown')).toBe('')
    })
  })

  describe('Tool Toggle Functionality', () => {
    it('should toggle tool auto-approve status', async () => {
      wrapper = createWrapper()
      const firstToggle = wrapper.find('.tool-item .toggle input')
      const initialChecked = (firstToggle.element as HTMLInputElement).checked

      await firstToggle.setValue(!initialChecked)
      expect((firstToggle.element as HTMLInputElement).checked).toBe(
        !initialChecked
      )
    })

    it('should have Read tool auto-approved by default', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as PermissionsModalVM
      const readTool = vm.fileTools.find((t: ToolItem) => t.name === 'Read')
      expect(readTool.autoApprove).toBe(true)
    })

    it('should have Write tool not auto-approved by default', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as PermissionsModalVM
      const writeTool = vm.fileTools.find((t: ToolItem) => t.name === 'Write')
      expect(writeTool.autoApprove).toBe(false)
    })

    it('should have Delete tool not auto-approved by default', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as PermissionsModalVM
      const deleteTool = vm.fileTools.find((t: ToolItem) => t.name === 'Delete')
      expect(deleteTool.autoApprove).toBe(false)
    })

    it('should have Bash tool not auto-approved by default', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as PermissionsModalVM
      const bashTool = vm.shellTools.find((t: ToolItem) => t.name === 'Bash')
      expect(bashTool.autoApprove).toBe(false)
    })
  })

  describe('Quick Actions', () => {
    it('should auto-approve all tools when "Auto-approve All" is clicked', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as PermissionsModalVM

      // Call the method directly
      vm.handleApproveAll()

      // Verify all tools are auto-approved
      vm.fileTools.forEach((tool: ToolItem) => {
        expect(tool.autoApprove).toBe(true)
      })
      vm.shellTools.forEach((tool: ToolItem) => {
        expect(tool.autoApprove).toBe(true)
      })
      vm.gitTools.forEach((tool: ToolItem) => {
        expect(tool.autoApprove).toBe(true)
      })
      vm.webTools.forEach((tool: ToolItem) => {
        expect(tool.autoApprove).toBe(true)
      })
    })

    it('should require approval for all tools when "Require Approval for All" is clicked', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as PermissionsModalVM

      // Call the method directly
      vm.handleRejectAll()

      // Verify all tools require approval
      vm.fileTools.forEach((tool: ToolItem) => {
        expect(tool.autoApprove).toBe(false)
      })
      vm.shellTools.forEach((tool: ToolItem) => {
        expect(tool.autoApprove).toBe(false)
      })
      vm.gitTools.forEach((tool: ToolItem) => {
        expect(tool.autoApprove).toBe(false)
      })
      vm.webTools.forEach((tool: ToolItem) => {
        expect(tool.autoApprove).toBe(false)
      })
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
  })

  describe('Save Functionality', () => {
    it('should emit save event with permissions config when Save button is clicked', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as PermissionsModalVM

      // Call handleSave directly
      vm.handleSave()

      // Check that save event was emitted
      expect(wrapper.emitted('save')).toBeTruthy()

      // Verify the emitted config structure
      const emittedConfig = wrapper.emitted('save')![0][0] as Record<
        string,
        unknown
      >
      expect(emittedConfig).toHaveProperty('mode')
      expect(emittedConfig).toHaveProperty('fileTools')
      expect(emittedConfig).toHaveProperty('shellTools')
      expect(emittedConfig).toHaveProperty('gitTools')
      expect(emittedConfig).toHaveProperty('webTools')
    })

    it('should save all required configuration fields', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as PermissionsModalVM

      // Modify some settings to test
      vm.permissionMode = 'ask'
      const readTool = vm.fileTools.find((t: ToolItem) => t.name === 'Read')
      readTool.autoApprove = false

      // Call handleSave directly
      vm.handleSave()

      // Verify the emitted config has all required fields and values
      const emittedConfig = wrapper.emitted('save')![0][0] as Record<
        string,
        unknown
      >

      expect(emittedConfig.mode).toBe('ask')
      expect(emittedConfig.fileTools).toBeDefined()
      expect(emittedConfig.shellTools).toBeDefined()
      expect(emittedConfig.gitTools).toBeDefined()
      expect(emittedConfig.webTools).toBeDefined()

      // Verify the modified tool was saved correctly
      const savedReadTool = emittedConfig.fileTools.find(
        (t: ToolItem) => t.name === 'Read'
      )
      expect(savedReadTool.autoApprove).toBe(false)
    })

    it('should emit close event after saving', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as PermissionsModalVM

      // Call handleSave directly
      vm.handleSave()

      // Should emit both save and close
      expect(wrapper.emitted('save')).toBeTruthy()
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should save correct permission mode', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as PermissionsModalVM

      // Switch to "ask" mode
      vm.permissionMode = 'ask'

      // Save
      vm.handleSave()

      // Check emitted config has correct mode
      const emittedConfig = wrapper.emitted('save')![0][0] as Record<
        string,
        unknown
      >
      expect(emittedConfig.mode).toBe('ask')
    })
  })

  describe('Tool Categories Content', () => {
    it('should render correct number of file tools', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as PermissionsModalVM
      expect(vm.fileTools).toHaveLength(5) // Read, Write, Edit, Delete, Glob
    })

    it('should render correct number of shell tools', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as PermissionsModalVM
      expect(vm.shellTools).toHaveLength(2) // Bash, Grep
    })

    it('should render correct number of git tools', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as PermissionsModalVM
      expect(vm.gitTools).toHaveLength(5) // status, diff, add, commit, push
    })

    it('should render correct number of web tools', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as PermissionsModalVM
      expect(vm.webTools).toHaveLength(2) // WebFetch, WebSearch
    })

    it('should display tool names and descriptions', () => {
      wrapper = createWrapper()
      const toolNames = wrapper.findAll('.tool-name')
      const toolDescriptions = wrapper.findAll('.tool-description')

      expect(toolNames.length).toBeGreaterThan(0)
      expect(toolDescriptions.length).toBeGreaterThan(0)
      expect(toolNames[0].text()).toBeTruthy()
      expect(toolDescriptions[0].text()).toBeTruthy()
    })

    it('should display tool count for each category', () => {
      wrapper = createWrapper()
      const toolCounts = wrapper.findAll('.tool-count')
      expect(toolCounts.length).toBe(4) // 4 categories
      expect(toolCounts[0].text()).toContain('tools')
    })
  })

  describe('Info Section', () => {
    it('should render info section with warnings', () => {
      wrapper = createWrapper()
      const infoItems = wrapper.findAll('.info-item')
      expect(infoItems.length).toBeGreaterThan(0)
    })

    it('should display auto-approve info message', () => {
      wrapper = createWrapper()
      const infoSection = wrapper.find('.info-section')
      expect(infoSection.text()).toContain('Auto-approved tools')
    })

    it('should display caution warning', () => {
      wrapper = createWrapper()
      const infoSection = wrapper.find('.info-section')
      expect(infoSection.text()).toContain('Be cautious')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty localStorage gracefully', () => {
      window.localStorage.clear()
      wrapper = createWrapper()
      expect(wrapper.exists()).toBe(true)
    })

    it('should stop event propagation when container is clicked', async () => {
      wrapper = createWrapper()
      const container = wrapper.find('.modal-container')
      const clickEvent = new Event('click', { bubbles: true })
      const _stopPropagationSpy = vi.spyOn(clickEvent, 'stopPropagation')

      await container.element.dispatchEvent(clickEvent)
      // Event propagation is stopped by @click.stop in template
      expect(wrapper.emitted('close')).toBeFalsy()
    })

    it('should handle rapid mode switching', async () => {
      wrapper = createWrapper()
      const badges = wrapper.findAll('.mode-badge')

      await badges[0].trigger('click')
      await badges[1].trigger('click')
      await badges[2].trigger('click')
      await badges[0].trigger('click')

      expect(badges[0].classes()).toContain('active')
    })

    it('should preserve tool changes when switching modes', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as PermissionsModalVM

      // Modify a tool
      const readTool = vm.fileTools.find((t: ToolItem) => t.name === 'Read')
      readTool.autoApprove = false

      // Switch modes
      const badges = wrapper.findAll('.mode-badge')
      await badges[2].trigger('click')

      // Tool change should persist
      expect(readTool.autoApprove).toBe(false)
    })
  })

  describe('Component Lifecycle', () => {
    it('should initialize with correct default values', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as PermissionsModalVM

      expect(vm.permissionMode).toBe('acceptEdits')
      expect(vm.fileTools).toBeDefined()
      expect(vm.shellTools).toBeDefined()
      expect(vm.gitTools).toBeDefined()
      expect(vm.webTools).toBeDefined()
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

    it('should have proper checkbox inputs for toggles', () => {
      wrapper = createWrapper()
      const toggleInputs = wrapper.findAll('.toggle input[type="checkbox"]')
      expect(toggleInputs.length).toBeGreaterThan(0)
    })
  })
})
