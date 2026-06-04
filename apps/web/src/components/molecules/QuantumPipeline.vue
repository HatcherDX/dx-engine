<template>
  <div
    class="actions-pipeline"
    :class="{ 'pipeline-active': isRunning, 'pipeline-expanded': isExpanded }"
  >
    <!-- Header del pipeline -->
    <div class="pipeline-header">
      <div class="pipeline-title">
        <!-- Solo bolita visible inicialmente -->
        <div class="status-indicator" :class="`status-${pipelineStatus}`"></div>

        <!-- Contenido expandible -->
        <div class="expandable-content">
          <span class="title-text">hatcher::actions</span>
          <!-- Botón discreto para activar -->
          <button
            class="test-trigger"
            :disabled="isRunning"
            title="Test Actions Pipeline"
            @click="() => executeActions()"
          >
            <BaseIcon
              :name="isRunning ? 'Loader' : 'Play'"
              size="2xs"
              :class="{ spinning: isRunning }"
            />
          </button>
        </div>
      </div>
    </div>

    <!-- Pipeline de acciones dinámico -->
    <div class="pipeline-flow">
      <template v-for="(action, index) in actions" :key="action.id">
        <div class="pipeline-step">
          <button class="step-button" @click="handleStepClick(action, index)">
            <div class="action-row">
              <QuantumNode
                :designation="action.designation"
                :operation="action.operation"
                :status="action.status"
                :progress="action.progress"
                :energy-level="action.energyLevel"
                :quantum-stability="action.quantumStability"
                :action-icon="action.actionIcon"
                :data-flow="action.dataFlow"
                :quantum-threads="action.quantumThreads"
                :recent-logs="action.logs.slice(-3)"
              />
              <div class="action-info">
                <div class="action-name">{{ action.operation }}</div>
                <div class="action-command">
                  {{ getCommandForAction(action.id) }}
                </div>
              </div>
            </div>
          </button>

          <!-- Conexión entre acciones (excepto la última) -->
          <EnergyConnection
            v-if="index < actions.length - 1"
            :height="getConnectionHeight(index)"
            :status="getConnectionStatus(action, actions[index + 1])"
            :is-active="isConnectionActive(action, actions[index + 1])"
            :show-data-pulses="true"
            :show-status-indicator="index % 2 === 0"
          />
        </div>
      </template>
    </div>

    <!-- Progress indicator simple -->
    <div v-if="overallProgress > 0" class="simple-progress">
      <div class="progress-text" :class="progressColorClass">
        {{ Math.round(overallProgress) }}%
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * @fileoverview Actions Pipeline component for Hatcher Actions visualization.
 *
 * @description
 * Creates a clean interface that visualizes the execution of
 * Hatcher Actions (local CI/CD pipeline) with status indicators
 * and progress tracking.
 *
 * @example
 * ```vue
 * <template>
 *   <QuantumPipeline />
 * </template>
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { computed } from 'vue'
import QuantumNode from '../atoms/QuantumNode.vue'
import EnergyConnection from '../atoms/EnergyConnection.vue'
import BaseIcon from '../atoms/BaseIcon.vue'
import {
  useQuantumActions,
  type QuantumAction,
} from '../../composables/useQuantumActions'
import { useSmartPipeline } from '../../composables/useSmartPipeline'

// Props
interface Props {
  isExpanded?: boolean
}

withDefaults(defineProps<Props>(), {
  isExpanded: false,
})

// Initialize quantum actions composable
const {
  actions,
  isRunning,
  overallProgress,
  pipelineStatus,
  executeActions,
  resetPipeline,
} = useQuantumActions()

// Initialize smart pipeline for automatic triggering
const {
  isEnabled: isSmartPipelineEnabled,
  enableSmartPipeline,
  disableSmartPipeline,
} = useSmartPipeline()

/**
 * Helper function to get connection height between actions.
 */
const getConnectionHeight = (index: number): number => {
  // Varying heights for visual dynamism
  const heights = [64, 48, 56, 72, 60]
  return heights[index % heights.length]
}

/**
 * Helper function to determine connection status based on action states.
 */
const getConnectionStatus = (
  currentAction: QuantumAction,
  nextAction?: QuantumAction
): 'pending' | 'active' | 'completed' | 'failed' => {
  if (currentAction.status === 'failed') return 'failed'
  if (currentAction.status === 'success' && nextAction) {
    if (nextAction.status === 'running' || nextAction.status === 'initializing')
      return 'active'
    if (nextAction.status === 'success') return 'completed'
  }
  if (
    currentAction.status === 'running' ||
    currentAction.status === 'initializing'
  )
    return 'active'
  return 'pending'
}

/**
 * Helper function to determine if connection should show active state.
 */
const isConnectionActive = (
  currentAction: QuantumAction,
  nextAction?: QuantumAction
): boolean => {
  return (
    currentAction.status === 'running' ||
    currentAction.status === 'initializing' ||
    (currentAction.status === 'success' &&
      nextAction !== undefined &&
      (nextAction.status === 'running' || nextAction.status === 'initializing'))
  )
}

/**
 * Computed property for progress color class based on pipeline status.
 */
const progressColorClass = computed(() => {
  if (pipelineStatus.value === 'completed') {
    return 'progress-success'
  } else if (pipelineStatus.value === 'failed') {
    return 'progress-failed'
  }
  return 'progress-running'
})

/**
 * Gets the command for a given action ID.
 */
const getCommandForAction = (actionId: string): string => {
  const commandMap: Record<string, string> = {
    'code-quality': 'pnpm lint',
    'type-check': 'pnpm typecheck',
    format: 'pnpm format',
    'unit-tests': 'pnpm test',
    build: 'pnpm build',
  }
  return commandMap[actionId] || ''
}

/**
 * Handles click on step button - enhanced with smart pipeline controls.
 */
const handleStepClick = async (
  action: QuantumAction,
  index: number
): Promise<void> => {
  if (index === 0) {
    // First action triggers execution
    if (!isRunning.value) {
      executeActions()
    }
  } else if (index === 1) {
    // Second action triggers reset
    if (!isRunning.value && actions.value.some((a) => a.status !== 'pending')) {
      resetPipeline()
    }
  } else if (index === 2) {
    // Third action toggles smart pipeline
    try {
      if (isSmartPipelineEnabled.value) {
        disableSmartPipeline()
        console.log('Smart pipeline disabled')
      } else {
        await enableSmartPipeline()
        console.log('Smart pipeline enabled')
      }
    } catch (error) {
      console.error('Failed to toggle smart pipeline:', error)
    }
  } else {
    // Other actions will open modal (TODO: implement modal)
    console.log('Open modal for:', action.operation)
  }
}
</script>

<style scoped>
.actions-pipeline {
  position: relative;
  width: 48px;
  height: 100%;
  background: var(--bg-sidebar);
  border-left: 1px solid var(--border-sidebar);
  border-radius: 8px 0 0 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.actions-pipeline:hover,
.actions-pipeline.pipeline-expanded {
  width: 240px;
}

.pipeline-active {
  border-left-color: color-mix(
    in srgb,
    var(--accent-primary) 30%,
    var(--border-sidebar)
  );
}

/* Header del pipeline - Square with centered dot */
.pipeline-header {
  width: 48px;
  height: 48px;
  border-bottom: 1px solid var(--border-sidebar);
  display: flex;
  align-items: center;
  justify-content: center;
}

.pipeline-title {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  position: relative;
}

/* Expandable content - hidden initially */
.expandable-content {
  display: flex;
  align-items: center;
  gap: 6px;
  opacity: 0;
  transform: translateX(-10px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
  position: absolute;
  left: 60px;
  white-space: nowrap;
}

.actions-pipeline:hover .expandable-content,
.actions-pipeline.pipeline-expanded .expandable-content {
  opacity: 1;
  transform: translateX(0);
  pointer-events: auto;
}

.title-text {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.3px;
  font-family: var(--font-mono);
  opacity: 0.4;
}

.test-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 3px;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
  margin-left: 4px;
}

.test-trigger:hover:not(:disabled) {
  background: var(--hover-bg-light);
  border-color: var(--border-primary);
  color: var(--accent-primary);
}

.test-trigger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spinning {
  animation: spin 1s linear infinite;
}

.status-indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  transition: all 0.25s ease;
}

.status-idle {
  background: var(--border-secondary);
}

.status-pending {
  background: var(--text-tertiary);
}

.status-executing {
  background: var(--accent-primary);
  animation: status-active-pulse 2s ease-in-out infinite;
}

.status-completed {
  background: #10b981;
}

.status-failed {
  background: #ef4444;
  animation: status-error-pulse 2s ease-in-out infinite;
}

/* Pipeline flow */
.pipeline-flow {
  flex: 1;
  padding: 20px 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  position: relative;
}

.pipeline-step {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
}

/* Anchor EnergyConnection to the left like the nodes */
.pipeline-step:not(:last-child) > :last-child {
  margin-left: 24px; /* Same as node center position (12px padding + 12px to center) */
  align-self: flex-start;
}

.action-row {
  display: flex;
  align-items: center;
  width: 48px; /* Fixed width so nodes don't move */
  position: relative;
  justify-content: flex-start;
  padding-left: 12px; /* Anchor to left edge with some padding */
}

/* Ensure all QuantumNodes are perfectly aligned */
.action-row > :first-child {
  margin: 0 !important; /* Override any margin from QuantumNode */
  position: relative;
  left: 0 !important;
  transform: none !important;
  display: block !important;
  float: none !important;
}

/* Step Button - Full width clickable area */
.step-button {
  width: 100%;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  margin: 0;
  position: relative;
  transition: background-color var(--transition-fast);
  border-radius: 0;
  outline: none;
}

.step-button:hover {
  background-color: var(--hover-bg-light);
}

.dark .step-button:hover {
  background-color: var(--hover-bg-dark);
}

.step-button:focus {
  background-color: var(--hover-bg-light);
}

.dark .step-button:focus {
  background-color: var(--hover-bg-dark);
}

/* Force consistent alignment for all pipeline steps */
.pipeline-step {
  margin-left: 0 !important;
  padding-left: 0 !important;
  width: 100%;
}

.pipeline-step .action-row {
  margin-left: 0 !important;
  padding-left: 12px !important;
  padding-right: 12px;
  padding-top: 8px;
  padding-bottom: 8px;
}

/* Force alignment for the last step specifically */
.pipeline-step:last-child .action-row {
  padding-left: 12px !important;
  margin-left: 0 !important;
  transform: translateX(0) !important;
}

.pipeline-step:last-child .action-row > :first-child {
  margin: 0 !important;
  padding: 0 !important;
  left: 0 !important;
  transform: none !important;
  position: relative !important;
}

.action-info {
  position: absolute;
  left: 60px; /* Position to the right of the fixed 48px area */
  top: 50%;
  transform: translateY(-50%) translateX(-10px);
  min-width: 0;
  opacity: 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
  white-space: nowrap;
  text-align: left;
}

.actions-pipeline:hover .action-info,
.actions-pipeline.pipeline-expanded .action-info {
  opacity: 1;
  transform: translateY(-50%) translateX(0);
  pointer-events: auto;
}

.action-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.action-command {
  font-size: 11px;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  color: var(--text-tertiary);
  margin-top: 2px;
}

/* Simple progress indicator */
.simple-progress {
  padding: 8px;
  text-align: center;
  border-top: 1px solid var(--border-sidebar);
}

.progress-text {
  font-size: 10px;
  font-weight: 600;
  font-family: var(--font-mono);
  letter-spacing: 0.5px;
  transition: color 0.3s ease;
}

.progress-running {
  color: var(--accent-primary);
}

.progress-success {
  color: #10b981;
}

.progress-failed {
  color: #ef4444;
}

/* Animaciones */
@keyframes gentle-pulse {
  0%,
  100% {
    opacity: 0.7;
  }
  50% {
    opacity: 1;
  }
}

@keyframes status-active-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.9;
  }
  50% {
    transform: scale(1.2);
    opacity: 1;
  }
}

@keyframes status-error-pulse {
  0% {
    box-shadow: 0 0 4px rgba(255, 0, 68, 0.6);
  }
  100% {
    box-shadow: 0 0 8px rgba(255, 0, 68, 0.9);
  }
}

/* Interactividad para los primeros dos nodos */
.cursor-pointer {
  cursor: pointer !important;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .actions-pipeline {
    width: 56px;
  }

  .title-text {
    font-size: 7px;
  }

  .progress-text {
    font-size: 9px;
  }
}
</style>
