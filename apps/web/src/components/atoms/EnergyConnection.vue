<template>
  <div
    class="pipeline-connection"
    :class="`connection-${status}`"
    :style="{ height: `${height}px` }"
  >
    <!-- Línea principal de conexión -->
    <div class="connection-line">
      <!-- Indicador de flujo sutil -->
      <div v-if="isActive" class="flow-indicator">
        <div class="flow-dot"></div>
      </div>
    </div>

    <!-- Indicadores de estado minimalistas -->
    <div v-if="showStatusIndicator" class="status-indicator">
      <div class="status-dot" :class="`dot-${status}`"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * @fileoverview Energy connection component for quantum pipeline visualization.
 *
 * @description
 * Creates animated energy connections between quantum nodes in the pipeline.
 * Features particle flows, data pulses, and quantum distortion effects to
 * create a futuristic visual representation of data flow.
 *
 * @example
 * ```vue
 * <template>
 *   <EnergyConnection
 *     :height="60"
 *     status="active"
 *     :is-active="true"
 *     :show-data-pulses="true"
 *   />
 * </template>
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

type ConnectionStatus =
  | 'pending'
  | 'active'
  | 'completed'
  | 'failed'
  | 'blocked'

interface Props {
  /**
   * Height of the connection in pixels.
   * @defaultValue 40
   */
  height?: number

  /**
   * Current status of the connection.
   * @defaultValue 'pending'
   */
  status?: ConnectionStatus

  /**
   * Whether the connection is actively transferring data.
   * @defaultValue false
   */
  isActive?: boolean

  /**
   * Whether to show data pulse effects.
   * @defaultValue true
   */
  showDataPulses?: boolean

  /**
   * Whether to show status indicator dot in the middle.
   * @defaultValue false
   */
  showStatusIndicator?: boolean

  /**
   * Number of particles flowing through the connection.
   * @defaultValue 6
   */
  particleCount?: number

  /**
   * Delay between particle animations in milliseconds.
   * @defaultValue 300
   */
  particleDelay?: number

  /**
   * Duration of particle animation in milliseconds.
   * @defaultValue 2000
   */
  particleDuration?: number
}

withDefaults(defineProps<Props>(), {
  height: 40,
  status: 'pending',
  isActive: false,
  showDataPulses: true,
  showStatusIndicator: false,
  particleCount: 6,
  particleDelay: 300,
  particleDuration: 2000,
})
</script>

<style scoped>
.pipeline-connection {
  position: relative;
  width: 1px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Línea principal de conexión */
.connection-line {
  position: relative;
  width: 100%;
  height: 100%;
  background: var(--border-secondary);
  transition: all 0.25s ease;
}

.connection-active .connection-line {
  background: var(--accent-primary);
  box-shadow: 0 0 4px color-mix(in srgb, var(--accent-primary) 30%, transparent);
}

.connection-completed .connection-line {
  background: #10b981;
  box-shadow: 0 0 3px color-mix(in srgb, #10b981 25%, transparent);
}

.connection-failed .connection-line {
  background: #ef4444;
  box-shadow: 0 0 3px color-mix(in srgb, #ef4444 25%, transparent);
}

/* Indicador de flujo minimalista */
.flow-indicator {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.flow-dot {
  position: absolute;
  left: 50%;
  top: -2px;
  width: 3px;
  height: 3px;
  background: var(--accent-primary);
  border-radius: 50%;
  transform: translateX(-50%);
  animation: flow-movement 2s ease-in-out infinite;
  box-shadow: 0 0 4px color-mix(in srgb, var(--accent-primary) 50%, transparent);
}

/* Eliminadas partículas, pulsos y distorsiones para un diseño más limpio */

/* Indicador de estado minimalista */
.status-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 2;
}

.status-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  transition: all 0.25s ease;
}

.dot-pending {
  background: var(--border-secondary);
}

.dot-active {
  background: var(--accent-primary);
  box-shadow: 0 0 6px color-mix(in srgb, var(--accent-primary) 40%, transparent);
  animation: gentle-pulse 2s ease-in-out infinite;
}

.dot-completed {
  background: #10b981;
  box-shadow: 0 0 4px color-mix(in srgb, #10b981 30%, transparent);
}

.dot-failed {
  background: #ef4444;
  box-shadow: 0 0 4px color-mix(in srgb, #ef4444 30%, transparent);
}

.dot-blocked {
  background: var(--border-secondary);
  opacity: 0.5;
}

/* Animaciones minimalistas */
@keyframes flow-movement {
  0% {
    top: -3px;
    opacity: 0;
  }
  20% {
    opacity: 1;
  }
  80% {
    opacity: 1;
  }
  100% {
    top: calc(100% + 3px);
    opacity: 0;
  }
}

@keyframes gentle-pulse {
  0%,
  100% {
    opacity: 0.8;
  }
  50% {
    opacity: 1;
  }
}

/* Estados simplificados */
.connection-pending .flow-indicator {
  display: none;
}

.connection-blocked .connection-line {
  opacity: 0.3;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .flow-dot {
    width: 2px;
    height: 2px;
  }

  .status-dot {
    width: 3px;
    height: 3px;
  }
}
</style>
