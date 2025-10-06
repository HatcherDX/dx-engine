<template>
  <div ref="selectorRef" class="branch-selector">
    <!-- Selected Branch Display / Trigger -->
    <button
      class="selector-trigger"
      :class="{ 'is-open': isOpen }"
      @click="toggleDropdown"
    >
      <div class="selected-branch">
        <BaseIcon name="GitBranch" size="sm" class="branch-icon" />
        <span class="branch-name">{{ modelValue || placeholder }}</span>
      </div>
      <BaseIcon
        name="ArrowDown"
        size="sm"
        class="dropdown-arrow"
        :class="{ rotated: isOpen }"
      />
    </button>

    <!-- Dropdown Menu -->
    <Transition name="dropdown">
      <div v-if="isOpen" class="dropdown-menu">
        <!-- Search Input -->
        <div class="search-section">
          <div class="search-input-wrapper">
            <BaseIcon name="Search" size="sm" class="search-icon" />
            <input
              ref="searchInputRef"
              v-model="searchQuery"
              type="text"
              placeholder="Search for base branch:"
              class="search-input"
              @keydown.escape="closeDropdown"
              @keydown.enter.prevent="selectFirstMatch"
              @keydown.down.prevent="navigateOptions('down')"
              @keydown.up.prevent="navigateOptions('up')"
            />
          </div>
          <div class="search-hint">
            <span class="escape-key">[esc]</span>
            <span class="hint-text">to close</span>
          </div>
        </div>

        <!-- Divider Space -->
        <div class="divider-space"></div>

        <!-- Branch List -->
        <div v-if="!isLoading" class="branches-list">
          <div v-if="filteredBranches.length === 0" class="no-results">
            <BaseIcon name="GitBranch" size="sm" class="no-results-icon" />
            <span>No branches found</span>
          </div>
          <div
            v-for="(branch, index) in filteredBranches"
            :key="branch"
            class="branch-option"
            :class="{
              'is-selected': branch === modelValue,
              'is-highlighted': index === highlightedIndex,
            }"
            @click="selectBranch(branch)"
            @mouseenter="highlightedIndex = index"
          >
            <BaseIcon name="GitBranch" size="xs" class="option-icon" />
            <span class="option-text">{{ branch }}</span>
            <BaseIcon
              v-if="branch === modelValue"
              name="Check"
              size="xs"
              class="check-icon"
            />
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="loading-section">
          <BaseIcon name="Loader" size="sm" class="loading-icon" />
          <span>Loading branches...</span>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import BaseIcon from '../atoms/BaseIcon.vue'

/**
 * Branch selector component with search functionality.
 *
 * @remarks
 * Provides a dropdown interface for selecting Git branches with
 * search filtering and keyboard navigation support.
 *
 * @public
 * @since 1.0.0
 */
interface Props {
  /** Currently selected branch name */
  modelValue?: string
  /** Available branch options */
  branches?: string[]
  /** Loading state */
  isLoading?: boolean
  /** Placeholder text */
  placeholder?: string
}

interface Emits {
  /** Emitted when branch selection changes */
  (event: 'update:modelValue', value: string): void
  /** Emitted when dropdown opens */
  (event: 'open'): void
  /** Emitted when dropdown closes */
  (event: 'close'): void
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  branches: (): string[] => [],
  isLoading: false,
  placeholder: 'Select a branch',
})

const emit = defineEmits<Emits>()

// Component state
const isOpen = ref(false)
const searchQuery = ref('')
const highlightedIndex = ref(0)
const selectorRef = ref<HTMLElement>()
const searchInputRef = ref<HTMLInputElement>()

// Computed properties
const filteredBranches = computed(() => {
  if (!searchQuery.value) return props.branches

  const query = searchQuery.value.toLowerCase()
  return props.branches.filter((branch) => branch.toLowerCase().includes(query))
})

// Methods
const toggleDropdown = async () => {
  if (isOpen.value) {
    closeDropdown()
  } else {
    openDropdown()
  }
}

const openDropdown = async () => {
  isOpen.value = true
  highlightedIndex.value = 0
  searchQuery.value = ''
  emit('open')

  await nextTick()
  searchInputRef.value?.focus()
}

const closeDropdown = () => {
  isOpen.value = false
  highlightedIndex.value = 0
  searchQuery.value = ''
  emit('close')
}

const selectBranch = (branch: string) => {
  emit('update:modelValue', branch)
  closeDropdown()
}

const selectFirstMatch = () => {
  if (filteredBranches.value.length > 0) {
    selectBranch(filteredBranches.value[0])
  }
}

const navigateOptions = (direction: 'up' | 'down') => {
  const maxIndex = filteredBranches.value.length - 1

  if (direction === 'down') {
    highlightedIndex.value =
      highlightedIndex.value < maxIndex ? highlightedIndex.value + 1 : 0
  } else {
    highlightedIndex.value =
      highlightedIndex.value > 0 ? highlightedIndex.value - 1 : maxIndex
  }
}

// Click outside handler
const handleClickOutside = (event: MouseEvent) => {
  if (
    selectorRef.value &&
    !selectorRef.value.contains(event.target as HTMLElement)
  ) {
    closeDropdown()
  }
}

// Reset highlighted index when filtered results change
watch(filteredBranches, () => {
  highlightedIndex.value = 0
})

// Lifecycle
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.branch-selector {
  position: relative;
  width: 100%;
}

/* Trigger Button - Matching branch-display style */
.selector-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 12px 16px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-secondary);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.selector-trigger:hover {
  border-color: var(--accent-primary);
  background: var(--bg-secondary);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.selector-trigger:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.selector-trigger.is-open {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px var(--accent-primary-alpha);
}

.selected-branch {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.branch-icon {
  color: var(--text-secondary);
  flex-shrink: 0;
  transition: color 0.2s ease;
}

.branch-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
}

.dropdown-arrow {
  color: var(--text-secondary);
  transition:
    transform 0.2s ease,
    color 0.2s ease;
  flex-shrink: 0;
}

.dropdown-arrow.rotated {
  transform: rotate(180deg);
}

.selector-trigger:hover .branch-icon {
  color: var(--accent-primary);
}

.selector-trigger:hover .dropdown-arrow {
  color: var(--accent-primary);
}

/* Dropdown Menu */
.dropdown-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  z-index: 1000;
  max-height: 280px;
  overflow: hidden;
}

/* Search Section */
.search-section {
  padding: 12px;
  border-bottom: 1px solid var(--border-secondary);
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-tertiary);
}

.escape-key {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 6px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-secondary);
  border-radius: 4px;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
}

.hint-text {
  color: var(--text-tertiary);
  font-size: 12px;
}

.divider-space {
  height: 8px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-secondary);
}

.search-icon {
  position: absolute;
  left: 12px;
  color: var(--text-tertiary);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 8px 12px 8px 36px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-secondary);
  border-radius: 6px;
  font-size: 14px;
  color: var(--text-primary);
  outline: none;
  transition: border-color 0.2s ease;
}

.search-input:focus {
  border-color: var(--accent-primary);
}

.search-input::placeholder {
  color: var(--text-tertiary);
}

/* Branch List */
.branches-list {
  max-height: 200px;
  overflow-y: auto;
}

.branch-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  cursor: pointer;
  transition: background-color 0.1s ease;
  position: relative;
}

.branch-option:hover,
.branch-option.is-highlighted {
  background: var(--hover-bg-light);
}

.dark .branch-option:hover,
.dark .branch-option.is-highlighted {
  background: var(--hover-bg-dark);
}

.branch-option.is-selected {
  background: var(--accent-primary-alpha);
  color: var(--accent-primary);
}

.option-icon {
  color: var(--text-secondary);
  flex-shrink: 0;
}

.branch-option.is-selected .option-icon {
  color: var(--accent-primary);
}

.option-text {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
}

.branch-option.is-selected .option-text {
  color: var(--accent-primary);
  font-weight: 600;
}

.check-icon {
  color: var(--accent-primary);
  flex-shrink: 0;
}

/* Loading and Empty States */
.loading-section,
.no-results {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  color: var(--text-secondary);
  font-size: 14px;
}

.loading-icon {
  animation: spin 1s linear infinite;
}

.no-results-icon {
  opacity: 0.5;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Dropdown Transition */
.dropdown-enter-active {
  transition: all 0.2s ease;
}

.dropdown-leave-active {
  transition: all 0.15s ease;
}

.dropdown-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}

.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* Custom Scrollbar */
.branches-list::-webkit-scrollbar {
  width: 6px;
}

.branches-list::-webkit-scrollbar-track {
  background: transparent;
}

.branches-list::-webkit-scrollbar-thumb {
  background: var(--border-secondary);
  border-radius: 3px;
}

.branches-list::-webkit-scrollbar-thumb:hover {
  background: var(--text-tertiary);
}
</style>
