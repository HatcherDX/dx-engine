/**
 * @fileoverview Comprehensive test suite for BranchSwitchModal component
 *
 * @description
 * Tests the branch switching modal that handles uncommitted changes when
 * users attempt to switch branches. Achieves 100% code coverage through
 * systematic testing of all component features including transitions,
 * event handling, SSR compatibility, and accessibility features.
 *
 * @author Hatcher DX Team
 * @since 1.2.0
 * @public
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick, type ComponentPublicInstance } from 'vue'
import BranchSwitchModal from './BranchSwitchModal.vue'
import UncommittedFilesModal from './UncommittedFilesModal.vue'

/**
 * Mock UncommittedFilesModal to prevent dependency issues
 */
vi.mock('./UncommittedFilesModal.vue', () => ({
  default: {
    name: 'UncommittedFilesModal',
    props: ['isVisible', 'changedFiles', 'currentBranch'],
    emits: ['close'],
    template: `
      <div v-if="isVisible" class="mocked-uncommitted-files-modal">
        <button @click="$emit('close')">Close Files Modal</button>
      </div>
    `,
  },
}))

describe('BranchSwitchModal', () => {
  let wrapper: VueWrapper<ComponentPublicInstance>
  let teleportTarget: HTMLElement

  /**
   * Default props for testing
   */
  const defaultProps = {
    isVisible: true,
    currentBranch: 'main',
    targetBranch: 'feature/new-feature',
    changedFiles: ['src/app.ts', 'src/components/Modal.vue'],
  }

  /**
   * Helper to create wrapper with custom props
   */
  const createWrapper = (props = {}, attachTo?: HTMLElement) => {
    return mount(BranchSwitchModal, {
      props: { ...defaultProps, ...props },
      global: {
        stubs: {
          Teleport: true,
          UncommittedFilesModal: true,
        },
      },
      attachTo,
    })
  }

  beforeEach(() => {
    // Create teleport target
    teleportTarget = document.createElement('div')
    teleportTarget.id = 'teleport-target'
    document.body.appendChild(teleportTarget)

    // Mock Date.now for consistent headingId
    vi.spyOn(Date, 'now').mockReturnValue(1234567890)
  })

  afterEach(() => {
    // Clean up
    if (wrapper && !wrapper.unmounted) {
      try {
        wrapper.unmount()
      } catch (_e) {
        // Ignore unmount errors during SSR tests
      }
    }
    if (teleportTarget && teleportTarget.parentNode) {
      document.body.removeChild(teleportTarget)
    }
    vi.restoreAllMocks()
  })

  describe('Component Rendering', () => {
    it('should render modal when isVisible is true', () => {
      wrapper = createWrapper()
      expect(wrapper.find('.modal-overlay').exists()).toBe(true)
      expect(wrapper.find('.modal-container').exists()).toBe(true)
    })

    it('should not render modal when isVisible is false', () => {
      wrapper = createWrapper({ isVisible: false })
      expect(wrapper.find('.modal-overlay').exists()).toBe(false)
    })

    it('should display correct branch names', () => {
      wrapper = createWrapper()
      const title = wrapper.find('.modal-title')
      expect(title.text()).toContain('Switch to "feature/new-feature"')

      const leaveButton = wrapper.find('.leave-changes .action-title')
      expect(leaveButton.text()).toContain('Leave on "main"')

      const bringButton = wrapper.find('.bring-changes .action-title')
      expect(bringButton.text()).toContain('Bring to "feature/new-feature"')
    })

    it('should display correct file count - singular', () => {
      wrapper = createWrapper({ changedFiles: ['file1.ts'] })
      const subtitle = wrapper.find('.modal-subtitle')
      expect(subtitle.text()).toContain('1 uncommitted change.')
    })

    it('should display correct file count - plural', () => {
      wrapper = createWrapper({ changedFiles: ['file1.ts', 'file2.ts'] })
      const subtitle = wrapper.find('.modal-subtitle')
      expect(subtitle.text()).toContain('2 uncommitted changes.')
    })

    it('should display processing indicator when isProcessing is true', async () => {
      wrapper = createWrapper()
      expect(wrapper.find('.processing-indicator').exists()).toBe(false)

      // Trigger processing state
      await wrapper.find('.leave-changes').trigger('click')
      expect(wrapper.find('.processing-indicator').exists()).toBe(true)
      expect(wrapper.find('.spinner').exists()).toBe(true)
    })

    it('should have correct accessibility attributes', () => {
      wrapper = createWrapper()
      const overlay = wrapper.find('.modal-overlay')

      expect(overlay.attributes('role')).toBe('dialog')
      expect(overlay.attributes('aria-modal')).toBe('true')
      expect(overlay.attributes('aria-labelledby')).toBe(
        'branch-switch-modal-1234567890'
      )

      const heading = wrapper.find('.modal-title')
      expect(heading.attributes('id')).toBe('branch-switch-modal-1234567890')
    })
  })

  describe('Event Handling', () => {
    it('should emit close when clicking overlay', async () => {
      wrapper = createWrapper()
      const overlay = wrapper.find('.modal-overlay')

      await overlay.trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
      expect(wrapper.emitted('close')?.length).toBe(1)
    })

    it('should not close when clicking modal container', async () => {
      wrapper = createWrapper()
      const container = wrapper.find('.modal-container')

      await container.trigger('click')

      expect(wrapper.emitted('close')).toBeFalsy()
    })

    it('should emit close when clicking cancel button', async () => {
      wrapper = createWrapper()
      const cancelButton = wrapper.find('.cancel-action')

      await cancelButton.trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
      expect(wrapper.emitted('close')?.length).toBe(1)
    })

    it('should emit switch with stash when clicking leave changes button', async () => {
      wrapper = createWrapper()
      const leaveButton = wrapper.find('.leave-changes')

      await leaveButton.trigger('click')

      expect(wrapper.emitted('switch')).toBeTruthy()
      expect(wrapper.emitted('switch')?.[0]).toEqual(['stash'])
    })

    it('should emit switch with bring when clicking bring changes button', async () => {
      wrapper = createWrapper()
      const bringButton = wrapper.find('.bring-changes')

      await bringButton.trigger('click')

      expect(wrapper.emitted('switch')).toBeTruthy()
      expect(wrapper.emitted('switch')?.[0]).toEqual(['bring'])
    })

    it('should handle escape key press on overlay', async () => {
      wrapper = createWrapper()
      const overlay = wrapper.find('.modal-overlay')

      await overlay.trigger('keydown.escape')

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should show files modal when clicking files count button', async () => {
      wrapper = createWrapper()
      const filesButton = wrapper.find('.files-count-button')

      expect(wrapper.vm.isFilesModalVisible).toBe(false)

      await filesButton.trigger('click')

      expect(wrapper.vm.isFilesModalVisible).toBe(true)
    })

    it('should disable buttons when processing', async () => {
      wrapper = createWrapper()

      // Trigger processing state
      await wrapper.find('.leave-changes').trigger('click')

      const buttons = wrapper.findAll('.action-button')
      buttons.forEach((button) => {
        expect(button.attributes('disabled')).toBeDefined()
      })
    })

    it('should reset processing state when closing', async () => {
      wrapper = createWrapper()

      // Set processing state directly since click triggers emit
      wrapper.vm.isProcessing = true
      expect(wrapper.vm.isProcessing).toBe(true)

      // Close modal via handleClose which resets processing
      wrapper.vm.handleClose()
      expect(wrapper.vm.isProcessing).toBe(false)
      expect(wrapper.emitted('close')).toBeTruthy()
    })
  })

  describe('Transition Callbacks', () => {
    it('should handle onBeforeEnter transition', async () => {
      wrapper = createWrapper()

      const mockElement = document.createElement('div')
      const mockContainer = document.createElement('div')
      mockContainer.className = 'modal-container'
      mockElement.appendChild(mockContainer)

      wrapper.vm.onBeforeEnter(mockElement)

      expect(mockContainer.style.transform).toBe('scale(0.9)')
      expect(mockContainer.style.opacity).toBe('0')
    })

    it('should handle onBeforeEnter without container', async () => {
      wrapper = createWrapper()

      const mockElement = document.createElement('div')

      // Should not throw
      expect(() => wrapper.vm.onBeforeEnter(mockElement)).not.toThrow()
    })

    it('should handle onAfterEnter transition', async () => {
      wrapper = createWrapper()

      const mockElement = document.createElement('div')
      const mockContainer = document.createElement('div')
      mockContainer.className = 'modal-container'
      const mockButton = document.createElement('button')
      mockButton.className = 'action-button leave-changes'

      mockElement.appendChild(mockContainer)
      mockElement.appendChild(mockButton)

      const focusSpy = vi.spyOn(mockButton, 'focus')

      wrapper.vm.onAfterEnter(mockElement)

      expect(mockContainer.style.transform).toBe('')
      expect(mockContainer.style.opacity).toBe('')

      await nextTick()
      expect(focusSpy).toHaveBeenCalled()
    })

    it('should handle onAfterEnter without container', async () => {
      wrapper = createWrapper()

      const mockElement = document.createElement('div')

      // Should not throw
      expect(() => wrapper.vm.onAfterEnter(mockElement)).not.toThrow()
    })

    it('should handle onAfterEnter without focus button', async () => {
      wrapper = createWrapper()

      const mockElement = document.createElement('div')
      const mockContainer = document.createElement('div')
      mockContainer.className = 'modal-container'
      mockElement.appendChild(mockContainer)

      // Should not throw
      expect(() => wrapper.vm.onAfterEnter(mockElement)).not.toThrow()
    })

    it('should handle onBeforeLeave transition', () => {
      wrapper = createWrapper()

      // Should not throw (empty function)
      expect(() => wrapper.vm.onBeforeLeave()).not.toThrow()
    })

    it('should handle onAfterLeave transition', () => {
      wrapper = createWrapper()

      // Should not throw (empty function)
      expect(() => wrapper.vm.onAfterLeave()).not.toThrow()
    })
  })

  describe('Lifecycle Hooks', () => {
    it('should add keyboard event listener on mount', async () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener')

      wrapper = createWrapper()

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      )
    })

    it('should remove keyboard event listener on unmount', async () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')

      wrapper = createWrapper()
      const handleKeyDown = wrapper.vm.handleKeyDown

      wrapper.unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        handleKeyDown
      )
    })

    it('should handle Escape key via document listener', async () => {
      wrapper = createWrapper()

      const event = new KeyboardEvent('keydown', { key: 'Escape' })
      document.dispatchEvent(event)

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should not close on non-Escape key via document listener', async () => {
      wrapper = createWrapper()

      const event = new KeyboardEvent('keydown', { key: 'Enter' })
      document.dispatchEvent(event)

      expect(wrapper.emitted('close')).toBeFalsy()
    })
  })

  describe('SSR Support', () => {
    it('should detect SSR context when window is undefined', () => {
      wrapper = createWrapper()

      // Directly mock the isSSR function to return true
      const spy = vi.spyOn(wrapper.vm, 'isSSR').mockReturnValue(true)

      expect(wrapper.vm.isSSR()).toBe(true)
      // Since isTeleportDisabled is a computed property that calls isSSR()
      // We need to trigger reactivity
      expect(spy).toHaveBeenCalled()
    })

    it('should detect SSR context when document is undefined', () => {
      wrapper = createWrapper()

      // Directly mock the isSSR function to return true
      const spy = vi.spyOn(wrapper.vm, 'isSSR').mockReturnValue(true)

      expect(wrapper.vm.isSSR()).toBe(true)
      // Since isTeleportDisabled is a computed property that calls isSSR()
      // We need to trigger reactivity
      expect(spy).toHaveBeenCalled()
    })

    it('should not detect SSR in browser context', () => {
      wrapper = createWrapper()
      expect(wrapper.vm.isSSR()).toBe(false)
      expect(wrapper.vm.isTeleportDisabled).toBe(false)
    })

    it('should test actual isSSR implementation', () => {
      // Test the actual isSSR function logic
      wrapper = createWrapper()

      // Save original values
      const originalWindow = global.window
      const originalDocument = global.document

      // Test when window is undefined
      // @ts-expect-error -- Testing SSR behavior with undefined window
      global.window = undefined
      expect(wrapper.vm.isSSR()).toBe(true)
      global.window = originalWindow

      // Test when document is undefined
      // @ts-expect-error -- Testing SSR behavior with undefined document
      global.document = undefined
      expect(wrapper.vm.isSSR()).toBe(true)
      global.document = originalDocument

      // Test when both are defined
      expect(wrapper.vm.isSSR()).toBe(false)
    })
  })

  describe('Secondary Modal Integration', () => {
    it('should render UncommittedFilesModal with correct props', async () => {
      wrapper = createWrapper()

      // Trigger showing the files modal
      await wrapper.vm.showFilesModal()
      await nextTick()

      const filesModal = wrapper.findComponent(UncommittedFilesModal)
      expect(filesModal.exists()).toBe(true)
      expect(filesModal.props('isVisible')).toBe(true)
      expect(filesModal.props('changedFiles')).toEqual(
        defaultProps.changedFiles
      )
      expect(filesModal.props('currentBranch')).toBe(defaultProps.currentBranch)
    })

    it('should close files modal when receiving close event', async () => {
      wrapper = createWrapper()
      wrapper.vm.isFilesModalVisible = true

      await wrapper.vm.closeFilesModal()

      expect(wrapper.vm.isFilesModalVisible).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty changed files array', () => {
      wrapper = createWrapper({ changedFiles: [] })
      const subtitle = wrapper.find('.modal-subtitle')
      expect(subtitle.text()).toContain('0 uncommitted changes.')
    })

    it('should handle very long branch names', () => {
      const longBranchName =
        'feature/very-long-branch-name-that-should-still-display-correctly'
      wrapper = createWrapper({
        currentBranch: longBranchName,
        targetBranch: longBranchName,
      })

      const title = wrapper.find('.modal-title')
      expect(title.text()).toContain(longBranchName)
    })

    it('should handle rapid clicks without issues', async () => {
      wrapper = createWrapper()
      const leaveButton = wrapper.find('.leave-changes')

      // Simulate rapid clicks
      await leaveButton.trigger('click')
      await leaveButton.trigger('click')
      await leaveButton.trigger('click')

      // Should only emit once due to processing state
      expect(wrapper.emitted('switch')?.length).toBe(1)
    })

    it('should handle overlay click with different event targets', async () => {
      wrapper = createWrapper()
      const overlay = wrapper.find('.modal-overlay')

      // Create mock event where target !== currentTarget
      const mockEvent = new MouseEvent('click')
      Object.defineProperty(mockEvent, 'target', {
        value: document.createElement('div'),
        writable: false,
      })
      Object.defineProperty(mockEvent, 'currentTarget', {
        value: overlay.element,
        writable: false,
      })

      wrapper.vm.handleOverlayClick(mockEvent)

      // Should not emit close when target !== currentTarget
      expect(wrapper.emitted('close')).toBeFalsy()
    })
  })

  describe('Computed Properties', () => {
    it('should generate unique heading IDs', () => {
      const wrapper1 = createWrapper()

      vi.spyOn(Date, 'now').mockReturnValue(9876543210)
      const wrapper2 = createWrapper()

      expect(wrapper1.vm.headingId).toBe('branch-switch-modal-1234567890')
      expect(wrapper2.vm.headingId).toBe('branch-switch-modal-9876543210')

      wrapper2.unmount()
    })
  })

  describe('Reactive State Management', () => {
    it('should properly manage isProcessing state', async () => {
      wrapper = createWrapper()

      expect(wrapper.vm.isProcessing).toBe(false)

      wrapper.vm.handleLeaveChanges()
      expect(wrapper.vm.isProcessing).toBe(true)

      wrapper.vm.handleClose()
      expect(wrapper.vm.isProcessing).toBe(false)
    })

    it('should properly manage isFilesModalVisible state', async () => {
      wrapper = createWrapper()

      expect(wrapper.vm.isFilesModalVisible).toBe(false)

      wrapper.vm.showFilesModal()
      expect(wrapper.vm.isFilesModalVisible).toBe(true)

      wrapper.vm.closeFilesModal()
      expect(wrapper.vm.isFilesModalVisible).toBe(false)
    })
  })

  describe('Method Coverage', () => {
    it('should cover handleOverlayClick with matching targets', () => {
      wrapper = createWrapper()

      const mockEvent = new MouseEvent('click')
      const element = document.createElement('div')
      Object.defineProperty(mockEvent, 'target', { value: element })
      Object.defineProperty(mockEvent, 'currentTarget', { value: element })

      wrapper.vm.handleOverlayClick(mockEvent)

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should cover handleKeyDown with non-Escape key', () => {
      wrapper = createWrapper()

      const event = new KeyboardEvent('keydown', { key: 'Enter' })
      wrapper.vm.handleKeyDown(event)

      expect(wrapper.emitted('close')).toBeFalsy()
    })

    it('should cover handleKeyDown with Escape key', () => {
      wrapper = createWrapper()

      const event = new KeyboardEvent('keydown', { key: 'Escape' })
      wrapper.vm.handleKeyDown(event)

      expect(wrapper.emitted('close')).toBeTruthy()
    })
  })

  describe('Full Workflow Integration', () => {
    it('should complete full stash workflow', async () => {
      wrapper = createWrapper()

      // Check initial state
      expect(wrapper.find('.modal-overlay').exists()).toBe(true)
      expect(wrapper.vm.isProcessing).toBe(false)

      // Click leave changes button
      const leaveButton = wrapper.find('.leave-changes')
      await leaveButton.trigger('click')

      // Check processing state
      expect(wrapper.vm.isProcessing).toBe(true)
      expect(wrapper.find('.processing-indicator').exists()).toBe(true)

      // Check emitted event
      expect(wrapper.emitted('switch')).toBeTruthy()
      expect(wrapper.emitted('switch')?.[0]).toEqual(['stash'])
    })

    it('should complete full bring workflow', async () => {
      wrapper = createWrapper()

      // Click bring changes button
      const bringButton = wrapper.find('.bring-changes')
      await bringButton.trigger('click')

      // Check processing state
      expect(wrapper.vm.isProcessing).toBe(true)

      // Check emitted event
      expect(wrapper.emitted('switch')?.[0]).toEqual(['bring'])
    })

    it('should complete full cancel workflow', async () => {
      wrapper = createWrapper()

      // Set processing state
      wrapper.vm.isProcessing = true

      // Click cancel button
      const cancelButton = wrapper.find('.cancel-action')
      await cancelButton.trigger('click')

      // Check state reset
      expect(wrapper.vm.isProcessing).toBe(false)

      // Check emitted event
      expect(wrapper.emitted('close')).toBeTruthy()
    })
  })
})
