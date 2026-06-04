<template>
  <div class="onboarding-task-selection">
    <div class="selection-container">
      <div class="selection-content">
        <!-- Header Section -->
        <div class="selection-header">
          <h1 class="selection-title">Define Your Task</h1>
          <p class="selection-subtitle">
            Select your work's intent to tailor the AI assistance.
          </p>
        </div>

        <!-- Task Options Grid -->
        <div class="tasks-grid">
          <OnboardingTaskCard
            v-for="(task, index) in ONBOARDING_TASKS"
            :key="task?.id || ''"
            :task="task"
            :is-selected="selectedTask === task.id"
            :is-bottom-row="getIsBottomRow(index)"
            @select="handleTaskSelect"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useOnboarding } from '../../composables/useOnboarding'
import type { OnboardingTask } from '../../composables/useOnboarding'
import OnboardingTaskCard from '../molecules/OnboardingTaskCard.vue'

const { selectedTask, nextStep, selectTask, ONBOARDING_TASKS } = useOnboarding()

const handleTaskSelect = (taskId: OnboardingTask): void => {
  selectTask(taskId)
  // Navigate to next step immediately when task is selected
  nextStep()
}

const handleTaskSelectFromTerminal = (taskId: OnboardingTask): void => {
  // Only select the task, don't navigate - terminal will handle navigation
  selectTask(taskId)
}

// Handle terminal task selection events
const handleTerminalTaskSelect = (event: CustomEvent<{ taskId?: string }>) => {
  console.log('[OnboardingTaskSelection] Terminal task selected:', event.detail)

  // Check if detail and taskId exist
  if (!event.detail?.taskId) {
    return
  }

  // Task IDs now match directly, no mapping needed
  const taskId = event.detail.taskId as OnboardingTask
  if (ONBOARDING_TASKS.some((t) => t.id === taskId)) {
    handleTaskSelectFromTerminal(taskId)
  }
}

// Determine if a task card is in the bottom row
const getIsBottomRow = (index: number): boolean => {
  const totalTasks = ONBOARDING_TASKS.length
  const isEven = totalTasks % 2 === 0

  if (isEven) {
    // If even number of tasks, last 2 cards are in bottom row
    return index >= totalTasks - 2
  } else {
    // If odd number of tasks, only the last card is in bottom row
    return index === totalTasks - 1
  }
}

onMounted(() => {
  // Type assertion needed for custom event handler
  window.addEventListener(
    'terminal-select-task',
    handleTerminalTaskSelect as EventListener
  )
})

onUnmounted(() => {
  // Type assertion needed for custom event handler
  window.removeEventListener(
    'terminal-select-task',
    handleTerminalTaskSelect as EventListener
  )
})
</script>

<style scoped>
.onboarding-task-selection {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.selection-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 0;
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  animation: fade-in-up 0.8s ease-out;
}

.selection-content {
  background-color: transparent;
  padding: 0;
}

.selection-header {
  text-align: center;
  margin-bottom: 40px;
}

.selection-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 12px;
  letter-spacing: -0.02em;
}

.selection-subtitle {
  font-size: 16px;
  color: var(--text-secondary);
  max-width: 500px;
  margin: 0 auto;
  line-height: 1.5;
}

.tasks-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  overflow: visible;
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
  .onboarding-task-selection {
    padding: 16px;
  }

  .selection-content {
    padding: 32px 24px;
  }

  .selection-title {
    font-size: 24px;
  }

  .selection-subtitle {
    font-size: 15px;
  }

  .tasks-grid {
    gap: 12px;
    margin-bottom: 32px;
    max-height: 300px;
  }

  .tasks-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}

@media (max-width: 480px) {
  .selection-content {
    padding: 24px 20px;
  }

  .selection-title {
    font-size: 22px;
  }

  .tasks-grid {
    gap: 16px;
  }
}
</style>
