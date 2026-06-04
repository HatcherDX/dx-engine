<template>
  <div class="onboarding-progress" :style="{ '--step-count': steps.length }">
    <div class="progress-wrapper">
      <!-- Progress steps -->
      <div class="progress-steps">
        <div
          v-for="(step, index) in steps"
          :key="step.id"
          class="progress-step"
          :class="{
            'step-active': index === currentStep,
            'step-completed':
              index < currentStep ||
              (isInGetStartedMode && index < currentStep),
            'step-upcoming': index > currentStep && !isInGetStartedMode,
            'step-disabled': isInGetStartedMode && index < currentStep,
          }"
        >
          <!-- Step connector line -->
          <div
            v-if="index > 0"
            class="step-connector"
            :class="{
              'connector-completed': index <= currentStep,
            }"
          />

          <!-- Step indicator -->
          <div class="step-indicator" @click="handleStepClick(index)">
            <div class="step-circle">
              <BaseIcon
                v-if="index < currentStep"
                name="Check"
                size="xs"
                class="step-icon-check"
              />
              <BaseIcon
                v-else-if="step.icon"
                :name="step.icon"
                :size="step.icon === 'Rocket' ? 'sm' : 'xs'"
                class="step-icon"
                :class="{ 'rocket-icon': step.icon === 'Rocket' }"
              />
              <span v-else class="step-number">{{ index + 1 }}</span>
            </div>
            <span class="step-label">{{ step.label }}</span>
          </div>
        </div>
      </div>

      <!-- Progress bar background -->
      <div class="progress-bar-track">
        <div
          class="progress-bar-fill"
          :style="{ width: progressPercentage + '%' }"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseIcon from '../atoms/BaseIcon.vue'

export interface OnboardingStep {
  id: string
  label: string
  icon: string
}

interface Props {
  currentStep: number
  totalSteps: number
  steps: OnboardingStep[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'go-to-step': [stepIndex: number]
}>()

// Computed properties
const progressPercentage = computed(() => {
  if (props.totalSteps <= 1) return 0

  // In Get Started mode, show 100% progress
  if (isInGetStartedMode.value) return 100

  return (props.currentStep / (props.totalSteps - 1)) * 100
})

// When we're in "Get Started" (transition), show all steps but mark previous ones as completed
const isInGetStartedMode = computed(() => {
  const currentStepId = props.steps[props.currentStep]?.id
  return currentStepId === 'transition'
})

// Methods
const handleStepClick = (index: number) => {
  // In Get Started mode, don't allow clicking
  if (isInGetStartedMode.value) {
    return
  }

  // Only allow clicking on completed steps (not current or future steps)
  if (index < props.currentStep) {
    emit('go-to-step', index)
  }
}
</script>

<style scoped>
.onboarding-progress {
  width: 100%;
  padding: 24px 48px 20px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-primary);
  flex-shrink: 0;
  /* Make the entire progress bar draggable */
  -webkit-app-region: drag;
  user-select: none;
  /* Subtle visual hint that this area is draggable */
  cursor: grab;
}

.onboarding-progress:active {
  cursor: grabbing;
}

.progress-wrapper {
  position: relative;
  max-width: 800px;
  margin: 0 auto;
}

/* Progress steps */
.progress-steps {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  z-index: 2;
  width: 100%;
}

.progress-step {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: opacity 0.2s ease;
  /* Calculate equal distribution based on dynamic step count */
  flex: 1;
}

.progress-step.step-upcoming {
  opacity: 0.5;
}

.progress-step.step-active {
  opacity: 1;
}

.progress-step.step-completed {
  opacity: 1;
}

.progress-step.step-disabled {
  opacity: 0.4;
}

/* Step connector */
.step-connector {
  position: absolute;
  left: calc(-50% + 18px); /* Adjust for step circle width */
  right: calc(50% - 18px); /* Adjust for step circle width */
  top: 18px;
  height: 2px;
  background: var(--border-secondary);
  transition: background-color 0.3s ease;
  z-index: 1;
}

.step-connector.connector-completed {
  background: var(--accent-primary);
}

/* Step indicator */
.step-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  position: relative;
  z-index: 2;
  cursor: default;
  user-select: none;
  /* Make step indicators non-draggable so they remain clickable */
  -webkit-app-region: no-drag;
}

.step-completed .step-indicator {
  cursor: pointer;
}

.step-completed .step-indicator:hover {
  opacity: 0.9;
}

.step-upcoming .step-indicator,
.step-active .step-indicator,
.step-disabled .step-indicator {
  cursor: default;
}

.step-circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--bg-primary);
  border: 2px solid var(--border-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.6s cubic-bezier(0.165, 0.84, 0.44, 1);
  position: relative;
  overflow: hidden;
  will-change: transform, background-color, border-color, box-shadow;
}

.step-circle::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: linear-gradient(
    135deg,
    transparent 0%,
    rgba(var(--accent-primary-rgb), 0.1) 100%
  );
  opacity: 0;
  transition: opacity 0.4s ease;
}

.step-active .step-circle {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  transform: scale(1.1);
  box-shadow:
    0 0 0 4px rgba(var(--accent-primary-rgb), 0.2),
    0 0 20px rgba(var(--accent-primary-rgb), 0.3),
    0 4px 12px rgba(var(--accent-primary-rgb), 0.4);
  animation: step-pulse 2s ease-in-out infinite alternate;
}

@keyframes step-pulse {
  0% {
    box-shadow:
      0 0 0 4px rgba(var(--accent-primary-rgb), 0.2),
      0 0 20px rgba(var(--accent-primary-rgb), 0.3),
      0 4px 12px rgba(var(--accent-primary-rgb), 0.4);
  }
  100% {
    box-shadow:
      0 0 0 6px rgba(var(--accent-primary-rgb), 0.15),
      0 0 24px rgba(var(--accent-primary-rgb), 0.4),
      0 6px 16px rgba(var(--accent-primary-rgb), 0.3);
  }
}

.step-active .step-circle::before {
  opacity: 1;
}

.step-completed .step-circle {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
}

.step-icon,
.step-icon-check {
  color: var(--text-secondary);
  transition: color 0.3s ease;
}

.step-active .step-icon,
.step-completed .step-icon-check {
  color: var(--text-on-accent);
}

.rocket-icon {
  transform: scale(1.2);
}

/* Special styling for rocket icon when active - same as other active steps */
.step-active .rocket-icon {
  color: var(--text-on-accent);
}

.step-number {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
}

.step-completed .step-number {
  color: var(--text-on-accent);
}

.step-active .step-number {
  color: var(--text-on-accent);
}

.step-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  white-space: nowrap;
  transition: color 0.3s ease;
}

.step-active .step-label {
  color: var(--accent-primary);
  font-weight: 600;
}

.step-completed .step-label {
  color: var(--text-primary);
}

/* Progress bar */
.progress-bar-track {
  position: absolute;
  top: 18px;
  /* Align with step circles - dynamic calculation based on step count */
  left: calc(50% / var(--step-count));
  right: calc(50% / var(--step-count));
  height: 2px;
  background: var(--border-secondary);
  z-index: 0;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(
    90deg,
    var(--accent-primary) 0%,
    var(--accent-primary) 85%,
    transparent 100%
  );
  transition: width 0.8s cubic-bezier(0.165, 0.84, 0.44, 1);
  box-shadow:
    0 0 12px rgba(var(--accent-primary-rgb), 0.4),
    0 1px 3px rgba(var(--accent-primary-rgb), 0.6);
  position: relative;
  overflow: hidden;
}

.progress-bar-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: -50px;
  width: 50px;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.3) 50%,
    transparent 100%
  );
  animation: progress-shine 2s infinite;
}

@keyframes progress-shine {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(400%);
  }
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .onboarding-progress {
    padding: 24px 24px 16px;
  }

  .step-label {
    font-size: 10px;
  }

  .step-circle {
    width: 32px;
    height: 32px;
  }
}

@media (max-width: 480px) {
  .step-label {
    display: none;
  }
}
</style>
