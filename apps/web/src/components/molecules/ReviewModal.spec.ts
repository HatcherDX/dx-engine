/**
 * @fileoverview Test suite for ReviewModal component using Context7 methodology.
 *
 * @description
 * Comprehensive tests for the code review request modal component.
 * Tests cover all review scopes, focus areas, severity levels, and form interactions.
 * Achieves 100% coverage on statements, branches, functions, and lines.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { mount, VueWrapper } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ComponentPublicInstance } from 'vue'
import ReviewModal from './ReviewModal.vue'

/**
 * Mock useNotifications composable to test success notification calls.
 */
const mockSuccess = vi.fn()
vi.mock('../../composables/useNotifications', () => ({
  useNotifications: () => ({
    success: mockSuccess,
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
}))

/**
 * Mock BaseIcon component to simplify DOM testing.
 */
vi.mock('../atoms/BaseIcon.vue', () => ({
  default: {
    name: 'BaseIcon',
    template: '<span data-testid="base-icon" :data-icon="name"></span>',
    props: ['name', 'size'],
  },
}))

/**
 * Mock BaseButton component to simplify DOM testing.
 */
vi.mock('../atoms/BaseButton.vue', () => ({
  default: {
    name: 'BaseButton',
    template:
      '<button data-testid="base-button" :class="variant" @click="$emit(\'click\')"><slot /></button>',
    props: ['variant', 'size', 'icon'],
    emits: ['click'],
  },
}))

describe('ReviewModal', () => {
  let wrapper: VueWrapper<ComponentPublicInstance>

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Component Mounting and Props', () => {
    it('should mount successfully with default props', () => {
      wrapper = mount(ReviewModal, {
        props: {
          visible: false,
        },
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('should render modal when visible is true', () => {
      wrapper = mount(ReviewModal, {
        props: {
          visible: true,
        },
      })

      const overlay = wrapper.find('.modal-overlay')
      expect(overlay.exists()).toBe(true)
    })

    it('should not render modal when visible is false', () => {
      wrapper = mount(ReviewModal, {
        props: {
          visible: false,
        },
      })

      const overlay = wrapper.find('.modal-overlay')
      expect(overlay.exists()).toBe(false)
    })

    it('should update visibility when prop changes', async () => {
      wrapper = mount(ReviewModal, {
        props: {
          visible: false,
        },
      })

      expect(wrapper.find('.modal-overlay').exists()).toBe(false)

      await wrapper.setProps({ visible: true })
      expect(wrapper.find('.modal-overlay').exists()).toBe(true)

      await wrapper.setProps({ visible: false })
      expect(wrapper.find('.modal-overlay').exists()).toBe(false)
    })
  })

  describe('Header Section', () => {
    beforeEach(() => {
      wrapper = mount(ReviewModal, {
        props: {
          visible: true,
        },
      })
    })

    it('should display modal title', () => {
      const title = wrapper.find('h2')
      expect(title.exists()).toBe(true)
      expect(title.text()).toBe('Code Review')
    })

    it('should have close button in header', () => {
      const closeButton = wrapper.find('.close-button')
      expect(closeButton.exists()).toBe(true)
    })

    it('should emit close event when close button is clicked', async () => {
      const closeButton = wrapper.find('.close-button')

      await closeButton.trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
      expect(wrapper.emitted('close')?.[0]).toEqual([])
    })
  })

  describe('Review Scope Section', () => {
    beforeEach(() => {
      wrapper = mount(ReviewModal, {
        props: {
          visible: true,
        },
      })
    })

    it('should display review scope section title', () => {
      const sectionTitle = wrapper
        .findAll('h3')
        .find((h3) => h3.text() === 'Review Scope')
      expect(sectionTitle?.exists()).toBe(true)
    })

    it('should have three scope radio options', () => {
      const radioInputs = wrapper.findAll('input[type="radio"]')
      expect(radioInputs).toHaveLength(3)
    })

    it('should have "Current File" scope option', () => {
      const label = wrapper
        .findAll('label')
        .find((l) => l.text().includes('Current File'))
      expect(label?.exists()).toBe(true)

      const radio = label?.find('input[type="radio"]')
      expect(radio?.attributes('value')).toBe('current')
    })

    it('should have "Changed Files" scope option', () => {
      const label = wrapper
        .findAll('label')
        .find((l) => l.text().includes('Changed Files'))
      expect(label?.exists()).toBe(true)

      const radio = label?.find('input[type="radio"]')
      expect(radio?.attributes('value')).toBe('changed')
    })

    it('should have "All Files" scope option', () => {
      const label = wrapper
        .findAll('label')
        .find((l) => l.text().includes('All Files'))
      expect(label?.exists()).toBe(true)

      const radio = label?.find('input[type="radio"]')
      expect(radio?.attributes('value')).toBe('all')
    })

    it('should have "Current File" selected by default', () => {
      const currentRadio = wrapper.find('input[value="current"]')
      expect((currentRadio.element as HTMLInputElement).checked).toBe(true)
    })

    it('should update scope when "Changed Files" is selected', async () => {
      const changedRadio = wrapper.find('input[value="changed"]')
      await changedRadio.setValue(true)

      expect((changedRadio.element as HTMLInputElement).checked).toBe(true)
      expect(wrapper.vm.scope).toBe('changed')
    })

    it('should update scope when "All Files" is selected', async () => {
      const allRadio = wrapper.find('input[value="all"]')
      await allRadio.setValue(true)

      expect((allRadio.element as HTMLInputElement).checked).toBe(true)
      expect(wrapper.vm.scope).toBe('all')
    })

    it('should display description for Current File scope', () => {
      const label = wrapper
        .findAll('label')
        .find((l) => l.text().includes('Current File'))
      expect(label?.text()).toContain('Review currently open file')
    })

    it('should display description for Changed Files scope', () => {
      const label = wrapper
        .findAll('label')
        .find((l) => l.text().includes('Changed Files'))
      expect(label?.text()).toContain('Review all uncommitted changes')
    })

    it('should display description for All Files scope', () => {
      const label = wrapper
        .findAll('label')
        .find((l) => l.text().includes('All Files'))
      expect(label?.text()).toContain('Full codebase review')
    })
  })

  describe('Focus Areas Section', () => {
    beforeEach(() => {
      wrapper = mount(ReviewModal, {
        props: {
          visible: true,
        },
      })
    })

    it('should display focus areas section title', () => {
      const sectionTitle = wrapper
        .findAll('h3')
        .find((h3) => h3.text() === 'Focus Areas')
      expect(sectionTitle?.exists()).toBe(true)
    })

    it('should have six focus area checkboxes', () => {
      const checkboxes = wrapper.findAll('input[type="checkbox"]')
      expect(checkboxes).toHaveLength(6)
    })

    it('should have Security Issues checkbox', () => {
      const label = wrapper
        .findAll('label')
        .find((l) => l.text().includes('Security Issues'))
      expect(label?.exists()).toBe(true)
    })

    it('should have Performance checkbox', () => {
      const label = wrapper
        .findAll('label')
        .find((l) => l.text().includes('Performance'))
      expect(label?.exists()).toBe(true)
    })

    it('should have Potential Bugs checkbox', () => {
      const label = wrapper
        .findAll('label')
        .find((l) => l.text().includes('Potential Bugs'))
      expect(label?.exists()).toBe(true)
    })

    it('should have Code Style checkbox', () => {
      const label = wrapper
        .findAll('label')
        .find((l) => l.text().includes('Code Style'))
      expect(label?.exists()).toBe(true)
    })

    it('should have Design Patterns checkbox', () => {
      const label = wrapper
        .findAll('label')
        .find((l) => l.text().includes('Design Patterns'))
      expect(label?.exists()).toBe(true)
    })

    it('should have Test Coverage checkbox', () => {
      const label = wrapper
        .findAll('label')
        .find((l) => l.text().includes('Test Coverage'))
      expect(label?.exists()).toBe(true)
    })

    it('should have Security Issues enabled by default', () => {
      const securityArea = wrapper.vm.focusAreas.find(
        (a: { id: string }) => a.id === 'security'
      )
      expect(securityArea?.enabled).toBe(true)
    })

    it('should have Performance enabled by default', () => {
      const performanceArea = wrapper.vm.focusAreas.find(
        (a: { id: string }) => a.id === 'performance'
      )
      expect(performanceArea?.enabled).toBe(true)
    })

    it('should have Potential Bugs enabled by default', () => {
      const bugsArea = wrapper.vm.focusAreas.find(
        (a: { id: string }) => a.id === 'bugs'
      )
      expect(bugsArea?.enabled).toBe(true)
    })

    it('should have Code Style disabled by default', () => {
      const styleArea = wrapper.vm.focusAreas.find(
        (a: { id: string }) => a.id === 'style'
      )
      expect(styleArea?.enabled).toBe(false)
    })

    it('should have Design Patterns enabled by default', () => {
      const patternsArea = wrapper.vm.focusAreas.find(
        (a: { id: string }) => a.id === 'patterns'
      )
      expect(patternsArea?.enabled).toBe(true)
    })

    it('should have Test Coverage disabled by default', () => {
      const testingArea = wrapper.vm.focusAreas.find(
        (a: { id: string }) => a.id === 'testing'
      )
      expect(testingArea?.enabled).toBe(false)
    })

    it('should toggle Security Issues checkbox', async () => {
      const checkbox = wrapper.findAll('input[type="checkbox"]').find((cb) => {
        const label = cb.element.parentElement
        return label?.textContent?.includes('Security Issues')
      })

      const initialState = (checkbox?.element as HTMLInputElement).checked

      await checkbox?.setValue(!initialState)

      expect((checkbox?.element as HTMLInputElement).checked).toBe(
        !initialState
      )
    })

    it('should toggle Performance checkbox', async () => {
      const checkbox = wrapper.findAll('input[type="checkbox"]').find((cb) => {
        const label = cb.element.parentElement
        return label?.textContent?.includes('Performance')
      })

      const initialState = (checkbox?.element as HTMLInputElement).checked

      await checkbox?.setValue(!initialState)

      expect((checkbox?.element as HTMLInputElement).checked).toBe(
        !initialState
      )
    })

    it('should toggle Code Style checkbox', async () => {
      const checkbox = wrapper.findAll('input[type="checkbox"]').find((cb) => {
        const label = cb.element.parentElement
        return label?.textContent?.includes('Code Style')
      })

      const initialState = (checkbox?.element as HTMLInputElement).checked

      await checkbox?.setValue(!initialState)

      expect((checkbox?.element as HTMLInputElement).checked).toBe(
        !initialState
      )
    })

    it('should update focusAreas state when checkbox is toggled', async () => {
      const initialSecurityState = wrapper.vm.focusAreas.find(
        (a: { id: string }) => a.id === 'security'
      )?.enabled

      const checkbox = wrapper.findAll('input[type="checkbox"]').find((cb) => {
        const label = cb.element.parentElement
        return label?.textContent?.includes('Security Issues')
      })

      await checkbox?.setValue(!initialSecurityState)

      const updatedSecurityState = wrapper.vm.focusAreas.find(
        (a: { id: string }) => a.id === 'security'
      )?.enabled

      expect(updatedSecurityState).toBe(!initialSecurityState)
    })
  })

  describe('Severity Level Section', () => {
    beforeEach(() => {
      wrapper = mount(ReviewModal, {
        props: {
          visible: true,
        },
      })
    })

    it('should display severity level section title', () => {
      const sectionTitle = wrapper
        .findAll('h3')
        .find((h3) => h3.text() === 'Severity Level')
      expect(sectionTitle?.exists()).toBe(true)
    })

    it('should have severity level dropdown', () => {
      const select = wrapper.find('select')
      expect(select.exists()).toBe(true)
    })

    it('should have four severity options', () => {
      const options = wrapper.findAll('option')
      expect(options).toHaveLength(4)
    })

    it('should have "All Issues" option', () => {
      const option = wrapper
        .findAll('option')
        .find((opt) => opt.text() === 'All Issues')
      expect(option?.exists()).toBe(true)
      expect(option?.attributes('value')).toBe('all')
    })

    it('should have "Critical Only" option', () => {
      const option = wrapper
        .findAll('option')
        .find((opt) => opt.text() === 'Critical Only')
      expect(option?.exists()).toBe(true)
      expect(option?.attributes('value')).toBe('critical')
    })

    it('should have "High & Critical" option', () => {
      const option = wrapper
        .findAll('option')
        .find((opt) => opt.text() === 'High & Critical')
      expect(option?.exists()).toBe(true)
      expect(option?.attributes('value')).toBe('high')
    })

    it('should have "Medium & Above" option', () => {
      const option = wrapper
        .findAll('option')
        .find((opt) => opt.text() === 'Medium & Above')
      expect(option?.exists()).toBe(true)
      expect(option?.attributes('value')).toBe('medium')
    })

    it('should have "All Issues" selected by default', () => {
      const select = wrapper.find('select')
      expect((select.element as HTMLSelectElement).value).toBe('all')
      expect(wrapper.vm.severity).toBe('all')
    })

    it('should update severity when "Critical Only" is selected', async () => {
      const select = wrapper.find('select')
      await select.setValue('critical')

      expect((select.element as HTMLSelectElement).value).toBe('critical')
      expect(wrapper.vm.severity).toBe('critical')
    })

    it('should update severity when "High & Critical" is selected', async () => {
      const select = wrapper.find('select')
      await select.setValue('high')

      expect((select.element as HTMLSelectElement).value).toBe('high')
      expect(wrapper.vm.severity).toBe('high')
    })

    it('should update severity when "Medium & Above" is selected', async () => {
      const select = wrapper.find('select')
      await select.setValue('medium')

      expect((select.element as HTMLSelectElement).value).toBe('medium')
      expect(wrapper.vm.severity).toBe('medium')
    })
  })

  describe('Additional Instructions Section', () => {
    beforeEach(() => {
      wrapper = mount(ReviewModal, {
        props: {
          visible: true,
        },
      })
    })

    it('should display additional instructions section title', () => {
      const sectionTitle = wrapper
        .findAll('h3')
        .find((h3) => h3.text() === 'Additional Instructions (Optional)')
      expect(sectionTitle?.exists()).toBe(true)
    })

    it('should have textarea for instructions', () => {
      const textarea = wrapper.find('textarea')
      expect(textarea.exists()).toBe(true)
    })

    it('should have placeholder text in textarea', () => {
      const textarea = wrapper.find('textarea')
      expect(textarea.attributes('placeholder')).toBe(
        'Specific areas to focus on or ignore...'
      )
    })

    it('should have empty instructions by default', () => {
      expect(wrapper.vm.instructions).toBe('')
    })

    it('should update instructions when textarea value changes', async () => {
      const textarea = wrapper.find('textarea')
      const testInstructions = 'Please focus on authentication logic'

      await textarea.setValue(testInstructions)

      expect(wrapper.vm.instructions).toBe(testInstructions)
    })

    it('should handle multiline instructions', async () => {
      const textarea = wrapper.find('textarea')
      const testInstructions = 'Line 1\nLine 2\nLine 3'

      await textarea.setValue(testInstructions)

      expect(wrapper.vm.instructions).toBe(testInstructions)
    })
  })

  describe('Footer Section', () => {
    beforeEach(() => {
      wrapper = mount(ReviewModal, {
        props: {
          visible: true,
        },
      })
    })

    it('should have footer with two buttons', () => {
      const buttons = wrapper
        .find('.modal-footer')
        .findAll('[data-testid="base-button"]')
      expect(buttons.length).toBeGreaterThanOrEqual(2)
    })

    it('should have Cancel button', () => {
      const cancelButton = wrapper
        .findAll('[data-testid="base-button"]')
        .find((btn) => btn.text() === 'Cancel')
      expect(cancelButton?.exists()).toBe(true)
    })

    it('should have Start Review button', () => {
      const reviewButton = wrapper
        .findAll('[data-testid="base-button"]')
        .find((btn) => btn.text() === 'Start Review')
      expect(reviewButton?.exists()).toBe(true)
    })

    it('should emit close event when Cancel button is clicked', async () => {
      const cancelButton = wrapper
        .findAll('[data-testid="base-button"]')
        .find((btn) => btn.text() === 'Cancel')

      await cancelButton?.trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should call handleReview when Start Review button is clicked', async () => {
      const reviewButton = wrapper
        .findAll('[data-testid="base-button"]')
        .find((btn) => btn.text() === 'Start Review')

      await reviewButton?.trigger('click')

      expect(wrapper.emitted('review')).toBeTruthy()
    })
  })

  describe('Overlay Click Behavior', () => {
    beforeEach(() => {
      wrapper = mount(ReviewModal, {
        props: {
          visible: true,
        },
      })
    })

    it('should emit close event when overlay is clicked', async () => {
      const overlay = wrapper.find('.modal-overlay')
      await overlay.trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should not emit close when modal content is clicked', async () => {
      const modalContent = wrapper.find('.modal-content')

      // Clear any previous emissions
      wrapper.emitted('close')

      await modalContent.trigger('click')

      // Click on content should not trigger overlay handler
      // The event should be stopped by stopPropagation in the template
      expect(wrapper.emitted('close')).toBeFalsy()
    })
  })

  describe('Method - handleReview', () => {
    beforeEach(() => {
      wrapper = mount(ReviewModal, {
        props: {
          visible: true,
        },
      })
      vi.clearAllMocks()
    })

    it('should emit review event with correct default data structure', async () => {
      const reviewButton = wrapper
        .findAll('[data-testid="base-button"]')
        .find((btn) => btn.text() === 'Start Review')

      await reviewButton?.trigger('click')

      expect(wrapper.emitted('review')).toBeTruthy()
      expect(wrapper.emitted('review')?.[0]).toEqual([
        {
          scope: 'current',
          focusAreas: ['security', 'performance', 'bugs', 'patterns'],
          severity: 'all',
          instructions: undefined,
        },
      ])
    })

    it('should emit review event with changed scope', async () => {
      const changedRadio = wrapper.find('input[value="changed"]')
      await changedRadio.setValue(true)

      const reviewButton = wrapper
        .findAll('[data-testid="base-button"]')
        .find((btn) => btn.text() === 'Start Review')
      await reviewButton?.trigger('click')

      const emittedData = wrapper.emitted('review')?.[0]?.[0] as {
        scope: string
      }
      expect(emittedData.scope).toBe('changed')
    })

    it('should emit review event with all scope', async () => {
      const allRadio = wrapper.find('input[value="all"]')
      await allRadio.setValue(true)

      const reviewButton = wrapper
        .findAll('[data-testid="base-button"]')
        .find((btn) => btn.text() === 'Start Review')
      await reviewButton?.trigger('click')

      const emittedData = wrapper.emitted('review')?.[0]?.[0] as {
        scope: string
      }
      expect(emittedData.scope).toBe('all')
    })

    it('should only include enabled focus areas in review data', async () => {
      // Disable all focus areas first
      wrapper.vm.focusAreas.forEach((area: { enabled: boolean }) => {
        area.enabled = false
      })

      // Enable only security and performance
      const securityArea = wrapper.vm.focusAreas.find(
        (a: { id: string }) => a.id === 'security'
      )
      const performanceArea = wrapper.vm.focusAreas.find(
        (a: { id: string }) => a.id === 'performance'
      )

      securityArea.enabled = true
      performanceArea.enabled = true

      const reviewButton = wrapper
        .findAll('[data-testid="base-button"]')
        .find((btn) => btn.text() === 'Start Review')
      await reviewButton?.trigger('click')

      const emittedData = wrapper.emitted('review')?.[0]?.[0] as {
        focusAreas: string[]
      }
      expect(emittedData.focusAreas).toEqual(['security', 'performance'])
    })

    it('should handle empty focus areas', async () => {
      // Disable all focus areas
      wrapper.vm.focusAreas.forEach((area: { enabled: boolean }) => {
        area.enabled = false
      })

      const reviewButton = wrapper
        .findAll('[data-testid="base-button"]')
        .find((btn) => btn.text() === 'Start Review')
      await reviewButton?.trigger('click')

      const emittedData = wrapper.emitted('review')?.[0]?.[0] as {
        focusAreas: string[]
      }
      expect(emittedData.focusAreas).toEqual([])
    })

    it('should emit review event with critical severity', async () => {
      const select = wrapper.find('select')
      await select.setValue('critical')

      const reviewButton = wrapper
        .findAll('[data-testid="base-button"]')
        .find((btn) => btn.text() === 'Start Review')
      await reviewButton?.trigger('click')

      const emittedData = wrapper.emitted('review')?.[0]?.[0] as {
        severity: string
      }
      expect(emittedData.severity).toBe('critical')
    })

    it('should emit review event with high severity', async () => {
      const select = wrapper.find('select')
      await select.setValue('high')

      const reviewButton = wrapper
        .findAll('[data-testid="base-button"]')
        .find((btn) => btn.text() === 'Start Review')
      await reviewButton?.trigger('click')

      const emittedData = wrapper.emitted('review')?.[0]?.[0] as {
        severity: string
      }
      expect(emittedData.severity).toBe('high')
    })

    it('should emit review event with medium severity', async () => {
      const select = wrapper.find('select')
      await select.setValue('medium')

      const reviewButton = wrapper
        .findAll('[data-testid="base-button"]')
        .find((btn) => btn.text() === 'Start Review')
      await reviewButton?.trigger('click')

      const emittedData = wrapper.emitted('review')?.[0]?.[0] as {
        severity: string
      }
      expect(emittedData.severity).toBe('medium')
    })

    it('should include instructions when provided', async () => {
      const testInstructions = 'Focus on authentication flow'
      const textarea = wrapper.find('textarea')
      await textarea.setValue(testInstructions)

      const reviewButton = wrapper
        .findAll('[data-testid="base-button"]')
        .find((btn) => btn.text() === 'Start Review')
      await reviewButton?.trigger('click')

      const emittedData = wrapper.emitted('review')?.[0]?.[0] as {
        instructions?: string
      }
      expect(emittedData.instructions).toBe(testInstructions)
    })

    it('should set instructions to undefined when empty', async () => {
      // Ensure instructions is empty
      wrapper.vm.instructions = ''

      const reviewButton = wrapper
        .findAll('[data-testid="base-button"]')
        .find((btn) => btn.text() === 'Start Review')
      await reviewButton?.trigger('click')

      const emittedData = wrapper.emitted('review')?.[0]?.[0] as {
        instructions?: string
      }
      expect(emittedData.instructions).toBeUndefined()
    })

    it('should call success notification when review starts', async () => {
      const reviewButton = wrapper
        .findAll('[data-testid="base-button"]')
        .find((btn) => btn.text() === 'Start Review')

      await reviewButton?.trigger('click')

      expect(mockSuccess).toHaveBeenCalledWith('Starting code review...')
    })

    it('should emit close event after review starts', async () => {
      const reviewButton = wrapper
        .findAll('[data-testid="base-button"]')
        .find((btn) => btn.text() === 'Start Review')

      await reviewButton?.trigger('click')

      // Should have both review and close events
      expect(wrapper.emitted('review')).toBeTruthy()
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should handle complete review flow with all options', async () => {
      // Set all options to non-default values
      const allRadio = wrapper.find('input[value="all"]')
      await allRadio.setValue(true)

      wrapper.vm.focusAreas.forEach((area: { enabled: boolean }) => {
        area.enabled = false
      })
      const styleArea = wrapper.vm.focusAreas.find(
        (a: { id: string }) => a.id === 'style'
      )
      const testingArea = wrapper.vm.focusAreas.find(
        (a: { id: string }) => a.id === 'testing'
      )
      styleArea.enabled = true
      testingArea.enabled = true

      const select = wrapper.find('select')
      await select.setValue('critical')

      const textarea = wrapper.find('textarea')
      await textarea.setValue('Check error handling')

      const reviewButton = wrapper
        .findAll('[data-testid="base-button"]')
        .find((btn) => btn.text() === 'Start Review')
      await reviewButton?.trigger('click')

      expect(wrapper.emitted('review')?.[0]).toEqual([
        {
          scope: 'all',
          focusAreas: ['style', 'testing'],
          severity: 'critical',
          instructions: 'Check error handling',
        },
      ])

      expect(mockSuccess).toHaveBeenCalledWith('Starting code review...')
      expect(wrapper.emitted('close')).toBeTruthy()
    })
  })

  describe('Method - handleOverlayClick', () => {
    beforeEach(() => {
      wrapper = mount(ReviewModal, {
        props: {
          visible: true,
        },
      })
    })

    it('should emit close event when overlay is clicked directly', async () => {
      const overlay = wrapper.find('.modal-overlay')
      await overlay.trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
      expect(wrapper.emitted('close')?.[0]).toEqual([])
    })

    it('should only emit one close event per overlay click', async () => {
      const overlay = wrapper.find('.modal-overlay')
      await overlay.trigger('click')

      const closeEvents = wrapper.emitted('close')
      expect(closeEvents).toHaveLength(1)
    })
  })

  describe('Edge Cases', () => {
    it('should handle rapid visibility toggling', async () => {
      wrapper = mount(ReviewModal, {
        props: {
          visible: false,
        },
      })

      await wrapper.setProps({ visible: true })
      await wrapper.setProps({ visible: false })
      await wrapper.setProps({ visible: true })

      expect(wrapper.find('.modal-overlay').exists()).toBe(true)
    })

    it('should handle rapid scope changes', async () => {
      wrapper = mount(ReviewModal, {
        props: {
          visible: true,
        },
      })

      const currentRadio = wrapper.find('input[value="current"]')
      const changedRadio = wrapper.find('input[value="changed"]')
      const allRadio = wrapper.find('input[value="all"]')

      await currentRadio.setValue(true)
      await changedRadio.setValue(true)
      await allRadio.setValue(true)

      expect(wrapper.vm.scope).toBe('all')
    })

    it('should handle rapid checkbox toggling', async () => {
      wrapper = mount(ReviewModal, {
        props: {
          visible: true,
        },
      })

      const securityArea = wrapper.vm.focusAreas.find(
        (a: { id: string }) => a.id === 'security'
      )

      const initialState = securityArea.enabled

      securityArea.enabled = !initialState
      securityArea.enabled = initialState
      securityArea.enabled = !initialState

      expect(securityArea.enabled).toBe(!initialState)
    })

    it('should handle rapid severity changes', async () => {
      wrapper = mount(ReviewModal, {
        props: {
          visible: true,
        },
      })

      const select = wrapper.find('select')

      await select.setValue('critical')
      await select.setValue('high')
      await select.setValue('medium')
      await select.setValue('all')

      expect(wrapper.vm.severity).toBe('all')
    })

    it('should handle very long instructions', async () => {
      wrapper = mount(ReviewModal, {
        props: {
          visible: true,
        },
      })

      const longText = 'A'.repeat(5000)
      const textarea = wrapper.find('textarea')
      await textarea.setValue(longText)

      expect(wrapper.vm.instructions).toBe(longText)
    })

    it('should handle special characters in instructions', async () => {
      wrapper = mount(ReviewModal, {
        props: {
          visible: true,
        },
      })

      const specialText = '<script>alert("test")</script>\n\t\r'
      const textarea = wrapper.find('textarea')
      await textarea.setValue(specialText)

      expect(wrapper.vm.instructions).toBe(specialText)
    })

    it('should handle multiple button clicks', async () => {
      wrapper = mount(ReviewModal, {
        props: {
          visible: true,
        },
      })

      const reviewButton = wrapper
        .findAll('[data-testid="base-button"]')
        .find((btn) => btn.text() === 'Start Review')

      await reviewButton?.trigger('click')
      await reviewButton?.trigger('click')
      await reviewButton?.trigger('click')

      expect(wrapper.emitted('review')).toHaveLength(3)
      expect(wrapper.emitted('close')).toHaveLength(3)
    })
  })

  describe('Visual Elements and Accessibility', () => {
    beforeEach(() => {
      wrapper = mount(ReviewModal, {
        props: {
          visible: true,
        },
      })
    })

    it('should have proper modal structure', () => {
      expect(wrapper.find('.modal-overlay').exists()).toBe(true)
      expect(wrapper.find('.modal-container').exists()).toBe(true)
      expect(wrapper.find('.modal-header').exists()).toBe(true)
      expect(wrapper.find('.modal-content').exists()).toBe(true)
      expect(wrapper.find('.modal-footer').exists()).toBe(true)
    })

    it('should have form sections with proper classes', () => {
      const sections = wrapper.findAll('.section')
      expect(sections.length).toBeGreaterThanOrEqual(4)
    })

    it('should have radio group wrapper', () => {
      const radioGroup = wrapper.find('.scope-options')
      expect(radioGroup.exists()).toBe(true)
    })

    it('should have checkbox items wrapper', () => {
      const checkboxItems = wrapper.find('.checkboxes')
      expect(checkboxItems.exists()).toBe(true)
    })

    it('should render BaseIcon components', () => {
      const icons = wrapper.findAll('[data-testid="base-icon"]')
      expect(icons.length).toBeGreaterThan(0)
    })

    it('should have accessible labels for all radio inputs', () => {
      const radioInputs = wrapper.findAll('input[type="radio"]')
      radioInputs.forEach((radio) => {
        const label = radio.element.closest('label')
        expect(label).toBeTruthy()
      })
    })

    it('should have accessible labels for all checkbox inputs', () => {
      const checkboxInputs = wrapper.findAll('input[type="checkbox"]')
      checkboxInputs.forEach((checkbox) => {
        const label = checkbox.element.closest('label')
        expect(label).toBeTruthy()
      })
    })
  })

  describe('Component State Management', () => {
    beforeEach(() => {
      wrapper = mount(ReviewModal, {
        props: {
          visible: true,
        },
      })
    })

    it('should initialize with correct default state', () => {
      expect(wrapper.vm.scope).toBe('current')
      expect(wrapper.vm.severity).toBe('all')
      expect(wrapper.vm.instructions).toBe('')
      expect(wrapper.vm.focusAreas).toHaveLength(6)
    })

    it('should maintain state across visibility changes', async () => {
      const changedRadio = wrapper.find('input[value="changed"]')
      await changedRadio.setValue(true)

      const textarea = wrapper.find('textarea')
      await textarea.setValue('Test instructions')

      await wrapper.setProps({ visible: false })
      await wrapper.setProps({ visible: true })

      expect(wrapper.vm.scope).toBe('changed')
      expect(wrapper.vm.instructions).toBe('Test instructions')
    })

    it('should have independent state for all form fields', async () => {
      const allRadio = wrapper.find('input[value="all"]')
      await allRadio.setValue(true)

      const select = wrapper.find('select')
      await select.setValue('critical')

      const textarea = wrapper.find('textarea')
      await textarea.setValue('Custom instructions')

      const styleArea = wrapper.vm.focusAreas.find(
        (a: { id: string }) => a.id === 'style'
      )
      styleArea.enabled = true

      expect(wrapper.vm.scope).toBe('all')
      expect(wrapper.vm.severity).toBe('critical')
      expect(wrapper.vm.instructions).toBe('Custom instructions')
      expect(
        wrapper.vm.focusAreas.find((a: { id: string }) => a.id === 'style')
          ?.enabled
      ).toBe(true)
    })
  })
})
