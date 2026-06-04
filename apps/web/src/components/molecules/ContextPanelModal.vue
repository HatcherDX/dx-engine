<!--
/**
 * @fileoverview Context usage panel modal for AI conversations.
 *
 * @description
 * Modal displaying context window usage, message history, and memory consumption.
 * Helps users understand how much context is being used in conversations.
 *
 * @example
 * <ContextPanelModal
 *   :visible="showContext"
 *   @close="showContext = false"
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
          <BaseIcon name="FileText" size="md" class="header-icon" />
          <h2 class="modal-title">Context Usage</h2>
        </div>
        <button class="close-button" aria-label="Close" @click="$emit('close')">
          <BaseIcon name="X" size="sm" />
        </button>
      </div>

      <!-- Content -->
      <div class="modal-content">
        <!-- Context Window Card -->
        <div class="context-card">
          <div class="card-header">
            <BaseIcon name="Activity" size="sm" />
            <span>Context Window</span>
          </div>
          <div class="progress-section">
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{ width: `${contextPercentage}%` }"
                :class="progressClass"
              ></div>
            </div>
            <div class="progress-labels">
              <span class="current"
                >{{ formatNumber(currentTokens) }} tokens</span
              >
              <span class="max">/ {{ formatNumber(maxTokens) }}</span>
            </div>
          </div>
          <div class="percentage-display" :class="progressClass">
            {{ contextPercentage.toFixed(1) }}% used
          </div>
        </div>

        <!-- Message Stats -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">
              <BaseIcon name="FileText" size="sm" />
            </div>
            <div class="stat-content">
              <div class="stat-label">Total Messages</div>
              <div class="stat-value">{{ totalMessages }}</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon user">
              <BaseIcon name="User" size="sm" />
            </div>
            <div class="stat-content">
              <div class="stat-label">User Messages</div>
              <div class="stat-value">{{ userMessages }}</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon assistant">
              <BaseIcon name="Bot" size="sm" />
            </div>
            <div class="stat-content">
              <div class="stat-label">AI Messages</div>
              <div class="stat-value">{{ aiMessages }}</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon tokens">
              <BaseIcon name="Target" size="sm" />
            </div>
            <div class="stat-content">
              <div class="stat-label">Avg Tokens/Msg</div>
              <div class="stat-value">{{ avgTokensPerMessage }}</div>
            </div>
          </div>
        </div>

        <!-- Recommendations -->
        <div v-if="recommendations.length > 0" class="recommendations">
          <h3 class="section-title">
            <BaseIcon name="AlertCircle" size="sm" />
            Recommendations
          </h3>
          <div class="recommendation-list">
            <div
              v-for="(rec, index) in recommendations"
              :key="index"
              class="recommendation-item"
            >
              <BaseIcon :name="rec.icon" size="xs" />
              <span>{{ rec.message }}</span>
            </div>
          </div>
        </div>

        <!-- Info Section -->
        <div class="info-section">
          <div class="info-item">
            <BaseIcon name="AlertCircle" size="xs" />
            <span
              >Context includes all messages, code snippets, and system
              prompts</span
            >
          </div>
          <div class="info-item">
            <BaseIcon name="Zap" size="xs" />
            <span
              >Use /clear or /rewind to free up context when approaching
              limits</span
            >
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <BaseButton variant="ghost" size="sm" @click="handleClear">
          <BaseIcon name="Trash" size="xs" />
          Clear Context
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
  /** Number of messages in conversation */
  messageCount?: number
  /** Number of user messages */
  userMessageCount?: number
  /** Number of AI messages */
  aiMessageCount?: number
}

/**
 * Component emits.
 *
 * @public
 */
interface Emits {
  /** Emitted when modal should close */
  (event: 'close'): void
  /** Emitted when clear is requested */
  (event: 'clear'): void
}

const props = withDefaults(defineProps<Props>(), {
  messageCount: 0,
  userMessageCount: 0,
  aiMessageCount: 0,
})

const emit = defineEmits<Emits>()

const { metrics } = useAIMetrics()
const { success } = useNotifications()

// Context window limits (Claude Sonnet 4 has 200k context window)
const maxTokens = 200_000

/**
 * Current tokens in context.
 *
 * @remarks
 * Estimated based on total tokens from metrics.
 *
 * @private
 */
const currentTokens = computed(() => {
  // Simplified: assume all tokens are still in context
  // In reality, only recent messages would be in context
  return Math.min(
    metrics.value.inputTokens + metrics.value.outputTokens,
    maxTokens
  )
})

/**
 * Context usage percentage.
 *
 * @private
 */
const contextPercentage = computed(() => {
  return (currentTokens.value / maxTokens) * 100
})

/**
 * Total messages in conversation.
 *
 * @private
 */
const totalMessages = computed(() => {
  return props.messageCount
})

/**
 * User messages count.
 *
 * @private
 */
const userMessages = computed(() => {
  return props.userMessageCount
})

/**
 * AI messages count.
 *
 * @private
 */
const aiMessages = computed(() => {
  return props.aiMessageCount
})

/**
 * Average tokens per message.
 *
 * @private
 */
const avgTokensPerMessage = computed(() => {
  if (totalMessages.value === 0) return 0
  return Math.round(currentTokens.value / totalMessages.value)
})

/**
 * CSS class for progress bar based on usage.
 *
 * @private
 */
const progressClass = computed(() => {
  const pct = contextPercentage.value
  if (pct >= 90) return 'critical'
  if (pct >= 70) return 'warning'
  return 'normal'
})

/**
 * Recommendations based on context usage.
 *
 * @private
 */
const recommendations = computed(() => {
  const recs: Array<{ icon: string; message: string }> = []

  if (contextPercentage.value >= 90) {
    recs.push({
      icon: 'AlertCircle',
      message: 'Context is nearly full. Consider clearing or rewinding soon.',
    })
  } else if (contextPercentage.value >= 70) {
    recs.push({
      icon: 'AlertCircle',
      message: 'Context is filling up. You may want to clear old messages.',
    })
  }

  if (totalMessages.value > 50) {
    recs.push({
      icon: 'RotateCcw',
      message:
        'Long conversation detected. Use /rewind to remove old messages.',
    })
  }

  return recs
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
 * Handle clear button click.
 *
 * @remarks
 * Emits clear event to parent.
 *
 * @private
 */
const handleClear = (): void => {
  emit('clear')
  emit('close')
  success('Context cleared successfully')
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
  width: 550px;
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
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Context Card */
.context-card {
  padding: 20px;
  background: linear-gradient(
    135deg,
    rgba(14, 165, 233, 0.1) 0%,
    rgba(14, 165, 233, 0.05) 100%
  );
  border: 1px solid rgba(14, 165, 233, 0.2);
  border-radius: 12px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.progress-section {
  margin-bottom: 12px;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.progress-fill.normal {
  background: linear-gradient(90deg, #22c55e 0%, #10b981 100%);
}

.progress-fill.warning {
  background: linear-gradient(90deg, #fb923c 0%, #f59e0b 100%);
}

.progress-fill.critical {
  background: linear-gradient(90deg, #ef4444 0%, #dc2626 100%);
}

.progress-labels {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-secondary);
}

.progress-labels .current {
  font-weight: 600;
  color: var(--text-primary);
}

.percentage-display {
  font-size: 24px;
  font-weight: 700;
  text-align: center;
  margin-top: 8px;
}

.percentage-display.normal {
  color: #22c55e;
}

.percentage-display.warning {
  color: #fb923c;
}

.percentage-display.critical {
  color: #ef4444;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
}

.stat-card {
  display: flex;
  gap: 12px;
  padding: 16px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background-color: rgba(14, 165, 233, 0.1);
  color: var(--accent-primary);
  flex-shrink: 0;
}

.stat-icon.user {
  background-color: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.stat-icon.assistant {
  background-color: rgba(168, 85, 247, 0.1);
  color: #a855f7;
}

.stat-icon.tokens {
  background-color: rgba(251, 146, 60, 0.1);
  color: #fb923c;
}

.stat-content {
  flex: 1;
  min-width: 0;
}

.stat-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

/* Recommendations */
.recommendations {
  padding: 16px;
  background-color: rgba(251, 146, 60, 0.05);
  border: 1px solid rgba(251, 146, 60, 0.2);
  border-radius: 8px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #fb923c;
  margin: 0 0 12px 0;
}

.recommendation-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recommendation-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
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
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
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
