<!--
/**
 * @fileoverview Add directory to context modal for AI awareness.
 *
 * @description
 * Modal allowing users to add specific directories to the AI's context
 * for better code awareness and understanding of project structure.
 *
 * @example
 * <AddDirectoryModal
 *   :visible="showAddDir"
 *   @close="showAddDir = false"
 *   @add="handleAddDirectory"
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
          <BaseIcon name="FolderPlus" size="md" class="header-icon" />
          <h2 class="modal-title">Add Directory to Context</h2>
        </div>
        <button class="close-button" aria-label="Close" @click="$emit('close')">
          <BaseIcon name="X" size="sm" />
        </button>
      </div>

      <!-- Content -->
      <div class="modal-content">
        <div class="input-section">
          <label for="directory-path" class="input-label">Directory Path</label>
          <input
            id="directory-path"
            v-model="directoryPath"
            type="text"
            class="directory-input"
            placeholder="e.g., src/components"
            @keyup.enter="handleAdd"
          />
          <p class="input-hint">
            Relative path from project root. Use glob patterns like
            <code>src/**/*.ts</code>
          </p>
        </div>

        <!-- Current Directories -->
        <div v-if="contextDirectories.length > 0" class="directories-list">
          <h3 class="section-title">Current Context Directories</h3>
          <div class="directory-items">
            <div
              v-for="(dir, index) in contextDirectories"
              :key="index"
              class="directory-item"
            >
              <BaseIcon name="Folder" size="sm" />
              <span class="directory-path">{{ dir }}</span>
              <button
                class="remove-button"
                aria-label="Remove directory"
                @click="handleRemove(index)"
              >
                <BaseIcon name="X" size="xs" />
              </button>
            </div>
          </div>
        </div>

        <!-- Info -->
        <div class="info-section">
          <div class="info-item">
            <BaseIcon name="Info" size="xs" />
            <span>
              Adding directories helps the AI understand your project structure
            </span>
          </div>
          <div class="info-item">
            <BaseIcon name="AlertCircle" size="xs" />
            <span>Large directories may consume significant context space</span>
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
          :disabled="!directoryPath"
          @click="handleAdd"
        >
          <BaseIcon name="Plus" size="xs" />
          Add Directory
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
  /** Emitted when directory is added */
  (event: 'add', directory: string): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const { success } = useNotifications()

const directoryPath = ref('')
const contextDirectories = ref<string[]>([
  'src/components',
  'src/composables',
  'src/utils',
])

/**
 * Handle add directory.
 *
 * @private
 */
const handleAdd = (): void => {
  const path = directoryPath.value.trim()

  if (!path) return

  if (contextDirectories.value.includes(path)) {
    success('Directory already in context')
    return
  }

  contextDirectories.value.push(path)
  emit('add', path)
  success(`Added ${path} to context`)
  directoryPath.value = ''
}

/**
 * Handle remove directory.
 *
 * @param index - Index of directory to remove
 *
 * @private
 */
const handleRemove = (index: number): void => {
  const removed = contextDirectories.value.splice(index, 1)
  success(`Removed ${removed[0]} from context`)
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

.input-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.directory-input {
  padding: 12px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 14px;
  color: var(--text-primary);
  font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
  transition: all var(--transition-fast);
}

.directory-input:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.input-hint {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0;
}

.input-hint code {
  padding: 2px 6px;
  background-color: var(--bg-tertiary);
  border-radius: 3px;
  font-size: 11px;
}

.directories-list {
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

.directory-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.directory-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
}

.directory-path {
  flex: 1;
  font-size: 13px;
  font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
  color: var(--text-primary);
}

.remove-button {
  background: transparent;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: var(--text-secondary);
  border-radius: 4px;
  transition: all var(--transition-fast);
}

.remove-button:hover {
  background-color: rgba(239, 68, 68, 0.1);
  color: #ef4444;
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
