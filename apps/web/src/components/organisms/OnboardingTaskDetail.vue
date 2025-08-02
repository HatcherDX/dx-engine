<template>
  <div class="onboarding-task-detail">
    <div class="detail-container">
      <div class="detail-content">
        <!-- Header Section -->
        <div class="detail-header">
          <div class="task-info">
            <div class="task-icon">
              {{ selectedTask?.title.split(' ')[0] }}
            </div>
            <div class="task-meta">
              <h1 class="task-title">
                {{ selectedTask?.title.substring(2).trim() }}
              </h1>
              <p class="task-description">{{ selectedTask?.description }}</p>
              <p class="example-text">e.g., {{ selectedTask?.example }}</p>
            </div>
          </div>
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
              type="text"
              class="task-input"
              placeholder="e.g., Add User Login"
              @input="updateSlugFromName"
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
              placeholder="feature/add-user-login"
            />
          </div>
        </div>

        <!-- Action Section -->
        <div class="action-section">
          <CtaButton :disabled="!canStartBuilding" @click="handleStartBuilding">
            Start Building
          </CtaButton>
        </div>

        <!-- Navigation Section -->
        <div class="navigation-section">
          <BaseButton
            variant="ghost"
            size="md"
            class="back-button"
            @click="handleBack"
          >
            <BaseIcon name="ArrowRight" size="sm" class="back-icon" />
            Change Task Type
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useOnboarding } from '../../composables/useOnboarding'
import BaseButton from '../atoms/BaseButton.vue'
import BaseIcon from '../atoms/BaseIcon.vue'
import CtaButton from '../atoms/CtaButton.vue'

const { getSelectedTask, nextStep, previousStep } = useOnboarding()

// Get the selected task
const selectedTask = computed(() => getSelectedTask.value)

// Form state
const taskName = ref('')
const fullBranchName = ref('')

// Computed properties
const canStartBuilding = computed(() => {
  return (
    taskName.value.trim().length > 0 && fullBranchName.value.trim().length > 0
  )
})

// Convert task name to slug format
const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Update branch name when task name changes
const updateSlugFromName = (): void => {
  if (taskName.value) {
    fullBranchName.value = `feature/${slugify(taskName.value)}`
  }
}

// Initialize with example if task is "Create Feature"
watch(
  selectedTask,
  (task) => {
    if (task?.id === 'create-feature') {
      taskName.value = 'Add User Login'
      fullBranchName.value = 'feature/add-user-login'
    }
  },
  { immediate: true }
)

// Event handlers
const handleStartBuilding = (): void => {
  // TODO: Store task details and proceed to next step
  nextStep()
}

const handleBack = (): void => {
  // Clear form data when going back
  taskName.value = ''
  fullBranchName.value = ''
  previousStep()
}
</script>

<style scoped>
.onboarding-task-detail {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(
    135deg,
    var(--bg-primary) 0%,
    var(--bg-secondary) 100%
  );
  padding: 24px;
}

.detail-container {
  max-width: 700px;
  width: 100%;
  animation: fade-in-up 0.8s ease-out;
}

.detail-content {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(8px);
}

.dark .detail-content {
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

/* Header Section */
.detail-header {
  margin-bottom: 32px;
}

.task-info {
  display: flex;
  align-items: flex-start;
  gap: 20px;
}

.task-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  font-size: 36px;
  flex-shrink: 0;
}

.task-meta {
  flex: 1;
}

.task-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
  line-height: 1.3;
}

.task-description {
  font-size: 16px;
  color: var(--text-secondary);
  line-height: 1.4;
  margin-bottom: 8px;
}

.example-text {
  font-size: 13px;
  color: var(--text-tertiary);
  font-style: italic;
  margin: 0;
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

/* Action Section */
.action-section {
  display: flex;
  justify-content: center;
  margin-bottom: 32px;
}

/* Navigation */
.navigation-section {
  display: flex;
  justify-content: flex-start;
}

.back-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
}

.back-icon {
  transform: rotate(180deg);
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
    font-size: 32px;
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
