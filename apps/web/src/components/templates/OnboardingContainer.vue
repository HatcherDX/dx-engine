<template>
  <div class="onboarding-container">
    <!-- Progress Bar -->
    <OnboardingProgress
      :current-step="currentStepIndex"
      :total-steps="totalSteps"
      :steps="stepDefinitions"
      @go-to-step="handleGoToStep"
    />

    <!-- Main Content Area -->
    <div class="onboarding-content">
      <Transition :name="transitionName" mode="out-in">
        <component
          :is="currentStepComponent"
          :key="currentStep"
          @next="handleNextStep"
          @previous="handlePreviousStep"
          @complete="handleComplete"
        />
      </Transition>
    </div>

    <!-- Terminal Easter Egg -->
    <TerminalEasterEgg
      :current-step="currentStep"
      @command="handleTerminalCommand"
      @close="handleTerminalClose"
    />

    <!-- Footer removed - now handled by UnifiedFrame -->
  </div>
</template>

<script setup lang="ts">
import { computed, ref, type Component } from 'vue'
import { useOnboarding } from '../../composables/useOnboarding'
import OnboardingProgress from '../organisms/OnboardingProgress.vue'

// Import step components
import OnboardingWelcome from '../organisms/OnboardingWelcome.vue'
import OnboardingProjectSelection from '../organisms/OnboardingProjectSelection.vue'
import OnboardingTaskSelector from '../organisms/OnboardingTaskSelector.vue'
import OnboardingTaskSelection from '../organisms/OnboardingTaskSelection.vue'
import OnboardingBranchCreation from '../organisms/OnboardingBranchCreation.vue'
import OnboardingTaskDetail from '../organisms/OnboardingTaskDetail.vue'
import OnboardingTransition from '../organisms/OnboardingTransition.vue'
import TerminalEasterEgg from '../molecules/TerminalEasterEgg.vue'

// Define props
interface Props {
  onComplete?: () => void
}

const props = withDefaults(defineProps<Props>(), {
  onComplete: undefined,
})

// Use onboarding composable
const {
  currentStep,
  nextStep,
  previousStep,
  completeOnboarding,
  goToStep,
  isCreatingNewTask,
} = useOnboarding()

// Track navigation direction for animations
const isNavigatingForward = ref(true)

// Dynamic step definitions based on task creation flow
const stepDefinitions = computed(() => {
  const baseSteps = [
    { id: 'welcome', label: 'Welcome', icon: 'Home' },
    { id: 'project-selection', label: 'Select Project', icon: 'Folder' },
    { id: 'task-selector', label: 'Select Task', icon: 'Target' },
  ]

  const newTaskSteps = [
    { id: 'task-selection', label: 'Create Task', icon: 'Plus' },
    { id: 'task-detail', label: 'Task Details', icon: 'FileText' },
    { id: 'branch-creation', label: 'Create Branch', icon: 'GitBranch' },
  ]

  const finalStep = [{ id: 'transition', label: 'Get Started', icon: 'Rocket' }]

  // Check if we're currently in or past any of the task creation steps
  const taskCreationSteps = [
    'task-selection',
    'task-detail',
    'branch-creation',
    'transition',
  ]
  const isInTaskCreationFlow =
    taskCreationSteps.includes(currentStep.value) || isCreatingNewTask.value

  // Show all steps if we're in the task creation flow, or if we've created a task
  if (isInTaskCreationFlow) {
    return [...baseSteps, ...newTaskSteps, ...finalStep]
  } else {
    return [...baseSteps, ...finalStep]
  }
})

// Component mapping
const stepComponents: Record<string, Component> = {
  welcome: OnboardingWelcome,
  'project-selection': OnboardingProjectSelection,
  'task-selector': OnboardingTaskSelector,
  'task-selection': OnboardingTaskSelection,
  'task-detail': OnboardingTaskDetail,
  'branch-creation': OnboardingBranchCreation,
  transition: OnboardingTransition,
}

// Computed properties
const currentStepComponent = computed(() => {
  return stepComponents[currentStep.value] || OnboardingWelcome
})

const currentStepIndex = computed(() => {
  return stepDefinitions.value.findIndex(
    (step) => step.id === currentStep.value
  )
})

const totalSteps = computed(() => stepDefinitions.value.length)

// Dynamic transition name based on direction
const transitionName = computed(() =>
  isNavigatingForward.value ? 'step-forward' : 'step-backward'
)

// Methods
const handleNextStep = () => {
  isNavigatingForward.value = true
  nextStep()
}

const handlePreviousStep = () => {
  isNavigatingForward.value = false
  previousStep()
}

const handleGoToStep = (stepIndex: number) => {
  const currentIndex = currentStepIndex.value
  isNavigatingForward.value = stepIndex > currentIndex

  const targetStep = stepDefinitions.value[stepIndex]?.id
  if (targetStep) {
    goToStep(targetStep as Parameters<typeof goToStep>[0])
  }
}

// Skip functionality removed - Welcome is mandatory

const handleComplete = () => {
  completeOnboarding()
  if (props.onComplete) {
    props.onComplete()
  }
}

// Terminal Easter Egg handlers
const handleTerminalCommand = (command: string) => {
  // Commands are handled internally by the composable
  // This is just for potential future external integrations
  console.log(`Terminal command executed: ${command}`)
}

const handleTerminalClose = () => {
  // Terminal close is handled internally
  // This is just for potential future external integrations
  console.log('Terminal Easter Egg closed')
}
</script>

<style scoped>
.onboarding-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    135deg,
    var(--bg-primary) 0%,
    var(--bg-secondary) 100%
  );
  overflow: hidden;
  position: relative;
}

/* Main content area */
.onboarding-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  overflow-y: auto;
  overflow-x: hidden;
  scroll-behavior: smooth;
  position: relative;
}

/* Custom scrollbar for onboarding content */
.onboarding-content::-webkit-scrollbar {
  width: 8px;
}

.onboarding-content::-webkit-scrollbar-track {
  background: transparent;
}

.onboarding-content::-webkit-scrollbar-thumb {
  background: var(--border-secondary);
  border-radius: 4px;
}

.onboarding-content::-webkit-scrollbar-thumb:hover {
  background: var(--text-tertiary);
}

/* Step transition animations - Simplified horizontal movement only */
.step-forward-enter-active,
.step-forward-leave-active,
.step-backward-enter-active,
.step-backward-leave-active {
  transition:
    opacity 0.4s cubic-bezier(0.165, 0.84, 0.44, 1),
    transform 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
  will-change: opacity, transform;
}

.step-forward-enter-active,
.step-backward-enter-active {
  transition-delay: 0.05s;
}

/* Forward transitions (left to right) */
.step-forward-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.step-forward-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

/* Backward transitions (right to left) */
.step-backward-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.step-backward-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

/* Common end states - all content at natural position */
.step-forward-enter-to,
.step-forward-leave-from,
.step-backward-enter-to,
.step-backward-leave-from {
  opacity: 1;
  transform: translateX(0);
}

/* Container adjustments */

/* Responsive adjustments */
@media (max-width: 768px) {
  .onboarding-content {
    padding: 24px;
  }

  .onboarding-footer {
    padding: 16px 24px;
  }
}
</style>
