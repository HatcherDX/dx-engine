<!--
/**
 * @fileoverview Code review request modal.
 *
 * @description
 * Modal for requesting AI-powered code reviews. Allows users to select
 * review scope, focus areas, and severity level for comprehensive code analysis.
 *
 * @example
 * <ReviewModal
 *   :visible="showReview"
 *   @close="showReview = false"
 *   @review="handleStartReview"
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
          <BaseIcon name="Shield" size="md" class="header-icon" />
          <h2 class="modal-title">Code Review</h2>
        </div>
        <button class="close-button" aria-label="Close" @click="$emit('close')">
          <BaseIcon name="X" size="sm" />
        </button>
      </div>

      <!-- Content -->
      <div class="modal-content">
        <!-- Review Scope -->
        <div class="section">
          <h3 class="section-title">Review Scope</h3>
          <div class="scope-options">
            <label class="radio-option">
              <input v-model="scope" type="radio" value="current" />
              <div class="option-content">
                <span class="option-title">Current File</span>
                <span class="option-desc">Review currently open file</span>
              </div>
            </label>
            <label class="radio-option">
              <input v-model="scope" type="radio" value="changed" />
              <div class="option-content">
                <span class="option-title">Changed Files</span>
                <span class="option-desc">Review all uncommitted changes</span>
              </div>
            </label>
            <label class="radio-option">
              <input v-model="scope" type="radio" value="all" />
              <div class="option-content">
                <span class="option-title">All Files</span>
                <span class="option-desc">Full codebase review</span>
              </div>
            </label>
          </div>
        </div>

        <!-- Focus Areas -->
        <div class="section">
          <h3 class="section-title">Focus Areas</h3>
          <div class="checkboxes">
            <label v-for="area in focusAreas" :key="area.id" class="checkbox">
              <input v-model="area.enabled" type="checkbox" />
              <span>{{ area.label }}</span>
            </label>
          </div>
        </div>

        <!-- Severity Level -->
        <div class="section">
          <h3 class="section-title">Severity Level</h3>
          <select v-model="severity" class="select-input">
            <option value="all">All Issues</option>
            <option value="critical">Critical Only</option>
            <option value="high">High & Critical</option>
            <option value="medium">Medium & Above</option>
          </select>
        </div>

        <!-- Additional Instructions -->
        <div class="section">
          <h3 class="section-title">Additional Instructions (Optional)</h3>
          <textarea
            v-model="instructions"
            class="textarea"
            rows="4"
            placeholder="Specific areas to focus on or ignore..."
          ></textarea>
        </div>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <BaseButton variant="ghost" @click="$emit('close')">
          Cancel
        </BaseButton>
        <BaseButton variant="primary" @click="handleReview">
          <BaseIcon name="Shield" size="xs" />
          Start Review
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
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
  /** Emitted when review is requested */
  (
    event: 'review',
    data: {
      scope: string
      focusAreas: string[]
      severity: string
      instructions?: string
    }
  ): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const { success } = useNotifications()

const scope = ref('current')
const severity = ref('all')
const instructions = ref('')

const focusAreas = ref([
  { id: 'security', label: 'Security Issues', enabled: true },
  { id: 'performance', label: 'Performance', enabled: true },
  { id: 'bugs', label: 'Potential Bugs', enabled: true },
  { id: 'style', label: 'Code Style', enabled: false },
  { id: 'patterns', label: 'Design Patterns', enabled: true },
  { id: 'testing', label: 'Test Coverage', enabled: false },
])

/**
 * Handle review request.
 *
 * @private
 */
const handleReview = (): void => {
  const enabled = focusAreas.value.filter((a) => a.enabled).map((a) => a.id)

  emit('review', {
    scope: scope.value,
    focusAreas: enabled,
    severity: severity.value,
    instructions: instructions.value || undefined,
  })

  success('Starting code review...')
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

.section {
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

.scope-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.radio-option {
  display: flex;
  gap: 12px;
  padding: 12px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.radio-option:hover {
  border-color: var(--accent-primary);
}

.option-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.option-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.option-desc {
  font-size: 12px;
  color: var(--text-secondary);
}

.checkboxes {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-primary);
  cursor: pointer;
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

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
  gap: 12px;
}
</style>
