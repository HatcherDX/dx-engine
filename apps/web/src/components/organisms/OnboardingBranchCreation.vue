<template>
  <div class="branch-creation-step">
    <div v-if="!isUISearchMode" class="step-container">
      <!-- Header Section - Full Width -->
      <div class="step-header">
        <h1 class="step-title">Create Your Development Branch</h1>
        <p class="step-description">
          Set up a dedicated branch for your {{ taskName }} task
        </p>
      </div>

      <!-- Two Column Layout -->
      <div class="step-content">
        <!-- Left Column - Workflow Info -->
        <div class="left-column">
          <div class="column-content">
            <h2 class="column-title">What happens next?</h2>

            <div class="workflow-steps">
              <div class="workflow-step">
                <div class="step-number">1</div>
                <div class="step-text">
                  <p class="step-title">Branch Creation</p>
                  <p class="step-description">
                    We'll create your branch from {{ baseBranch }}
                  </p>
                </div>
              </div>
              <div class="workflow-step">
                <div class="step-number">2</div>
                <div class="step-text">
                  <p class="step-title">AI Assistance</p>
                  <p class="step-description">
                    Our AI will help you with your {{ taskName }} task
                  </p>
                </div>
              </div>
              <div class="workflow-step">
                <div class="step-number">3</div>
                <div class="step-text">
                  <p class="step-title">Code & Commit</p>
                  <p class="step-description">
                    Make changes and commit with confidence
                  </p>
                </div>
              </div>
            </div>

            <p class="workflow-hint">
              Don't worry, you can always change branches later
            </p>
          </div>
        </div>

        <!-- Right Column - Branch Configuration -->
        <div class="right-column">
          <div class="column-content">
            <h2 class="column-title">Branch Configuration</h2>

            <!-- Branch Name (Read-only with edit option) -->
            <div class="form-group">
              <label class="form-label">Branch Name</label>
              <button
                v-disable-terminal
                class="branch-display-button"
                @click="goBackToTaskDetail"
              >
                <div class="branch-display-content">
                  <BaseIcon
                    name="GitBranch"
                    size="sm"
                    class="branch-icon-display"
                  />
                  <span class="branch-name-display">{{ fullBranchName }}</span>
                </div>
              </button>
              <p class="form-hint">Click to edit the task name</p>
            </div>

            <!-- Base Branch Selection -->
            <div class="form-group">
              <label class="form-label">Base Branch</label>
              <button
                v-disable-terminal
                class="branch-selector-button"
                @click="enterSearchMode"
              >
                <div class="branch-selector-content">
                  <BaseIcon
                    name="GitBranch"
                    size="sm"
                    class="branch-icon-selector"
                  />
                  <span class="branch-name-selector">{{ baseBranch }}</span>
                  <BaseIcon name="Search" size="sm" class="search-icon-hint" />
                </div>
              </button>
              <p class="form-hint">Click to select a different base branch</p>
            </div>

            <!-- Action Section -->
            <div class="action-section">
              <CtaButton
                v-disable-terminal
                :disabled="!canCreateBranch || isCreatingBranch"
                @click="createBranch"
              >
                <template v-if="isCreatingBranch">
                  <BaseIcon name="Loader" size="sm" class="spinner" />
                  Creating Branch...
                </template>
                <template v-else>
                  <BaseIcon name="GitBranch" size="sm" />
                  Create Branch
                </template>
              </CtaButton>
              <p v-if="branchCreationError" class="form-error">
                {{ branchCreationError }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Search Mode Interface -->
    <div v-else class="search-mode-container">
      <!-- Step Header -->
      <div class="step-header">
        <h1 class="step-title">Select Base Branch</h1>
        <p class="step-description">
          Choose which branch to create your new branch from
        </p>
      </div>

      <!-- Search Content -->
      <div class="search-content">
        <SearchableList
          v-model="searchQuery"
          :items="branches"
          :loading="isLoadingBranches"
          loading-text="Loading branches..."
          placeholder="Search branches..."
          search-icon="Search"
          :readonly="isSearchMode"
          :disabled="isSearchMode"
          :selected-item="branches.find((b) => b.name === baseBranch)"
          :get-item-key="getItemKey"
          :get-item-label="getItemLabel"
          :filter-function="filterBranchesWithCommit"
          :show-current-item="true"
          :current-item="branches.find((b) => b.name === baseBranch)"
          current-item-label="Current base branch"
          @item-click="handleBranchItemClick"
          @clear="clearSearch"
        >
          <!-- Custom current item slot -->
          <template #current-item="{ item, highlighted }">
            <div class="branch-main">
              <div class="branch-header">
                <BaseIcon name="GitBranch" size="xs" class="branch-icon" />
                <span
                  class="branch-name"
                  v-html="highlighted(getBranchName(item))"
                ></span>
              </div>
              <p
                class="branch-commit"
                v-html="highlighted(getBranchCommit(item))"
              ></p>
            </div>
            <div class="branch-meta">
              <span class="branch-date">{{
                formatDate(getBranchUpdate(item))
              }}</span>
            </div>
          </template>

          <!-- Custom header slot -->
          <template #header="{ count }">
            <h3 class="section-title">
              {{ searchQuery ? 'Search Results' : 'Available Branches' }}
              <span class="branch-count">({{ count }})</span>
            </h3>
          </template>

          <!-- Custom item slot -->
          <template #item="{ item, highlighted }">
            <div class="branch-main">
              <div class="branch-header">
                <BaseIcon name="GitBranch" size="xs" class="branch-icon" />
                <span
                  class="branch-name"
                  v-html="highlighted(getBranchName(item))"
                ></span>
              </div>
              <p
                class="branch-commit"
                v-html="highlighted(getBranchCommit(item))"
              ></p>
            </div>
            <div class="branch-meta">
              <span class="branch-date">{{
                formatDate(getBranchUpdate(item))
              }}</span>
            </div>
          </template>

          <!-- Custom no results slot -->
          <template #no-results="{ query }">
            <BaseIcon name="GitBranch" size="lg" class="no-results-icon" />
            <p class="no-results-text">No branches found for "{{ query }}"</p>
          </template>
        </SearchableList>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, onUnmounted, watch } from 'vue'
import { useOnboarding } from '../../composables/useOnboarding'
import { useGitIntegration } from '../../composables/useGitIntegration'
import {
  useBranchManager,
  type BranchInfo,
} from '../../composables/useBranchManager'
import { useBranchSearch } from '../../composables/useBranchSearch'
import { validateBranchName } from '../../utils/gitValidation'
import BaseIcon from '../atoms/BaseIcon.vue'
import CtaButton from '../atoms/CtaButton.vue'
import SearchableList from '../molecules/SearchableList.vue'

// Get onboarding context
const {
  selectedTask,
  nextStep,
  getSelectedTask,
  getSelectedBranch,
  selectedProject,
  goToStep,
} = useOnboarding()

// Get Git integration (available but currently unused - kept for future use)
const gitIntegration = useGitIntegration()
// Access getGitBranches when needed: gitIntegration.getGitBranches()
void gitIntegration // Explicitly mark as intentionally unused

// Branch state
const baseBranch = ref('main')

// Use branch manager composable for branch data
const {
  branches,
  isLoading: isLoadingBranches,
  searchQuery,
  filteredBranches,
  loadBranches,
  filterBranches,
  clearSearch,
  formatDate,
} = useBranchManager()

// Use branch search composable with terminal integration
const {
  isSearchMode,
  updateMessages,
  enterSearchMode: enterTerminalSearchMode,
  exitSearchMode: exitTerminalSearchMode,
  handleKeyPress,
  selectBranchByIndex,
  waitForContext,
} = useBranchSearch({
  searchTitle: 'Search for base branch:',
  cancelText: computed(() => `Use current ${baseBranch.value} branch`),
  createNewText: '', // No create new option for base branch selection
  searchOptionText: '', // No search option (we're already in selection mode)
  showBranchShortcuts: false, // Don't show numbered shortcuts in normal mode
  currentBranch: baseBranch, // Pass the current branch to filter it out
})
const branchName = ref('')
const isCreatingBranch = ref(false)
const branchCreationError = ref<string | undefined>()

// Track if we're in UI search mode (separate from terminal search mode)
const isUISearchMode = ref(false)

// Computed properties
const taskName = computed(() => {
  const task = getSelectedTask.value
  return task ? task.title.replace(/[^\w\s]/g, '').toLowerCase() : 'task'
})

const branchPrefix = computed(() => {
  const taskType = selectedTask.value
  const prefixMap: Record<string, string> = {
    'create-feature': 'feature',
    'fix-bug': 'bugfix',
    'improve-documentation': 'docs',
    'perform-maintenance': 'chore',
    'refactor-code': 'refactor',
  }
  return taskType ? prefixMap[taskType] || 'feature' : 'feature'
})

const fullBranchName = computed(() => {
  const storedBranch = getSelectedBranch.value

  // If we have a stored branch name, use it directly
  if (storedBranch && storedBranch.name) {
    return storedBranch.name
  }

  // Otherwise, construct from prefix and name
  const name = branchName.value || 'my-awesome-feature'
  return `${branchPrefix.value}/${name}`
})

// Helper functions for type-safe template access
const getItemKey = (item: unknown, index: number): string | number => {
  const branch = item as BranchInfo
  return branch.name || index
}

const getItemLabel = (item: unknown): string => {
  const branch = item as BranchInfo
  return branch.name
}

const getBranchName = (item: unknown): string => {
  const branch = item as BranchInfo
  return branch.name
}

const getBranchCommit = (item: unknown): string => {
  const branch = item as BranchInfo
  return branch.lastCommit
}

const getBranchUpdate = (item: unknown): Date => {
  const branch = item as BranchInfo
  return branch.lastUpdate
}

// Filter function that searches both branch name and commit message with priority sorting
const filterBranchesWithCommit = (
  items: unknown[],
  query: string
): unknown[] => {
  const branchItems = items as BranchInfo[]
  if (!query) return branchItems
  const lowerQuery = query.toLowerCase()

  // First filter matching items
  const matches = branchItems.filter((branch) => {
    return (
      branch.name.toLowerCase().includes(lowerQuery) ||
      branch.lastCommit.toLowerCase().includes(lowerQuery)
    )
  })

  // Then sort by relevance: name matches first, then commit matches
  return matches.sort((a, b) => {
    const aNameMatch = a.name.toLowerCase().includes(lowerQuery)
    const bNameMatch = b.name.toLowerCase().includes(lowerQuery)

    // If one matches by name and the other doesn't, name match comes first
    if (aNameMatch && !bNameMatch) return -1
    if (!aNameMatch && bNameMatch) return 1

    // If both match by name, check for exact/prefix matches
    if (aNameMatch && bNameMatch) {
      const aName = a.name.toLowerCase()
      const bName = b.name.toLowerCase()

      // Exact matches first
      const aExact = aName === lowerQuery
      const bExact = bName === lowerQuery
      if (aExact && !bExact) return -1
      if (!aExact && bExact) return 1

      // Then prefix matches
      const aPrefix = aName.startsWith(lowerQuery)
      const bPrefix = bName.startsWith(lowerQuery)
      if (aPrefix && !bPrefix) return -1
      if (!aPrefix && bPrefix) return 1

      // Finally alphabetical
      return aName.localeCompare(bName)
    }

    // Both only match in commit message - alphabetical by name
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase())
  })
}

const canCreateBranch = computed(() => {
  // Validate branch name and check that we're not currently creating
  if (isCreatingBranch.value) return false
  if (!fullBranchName.value) return false

  const validation = validateBranchName(fullBranchName.value)
  return validation.isValid
})

// Methods
const enterSearchMode = async () => {
  isUISearchMode.value = true
  searchQuery.value = ''

  // Enter terminal search mode too
  enterTerminalSearchMode()

  // Note: We don't blur inputs here anymore because:
  // 1. The terminal handles keyboard input through Electron IPC
  // 2. Blurring might trigger unwanted focus events that hide the terminal

  // Update terminal messages
  updateMessages(
    branches.value,
    isLoadingBranches.value,
    searchQuery.value,
    filteredBranches.value
  )
}

const exitSearchMode = () => {
  isUISearchMode.value = false
  searchQuery.value = ''
  clearSearch()
  exitTerminalSearchMode()
  updateMessages(branches.value, isLoadingBranches.value, '', branches.value)
}

const selectBranch = (branch: string | BranchInfo) => {
  // Handle both string and BranchInfo object
  const branchName = typeof branch === 'string' ? branch : branch.name

  // If clicking on the already selected branch, just exit search mode
  if (branchName === baseBranch.value) {
    exitSearchMode()
    return
  }

  baseBranch.value = branchName
  exitSearchMode()
}

const handleBranchItemClick = (item: unknown) => {
  selectBranch(item as string | BranchInfo)
}

// Update search with debouncing
const updateSearchDebounced = (query?: string) => {
  const currentQuery = query !== undefined ? query : searchQuery.value
  console.log(
    '[BranchCreation] updateSearchDebounced called with query:',
    currentQuery
  )

  if (query !== undefined) {
    searchQuery.value = query
  }

  filterBranches(currentQuery)
  updateMessages(
    branches.value,
    isLoadingBranches.value,
    currentQuery,
    filteredBranches.value
  )
}

// Handle branch selection by index from terminal
const handleBranchSelection = (index: number) => {
  console.log(
    '[BranchCreation] handleBranchSelection called with index:',
    index
  )
  selectBranchByIndex(
    index,
    branches.value,
    filteredBranches.value,
    selectBranch
  )
}

const goBackToTaskDetail = () => {
  // Go back to task detail step to allow editing task name
  goToStep('task-detail')
}

// Helper to load branches and update terminal
const loadBranchesWithTerminal = async () => {
  await loadBranches(selectedProject.value?.path)

  // Set default base branch
  const preferredBases = ['main', 'master', 'develop', 'development']
  const branchNames = branches.value.map((b) => b.name)

  // Find the best default branch
  const defaultBranch =
    branchNames.find((b) => preferredBases.includes(b)) ||
    branchNames[0] ||
    'main'
  baseBranch.value = defaultBranch

  // Update terminal messages once branches are loaded
  if (window.currentContext && !isLoadingBranches.value) {
    updateMessages(
      branches.value,
      isLoadingBranches.value,
      searchQuery.value,
      filteredBranches.value
    )
  }
}

const createBranch = async () => {
  if (!canCreateBranch.value || !selectedProject.value?.path) return

  // Clear any previous errors
  branchCreationError.value = undefined
  isCreatingBranch.value = true

  try {
    console.log('[BranchCreation] Creating branch:', {
      name: fullBranchName.value,
      base: baseBranch.value,
      project: selectedProject.value.path,
    })

    // Use the new gitCreateBranch IPC method
    const result = await window.electronAPI.gitCreateBranch(
      selectedProject.value.path,
      fullBranchName.value,
      baseBranch.value
    )

    if (result.success) {
      console.log(
        '[BranchCreation] Branch created successfully:',
        result.message
      )

      // Move to next step
      nextStep()
    } else {
      branchCreationError.value = result.error || 'Failed to create branch'
      console.error('[BranchCreation] Branch creation failed:', result.error)
    }
  } catch (error) {
    console.error('[BranchCreation] Error creating branch:', error)
    branchCreationError.value =
      error instanceof Error ? error.message : 'Failed to create branch'
  } finally {
    isCreatingBranch.value = false
  }
}

// Keyboard handler that integrates with terminal composable
const handleKeyPressIntegration = (event: KeyboardEvent) => {
  console.log(
    '[BranchCreation] handleKeyPress called with key:',
    event.key,
    'isSearchMode:',
    isSearchMode.value
  )

  // Allow system shortcuts to pass through
  if (event.metaKey || event.ctrlKey) {
    return
  }

  // Only prevent default for keys we handle in search mode
  if (isSearchMode.value) {
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

    if (event.key.length === 1 || handledKeys.includes(event.key)) {
      event.preventDefault()
      event.stopPropagation()
    }

    // Special handling for Escape to also exit UI search mode
    if (event.key === 'Escape') {
      exitSearchMode()
      return
    }
  }

  // Pass to terminal handler
  handleKeyPress(
    event,
    searchQuery,
    branches.value,
    updateSearchDebounced,
    handleBranchSelection
  )
}

// Event handlers for terminal integration
const handleEnterBranchSearch = () => {
  console.log('[BranchCreation] Terminal requested branch search mode')
  enterSearchMode()
}

const handleSelectBranch = (event: unknown) => {
  console.log('[BranchCreation] Received terminal-select-branch event:', event)
  const customEvent = event as { detail?: { index?: number } }
  const index = customEvent.detail?.index
  if (typeof index === 'number') {
    handleBranchSelection(index)
  }
}

// Watch for loading state changes to update terminal
watch(isLoadingBranches, (newValue, oldValue) => {
  if (newValue !== oldValue) {
    console.log(
      '[BranchCreation] Loading state changed:',
      oldValue,
      '->',
      newValue
    )
    updateMessages(
      branches.value,
      isLoadingBranches.value,
      searchQuery.value,
      filteredBranches.value
    )
  }
})

// Watch terminal search mode to ensure input stays unfocused
watch(isSearchMode, (isInSearchMode) => {
  if (isInSearchMode) {
    nextTick(() => {
      const inputs = document.querySelectorAll('input')
      inputs.forEach((input) => {
        ;(input as HTMLElement).blur()
      })
    })
  }
})

// Load branches when component mounts
onMounted(async () => {
  console.log('[BranchCreation] Component mounted, loading branches...')

  // Load branches in parallel with waiting for terminal
  await Promise.all([loadBranchesWithTerminal(), waitForContext()])

  // Update terminal messages after both branches and context are ready
  updateMessages(
    branches.value,
    isLoadingBranches.value,
    searchQuery.value,
    filteredBranches.value
  )

  // Listen for terminal events
  window.addEventListener(
    'terminal-enter-branch-search',
    handleEnterBranchSearch
  )
  window.addEventListener('terminal-select-branch', handleSelectBranch)

  // Listen for keyboard events - use capture to intercept before input
  window.addEventListener('keydown', handleKeyPressIntegration, true)
})

onUnmounted(() => {
  // Clean up event listeners
  window.removeEventListener(
    'terminal-enter-branch-search',
    handleEnterBranchSearch
  )
  window.removeEventListener('terminal-select-branch', handleSelectBranch)
  window.removeEventListener('keydown', handleKeyPressIntegration, true)
})
</script>

<style scoped>
/* Original styles for normal mode */
.branch-creation-step {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(
    135deg,
    var(--bg-primary) 0%,
    var(--bg-secondary) 100%
  );
}

.step-container {
  width: 100%;
  max-width: 1100px;
  padding: 32px;
}

/* Header Section */
.step-header {
  text-align: center;
  margin-bottom: 48px;
}

.step-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 12px 0;
  letter-spacing: -0.02em;
}

.step-description {
  font-size: 16px;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
}

/* Two Column Layout */
.step-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
  align-items: start;
}

/* Left Column */
.left-column,
.right-column {
  height: 100%;
}

.column-content {
  padding: 0;
  height: 100%;
}

.column-title {
  font-size: 22px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 24px 0;
}

/* Workflow Steps */
.workflow-steps {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 24px;
}

.workflow-step {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.step-number {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--accent-primary);
  color: var(--bg-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  flex-shrink: 0;
  font-size: 14px;
}

/* Ensure proper contrast in both light and dark modes */
:root[data-theme='dark'] .step-number {
  color: #000000; /* Black text on golden background in dark mode */
}

:root[data-theme='light'] .step-number {
  color: #ffffff; /* White text on golden background in light mode */
}

.step-text {
  flex: 1;
}

.step-text .step-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 4px 0;
}

/* Ensure white text in dark mode for step titles */
:root[data-theme='dark'] .step-text .step-title {
  color: #ffffff;
}

.step-text .step-description {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
}

.workflow-hint {
  font-size: 13px;
  color: var(--text-tertiary);
  font-style: italic;
  margin: 0;
}

/* Form Groups */
.form-group {
  margin-bottom: 24px;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.branch-display-button,
.branch-selector-button {
  width: 100%;
  padding: 12px 16px;
  background: var(--bg-primary);
  border: 1px solid var(--border-secondary);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.branch-display-button:hover,
.branch-selector-button:hover {
  border-color: var(--accent-primary);
  background: var(--bg-secondary);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.branch-display-content,
.branch-selector-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.branch-icon-display,
.branch-icon-selector {
  color: var(--text-secondary);
}

.branch-name-display,
.branch-name-selector {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  flex: 1;
}

.search-icon-hint {
  color: var(--text-tertiary);
  opacity: 0.6;
}

.branch-selector-button:hover .search-icon-hint {
  opacity: 1;
  color: var(--accent-primary);
}

.form-hint {
  font-size: 12px;
  color: var(--text-tertiary);
  margin: 8px 0 0 0;
}

.form-error {
  font-size: 13px;
  color: var(--error-color, #ef4444);
  margin: 8px 0 0 0;
}

/* Action Section */
.action-section {
  margin-top: 32px;
}

.spinner {
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

/* Search Mode Styles */
.search-mode-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  gap: 32px;
}

.search-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  max-width: 900px;
  width: 100%;
}

/* Search Section */
.search-section {
  padding: 24px 0;
}

.search-container {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 16px;
  color: var(--text-tertiary);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 14px 48px 14px 48px;
  background: var(--bg-secondary);
  border: 2px solid var(--border-secondary);
  border-radius: 12px;
  font-size: 16px;
  color: var(--text-primary);
  outline: none;
  transition: all 0.2s ease;
}

.search-input:focus {
  border-color: var(--accent-primary);
  background: var(--bg-tertiary);
  box-shadow: 0 0 0 3px rgba(var(--accent-primary-rgb), 0.1);
}

.search-clear {
  position: absolute;
  right: 16px;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: color 0.2s ease;
}

.search-clear:hover {
  color: var(--text-primary);
}

/* Branches Content Area */
.branches-content-area {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
  margin-bottom: 24px;
}

.loading-branches {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: var(--text-secondary);
  gap: 16px;
}

.loading-icon {
  animation: spin 1s linear infinite;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  margin: 0 0 12px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.branch-count {
  color: var(--text-tertiary);
  font-weight: 400;
}

.branches-list-container {
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-secondary);
}

.branches-list {
  max-height: 400px;
  overflow-y: auto;
}

.branch-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid var(--border-primary);
  transition: all 0.15s ease;
}

.branch-item:last-child {
  border-bottom: none;
}

.branch-item:hover,
.branch-item.branch-highlighted {
  background: var(--bg-tertiary);
}

.branch-item.branch-selected {
  background: var(--accent-primary-alpha);
}

.branch-main {
  flex: 1;
}

.branch-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.branch-icon {
  color: var(--text-tertiary);
}

.branch-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
}

.branch-commit {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 4px 0 0 0;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.branch-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.branch-date {
  font-size: 12px;
  color: var(--text-tertiary);
  white-space: nowrap;
}

.branch-selected-indicator {
  color: var(--accent-primary);
}

.no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  gap: 16px;
}

.no-results-icon {
  color: var(--text-tertiary);
  opacity: 0.5;
}

.no-results-text {
  font-size: 16px;
  color: var(--text-secondary);
  margin: 0;
}

/* Responsive Design */
@media (max-width: 768px) {
  .step-content {
    grid-template-columns: 1fr;
    gap: 32px;
  }

  .step-title {
    font-size: 24px;
  }

  .step-description {
    font-size: 15px;
  }
}

@media (max-width: 480px) {
  .step-title {
    font-size: 22px;
  }
}
</style>
