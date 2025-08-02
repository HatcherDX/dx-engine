<template>
  <div class="onboarding-task-selection">
    <div class="selection-container">
      <div class="selection-content">
        <!-- Header Section -->
        <div class="selection-header">
          <h1 class="selection-title">Choose Your First Task</h1>
          <p class="selection-subtitle">
            What type of work are you planning to do? This helps Hatcher provide
            the most relevant assistance for your workflow.
          </p>
        </div>

        <!-- Task Cards Grid -->
        <div class="tasks-grid">
          <OnboardingTaskCard
            v-for="task in ONBOARDING_TASKS"
            :key="task?.id || ''"
            :task="task"
            :is-selected="selectedTask === task.id"
            @select="handleTaskSelect"
          />
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
            Projects
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useOnboarding } from '../../composables/useOnboarding'
import type { OnboardingTask } from '../../composables/useOnboarding'
import BaseButton from '../atoms/BaseButton.vue'
import BaseIcon from '../atoms/BaseIcon.vue'
import OnboardingTaskCard from '../molecules/OnboardingTaskCard.vue'

const { selectedTask, nextStep, previousStep, selectTask, ONBOARDING_TASKS } =
  useOnboarding()

const handleTaskSelect = (taskId: OnboardingTask): void => {
  selectTask(taskId)
  // Navigate to next step immediately when task is selected
  nextStep()
}

const handleBack = (): void => {
  previousStep()
}
</script>

<style scoped>
.onboarding-task-selection {
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

.selection-container {
  max-width: 1000px;
  width: 100%;
  animation: fade-in-up 0.8s ease-out;
}

.selection-content {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(8px);
}

.dark .selection-content {
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
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
  margin-bottom: 40px;
  overflow: visible;
}

.navigation-section {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 16px;
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
