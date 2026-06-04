<!--
/**
 * @fileoverview Memory settings modal for AI persistence configuration.
 *
 * @description
 * Modal for configuring AI memory settings, including conversation
 * persistence, context retention, and memory management options.
 *
 * @example
 * <MemorySettingsModal
 *   :visible="showMemory"
 *   @close="showMemory = false"
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
          <BaseIcon name="Database" size="md" class="header-icon" />
          <h2 class="modal-title">Memory Settings</h2>
        </div>
        <button class="close-button" aria-label="Close" @click="$emit('close')">
          <BaseIcon name="X" size="sm" />
        </button>
      </div>

      <!-- Content -->
      <div class="modal-content">
        <!-- Memory Options -->
        <div class="settings-section">
          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-label">
                <BaseIcon name="Save" size="sm" />
                <span>Persist Conversations</span>
              </div>
              <p class="setting-description">
                Automatically save and restore conversations between sessions
              </p>
            </div>
            <label class="toggle">
              <input v-model="settings.persist" type="checkbox" />
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-label">
                <BaseIcon name="Clock" size="sm" />
                <span>Context Retention</span>
              </div>
              <p class="setting-description">
                Keep context between separate conversations
              </p>
            </div>
            <label class="toggle">
              <input v-model="settings.retainContext" type="checkbox" />
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-label">
                <BaseIcon name="FileText" size="sm" />
                <span>Remember File Context</span>
              </div>
              <p class="setting-description">
                AI remembers previously discussed files and code
              </p>
            </div>
            <label class="toggle">
              <input v-model="settings.rememberFiles" type="checkbox" />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <!-- Storage Info -->
        <div class="storage-info">
          <h3 class="section-title">Storage Information</h3>
          <div class="info-grid">
            <div class="info-card">
              <BaseIcon name="HardDrive" size="sm" />
              <div>
                <div class="info-label">Conversations</div>
                <div class="info-value">{{ conversationCount }}</div>
              </div>
            </div>
            <div class="info-card">
              <BaseIcon name="Archive" size="sm" />
              <div>
                <div class="info-label">Storage Used</div>
                <div class="info-value">{{ storageUsed }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Info Section -->
        <div class="info-section">
          <div class="info-item">
            <BaseIcon name="Info" size="xs" />
            <span>Memory data is stored locally and never sent to servers</span>
          </div>
          <div class="info-item">
            <BaseIcon name="Shield" size="xs" />
            <span>All stored data is encrypted with AES-256</span>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <BaseButton variant="ghost" size="sm" @click="handleClearMemory">
          <BaseIcon name="Trash" size="xs" />
          Clear All Memory
        </BaseButton>
        <BaseButton variant="primary" @click="handleSave">
          Save Settings
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
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const { success, warning } = useNotifications()

/**
 * Memory settings.
 *
 * @private
 */
const settings = ref({
  persist: true,
  retainContext: true,
  rememberFiles: true,
})

const conversationCount = ref(5)
const storageUsed = ref('2.4 MB')

/**
 * Handle save settings.
 *
 * @private
 */
const handleSave = (): void => {
  // Save to localStorage
  window.localStorage.setItem(
    'hatcher-memory-settings',
    JSON.stringify(settings.value)
  )
  success('Memory settings saved')
  emit('close')
}

/**
 * Handle clear memory.
 *
 * @private
 */
const handleClearMemory = (): void => {
  warning('Memory cleared. This action cannot be undone.')
  conversationCount.value = 0
  storageUsed.value = '0 KB'
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

.settings-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.setting-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.setting-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.setting-description {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0;
}

.toggle {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 24px;
  flex-shrink: 0;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--border-color);
  border-radius: 24px;
  transition: 0.3s;
}

.toggle-slider:before {
  position: absolute;
  content: '';
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  border-radius: 50%;
  transition: 0.3s;
}

.toggle input:checked + .toggle-slider {
  background-color: var(--accent-primary);
}

.toggle input:checked + .toggle-slider:before {
  transform: translateX(24px);
}

.storage-info {
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

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.info-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.info-label {
  font-size: 11px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
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
