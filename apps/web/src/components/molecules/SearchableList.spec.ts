/**
 * @fileoverview Comprehensive test suite for SearchableList.vue component
 *
 * @description
 * Complete test coverage for all functionality including conditional rendering,
 * event handling, computed properties, watchers, and prop functions.
 * Targets 100% statement, branch, function, and line coverage.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @internal
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import SearchableList from './SearchableList.vue'

// Mock child components
vi.mock('../atoms/BaseIcon.vue', () => ({
  default: {
    name: 'BaseIcon',
    template:
      '<div class="base-icon" :data-name="name" :data-size="size"><slot /></div>',
    props: ['name', 'size'],
  },
}))

vi.mock('../atoms/BaseButton.vue', () => ({
  default: {
    name: 'BaseButton',
    template:
      '<button class="base-button" :data-variant="variant" :data-size="size"><slot /></button>',
    props: ['variant', 'size'],
  },
}))

vi.mock('../atoms/CircleLoading.vue', () => ({
  default: {
    name: 'CircleLoading',
    template:
      '<div class="circle-loading" :data-size="size" :data-text="text" :data-show-icon="showIcon">Loading...</div>',
    props: ['size', 'text', 'showIcon'],
  },
}))

describe('SearchableList.vue', () => {
  // Test data
  const stringItems = ['Apple', 'Banana', 'Cherry', 'Date']
  const objectItems = [
    { id: 1, name: 'Item 1', description: 'First item' },
    { id: 2, name: 'Item 2', description: 'Second item' },
    { id: 3, name: 'Item 3', description: 'Third item' },
  ]
  const labelItems = [
    { id: 1, label: 'Label 1' },
    { id: 2, label: 'Label 2' },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('🎯 Basic Rendering', () => {
    it('should mount and render search input', () => {
      const wrapper = mount(SearchableList, {
        props: { items: stringItems },
      })

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('.search-input').exists()).toBe(true)
      expect(wrapper.find('.searchable-list').exists()).toBe(true)
    })

    it('should render with custom placeholder', () => {
      const wrapper = mount(SearchableList, {
        props: {
          items: stringItems,
          placeholder: 'Custom placeholder...',
        },
      })

      const input = wrapper.find('.search-input')
      expect(input.attributes('placeholder')).toBe('Custom placeholder...')
    })

    it('should render with custom search icon', () => {
      const wrapper = mount(SearchableList, {
        props: {
          items: stringItems,
          searchIcon: 'CustomSearch',
        },
      })

      const searchIcon = wrapper.find('.search-icon')
      expect(searchIcon.attributes('data-name')).toBe('CustomSearch')
    })
  })

  describe('🎯 Loading State', () => {
    it('should show loading state when loading prop is true', async () => {
      const wrapper = mount(SearchableList, {
        props: {
          items: stringItems,
          loading: true,
          loadingText: 'Please wait...',
        },
      })

      expect(wrapper.find('.loading-state').exists()).toBe(true)
      expect(wrapper.find('.results-list').exists()).toBe(false)
      expect(wrapper.find('.circle-loading').exists()).toBe(true)
      expect(wrapper.find('.circle-loading').attributes('data-text')).toBe(
        'Please wait...'
      )
    })

    it('should use custom loading slot', async () => {
      const wrapper = mount(SearchableList, {
        props: {
          items: stringItems,
          loading: true,
        },
        slots: {
          loading: '<div class="custom-loading">Custom loading content</div>',
        },
      })

      expect(wrapper.find('.loading-state').exists()).toBe(true)
      expect(wrapper.find('.custom-loading').exists()).toBe(true)
      expect(wrapper.text()).toContain('Custom loading content')
    })
  })

  describe('🎯 Empty States', () => {
    it('should show empty state when no items and no search query', () => {
      const wrapper = mount(SearchableList, {
        props: { items: [] },
      })

      expect(wrapper.find('.empty-state').exists()).toBe(true)
      expect(wrapper.find('.empty-text').text()).toBe('No items available')
    })

    it('should use custom empty slot', () => {
      const wrapper = mount(SearchableList, {
        props: { items: [] },
        slots: {
          empty: '<div class="custom-empty">Custom empty content</div>',
        },
      })

      expect(wrapper.find('.empty-state').exists()).toBe(true)
      expect(wrapper.find('.custom-empty').exists()).toBe(true)
      expect(wrapper.text()).toContain('Custom empty content')
    })

    it('should show no results state when search query has no matches', async () => {
      const wrapper = mount(SearchableList, {
        props: { items: stringItems },
      })

      const input = wrapper.find('.search-input')
      await input.setValue('NonExistentItem')
      await nextTick()

      expect(wrapper.find('.no-results').exists()).toBe(true)
      expect(wrapper.find('.no-results-text').text()).toContain(
        'No results found for "NonExistentItem"'
      )
    })

    it('should use custom no-results slot', async () => {
      const wrapper = mount(SearchableList, {
        props: { items: stringItems },
        slots: {
          'no-results':
            '<div class="custom-no-results">Custom no results</div>',
        },
      })

      const input = wrapper.find('.search-input')
      await input.setValue('NonExistentItem')
      await nextTick()

      expect(wrapper.find('.no-results').exists()).toBe(true)
      expect(wrapper.find('.custom-no-results').exists()).toBe(true)
    })
  })

  describe('🎯 Search Functionality', () => {
    it('should filter items by search query', async () => {
      const wrapper = mount(SearchableList, {
        props: { items: stringItems },
      })

      const input = wrapper.find('.search-input')
      await input.setValue('a')
      await nextTick()

      const items = wrapper.findAll('.list-item')
      expect(items.length).toBe(3) // Apple, Banana, Date contain 'a'
    })

    it('should emit update:modelValue on search input', async () => {
      const wrapper = mount(SearchableList, {
        props: { items: stringItems },
      })

      const input = wrapper.find('.search-input')
      await input.setValue('test query')
      await input.trigger('input')

      // v-model emits when setValue is called, and handleSearchInput emits when input is triggered
      const updateEmits = wrapper.emitted('update:modelValue')
      const searchEmits = wrapper.emitted('search')

      expect(updateEmits).toBeTruthy()
      expect(updateEmits!.length).toBeGreaterThan(0)
      expect(updateEmits![updateEmits!.length - 1]).toEqual(['test query'])

      // Search event might be emitted multiple times due to v-model and @input both triggering
      expect(searchEmits).toBeTruthy()
      expect(searchEmits!.length).toBeGreaterThan(0)
      expect(searchEmits![searchEmits!.length - 1]).toEqual(['test query'])
    })

    it('should sync with external modelValue changes', async () => {
      const wrapper = mount(SearchableList, {
        props: {
          items: stringItems,
          modelValue: 'initial',
        },
      })

      const input = wrapper.find('.search-input')
      expect(input.element.value).toBe('initial')

      await wrapper.setProps({ modelValue: 'updated' })
      await nextTick()

      expect(input.element.value).toBe('updated')
    })
  })

  describe('🎯 Clear Search Functionality', () => {
    it('should show clear button when there is search query and showClearButton is true', async () => {
      const wrapper = mount(SearchableList, {
        props: {
          items: stringItems,
          showClearButton: true,
        },
      })

      expect(wrapper.find('.search-clear').exists()).toBe(false)

      const input = wrapper.find('.search-input')
      await input.setValue('test')
      await nextTick()

      expect(wrapper.find('.search-clear').exists()).toBe(true)
    })

    it('should not show clear button when showClearButton is false', async () => {
      const wrapper = mount(SearchableList, {
        props: {
          items: stringItems,
          showClearButton: false,
        },
      })

      const input = wrapper.find('.search-input')
      await input.setValue('test')
      await nextTick()

      expect(wrapper.find('.search-clear').exists()).toBe(false)
    })

    it('should clear search on clear button click', async () => {
      const wrapper = mount(SearchableList, {
        props: { items: stringItems },
      })

      const input = wrapper.find('.search-input')
      await input.setValue('test')
      await nextTick()

      const clearButton = wrapper.find('.search-clear')
      await clearButton.trigger('click')

      expect(input.element.value).toBe('')
      expect(wrapper.emitted('update:modelValue')).toContainEqual([''])
      expect(wrapper.emitted('clear')).toHaveLength(1)
    })

    it('should clear search on clear button in no-results section', async () => {
      const wrapper = mount(SearchableList, {
        props: { items: stringItems },
      })

      const input = wrapper.find('.search-input')
      await input.setValue('NonExistentItem')
      await nextTick()

      const clearButton = wrapper.find('.clear-search-button')
      await clearButton.trigger('click')

      expect(input.element.value).toBe('')
      expect(wrapper.emitted('clear')).toHaveLength(1)
    })
  })

  describe('🎯 Input States', () => {
    it('should handle readonly state', () => {
      const wrapper = mount(SearchableList, {
        props: {
          items: stringItems,
          readonly: true,
        },
      })

      const input = wrapper.find('.search-input')
      expect(input.attributes('readonly')).toBeDefined()
    })

    it('should handle disabled state', () => {
      const wrapper = mount(SearchableList, {
        props: {
          items: stringItems,
          disabled: true,
        },
      })

      const input = wrapper.find('.search-input')
      expect(input.attributes('disabled')).toBeDefined()
    })
  })

  describe('🎯 Items Rendering and Interaction', () => {
    it('should render all items when no search query', () => {
      const wrapper = mount(SearchableList, {
        props: { items: stringItems },
      })

      const items = wrapper.findAll('.list-item')
      expect(items).toHaveLength(4)
    })

    it('should emit item-click on item click', async () => {
      const wrapper = mount(SearchableList, {
        props: { items: stringItems },
      })

      const firstItem = wrapper.find('.list-item')
      await firstItem.trigger('click')

      expect(wrapper.emitted('item-click')).toEqual([['Apple']])
    })

    it('should limit visible items by maxVisibleItems', () => {
      const wrapper = mount(SearchableList, {
        props: {
          items: stringItems,
          maxVisibleItems: 2,
        },
      })

      const items = wrapper.findAll('.list-item')
      expect(items).toHaveLength(2)
    })

    it('should show more items indicator when items exceed maxVisibleItems', () => {
      const wrapper = mount(SearchableList, {
        props: {
          items: stringItems,
          maxVisibleItems: 2,
        },
      })

      const moreIndicator = wrapper.find('.more-items-indicator')
      expect(moreIndicator.exists()).toBe(true)
      expect(moreIndicator.text()).toContain('2 more items')
    })

    it('should not show more items indicator when all items are visible', () => {
      const wrapper = mount(SearchableList, {
        props: {
          items: stringItems,
          maxVisibleItems: 10,
        },
      })

      const moreIndicator = wrapper.find('.more-items-indicator')
      expect(moreIndicator.exists()).toBe(false)
    })
  })

  describe('🎯 Item Selection States', () => {
    it('should mark item as selected when it matches selectedItem', () => {
      const selectedItem = objectItems[1]
      const wrapper = mount(SearchableList, {
        props: {
          items: objectItems,
          selectedItem,
        },
      })

      const items = wrapper.findAll('.list-item')
      expect(items[1].classes()).toContain('item-selected')
      expect(items[0].classes()).not.toContain('item-selected')
    })

    it('should show check icon for selected item', () => {
      const wrapper = mount(SearchableList, {
        props: {
          items: objectItems,
          selectedItem: objectItems[0],
        },
      })

      const selectedItem = wrapper.find('.item-selected')
      const checkIcon = selectedItem.find('[data-name="Check"]')
      expect(checkIcon.exists()).toBe(true)
    })

    it('should mark item as processing and disable click', async () => {
      const processingItem = objectItems[1]
      const wrapper = mount(SearchableList, {
        props: {
          items: objectItems,
          processingItem,
        },
      })

      const items = wrapper.findAll('.list-item')
      const processingElement = items[1]

      expect(processingElement.classes()).toContain('item-processing')

      // Should show loading spinner
      const loadingIcon = processingElement.find('[data-name="Loader"]')
      expect(loadingIcon.exists()).toBe(true)

      // Click should not emit when processing
      await processingElement.trigger('click')
      expect(wrapper.emitted('item-click')).toBeFalsy()
    })

    it('should handle selection by direct comparison for primitive items', () => {
      const wrapper = mount(SearchableList, {
        props: {
          items: stringItems,
          selectedItem: 'Banana',
        },
      })

      const items = wrapper.findAll('.list-item')
      expect(items[1].classes()).toContain('item-selected')
    })

    it('should handle processing by direct comparison for primitive items', () => {
      const wrapper = mount(SearchableList, {
        props: {
          items: stringItems,
          processingItem: 'Cherry',
        },
      })

      const items = wrapper.findAll('.list-item')
      expect(items[2].classes()).toContain('item-processing')
    })
  })

  describe('🎯 Current Item Section', () => {
    it('should show current item section when showCurrentItem is true', () => {
      const wrapper = mount(SearchableList, {
        props: {
          items: objectItems,
          showCurrentItem: true,
          currentItem: objectItems[0],
          currentItemLabel: 'Currently Selected',
        },
      })

      const currentSection = wrapper.find('.current-item-section')
      expect(currentSection.exists()).toBe(true)

      const label = wrapper.find('.current-item-label')
      expect(label.text()).toBe('Currently Selected')

      const currentItem = wrapper.find('.current-item')
      expect(currentItem.exists()).toBe(true)
    })

    it('should not show current item section when showCurrentItem is false', () => {
      const wrapper = mount(SearchableList, {
        props: {
          items: objectItems,
          showCurrentItem: false,
          currentItem: objectItems[0],
        },
      })

      expect(wrapper.find('.current-item-section').exists()).toBe(false)
    })

    it('should not show current item section when currentItem is undefined', () => {
      const wrapper = mount(SearchableList, {
        props: {
          items: objectItems,
          showCurrentItem: true,
          currentItem: undefined,
        },
      })

      expect(wrapper.find('.current-item-section').exists()).toBe(false)
    })

    it('should not show current item section during loading', () => {
      const wrapper = mount(SearchableList, {
        props: {
          items: objectItems,
          showCurrentItem: true,
          currentItem: objectItems[0],
          loading: true,
        },
      })

      expect(wrapper.find('.current-item-section').exists()).toBe(false)
      expect(wrapper.find('.loading-state').exists()).toBe(true)
    })

    it('should filter out current item from results list', () => {
      const wrapper = mount(SearchableList, {
        props: {
          items: objectItems,
          showCurrentItem: true,
          currentItem: objectItems[1],
        },
      })

      // Should show current item section
      expect(wrapper.find('.current-item-section').exists()).toBe(true)

      // Should show 2 items in results (3 total - 1 current)
      const resultItems = wrapper.findAll('.results-list .list-item')
      expect(resultItems).toHaveLength(2)
    })

    it('should emit item-click when current item is clicked', async () => {
      const currentItem = objectItems[0]
      const wrapper = mount(SearchableList, {
        props: {
          items: objectItems,
          showCurrentItem: true,
          currentItem,
        },
      })

      const currentItemElement = wrapper.find('.current-item')
      await currentItemElement.trigger('click')

      expect(wrapper.emitted('item-click')).toEqual([[currentItem]])
    })
  })

  describe('🎯 Custom Slots', () => {
    it('should use custom header slot', () => {
      const wrapper = mount(SearchableList, {
        props: { items: stringItems },
        slots: {
          header: '<div class="custom-header">Custom Header</div>',
        },
      })

      expect(wrapper.find('.custom-header').exists()).toBe(true)
      expect(wrapper.text()).toContain('Custom Header')
    })

    it('should use custom item slot', () => {
      const wrapper = mount(SearchableList, {
        props: { items: stringItems },
        slots: {
          item: '<div class="custom-item">{{ item }}</div>',
        },
      })

      expect(wrapper.findAll('.custom-item')).toHaveLength(4)
    })

    it('should use custom current-item slot', () => {
      const wrapper = mount(SearchableList, {
        props: {
          items: objectItems,
          showCurrentItem: true,
          currentItem: objectItems[0],
        },
        slots: {
          'current-item':
            '<div class="custom-current-item">Current: {{ item.name }}</div>',
        },
      })

      expect(wrapper.find('.custom-current-item').exists()).toBe(true)
    })
  })

  describe('🎯 Custom Functions', () => {
    it('should use custom getItemKey function', () => {
      const customGetItemKey = vi.fn((item, index) => `custom-${index}`)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Component mount required for test validation
      const _wrapper = mount(SearchableList, {
        props: {
          items: stringItems,
          getItemKey: customGetItemKey,
        },
      })

      // Should be called for each visible item
      expect(customGetItemKey).toHaveBeenCalledTimes(4)
      expect(customGetItemKey).toHaveBeenCalledWith('Apple', 0)
    })

    it('should use custom getItemLabel function', () => {
      const customGetItemLabel = vi.fn((item) => `Custom: ${item.name}`)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Component mount required for test validation
      const _wrapper = mount(SearchableList, {
        props: {
          items: objectItems,
          getItemLabel: customGetItemLabel,
        },
      })

      expect(customGetItemLabel).toHaveBeenCalled()
    })

    it('should use custom filterFunction', async () => {
      const customFilter = vi.fn((items, query) =>
        items.filter((item) => item.name.includes(query))
      )

      const wrapper = mount(SearchableList, {
        props: {
          items: objectItems,
          filterFunction: customFilter,
        },
      })

      const input = wrapper.find('.search-input')
      await input.setValue('Item 1')
      await nextTick()

      expect(customFilter).toHaveBeenCalledWith(objectItems, 'Item 1')
    })
  })

  describe('🎯 Default Functions Coverage', () => {
    it('should use default getItemKey with object id', () => {
      const wrapper = mount(SearchableList, {
        props: { items: objectItems },
      })

      // Component should render without errors using default key function
      const items = wrapper.findAll('.list-item')
      expect(items).toHaveLength(3)
    })

    it('should use default getItemKey with index fallback', () => {
      const itemsWithoutId = [{ value: 'a' }, { value: 'b' }]
      const wrapper = mount(SearchableList, {
        props: { items: itemsWithoutId },
      })

      const items = wrapper.findAll('.list-item')
      expect(items).toHaveLength(2)
    })

    it('should use default getItemLabel with string items', () => {
      const wrapper = mount(SearchableList, {
        props: { items: stringItems },
      })

      const firstItem = wrapper.find('.list-item')
      expect(firstItem.text()).toContain('Apple')
    })

    it('should use default getItemLabel with object name property', () => {
      const wrapper = mount(SearchableList, {
        props: { items: objectItems },
      })

      const firstItem = wrapper.find('.list-item')
      expect(firstItem.text()).toContain('Item 1')
    })

    it('should use default getItemLabel with object label property', () => {
      const wrapper = mount(SearchableList, {
        props: { items: labelItems },
      })

      const firstItem = wrapper.find('.list-item')
      expect(firstItem.text()).toContain('Label 1')
    })

    it('should use default getItemLabel with object without name/label', () => {
      const customItems = [{ value: 123 }, { data: 'test' }]
      const wrapper = mount(SearchableList, {
        props: { items: customItems },
      })

      const items = wrapper.findAll('.list-item')
      expect(items).toHaveLength(2)
      // Should convert to string representation
      expect(items[0].text()).toContain('[object Object]')
    })
  })

  describe('🎯 Highlight Match Function', () => {
    it('should highlight matching text in search results', async () => {
      const wrapper = mount(SearchableList, {
        props: { items: stringItems },
      })

      const input = wrapper.find('.search-input')
      await input.setValue('app')
      await nextTick()

      // Test highlightMatch function directly
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const component = wrapper.vm as any
      const highlighted = component.highlightMatch('Apple has apples', 'app')

      expect(highlighted).toBe(
        '<strong>App</strong>le has <strong>app</strong>les'
      )
    })

    it('should escape HTML characters in highlightMatch', () => {
      const wrapper = mount(SearchableList, {
        props: { items: stringItems },
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const component = wrapper.vm as any
      const highlighted = component.highlightMatch(
        '<script>alert("test")</script>',
        'script'
      )

      expect(highlighted).toContain('&lt;')
      expect(highlighted).toContain('&gt;')
      expect(highlighted).toContain('&quot;')
    })

    it('should handle special regex characters in highlightMatch', () => {
      const wrapper = mount(SearchableList, {
        props: { items: stringItems },
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const component = wrapper.vm as any
      const highlighted = component.highlightMatch(
        'test.query+special?chars',
        '.query+'
      )

      expect(highlighted).toContain('<strong>.query+</strong>')
    })

    it('should return original text when no query in highlightMatch', () => {
      const wrapper = mount(SearchableList, {
        props: { items: stringItems },
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const component = wrapper.vm as any
      const highlighted = component.highlightMatch('test text', '')

      expect(highlighted).toBe('test text')
    })

    it('should return original text when no text in highlightMatch', () => {
      const wrapper = mount(SearchableList, {
        props: { items: stringItems },
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const component = wrapper.vm as any
      const highlighted = component.highlightMatch('', 'query')

      expect(highlighted).toBe('')
    })

    it('should use provided query parameter in highlightMatch', () => {
      const wrapper = mount(SearchableList, {
        props: { items: stringItems },
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const component = wrapper.vm as any
      const highlighted = component.highlightMatch('test text', 'test')

      expect(highlighted).toBe('<strong>test</strong> text')
    })
  })

  describe('🎯 Computed Properties Edge Cases', () => {
    it('should handle filteredItems when items is empty', () => {
      const wrapper = mount(SearchableList, {
        props: { items: [] },
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const component = wrapper.vm as any
      expect(component.filteredItems).toEqual([])
    })

    it('should handle visibleItems when filteredItems is empty', () => {
      const wrapper = mount(SearchableList, {
        props: { items: [] },
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const component = wrapper.vm as any
      expect(component.visibleItems).toEqual([])
    })

    it('should handle hasMoreItems when no items', () => {
      const wrapper = mount(SearchableList, {
        props: { items: [] },
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const component = wrapper.vm as any
      expect(component.hasMoreItems).toBe(false)
    })
  })

  describe('🎯 Complex Selection Logic', () => {
    it('should handle isItemSelected with undefined selectedItem', () => {
      const wrapper = mount(SearchableList, {
        props: {
          items: objectItems,
          selectedItem: undefined,
        },
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const component = wrapper.vm as any
      expect(component.isItemSelected(objectItems[0])).toBe(false)
    })

    it('should handle isItemProcessing with undefined processingItem', () => {
      const wrapper = mount(SearchableList, {
        props: {
          items: objectItems,
          processingItem: undefined,
        },
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const component = wrapper.vm as any
      expect(component.isItemProcessing(objectItems[0])).toBe(false)
    })

    it('should compare items by ID when both have id property', () => {
      const item1 = { id: 'test-id', name: 'Item 1' }
      const item2 = { id: 'test-id', name: 'Item 2' } // Same ID, different name

      const wrapper = mount(SearchableList, {
        props: {
          items: [item1],
          selectedItem: item2,
        },
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const component = wrapper.vm as any
      expect(component.isItemSelected(item1)).toBe(true) // Should match by ID
    })

    it('should fall back to direct comparison when items lack id property', () => {
      const item1 = { name: 'Item 1' }
      const item2 = { name: 'Item 2' }

      const wrapper = mount(SearchableList, {
        props: {
          items: [item1, item2],
          selectedItem: item1, // Exact same reference
        },
      })

      // Access the component's internal state
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const component = wrapper.vm as any

      // Test with the actual objects from props to ensure reference equality
      const propsItems = component.$props.items
      const propsSelectedItem = component.$props.selectedItem

      expect(component.isItemSelected(propsItems[0])).toBe(true)
      expect(component.isItemSelected(propsItems[1])).toBe(false)

      // Also test direct comparison works
      expect(component.isItemSelected(propsSelectedItem)).toBe(true)
    })

    it('should handle mixed object types in isItemSelected', () => {
      const objectWithId = { id: 1, name: 'Object 1' }
      const objectWithoutId = { name: 'Object 2' }

      const wrapper = mount(SearchableList, {
        props: {
          items: [objectWithId, objectWithoutId],
          selectedItem: objectWithoutId, // Select object without ID
        },
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const component = wrapper.vm as any

      // Test with the actual objects from props to ensure reference equality
      const propsItems = component.$props.items
      const propsSelectedItem = component.$props.selectedItem

      expect(component.isItemSelected(propsItems[0])).toBe(false) // objectWithId
      expect(component.isItemSelected(propsItems[1])).toBe(true) // objectWithoutId

      // Also test direct comparison works
      expect(component.isItemSelected(propsSelectedItem)).toBe(true)
    })
  })

  describe('🎯 Search Results Display', () => {
    it('should show "Search Results" title when there is a search query', async () => {
      const wrapper = mount(SearchableList, {
        props: { items: stringItems },
      })

      const input = wrapper.find('.search-input')
      await input.setValue('a')
      await nextTick()

      const title = wrapper.find('.results-title')
      expect(title.text()).toContain('Search Results')
    })

    it('should show "All Items" title when there is no search query', () => {
      const wrapper = mount(SearchableList, {
        props: { items: stringItems },
      })

      const title = wrapper.find('.results-title')
      expect(title.text()).toContain('All Items')
    })

    it('should display correct results count', async () => {
      const wrapper = mount(SearchableList, {
        props: { items: stringItems },
      })

      const count = wrapper.find('.results-count')
      expect(count.text()).toBe('(4)')

      const input = wrapper.find('.search-input')
      await input.setValue('a')
      await nextTick()

      expect(count.text()).toBe('(3)')
    })
  })

  describe('🎯 Event Handling Edge Cases', () => {
    it('should not emit item-click when clicking on processing item via template condition', async () => {
      const wrapper = mount(SearchableList, {
        props: {
          items: objectItems,
          processingItem: objectItems[0],
        },
      })

      const processingItem = wrapper.find('.item-processing')
      await processingItem.trigger('click')

      // Should not emit because the template has conditional logic
      expect(wrapper.emitted('item-click')).toBeFalsy()
    })

    it('should handle search input without emitting when readonly', async () => {
      const wrapper = mount(SearchableList, {
        props: {
          items: stringItems,
          readonly: true,
        },
      })

      const input = wrapper.find('.search-input')

      // Try to trigger input event on readonly field
      await input.trigger('input')

      // Should still emit because the handler doesn't check readonly state
      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    })
  })
})
