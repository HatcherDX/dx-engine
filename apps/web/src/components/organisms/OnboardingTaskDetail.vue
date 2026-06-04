<template>
  <div class="onboarding-task-detail">
    <div class="detail-container">
      <div class="detail-content">
        <!-- Header Section -->
        <div class="detail-header">
          <h1 class="task-title">
            {{ selectedTask?.title || '' }}
          </h1>
          <p class="task-description">{{ selectedTask?.description || '' }}</p>
        </div>

        <!-- Input Section -->
        <div class="input-section">
          <h2 class="section-title">Let's set up your task</h2>

          <!-- Task Name Input -->
          <div class="input-group">
            <label class="input-label" for="task-name">Task Name</label>
            <input
              id="task-name"
              v-model="taskName"
              v-disable-terminal
              type="text"
              class="task-input"
              :placeholder="taskNamePlaceholder"
              @input="
                () => {
                  updateSlugFromName()
                  syncToBridge()
                }
              "
            />
          </div>

          <!-- Branch Name Input -->
          <div class="input-group">
            <label class="input-label" for="branch-name">Branch Name</label>
            <input
              id="branch-name"
              v-model="fullBranchName"
              type="text"
              class="task-input branch-input"
              :class="{ 'has-error': branchValidationError }"
              :placeholder="branchPlaceholder"
              :readonly="!isBranchNameEditable"
              @click="isBranchNameEditable = true"
              @blur="isBranchNameEditable = false"
              @input="
                () => {
                  isCustomBranch = true
                  validateBranch(fullBranchName)
                  syncToBridge()
                }
              "
            />
            <span v-if="branchValidationError" class="error-message">
              {{ branchValidationError }}
            </span>
          </div>
        </div>

        <!-- Action Section -->
        <div class="action-section">
          <CtaButton
            v-disable-terminal
            :disabled="!canStartBuilding"
            @click="handleStartBuilding"
          >
            Start Building
          </CtaButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useOnboarding } from '../../composables/useOnboarding'
import {
  terminalInputBridge,
  type TaskDetails,
} from '../../composables/useTerminalInputBridge'
import { validateBranchName } from '../../utils/gitValidation'
import CtaButton from '../atoms/CtaButton.vue'

const {
  getSelectedTask,
  getSelectedBranch,
  nextStep,
  selectBranch,
  currentStep,
} = useOnboarding()

// Get the selected task
const selectedTask = computed(() => getSelectedTask.value)

// Get reactive task details from bridge
const { taskName: bridgeTaskName } = terminalInputBridge.useTaskDetails()

// Form state - initialize from bridge or empty
const taskName = ref(bridgeTaskName.value || '')
const fullBranchName = ref('')
const isBranchNameEditable = ref(false)
const isCustomBranch = ref(false)
const branchValidationError = ref<string | undefined>()

// Flag to prevent feedback loops
const isUpdatingFromBridge = ref(false)

// Unsubscribe function for bridge listener
let unsubscribe: (() => void) | null = null

// Computed properties
const canStartBuilding = computed(() => {
  return (
    taskName.value.trim().length > 0 &&
    fullBranchName.value.trim().length > 0 &&
    !branchValidationError.value
  )
})

const taskNamePlaceholder = computed(() => {
  if (!selectedTask.value) return 'e.g., Add User Login'

  const placeholderMap: Record<string, string> = {
    'create-feature': 'e.g., Add User Login',
    'fix-bug': 'e.g., Fix Login Button on Safari',
    'improve-documentation': 'e.g., Update API Documentation',
    'perform-maintenance': 'e.g., Update Dependencies',
    'refactor-code': 'e.g., Extract Authentication Logic',
  }

  const taskId = selectedTask.value.id
  return taskId
    ? placeholderMap[taskId] || 'e.g., Your task name'
    : 'e.g., Your task name'
})

const branchPlaceholder = computed(() => {
  const taskId = selectedTask.value?.id
  const prefix = getBranchPrefix(taskId ?? undefined)
  const placeholderMap: Record<string, string> = {
    feature: 'feature/add-user-login',
    bugfix: 'bugfix/fix-login-button',
    docs: 'docs/update-readme',
    chore: 'chore/update-dependencies',
    refactor: 'refactor/extract-component',
  }
  return placeholderMap[prefix] || 'feature/your-task-name'
})

// Convert task name to slug format
const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Converts a branch name slug back to a human-readable task name.
 *
 * @param branchName - The full branch name (e.g., "feature/add-user-login")
 * @returns Human-readable task name (e.g., "Add User Login")
 *
 * @remarks
 * This function is used when navigating back from branch creation to task detail,
 * allowing the user to see and edit their previously entered task name.
 *
 * @public
 * @since 1.0.0
 */
const extractTaskNameFromBranch = (branchName: string): string => {
  // Extract the slug part after the prefix
  const parts = branchName.split('/')
  if (parts.length < 2) return ''

  const slug = parts[1]

  // Convert slug to title case: "add-user-login" → "Add User Login"
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// Get branch prefix based on task type
const getBranchPrefix = (taskId: string | undefined): string => {
  if (!taskId) return 'feature'

  const prefixMap: Record<string, string> = {
    'create-feature': 'feature',
    'fix-bug': 'bugfix',
    'improve-documentation': 'docs',
    'perform-maintenance': 'chore',
    'refactor-code': 'refactor',
  }

  return prefixMap[taskId] || 'feature'
}

/**
 * Loads existing data from the selected branch configuration.
 *
 * @remarks
 * This function is called when the component mounts or when the task changes,
 * to restore previously entered data when navigating back from later steps.
 *
 * @public
 * @since 1.0.0
 */
const loadExistingData = (): void => {
  const existingBranch = getSelectedBranch.value

  if (existingBranch?.name) {
    console.log('[TaskDetail] Loading existing branch data:', existingBranch)

    // Extract task name from branch name
    const extractedTaskName = extractTaskNameFromBranch(existingBranch.name)
    if (extractedTaskName) {
      taskName.value = extractedTaskName
      fullBranchName.value = existingBranch.name
      console.log('[TaskDetail] Loaded task name:', extractedTaskName)
    }
  }
}

// Update branch name when task name changes (only if not custom branch)
const updateSlugFromName = (): void => {
  if (!isCustomBranch.value && selectedTask.value) {
    if (taskName.value) {
      const taskId = selectedTask.value.id
      const prefix = getBranchPrefix(taskId ?? undefined)
      const proposedBranch = `${prefix}/${slugify(taskName.value)}`
      fullBranchName.value = proposedBranch
      validateBranch(proposedBranch)
    } else {
      // Clear branch name when task name is empty
      fullBranchName.value = ''
      branchValidationError.value = undefined
    }
  }
}

// Validate branch name
const validateBranch = (branchName: string): void => {
  if (!branchName) {
    branchValidationError.value = undefined
    return
  }

  const validation = validateBranchName(branchName)
  if (!validation.isValid) {
    branchValidationError.value = validation.error
    // If there's a suggestion, we could optionally apply it
    // For now, we'll just show the error
  } else {
    branchValidationError.value = undefined
  }
}

// Load existing data when component mounts
onMounted(() => {
  console.log('[TaskDetail] Component mounted, loading existing data')
  loadExistingData()

  // Subscribe to terminal input bridge updates
  unsubscribe = terminalInputBridge.subscribe((details: TaskDetails) => {
    console.log('[TaskDetail] Bridge update:', details)

    // Set flag to prevent feedback loop
    isUpdatingFromBridge.value = true

    // Update task name from bridge
    taskName.value = details.taskName

    // Handle branch name
    if (details.branchName === null) {
      // null means auto-generate based on task name
      isCustomBranch.value = false
      updateSlugFromName()
    } else if (details.branchName === '') {
      // Empty string means clear (when task name is also empty)
      isCustomBranch.value = false
      isBranchNameEditable.value = false
      fullBranchName.value = ''
    } else {
      // Custom branch name provided
      isCustomBranch.value = true
      isBranchNameEditable.value = true

      // Construct full branch name with prefix if needed
      if (!details.branchName.includes('/')) {
        const taskId = selectedTask.value?.id
        const prefix = getBranchPrefix(taskId ?? undefined)
        fullBranchName.value = `${prefix}/${details.branchName}`
      } else {
        fullBranchName.value = details.branchName
      }

      // Validate the custom branch name
      validateBranch(fullBranchName.value)
    }

    // Clear flag after Vue's next tick to ensure DOM updates are complete
    nextTick(() => {
      isUpdatingFromBridge.value = false
    })
  })
})

// Watch for navigation to this step to load existing data
watch(currentStep, (newStep) => {
  if (newStep === 'task-detail') {
    console.log(
      '[TaskDetail] Navigated to task-detail step, loading existing data'
    )
    loadExistingData()
  }
})

// Handle task changes intelligently (without immediate to allow onMounted to run first)
watch(selectedTask, (newTask, oldTask) => {
  if (!newTask) return

  // Only clear form if the task actually changed
  if (oldTask && newTask.id !== oldTask.id) {
    console.log('[TaskDetail] Task changed, clearing form')
    taskName.value = ''
    fullBranchName.value = ''
  } else if (!oldTask) {
    console.log('[TaskDetail] Initial task load, checking for existing data')
    // On initial load, try to load existing data if available
    loadExistingData()
  }
})

// Sync input field changes back to bridge when user types in the form
const syncToBridge = () => {
  // Don't sync if we're updating from bridge to prevent feedback loop
  if (isUpdatingFromBridge.value) {
    console.log(
      '[TaskDetail] Skipping sync to bridge - update came from bridge'
    )
    return
  }

  // Construct the input string for the bridge
  let inputString = taskName.value

  if (isCustomBranch.value && fullBranchName.value) {
    // Extract just the branch slug part if it has a prefix
    const parts = fullBranchName.value.split('/')
    const branchSlug = parts.length > 1 ? parts[1] : fullBranchName.value
    inputString += ` | ${branchSlug}`
  }

  // Update the bridge (which will trigger terminal display update)
  terminalInputBridge.updateInput(inputString, inputString.length)
}

// Event handlers
const handleStartBuilding = (): void => {
  // Store branch configuration
  selectBranch({
    name: fullBranchName.value,
    base: 'main', // Default base branch
    agent: 'default', // Default agent
  })

  // Proceed to next step
  nextStep()
}

// Cleanup bridge subscription
onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe()
  }
})
</script>

<style scoped>
.onboarding-task-detail {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.detail-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  animation: fade-in-up 0.8s ease-out;
}

.detail-content {
  background-color: transparent;
  padding: 0;
}

/* Header Section */
.detail-header {
  text-align: center;
  margin-bottom: 48px;
}

.task-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 12px 0;
}

.task-description {
  font-size: 16px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0 0 12px 0;
}

/* Input Section */
.input-section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 24px;
}

.input-group {
  margin-bottom: 20px;
}

.input-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.task-input {
  width: 100%;
  padding: 12px 16px;
  font-size: 16px;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-secondary);
  border-radius: 8px;
  color: var(--text-primary);
  transition: all var(--transition-fast);
  outline: none;
}

.task-input:focus {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px rgba(var(--accent-primary-rgb), 0.1);
}

.task-input::placeholder {
  color: var(--text-tertiary);
}

.branch-input {
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-size: 14px;
}

.branch-input[readonly] {
  background-color: var(--bg-secondary);
  cursor: pointer;
  user-select: none;
}

.branch-input[readonly]:hover {
  background-color: var(--bg-tertiary);
}

.task-input.has-error {
  border-color: var(--error-color, #dc3545);
}

.task-input.has-error:focus {
  box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.1);
}

.error-message {
  display: block;
  margin-top: 4px;
  font-size: 13px;
  color: var(--error-color, #dc3545);
  line-height: 1.4;
}

.input-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 8px;
  pointer-events: none;
}

/* Action Section */
.action-section {
  display: flex;
  justify-content: center;
}

/* Animations */
@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive Design */
@media (max-width: 768px) {
  .onboarding-task-detail {
    padding: 16px;
  }

  .detail-content {
    padding: 32px 24px;
  }

  .task-info {
    gap: 16px;
  }

  .task-icon {
    width: 56px;
    height: 56px;
  }

  .task-title {
    font-size: 20px;
  }
}

@media (max-width: 480px) {
  .detail-content {
    padding: 24px 20px;
  }

  .task-title {
    font-size: 18px;
  }
}
</style>
