<!--
/**
 * @fileoverview Cost tracking panel modal for AI API usage.
 *
 * @description
 * Modal displaying API usage statistics, token consumption, and estimated costs.
 * Tracks metrics per model and provides insights into AI usage patterns.
 *
 * @example
 * <CostPanelModal
 *   :visible="showCost"
 *   @close="showCost = false"
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
          <h2 class="modal-title">API Usage & Costs</h2>
        </div>
        <button class="close-button" aria-label="Close" @click="$emit('close')">
          <BaseIcon name="X" size="sm" />
        </button>
      </div>

      <!-- Content -->
      <div class="modal-content">
        <!-- Summary Cards -->
        <div class="summary-grid">
          <div class="metric-card">
            <div class="metric-icon">
              <BaseIcon name="Zap" size="sm" />
            </div>
            <div class="metric-info">
              <div class="metric-label">Total Calls</div>
              <div class="metric-value">{{ metrics.totalCalls }}</div>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon tokens">
              <BaseIcon name="FileText" size="sm" />
            </div>
            <div class="metric-info">
              <div class="metric-label">Total Tokens</div>
              <div class="metric-value">{{ formatNumber(totalTokens) }}</div>
              <div class="metric-sub">
                {{ formatNumber(metrics.inputTokens) }} in /
                {{ formatNumber(metrics.outputTokens) }} out
              </div>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon cost">
              <span class="cost-symbol">$</span>
            </div>
            <div class="metric-info">
              <div class="metric-label">Estimated Cost</div>
              <div class="metric-value cost-value">
                ${{ metrics.estimatedCost.toFixed(4) }}
              </div>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon average">
              <BaseIcon name="Target" size="sm" />
            </div>
            <div class="metric-info">
              <div class="metric-label">Avg Tokens/Call</div>
              <div class="metric-value">{{ averageTokensPerCall }}</div>
            </div>
          </div>
        </div>

        <!-- Per-Model Breakdown -->
        <div v-if="modelBreakdown.length > 0" class="breakdown-section">
          <h3 class="section-title">Breakdown by Model</h3>
          <div class="model-list">
            <div
              v-for="model in modelBreakdown"
              :key="model.name"
              class="model-item"
            >
              <div class="model-header">
                <BaseIcon name="Bot" size="sm" class="model-icon" />
                <span class="model-name">{{ model.name }}</span>
              </div>
              <div class="model-stats">
                <div class="stat">
                  <span class="stat-label">Calls:</span>
                  <span class="stat-value">{{ model.calls }}</span>
                </div>
                <div class="stat">
                  <span class="stat-label">Tokens:</span>
                  <span class="stat-value">{{
                    formatNumber(model.inputTokens + model.outputTokens)
                  }}</span>
                </div>
                <div class="stat cost-stat">
                  <span class="stat-label">Cost:</span>
                  <span class="stat-value">${{ model.cost.toFixed(4) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="empty-state">
          <BaseIcon name="Activity" size="lg" />
          <p>No API usage yet</p>
          <p class="empty-hint">
            Start a conversation to see metrics appear here
          </p>
        </div>

        <!-- Info Section -->
        <div class="info-section">
          <div class="info-item">
            <BaseIcon name="Clock" size="xs" />
            <span>Last reset: {{ formatDate(metrics.lastReset) }}</span>
          </div>
          <div class="info-item">
            <BaseIcon name="AlertCircle" size="xs" />
            <span>Costs are estimates based on Claude Sonnet 4 pricing</span>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <BaseButton variant="ghost" size="sm" @click="handleReset">
          <BaseIcon name="RotateCcw" size="xs" />
          Reset Metrics
        </BaseButton>
        <BaseButton variant="primary" @click="$emit('close')">
          Close
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseIcon from '../atoms/BaseIcon.vue'
import BaseButton from '../atoms/BaseButton.vue'
import { useAIMetrics } from '../../composables/useAIMetrics'
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

defineProps<Props>()
const emit = defineEmits<Emits>()

const { metrics, totalTokens, averageTokensPerCall, resetMetrics } =
  useAIMetrics()
const { success } = useNotifications()

/**
 * Model breakdown sorted by cost.
 *
 * @remarks
 * Converts byModel object to sorted array for display.
 *
 * @private
 */
const modelBreakdown = computed(() => {
  return Object.entries(metrics.value.byModel)
    .map(([name, stats]) => ({
      name,
      ...stats,
    }))
    .sort((a, b) => b.cost - a.cost)
})

/**
 * Format number with commas.
 *
 * @param num - Number to format
 * @returns Formatted string
 *
 * @private
 */
const formatNumber = (num: number): string => {
  return num.toLocaleString()
}

/**
 * Format date for display.
 *
 * @param dateString - ISO date string
 * @returns Formatted date string
 *
 * @private
 */
const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).format(date)
}

/**
 * Handle reset button click.
 *
 * @remarks
 * Resets all metrics and shows confirmation.
 *
 * @private
 */
const handleReset = (): void => {
  resetMetrics()
  success('Metrics reset successfully')
}

/**
 * Handle clicks on modal overlay.
 *
 * @remarks
 * Closes the modal when clicking outside.
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
  width: 600px;
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
}

/* Summary Grid */
.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.metric-card {
  display: flex;
  gap: 12px;
  padding: 16px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  transition: all var(--transition-fast);
}

.metric-card:hover {
  border-color: var(--accent-primary);
  transform: translateY(-2px);
}

.metric-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background-color: rgba(14, 165, 233, 0.1);
  color: var(--accent-primary);
  flex-shrink: 0;
}

.metric-icon.tokens {
  background-color: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.metric-icon.cost {
  background-color: rgba(168, 85, 247, 0.1);
}

.cost-symbol {
  font-size: 18px;
  font-weight: 700;
  color: #a855f7;
}

.metric-icon.average {
  background-color: rgba(251, 146, 60, 0.1);
  color: #fb923c;
}

.metric-info {
  flex: 1;
  min-width: 0;
}

.metric-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.metric-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
}

.metric-value.cost-value {
  color: #a855f7;
}

.metric-sub {
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 4px;
}

/* Breakdown Section */
.breakdown-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 12px 0;
}

.model-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.model-item {
  padding: 16px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.model-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.model-icon {
  color: var(--accent-primary);
}

.model-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.model-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 11px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.cost-stat .stat-value {
  color: #a855f7;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: var(--text-secondary);
  gap: 12px;
}

.empty-hint {
  font-size: 12px;
  opacity: 0.7;
}

/* Info Section */
.info-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  background-color: rgba(14, 165, 233, 0.05);
  border: 1px solid rgba(14, 165, 233, 0.2);
  border-radius: 8px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-secondary);
}

/* Footer */
.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
  gap: 12px;
}
</style>
