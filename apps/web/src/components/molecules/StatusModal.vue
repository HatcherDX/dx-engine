<!--
/**
 * @fileoverview System status modal for real-time monitoring.
 *
 * @description
 * Modal for displaying real-time system status including model information,
 * session metrics, performance data, and active connections.
 *
 * @example
 * <StatusModal
 *   :visible="showStatus"
 *   @close="showStatus = false"
 * />
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */
-->

<template>
  <div v-if="visible" class="modal-overlay" @click="handleOverlayClick">
    <div class="modal-container" @click.stop>
      <!-- Header -->
      <div class="modal-header">
        <div class="header-content">
          <BaseIcon name="Activity" size="md" class="header-icon" />
          <h2 class="modal-title">System Status</h2>
          <span class="status-badge" :class="systemStatusClass">
            {{ systemStatus }}
          </span>
        </div>
        <button class="close-button" aria-label="Close" @click="$emit('close')">
          <BaseIcon name="X" size="sm" />
        </button>
      </div>

      <!-- Content -->
      <div class="modal-content">
        <!-- Current Model -->
        <div class="status-section">
          <h3 class="section-title">Current Model</h3>
          <div class="model-card">
            <div class="model-info">
              <div class="model-name">{{ activeModel.name }}</div>
              <div class="model-details">
                <span class="detail-item">
                  <BaseIcon name="Circle" size="xs" />
                  {{ activeModel.provider }}
                </span>
                <span class="detail-item">
                  <BaseIcon name="Circle" size="xs" />
                  Context: {{ activeModel.contextWindow }}
                </span>
              </div>
            </div>
            <div class="model-status">
              <div
                class="status-indicator"
                :class="getModelStatusClass()"
              ></div>
              <span class="status-text">{{ activeModel.status }}</span>
            </div>
          </div>
        </div>

        <!-- Session Metrics -->
        <div class="status-section">
          <h3 class="section-title">Session Metrics</h3>
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-icon">
                <BaseIcon name="Activity" size="sm" />
              </div>
              <div class="metric-content">
                <span class="metric-label">Requests</span>
                <span class="metric-value">{{ sessionMetrics.requests }}</span>
              </div>
            </div>
            <div class="metric-card">
              <div class="metric-icon">
                <BaseIcon name="FileText" size="sm" />
              </div>
              <div class="metric-content">
                <span class="metric-label">Tokens Used</span>
                <span class="metric-value">{{
                  formatNumber(sessionMetrics.tokensUsed)
                }}</span>
              </div>
            </div>
            <div class="metric-card">
              <div class="metric-icon">
                <BaseIcon name="Clock" size="sm" />
              </div>
              <div class="metric-content">
                <span class="metric-label">Session Time</span>
                <span class="metric-value">{{ sessionMetrics.duration }}</span>
              </div>
            </div>
            <div class="metric-card">
              <div class="metric-icon">
                <BaseIcon name="Target" size="sm" />
              </div>
              <div class="metric-content">
                <span class="metric-label">Avg Response</span>
                <span class="metric-value">{{
                  sessionMetrics.avgResponse
                }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Performance -->
        <div class="status-section">
          <h3 class="section-title">Performance</h3>
          <div class="performance-items">
            <div class="performance-item">
              <div class="performance-header">
                <span class="performance-label">Memory Usage</span>
                <span class="performance-value"
                  >{{ performance.memory.used }} /
                  {{ performance.memory.total }}</span
                >
              </div>
              <div class="performance-bar">
                <div
                  class="performance-fill"
                  :class="getPerformanceClass(performance.memory.percentage)"
                  :style="{ width: `${performance.memory.percentage}%` }"
                ></div>
              </div>
            </div>
            <div class="performance-item">
              <div class="performance-header">
                <span class="performance-label">CPU Usage</span>
                <span class="performance-value">{{ performance.cpu }}%</span>
              </div>
              <div class="performance-bar">
                <div
                  class="performance-fill"
                  :class="getPerformanceClass(performance.cpu)"
                  :style="{ width: `${performance.cpu}%` }"
                ></div>
              </div>
            </div>
            <div class="performance-item">
              <div class="performance-header">
                <span class="performance-label">Network Latency</span>
                <span class="performance-value"
                  >{{ performance.latency }}ms</span
                >
              </div>
              <div class="performance-bar">
                <div
                  class="performance-fill"
                  :class="getLatencyClass(performance.latency)"
                  :style="{
                    width: `${Math.min((performance.latency / 500) * 100, 100)}%`,
                  }"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Active Connections -->
        <div class="status-section">
          <h3 class="section-title">Active Connections</h3>
          <div class="connections-list">
            <div
              v-for="connection in connections"
              :key="connection.name"
              class="connection-item"
            >
              <div
                class="connection-indicator"
                :class="getConnectionClass(connection.status)"
              ></div>
              <div class="connection-info">
                <span class="connection-name">{{ connection.name }}</span>
                <span class="connection-details">{{ connection.details }}</span>
              </div>
              <span class="connection-status">{{ connection.status }}</span>
            </div>
          </div>
        </div>

        <!-- Last Updated -->
        <div class="update-info">
          <BaseIcon name="Clock" size="xs" />
          <span>Last updated: {{ lastUpdated }}</span>
        </div>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <BaseButton variant="ghost" size="sm" @click="handleRefresh">
          <BaseIcon name="RotateCcw" size="xs" />
          Refresh
        </BaseButton>
        <BaseButton variant="ghost" @click="$emit('close')"> Close </BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import BaseIcon from '../atoms/BaseIcon.vue'
import BaseButton from '../atoms/BaseButton.vue'
import { useNotifications } from '../../composables/useNotifications'

/**
 * Component props.
 *
 * @public
 */
interface Props {
  /** Controls visibility of the modal */
  visible: boolean
}

/**
 * Component emits.
 *
 * @public
 */
interface Emits {
  /** Emitted when modal should close */
  (event: 'close'): void
}

/**
 * Connection status.
 *
 * @private
 */
interface Connection {
  name: string
  status: 'connected' | 'disconnected' | 'error'
  details: string
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const { success } = useNotifications()

/**
 * Active model information.
 *
 * @private
 */
const activeModel = ref({
  name: 'Claude Sonnet 4.5',
  provider: 'Anthropic',
  contextWindow: '200K',
  status: 'Active',
})

/**
 * Session metrics.
 *
 * @private
 */
const sessionMetrics = ref({
  requests: 47,
  tokensUsed: 125000,
  duration: '2h 15m',
  avgResponse: '1.8s',
})

/**
 * Performance metrics.
 *
 * @private
 */
const performance = ref({
  memory: {
    used: '245 MB',
    total: '512 MB',
    percentage: 48,
  },
  cpu: 12,
  latency: 85,
})

/**
 * Active connections.
 *
 * @private
 */
const connections = ref<Connection[]>([
  {
    name: 'API Server',
    status: 'connected',
    details: 'api.anthropic.com',
  },
  {
    name: 'Git Integration',
    status: 'connected',
    details: 'github.com',
  },
  {
    name: 'MCP Servers',
    status: 'connected',
    details: '2 active servers',
  },
])

const lastUpdated = ref(new Date().toLocaleTimeString())

/**
 * System status.
 *
 * @private
 */
const systemStatus = computed(() => {
  const hasErrors = connections.value.some((c) => c.status === 'error')
  const hasDisconnections = connections.value.some(
    (c) => c.status === 'disconnected'
  )

  if (hasErrors) return 'Degraded'
  if (hasDisconnections) return 'Partial'
  return 'Operational'
})

/**
 * System status CSS class.
 *
 * @private
 */
const systemStatusClass = computed(() => {
  const status = systemStatus.value.toLowerCase()
  return `status-${status}`
})

/**
 * Format number with K/M suffix.
 *
 * @param num - Number to format
 * @returns Formatted string
 *
 * @private
 */
const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

/**
 * Get model status CSS class.
 *
 * @returns CSS class
 *
 * @private
 */
const getModelStatusClass = (): string => {
  return 'status-active'
}

/**
 * Get performance CSS class based on percentage.
 *
 * @param percentage - Performance percentage
 * @returns CSS class
 *
 * @private
 */
const getPerformanceClass = (percentage: number): string => {
  if (percentage >= 80) return 'perf-high'
  if (percentage >= 50) return 'perf-medium'
  return 'perf-low'
}

/**
 * Get latency CSS class.
 *
 * @param latency - Latency in ms
 * @returns CSS class
 *
 * @private
 */
const getLatencyClass = (latency: number): string => {
  if (latency >= 200) return 'perf-high'
  if (latency >= 100) return 'perf-medium'
  return 'perf-low'
}

/**
 * Get connection status CSS class.
 *
 * @param status - Connection status
 * @returns CSS class
 *
 * @private
 */
const getConnectionClass = (status: string): string => {
  return `conn-${status}`
}

/**
 * Handle refresh action.
 *
 * @private
 */
const handleRefresh = (): void => {
  lastUpdated.value = new Date().toLocaleTimeString()
  success('Status refreshed')
}

/**
 * Handle clicks on modal overlay.
 *
 * @private
 */
const handleOverlayClick = (): void => {
  emit('close')
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(4px);
}

.modal-container {
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  width: 700px;
  max-width: 90vw;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  color: var(--accent-primary);
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-badge.status-operational {
  background-color: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.status-badge.status-partial {
  background-color: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

.status-badge.status-degraded {
  background-color: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.close-button {
  background: transparent;
  border: none;
  padding: 8px;
  cursor: pointer;
  color: var(--text-secondary);
  border-radius: 6px;
  transition: all var(--transition-fast);
}

.close-button:hover {
  background-color: var(--hover-bg-light);
  color: var(--text-primary);
}

.dark .close-button:hover {
  background-color: var(--hover-bg-dark);
}

.modal-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.status-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.model-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.model-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.model-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.model-details {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: var(--text-secondary);
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.model-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-indicator.status-active {
  background-color: #10b981;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
}

.status-text {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.metric-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.metric-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background-color: rgba(14, 165, 233, 0.1);
  color: var(--accent-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.metric-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.metric-label {
  font-size: 11px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.metric-value {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.performance-items {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.performance-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.performance-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
}

.performance-label {
  font-weight: 600;
  color: var(--text-primary);
}

.performance-value {
  font-weight: 500;
  color: var(--text-secondary);
  font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
}

.performance-bar {
  width: 100%;
  height: 8px;
  background-color: var(--bg-secondary);
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid var(--border-color);
}

.performance-fill {
  height: 100%;
  transition: all 0.3s ease;
  border-radius: 4px;
}

.performance-fill.perf-low {
  background: linear-gradient(90deg, #10b981, #059669);
}

.performance-fill.perf-medium {
  background: linear-gradient(90deg, #f59e0b, #d97706);
}

.performance-fill.perf-high {
  background: linear-gradient(90deg, #ef4444, #dc2626);
}

.connections-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.connection-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
}

.connection-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.connection-indicator.conn-connected {
  background-color: #10b981;
  box-shadow: 0 0 6px rgba(16, 185, 129, 0.5);
}

.connection-indicator.conn-disconnected {
  background-color: #6b7280;
}

.connection-indicator.conn-error {
  background-color: #ef4444;
  box-shadow: 0 0 6px rgba(239, 68, 68, 0.5);
}

.connection-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.connection-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.connection-details {
  font-size: 11px;
  color: var(--text-secondary);
  font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
}

.connection-status {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.update-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 12px;
  color: var(--text-secondary);
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
  gap: 12px;
}
</style>
