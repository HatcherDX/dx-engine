<!--
/**
 * @fileoverview Permissions management modal for tool access control.
 *
 * @description
 * Modal for viewing and managing tool permissions. Allows users to control
 * which tools require approval before execution and configure auto-approval rules.
 *
 * @example
 * <PermissionsModal
 *   :visible="showPermissions"
 *   @close="showPermissions = false"
 *   @save="handleSavePermissions"
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
          <h2 class="modal-title">Tool Permissions</h2>
        </div>
        <button class="close-button" aria-label="Close" @click="$emit('close')">
          <BaseIcon name="X" size="sm" />
        </button>
      </div>

      <!-- Content -->
      <div class="modal-content">
        <!-- Permission Mode -->
        <div class="mode-section">
          <h3 class="section-title">Permission Mode</h3>
          <div class="mode-badges">
            <button
              class="mode-badge"
              :class="{ active: permissionMode === 'ask' }"
              @click="permissionMode = 'ask'"
            >
              <BaseIcon name="AlertCircle" size="sm" />
              <span>Ask</span>
            </button>
            <button
              class="mode-badge"
              :class="{ active: permissionMode === 'acceptEdits' }"
              @click="permissionMode = 'acceptEdits'"
            >
              <BaseIcon name="FileEdit" size="sm" />
              <span>Accept Edits</span>
            </button>
            <button
              class="mode-badge"
              :class="{ active: permissionMode === 'acceptAll' }"
              @click="permissionMode = 'acceptAll'"
            >
              <BaseIcon name="CheckCircle" size="sm" />
              <span>Accept All</span>
            </button>
          </div>
          <p class="mode-description">
            {{ getModeDescription(permissionMode) }}
          </p>
        </div>

        <!-- Tool Categories -->
        <div class="tools-section">
          <h3 class="section-title">Tool Categories</h3>

          <!-- File Operations -->
          <div class="tool-category">
            <div class="category-header">
              <BaseIcon name="File" size="sm" />
              <h4 class="category-title">File Operations</h4>
              <span class="tool-count">{{ fileTools.length }} tools</span>
            </div>
            <div class="tool-list">
              <div v-for="tool in fileTools" :key="tool.name" class="tool-item">
                <div class="tool-info">
                  <span class="tool-name">{{ tool.name }}</span>
                  <span class="tool-description">{{ tool.description }}</span>
                </div>
                <label class="toggle">
                  <input v-model="tool.autoApprove" type="checkbox" />
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>

          <!-- Shell Operations -->
          <div class="tool-category">
            <div class="category-header">
              <BaseIcon name="Terminal" size="sm" />
              <h4 class="category-title">Shell Operations</h4>
              <span class="tool-count">{{ shellTools.length }} tools</span>
            </div>
            <div class="tool-list">
              <div
                v-for="tool in shellTools"
                :key="tool.name"
                class="tool-item"
              >
                <div class="tool-info">
                  <span class="tool-name">{{ tool.name }}</span>
                  <span class="tool-description">{{ tool.description }}</span>
                </div>
                <label class="toggle">
                  <input v-model="tool.autoApprove" type="checkbox" />
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>

          <!-- Git Operations -->
          <div class="tool-category">
            <div class="category-header">
              <BaseIcon name="GitBranch" size="sm" />
              <h4 class="category-title">Git Operations</h4>
              <span class="tool-count">{{ gitTools.length }} tools</span>
            </div>
            <div class="tool-list">
              <div v-for="tool in gitTools" :key="tool.name" class="tool-item">
                <div class="tool-info">
                  <span class="tool-name">{{ tool.name }}</span>
                  <span class="tool-description">{{ tool.description }}</span>
                </div>
                <label class="toggle">
                  <input v-model="tool.autoApprove" type="checkbox" />
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>

          <!-- Web & Network -->
          <div class="tool-category">
            <div class="category-header">
              <BaseIcon name="Globe" size="sm" />
              <h4 class="category-title">Web & Network</h4>
              <span class="tool-count">{{ webTools.length }} tools</span>
            </div>
            <div class="tool-list">
              <div v-for="tool in webTools" :key="tool.name" class="tool-item">
                <div class="tool-info">
                  <span class="tool-name">{{ tool.name }}</span>
                  <span class="tool-description">{{ tool.description }}</span>
                </div>
                <label class="toggle">
                  <input v-model="tool.autoApprove" type="checkbox" />
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="actions-section">
          <BaseButton variant="ghost" size="sm" @click="handleApproveAll">
            <BaseIcon name="CheckSquare" size="xs" />
            Auto-approve All
          </BaseButton>
          <BaseButton variant="ghost" size="sm" @click="handleRejectAll">
            <BaseIcon name="XSquare" size="xs" />
            Require Approval for All
          </BaseButton>
        </div>

        <!-- Info Section -->
        <div class="info-section">
          <div class="info-item">
            <BaseIcon name="Info" size="xs" />
            <span>
              Auto-approved tools execute immediately without confirmation
            </span>
          </div>
          <div class="info-item">
            <BaseIcon name="AlertTriangle" size="xs" />
            <span>
              Be cautious with auto-approving destructive operations like file
              deletion or Git commands
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
          <BaseIcon name="Save" size="xs" />
          Save Permissions
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
  /** Emitted when save action is triggered */
  (event: 'save', permissions: PermissionsConfig): void
}

/**
 * Tool permission configuration.
 *
 * @public
 */
interface Tool {
  name: string
  description: string
  autoApprove: boolean
}

/**
 * Full permissions configuration.
 *
 * @public
 */
interface PermissionsConfig {
  mode: 'ask' | 'acceptEdits' | 'acceptAll'
  fileTools: Tool[]
  shellTools: Tool[]
  gitTools: Tool[]
  webTools: Tool[]
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const { success, warning } = useNotifications()

const permissionMode = ref<'ask' | 'acceptEdits' | 'acceptAll'>('acceptEdits')

/**
 * File operation tools.
 *
 * @private
 */
const fileTools = ref<Tool[]>([
  {
    name: 'Read',
    description: 'Read file contents',
    autoApprove: true,
  },
  {
    name: 'Write',
    description: 'Create or overwrite files',
    autoApprove: false,
  },
  {
    name: 'Edit',
    description: 'Edit existing files',
    autoApprove: true,
  },
  {
    name: 'Delete',
    description: 'Delete files or directories',
    autoApprove: false,
  },
  {
    name: 'Glob',
    description: 'Search files by pattern',
    autoApprove: true,
  },
])

/**
 * Shell operation tools.
 *
 * @private
 */
const shellTools = ref<Tool[]>([
  {
    name: 'Bash',
    description: 'Execute shell commands',
    autoApprove: false,
  },
  {
    name: 'Grep',
    description: 'Search file contents',
    autoApprove: true,
  },
])

/**
 * Git operation tools.
 *
 * @private
 */
const gitTools = ref<Tool[]>([
  {
    name: 'git status',
    description: 'View repository status',
    autoApprove: true,
  },
  {
    name: 'git diff',
    description: 'View file changes',
    autoApprove: true,
  },
  {
    name: 'git add',
    description: 'Stage changes',
    autoApprove: false,
  },
  {
    name: 'git commit',
    description: 'Commit changes',
    autoApprove: false,
  },
  {
    name: 'git push',
    description: 'Push to remote',
    autoApprove: false,
  },
])

/**
 * Web and network tools.
 *
 * @private
 */
const webTools = ref<Tool[]>([
  {
    name: 'WebFetch',
    description: 'Fetch web content',
    autoApprove: true,
  },
  {
    name: 'WebSearch',
    description: 'Search the web',
    autoApprove: true,
  },
])

/**
 * Get description for permission mode.
 *
 * @param mode - Permission mode
 * @returns Mode description
 *
 * @private
 */
const getModeDescription = (mode: string): string => {
  switch (mode) {
    case 'ask':
      return 'Prompt before every tool use (most secure)'
    case 'acceptEdits':
      return 'Auto-approve file edits, ask for other tools (recommended)'
    case 'acceptAll':
      return 'Auto-approve all tool uses (use with caution)'
    default:
      return ''
  }
}

/**
 * Auto-approve all tools.
 *
 * @private
 */
const handleApproveAll = (): void => {
  fileTools.value.forEach((tool) => (tool.autoApprove = true))
  shellTools.value.forEach((tool) => (tool.autoApprove = true))
  gitTools.value.forEach((tool) => (tool.autoApprove = true))
  webTools.value.forEach((tool) => (tool.autoApprove = true))
  warning('All tools auto-approved - use with caution')
}

/**
 * Require approval for all tools.
 *
 * @private
 */
const handleRejectAll = (): void => {
  fileTools.value.forEach((tool) => (tool.autoApprove = false))
  shellTools.value.forEach((tool) => (tool.autoApprove = false))
  gitTools.value.forEach((tool) => (tool.autoApprove = false))
  webTools.value.forEach((tool) => (tool.autoApprove = false))
  success('All tools require approval')
}

/**
 * Save permissions configuration.
 *
 * @private
 */
const handleSave = (): void => {
  const config: PermissionsConfig = {
    mode: permissionMode.value,
    fileTools: fileTools.value,
    shellTools: shellTools.value,
    gitTools: gitTools.value,
    webTools: webTools.value,
  }

  // Save to localStorage
  window.localStorage.setItem('hatcher-permissions', JSON.stringify(config))

  emit('save', config)
  success('Permissions saved successfully')
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

.mode-section {
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

.mode-badges {
  display: flex;
  gap: 12px;
}

.mode-badge {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  background-color: var(--bg-secondary);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.mode-badge:hover {
  border-color: var(--accent-primary);
  color: var(--text-primary);
}

.mode-badge.active {
  background-color: rgba(14, 165, 233, 0.1);
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.mode-description {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0;
  padding: 12px;
  background-color: var(--bg-secondary);
  border-radius: 6px;
}

.tools-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tool-category {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
}

.category-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  flex: 1;
}

.tool-count {
  font-size: 11px;
  color: var(--text-secondary);
  background-color: var(--bg-primary);
  padding: 2px 8px;
  border-radius: 12px;
}

.tool-list {
  display: flex;
  flex-direction: column;
}

.tool-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
}

.tool-item:last-child {
  border-bottom: none;
}

.tool-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tool-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.tool-description {
  font-size: 11px;
  color: var(--text-secondary);
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

.actions-section {
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
