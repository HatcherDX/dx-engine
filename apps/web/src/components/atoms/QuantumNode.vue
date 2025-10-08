<template>
  <div
    class="action-node-container"
    :class="{
      'node-pending': status === 'pending',
      'node-initializing': status === 'initializing',
      'node-running': status === 'running',
      'node-success': status === 'success',
      'node-failed': status === 'failed',
      'node-skipped': status === 'skipped',
    }"
  >
    <!-- Nodo principal (círculo elegante) -->
    <div class="action-node" :class="`status-${status}`">
      <!-- Anillo sutil de estado -->
      <div class="status-ring"></div>

      <!-- Núcleo central -->
      <div class="node-core">
        <!-- Icono del action -->
        <BaseIcon :name="actionIcon" size="xs" class="action-icon" />

        <!-- Indicador de progreso/spinner tipo bola de fuego -->
        <div
          v-if="status === 'running' || status === 'initializing'"
          class="progress-ring"
        >
          <svg class="progress-svg" viewBox="0 0 24 24">
            <!-- Órbita sutil -->
            <circle
              cx="12"
              cy="12"
              r="10"
              fill="none"
              stroke="rgba(255, 204, 0, 0.1)"
              stroke-width="1"
            />
            <!-- Cola degradada -->
            <defs>
              <linearGradient
                id="fireGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" style="stop-color: rgba(255, 204, 0, 0)" />
                <stop offset="30%" style="stop-color: rgba(255, 204, 0, 0.3)" />
                <stop offset="70%" style="stop-color: rgba(255, 204, 0, 0.7)" />
                <stop offset="100%" style="stop-color: rgba(255, 204, 0, 1)" />
              </linearGradient>
              <radialGradient id="fireballGradient" cx="50%" cy="50%" r="50%">
                <stop
                  offset="0%"
                  style="stop-color: rgba(255, 255, 255, 0.9)"
                />
                <stop offset="40%" style="stop-color: rgba(255, 204, 0, 1)" />
                <stop
                  offset="100%"
                  style="stop-color: rgba(255, 150, 0, 0.8)"
                />
              </radialGradient>
            </defs>
            <!-- Cola de fuego -->
            <path
              d="M 2,12 Q 7,12 12,12"
              fill="none"
              stroke="url(#fireGradient)"
              stroke-width="3"
              stroke-linecap="round"
              class="fire-tail"
            />
            <!-- Bola de fuego -->
            <circle
              cx="12"
              cy="12"
              r="2.5"
              fill="url(#fireballGradient)"
              class="fire-ball"
            />
            <!-- Brillo interior -->
            <circle
              cx="12"
              cy="12"
              r="1.2"
              fill="rgba(255,255,255,0.6)"
              class="fire-core"
            />
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * @fileoverview Quantum Node component for the futuristic pipeline interface.
 *
 * @description
 * A hexagonal node component that represents a single action in the Hatcher Actions
 * pipeline. Features sci-fi visual effects including energy rings, orbital particles,
 * and holographic information displays.
 *
 * @example
 * ```vue
 * <template>
 *   <QuantumNode
 *     designation="ALPHA-7X"
 *     operation="Code Analysis"
 *     status="running"
 *     :progress="75"
 *     :energy-level="82"
 *     action-icon="Code"
 *   />
 * </template>
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import BaseIcon from './BaseIcon.vue'

type QuantumStatus =
  | 'pending'
  | 'initializing'
  | 'running'
  | 'success'
  | 'failed'
  | 'skipped'

interface QuantumLog {
  timestamp: string
  level: 'info' | 'warning' | 'critical'
  message: string
}

interface Props {
  /**
   * Unique designation code for this quantum node.
   * @defaultValue 'NODE-XX'
   */
  designation?: string

  /**
   * Operation name being performed.
   * @defaultValue 'Quantum Operation'
   */
  operation?: string

  /**
   * Current status of the quantum node.
   * @defaultValue 'pending'
   */
  status?: QuantumStatus

  /**
   * Progress percentage (0-100) for running operations.
   * @defaultValue 0
   */
  progress?: number

  /**
   * Energy level percentage (0-100).
   * @defaultValue 100
   */
  energyLevel?: number

  /**
   * Current data flow rate.
   */
  dataFlow?: string

  /**
   * Number of quantum processing threads.
   */
  quantumThreads?: number

  /**
   * Icon name to display in the node core.
   * @defaultValue 'Target'
   */
  actionIcon?: string

  /**
   * Recent log entries for this node.
   */
  recentLogs?: QuantumLog[]
}

withDefaults(defineProps<Props>(), {
  designation: 'NODE-XX',
  operation: 'Quantum Operation',
  status: 'pending',
  progress: 0,
  energyLevel: 100,
  dataFlow: undefined,
  quantumThreads: undefined,
  actionIcon: 'Target',
  recentLogs: () => [],
})
</script>

<style scoped>
.action-node-container {
  position: relative;
  width: 24px;
  height: 24px;
  margin: 12px 0;
}

/* Nodo principal (círculo elegante) */
.action-node {
  position: relative;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 50%;
  background: var(--bg-primary);
  border: 1.5px solid var(--border-primary);
  backdrop-filter: blur(8px);
}

/* Estados del nodo - diseño minimalista */
.action-node.status-pending {
  border-color: var(--border-secondary);
  background: var(--bg-primary);
}

.action-node.status-initializing {
  border-color: var(--accent-primary);
  background: color-mix(in srgb, var(--accent-primary) 5%, var(--bg-primary));
  animation: gentle-pulse 2s ease-in-out infinite;
}

.action-node.status-running {
  border-color: var(--accent-primary);
  background: color-mix(in srgb, var(--accent-primary) 8%, var(--bg-primary));
  box-shadow: 0 0 8px color-mix(in srgb, var(--accent-primary) 20%, transparent);
}

.action-node.status-success {
  border-color: #10b981;
  background: color-mix(in srgb, #10b981 5%, var(--bg-primary));
  box-shadow: 0 0 6px color-mix(in srgb, #10b981 15%, transparent);
}

.action-node.status-failed {
  border-color: #ef4444;
  background: color-mix(in srgb, #ef4444 5%, var(--bg-primary));
  animation: subtle-error-pulse 2s ease-in-out infinite;
}

.action-node.status-skipped {
  border-color: var(--border-secondary);
  background: var(--bg-primary);
  opacity: 0.4;
}

/* Anillo sutil de estado */
.status-ring {
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  border: 1px solid transparent;
  transition: all 0.25s ease;
  pointer-events: none;
}

.status-running .status-ring {
  border-color: color-mix(in srgb, var(--accent-primary) 30%, transparent);
  animation: status-ring-pulse 3s ease-in-out infinite;
}

/* Núcleo central */
.node-core {
  position: relative;
  width: 14px;
  height: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}

.action-icon {
  color: var(--text-secondary);
  transition: color 0.25s ease;
}

.status-running .action-icon {
  color: var(--accent-primary);
}

.status-success .action-icon {
  color: #10b981;
}

.status-failed .action-icon {
  color: #ef4444;
}

/* Anillo de progreso SVG minimalista */
.progress-ring {
  position: absolute;
  inset: -6px;
  pointer-events: none;
}

.progress-svg {
  width: 100%;
  height: 100%;
  transform: scale(1.2);
}

.fire-tail {
  transform-origin: 12px 12px;
  animation: fire-orbit 2s linear infinite;
  filter: blur(0.5px);
}

.fire-ball {
  transform-origin: 12px 12px;
  animation: fire-orbit 2s linear infinite;
  filter: drop-shadow(0 0 4px rgba(255, 204, 0, 0.7));
}

.fire-core {
  transform-origin: 12px 12px;
  animation:
    fire-orbit 2s linear infinite,
    fire-pulse 1s ease-in-out infinite alternate;
}

/* Eliminadas las partículas orbitando para un diseño más limpio */

/* Animaciones minimalistas */
@keyframes fire-orbit {
  0% {
    transform: rotate(0deg) translateX(10px) rotate(0deg);
  }
  100% {
    transform: rotate(360deg) translateX(10px) rotate(-360deg);
  }
}

@keyframes fire-pulse {
  0% {
    opacity: 0.6;
    transform: rotate(0deg) translateX(10px) rotate(0deg) scale(0.8);
  }
  100% {
    opacity: 1;
    transform: rotate(360deg) translateX(10px) rotate(-360deg) scale(1.2);
  }
}

@keyframes gentle-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

@keyframes subtle-error-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

@keyframes status-ring-pulse {
  0%,
  100% {
    opacity: 0.3;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.05);
  }
}
</style>
