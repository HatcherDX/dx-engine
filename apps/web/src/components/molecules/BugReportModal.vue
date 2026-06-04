<!--
/**
 * @fileoverview Bug report modal component.
 *
 * @description
 * Modal for submitting bug reports. Collects bug details, steps to reproduce,
 * and optional system information for debugging.
 *
 * @example
 * <BugReportModal
 *   :visible="showBugReport"
 *   @close="showBugReport = false"
 *   @submit="handleBugReport"
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
          <BaseIcon name="Bug" size="md" class="header-icon" />
          <h2 class="modal-title">Report a Bug</h2>
        </div>
        <button class="close-button" aria-label="Close" @click="$emit('close')">
          <BaseIcon name="X" size="sm" />
        </button>
      </div>

      <!-- Content -->
      <div class="modal-content">
        <!-- Bug Title -->
        <div class="input-group">
          <label for="title" class="label">Title *</label>
          <input
            id="title"
            v-model="title"
            type="text"
            class="text-input"
            placeholder="Brief description of the bug"
          />
        </div>

        <!-- Bug Description -->
        <div class="input-group">
          <label for="description" class="label">Description *</label>
          <textarea
            id="description"
            v-model="description"
            class="textarea"
            rows="4"
            placeholder="Detailed description of what happened..."
          ></textarea>
        </div>

        <!-- Steps to Reproduce -->
        <div class="input-group">
          <label for="steps" class="label">Steps to Reproduce</label>
          <textarea
            id="steps"
            v-model="stepsToReproduce"
            class="textarea"
            rows="4"
            placeholder="1. Go to...&#10;2. Click on...&#10;3. See error..."
          ></textarea>
        </div>

        <!-- Severity Level -->
        <div class="input-group">
          <label for="severity" class="label">Severity</label>
          <select id="severity" v-model="severity" class="select-input">
            <option value="low">Low - Minor inconvenience</option>
            <option value="medium">Medium - Feature doesn't work</option>
            <option value="high">High - Major functionality broken</option>
            <option value="critical">Critical - App crashes/unusable</option>
          </select>
        </div>

        <!-- Include System Info -->
        <div class="checkbox-group">
          <label class="checkbox-label">
            <input v-model="includeSystemInfo" type="checkbox" />
            <span>Include system information</span>
          </label>
        </div>

        <!-- System Info Preview -->
        <div v-if="includeSystemInfo" class="system-info">
          <div class="info-header">
            <BaseIcon name="Settings" size="sm" />
            <span>System Information</span>
          </div>
          <div class="info-content">
            <div class="info-row">
              <span class="info-label">Platform:</span>
              <span class="info-value">{{ systemInfo.platform }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Version:</span>
              <span class="info-value">{{ systemInfo.version }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Node:</span>
              <span class="info-value">{{ systemInfo.node }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <BaseButton variant="ghost" @click="$emit('close')">
          Cancel
        </BaseButton>
        <BaseButton
          variant="primary"
          :disabled="!isValid"
          @click="handleSubmit"
        >
          <BaseIcon name="Bug" size="xs" />
          Submit Bug Report
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
  /** Emitted when bug report is submitted */
  (
    event: 'submit',
    data: {
      title: string
      description: string
      stepsToReproduce?: string
      severity: string
      systemInfo?: Record<string, string>
    }
  ): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const { success } = useNotifications()

const title = ref('')
const description = ref('')
const stepsToReproduce = ref('')
const severity = ref('medium')
const includeSystemInfo = ref(true)

const systemInfo = ref({
  platform: 'macOS 14.0',
  version: 'Hatcher DX v0.4.3',
  node: 'Node.js 20.10.0',
})

/**
 * Check if form is valid.
 *
 * @private
 */
const isValid = computed(
  () => title.value.length > 0 && description.value.length > 0
)

/**
 * Handle bug report submission.
 *
 * @private
 */
const handleSubmit = (): void => {
  if (!isValid.value) return

  emit('submit', {
    title: title.value,
    description: description.value,
    stepsToReproduce: stepsToReproduce.value || undefined,
    severity: severity.value,
    systemInfo: includeSystemInfo.value ? systemInfo.value : undefined,
  })

  success('Bug report submitted successfully!')
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

.modal-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.text-input {
  padding: 10px 12px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 14px;
  color: var(--text-primary);
  transition: all var(--transition-fast);
}

.text-input:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.textarea {
  padding: 10px 12px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 13px;
  color: var(--text-primary);
  font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
  resize: vertical;
  transition: all var(--transition-fast);
}

.textarea:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.select-input {
  padding: 10px 12px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 14px;
  color: var(--text-primary);
  transition: all var(--transition-fast);
}

.select-input:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.checkbox-group {
  display: flex;
  align-items: center;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-primary);
  cursor: pointer;
}

.system-info {
  padding: 16px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.info-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.info-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.info-label {
  color: var(--text-secondary);
  min-width: 80px;
}

.info-value {
  color: var(--text-primary);
  font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
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
