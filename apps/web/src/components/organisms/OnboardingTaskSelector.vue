<template>
  <div class="task-selector">
    <div class="task-selector-container">
      <!-- Header Section -->
      <div class="selector-header">
        <div class="header-content">
          <h1 class="selector-title">Select Task</h1>
          <p class="selector-subtitle">
            Choose from existing branches or create a new task
          </p>
        </div>
      </div>

      <!-- Main Content -->
      <div class="selector-content">
        <!-- Search Section -->
        <div class="search-section">
          <div class="search-container">
            <BaseIcon name="Eye" size="sm" class="search-icon" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search branches..."
              class="search-input"
              :readonly="!isInSearchMode"
              @click="activateSearchMode"
              @focus="activateSearchMode"
              @input="filterBranchesHandler"
              @keydown.escape="handleSearchEscape"
              @blur="handleSearchBlur"
            />
            <BaseIcon
              v-if="searchQuery"
              name="X"
              size="sm"
              class="search-clear"
              @click="clearSearchHandler"
            />
          </div>
        </div>

        <!-- Branches Content Area -->
        <div class="branches-content-area">
          <!-- Loading Branches -->
          <div v-if="isLoading" class="loading-branches">
            <CircleLoading
              size="lg"
              text="Loading Git branches..."
              :show-icon="false"
            />
          </div>

          <!-- Existing Branches Section -->
          <div v-else-if="filteredBranches.length > 0" class="branches-section">
            <h3 class="section-title">
              {{ searchQuery ? 'Search Results' : 'All Branches' }}
              <span class="branch-count">({{ filteredBranches.length }})</span>
            </h3>
            <div class="branches-list-container">
              <div class="branches-list">
                <div
                  v-for="branch in filteredBranches"
                  :key="branch.name"
                  class="branch-item"
                  :class="{
                    'branch-selected': selectedBranch?.name === branch.name,
                    'branch-switching':
                      isSwitchingBranch && selectedBranch?.name === branch.name,
                  }"
                  @click="
                    !isSwitchingBranch ? selectExistingBranch(branch) : null
                  "
                >
                  <div class="branch-main">
                    <div class="branch-header">
                      <BaseIcon
                        name="GitBranch"
                        size="xs"
                        class="branch-icon"
                      />
                      <span
                        class="branch-name"
                        v-html="highlightMatch(branch.name, searchQuery)"
                      ></span>
                    </div>
                    <p
                      class="branch-commit"
                      v-html="highlightMatch(branch.lastCommit, searchQuery)"
                    ></p>
                  </div>
                  <div class="branch-meta">
                    <span class="branch-date">{{
                      formatDate(branch.lastUpdate)
                    }}</span>
                  </div>
                  <div
                    v-if="
                      isSwitchingBranch && selectedBranch?.name === branch.name
                    "
                    class="branch-loading-indicator"
                  >
                    <BaseIcon name="Loader" size="sm" class="loading-spinner" />
                  </div>
                  <div
                    v-else-if="selectedBranch?.name === branch.name"
                    class="branch-selected-indicator"
                  >
                    <BaseIcon name="Check" size="sm" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- No Results Message -->
          <div
            v-else-if="searchQuery && branches.length > 0"
            class="no-results"
          >
            <BaseIcon name="Eye" size="lg" class="no-results-icon" />
            <p class="no-results-text">
              No branches found for "{{ searchQuery }}"
            </p>
            <BaseButton
              variant="ghost"
              size="sm"
              class="clear-search-button"
              @click="clearSearchHandler"
            >
              Clear search
            </BaseButton>
          </div>
        </div>

        <!-- Branch Switch Modal -->
        <BranchSwitchModal
          :is-visible="branchSwitch.isModalVisible.value"
          :current-branch="
            branchSwitch.currentSwitchData.value?.currentBranch || 'main'
          "
          :target-branch="
            branchSwitch.currentSwitchData.value?.targetBranch || ''
          "
          :changed-files="
            branchSwitch.currentSwitchData.value?.changedFiles || []
          "
          @close="handleBranchSwitchClose"
          @switch="handleBranchSwitchOption"
        />

        <!-- Git Error Modal (fallback for other errors) -->
        <GitErrorModal
          :is-visible="gitErrorModal.isModalVisible.value"
          :error="
            gitErrorModal.currentError.value || {
              success: false,
              currentBranch: '',
              message: 'Unknown error',
            }
          "
          @close="gitErrorModal.closeModal"
          @force-switch="gitErrorModal.handleForceSwitch"
        />

        <!-- Create New Task Section -->
        <div class="create-task-section">
          <div class="create-task-divider">
            <span class="divider-text">or</span>
          </div>
          <CtaButton
            size="lg"
            class="create-task-button"
            @click="createNewTask"
          >
            <BaseIcon name="Plus" size="sm" />
            Create a New Task
          </CtaButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch, nextTick, ref } from 'vue'
import { useOnboarding } from '../../composables/useOnboarding'
import {
  useBranchManager,
  type BranchInfo,
} from '../../composables/useBranchManager'
import { useTerminalTaskSelector } from '../../composables/useTerminalTaskSelector'
import { useBranchSwitch } from '../../composables/useBranchSwitch'
import { useGitErrorModal } from '../../composables/useGitErrorModal'
import BaseIcon from '../atoms/BaseIcon.vue'
import BaseButton from '../atoms/BaseButton.vue'
import CtaButton from '../atoms/CtaButton.vue'
import CircleLoading from '../atoms/CircleLoading.vue'
import GitErrorModal from './GitErrorModal.vue'
import BranchSwitchModal from './BranchSwitchModal.vue'

const emit = defineEmits<{
  next: []
  previous: []
  complete: []
}>()

// Use composables
const { selectedProject, selectBranch: selectOnboardingBranch } =
  useOnboarding()
const branchSwitch = useBranchSwitch()
const gitErrorModal = useGitErrorModal()

// Use branch manager composable
const {
  branches,
  selectedBranch,
  isLoading,
  isSwitching: isSwitchingBranch,
  searchQuery,
  debouncedSearchQuery,
  filteredBranches,
  loadBranches,
  selectBranch: selectBranchFromManager,
  filterBranches,
  clearSearch,
  formatDate,
} = useBranchManager()

// Use terminal task selector composable
const {
  isTerminalSearchMode,
  updateMessages: updateTerminalMessages,
  enterSearchMode: enterTerminalSearchMode,
  exitSearchMode: exitTerminalSearchMode,
  handleKeyPress: handleTerminalKeyPress,
  selectBranchByIndex,
  waitForContext: waitForTerminalContext,
} = useTerminalTaskSelector()

// Local state for UI search mode (different from terminal search mode)
const isInSearchMode = ref(false)

/**
 * Handles branch switch option selected in modal.
 *
 * @param option - Selected option ('stash' or 'bring')
 */
const handleBranchSwitchOption = async (option: 'stash' | 'bring') => {
  try {
    const result = await branchSwitch.executeBranchSwitch(option)

    if (result.success) {
      console.log('[TaskSelector] ✅ Successfully switched branches:', result)

      // Save the selected branch to onboarding state
      const branchConfig = {
        name: result.currentBranch,
        base: 'main', // Default base branch
        agent: 'development', // Default agent type
      }
      selectOnboardingBranch(branchConfig)

      // Navigate to next step
      emit('next')
    } else {
      console.error('[TaskSelector] ❌ Branch switch failed:', result.message)

      // Show error modal for switch failure
      gitErrorModal.showError({
        success: false,
        currentBranch: result.currentBranch,
        message: result.message || 'Failed to switch branch',
        errorType: 'other',
      })
    }
  } catch (error) {
    console.error('[TaskSelector] ❌ Branch switch error:', error)

    gitErrorModal.showError({
      success: false,
      currentBranch: '',
      message:
        error instanceof Error ? error.message : 'Unknown error occurred',
      errorType: 'other',
    })
  } finally {
    selectedBranch.value = null
    isSwitchingBranch.value = false
  }
}

// Methods
/**
 * Highlights matching text in a string with bold formatting.
 * @param text - The text to search in
 * @param query - The search query to highlight
 * @returns HTML string with highlighted matches
 */
const highlightMatch = (text: string, query: string): string => {
  if (!query || !text) return text

  // Escape HTML special characters first
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

  // Create a case-insensitive regex for the query
  const regex = new RegExp(
    `(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
    'gi'
  )

  // Replace matches with bold tags
  return escaped.replace(regex, '<strong>$1</strong>')
}

const selectExistingBranch = async (branch: BranchInfo) => {
  selectedBranch.value = branch
  isSwitchingBranch.value = true

  console.log('[TaskSelector] Selected existing branch:', branch.name)

  try {
    if (!selectedProject.value?.path) {
      throw new Error('No project selected')
    }

    // Get current branch first
    const branchesResult = await window.electronAPI.getGitBranches(
      selectedProject.value.path
    )
    const currentBranch = branchesResult.current || 'main'

    // Check if user selected the current branch
    if (branch.name === currentBranch) {
      console.log(
        '[TaskSelector] Branch is already current, proceeding to next step'
      )

      // Save the selected branch to onboarding state
      const branchConfig = {
        name: branch.name,
        base: 'main', // Default base branch
        agent: 'development', // Default agent type
      }
      selectOnboardingBranch(branchConfig)

      // Navigate to transition step
      console.log(
        '[TaskSelector] Going to transition step with loading animation'
      )
      isSwitchingBranch.value = false
      emit('next')
      return
    }

    // Check Git status for uncommitted changes
    console.log('[TaskSelector] Checking Git status before switch...')
    const statusResult = await window.electronAPI.getGitStatus(
      selectedProject.value.path
    )

    if (!statusResult.isRepository) {
      throw new Error('Not a Git repository')
    }

    const hasUncommittedChanges = statusResult.totalFiles > 0

    if (hasUncommittedChanges) {
      console.log(
        '[TaskSelector] Found uncommitted changes, showing options modal'
      )

      // Extract file paths from the status result
      const changedFiles = statusResult.files.map(
        (file: { path: string }) => file.path
      )

      // Show branch switch options modal
      branchSwitch.showBranchSwitchOptions({
        currentBranch,
        targetBranch: branch.name,
        changedFiles,
        projectPath: selectedProject.value.path,
      })

      isSwitchingBranch.value = false
      return
    }

    console.log('[TaskSelector] No uncommitted changes, switching directly...')

    // Use branch manager to switch branches
    await selectBranchFromManager(branch, selectedProject.value.path)

    // Check if branch switch was successful
    if (selectedBranch.value) {
      console.log(
        '[TaskSelector] ✅ Successfully switched to branch:',
        branch.name
      )

      // Save the selected branch to onboarding state
      const branchConfig = {
        name: branch.name,
        base: 'main', // Default base branch
        agent: 'development', // Default agent type
      }
      selectOnboardingBranch(branchConfig)

      // Navigate to transition step to show loading animation
      console.log(
        '[TaskSelector] Going to transition step with loading animation'
      )
      emit('next')
    } else {
      console.log('[TaskSelector] Branch switch handled by composable')
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred'
    console.error('[TaskSelector] ❌ Failed to switch branch:', errorMessage)

    // Show error modal for unexpected errors
    gitErrorModal.showError({
      success: false,
      currentBranch: '',
      message: errorMessage,
      errorType: 'other',
    })

    // Clear selection on error
    selectedBranch.value = null
  } finally {
    isSwitchingBranch.value = false
  }
}

/**
 * Handles branch switch modal close event.
 * Resets both modal state and local component state.
 */
const handleBranchSwitchClose = () => {
  console.log('[TaskSelector] Branch switch modal closed/canceled')

  // Close the modal and reset its state
  branchSwitch.closeBranchSwitchModal()

  // Reset local component state
  selectedBranch.value = null
  isSwitchingBranch.value = false
}

const createNewTask = () => {
  selectedBranch.value = null
  emit('next')
}

const filterBranchesHandler = () => {
  // Don't process input events when in terminal mode
  if (isTerminalSearchMode.value) {
    return
  }

  filterBranches(searchQuery.value)
}

const clearSearchHandler = () => {
  clearSearch()
  exitTerminalSearchMode()
  isInSearchMode.value = false
  updateTerminalMessages(
    branches.value,
    isLoading.value,
    '',
    '',
    branches.value
  )
}

/**
 * Activates search mode when user clicks or focuses on the search input.
 */
const activateSearchMode = () => {
  if (!isInSearchMode.value && !isTerminalSearchMode.value) {
    isInSearchMode.value = true
  }
}

/**
 * Handles escape key in search input to exit search mode.
 */
const handleSearchEscape = () => {
  isInSearchMode.value = false
  const activeElement = document.activeElement as HTMLElement
  if (activeElement && activeElement.tagName === 'INPUT') {
    activeElement.blur()
  }
}

/**
 * Handles blur event on search input to exit search mode.
 */
const handleSearchBlur = () => {
  // Small delay to allow click events on clear button to fire first
  setTimeout(() => {
    if (!searchQuery.value) {
      isInSearchMode.value = false
    }
  }, 200)
}

/**
 * Updates search with debouncing.
 *
 * @param query - Optional query string to use instead of searchQuery.value
 * @private
 */
const updateSearchDebounced = (query?: string) => {
  // Use provided query or current searchQuery value
  const currentQuery = query !== undefined ? query : searchQuery.value

  console.log(
    '[TaskSelector] updateSearchDebounced called with query:',
    currentQuery
  )

  // Update searchQuery if a query was provided
  if (query !== undefined) {
    searchQuery.value = query
  }

  // Update search via composable
  filterBranches(currentQuery)

  // Update terminal messages
  updateTerminalMessages(
    branches.value,
    isLoading.value,
    currentQuery,
    debouncedSearchQuery.value,
    filteredBranches.value
  )
}

// Helper to call updateTerminalMessages from composable
const updateMessages = () => {
  updateTerminalMessages(
    branches.value,
    isLoading.value,
    searchQuery.value,
    debouncedSearchQuery.value,
    filteredBranches.value
  )
}

// Helper to enter search mode
const enterSearchMode = () => {
  searchQuery.value = ''
  debouncedSearchQuery.value = ''
  isInSearchMode.value = true

  // Blur any focused input to prevent keyboard events from going to it
  const activeElement = document.activeElement as HTMLElement
  if (activeElement && activeElement.tagName === 'INPUT') {
    activeElement.blur()
  }

  enterTerminalSearchMode()
  updateMessages()
}

// Helper to select branch by index
const handleBranchSelection = (index: number) => {
  console.log('[TaskSelector] handleBranchSelection called with index:', index)
  console.log(
    '[TaskSelector] Available branches:',
    branches.value.map((b) => b.name)
  )
  console.log(
    '[TaskSelector] Filtered branches:',
    filteredBranches.value.map((b) => b.name)
  )
  selectBranchByIndex(
    index,
    branches.value,
    filteredBranches.value,
    selectExistingBranch
  )
}

// formatDate is now provided by useBranchManager composable

// Helper to load branches and update terminal
const loadBranchesWithTerminal = async () => {
  await loadBranches(selectedProject.value?.path)
  // Only update messages once after branches are loaded
  if (window.currentContext && !isLoading.value) {
    updateMessages()
  }
}

// Event handlers for terminal integration
const handleEnterBranchSearch = () => {
  console.log('[TaskSelector] Terminal requested branch search mode')
  enterSearchMode()
}

const handleSelectBranch = (event: unknown) => {
  console.log('[TaskSelector] Received terminal-select-branch event:', event)
  const customEvent = event as { detail?: { index?: number } }
  const index = customEvent.detail?.index
  console.log('[TaskSelector] Branch selection index from event:', index)
  if (typeof index === 'number') {
    console.log(
      '[TaskSelector] Calling handleBranchSelection with index:',
      index
    )
    handleBranchSelection(index)
  } else {
    console.warn(
      '[TaskSelector] Invalid index in terminal-select-branch event:',
      index
    )
  }
}

const handleKeyPress = (event: KeyboardEvent) => {
  console.log(
    '[TaskSelector] handleKeyPress called with key:',
    event.key,
    'isTerminalSearchMode:',
    isTerminalSearchMode.value
  )

  // Allow system shortcuts to pass through (Cmd+R, Ctrl+R, etc.)
  if (event.metaKey || event.ctrlKey) {
    return // Let system shortcuts work normally
  }

  // Only prevent default for keys we actually handle in search mode
  if (isTerminalSearchMode.value) {
    // Only prevent default for specific keys we handle
    const handledKeys = [
      'Escape',
      'Enter',
      'Backspace',
      'Delete',
      'ArrowLeft',
      'ArrowRight',
      '0',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
    ]

    // For regular typing, also prevent default
    if (event.key.length === 1 || handledKeys.includes(event.key)) {
      event.preventDefault()
      event.stopPropagation()
    }
  }

  // Always pass the event through to handleTerminalKeyPress
  handleTerminalKeyPress(
    event,
    searchQuery,
    branches.value,
    updateSearchDebounced,
    handleBranchSelection
  )
}

// waitForTerminalContext is now provided by useTerminalTaskSelector composable

// Watch for loading state changes to update terminal
watch(isLoading, (newValue, oldValue) => {
  // Only update if actually changed (not just reactive trigger)
  if (newValue !== oldValue) {
    console.log(
      '[TaskSelector] Loading state changed:',
      oldValue,
      '->',
      newValue
    )
    updateMessages()
  }
})

// Watch terminal search mode to ensure input stays unfocused
watch(isTerminalSearchMode, (isInTerminalMode) => {
  if (isInTerminalMode) {
    // Activate UI search mode when terminal search mode is activated
    isInSearchMode.value = true
    // Ensure any input is blurred when entering terminal search mode
    nextTick(() => {
      const inputs = document.querySelectorAll('input')
      inputs.forEach((input) => {
        ;(input as HTMLElement).blur()
      })
    })
  } else {
    // Exit UI search mode when terminal search mode is deactivated
    isInSearchMode.value = false
  }
})

// Lifecycle
onMounted(async () => {
  console.log('[TaskSelector] Component mounted, loading branches...')

  // Load branches in parallel with waiting for terminal
  await Promise.all([loadBranchesWithTerminal(), waitForTerminalContext()])

  // Update terminal messages after both branches and context are ready
  updateMessages()

  // Listen for terminal events
  window.addEventListener(
    'terminal-enter-branch-search',
    handleEnterBranchSearch
  )
  window.addEventListener('terminal-select-branch', handleSelectBranch)

  // Listen for keyboard events when terminal is active - use capture to intercept before input
  window.addEventListener('keydown', handleKeyPress, true)
})

onUnmounted(() => {
  // Clean up event listeners
  window.removeEventListener(
    'terminal-enter-branch-search',
    handleEnterBranchSearch
  )
  window.removeEventListener('terminal-select-branch', handleSelectBranch)
  window.removeEventListener('keydown', handleKeyPress, true)
})
</script>

<style scoped>
.task-selector {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
}

.task-selector-container {
  width: 100%;
  max-width: 800px;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

/* Header */
.selector-header {
  text-align: center;
}

.title-with-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 12px;
}

.header-icon {
  color: var(--accent-primary);
  flex-shrink: 0;
}

.selector-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 12px 0;
  letter-spacing: -0.02em;
}

.selector-subtitle {
  font-size: 18px;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
}

/* Content */
.selector-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
  flex: 1;
  min-height: 0; /* Allow flex item to shrink */
}

/* Branches Content Area - Fixed height to prevent button movement */
.branches-content-area {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Search Section */
.search-section {
  flex-shrink: 0;
}

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

.branches-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
  min-height: 0; /* Allow flex item to shrink */
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.branch-count {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-tertiary);
}

.branches-list-container {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 4px;
  margin: -4px; /* Compensate for padding */
}

.branches-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Custom scrollbar for branches list */
.branches-list-container::-webkit-scrollbar {
  width: 6px;
}

.branches-list-container::-webkit-scrollbar-track {
  background: transparent;
}

.branches-list-container::-webkit-scrollbar-thumb {
  background: var(--border-secondary);
  border-radius: 3px;
}

.branches-list-container::-webkit-scrollbar-thumb:hover {
  background: var(--text-tertiary);
}

.branch-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.branch-item:hover {
  border-color: var(--border-secondary);
  background: var(--bg-tertiary);
  transform: translateY(-1px);
}

.branch-selected {
  border-color: var(--accent-primary) !important;
  background: var(--accent-primary-10) !important;
}

.branch-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0; /* Allows flex item to shrink */
}

.branch-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.branch-icon {
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.branch-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Highlighting for search matches in branch names */
.branch-name :deep(strong) {
  font-weight: 400; /* Regular weight, not bold */
  color: var(--accent-primary); /* Golden color */
  background: var(--accent-primary-10);
  margin: 0 1px; /* Small margin to prevent cramping */
  border-radius: 3px;
  display: inline-block; /* Ensures proper spacing */
  line-height: 1.2; /* Consistent line height */
}

.branch-commit {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Highlighting for search matches in commit messages - also golden */
.branch-commit :deep(strong) {
  font-weight: 400; /* Regular weight, not bold */
  color: var(--accent-primary); /* Golden color like branch names */
  background: var(--accent-primary-10);
  margin: 0 1px; /* Small margin to prevent cramping */
  border-radius: 3px;
  display: inline-block; /* Ensures proper spacing */
  line-height: 1.2; /* Consistent line height */
}

.branch-meta {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  margin-left: 12px;
}

.branch-date {
  font-size: 11px;
  color: var(--text-tertiary);
  font-weight: 500;
  white-space: nowrap;
  padding: 2px 6px;
  background: var(--bg-tertiary);
  border-radius: 4px;
}

.branch-selected-indicator {
  color: var(--accent-primary);
  flex-shrink: 0;
}

.branch-loading-indicator {
  color: var(--accent-primary);
  flex-shrink: 0;
}

.loading-spinner {
  animation: spin 1s linear infinite;
}

.branch-switching {
  opacity: 0.7;
  pointer-events: none;
}

.branch-switching .branch-name {
  color: var(--text-secondary);
}

/* Loading Branches */
.loading-branches {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
  flex: 1;
  min-height: 0;
}

.loading-icon {
  color: var(--accent-primary);
  animation: spin 1s linear infinite;
}

.loading-text {
  color: var(--text-secondary);
  font-size: 16px;
  margin: 0;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* No Results */
.no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 48px 24px;
  text-align: center;
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

/* Old error styles removed - now using GitErrorModal */

/* Create Task Section */
.create-task-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  flex-shrink: 0; /* Always stay at the bottom */
  margin-top: auto; /* Push to bottom */
}

.create-task-divider {
  position: relative;
  width: 100%;
  height: 1px;
  background: var(--border-primary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.divider-text {
  background: var(--bg-primary);
  color: var(--text-tertiary);
  padding: 0 16px;
  font-size: 14px;
  font-weight: 500;
}

.create-task-button {
  gap: 8px;
}

/* Responsive */
@media (max-width: 768px) {
  .task-selector {
    padding: 20px;
  }

  .selector-title {
    font-size: 24px;
  }

  .selector-subtitle {
    font-size: 16px;
  }

  .branch-item {
    padding: 10px 12px;
  }

  .branch-main {
    gap: 3px;
  }

  .branch-name {
    font-size: 13px;
  }

  .branch-commit {
    font-size: 12px;
  }

  .branch-date {
    font-size: 10px;
    padding: 1px 4px;
  }

  .branch-meta {
    margin-left: 8px;
  }
}

/* Bold text for search highlights */
.branch-name strong,
.branch-commit strong {
  font-weight: 700;
  color: var(--color-accent);
  background: rgba(var(--color-accent-rgb), 0.1);
  padding: 0 2px;
  border-radius: 2px;
}

@media (max-width: 480px) {
  .task-selector-container {
    gap: 24px;
  }

  .selector-content {
    gap: 24px;
  }
}
</style>
