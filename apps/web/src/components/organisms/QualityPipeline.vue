<template>
  <div class="quality-pipeline">
    <div class="pipeline-header">
      <h4 class="pipeline-title">Quality Pipeline</h4>
      <div class="pipeline-status">
        <span class="status-text" :class="getOverallStatusClass()">
          {{ getOverallStatusText() }}
        </span>
      </div>
    </div>

    <div class="pipeline-steps">
      <div
        v-for="step in pipelineSteps"
        :key="step.id"
        class="pipeline-step"
        :class="{
          'step-expanded': step.expanded,
          'step-success': step.status === 'success',
          'step-error': step.status === 'error',
          'step-running': step.status === 'running',
          'step-pending': step.status === 'pending',
        }"
      >
        <!-- Step Header -->
        <div class="step-header" @click="toggleStep(step)">
          <div class="step-left">
            <div class="step-status-indicator">
              <BaseIcon
                :name="getStatusIcon(step.status)"
                size="xs"
                class="status-icon"
              />
            </div>
            <span class="step-name">{{ step.name }}</span>
            <span v-if="step.duration" class="step-duration"
              >({{ step.duration }}ms)</span
            >
          </div>

          <div class="step-right">
            <BaseIcon
              name="ArrowRight"
              size="xs"
              class="expand-icon"
              :class="{ expanded: step.expanded }"
            />
          </div>
        </div>

        <!-- Step Content (expandable) -->
        <div v-if="step.expanded" class="step-content">
          <!-- Success Message -->
          <div
            v-if="step.status === 'success' && step.successMessage"
            class="step-message success"
          >
            <BaseIcon name="Eye" size="xs" class="message-icon" />
            <span>{{ step.successMessage }}</span>
          </div>

          <!-- Error Details -->
          <div
            v-if="step.status === 'error' && step.errors?.length"
            class="step-errors"
          >
            <div
              v-for="(error, errorIndex) in step.errors"
              :key="errorIndex"
              class="error-item"
            >
              <div class="error-header">
                <BaseIcon name="X" size="xs" class="error-icon" />
                <span class="error-message">{{ error.message }}</span>
              </div>

              <div v-if="error.file" class="error-location">
                <span class="error-file">{{ error.file }}</span>
                <span v-if="error.line" class="error-line"
                  >:{{ error.line }}</span
                >
              </div>

              <!-- Error Actions -->
              <div class="error-actions">
                <BaseButton
                  variant="secondary"
                  size="sm"
                  class="fix-button"
                  @click="fixWithScript(error)"
                >
                  <BaseIcon name="Terminal" size="sm" />
                  <span>Fix with Script</span>
                </BaseButton>

                <BaseButton
                  variant="primary"
                  size="sm"
                  class="fix-button"
                  @click="fixWithAI(error)"
                >
                  <BaseIcon name="Eye" size="sm" />
                  <span>Fix with AI</span>
                </BaseButton>
              </div>
            </div>
          </div>

          <!-- Running Progress -->
          <div v-if="step.status === 'running'" class="step-progress">
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{ width: `${step.progress || 0}%` }"
              ></div>
            </div>
            <span class="progress-text">{{
              step.progressText || 'Running...'
            }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import BaseIcon from '../atoms/BaseIcon.vue'
import BaseButton from '../atoms/BaseButton.vue'

interface PipelineError {
  message: string
  file?: string
  line?: number
  code?: string
}

interface PipelineStep {
  id: string
  name: string
  status: 'pending' | 'running' | 'success' | 'error'
  duration?: number
  expanded: boolean
  successMessage?: string
  errors?: PipelineError[]
  progress?: number
  progressText?: string
}

interface Props {
  steps?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  steps: () => ['Syntax Check', 'Type Check', 'Linting', 'Testing'],
})

// Initialize pipeline steps
const pipelineSteps = ref<PipelineStep[]>(
  props.steps.map((stepName, index) => ({
    id: `step-${index}`,
    name: stepName,
    status:
      index === 0
        ? 'success'
        : index === 1
          ? 'error'
          : index === 2
            ? 'running'
            : 'pending',
    duration: index === 0 ? 120 : undefined,
    expanded: index === 1, // Expand error step by default
    successMessage:
      index === 0 ? 'All syntax is valid and properly formatted.' : undefined,
    errors:
      index === 1
        ? [
            {
              message: 'Property "computed" is defined but never used',
              file: 'src/components/organisms/GitSidebar.vue',
              line: 102,
            },
            {
              message: 'Missing return type annotation',
              file: 'src/components/molecules/AddressBar.vue',
              line: 74,
            },
          ]
        : undefined,
    progress: index === 2 ? 65 : undefined,
    progressText: index === 2 ? 'Checking code style...' : undefined,
  }))
)

const toggleStep = (step: PipelineStep) => {
  step.expanded = !step.expanded
}

const getStatusIcon = (status: PipelineStep['status']) => {
  switch (status) {
    case 'success':
      return 'Eye'
    case 'error':
      return 'X'
    case 'running':
      return 'Play'
    case 'pending':
      return 'Square'
    default:
      return 'Square'
  }
}

const getOverallStatusClass = () => {
  const hasError = pipelineSteps.value.some((step) => step.status === 'error')
  const hasRunning = pipelineSteps.value.some(
    (step) => step.status === 'running'
  )

  if (hasError) return 'status-error'
  if (hasRunning) return 'status-running'

  const allSuccess = pipelineSteps.value.every(
    (step) => step.status === 'success'
  )
  return allSuccess ? 'status-success' : 'status-pending'
}

const getOverallStatusText = () => {
  const hasError = pipelineSteps.value.some((step) => step.status === 'error')
  const hasRunning = pipelineSteps.value.some(
    (step) => step.status === 'running'
  )

  if (hasError) return 'Issues Found'
  if (hasRunning) return 'Running...'

  const allSuccess = pipelineSteps.value.every(
    (step) => step.status === 'success'
  )
  return allSuccess ? 'All Checks Passed' : 'Pending'
}

const fixWithScript = (error: PipelineError) => {
  console.log('Fix with script:', error)
  // Note: Script-based fix functionality will be implemented with pipeline integration
}

const fixWithAI = (error: PipelineError) => {
  console.log('Fix with AI:', error)
  // Note: AI-based fix functionality will be implemented with AI engine integration
}
</script>

<style scoped>
.quality-pipeline {
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  background: var(--bg-secondary);
  overflow: hidden;
}

.pipeline-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-primary);
}

.pipeline-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.pipeline-status {
  display: flex;
  align-items: center;
}

.status-text {
  font-size: 12px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 12px;
}

.status-success {
  color: #10b981;
  background: rgba(16, 185, 129, 0.1);
}

.status-error {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

.status-running {
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.1);
}

.status-pending {
  color: var(--text-secondary);
  background: var(--bg-primary);
}

.pipeline-steps {
  display: flex;
  flex-direction: column;
}

.pipeline-step {
  border-bottom: 1px solid var(--border-primary);
  transition: all var(--transition-fast);
}

.pipeline-step:last-child {
  border-bottom: none;
}

.step-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.step-header:hover {
  background: var(--bg-primary);
}

.step-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.step-status-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  flex-shrink: 0;
}

.step-success .step-status-indicator {
  background: rgba(16, 185, 129, 0.1);
}

.step-error .step-status-indicator {
  background: rgba(239, 68, 68, 0.1);
}

.step-running .step-status-indicator {
  background: rgba(245, 158, 11, 0.1);
  animation: pulse 2s infinite;
}

.step-pending .step-status-indicator {
  background: var(--bg-primary);
}

.status-icon {
  color: var(--text-tertiary);
}

.step-success .status-icon {
  color: #10b981;
}

.step-error .status-icon {
  color: #ef4444;
}

.step-running .status-icon {
  color: #f59e0b;
}

.step-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.step-duration {
  font-size: 11px;
  color: var(--text-secondary);
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
}

.step-right {
  display: flex;
  align-items: center;
}

.expand-icon {
  color: var(--text-tertiary);
  transition: transform var(--transition-fast);
}

.expand-icon.expanded {
  transform: rotate(90deg);
}

.step-content {
  padding: 0 16px 12px 16px;
  border-top: 1px solid var(--border-primary);
  background: var(--bg-primary);
}

.step-message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  margin-top: 8px;
}

.step-message.success {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.message-icon {
  flex-shrink: 0;
}

.step-errors {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.error-item {
  padding: 12px;
  background: rgba(239, 68, 68, 0.05);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 6px;
}

.error-header {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 6px;
}

.error-icon {
  color: #ef4444;
  flex-shrink: 0;
  margin-top: 2px;
}

.error-message {
  font-size: 13px;
  color: var(--text-primary);
  line-height: 1.4;
}

.error-location {
  font-size: 11px;
  color: var(--text-secondary);
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  margin-bottom: 8px;
  margin-left: 24px;
}

.error-file {
  color: var(--accent-primary);
}

.error-line {
  color: var(--text-tertiary);
}

.error-actions {
  display: flex;
  gap: 8px;
  margin-left: 24px;
}

.fix-button {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
}

.step-progress {
  margin-top: 8px;
  padding: 8px 12px;
  background: rgba(245, 158, 11, 0.05);
  border-radius: 6px;
}

.progress-bar {
  width: 100%;
  height: 4px;
  background: rgba(245, 158, 11, 0.2);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 6px;
}

.progress-fill {
  height: 100%;
  background: #f59e0b;
  transition: width var(--transition-normal);
}

.progress-text {
  font-size: 12px;
  color: #f59e0b;
  font-weight: 500;
}

/* Animations */
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .pipeline-header {
    padding: 10px 12px;
  }

  .step-header {
    padding: 10px 12px;
  }

  .step-content {
    padding: 0 12px 10px 12px;
  }

  .error-actions {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
