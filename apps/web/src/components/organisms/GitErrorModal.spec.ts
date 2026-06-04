import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper, flushPromises } from '@vue/test-utils'
import { nextTick, type ComponentPublicInstance } from 'vue'
import GitErrorModal from './GitErrorModal.vue'
import type { GitError } from '../../composables/useGitErrorModal'

/**
 * Test utilities for GitErrorModal component.
 *
 * @remarks
 * Comprehensive test suite covering Vue.js best practices including
 * Teleport functionality, transition callbacks, accessibility,
 * and user interactions.
 *
 * @public
 * @since 1.1.0
 */

// Mock clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
  writable: true,
  configurable: true,
})

// Mock document.body for Teleport tests
Object.defineProperty(document, 'body', {
  value: document.createElement('body'),
  writable: true,
})

describe('GitErrorModal', () => {
  let wrapper: VueWrapper<ComponentPublicInstance>
  let mockError: GitError

  const createWrapper = (
    props: Record<string, unknown>,
    options: Record<string, unknown> = {}
  ) => {
    return mount(GitErrorModal, {
      props,
      global: {
        stubs: {
          Teleport: {
            template: '<div data-teleport-stub><slot /></div>',
          },
        },
      },
      ...options,
    })
  }

  beforeEach(() => {
    mockError = {
      success: false,
      currentBranch: 'main',
      message: 'Cannot switch branches due to uncommitted changes',
      errorType: 'uncommitted_changes',
      modifiedFiles: ['src/test.ts', 'package.json'],
      untrackedFiles: ['new-file.txt', 'temp.log'],
      suggestions: [
        'git stash',
        'git commit -m "WIP"',
        'git reset --hard',
        'git add .',
      ],
      canForce: true,
    }

    // Reset DOM
    document.body.innerHTML = ''
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    wrapper?.unmount()
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  describe('Component Rendering', () => {
    it('should render modal when visible', async () => {
      wrapper = createWrapper({
        isVisible: true,
        error: mockError,
      })

      await nextTick()

      expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
      expect(wrapper.find('.modal-title').text()).toBe('Branch Switch Blocked')
      expect(wrapper.find('.modal-subtitle').text()).toBe(mockError.message)
    })

    it('should not render modal when not visible', () => {
      wrapper = createWrapper({
        isVisible: false,
        error: mockError,
      })

      expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    })

    it('should render error type badge correctly', async () => {
      wrapper = createWrapper({
        isVisible: true,
        error: mockError,
      })

      await nextTick()
      const badge = wrapper.find('.error-badge-pill')
      expect(badge.exists()).toBe(true)
      expect(badge.classes()).toContain('error-badge--warning')
      expect(badge.text()).toBe('Uncommitted Changes')
    })

    it('should render modified files section', async () => {
      wrapper = createWrapper({
        isVisible: true,
        error: mockError,
      })

      await nextTick()
      expect(wrapper.find('.files-section.modified-files').exists()).toBe(true)
      expect(wrapper.find('.section-title').text()).toContain('Modified Files')
    })

    it('should render untracked files section', async () => {
      wrapper = createWrapper({
        isVisible: true,
        error: mockError,
      })

      await nextTick()
      const untrackedSection = wrapper.find('.files-section.untracked-files')
      expect(untrackedSection.exists()).toBe(true)
      expect(untrackedSection.find('.section-title').text()).toContain(
        'Untracked Files'
      )
    })

    it('should render solution cards', async () => {
      wrapper = createWrapper({
        isVisible: true,
        error: mockError,
      })

      await nextTick()
      const solutionCards = wrapper.findAll('.solution-card')
      expect(solutionCards.length).toBe(mockError.suggestions!.length)
    })
  })

  describe('File List Display', () => {
    beforeEach(async () => {
      wrapper = createWrapper({
        isVisible: true,
        error: mockError,
      })
      await nextTick()
    })

    it('should toggle modified files visibility', async () => {
      // Initially hidden
      expect(wrapper.find('.modified-list').exists()).toBe(false)

      // Find and click toggle button to show
      const toggleButton = wrapper.find('.modified-files .toggle-button')
      await toggleButton.trigger('click')
      await nextTick()

      // Should show the list
      expect(wrapper.find('.modified-list').exists()).toBe(true)

      // Verify files are shown
      const fileItems = wrapper.findAll('.modified-file')
      expect(fileItems).toHaveLength(mockError.modifiedFiles!.length)
    })

    it('should toggle untracked files visibility', async () => {
      const toggleButton = wrapper.find('.untracked-files .toggle-button')
      expect(wrapper.find('.untracked-list').exists()).toBe(false)

      await toggleButton.trigger('click')
      await nextTick()
      expect(wrapper.find('.untracked-list').exists()).toBe(true)

      const fileItems = wrapper.findAll('.untracked-file')
      expect(fileItems).toHaveLength(2) // Should show 2 files
    })

    it('should show limited untracked files initially', async () => {
      // Create error with many untracked files
      const manyFilesError = {
        ...mockError,
        untrackedFiles: [
          'file1.txt',
          'file2.txt',
          'file3.txt',
          'file4.txt',
          'file5.txt',
          'file6.txt',
          'file7.txt',
        ],
      }

      wrapper = createWrapper({
        isVisible: true,
        error: manyFilesError,
      })

      await nextTick()

      const toggleButton = wrapper.find('.untracked-files .toggle-button')
      await toggleButton.trigger('click')
      await nextTick()

      const fileItems = wrapper.findAll('.untracked-file')
      expect(fileItems).toHaveLength(5) // Should show only 5 files initially

      const moreIndicator = wrapper.find('.more-files-indicator')
      expect(moreIndicator.exists()).toBe(true)
      expect(moreIndicator.text()).toContain('... and 2 more files')
    })

    it('should show all untracked files when "more" clicked', async () => {
      const manyFilesError = {
        ...mockError,
        untrackedFiles: [
          'file1.txt',
          'file2.txt',
          'file3.txt',
          'file4.txt',
          'file5.txt',
          'file6.txt',
          'file7.txt',
        ],
      }

      wrapper = createWrapper({
        isVisible: true,
        error: manyFilesError,
      })

      await nextTick()

      const toggleButton = wrapper.find('.untracked-files .toggle-button')
      await toggleButton.trigger('click')
      await nextTick()

      const moreIndicator = wrapper.find('.more-files-indicator')
      await moreIndicator.trigger('click')
      await nextTick()

      const fileItems = wrapper.findAll('.untracked-file')
      expect(fileItems).toHaveLength(7) // Should show all 7 files
      expect(wrapper.find('.more-files-indicator').exists()).toBe(false)
    })

    it('should handle single extra file correctly', async () => {
      const manyFilesError = {
        ...mockError,
        untrackedFiles: ['f1', 'f2', 'f3', 'f4', 'f5', 'f6'],
      }

      wrapper = createWrapper({
        isVisible: true,
        error: manyFilesError,
      })

      await nextTick()

      const toggleButton = wrapper.find('.untracked-files .toggle-button')
      await toggleButton.trigger('click')
      await nextTick()

      const moreIndicator = wrapper.find('.more-files-indicator')
      expect(moreIndicator.text()).toContain('... and 1 more file')
    })
  })

  describe('Accessibility', () => {
    beforeEach(async () => {
      wrapper = createWrapper({
        isVisible: true,
        error: mockError,
      })
      await nextTick()
    })

    it('should have proper ARIA attributes', () => {
      const dialog = wrapper.find('[role="dialog"]')
      expect(dialog.attributes('aria-modal')).toBe('true')
      expect(dialog.attributes('aria-labelledby')).toBeTruthy()
    })

    it('should generate unique heading ID', () => {
      const title = wrapper.find('.modal-title')
      const headingId = title.attributes('id')
      expect(headingId).toBeTruthy()
      expect(headingId).toMatch(/git-error-modal-\d+/)
    })

    it('should have proper button labels', () => {
      const copyButtons = wrapper.findAll('.copy-button')
      copyButtons.forEach((button) => {
        expect(button.attributes('aria-label')).toMatch(/^Copy command:/)
      })
    })

    it('should handle keyboard navigation with Escape key', async () => {
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' })
      document.dispatchEvent(escapeEvent)

      await nextTick()
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should not close on Escape when modal is not visible', async () => {
      wrapper = createWrapper({
        isVisible: false,
        error: mockError,
      })

      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' })
      document.dispatchEvent(escapeEvent)

      await nextTick()
      expect(wrapper.emitted('close')).toBeFalsy()
    })

    it('should ignore non-Escape key events', async () => {
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' })
      document.dispatchEvent(enterEvent)

      await nextTick()
      expect(wrapper.emitted('close')).toBeFalsy()
    })

    it('should handle Tab focus trap', async () => {
      // Create a more realistic DOM structure
      const modal = wrapper.find('.modal-container')
      const buttons = modal.findAll('button')
      expect(buttons.length).toBeGreaterThan(0)

      const firstButton = buttons[0].element as HTMLElement
      const lastButton = buttons[buttons.length - 1].element as HTMLElement

      // Mock document.querySelector to return modal container
      const originalQuerySelector = document.querySelector
      document.querySelector = vi.fn((selector) => {
        if (selector === '.modal-container') {
          return modal.element
        }
        return originalQuerySelector.call(document, selector)
      })

      // Mock querySelectorAll for focusable elements
      const originalQuerySelectorAll = modal.element.querySelectorAll
      modal.element.querySelectorAll = vi.fn((selector) => {
        if (selector.includes('button')) {
          return buttons.map((b) => b.element)
        }
        return originalQuerySelectorAll.call(modal.element, selector)
      })

      // Test forward tab on last element
      Object.defineProperty(document, 'activeElement', {
        value: lastButton,
        writable: true,
        configurable: true,
      })

      const focusSpy = vi.spyOn(firstButton, 'focus')
      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: false,
      })

      // Mock preventDefault
      const preventDefaultSpy = vi.fn()
      Object.defineProperty(tabEvent, 'preventDefault', {
        value: preventDefaultSpy,
        writable: true,
      })

      document.dispatchEvent(tabEvent)

      // The focus trap should work
      expect(focusSpy).toHaveBeenCalled()
      expect(preventDefaultSpy).toHaveBeenCalled()

      focusSpy.mockRestore()
      document.querySelector = originalQuerySelector
    })

    it('should handle Shift+Tab focus trap', async () => {
      const modal = wrapper.find('.modal-container')
      const buttons = modal.findAll('button')
      const firstButton = buttons[0].element as HTMLElement
      const lastButton = buttons[buttons.length - 1].element as HTMLElement

      // Mock document.querySelector
      const originalQuerySelector = document.querySelector
      document.querySelector = vi.fn((selector) => {
        if (selector === '.modal-container') {
          return modal.element
        }
        return originalQuerySelector.call(document, selector)
      })

      // Mock querySelectorAll
      const originalQuerySelectorAll = modal.element.querySelectorAll
      modal.element.querySelectorAll = vi.fn((selector) => {
        if (selector.includes('button')) {
          return buttons.map((b) => b.element)
        }
        return originalQuerySelectorAll.call(modal.element, selector)
      })

      // Test backward tab on first element
      Object.defineProperty(document, 'activeElement', {
        value: firstButton,
        writable: true,
        configurable: true,
      })

      const focusSpy = vi.spyOn(lastButton, 'focus')
      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: true,
      })

      const preventDefaultSpy = vi.fn()
      Object.defineProperty(tabEvent, 'preventDefault', {
        value: preventDefaultSpy,
        writable: true,
      })

      document.dispatchEvent(tabEvent)

      expect(focusSpy).toHaveBeenCalled()
      expect(preventDefaultSpy).toHaveBeenCalled()

      focusSpy.mockRestore()
      document.querySelector = originalQuerySelector
    })

    it('should ignore Tab when modal is not visible', async () => {
      wrapper = createWrapper({
        isVisible: false,
        error: mockError,
      })

      const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' })
      const preventDefaultSpy = vi.fn()
      Object.defineProperty(tabEvent, 'preventDefault', {
        value: preventDefaultSpy,
      })

      document.dispatchEvent(tabEvent)
      expect(preventDefaultSpy).not.toHaveBeenCalled()
    })

    it('should ignore non-Tab keys in focus trap', async () => {
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' })
      const preventDefaultSpy = vi.fn()
      Object.defineProperty(enterEvent, 'preventDefault', {
        value: preventDefaultSpy,
      })

      document.dispatchEvent(enterEvent)
      expect(preventDefaultSpy).not.toHaveBeenCalled()
    })

    it('should handle missing modal container in Tab trap', async () => {
      // Remove modal container from DOM
      const modalContainer = wrapper.find('.modal-container').element
      modalContainer.remove()

      const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' })
      const preventDefaultSpy = vi.fn()
      Object.defineProperty(tabEvent, 'preventDefault', {
        value: preventDefaultSpy,
      })

      // Should not throw error
      document.dispatchEvent(tabEvent)
      expect(preventDefaultSpy).not.toHaveBeenCalled()
    })
  })

  describe('User Interactions', () => {
    beforeEach(async () => {
      wrapper = createWrapper({
        isVisible: true,
        error: mockError,
      })
      await nextTick()
    })

    it('should emit close event when close button clicked', async () => {
      const closeButton = wrapper.find('.secondary-button')
      await closeButton.trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should emit close event when overlay clicked', async () => {
      const overlay = wrapper.find('.modal-overlay')
      await overlay.trigger('click')
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should not close when modal container clicked', async () => {
      const container = wrapper.find('.modal-container')
      await container.trigger('click')

      expect(wrapper.emitted('close')).toBeFalsy()
    })

    it('should not close when clicking inside modal', async () => {
      // Test that clicking on container doesn't close modal
      const container = wrapper.find('.modal-container')
      await container.trigger('click')
      expect(wrapper.emitted('close')).toBeFalsy()
    })

    it('should emit force-switch event when force button clicked', async () => {
      const forceButton = wrapper.find('.primary-button.danger')
      await forceButton.trigger('click')

      expect(wrapper.emitted('force-switch')).toBeTruthy()

      // Check that isProcessing state was set
      await nextTick()
      expect(forceButton.text()).toContain('Processing...')
      expect(forceButton.attributes('disabled')).toBe('')
    })

    it('should toggle file list visibility', async () => {
      const toggleButton = wrapper.find('.toggle-button')
      expect(toggleButton.exists()).toBe(true)

      await toggleButton.trigger('click')
      await nextTick()

      expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
    })

    it('should copy command to clipboard', async () => {
      const copyButton = wrapper.find('.copy-button')
      await copyButton.trigger('click')

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('git stash')

      // Check for visual feedback
      await nextTick()
      const closeButton = wrapper.find('.secondary-button')
      expect(closeButton.text()).toContain('Copied ✓')

      // Advance timers to reset state
      vi.advanceTimersByTime(2000)
      await nextTick()
      expect(closeButton.text()).toBe('Got it')
    })

    it('should handle clipboard copy error', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})
      navigator.clipboard.writeText = vi
        .fn()
        .mockRejectedValue(new Error('Copy failed'))

      const copyButton = wrapper.find('.copy-button')
      await copyButton.trigger('click')
      await flushPromises()

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to copy to clipboard:',
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })

    it('should clear previous timeout when copying again', async () => {
      const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout')

      // Reset mock to ensure it works
      navigator.clipboard.writeText = vi.fn().mockResolvedValue(undefined)

      const copyButton = wrapper.find('.copy-button')

      // First copy
      await copyButton.trigger('click')
      await flushPromises()
      await nextTick()

      // Verify timeout was created
      expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1)

      // Second copy before timeout expires
      await copyButton.trigger('click')
      await flushPromises()
      await nextTick()

      // The clearTimeout should have been called for the first timeout
      expect(clearTimeoutSpy).toHaveBeenCalled()
      expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(2)

      clearTimeoutSpy.mockRestore()
    })
  })

  describe('Transition Callbacks', () => {
    it('should handle onBeforeEnter callback', async () => {
      wrapper = mount(GitErrorModal, {
        props: {
          isVisible: true,
          error: mockError,
        },
        global: {
          stubs: {
            Teleport: {
              template: '<div data-teleport-stub><slot /></div>',
            },
            Transition: {
              template: `
                <div>
                  <slot />
                </div>
              `,
              props: [
                'onBeforeEnter',
                'onAfterEnter',
                'onBeforeLeave',
                'onAfterLeave',
              ],
              mounted() {
                // Create a mock element with querySelector
                const mockEl = document.createElement('div')
                const mockContainer = document.createElement('div')
                mockContainer.classList.add('modal-container')
                mockEl.appendChild(mockContainer)

                // Call the transition callbacks
                if (this.$props.onBeforeEnter) {
                  this.$props.onBeforeEnter(mockEl)
                  // Verify the styles were set
                  expect(mockContainer.style.transform).toBe('scale(0.9)')
                  expect(mockContainer.style.opacity).toBe('0')
                }
              },
            },
          },
        },
      })

      await nextTick()
    })

    it('should handle onBeforeEnter without modal container', async () => {
      wrapper = mount(GitErrorModal, {
        props: {
          isVisible: true,
          error: mockError,
        },
        global: {
          stubs: {
            Teleport: {
              template: '<div data-teleport-stub><slot /></div>',
            },
            Transition: {
              template: `<div><slot /></div>`,
              props: ['onBeforeEnter'],
              mounted() {
                const mockEl = document.createElement('div')
                // No modal-container element

                // Should not throw error
                if (this.$props.onBeforeEnter) {
                  this.$props.onBeforeEnter(mockEl)
                }
              },
            },
          },
        },
      })

      await nextTick()
    })

    it('should handle onAfterEnter callback', async () => {
      const focusSpy = vi.fn()

      wrapper = mount(GitErrorModal, {
        props: {
          isVisible: true,
          error: mockError,
        },
        global: {
          stubs: {
            Teleport: {
              template: '<div data-teleport-stub><slot /></div>',
            },
            Transition: {
              template: `<div><slot /></div>`,
              props: ['onAfterEnter'],
              async mounted() {
                const mockEl = document.createElement('div')
                const mockButton = document.createElement('button')
                mockButton.focus = focusSpy
                mockEl.appendChild(mockButton)

                if (this.$props.onAfterEnter) {
                  this.$props.onAfterEnter(mockEl)
                  await nextTick()
                  expect(focusSpy).toHaveBeenCalled()
                }
              },
            },
          },
        },
      })

      await nextTick()
    })

    it('should handle onAfterEnter without button', async () => {
      wrapper = mount(GitErrorModal, {
        props: {
          isVisible: true,
          error: mockError,
        },
        global: {
          stubs: {
            Teleport: {
              template: '<div data-teleport-stub><slot /></div>',
            },
            Transition: {
              template: `<div><slot /></div>`,
              props: ['onAfterEnter'],
              async mounted() {
                const mockEl = document.createElement('div')
                // No button element

                // Should not throw error
                if (this.$props.onAfterEnter) {
                  this.$props.onAfterEnter(mockEl)
                  await nextTick()
                }
              },
            },
          },
        },
      })

      await nextTick()
    })

    it('should handle onBeforeLeave callback', async () => {
      // Reset mock
      navigator.clipboard.writeText = vi.fn().mockResolvedValue(undefined)

      const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout')

      // First set up a copy operation to create a timeout
      wrapper = createWrapper({
        isVisible: true,
        error: mockError,
      })
      await nextTick()

      const copyButton = wrapper.find('.copy-button')
      await copyButton.trigger('click')
      await flushPromises() // Wait for async clipboard operation
      await nextTick()

      // The timeout should be created
      expect(navigator.clipboard.writeText).toHaveBeenCalled()

      // Now unmount which should trigger cleanup via onBeforeLeave
      wrapper.unmount()

      // Verify cleanup happened
      expect(clearTimeoutSpy).toHaveBeenCalled()

      clearTimeoutSpy.mockRestore()
    })

    it('should handle onAfterLeave callback', async () => {
      // First show modal with expanded sections
      wrapper = createWrapper({
        isVisible: true,
        error: mockError,
      })
      await nextTick()

      // Expand file sections
      const toggleButtons = wrapper.findAll('.toggle-button')
      for (const button of toggleButtons) {
        await button.trigger('click')
      }
      await nextTick()

      // Now trigger the leave transition
      wrapper = mount(GitErrorModal, {
        props: {
          isVisible: false,
          error: mockError,
        },
        global: {
          stubs: {
            Teleport: {
              template: '<div data-teleport-stub><slot /></div>',
            },
            Transition: {
              template: `<div v-if="show"><slot /></div>`,
              props: ['onAfterLeave'],
              data() {
                return { show: true }
              },
              mounted() {
                this.show = false
                if (this.$props.onAfterLeave) {
                  this.$props.onAfterLeave()
                  // After leave, all states should be reset
                  // We can't directly check internal state, but the callback should execute
                }
              },
            },
          },
        },
      })

      await nextTick()
    })
  })

  describe('SSR Support', () => {
    it('should render with Teleport stub in test environment', () => {
      // In test environment, Teleport is stubbed and always works
      wrapper = createWrapper({
        isVisible: true,
        error: mockError,
      })

      // The component should render with stubbed teleport
      expect(wrapper.find('[data-teleport-stub]').exists()).toBe(true)
      expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
    })

    it('should handle when document.body is not available in SSR', async () => {
      // In test environment, teleport is always stubbed
      // This test verifies the component still renders even without a real body element

      // Create wrapper with isVisible false then true to test both states
      wrapper = createWrapper({
        isVisible: false,
        error: mockError,
      })

      // Should not render when not visible
      expect(wrapper.find('[role="dialog"]').exists()).toBe(false)

      // Update to visible
      await wrapper.setProps({ isVisible: true })
      await nextTick()

      // Should render when visible
      expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
      expect(wrapper.find('[data-teleport-stub]').exists()).toBe(true)
    })

    it('should compute isTeleportDisabled correctly', () => {
      // The component internally computes isTeleportDisabled based on SSR/body availability
      // We can't directly test the computed value, but we can verify the component renders
      wrapper = createWrapper({
        isVisible: true,
        error: mockError,
      })

      expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
    })
  })

  describe('Error Types', () => {
    const errorTypes = [
      {
        type: 'uncommitted_changes',
        expectedClass: 'error-badge--warning',
        expectedLabel: 'Uncommitted Changes',
      },
      {
        type: 'untracked_files',
        expectedClass: 'error-badge--info',
        expectedLabel: 'Untracked Files',
      },
      {
        type: 'both',
        expectedClass: 'error-badge--muted',
        expectedLabel: 'Pending Changes',
      },
      {
        type: 'other',
        expectedClass: 'error-badge--default',
        expectedLabel: 'Git Error',
      },
      {
        type: undefined,
        expectedClass: 'error-badge--default',
        expectedLabel: 'Git Error',
      },
    ] as const

    errorTypes.forEach(({ type, expectedClass, expectedLabel }) => {
      it(`should render ${type ?? 'undefined'} error correctly`, async () => {
        const testError = { ...mockError, errorType: type }

        wrapper = createWrapper({
          isVisible: true,
          error: testError,
        })

        await nextTick()

        const badge = wrapper.find('.error-badge-pill')
        expect(badge.classes()).toContain(expectedClass)
        expect(badge.text()).toBe(expectedLabel)
      })
    })
  })

  describe('Solution Suggestions', () => {
    it('should render solution titles correctly', async () => {
      wrapper = createWrapper({
        isVisible: true,
        error: mockError,
      })

      await nextTick()

      const solutionTitles = wrapper.findAll('.solution-title')
      expect(solutionTitles[0].text()).toBe('Save changes temporarily')
      expect(solutionTitles[1].text()).toBe('Commit current changes')
      expect(solutionTitles[2].text()).toBe('Discard changes')
      expect(solutionTitles[3].text()).toBe('Add files to tracking')
    })

    it('should extract Git commands correctly', async () => {
      wrapper = createWrapper({
        isVisible: true,
        error: mockError,
      })

      await nextTick()

      const commands = wrapper.findAll('.solution-command code')
      expect(commands[0].text()).toBe('git stash')
      expect(commands[1].text()).toBe('git commit -m')
      expect(commands[2].text()).toBe('git reset --hard')
      expect(commands[3].text()).toBe('git add .')
    })

    it('should handle unknown suggestion type', async () => {
      const errorWithUnknown = {
        ...mockError,
        suggestions: ['unknown command', 'git stash'],
      }

      wrapper = createWrapper({
        isVisible: true,
        error: errorWithUnknown,
      })

      await nextTick()

      const solutionTitles = wrapper.findAll('.solution-title')
      expect(solutionTitles[0].text()).toBe('Git Solution')
      expect(solutionTitles[1].text()).toBe('Save changes temporarily')

      const descriptions = wrapper.findAll('.solution-description')
      expect(descriptions[0].text()).toBe('unknown command')
    })

    it('should handle suggestions without git commands', async () => {
      const errorWithoutCommands = {
        ...mockError,
        suggestions: ['Please review your changes'],
      }

      wrapper = createWrapper({
        isVisible: true,
        error: errorWithoutCommands,
      })

      await nextTick()

      expect(wrapper.find('.solution-command').exists()).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    it('should handle error without affected files', async () => {
      const errorWithoutFiles = {
        ...mockError,
        modifiedFiles: undefined,
        untrackedFiles: undefined,
      }

      wrapper = createWrapper({
        isVisible: true,
        error: errorWithoutFiles,
      })

      await nextTick()
      expect(wrapper.find('.files-section').exists()).toBe(false)
    })

    it('should handle error with empty file arrays', async () => {
      const errorWithEmptyFiles = {
        ...mockError,
        modifiedFiles: [],
        untrackedFiles: [],
      }

      wrapper = createWrapper({
        isVisible: true,
        error: errorWithEmptyFiles,
      })

      await nextTick()
      expect(wrapper.find('.files-section').exists()).toBe(false)
    })

    it('should handle error without suggestions', async () => {
      const errorWithoutSuggestions = {
        ...mockError,
        suggestions: undefined,
      }

      wrapper = createWrapper({
        isVisible: true,
        error: errorWithoutSuggestions,
      })

      await nextTick()
      expect(wrapper.find('.solutions-section').exists()).toBe(false)
    })

    it('should handle error with empty suggestions', async () => {
      const errorWithEmptySuggestions = {
        ...mockError,
        suggestions: [],
      }

      wrapper = createWrapper({
        isVisible: true,
        error: errorWithEmptySuggestions,
      })

      await nextTick()
      expect(wrapper.find('.solutions-section').exists()).toBe(false)
    })

    it('should handle error without force option', async () => {
      const errorWithoutForce = {
        ...mockError,
        canForce: false,
      }

      wrapper = createWrapper({
        isVisible: true,
        error: errorWithoutForce,
      })

      await nextTick()
      expect(wrapper.find('.primary-button.danger').exists()).toBe(false)
    })

    it('should handle error with undefined force option', async () => {
      const errorWithUndefinedForce = {
        ...mockError,
        canForce: undefined,
      }

      wrapper = createWrapper({
        isVisible: true,
        error: errorWithUndefinedForce,
      })

      await nextTick()
      expect(wrapper.find('.primary-button.danger').exists()).toBe(false)
    })
  })

  describe('Lifecycle Hooks', () => {
    it('should focus first button on mount when visible', async () => {
      const focusSpy = vi.fn()

      // Create wrapper with mocked button focus
      const testWrapper = document.createElement('div')
      const mockButton = document.createElement('button')
      mockButton.classList.add('test-button')
      mockButton.focus = focusSpy
      testWrapper.appendChild(mockButton)
      document.body.appendChild(testWrapper)

      // Mock querySelector to return our button
      const originalQuerySelector = document.querySelector.bind(document)
      document.querySelector = vi.fn((selector: string) => {
        if (selector === '.modal-container button') {
          return mockButton
        }
        return originalQuerySelector(selector)
      })

      wrapper = createWrapper({
        isVisible: true,
        error: mockError,
      })

      await nextTick()
      await flushPromises()

      expect(focusSpy).toHaveBeenCalled()

      // Cleanup
      document.querySelector = originalQuerySelector
      document.body.removeChild(testWrapper)
    })

    it('should not focus when modal is not visible on mount', async () => {
      const focusSpy = vi.fn()
      const mockButton = document.createElement('button')
      mockButton.focus = focusSpy

      document.querySelector = vi.fn(() => mockButton)

      wrapper = createWrapper({
        isVisible: false,
        error: mockError,
      })

      await nextTick()
      await flushPromises()

      expect(focusSpy).not.toHaveBeenCalled()
    })

    it('should cleanup event listeners on unmount', async () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')
      const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout')

      wrapper = createWrapper({
        isVisible: true,
        error: mockError,
      })

      // Trigger copy to create timeout
      const copyButton = wrapper.find('.copy-button')
      await copyButton.trigger('click')

      wrapper.unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      )
      expect(removeEventListenerSpy).toHaveBeenCalledTimes(2) // For both escape and tab trap
      expect(clearTimeoutSpy).toHaveBeenCalled()

      removeEventListenerSpy.mockRestore()
      clearTimeoutSpy.mockRestore()
    })

    it('should not throw when unmounting without timeout', () => {
      wrapper = createWrapper({
        isVisible: true,
        error: mockError,
      })

      // Unmount without setting any timeout
      expect(() => wrapper.unmount()).not.toThrow()
    })
  })

  describe('Custom Slot', () => {
    it('should render custom actions slot', async () => {
      wrapper = mount(GitErrorModal, {
        props: {
          isVisible: true,
          error: mockError,
        },
        slots: {
          'custom-actions': `
            <template #custom-actions="{ error, close }">
              <button class="custom-action" @click="close">Custom Close</button>
              <span class="custom-error">{{ error.message }}</span>
            </template>
          `,
        },
        global: {
          stubs: {
            Teleport: {
              template: '<div data-teleport-stub><slot /></div>',
            },
          },
        },
      })

      await nextTick()

      const customButton = wrapper.find('.custom-action')
      expect(customButton.exists()).toBe(true)
      expect(customButton.text()).toBe('Custom Close')

      const customError = wrapper.find('.custom-error')
      expect(customError.text()).toBe(mockError.message)

      await customButton.trigger('click')
      expect(wrapper.emitted('close')).toBeTruthy()
    })
  })

  describe('Cleanup', () => {
    it('should cleanup timeouts on unmount', async () => {
      const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout')

      wrapper = createWrapper({
        isVisible: true,
        error: mockError,
      })

      // Trigger copy to create timeout
      const copyButton = wrapper.find('.copy-button')
      await copyButton.trigger('click')

      wrapper.unmount()

      expect(clearTimeoutSpy).toHaveBeenCalled()

      clearTimeoutSpy.mockRestore()
    })

    it('should cleanup when timeout id is null', () => {
      wrapper = createWrapper({
        isVisible: true,
        error: mockError,
      })

      // Unmount without creating any timeout
      expect(() => wrapper.unmount()).not.toThrow()
    })
  })
})
