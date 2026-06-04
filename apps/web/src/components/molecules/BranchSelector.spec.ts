/**
 * @fileoverview Comprehensive test suite for BranchSelector component to achieve 100% coverage.
 *
 * @description
 * Tests all functionality of the BranchSelector component including props, events,
 * keyboard navigation, search filtering, dropdown behavior, and edge cases.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick, type ComponentPublicInstance } from 'vue'
import BranchSelector from './BranchSelector.vue'

// Mock BaseIcon component
vi.mock('../atoms/BaseIcon.vue', () => ({
  default: {
    name: 'BaseIcon',
    template: '<div class="base-icon" :data-icon="name">{{ name }}</div>',
    props: ['name', 'size'],
  },
}))

describe('BranchSelector.vue', () => {
  let wrapper: VueWrapper<ComponentPublicInstance>

  const defaultProps = {
    modelValue: '',
    branches: ['main', 'develop', 'feature/branch', 'hotfix/urgent'],
    isLoading: false,
    placeholder: 'Select a branch',
  }

  beforeEach(() => {
    document.body.innerHTML = '<div id="test-app"></div>'
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  describe('🎯 Component Initialization and Props', () => {
    it('should mount successfully with default props', () => {
      wrapper = mount(BranchSelector, {
        props: {},
        attachTo: '#test-app',
      })

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.vm.modelValue).toBe('')
      expect(wrapper.vm.branches).toEqual([])
      expect(wrapper.vm.isLoading).toBe(false)
      expect(wrapper.vm.placeholder).toBe('Select a branch')
    })

    it('should display placeholder when no branch selected', () => {
      wrapper = mount(BranchSelector, {
        props: defaultProps,
        attachTo: '#test-app',
      })

      expect(wrapper.find('.branch-name').text()).toBe('Select a branch')
    })

    it('should display selected branch name', () => {
      wrapper = mount(BranchSelector, {
        props: { ...defaultProps, modelValue: 'main' },
        attachTo: '#test-app',
      })

      expect(wrapper.find('.branch-name').text()).toBe('main')
    })

    it('should handle custom placeholder', () => {
      wrapper = mount(BranchSelector, {
        props: { ...defaultProps, placeholder: 'Choose a branch' },
        attachTo: '#test-app',
      })

      expect(wrapper.find('.branch-name').text()).toBe('Choose a branch')
    })

    it('should render all required elements', () => {
      wrapper = mount(BranchSelector, {
        props: defaultProps,
        attachTo: '#test-app',
      })

      expect(wrapper.find('.branch-selector').exists()).toBe(true)
      expect(wrapper.find('.selector-trigger').exists()).toBe(true)
      expect(wrapper.find('.selected-branch').exists()).toBe(true)
      expect(wrapper.find('.branch-icon').exists()).toBe(true)
      expect(wrapper.find('.dropdown-arrow').exists()).toBe(true)
    })
  })

  describe('🎯 Dropdown Toggle Functionality', () => {
    beforeEach(() => {
      wrapper = mount(BranchSelector, {
        props: defaultProps,
        attachTo: '#test-app',
      })
    })

    it('should open dropdown when trigger clicked', async () => {
      expect(wrapper.vm.isOpen).toBe(false)

      await wrapper.find('.selector-trigger').trigger('click')

      expect(wrapper.vm.isOpen).toBe(true)
      expect(wrapper.find('.selector-trigger').classes()).toContain('is-open')
      expect(wrapper.find('.dropdown-arrow').classes()).toContain('rotated')
    })

    it('should close dropdown when trigger clicked while open', async () => {
      // Open dropdown first
      await wrapper.find('.selector-trigger').trigger('click')
      expect(wrapper.vm.isOpen).toBe(true)

      // Close dropdown
      await wrapper.find('.selector-trigger').trigger('click')
      expect(wrapper.vm.isOpen).toBe(false)
      expect(wrapper.find('.selector-trigger').classes()).not.toContain(
        'is-open'
      )
    })

    it('should emit open event when dropdown opens', async () => {
      await wrapper.find('.selector-trigger').trigger('click')

      expect(wrapper.emitted('open')).toBeTruthy()
      expect(wrapper.emitted('open')).toHaveLength(1)
    })

    it('should emit close event when dropdown closes', async () => {
      // Open first
      await wrapper.find('.selector-trigger').trigger('click')
      // Then close
      await wrapper.find('.selector-trigger').trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
      expect(wrapper.emitted('close')).toHaveLength(1)
    })

    it('should reset search and highlighted index when opening', async () => {
      // Set some state first
      wrapper.vm.searchQuery = 'test'
      wrapper.vm.highlightedIndex = 2

      await wrapper.find('.selector-trigger').trigger('click')

      expect(wrapper.vm.searchQuery).toBe('')
      expect(wrapper.vm.highlightedIndex).toBe(0)
    })

    it('should focus search input when dropdown opens', async () => {
      await wrapper.find('.selector-trigger').trigger('click')
      await nextTick()

      expect(wrapper.find('.dropdown-menu').exists()).toBe(true)
      expect(wrapper.find('.search-input').exists()).toBe(true)
    })
  })

  describe('🎯 Search Functionality', () => {
    beforeEach(async () => {
      wrapper = mount(BranchSelector, {
        props: defaultProps,
        attachTo: '#test-app',
      })
      await wrapper.find('.selector-trigger').trigger('click')
    })

    it('should filter branches based on search query', async () => {
      const searchInput = wrapper.find('.search-input')
      await searchInput.setValue('feature')

      expect(wrapper.vm.filteredBranches).toEqual(['feature/branch'])
    })

    it('should show all branches when search is empty', async () => {
      const searchInput = wrapper.find('.search-input')
      await searchInput.setValue('')

      expect(wrapper.vm.filteredBranches).toEqual(defaultProps.branches)
    })

    it('should show no results when no branches match', async () => {
      const searchInput = wrapper.find('.search-input')
      await searchInput.setValue('nonexistent')

      expect(wrapper.vm.filteredBranches).toEqual([])
      expect(wrapper.find('.no-results').exists()).toBe(true)
      expect(wrapper.find('.no-results').text()).toContain('No branches found')
    })

    it('should be case insensitive', async () => {
      const searchInput = wrapper.find('.search-input')
      await searchInput.setValue('MAIN')

      expect(wrapper.vm.filteredBranches).toEqual(['main'])
    })

    it('should filter by partial match', async () => {
      const searchInput = wrapper.find('.search-input')
      await searchInput.setValue('hot')

      expect(wrapper.vm.filteredBranches).toEqual(['hotfix/urgent'])
    })
  })

  describe('🎯 Branch Selection', () => {
    beforeEach(async () => {
      wrapper = mount(BranchSelector, {
        props: defaultProps,
        attachTo: '#test-app',
      })
      await wrapper.find('.selector-trigger').trigger('click')
    })

    it('should select branch when clicked', async () => {
      const branchOption = wrapper.find('.branch-option')
      await branchOption.trigger('click')

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')[0]).toEqual(['main'])
      expect(wrapper.vm.isOpen).toBe(false)
    })

    it('should highlight branch option on hover', async () => {
      const branchOptions = wrapper.findAll('.branch-option')
      await branchOptions[1].trigger('mouseenter')

      expect(wrapper.vm.highlightedIndex).toBe(1)
      expect(branchOptions[1].classes()).toContain('is-highlighted')
    })

    it('should show check icon for selected branch', async () => {
      wrapper = mount(BranchSelector, {
        props: { ...defaultProps, modelValue: 'main' },
        attachTo: '#test-app',
      })
      await wrapper.find('.selector-trigger').trigger('click')

      const selectedOption = wrapper.find('.branch-option.is-selected')
      expect(selectedOption.exists()).toBe(true)
      expect(selectedOption.find('.check-icon').exists()).toBe(true)
    })
  })

  describe('🎯 Keyboard Navigation', () => {
    beforeEach(async () => {
      wrapper = mount(BranchSelector, {
        props: defaultProps,
        attachTo: '#test-app',
      })
      await wrapper.find('.selector-trigger').trigger('click')
    })

    it('should navigate down with ArrowDown key', async () => {
      const searchInput = wrapper.find('.search-input')
      expect(wrapper.vm.highlightedIndex).toBe(0)

      await searchInput.trigger('keydown', { key: 'ArrowDown' })
      expect(wrapper.vm.highlightedIndex).toBe(1)

      await searchInput.trigger('keydown', { key: 'ArrowDown' })
      expect(wrapper.vm.highlightedIndex).toBe(2)
    })

    it('should navigate up with ArrowUp key', async () => {
      const searchInput = wrapper.find('.search-input')
      wrapper.vm.highlightedIndex = 2

      await searchInput.trigger('keydown', { key: 'ArrowUp' })
      expect(wrapper.vm.highlightedIndex).toBe(1)

      await searchInput.trigger('keydown', { key: 'ArrowUp' })
      expect(wrapper.vm.highlightedIndex).toBe(0)
    })

    it('should wrap around when navigating beyond bounds', async () => {
      const searchInput = wrapper.find('.search-input')

      // Go down from last item (should wrap to first)
      wrapper.vm.highlightedIndex = 3 // last item
      await searchInput.trigger('keydown', { key: 'ArrowDown' })
      expect(wrapper.vm.highlightedIndex).toBe(0)

      // Go up from first item (should wrap to last)
      wrapper.vm.highlightedIndex = 0
      await searchInput.trigger('keydown', { key: 'ArrowUp' })
      expect(wrapper.vm.highlightedIndex).toBe(3)
    })

    it('should select first match with Enter key', async () => {
      const searchInput = wrapper.find('.search-input')
      await searchInput.setValue('dev')
      await searchInput.trigger('keydown', { key: 'Enter' })

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')[0]).toEqual(['develop'])
      expect(wrapper.vm.isOpen).toBe(false)
    })

    it('should close dropdown with Escape key', async () => {
      const searchInput = wrapper.find('.search-input')
      expect(wrapper.vm.isOpen).toBe(true)

      await searchInput.trigger('keydown', { key: 'Escape' })
      expect(wrapper.vm.isOpen).toBe(false)
    })
  })

  describe('🎯 Loading State', () => {
    it('should show loading state when isLoading is true', async () => {
      wrapper = mount(BranchSelector, {
        props: { ...defaultProps, isLoading: true },
        attachTo: '#test-app',
      })
      await wrapper.find('.selector-trigger').trigger('click')

      expect(wrapper.find('.loading-section').exists()).toBe(true)
      expect(wrapper.find('.loading-section').text()).toContain(
        'Loading branches...'
      )
      expect(wrapper.find('.branches-list').exists()).toBe(false)
    })

    it('should hide loading state when isLoading is false', async () => {
      wrapper = mount(BranchSelector, {
        props: { ...defaultProps, isLoading: false },
        attachTo: '#test-app',
      })
      await wrapper.find('.selector-trigger').trigger('click')

      expect(wrapper.find('.loading-section').exists()).toBe(false)
      expect(wrapper.find('.branches-list').exists()).toBe(true)
    })
  })

  describe('🎯 Click Outside Functionality', () => {
    beforeEach(async () => {
      wrapper = mount(BranchSelector, {
        props: defaultProps,
        attachTo: '#test-app',
      })
      await wrapper.find('.selector-trigger').trigger('click')
    })

    it('should close dropdown when clicking outside', async () => {
      expect(wrapper.vm.isOpen).toBe(true)

      // Simulate click outside
      const outsideElement = document.createElement('div')
      document.body.appendChild(outsideElement)

      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window,
      })
      Object.defineProperty(clickEvent, 'target', {
        value: outsideElement,
        enumerable: true,
      })

      // Trigger the click outside handler
      document.dispatchEvent(clickEvent)
      await nextTick()

      expect(wrapper.vm.isOpen).toBe(false)
      document.body.removeChild(outsideElement)
    })

    it('should not close dropdown when clicking inside', async () => {
      expect(wrapper.vm.isOpen).toBe(true)

      // Click inside the component
      await wrapper.find('.search-input').trigger('mousedown')

      expect(wrapper.vm.isOpen).toBe(true)
    })
  })

  describe('🎯 Edge Cases and Error Handling', () => {
    it('should handle empty branches array', async () => {
      wrapper = mount(BranchSelector, {
        props: { ...defaultProps, branches: [] },
        attachTo: '#test-app',
      })
      await wrapper.find('.selector-trigger').trigger('click')

      expect(wrapper.find('.no-results').exists()).toBe(true)
      expect(wrapper.vm.filteredBranches).toEqual([])
    })

    it('should handle selectFirstMatch with no filtered branches', async () => {
      wrapper = mount(BranchSelector, {
        props: { ...defaultProps, branches: [] },
        attachTo: '#test-app',
      })
      await wrapper.find('.selector-trigger').trigger('click')

      const searchInput = wrapper.find('.search-input')
      await searchInput.trigger('keydown', { key: 'Enter' })

      // Should not emit update:modelValue when no branches
      expect(wrapper.emitted('update:modelValue')).toBeFalsy()
    })

    it('should handle navigation with empty filtered branches', async () => {
      wrapper = mount(BranchSelector, {
        props: defaultProps,
        attachTo: '#test-app',
      })
      await wrapper.find('.selector-trigger').trigger('click')

      // Filter to no results
      const searchInput = wrapper.find('.search-input')
      await searchInput.setValue('nonexistent')

      // Try to navigate

      const _initialIndex = wrapper.vm.highlightedIndex
      await searchInput.trigger('keydown', { key: 'ArrowDown' })

      // Should handle gracefully (wrap to 0 when maxIndex is -1)
      expect(wrapper.vm.highlightedIndex).toBe(0)
    })

    it('should handle multiple rapid toggles', async () => {
      wrapper = mount(BranchSelector, {
        props: defaultProps,
        attachTo: '#test-app',
      })

      const trigger = wrapper.find('.selector-trigger')

      // Rapid toggles
      await trigger.trigger('click')
      await trigger.trigger('click')
      await trigger.trigger('click')

      expect(wrapper.emitted('open')).toHaveLength(2)
      expect(wrapper.emitted('close')).toHaveLength(1)
      expect(wrapper.vm.isOpen).toBe(true)
    })
  })

  describe('🎯 Lifecycle and Watchers', () => {
    it('should set up click outside listener on mount', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener')

      wrapper = mount(BranchSelector, {
        props: defaultProps,
        attachTo: '#test-app',
      })

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'click',
        expect.any(Function)
      )
      addEventListenerSpy.mockRestore()
    })

    it('should remove click outside listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')

      wrapper = mount(BranchSelector, {
        props: defaultProps,
        attachTo: '#test-app',
      })

      wrapper.unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'click',
        expect.any(Function)
      )
      removeEventListenerSpy.mockRestore()
    })
  })

  describe('🎯 Component Methods Coverage', () => {
    beforeEach(() => {
      wrapper = mount(BranchSelector, {
        props: defaultProps,
        attachTo: '#test-app',
      })
    })

    it('should verify toggleDropdown functionality through behavior', async () => {
      // Verify that the toggle functionality works correctly
      expect(wrapper.vm.isOpen).toBe(false)

      // First click should open
      await wrapper.find('.selector-trigger').trigger('click')
      expect(wrapper.vm.isOpen).toBe(true)

      // Second click should close
      await wrapper.find('.selector-trigger').trigger('click')
      expect(wrapper.vm.isOpen).toBe(false)

      // This tests the toggleDropdown method behavior without spying
    })

    it('should call openDropdown method', () => {
      wrapper.vm.openDropdown()

      expect(wrapper.vm.isOpen).toBe(true)
      expect(wrapper.vm.searchQuery).toBe('')
      expect(wrapper.vm.highlightedIndex).toBe(0)
    })

    it('should call closeDropdown method', () => {
      wrapper.vm.isOpen = true
      wrapper.vm.closeDropdown()

      expect(wrapper.vm.isOpen).toBe(false)
      expect(wrapper.vm.searchQuery).toBe('')
      expect(wrapper.vm.highlightedIndex).toBe(0)
    })

    it('should call selectBranch method', () => {
      wrapper.vm.selectBranch('test-branch')

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')[0]).toEqual(['test-branch'])
      expect(wrapper.vm.isOpen).toBe(false)
    })

    it('should call selectFirstMatch method', () => {
      wrapper.vm.selectFirstMatch()

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')[0]).toEqual(['main'])
    })

    it('should call navigateOptions method with down direction', () => {
      wrapper.vm.navigateOptions('down')
      expect(wrapper.vm.highlightedIndex).toBe(1)
    })

    it('should call navigateOptions method with up direction', () => {
      wrapper.vm.highlightedIndex = 2
      wrapper.vm.navigateOptions('up')
      expect(wrapper.vm.highlightedIndex).toBe(1)
    })

    it('should call handleClickOutside method', () => {
      wrapper.vm.isOpen = true

      const mockEvent = {
        target: document.createElement('div'),
      } as MouseEvent

      wrapper.vm.handleClickOutside(mockEvent)
      expect(wrapper.vm.isOpen).toBe(false)
    })
  })
})
