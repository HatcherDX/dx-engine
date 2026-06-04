/**
 * @fileoverview Comprehensive test suite for LogoutModal component.
 *
 * @description
 * Tests all functionality including modal visibility, user info display,
 * logout confirmation, clear local data option, and event emissions.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick, type ComponentPublicInstance } from 'vue'
import LogoutModal from './LogoutModal.vue'
import BaseIcon from '../atoms/BaseIcon.vue'
import BaseButton from '../atoms/BaseButton.vue'

/**
 * Type definition for Logout Modal VM instance.
 */
interface LogoutModalVM {
  userName: string
  userEmail: string
  clearLocalData: boolean
  isLoggingOut: boolean
  handleLogout: () => void
  handleCancel: () => void
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

describe('LogoutModal.vue', () => {
  let wrapper: VueWrapper<ComponentPublicInstance>

  /**
   * Cleanup after each test.
   */
  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  /**
   * Helper to mount component.
   */
  const createWrapper = (props = {}, options = {}) => {
    return mount(LogoutModal, {
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

    it('should render modal title "Logout"', () => {
      wrapper = createWrapper()
      expect(wrapper.find('.modal-title').text()).toBe('Logout')
    })

    it('should render close button with aria-label', () => {
      wrapper = createWrapper()
      const closeButton = wrapper.find('.close-button')
      expect(closeButton.exists()).toBe(true)
      expect(closeButton.attributes('aria-label')).toBe('Close')
    })

    it('should render user info section', () => {
      wrapper = createWrapper()
      expect(wrapper.find('.user-info').exists()).toBe(true)
    })

    it('should render avatar with initials', () => {
      wrapper = createWrapper()
      const avatar = wrapper.find('.avatar')
      expect(avatar.exists()).toBe(true)
      expect(avatar.text()).toBe('JD')
    })

    it('should render user name', () => {
      wrapper = createWrapper()
      const userName = wrapper.find('.user-name')
      expect(userName.exists()).toBe(true)
      expect(userName.text()).toBe('John Doe')
    })

    it('should render user email', () => {
      wrapper = createWrapper()
      const userEmail = wrapper.find('.user-email')
      expect(userEmail.exists()).toBe(true)
      expect(userEmail.text()).toBe('john.doe@example.com')
    })

    it('should render confirmation message', () => {
      wrapper = createWrapper()
      const message = wrapper.find('.confirmation-message')
      expect(message.exists()).toBe(true)
      expect(message.text()).toContain('Are you sure you want to logout?')
    })

    it('should render warning message', () => {
      wrapper = createWrapper()
      const warning = wrapper.find('.warning')
      expect(warning.exists()).toBe(true)
      expect(warning.text()).toBe(
        'Any unsaved changes will be preserved locally.'
      )
    })

    it('should render clear local data checkbox', () => {
      wrapper = createWrapper()
      const checkbox = wrapper.find('input[type="checkbox"]')
      expect(checkbox.exists()).toBe(true)
    })

    it('should render checkbox label', () => {
      wrapper = createWrapper()
      const label = wrapper.find('.checkbox-label span')
      expect(label.text()).toBe('Clear local data')
    })

    it('should render footer with Cancel and Logout buttons', () => {
      wrapper = createWrapper()
      const footer = wrapper.find('.modal-footer')
      expect(footer.exists()).toBe(true)
    })
  })

  describe('User Initials Computed Property', () => {
    it('should compute initials correctly for two-word name', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as LogoutModalVM

      expect(vm.initials).toBe('JD')
    })

    it('should compute initials correctly when userName changes', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as LogoutModalVM

      vm.userName = 'Alice Smith'
      await nextTick()

      expect(vm.initials).toBe('AS')
    })

    it('should compute initials correctly for single word name', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as LogoutModalVM

      vm.userName = 'Madonna'
      await nextTick()

      expect(vm.initials).toBe('M')
    })

    it('should compute initials correctly for three-word name', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as LogoutModalVM

      vm.userName = 'John Paul Jones'
      await nextTick()

      expect(vm.initials).toBe('JPJ')
    })
  })

  describe('Clear Local Data Checkbox', () => {
    it('should be unchecked by default', () => {
      wrapper = createWrapper()
      const checkbox = wrapper.find('input[type="checkbox"]')
      expect((checkbox.element as HTMLInputElement).checked).toBe(false)
    })

    it('should toggle when clicked', async () => {
      wrapper = createWrapper()
      const checkbox = wrapper.find('input[type="checkbox"]')

      await checkbox.setValue(true)
      expect((checkbox.element as HTMLInputElement).checked).toBe(true)

      await checkbox.setValue(false)
      expect((checkbox.element as HTMLInputElement).checked).toBe(false)
    })

    it('should update clearLocalData ref when toggled', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as LogoutModalVM
      const checkbox = wrapper.find('input[type="checkbox"]')

      expect(vm.clearLocalData).toBe(false)

      await checkbox.setValue(true)
      expect(vm.clearLocalData).toBe(true)
    })
  })

  describe('Logout Functionality', () => {
    it('should emit logout event when logout button is clicked', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      await nextTick()

      const buttons = wrapper.findAll('button')
      const logoutButton = buttons.find((btn) => btn.text().includes('Logout'))
      await logoutButton!.trigger('click')
      await nextTick()

      expect(wrapper.emitted('logout')).toBeTruthy()
    })

    it('should emit logout event with clearLocalData: false by default', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      await nextTick()

      const buttons = wrapper.findAll('button')
      const logoutButton = buttons.find((btn) => btn.text().includes('Logout'))
      await logoutButton!.trigger('click')
      await nextTick()

      expect(wrapper.emitted('logout')![0]).toEqual([{ clearLocalData: false }])
    })

    it('should emit logout event with clearLocalData: true when checkbox is checked', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      await nextTick()

      const checkbox = wrapper.find('input[type="checkbox"]')
      await checkbox.setValue(true)

      const buttons = wrapper.findAll('button')
      const logoutButton = buttons.find((btn) => btn.text().includes('Logout'))
      await logoutButton!.trigger('click')
      await nextTick()

      expect(wrapper.emitted('logout')![0]).toEqual([{ clearLocalData: true }])
    })

    it('should emit close event after logout', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      await nextTick()

      const buttons = wrapper.findAll('button')
      const logoutButton = buttons.find((btn) => btn.text().includes('Logout'))
      await logoutButton!.trigger('click')
      await nextTick()

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should call handleLogout when logout button is clicked', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as LogoutModalVM

      vm.handleLogout()
      await nextTick()

      expect(wrapper.emitted('logout')).toBeTruthy()
      expect(wrapper.emitted('close')).toBeTruthy()
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
      const vm = wrapper.vm as unknown as LogoutModalVM

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
      const cancelButton = buttons.find((btn) => btn.text().includes('Cancel'))
      await cancelButton!.trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
    })
  })

  describe('Component State', () => {
    it('should initialize with default userName', () => {
      wrapper = createWrapper({ visible: false })
      const vm = wrapper.vm as unknown as LogoutModalVM

      expect(vm.userName).toBe('John Doe')
    })

    it('should initialize with default userEmail', () => {
      wrapper = createWrapper({ visible: false })
      const vm = wrapper.vm as unknown as LogoutModalVM

      expect(vm.userEmail).toBe('john.doe@example.com')
    })

    it('should initialize with clearLocalData as false', () => {
      wrapper = createWrapper({ visible: false })
      const vm = wrapper.vm as unknown as LogoutModalVM

      expect(vm.clearLocalData).toBe(false)
    })

    it('should allow updating userName', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as LogoutModalVM

      vm.userName = 'Jane Smith'
      await nextTick()

      expect(vm.userName).toBe('Jane Smith')
    })

    it('should allow updating userEmail', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as LogoutModalVM

      vm.userEmail = 'jane.smith@example.com'
      await nextTick()

      expect(vm.userEmail).toBe('jane.smith@example.com')
    })
  })

  describe('Component Lifecycle', () => {
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

    it('should have proper checkbox input', () => {
      wrapper = createWrapper()
      const checkbox = wrapper.find('input[type="checkbox"]')
      expect(checkbox.exists()).toBe(true)
    })

    it('should have proper label for checkbox', () => {
      wrapper = createWrapper()
      const label = wrapper.find('.checkbox-label')
      expect(label.exists()).toBe(true)
      expect(label.find('input[type="checkbox"]').exists()).toBe(true)
    })
  })

  describe('Integration Tests', () => {
    it('should complete full workflow: toggle checkbox and logout', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      await nextTick()

      // Toggle checkbox
      const checkbox = wrapper.find('input[type="checkbox"]')
      await checkbox.setValue(true)
      expect((checkbox.element as HTMLInputElement).checked).toBe(true)

      // Click logout
      const buttons = wrapper.findAll('button')
      const logoutButton = buttons.find((btn) => btn.text().includes('Logout'))
      await logoutButton!.trigger('click')
      await nextTick()

      // Verify emissions
      expect(wrapper.emitted('logout')).toBeTruthy()
      expect(wrapper.emitted('logout')![0]).toEqual([{ clearLocalData: true }])
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should complete full workflow: logout without clearing data', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      await nextTick()

      // Click logout without checking checkbox
      const buttons = wrapper.findAll('button')
      const logoutButton = buttons.find((btn) => btn.text().includes('Logout'))
      await logoutButton!.trigger('click')
      await nextTick()

      // Verify emissions
      expect(wrapper.emitted('logout')).toBeTruthy()
      expect(wrapper.emitted('logout')![0]).toEqual([{ clearLocalData: false }])
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should complete full workflow: cancel without logout', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      await nextTick()

      // Click cancel
      const buttons = wrapper.findAll('button')
      const cancelButton = buttons.find((btn) => btn.text().includes('Cancel'))
      await cancelButton!.trigger('click')

      // Verify only close was emitted
      expect(wrapper.emitted('logout')).toBeFalsy()
      expect(wrapper.emitted('close')).toBeTruthy()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty userName gracefully', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as LogoutModalVM

      vm.userName = ''
      await nextTick()

      expect(vm.initials).toBe('')
    })

    it('should handle userName with extra spaces', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as LogoutModalVM

      vm.userName = 'John  Doe'
      await nextTick()

      // Split by space creates empty string in between
      expect(vm.initials).toContain('J')
      expect(vm.initials).toContain('D')
    })

    it('should handle rapid checkbox toggles', async () => {
      wrapper = createWrapper()
      const checkbox = wrapper.find('input[type="checkbox"]')

      await checkbox.setValue(true)
      await checkbox.setValue(false)
      await checkbox.setValue(true)
      await checkbox.setValue(false)

      expect((checkbox.element as HTMLInputElement).checked).toBe(false)
    })

    it('should handle multiple logout calls', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as LogoutModalVM

      vm.handleLogout()
      vm.handleLogout()
      vm.handleLogout()

      expect(wrapper.emitted('logout')).toHaveLength(3)
      expect(wrapper.emitted('close')).toHaveLength(3)
    })
  })
})
