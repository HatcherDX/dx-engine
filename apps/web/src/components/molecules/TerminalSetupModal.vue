<!--
/**
 * @fileoverview Terminal setup and configuration modal.
 *
 * @description
 * Modal for configuring terminal settings including shell selection,
 * font preferences, color themes, and keyboard shortcuts.
 *
 * @example
 * <TerminalSetupModal
 *   :visible="showTerminalSetup"
 *   @close="showTerminalSetup = false"
 *   @save="handleSaveTerminalSettings"
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
          <BaseIcon name="Terminal" size="md" class="header-icon" />
          <h2 class="modal-title">Terminal Settings</h2>
        </div>
        <button class="close-button" aria-label="Close" @click="$emit('close')">
          <BaseIcon name="X" size="sm" />
        </button>
      </div>

      <!-- Content -->
      <div class="modal-content">
        <!-- Shell Configuration -->
        <div class="section">
          <h3 class="section-title">Shell</h3>
          <div class="input-group">
            <label for="shell" class="label">Default Shell</label>
            <select id="shell" v-model="shell" class="select-input">
              <option value="bash">Bash</option>
              <option value="zsh">Zsh</option>
              <option value="fish">Fish</option>
              <option value="powershell">PowerShell</option>
            </select>
          </div>
        </div>

        <!-- Font Settings -->
        <div class="section">
          <h3 class="section-title">Font</h3>
          <div class="font-settings">
            <div class="input-group">
              <label for="fontFamily" class="label">Font Family</label>
              <select id="fontFamily" v-model="fontFamily" class="select-input">
                <option value="'SF Mono', Monaco">SF Mono</option>
                <option value="'Fira Code', monospace">Fira Code</option>
                <option value="'JetBrains Mono', monospace">
                  JetBrains Mono
                </option>
                <option value="'Cascadia Code', monospace">
                  Cascadia Code
                </option>
              </select>
            </div>
            <div class="input-group">
              <label for="fontSize" class="label"
                >Font Size: {{ fontSize }}px</label
              >
              <input
                id="fontSize"
                v-model="fontSize"
                type="range"
                min="10"
                max="24"
                class="slider"
              />
            </div>
          </div>
        </div>

        <!-- Color Theme -->
        <div class="section">
          <h3 class="section-title">Color Theme</h3>
          <div class="theme-options">
            <label v-for="theme in themes" :key="theme.id" class="theme-option">
              <input v-model="selectedTheme" type="radio" :value="theme.id" />
              <div class="theme-preview">
                <div
                  class="theme-color"
                  :style="{ backgroundColor: theme.bg }"
                ></div>
                <div
                  class="theme-color"
                  :style="{ backgroundColor: theme.fg }"
                ></div>
                <div
                  class="theme-color"
                  :style="{ backgroundColor: theme.accent }"
                ></div>
              </div>
              <span class="theme-name">{{ theme.name }}</span>
            </label>
          </div>
        </div>

        <!-- Cursor Style -->
        <div class="section">
          <h3 class="section-title">Cursor</h3>
          <div class="cursor-options">
            <label
              v-for="cursor in cursorStyles"
              :key="cursor.id"
              class="radio-option"
            >
              <input v-model="cursorStyle" type="radio" :value="cursor.id" />
              <span>{{ cursor.name }}</span>
            </label>
          </div>
        </div>

        <!-- Additional Options -->
        <div class="section">
          <h3 class="section-title">Options</h3>
          <div class="checkboxes">
            <label class="checkbox">
              <input v-model="enableBell" type="checkbox" />
              <span>Enable bell</span>
            </label>
            <label class="checkbox">
              <input v-model="blinkCursor" type="checkbox" />
              <span>Blinking cursor</span>
            </label>
            <label class="checkbox">
              <input v-model="copyOnSelect" type="checkbox" />
              <span>Copy on select</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <BaseButton variant="ghost" @click="$emit('close')">
          Cancel
        </BaseButton>
        <BaseButton variant="primary" @click="handleSave">
          <BaseIcon name="Settings" size="xs" />
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
  /** Emitted when settings are saved */
  (
    event: 'save',
    data: {
      shell: string
      fontFamily: string
      fontSize: number
      theme: string
      cursorStyle: string
      options: {
        enableBell: boolean
        blinkCursor: boolean
        copyOnSelect: boolean
      }
    }
  ): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const { success } = useNotifications()

const shell = ref('zsh')
const fontFamily = ref("'SF Mono', Monaco")
const fontSize = ref(14)
const selectedTheme = ref('dracula')
const cursorStyle = ref('block')
const enableBell = ref(false)
const blinkCursor = ref(true)
const copyOnSelect = ref(true)

const themes = [
  {
    id: 'dracula',
    name: 'Dracula',
    bg: '#282a36',
    fg: '#f8f8f2',
    accent: '#bd93f9',
  },
  { id: 'nord', name: 'Nord', bg: '#2e3440', fg: '#d8dee9', accent: '#88c0d0' },
  {
    id: 'monokai',
    name: 'Monokai',
    bg: '#272822',
    fg: '#f8f8f2',
    accent: '#a6e22e',
  },
  {
    id: 'solarized',
    name: 'Solarized',
    bg: '#002b36',
    fg: '#839496',
    accent: '#b58900',
  },
]

const cursorStyles = [
  { id: 'block', name: 'Block' },
  { id: 'underline', name: 'Underline' },
  { id: 'bar', name: 'Bar' },
]

/**
 * Handle save settings.
 *
 * @private
 */
const handleSave = (): void => {
  emit('save', {
    shell: shell.value,
    fontFamily: fontFamily.value,
    fontSize: fontSize.value,
    theme: selectedTheme.value,
    cursorStyle: cursorStyle.value,
    options: {
      enableBell: enableBell.value,
      blinkCursor: blinkCursor.value,
      copyOnSelect: copyOnSelect.value,
    },
  })

  success('Terminal settings saved!')
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
  gap: 24px;
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

.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
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

.font-settings {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.slider {
  width: 100%;
  height: 6px;
  background: var(--bg-secondary);
  border-radius: 3px;
  outline: none;
}

.theme-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.theme-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.theme-option:hover {
  border-color: var(--accent-primary);
}

.theme-preview {
  display: flex;
  gap: 4px;
}

.theme-color {
  width: 20px;
  height: 20px;
  border-radius: 4px;
}

.theme-name {
  font-size: 13px;
  color: var(--text-primary);
}

.cursor-options {
  display: flex;
  gap: 12px;
}

.radio-option {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-primary);
  cursor: pointer;
}

.checkboxes {
  display: flex;
  flex-direction: column;
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

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
  gap: 12px;
}
</style>
