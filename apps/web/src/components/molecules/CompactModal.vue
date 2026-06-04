<!--
/**
 * @fileoverview Compact conversation modal for context management.
 *
 * @description
 * Modal for compacting conversation history when approaching context limits.
 * Allows users to specify what to preserve during compaction and shows
 * current context usage statistics.
 *
 * @example
 * <CompactModal
 *   :visible="showCompact"
 *   @close="showCompact = false"
 *   @compact="handleCompact"
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
          <BaseIcon name="Archive" size="md" class="header-icon" />
          <h2 class="modal-title">Compact Conversation</h2>
        </div>
        <button class="close-button" aria-label="Close" @click="$emit('close')">
          <BaseIcon name="X" size="sm" />
        </button>
      </div>

      <!-- Content -->
      <div class="modal-content">
        <!-- Context Usage -->
        <div class="usage-section">
          <h3 class="section-title">Current Context Usage</h3>
          <div class="usage-bar">
            <div
              class="usage-fill"
              :class="getUsageClass(contextUsage)"
              :style="{ width: `${contextUsage}%` }"
            ></div>
          </div>
          <div class="usage-stats">
            <span class="stat"
              >{{ formatTokens(usedTokens) }} /
              {{ formatTokens(maxTokens) }} tokens</span
            >
            <span class="stat-percentage" :class="getUsageClass(contextUsage)">
              {{ contextUsage }}%
            </span>
          </div>
        </div>

        <!-- Preservation Instructions -->
        <div class="instructions-section">
          <label for="compact-instructions" class="input-label">
            Preservation Instructions (Optional)
          </label>
          <textarea
            id="compact-instructions"
            v-model="instructions"
            class="instructions-textarea"
            placeholder="Specify what to preserve during compaction, e.g., 'Keep discussion about authentication' or 'Preserve code examples'"
            rows="4"
          ></textarea>
          <p class="input-hint">
            Leave empty for automatic intelligent compaction, or provide
            specific guidance
          </p>
        </div>

        <!-- Compaction Options -->
        <div class="options-section">
          <h3 class="section-title">Compaction Strategy</h3>
          <div class="option-item">
            <label class="radio-label">
              <input
                v-model="strategy"
                type="radio"
                value="auto"
                name="strategy"
              />
              <div class="option-content">
                <span class="option-title">Automatic</span>
                <span class="option-description">
                  AI determines what to keep based on relevance
                </span>
              </div>
            </label>
          </div>
          <div class="option-item">
            <label class="radio-label">
              <input
                v-model="strategy"
                type="radio"
                value="aggressive"
                name="strategy"
              />
              <div class="option-content">
                <span class="option-title">Aggressive</span>
                <span class="option-description">
                  Maximum compression, keep only essential context
                </span>
              </div>
            </label>
          </div>
          <div class="option-item">
            <label class="radio-label">
              <input
                v-model="strategy"
                type="radio"
                value="conservative"
                name="strategy"
              />
              <div class="option-content">
                <span class="option-title">Conservative</span>
                <span class="option-description">
                  Minimal compression, preserve more history
                </span>
              </div>
            </label>
          </div>
        </div>

        <!-- Info Section -->
        <div class="info-section">
          <div class="info-item">
            <BaseIcon name="Info" size="xs" />
            <span>
              Compaction creates a summary of the conversation to free up
              context space
            </span>
          </div>
          <div class="info-item">
            <BaseIcon name="AlertCircle" size="xs" />
            <span
              >This action cannot be undone. Use /rewind before compacting if
              needed</span
            >
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <BaseButton variant="ghost" @click="$emit('close')">
          Cancel
        </BaseButton>
        <BaseButton variant="primary" @click="handleCompact">
          <BaseIcon name="Archive" size="xs" />
          Compact Conversation
        </BaseButton>
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
  /** Emitted when compact action is triggered */
  (event: 'compact', data: { instructions?: string; strategy: string }): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const { success } = useNotifications()

const instructions = ref('')
const strategy = ref<'auto' | 'aggressive' | 'conservative'>('auto')

// Mock data - in real implementation, get from context
const usedTokens = ref(185000)
const maxTokens = ref(200000)

/**
 * Calculate context usage percentage.
 *
 * @private
 */
const contextUsage = computed(() => {
  return Math.round((usedTokens.value / maxTokens.value) * 100)
})

/**
 * Format token count with K/M suffix.
 *
 * @param tokens - Token count to format
 * @returns Formatted string
 *
 * @private
 */
const formatTokens = (tokens: number): string => {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`
  }
  return tokens.toString()
}

/**
 * Get CSS class based on usage percentage.
 *
 * @param percentage - Usage percentage
 * @returns CSS class name
 *
 * @private
 */
const getUsageClass = (percentage: number): string => {
  if (percentage >= 95) return 'critical'
  if (percentage >= 85) return 'warning'
  return 'normal'
}

/**
 * Handle compact action.
 *
 * @private
 */
const handleCompact = (): void => {
  const compactInstructions = instructions.value.trim()

  emit('compact', {
    instructions: compactInstructions || undefined,
    strategy: strategy.value,
  })

  success('Compacting conversation...')
  emit('close')
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
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.usage-section {
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

.usage-bar {
  width: 100%;
  height: 24px;
  background-color: var(--bg-secondary);
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--border-color);
}

.usage-fill {
  height: 100%;
  transition: all 0.3s ease;
  border-radius: 12px;
}

.usage-fill.normal {
  background: linear-gradient(90deg, #10b981, #059669);
}

.usage-fill.warning {
  background: linear-gradient(90deg, #f59e0b, #d97706);
}

.usage-fill.critical {
  background: linear-gradient(90deg, #ef4444, #dc2626);
}

.usage-stats {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
}

.stat {
  color: var(--text-secondary);
}

.stat-percentage {
  font-weight: 600;
}

.stat-percentage.normal {
  color: #10b981;
}

.stat-percentage.warning {
  color: #f59e0b;
}

.stat-percentage.critical {
  color: #ef4444;
}

.instructions-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.instructions-textarea {
  padding: 12px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 14px;
  color: var(--text-primary);
  font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
  resize: vertical;
  transition: all var(--transition-fast);
}

.instructions-textarea:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.input-hint {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0;
}

.options-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.option-item {
  padding: 12px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  transition: all var(--transition-fast);
}

.option-item:hover {
  border-color: var(--accent-primary);
}

.radio-label {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  cursor: pointer;
}

.radio-label input[type='radio'] {
  margin-top: 2px;
  cursor: pointer;
}

.option-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.option-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.option-description {
  font-size: 12px;
  color: var(--text-secondary);
}

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

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
  gap: 12px;
}
</style>
