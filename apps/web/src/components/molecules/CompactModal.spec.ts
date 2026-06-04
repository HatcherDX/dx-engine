/**
 * @fileoverview Comprehensive test suite for CompactModal component.
 *
 * @description
 * Tests all functionality including modal visibility, context usage display,
 * compaction strategies, preservation instructions, and event emissions.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick, type ComponentPublicInstance } from 'vue'
import CompactModal from './CompactModal.vue'
import BaseIcon from '../atoms/BaseIcon.vue'
import BaseButton from '../atoms/BaseButton.vue'

/**
 * Type definition for Compact Modal VM instance.
 */
interface CompactModalVM {
  selectedStrategy: string
  preserveCode: boolean
  preserveErrors: boolean
  preserveRecent: boolean
  contextUsagePercent: number
  handleCompact: () => void
}

/**
 * Mock composables.
 */
const mockSuccess = vi.fn()

vi.mock('../../composables/useNotifications', () => ({
  useNotifications: () => ({
    success: mockSuccess,
    warning: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}))

describe('CompactModal.vue', () => {
  let wrapper: VueWrapper<ComponentPublicInstance>

  /**
   * Cleanup after each test.
   */
  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    mockSuccess.mockClear()
  })

  /**
   * Helper to mount component.
   */
  const createWrapper = (props = {}, options = {}) => {
    return mount(CompactModal, {
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

    it('should render modal title "Compact Conversation"', () => {
      wrapper = createWrapper()
      expect(wrapper.find('.modal-title').text()).toBe('Compact Conversation')
    })

    it('should render close button with aria-label', () => {
      wrapper = createWrapper()
      const closeButton = wrapper.find('.close-button')
      expect(closeButton.exists()).toBe(true)
      expect(closeButton.attributes('aria-label')).toBe('Close')
    })

    it('should render context usage section', () => {
      wrapper = createWrapper()
      expect(wrapper.find('.usage-section').exists()).toBe(true)
      expect(wrapper.find('.section-title').text()).toBe(
        'Current Context Usage'
      )
    })

    it('should render usage bar with fill', () => {
      wrapper = createWrapper()
      const usageBar = wrapper.find('.usage-bar')
      const usageFill = wrapper.find('.usage-fill')
      expect(usageBar.exists()).toBe(true)
      expect(usageFill.exists()).toBe(true)
    })

    it('should render token usage stats', () => {
      wrapper = createWrapper()
      const stats = wrapper.find('.usage-stats')
      expect(stats.exists()).toBe(true)
      expect(stats.text()).toContain('185.0K')
      expect(stats.text()).toContain('200.0K')
      expect(stats.text()).toContain('93%')
    })

    it('should render preservation instructions textarea', () => {
      wrapper = createWrapper()
      const textarea = wrapper.find('#compact-instructions')
      expect(textarea.exists()).toBe(true)
      expect(textarea.attributes('placeholder')).toContain(
        'Specify what to preserve'
      )
    })

    it('should render compaction strategy options', () => {
      wrapper = createWrapper()
      const radioInputs = wrapper.findAll('input[type="radio"]')
      expect(radioInputs).toHaveLength(3)
    })

    it('should render all three strategy options', () => {
      wrapper = createWrapper()
      const optionTitles = wrapper.findAll('.option-title')
      expect(optionTitles).toHaveLength(3)
      expect(optionTitles[0].text()).toBe('Automatic')
      expect(optionTitles[1].text()).toBe('Aggressive')
      expect(optionTitles[2].text()).toBe('Conservative')
    })

    it('should render info section with warnings', () => {
      wrapper = createWrapper()
      const infoItems = wrapper.findAll('.info-item')
      expect(infoItems).toHaveLength(2)
      expect(infoItems[0].text()).toContain('summary of the conversation')
      expect(infoItems[1].text()).toContain('cannot be undone')
    })

    it('should render footer with Cancel and Compact buttons', () => {
      wrapper = createWrapper()
      const footer = wrapper.find('.modal-footer')
      expect(footer.exists()).toBe(true)
    })
  })

  describe('Context Usage Display', () => {
    it('should calculate context usage percentage correctly', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as CompactModalVM

      // Default: 185000 / 200000 = 92.5%, rounded to 93%
      expect(vm.contextUsage).toBe(93)
    })

    it('should display usage fill with correct width', () => {
      wrapper = createWrapper()
      const usageFill = wrapper.find('.usage-fill')

      expect(usageFill.attributes('style')).toContain('width: 93%')
    })

    it('should apply warning class when usage >= 85%', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as CompactModalVM

      // Default is 93%, should be warning
      expect(vm.getUsageClass(vm.contextUsage)).toBe('warning')

      const usageFill = wrapper.find('.usage-fill')
      expect(usageFill.classes()).toContain('warning')
    })

    it('should apply critical class when usage >= 95%', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as CompactModalVM

      vm.usedTokens = 195000
      await nextTick()

      expect(vm.getUsageClass(vm.contextUsage)).toBe('critical')
    })

    it('should apply normal class when usage < 85%', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as CompactModalVM

      vm.usedTokens = 160000
      await nextTick()

      expect(vm.getUsageClass(vm.contextUsage)).toBe('normal')
    })

    it('should format tokens with M suffix for millions', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as CompactModalVM

      expect(vm.formatTokens(1000000)).toBe('1.0M')
      expect(vm.formatTokens(2500000)).toBe('2.5M')
    })

    it('should format tokens with K suffix for thousands', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as CompactModalVM

      expect(vm.formatTokens(1000)).toBe('1.0K')
      expect(vm.formatTokens(185000)).toBe('185.0K')
    })

    it('should format tokens without suffix for small numbers', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as CompactModalVM

      expect(vm.formatTokens(999)).toBe('999')
      expect(vm.formatTokens(500)).toBe('500')
    })
  })

  describe('Preservation Instructions', () => {
    it('should initialize with empty instructions', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as CompactModalVM

      expect(vm.instructions).toBe('')
    })

    it('should update instructions when textarea is modified', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as CompactModalVM
      const textarea = wrapper.find('#compact-instructions')

      await textarea.setValue('Keep authentication discussion')
      expect(vm.instructions).toBe('Keep authentication discussion')
    })

    it('should display input hint', () => {
      wrapper = createWrapper()
      const hint = wrapper.find('.input-hint')
      expect(hint.text()).toContain('Leave empty for automatic')
    })
  })

  describe('Compaction Strategy', () => {
    it('should initialize with auto strategy by default', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as CompactModalVM

      expect(vm.strategy).toBe('auto')
    })

    it('should update strategy when auto is selected', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as CompactModalVM
      const radioInputs = wrapper.findAll('input[type="radio"]')

      await radioInputs[0].setValue(true)
      expect(vm.strategy).toBe('auto')
    })

    it('should update strategy when aggressive is selected', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as CompactModalVM
      const radioInputs = wrapper.findAll('input[type="radio"]')

      await radioInputs[1].setValue(true)
      expect(vm.strategy).toBe('aggressive')
    })

    it('should update strategy when conservative is selected', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as CompactModalVM
      const radioInputs = wrapper.findAll('input[type="radio"]')

      await radioInputs[2].setValue(true)
      expect(vm.strategy).toBe('conservative')
    })

    it('should display strategy descriptions', () => {
      wrapper = createWrapper()
      const descriptions = wrapper.findAll('.option-description')

      expect(descriptions[0].text()).toContain('AI determines')
      expect(descriptions[1].text()).toContain('Maximum compression')
      expect(descriptions[2].text()).toContain('Minimal compression')
    })
  })

  describe('Compact Functionality', () => {
    it('should emit compact event when compact button is clicked', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      await nextTick()

      const buttons = wrapper.findAll('button')
      const compactButton = buttons.find((btn) =>
        btn.text().includes('Compact')
      )
      await compactButton!.trigger('click')
      await nextTick()

      expect(wrapper.emitted('compact')).toBeTruthy()
    })

    it('should emit compact with empty instructions by default', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      await nextTick()

      const buttons = wrapper.findAll('button')
      const compactButton = buttons.find((btn) =>
        btn.text().includes('Compact')
      )
      await compactButton!.trigger('click')
      await nextTick()

      const emitted = wrapper.emitted('compact')![0][0] as Record<
        string,
        unknown
      >
      expect(emitted.instructions).toBeUndefined()
      expect(emitted.strategy).toBe('auto')
    })

    it('should emit compact with instructions when provided', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      await nextTick()

      const textarea = wrapper.find('#compact-instructions')
      await textarea.setValue('Keep code examples')

      const buttons = wrapper.findAll('button')
      const compactButton = buttons.find((btn) =>
        btn.text().includes('Compact')
      )
      await compactButton!.trigger('click')
      await nextTick()

      const emitted = wrapper.emitted('compact')![0][0] as Record<
        string,
        unknown
      >
      expect(emitted.instructions).toBe('Keep code examples')
      expect(emitted.strategy).toBe('auto')
    })

    it('should emit compact with selected strategy', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      await nextTick()

      const radioInputs = wrapper.findAll('input[type="radio"]')
      await radioInputs[1].setValue(true) // aggressive

      const buttons = wrapper.findAll('button')
      const compactButton = buttons.find((btn) =>
        btn.text().includes('Compact')
      )
      await compactButton!.trigger('click')
      await nextTick()

      const emitted = wrapper.emitted('compact')![0][0] as Record<
        string,
        unknown
      >
      expect(emitted.strategy).toBe('aggressive')
    })

    it('should trim instructions whitespace before emitting', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      await nextTick()

      const textarea = wrapper.find('#compact-instructions')
      await textarea.setValue('   Keep auth   ')

      const buttons = wrapper.findAll('button')
      const compactButton = buttons.find((btn) =>
        btn.text().includes('Compact')
      )
      await compactButton!.trigger('click')
      await nextTick()

      const emitted = wrapper.emitted('compact')![0][0] as Record<
        string,
        unknown
      >
      expect(emitted.instructions).toBe('Keep auth')
    })

    it('should call success notification when compacting', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      await nextTick()

      const buttons = wrapper.findAll('button')
      const compactButton = buttons.find((btn) =>
        btn.text().includes('Compact')
      )
      await compactButton!.trigger('click')
      await nextTick()

      expect(mockSuccess).toHaveBeenCalledWith('Compacting conversation...')
    })

    it('should emit close event after compacting', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      await nextTick()

      const buttons = wrapper.findAll('button')
      const compactButton = buttons.find((btn) =>
        btn.text().includes('Compact')
      )
      await compactButton!.trigger('click')
      await nextTick()

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should call handleCompact directly', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as CompactModalVM

      vm.handleCompact()

      expect(wrapper.emitted('compact')).toBeTruthy()
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

    it('should call handleOverlayClick when overlay is clicked', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as CompactModalVM

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
    it('should initialize with default token values', () => {
      wrapper = createWrapper({ visible: false })
      const vm = wrapper.vm as unknown as CompactModalVM

      expect(vm.usedTokens).toBe(185000)
      expect(vm.maxTokens).toBe(200000)
    })

    it('should allow updating token values', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as CompactModalVM

      vm.usedTokens = 150000
      vm.maxTokens = 180000
      await nextTick()

      expect(vm.usedTokens).toBe(150000)
      expect(vm.maxTokens).toBe(180000)
    })

    it('should recalculate contextUsage when tokens change', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as CompactModalVM

      vm.usedTokens = 100000
      vm.maxTokens = 200000
      await nextTick()

      expect(vm.contextUsage).toBe(50)
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

    it('should have proper label for textarea', () => {
      wrapper = createWrapper()
      const label = wrapper.find('.input-label')
      expect(label.exists()).toBe(true)
      expect(label.text()).toContain('Preservation Instructions')
    })

    it('should have proper radio inputs with values', () => {
      wrapper = createWrapper()
      const radioInputs = wrapper.findAll('input[type="radio"]')

      expect(radioInputs[0].attributes('value')).toBe('auto')
      expect(radioInputs[1].attributes('value')).toBe('aggressive')
      expect(radioInputs[2].attributes('value')).toBe('conservative')
    })
  })

  describe('Edge Cases', () => {
    it('should handle zero tokens correctly', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as CompactModalVM

      vm.usedTokens = 0
      await nextTick()

      expect(vm.contextUsage).toBe(0)
      expect(vm.formatTokens(0)).toBe('0')
    })

    it('should handle max tokens correctly', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as CompactModalVM

      vm.usedTokens = 200000
      await nextTick()

      expect(vm.contextUsage).toBe(100)
    })

    it('should handle empty string instructions', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      await nextTick()

      const textarea = wrapper.find('#compact-instructions')
      await textarea.setValue('   ')

      const buttons = wrapper.findAll('button')
      const compactButton = buttons.find((btn) =>
        btn.text().includes('Compact')
      )
      await compactButton!.trigger('click')
      await nextTick()

      const emitted = wrapper.emitted('compact')![0][0] as Record<
        string,
        unknown
      >
      expect(emitted.instructions).toBeUndefined()
    })

    it('should handle very large token numbers', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as CompactModalVM

      expect(vm.formatTokens(5000000)).toBe('5.0M')
      expect(vm.formatTokens(10500000)).toBe('10.5M')
    })

    it('should handle exact boundary values for usage classes', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as CompactModalVM

      expect(vm.getUsageClass(94)).toBe('warning')
      expect(vm.getUsageClass(95)).toBe('critical')
      expect(vm.getUsageClass(84)).toBe('normal')
      expect(vm.getUsageClass(85)).toBe('warning')
    })
  })

  describe('Integration Tests', () => {
    it('should complete full workflow: add instructions, select strategy, and compact', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      await nextTick()

      // Add instructions
      const textarea = wrapper.find('#compact-instructions')
      await textarea.setValue('Preserve authentication logic')

      // Select aggressive strategy
      const radioInputs = wrapper.findAll('input[type="radio"]')
      await radioInputs[1].setValue(true)

      // Click compact
      const buttons = wrapper.findAll('button')
      const compactButton = buttons.find((btn) =>
        btn.text().includes('Compact')
      )
      await compactButton!.trigger('click')
      await nextTick()

      // Verify emissions
      expect(wrapper.emitted('compact')).toBeTruthy()
      const emitted = wrapper.emitted('compact')![0][0] as Record<
        string,
        unknown
      >
      expect(emitted.instructions).toBe('Preserve authentication logic')
      expect(emitted.strategy).toBe('aggressive')
      expect(wrapper.emitted('close')).toBeTruthy()
      expect(mockSuccess).toHaveBeenCalled()
    })

    it('should complete workflow: compact with default settings', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      await nextTick()

      // Click compact without changing anything
      const buttons = wrapper.findAll('button')
      const compactButton = buttons.find((btn) =>
        btn.text().includes('Compact')
      )
      await compactButton!.trigger('click')
      await nextTick()

      // Verify emissions
      const emitted = wrapper.emitted('compact')![0][0] as Record<
        string,
        unknown
      >
      expect(emitted.instructions).toBeUndefined()
      expect(emitted.strategy).toBe('auto')
    })

    it('should complete workflow: cancel without compacting', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      await nextTick()

      // Add some instructions
      const textarea = wrapper.find('#compact-instructions')
      await textarea.setValue('Test instructions')

      // Click cancel
      const buttons = wrapper.findAll('button')
      const cancelButton = buttons.find((btn) => btn.text().includes('Cancel'))
      await cancelButton!.trigger('click')

      // Verify only close was emitted
      expect(wrapper.emitted('compact')).toBeFalsy()
      expect(wrapper.emitted('close')).toBeTruthy()
    })
  })

  describe('Usage Class Display', () => {
    it('should display stat-percentage with normal class', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as CompactModalVM

      vm.usedTokens = 160000
      await nextTick()

      const statPercentage = wrapper.find('.stat-percentage')
      expect(statPercentage.classes()).toContain('normal')
    })

    it('should display stat-percentage with warning class', () => {
      wrapper = createWrapper()
      const statPercentage = wrapper.find('.stat-percentage')

      // Default is 93%, should be warning
      expect(statPercentage.classes()).toContain('warning')
    })

    it('should display stat-percentage with critical class', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as CompactModalVM

      vm.usedTokens = 195000
      await nextTick()

      const statPercentage = wrapper.find('.stat-percentage')
      expect(statPercentage.classes()).toContain('critical')
    })
  })
})
