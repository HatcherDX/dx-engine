/**
 * @fileoverview Comprehensive test suite for ModelSelectorModal component.
 *
 * @description
 * Tests all functionality including modal visibility, provider loading,
 * provider selection, error handling, and ElectronAPI integration.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick, type ComponentPublicInstance } from 'vue'
import ModelSelectorModal from './ModelSelectorModal.vue'
import BaseIcon from '../atoms/BaseIcon.vue'
import BaseButton from '../atoms/BaseButton.vue'

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

describe('ModelSelectorModal.vue', () => {
  let wrapper: VueWrapper<ComponentPublicInstance>
  let mockElectronAPI: unknown

  /**
   * Setup before each test.
   */
  beforeEach(() => {
    // Mock Electron API
    mockElectronAPI = {
      aiChat: {
        getAvailableProviders: vi
          .fn()
          .mockResolvedValue(['Claude Code', 'Gemini', 'GPT-5']),
        setDefaultProvider: vi.fn().mockResolvedValue(undefined),
      },
    }

    // @ts-expect-error - Mock electronAPI for testing
    window.electronAPI = mockElectronAPI
  })

  /**
   * Helper to mount component.
   */
  const createWrapper = (props = {}, options = {}) => {
    return mount(ModelSelectorModal, {
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

    it('should render modal title', () => {
      wrapper = createWrapper()
      expect(wrapper.find('.modal-title').text()).toBe('Select AI Model')
    })

    it('should render close button', () => {
      wrapper = createWrapper()
      const closeButton = wrapper.find('.close-button')
      expect(closeButton.exists()).toBe(true)
      expect(closeButton.attributes('aria-label')).toBe('Close')
    })

    it('should render cancel button in footer', () => {
      wrapper = createWrapper()
      expect(wrapper.find('.modal-footer').exists()).toBe(true)
    })
  })

  describe('Loading State', () => {
    it('should show loading state initially', async () => {
      wrapper = createWrapper()
      await nextTick()

      const loadingState = wrapper.find('.loading-state')
      expect(loadingState.exists()).toBe(true)
      expect(loadingState.text()).toContain('Loading available models')
    })

    it('should show spinner during loading', async () => {
      wrapper = createWrapper()
      await nextTick()

      expect(wrapper.find('.spinner').exists()).toBe(true)
    })

    it('should hide loading state after providers are loaded', async () => {
      wrapper = createWrapper()
      await nextTick()
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(wrapper.find('.loading-state').exists()).toBe(false)
    })
  })

  describe('Error State', () => {
    it('should show error state when Electron API is not available', async () => {
      // @ts-expect-error - Testing error state with undefined API
      window.electronAPI = undefined

      wrapper = createWrapper()
      await nextTick()
      await new Promise((resolve) => setTimeout(resolve, 100))

      const errorState = wrapper.find('.error-state')
      expect(errorState.exists()).toBe(true)
      expect(errorState.text()).toContain('AI Chat API not available')
    })

    it('should show error when getAvailableProviders fails', async () => {
      mockElectronAPI.aiChat.getAvailableProviders = vi
        .fn()
        .mockRejectedValue(new Error('Network error'))

      wrapper = createWrapper()
      await nextTick()
      await new Promise((resolve) => setTimeout(resolve, 100))

      const errorState = wrapper.find('.error-state')
      expect(errorState.exists()).toBe(true)
      expect(errorState.text()).toContain('Network error')
    })

    it('should show generic error for non-Error exceptions', async () => {
      mockElectronAPI.aiChat.getAvailableProviders = vi
        .fn()
        .mockRejectedValue('String error')

      wrapper = createWrapper()
      await nextTick()
      await new Promise((resolve) => setTimeout(resolve, 100))

      const errorState = wrapper.find('.error-state')
      expect(errorState.exists()).toBe(true)
      expect(errorState.text()).toContain('Failed to load providers')
    })
  })

  describe('Providers List', () => {
    it('should load and display providers', async () => {
      wrapper = createWrapper()
      await nextTick()
      await new Promise((resolve) => setTimeout(resolve, 100))

      const modelItems = wrapper.findAll('.model-item')
      expect(modelItems).toHaveLength(3)
    })

    it('should display provider names', async () => {
      wrapper = createWrapper()
      await nextTick()
      await new Promise((resolve) => setTimeout(resolve, 100))

      const modelNames = wrapper.findAll('.model-name')
      expect(modelNames[0].text()).toBe('Claude Code')
      expect(modelNames[1].text()).toBe('Gemini')
      expect(modelNames[2].text()).toBe('GPT-5')
    })

    it('should display provider descriptions', async () => {
      wrapper = createWrapper()
      await nextTick()
      await new Promise((resolve) => setTimeout(resolve, 100))

      const descriptions = wrapper.findAll('.model-description')
      expect(descriptions[0].text()).toContain(
        'Anthropic Claude - Advanced reasoning and coding'
      )
      expect(descriptions[1].text()).toContain(
        'Google Gemini - Multimodal AI assistant'
      )
      expect(descriptions[2].text()).toContain(
        'OpenAI GPT-5 - Next generation language model'
      )
    })

    it('should mark first provider as current by default', async () => {
      wrapper = createWrapper()
      await nextTick()
      await new Promise((resolve) => setTimeout(resolve, 100))

      const selectedItem = wrapper.find('.model-item.selected')
      expect(selectedItem.exists()).toBe(true)
    })

    it('should show selected badge for current provider', async () => {
      wrapper = createWrapper()
      await nextTick()
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(wrapper.find('.selected-badge').exists()).toBe(true)
    })
  })

  describe('Provider Selection', () => {
    it('should call setDefaultProvider when selecting a provider', async () => {
      wrapper = createWrapper()
      await nextTick()
      await new Promise((resolve) => setTimeout(resolve, 100))

      const modelItems = wrapper.findAll('.model-item')
      await modelItems[1].trigger('click')
      await nextTick()

      expect(mockElectronAPI.aiChat.setDefaultProvider).toHaveBeenCalledWith(
        'Gemini'
      )
    })

    it('should emit select event with provider name', async () => {
      wrapper = createWrapper()
      await nextTick()
      await new Promise((resolve) => setTimeout(resolve, 100))

      const modelItems = wrapper.findAll('.model-item')
      await modelItems[1].trigger('click')
      await nextTick()
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(wrapper.emitted('select')).toBeTruthy()
      expect(wrapper.emitted('select')![0]).toEqual(['Gemini'])
    })

    it('should emit close event after successful selection', async () => {
      wrapper = createWrapper()
      await nextTick()
      await new Promise((resolve) => setTimeout(resolve, 100))

      const modelItems = wrapper.findAll('.model-item')
      await modelItems[1].trigger('click')
      await nextTick()
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should handle selection error gracefully', async () => {
      mockElectronAPI.aiChat.setDefaultProvider = vi
        .fn()
        .mockRejectedValue(new Error('Selection failed'))

      wrapper = createWrapper()
      await nextTick()
      await new Promise((resolve) => setTimeout(resolve, 100))

      const modelItems = wrapper.findAll('.model-item')
      await modelItems[1].trigger('click')
      await nextTick()
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Should not emit select or close on error
      expect(wrapper.emitted('select')).toBeFalsy()
      expect(wrapper.emitted('close')).toBeFalsy()
    })

    it('should handle non-Error exceptions during selection', async () => {
      mockElectronAPI.aiChat.setDefaultProvider = vi
        .fn()
        .mockRejectedValue('String error')

      wrapper = createWrapper()
      await nextTick()
      await new Promise((resolve) => setTimeout(resolve, 100))

      const modelItems = wrapper.findAll('.model-item')
      await modelItems[1].trigger('click')
      await nextTick()
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(wrapper.emitted('select')).toBeFalsy()
    })

    it('should show error when Electron API not available during selection', async () => {
      wrapper = createWrapper()
      await nextTick()
      await new Promise((resolve) => setTimeout(resolve, 100))

      // @ts-expect-error - Testing error state with undefined API
      window.electronAPI = undefined

      const modelItems = wrapper.findAll('.model-item')
      await modelItems[1].trigger('click')
      await nextTick()

      expect(wrapper.emitted('select')).toBeFalsy()
    })
  })

  describe('Helper Functions', () => {
    it('should format provider names correctly', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as {
        formatProviderName: (name: string) => string
      }

      expect(vm.formatProviderName('Claude Code CLI')).toBe('Claude Code')
      expect(vm.formatProviderName('GPT-5 API')).toBe('GPT-5')
      expect(vm.formatProviderName('Gemini Api')).toBe('Gemini')
      expect(vm.formatProviderName('Test Provider')).toBe('Test Provider')
    })

    it('should get correct icon for known providers', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as {
        getProviderIcon: (name: string) => string
      }

      expect(vm.getProviderIcon('Claude Code')).toBe('Bot')
      expect(vm.getProviderIcon('Gemini')).toBe('Sparkles')
      expect(vm.getProviderIcon('GPT-5')).toBe('Zap')
    })

    it('should return default icon for unknown providers', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as {
        getProviderIcon: (name: string) => string
      }

      expect(vm.getProviderIcon('Unknown Provider')).toBe('Bot')
    })

    it('should get correct description for known providers', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as {
        getProviderDescription: (name: string) => string
      }

      expect(vm.getProviderDescription('Claude Code')).toBe(
        'Anthropic Claude - Advanced reasoning and coding'
      )
      expect(vm.getProviderDescription('Gemini')).toBe(
        'Google Gemini - Multimodal AI assistant'
      )
      expect(vm.getProviderDescription('GPT-5')).toBe(
        'OpenAI GPT-5 - Next generation language model'
      )
    })

    it('should return default description for unknown providers', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as {
        getProviderDescription: (name: string) => string
      }

      expect(vm.getProviderDescription('Unknown')).toBe('AI language model')
    })
  })

  describe('Empty State', () => {
    it('should show empty state when no providers available', async () => {
      mockElectronAPI.aiChat.getAvailableProviders = vi
        .fn()
        .mockResolvedValue([])

      wrapper = createWrapper()
      await nextTick()
      await new Promise((resolve) => setTimeout(resolve, 100))

      const emptyState = wrapper.find('.empty-state')
      expect(emptyState.exists()).toBe(true)
      expect(emptyState.text()).toContain('No AI providers available')
    })

    it('should not show model items when providers list is empty', async () => {
      mockElectronAPI.aiChat.getAvailableProviders = vi
        .fn()
        .mockResolvedValue([])

      wrapper = createWrapper()
      await nextTick()
      await new Promise((resolve) => setTimeout(resolve, 100))

      const modelItems = wrapper.findAll('.model-item')
      expect(modelItems).toHaveLength(0)
    })
  })

  describe('Modal Interactions', () => {
    it('should emit close event when close button is clicked', async () => {
      wrapper = createWrapper()
      await nextTick()

      const closeButton = wrapper.find('.close-button')
      await closeButton.trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should emit close event when overlay is clicked', async () => {
      wrapper = createWrapper()
      await nextTick()

      const overlay = wrapper.find('.modal-overlay')
      await overlay.trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should not emit close when modal container is clicked', async () => {
      wrapper = createWrapper()
      await nextTick()

      const container = wrapper.find('.modal-container')
      await container.trigger('click')

      expect(wrapper.emitted('close')).toBeFalsy()
    })

    it('should emit close when cancel button is clicked', async () => {
      // Mount without stubbing BaseButton so we can click it
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      await nextTick()
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Find the cancel button in the footer
      const cancelButton = wrapper.find('.modal-footer button')
      expect(cancelButton.exists()).toBe(true)

      await cancelButton.trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should render modal footer with cancel button structure', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      await nextTick()

      const footer = wrapper.find('.modal-footer')
      expect(footer.exists()).toBe(true)

      // Verify the footer contains a button with correct text
      const cancelButton = wrapper.find('.modal-footer button')
      expect(cancelButton.exists()).toBe(true)
      expect(cancelButton.text()).toBe('Cancel')
    })
  })

  describe('Lifecycle and Watchers', () => {
    it('should load providers on mount when visible', async () => {
      wrapper = createWrapper({ visible: true })
      await nextTick()
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(mockElectronAPI.aiChat.getAvailableProviders).toHaveBeenCalled()
    })

    it('should not load providers on mount when not visible', () => {
      wrapper = createWrapper({ visible: false })

      expect(
        mockElectronAPI.aiChat.getAvailableProviders
      ).not.toHaveBeenCalled()
    })

    it('should load providers when visibility changes to true', async () => {
      wrapper = createWrapper({ visible: false })
      expect(
        mockElectronAPI.aiChat.getAvailableProviders
      ).not.toHaveBeenCalled()

      await wrapper.setProps({ visible: true })
      await nextTick()
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(mockElectronAPI.aiChat.getAvailableProviders).toHaveBeenCalled()
    })

    it('should not reload providers when visibility changes to false', async () => {
      wrapper = createWrapper({ visible: true })
      await nextTick()
      await new Promise((resolve) => setTimeout(resolve, 100))

      const callCount =
        mockElectronAPI.aiChat.getAvailableProviders.mock.calls.length

      await wrapper.setProps({ visible: false })
      await nextTick()

      expect(
        mockElectronAPI.aiChat.getAvailableProviders.mock.calls.length
      ).toBe(callCount)
    })
  })

  describe('Component Lifecycle', () => {
    it('should initialize with correct default state', () => {
      wrapper = createWrapper({ visible: false })
      const vm = wrapper.vm as unknown as {
        isLoading: boolean
        error: unknown
        availableProviders: unknown[]
        currentProvider: unknown
      }

      expect(vm.isLoading).toBe(false)
      expect(vm.error).toBeNull()
      expect(vm.availableProviders).toEqual([])
      expect(vm.currentProvider).toBeNull()
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

    it('should have proper structure for screen readers', async () => {
      wrapper = createWrapper()
      await nextTick()
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(wrapper.find('.modal-title').exists()).toBe(true)
      expect(wrapper.find('.modal-content').exists()).toBe(true)
      expect(wrapper.find('.modal-footer').exists()).toBe(true)
    })
  })
})
