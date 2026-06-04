<template>
  <div class="searchable-list">
    <!-- Search Input -->
    <div class="search-container">
      <BaseIcon :name="searchIcon" size="sm" class="search-icon" />
      <input
        v-model="searchQuery"
        type="text"
        :placeholder="placeholder"
        class="search-input"
        :readonly="readonly"
        :disabled="disabled"
        @input="handleSearchInput"
      />
      <BaseIcon
        v-if="searchQuery && showClearButton"
        name="X"
        size="sm"
        class="search-clear"
        @click="handleClearSearch"
      />
    </div>

    <!-- Results List -->
    <div class="results-container">
      <!-- Current Item Display (shown separately when enabled) -->
      <div
        v-if="showCurrentItem && currentItem && !loading"
        class="current-item-section"
      >
        <h3 class="current-item-label">{{ currentItemLabel }}</h3>
        <div
          class="list-item current-item"
          @click="handleItemClick(currentItem)"
        >
          <slot
            name="current-item"
            :item="currentItem"
            :highlighted="highlightMatch"
          >
            <span>{{ getItemLabel(currentItem) }}</span>
          </slot>
          <BaseIcon name="ArrowRight" size="sm" class="item-arrow" />
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <slot name="loading">
          <CircleLoading size="lg" :text="loadingText" :show-icon="false" />
        </slot>
      </div>

      <!-- Results -->
      <div v-else-if="filteredItems.length > 0" class="results-list">
        <slot name="header" :count="filteredItems.length">
          <h3 class="results-title">
            {{ searchQuery ? 'Search Results' : 'All Items' }}
            <span class="results-count">({{ filteredItems.length }})</span>
          </h3>
        </slot>

        <div class="items-list-container">
          <div class="items-list">
            <div
              v-for="(item, index) in visibleItems"
              :key="getItemKey(item, index)"
              class="list-item"
              :class="{
                'item-selected': isItemSelected(item),
                'item-processing': isItemProcessing(item),
              }"
              @click="!isItemProcessing(item) ? handleItemClick(item) : null"
            >
              <slot
                name="item"
                :item="item"
                :index="index"
                :highlighted="highlightMatch"
              >
                <span>{{ getItemLabel(item) }}</span>
              </slot>

              <!-- Selection/Action Indicators -->
              <div class="item-indicators">
                <div v-if="isItemProcessing(item)" class="item-indicator">
                  <BaseIcon name="Loader" size="sm" class="loading-spinner" />
                </div>
                <div v-else-if="isItemSelected(item)" class="item-indicator">
                  <BaseIcon name="Check" size="sm" />
                </div>
                <BaseIcon name="ArrowRight" size="sm" class="item-arrow" />
              </div>
            </div>
          </div>
        </div>

        <div v-if="hasMoreItems" class="more-items-indicator">
          ... and {{ filteredItems.length - maxVisibleItems }} more items
        </div>
      </div>

      <!-- No Results -->
      <div v-else-if="searchQuery && items.length > 0" class="no-results">
        <slot name="no-results" :query="searchQuery">
          <BaseIcon :name="searchIcon" size="lg" class="no-results-icon" />
          <p class="no-results-text">
            No results found for "{{ searchQuery }}"
          </p>
          <BaseButton
            v-if="showClearButton"
            variant="ghost"
            size="sm"
            class="clear-search-button"
            @click="handleClearSearch"
          >
            Clear search
          </BaseButton>
        </slot>
      </div>

      <!-- Empty State -->
      <div v-else-if="!searchQuery && items.length === 0" class="empty-state">
        <slot name="empty">
          <p class="empty-text">No items available</p>
        </slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import BaseIcon from '../atoms/BaseIcon.vue'
import BaseButton from '../atoms/BaseButton.vue'
import CircleLoading from '../atoms/CircleLoading.vue'

/**
 * Generic type for list items
 */
type ListItem = unknown

/**
 * Props for the SearchableList component.
 *
 * @public
 * @since 1.0.0
 */
interface Props {
  /** Array of items to display and search */
  items: ListItem[]
  /** Current search query (v-model support) */
  modelValue?: string
  /** Placeholder text for search input */
  placeholder?: string
  /** Icon name for search input */
  searchIcon?: string
  /** Whether component is loading */
  loading?: boolean
  /** Loading text to display */
  loadingText?: string
  /** Whether search input is readonly */
  readonly?: boolean
  /** Whether search input is disabled */
  disabled?: boolean
  /** Whether to show clear button */
  showClearButton?: boolean
  /** Maximum number of visible items */
  maxVisibleItems?: number
  /** Currently selected item */
  selectedItem?: ListItem
  /** Currently processing item */
  processingItem?: ListItem
  /** Function to get item key */
  getItemKey?: (item: ListItem, index: number) => string | number
  /** Function to get item label */
  getItemLabel?: (item: ListItem) => string
  /** Function to filter items based on query */
  filterFunction?: (items: ListItem[], query: string) => ListItem[]
  /** Current/selected item to show separately at the top */
  currentItem?: ListItem
  /** Label for the current item section */
  currentItemLabel?: string
  /** Whether to show the current item separately */
  showCurrentItem?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: 'Search...',
  searchIcon: 'Search',
  loading: false,
  loadingText: 'Loading...',
  readonly: false,
  disabled: false,
  showClearButton: true,
  maxVisibleItems: 10,
  selectedItem: undefined,
  processingItem: undefined,
  currentItem: undefined,
  currentItemLabel: 'Current selection',
  showCurrentItem: false,
  getItemKey: (item: ListItem, index: number) =>
    typeof item === 'object' && item && 'id' in item
      ? (item as { id: string | number }).id
      : index,
  getItemLabel: (item: ListItem) => {
    if (typeof item === 'string') return item
    if (typeof item === 'object' && item) {
      if ('name' in item) return String((item as { name: unknown }).name)
      if ('label' in item) return String((item as { label: unknown }).label)
    }
    return String(item)
  },
  filterFunction: undefined,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'item-click': [item: ListItem]
  clear: []
  search: [query: string]
}>()

// Local search query state
const searchQuery = ref(props.modelValue)

// Computed filtered items (excluding current item if shown separately)
const filteredItems = computed(() => {
  let items = props.items

  // Filter out the current item if it's being shown separately
  if (props.showCurrentItem && props.currentItem) {
    items = items.filter((item) => {
      const itemLabel = props.getItemLabel(item)
      const currentLabel = props.getItemLabel(props.currentItem!)
      return itemLabel !== currentLabel
    })
  }

  if (!searchQuery.value) return items

  if (props.filterFunction) {
    return props.filterFunction(items, searchQuery.value)
  }

  // Default filter: search in label
  const query = searchQuery.value.toLowerCase()
  return items.filter((item) => {
    const label = props.getItemLabel(item)
    return label.toLowerCase().includes(query)
  })
})

// Computed visible items (limited by maxVisibleItems)
const visibleItems = computed(() => {
  return filteredItems.value.slice(0, props.maxVisibleItems)
})

// Check if there are more items than visible
const hasMoreItems = computed(() => {
  return filteredItems.value.length > props.maxVisibleItems
})

// Methods
const handleSearchInput = () => {
  emit('update:modelValue', searchQuery.value)
  emit('search', searchQuery.value)
}

const handleClearSearch = () => {
  searchQuery.value = ''
  emit('update:modelValue', '')
  emit('clear')
}

const handleItemClick = (item: ListItem) => {
  emit('item-click', item)
}

const isItemSelected = (item: ListItem) => {
  if (!props.selectedItem) return false

  // If items have IDs, compare by ID
  if (
    typeof item === 'object' &&
    item &&
    'id' in item &&
    typeof props.selectedItem === 'object' &&
    props.selectedItem &&
    'id' in props.selectedItem
  ) {
    return (
      (item as { id: unknown }).id ===
      (props.selectedItem as { id: unknown }).id
    )
  }

  // Otherwise, direct comparison
  return item === props.selectedItem
}

const isItemProcessing = (item: ListItem) => {
  if (!props.processingItem) return false

  // If items have IDs, compare by ID
  if (
    typeof item === 'object' &&
    item &&
    'id' in item &&
    typeof props.processingItem === 'object' &&
    props.processingItem &&
    'id' in props.processingItem
  ) {
    return (
      (item as { id: unknown }).id ===
      (props.processingItem as { id: unknown }).id
    )
  }

  // Otherwise, direct comparison
  return item === props.processingItem
}

/**
 * Highlights matching text in a string with bold formatting.
 *
 * @param text - The text to search in
 * @param query - The search query to highlight
 * @returns HTML string with highlighted matches
 *
 * @public
 * @since 1.0.0
 */
const highlightMatch = (text: string, query?: string): string => {
  const searchTerm = query || searchQuery.value
  if (!searchTerm || !text) return text

  // Escape HTML special characters first
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

  // Create a case-insensitive regex for the query
  const regex = new RegExp(
    `(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
    'gi'
  )

  // Replace matches with bold tags
  return escaped.replace(regex, '<strong>$1</strong>')
}

// Watch for external changes to modelValue
watch(
  () => props.modelValue,
  (newValue) => {
    searchQuery.value = newValue
  }
)
</script>

<style scoped>
.searchable-list {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Search Container */
.search-container {
  position: relative;
  display: flex;
  align-items: center;
  background: var(--bg-secondary);
  border: 2px solid var(--border-primary);
  border-radius: 12px;
  padding: 12px 16px;
  transition: border-color 0.2s ease;
}

.search-container:focus-within {
  border-color: var(--accent-primary);
}

.search-icon {
  color: var(--text-tertiary);
  margin-right: 12px;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: 16px;
  color: var(--text-primary);
  padding: 0;
}

.search-input::placeholder {
  color: var(--text-tertiary);
}

.search-input[readonly],
.search-input[disabled] {
  cursor: default;
  opacity: 0.7;
}

.search-clear {
  color: var(--text-tertiary);
  cursor: pointer;
  margin-left: 8px;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.search-clear:hover {
  color: var(--text-secondary);
  background: var(--bg-tertiary);
}

/* Results Container */
.results-container {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/* Current Item Section */
.current-item-section {
  margin-bottom: 24px;
  flex-shrink: 0;
}

.current-item-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  margin: 6px 0 14px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Current item styling - like standard item but golden */
.list-item.current-item {
  border-color: var(--accent-primary) !important;
  background: linear-gradient(
    135deg,
    rgba(255, 200, 0, 0.1),
    rgba(255, 200, 0, 0.05)
  ) !important;
  box-shadow: 0 0 0 1px var(--accent-primary) inset !important;
}

.list-item.current-item:hover {
  background: linear-gradient(
    135deg,
    rgba(255, 200, 0, 0.15),
    rgba(255, 200, 0, 0.08)
  ) !important;
  transform: none !important;
}

.list-item.current-item .item-arrow {
  color: var(--accent-primary) !important;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
  flex: 1;
}

/* Results List */
.results-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  min-height: 0;
}

.results-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.results-count {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-tertiary);
}

.items-list-container {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 4px;
  margin: -4px;
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Custom scrollbar */
.items-list-container::-webkit-scrollbar {
  width: 6px;
}

.items-list-container::-webkit-scrollbar-track {
  background: transparent;
}

.items-list-container::-webkit-scrollbar-thumb {
  background: var(--border-secondary);
  border-radius: 3px;
}

.items-list-container::-webkit-scrollbar-thumb:hover {
  background: var(--text-tertiary);
}

/* List Items */
.list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  gap: 12px;
}

.list-item:hover {
  border-color: var(--border-secondary);
  background: var(--bg-tertiary);
  transform: translateY(-1px);
}

.item-selected {
  border-color: var(--accent-primary) !important;
  background: var(--accent-primary-10) !important;
}

.item-processing {
  opacity: 0.7;
  pointer-events: none;
}

.item-indicators {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.item-indicator {
  color: var(--accent-primary);
  flex-shrink: 0;
}

.item-arrow {
  color: var(--text-tertiary);
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.list-item:hover .item-arrow {
  color: var(--text-secondary);
  transform: translateX(2px);
}

.loading-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* More Items Indicator */
.more-items-indicator {
  padding: 8px 16px;
  font-size: 14px;
  color: var(--text-tertiary);
  font-style: italic;
}

/* No Results */
.no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 48px 24px;
  text-align: center;
  flex: 1;
  justify-content: center;
}

.no-results-icon {
  color: var(--text-tertiary);
  opacity: 0.6;
}

.no-results-text {
  color: var(--text-secondary);
  font-size: 16px;
  margin: 0;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
  flex: 1;
}

.empty-text {
  color: var(--text-secondary);
  font-size: 16px;
  margin: 0;
}

/* Slotted content styling for two-line layouts */
.list-item :deep(.branch-main) {
  flex: 1;
  min-width: 0;
}

.list-item :deep(.branch-meta) {
  flex-shrink: 0;
}

/* Support for custom section titles */
.results-list :deep(.section-title) {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  margin: 0 0 2px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.results-list :deep(.branch-count) {
  color: var(--text-tertiary);
  font-weight: 400;
}

/* Highlighting for search matches */
.list-item :deep(strong) {
  font-weight: 400;
  color: var(--accent-primary);
  background: var(--accent-primary-10);
  margin: 0 1px;
  border-radius: 3px;
  display: inline-block;
  line-height: 1.2;
}

/* Responsive */
@media (max-width: 768px) {
  .searchable-list {
    gap: 16px;
  }

  .results-title {
    font-size: 18px;
  }

  .list-item {
    padding: 10px 12px;
  }
}
</style>
