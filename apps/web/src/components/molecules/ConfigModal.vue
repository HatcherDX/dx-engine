<!--
/**
 * @fileoverview Configuration settings modal for Claude Code.
 *
 * @description
 * Modal for managing application configuration including permissions,
 * hooks, status line, and other Claude Code settings.
 *
 * @example
 * <ConfigModal
 *   :visible="showConfig"
 *   @close="showConfig = false"
 *   @save="handleSaveConfig"
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
          <BaseIcon name="Settings" size="md" class="header-icon" />
          <h2 class="modal-title">Configuration Settings</h2>
        </div>
        <button class="close-button" aria-label="Close" @click="$emit('close')">
          <BaseIcon name="X" size="sm" />
        </button>
      </div>

      <!-- Content -->
      <div class="modal-content">
        <!-- Permission Mode -->
        <div class="settings-section">
          <h3 class="section-title">Permission Mode</h3>
          <div class="setting-item">
            <label class="radio-label">
              <input
                v-model="config.permissionMode"
                type="radio"
                value="ask"
                name="permission"
              />
              <div class="option-content">
                <span class="option-title">Ask</span>
                <span class="option-description">
                  Prompt before every tool use
                </span>
              </div>
            </label>
          </div>
          <div class="setting-item">
            <label class="radio-label">
              <input
                v-model="config.permissionMode"
                type="radio"
                value="acceptEdits"
                name="permission"
              />
              <div class="option-content">
                <span class="option-title">Accept Edits</span>
                <span class="option-description">
                  Auto-accept file edits, ask for other tools
                </span>
              </div>
            </label>
          </div>
          <div class="setting-item">
            <label class="radio-label">
              <input
                v-model="config.permissionMode"
                type="radio"
                value="acceptAll"
                name="permission"
              />
              <div class="option-content">
                <span class="option-title">Accept All</span>
                <span class="option-description">
                  Auto-accept all tool uses (use with caution)
                </span>
              </div>
            </label>
          </div>
        </div>

        <!-- General Settings -->
        <div class="settings-section">
          <h3 class="section-title">General Settings</h3>
          <div class="toggle-item">
            <div class="toggle-info">
              <div class="toggle-label">
                <BaseIcon name="Eye" size="sm" />
                <span>Spinner Tips</span>
              </div>
              <p class="toggle-description">
                Show helpful tips while waiting for responses
              </p>
            </div>
            <label class="toggle">
              <input v-model="config.spinnerTipsEnabled" type="checkbox" />
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="toggle-item">
            <div class="toggle-info">
              <div class="toggle-label">
                <BaseIcon name="Activity" size="sm" />
                <span>Status Line</span>
              </div>
              <p class="toggle-description">
                Display status line with model and token info
              </p>
            </div>
            <label class="toggle">
              <input v-model="config.statusLineEnabled" type="checkbox" />
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="toggle-item">
            <div class="toggle-info">
              <div class="toggle-label">
                <BaseIcon name="Bell" size="sm" />
                <span>Notifications</span>
              </div>
              <p class="toggle-description">
                Show desktop notifications for important events
              </p>
            </div>
            <label class="toggle">
              <input v-model="config.notificationsEnabled" type="checkbox" />
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="toggle-item">
            <div class="toggle-info">
              <div class="toggle-label">
                <BaseIcon name="Shield" size="sm" />
                <span>Auto-save</span>
              </div>
              <p class="toggle-description">
                Automatically save conversation history
              </p>
            </div>
            <label class="toggle">
              <input v-model="config.autoSave" type="checkbox" />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <!-- Status Line Format -->
        <div v-if="config.statusLineEnabled" class="settings-section">
          <label for="status-format" class="input-label">
            Status Line Format
          </label>
          <input
            id="status-format"
            v-model="config.statusLineFormat"
            type="text"
            class="text-input"
            placeholder="e.g., {{model}} | {{tokens}}"
          />
          <p v-pre class="input-hint">
            Available variables: {{ model }}, {{ tokens }}, {{ cost }},
            {{ time }}
          </p>
        </div>

        <!-- Quick Actions -->
        <div class="actions-section">
          <h3 class="section-title">Quick Actions</h3>
          <div class="action-buttons">
            <BaseButton variant="ghost" size="sm" @click="handleResetConfig">
              <BaseIcon name="RotateCcw" size="xs" />
              Reset to Defaults
            </BaseButton>
            <BaseButton variant="ghost" size="sm" @click="handleExportConfig">
              <BaseIcon name="FileText" size="xs" />
              Export Config
            </BaseButton>
          </div>
        </div>

        <!-- Info Section -->
        <div class="info-section">
          <div class="info-item">
            <BaseIcon name="Info" size="xs" />
            <span>
              Settings are saved automatically and persist across sessions
            </span>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <BaseButton variant="ghost" @click="$emit('close')">
          Cancel
        </BaseButton>
        <BaseButton variant="primary" @click="handleSave">
          <BaseIcon name="Check" size="xs" />
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
 * Configuration settings type.
 *
 * @public
 */
interface ConfigSettings {
  permissionMode: 'ask' | 'acceptEdits' | 'acceptAll'
  spinnerTipsEnabled: boolean
  statusLineEnabled: boolean
  notificationsEnabled: boolean
  autoSave: boolean
  statusLineFormat: string
}

/**
 * Component emits.
 *
 * @public
 */
interface Emits {
  /** Emitted when modal should close */
  (event: 'close'): void
  /** Emitted when save action is triggered */
  (event: 'save', config: ConfigSettings): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const { success, warning } = useNotifications()

/**
 * Configuration settings state.
 *
 * @private
 */
const config = ref<ConfigSettings>({
  permissionMode: 'acceptEdits',
  spinnerTipsEnabled: true,
  statusLineEnabled: true,
  notificationsEnabled: true,
  autoSave: true,
  statusLineFormat: '{{model}} | {{tokens}}',
})

/**
 * Handle save settings.
 *
 * @private
 */
const handleSave = (): void => {
  // Save to localStorage
  window.localStorage.setItem(
    'hatcher-config-settings',
    JSON.stringify(config.value)
  )

  emit('save', config.value)
  success('Configuration saved successfully')
  emit('close')
}

/**
 * Handle reset configuration.
 *
 * @private
 */
const handleResetConfig = (): void => {
  config.value = {
    permissionMode: 'acceptEdits',
    spinnerTipsEnabled: true,
    statusLineEnabled: true,
    notificationsEnabled: true,
    autoSave: true,
    statusLineFormat: '{{model}} | {{tokens}}',
  }
  warning('Configuration reset to defaults')
}

/**
 * Handle export configuration.
 *
 * @private
 */
const handleExportConfig = (): void => {
  const configJson = JSON.stringify(config.value, null, 2)
  const blob = new window.Blob([configJson], { type: 'application/json' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'hatcher-config.json'
  a.click()
  window.URL.revokeObjectURL(url)
  success('Configuration exported')
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
  width: 650px;
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
  gap: 12px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 4px 0;
}

.setting-item {
  padding: 12px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  transition: all var(--transition-fast);
}

.setting-item:hover {
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

.toggle-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.toggle-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.toggle-description {
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

.input-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  display: block;
  margin-bottom: 8px;
}

.text-input {
  width: 100%;
  padding: 12px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 14px;
  color: var(--text-primary);
  font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
  transition: all var(--transition-fast);
}

.text-input:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.input-hint {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 4px 0 0 0;
}

.actions-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.action-buttons {
  display: flex;
  gap: 12px;
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
