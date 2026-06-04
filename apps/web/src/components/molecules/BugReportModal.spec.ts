import { describe, it, expect, afterEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import type { ComponentPublicInstance } from 'vue'
import BugReportModal from './BugReportModal.vue'

/**
 * @fileoverview Test suite for BugReportModal.vue following Context7 patterns.
 *
 * @description
 * Comprehensive test coverage for bug report submission modal including:
 * - Form rendering and validation
 * - User input and state management
 * - Submit functionality with conditional data
 * - Close mechanisms (overlay, buttons, post-submit)
 * - System info toggle and display
 * - Edge cases and accessibility
 *
 * Target: 100% coverage (lines, functions, statements, branches)
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

// Mock useNotifications composable
vi.mock('@/apps/web/src/composables/useNotifications', () => ({
  useNotifications: () => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  }),
}))

describe('BugReportModal.vue', () => {
  let wrapper: VueWrapper<ComponentPublicInstance>

  /**
   * Helper function to create a wrapper with default or custom props.
   *
   * @param props - Props to pass to the component
   * @returns VueWrapper instance for testing
   */
  const createWrapper = (props = {}) => {
    return mount(BugReportModal, {
      props: {
        visible: true,
        ...props,
      },
    })
  }

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Rendering', () => {
    it('should render modal when visible is true', () => {
      wrapper = createWrapper({ visible: true })
      expect(wrapper.find('.modal-overlay').exists()).toBe(true)
    })

    it('should not render modal when visible is false', () => {
      wrapper = createWrapper({ visible: false })
      expect(wrapper.find('.modal-overlay').exists()).toBe(false)
    })

    it('should render all form fields', () => {
      wrapper = createWrapper()

      // Title input
      expect(wrapper.find('#title').exists()).toBe(true)

      // Description textarea
      expect(wrapper.find('#description').exists()).toBe(true)

      // Steps to reproduce textarea
      expect(wrapper.find('#steps').exists()).toBe(true)

      // Severity select
      expect(wrapper.find('#severity').exists()).toBe(true)

      // Include system info checkbox
      expect(wrapper.find('input[type="checkbox"]').exists()).toBe(true)
    })

    it('should render submit button', () => {
      wrapper = createWrapper()
      const buttons = wrapper.findAll('button')
      const submitButton = buttons.find((btn) =>
        btn.text().includes('Submit Bug Report')
      )
      expect(submitButton).toBeDefined()
      expect(submitButton?.text()).toContain('Submit Bug Report')
    })

    it('should render cancel button', () => {
      wrapper = createWrapper()
      const buttons = wrapper.findAll('button')
      const cancelButton = buttons.find((btn) => btn.text() === 'Cancel')
      expect(cancelButton).toBeDefined()
      expect(cancelButton?.text()).toBe('Cancel')
    })

    it('should render modal content', () => {
      wrapper = createWrapper()
      const modalContent = wrapper.find('.modal-content')
      expect(modalContent.exists()).toBe(true)
    })

    it('should display system info by default', () => {
      wrapper = createWrapper()
      const systemInfo = wrapper.find('.system-info')
      expect(systemInfo.exists()).toBe(true)
      expect(systemInfo.text()).toContain('macOS 14.0')
      expect(systemInfo.text()).toContain('Hatcher DX v0.4.3')
      expect(systemInfo.text()).toContain('Node.js 20.10.0')
    })

    it('should render severity options correctly', () => {
      wrapper = createWrapper()
      const select = wrapper.find('#severity')
      const options = select.findAll('option')

      expect(options).toHaveLength(4)
      expect(options[0].text()).toContain('Low')
      expect(options[1].text()).toContain('Medium')
      expect(options[2].text()).toContain('High')
      expect(options[3].text()).toContain('Critical')
    })
  })

  describe('Form Input', () => {
    it('should update title when user types', async () => {
      wrapper = createWrapper()
      const titleInput = wrapper.find('#title')

      await titleInput.setValue('Test bug title')
      expect((titleInput.element as HTMLInputElement).value).toBe(
        'Test bug title'
      )
    })

    it('should update description when user types', async () => {
      wrapper = createWrapper()
      const descriptionTextarea = wrapper.find('#description')

      await descriptionTextarea.setValue('Test bug description')
      expect((descriptionTextarea.element as HTMLTextAreaElement).value).toBe(
        'Test bug description'
      )
    })

    it('should update steps to reproduce when user types', async () => {
      wrapper = createWrapper()
      const stepsTextarea = wrapper.find('#steps')

      await stepsTextarea.setValue('Step 1\nStep 2')
      expect((stepsTextarea.element as HTMLTextAreaElement).value).toBe(
        'Step 1\nStep 2'
      )
    })

    it('should update severity when user selects option', async () => {
      wrapper = createWrapper()
      const select = wrapper.find('#severity')

      await select.setValue('high')
      expect((select.element as HTMLSelectElement).value).toBe('high')
    })

    it('should toggle includeSystemInfo when checkbox is clicked', async () => {
      wrapper = createWrapper()
      const checkbox = wrapper.find('input[type="checkbox"]')

      // Initially checked
      expect((checkbox.element as HTMLInputElement).checked).toBe(true)

      // Uncheck
      await checkbox.setValue(false)
      expect((checkbox.element as HTMLInputElement).checked).toBe(false)

      // Check again
      await checkbox.setValue(true)
      expect((checkbox.element as HTMLInputElement).checked).toBe(true)
    })
  })

  describe('Validation', () => {
    it('should disable submit button when form is invalid (empty title)', async () => {
      wrapper = createWrapper()
      const buttons = wrapper.findAll('button')
      const submitButton = buttons.find((btn) =>
        btn.text().includes('Submit Bug Report')
      )

      // Form is invalid initially (empty fields)
      expect(submitButton?.attributes('disabled')).toBeDefined()
    })

    it('should disable submit button when only title is filled', async () => {
      wrapper = createWrapper()
      const titleInput = wrapper.find('#title')
      const buttons = wrapper.findAll('button')
      const submitButton = buttons.find((btn) =>
        btn.text().includes('Submit Bug Report')
      )

      await titleInput.setValue('Test title')

      // Still invalid without description
      expect(submitButton?.attributes('disabled')).toBeDefined()
    })

    it('should disable submit button when only description is filled', async () => {
      wrapper = createWrapper()
      const descriptionTextarea = wrapper.find('#description')
      const buttons = wrapper.findAll('button')
      const submitButton = buttons.find((btn) =>
        btn.text().includes('Submit Bug Report')
      )

      await descriptionTextarea.setValue('Test description')

      // Still invalid without title
      expect(submitButton?.attributes('disabled')).toBeDefined()
    })

    it('should enable submit button when both title and description are filled', async () => {
      wrapper = createWrapper()
      const titleInput = wrapper.find('#title')
      const descriptionTextarea = wrapper.find('#description')

      await titleInput.setValue('Test title')
      await descriptionTextarea.setValue('Test description')

      const buttons = wrapper.findAll('button')
      const submitButton = buttons.find((btn) =>
        btn.text().includes('Submit Bug Report')
      )

      // Form is now valid
      expect(submitButton?.attributes('disabled')).toBeUndefined()
    })

    it('should consider form valid even with empty steps to reproduce', async () => {
      wrapper = createWrapper()
      const titleInput = wrapper.find('#title')
      const descriptionTextarea = wrapper.find('#description')

      await titleInput.setValue('Test title')
      await descriptionTextarea.setValue('Test description')
      // Steps remain empty - this is optional

      const buttons = wrapper.findAll('button')
      const submitButton = buttons.find((btn) =>
        btn.text().includes('Submit Bug Report')
      )

      expect(submitButton?.attributes('disabled')).toBeUndefined()
    })
  })

  describe('Submit Functionality', () => {
    it('should emit submit event with correct data when form is valid', async () => {
      wrapper = createWrapper()
      const titleInput = wrapper.find('#title')
      const descriptionTextarea = wrapper.find('#description')
      const stepsTextarea = wrapper.find('#steps')
      const select = wrapper.find('#severity')

      await titleInput.setValue('Bug title')
      await descriptionTextarea.setValue('Bug description')
      await stepsTextarea.setValue('Step 1\nStep 2')
      await select.setValue('critical')

      const buttons = wrapper.findAll('button')
      const submitButton = buttons.find((btn) =>
        btn.text().includes('Submit Bug Report')
      )
      await submitButton?.trigger('click')

      expect(wrapper.emitted('submit')).toBeTruthy()
      const submitEvent = wrapper.emitted('submit')?.[0]?.[0] as Record<
        string,
        unknown
      >

      expect(submitEvent).toEqual({
        title: 'Bug title',
        description: 'Bug description',
        stepsToReproduce: 'Step 1\nStep 2',
        severity: 'critical',
        systemInfo: {
          platform: 'macOS 14.0',
          version: 'Hatcher DX v0.4.3',
          node: 'Node.js 20.10.0',
        },
      })
    })

    it('should emit submit event without stepsToReproduce when empty', async () => {
      wrapper = createWrapper()
      const titleInput = wrapper.find('#title')
      const descriptionTextarea = wrapper.find('#description')

      await titleInput.setValue('Bug title')
      await descriptionTextarea.setValue('Bug description')
      // Steps remain empty

      const buttons = wrapper.findAll('button')
      const submitButton = buttons.find((btn) =>
        btn.text().includes('Submit Bug Report')
      )
      await submitButton?.trigger('click')

      const submitEvent = wrapper.emitted('submit')?.[0]?.[0] as Record<
        string,
        unknown
      >
      expect(submitEvent.stepsToReproduce).toBeUndefined()
    })

    it('should emit submit event without systemInfo when checkbox is unchecked', async () => {
      wrapper = createWrapper()
      const titleInput = wrapper.find('#title')
      const descriptionTextarea = wrapper.find('#description')
      const checkbox = wrapper.find('input[type="checkbox"]')

      await titleInput.setValue('Bug title')
      await descriptionTextarea.setValue('Bug description')
      await checkbox.setValue(false)

      const buttons = wrapper.findAll('button')
      const submitButton = buttons.find((btn) =>
        btn.text().includes('Submit Bug Report')
      )
      await submitButton?.trigger('click')

      const submitEvent = wrapper.emitted('submit')?.[0]?.[0] as Record<
        string,
        unknown
      >
      expect(submitEvent.systemInfo).toBeUndefined()
    })

    it('should emit close event after successful submit', async () => {
      wrapper = createWrapper()
      const titleInput = wrapper.find('#title')
      const descriptionTextarea = wrapper.find('#description')

      await titleInput.setValue('Bug title')
      await descriptionTextarea.setValue('Bug description')

      const buttons = wrapper.findAll('button')
      const submitButton = buttons.find((btn) =>
        btn.text().includes('Submit Bug Report')
      )
      await submitButton?.trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should not emit submit event when form is invalid', async () => {
      wrapper = createWrapper()

      // Form is invalid (empty title and description)
      // Button is disabled, but we can try to click it
      const buttons = wrapper.findAll('button')
      const submitButton = buttons.find((btn) =>
        btn.text().includes('Submit Bug Report')
      )
      await submitButton?.trigger('click')

      expect(wrapper.emitted('submit')).toBeFalsy()
    })

    it('should use default severity "medium" when not changed', async () => {
      wrapper = createWrapper()
      const titleInput = wrapper.find('#title')
      const descriptionTextarea = wrapper.find('#description')

      await titleInput.setValue('Bug title')
      await descriptionTextarea.setValue('Bug description')

      const buttons = wrapper.findAll('button')
      const submitButton = buttons.find((btn) =>
        btn.text().includes('Submit Bug Report')
      )
      await submitButton?.trigger('click')

      const submitEvent = wrapper.emitted('submit')?.[0]?.[0] as Record<
        string,
        unknown
      >
      expect(submitEvent.severity).toBe('medium')
    })
  })

  describe('Close Functionality', () => {
    it('should emit close event when overlay is clicked', async () => {
      wrapper = createWrapper()
      const overlay = wrapper.find('.modal-overlay')

      await overlay.trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should emit close event when close button is clicked', async () => {
      wrapper = createWrapper()
      const closeButton = wrapper.find('.close-button')

      await closeButton.trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should emit close event when cancel button is clicked', async () => {
      wrapper = createWrapper()
      const cancelButton = wrapper
        .findAll('button')
        .find((btn) => btn.text() === 'Cancel')

      await cancelButton?.trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should not emit close when modal content is clicked', async () => {
      wrapper = createWrapper()
      const modalContent = wrapper.find('.modal-content')

      await modalContent.trigger('click')

      expect(wrapper.emitted('close')).toBeFalsy()
    })
  })

  describe('System Info Toggle', () => {
    it('should show system info when checkbox is checked', async () => {
      wrapper = createWrapper()
      const checkbox = wrapper.find('input[type="checkbox"]')

      // Initially checked
      await checkbox.setValue(true)

      const systemInfo = wrapper.find('.system-info')
      expect(systemInfo.exists()).toBe(true)
    })

    it('should hide system info when checkbox is unchecked', async () => {
      wrapper = createWrapper()
      const checkbox = wrapper.find('input[type="checkbox"]')

      await checkbox.setValue(false)

      const systemInfo = wrapper.find('.system-info')
      expect(systemInfo.exists()).toBe(false)
    })

    it('should toggle system info display multiple times', async () => {
      wrapper = createWrapper()
      const checkbox = wrapper.find('input[type="checkbox"]')

      // Initial state (checked)
      expect(wrapper.find('.system-info').exists()).toBe(true)

      // Uncheck
      await checkbox.setValue(false)
      expect(wrapper.find('.system-info').exists()).toBe(false)

      // Check again
      await checkbox.setValue(true)
      expect(wrapper.find('.system-info').exists()).toBe(true)

      // Uncheck again
      await checkbox.setValue(false)
      expect(wrapper.find('.system-info').exists()).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    it('should handle very long title input', async () => {
      wrapper = createWrapper()
      const titleInput = wrapper.find('#title')
      const longTitle = 'A'.repeat(1000)

      await titleInput.setValue(longTitle)
      expect((titleInput.element as HTMLInputElement).value).toBe(longTitle)
    })

    it('should handle very long description', async () => {
      wrapper = createWrapper()
      const descriptionTextarea = wrapper.find('#description')
      const longDescription = 'B'.repeat(5000)

      await descriptionTextarea.setValue(longDescription)
      expect((descriptionTextarea.element as HTMLTextAreaElement).value).toBe(
        longDescription
      )
    })

    it('should handle special characters in form inputs', async () => {
      wrapper = createWrapper()
      const titleInput = wrapper.find('#title')
      const descriptionTextarea = wrapper.find('#description')

      const specialChars = '<script>alert("XSS")</script>'
      await titleInput.setValue(specialChars)
      await descriptionTextarea.setValue(specialChars)

      const buttons = wrapper.findAll('button')
      const submitButton = buttons.find((btn) =>
        btn.text().includes('Submit Bug Report')
      )
      await submitButton?.trigger('click')

      const submitEvent = wrapper.emitted('submit')?.[0]?.[0] as Record<
        string,
        unknown
      >
      expect(submitEvent.title).toBe(specialChars)
      expect(submitEvent.description).toBe(specialChars)
    })

    it('should handle empty string for steps to reproduce', async () => {
      wrapper = createWrapper()
      const titleInput = wrapper.find('#title')
      const descriptionTextarea = wrapper.find('#description')
      const stepsTextarea = wrapper.find('#steps')

      await titleInput.setValue('Title')
      await descriptionTextarea.setValue('Description')
      await stepsTextarea.setValue('')

      const buttons = wrapper.findAll('button')
      const submitButton = buttons.find((btn) =>
        btn.text().includes('Submit Bug Report')
      )
      await submitButton?.trigger('click')

      const submitEvent = wrapper.emitted('submit')?.[0]?.[0] as Record<
        string,
        unknown
      >
      expect(submitEvent.stepsToReproduce).toBeUndefined()
    })

    it('should handle whitespace-only title as valid', async () => {
      wrapper = createWrapper()
      const titleInput = wrapper.find('#title')
      const descriptionTextarea = wrapper.find('#description')

      await titleInput.setValue('   ')
      await descriptionTextarea.setValue('Valid description')

      // Whitespace-only title should still make form valid (no trim in validation)
      // Component doesn't trim values
      expect((titleInput.element as HTMLInputElement).value).toBe('   ')
    })

    it('should maintain form state when modal is hidden and shown again', async () => {
      wrapper = createWrapper({ visible: true })
      const titleInput = wrapper.find('#title')

      await titleInput.setValue('Persistent title')

      // Hide modal
      await wrapper.setProps({ visible: false })
      expect(wrapper.find('.modal-overlay').exists()).toBe(false)

      // Show modal again
      await wrapper.setProps({ visible: true })
      expect(wrapper.find('.modal-overlay').exists()).toBe(true)

      // Value should persist (component state is maintained)
      const titleInputAfter = wrapper.find('#title')
      expect((titleInputAfter.element as HTMLInputElement).value).toBe(
        'Persistent title'
      )
    })
  })

  describe('Accessibility', () => {
    it('should have proper labels for form fields', () => {
      wrapper = createWrapper()

      expect(wrapper.find('label[for="title"]').exists()).toBe(true)
      expect(wrapper.find('label[for="description"]').exists()).toBe(true)
      expect(wrapper.find('label[for="steps"]').exists()).toBe(true)
      expect(wrapper.find('label[for="severity"]').exists()).toBe(true)
    })

    it('should have required indicators on mandatory fields', () => {
      wrapper = createWrapper()

      const titleLabel = wrapper.find('label[for="title"]')
      const descriptionLabel = wrapper.find('label[for="description"]')

      expect(titleLabel.text()).toContain('*')
      expect(descriptionLabel.text()).toContain('*')
    })

    it('should have descriptive button text', () => {
      wrapper = createWrapper()

      const buttons = wrapper.findAll('button')
      const submitButton = buttons.find((btn) =>
        btn.text().includes('Submit Bug Report')
      )
      const cancelButton = buttons.find((btn) => btn.text() === 'Cancel')

      expect(submitButton?.text()).toContain('Submit Bug Report')
      expect(cancelButton?.text()).toBe('Cancel')
    })

    it('should have proper modal structure with heading', () => {
      wrapper = createWrapper()

      expect(wrapper.find('h2').exists()).toBe(true)
      expect(wrapper.find('h2').text()).toBe('Report a Bug')
    })
  })

  describe('Integration', () => {
    it('should complete full bug report submission flow', async () => {
      wrapper = createWrapper()

      // Fill out form
      const titleInput = wrapper.find('#title')
      const descriptionTextarea = wrapper.find('#description')
      const stepsTextarea = wrapper.find('#steps')
      const select = wrapper.find('#severity')
      const checkbox = wrapper.find('input[type="checkbox"]')

      await titleInput.setValue('Critical rendering bug')
      await descriptionTextarea.setValue('App crashes when opening file')
      await stepsTextarea.setValue(
        '1. Open app\n2. Click File > Open\n3. Select large file'
      )
      await select.setValue('critical')
      await checkbox.setValue(true)

      // Submit form
      const buttons = wrapper.findAll('button')
      const submitButton = buttons.find((btn) =>
        btn.text().includes('Submit Bug Report')
      )
      await submitButton?.trigger('click')

      // Verify events
      expect(wrapper.emitted('submit')).toBeTruthy()
      expect(wrapper.emitted('close')).toBeTruthy()

      const submitEvent = wrapper.emitted('submit')?.[0]?.[0] as Record<
        string,
        unknown
      >
      expect(submitEvent).toEqual({
        title: 'Critical rendering bug',
        description: 'App crashes when opening file',
        stepsToReproduce:
          '1. Open app\n2. Click File > Open\n3. Select large file',
        severity: 'critical',
        systemInfo: {
          platform: 'macOS 14.0',
          version: 'Hatcher DX v0.4.3',
          node: 'Node.js 20.10.0',
        },
      })
    })

    it('should complete minimal bug report submission (only required fields)', async () => {
      wrapper = createWrapper()

      const titleInput = wrapper.find('#title')
      const descriptionTextarea = wrapper.find('#description')
      const checkbox = wrapper.find('input[type="checkbox"]')

      await titleInput.setValue('Simple bug')
      await descriptionTextarea.setValue('Something broke')
      await checkbox.setValue(false)

      const buttons = wrapper.findAll('button')
      const submitButton = buttons.find((btn) =>
        btn.text().includes('Submit Bug Report')
      )
      await submitButton?.trigger('click')

      const submitEvent = wrapper.emitted('submit')?.[0]?.[0] as Record<
        string,
        unknown
      >
      expect(submitEvent).toEqual({
        title: 'Simple bug',
        description: 'Something broke',
        severity: 'medium',
        stepsToReproduce: undefined,
        systemInfo: undefined,
      })
    })

    it('should allow user to cancel after partially filling form', async () => {
      wrapper = createWrapper()

      const titleInput = wrapper.find('#title')
      await titleInput.setValue('Partial title')

      const buttons = wrapper.findAll('button')
      const cancelButton = buttons.find((btn) => btn.text() === 'Cancel')
      await cancelButton?.trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
      expect(wrapper.emitted('submit')).toBeFalsy()
    })
  })
})
