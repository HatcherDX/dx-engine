<!--
/**
 * @fileoverview Reusable file explorer component.
 *
 * @description
 * A flexible file tree component that can be used across different modes
 * (Code, Git, etc.) with context-aware styling and behavior. Supports
 * file selection, expansion, and context menus.
 *
 * @example
 * ```vue
 * <template>
 *   <FileExplorer
 *     :files="gitChangedFiles"
 *     :context="'git-changes'"
 *     :selected-file-id="currentFile"
 *     @file-selected="handleFileSelection"
 *     @file-action="handleFileAction"
 *   />
 * </template>
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */
-->
<template>
  <div class="file-explorer" :class="`context-${context}`">
    <div
      v-for="file in files"
      :key="file.id"
      class="file-item"
      :class="{
        'file-selected': file.id === selectedFileId,
        'file-directory': file.type === 'directory',
        'file-staged': context === 'git-changes' && file.staged,
        'file-modified':
          context === 'git-changes' && file.status === 'modified',
        'file-added': context === 'git-changes' && file.status === 'added',
        'file-deleted': context === 'git-changes' && file.status === 'deleted',
      }"
      :style="{ paddingLeft: `${(file.depth || 0) * 16 + 8}px` }"
      @click="selectFile(file)"
      @contextmenu.prevent="showContextMenu(file, $event)"
    >
      <div class="file-content">
        <!-- Git context: Show checkbox for staging -->
        <input
          v-if="context === 'git-changes' && file.type === 'file'"
          :id="`file-${file.id}`"
          v-model="file.staged"
          type="checkbox"
          class="file-checkbox"
          @change="handleStageChange(file)"
        />

        <!-- Directory expand icon -->
        <BaseIcon
          v-if="file.type === 'directory'"
          name="ArrowRight"
          size="xs"
          class="expand-icon"
          :class="{ expanded: file.expanded }"
          @click.stop="toggleExpanded(file)"
        />

        <!-- File/folder icon -->
        <BaseIcon
          :name="getFileIcon(file)"
          size="xs"
          class="file-icon"
          :class="getStatusClass(file)"
        />

        <!-- File name -->
        <span class="file-name" :title="file.path">
          {{ file.name }}
        </span>

        <!-- Git context: Show change stats -->
        <div
          v-if="context === 'git-changes' && (file.additions || file.deletions)"
          class="change-stats"
        >
          <span v-if="file.additions" class="additions"
            >+{{ file.additions }}</span
          >
          <span v-if="file.deletions" class="deletions"
            >-{{ file.deletions }}</span
          >
        </div>
      </div>
    </div>

    <!-- Context Menu -->
    <div
      v-if="contextMenu.visible"
      class="context-menu"
      :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }"
      @click="hideContextMenu"
    >
      <div
        v-for="action in getContextActions(contextMenu.file)"
        :key="action.id"
        class="context-item"
        @click="performAction(action, contextMenu.file)"
      >
        <BaseIcon :name="action.icon" size="xs" />
        <span>{{ action.label }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import BaseIcon from '../atoms/BaseIcon.vue'

/**
 * File item for explorer display.
 *
 * @public
 */
export interface FileItem {
  /** Unique file identifier */
  id: string
  /** File name */
  name: string
  /** Full file path */
  path: string
  /** File type */
  type: 'file' | 'directory'
  /** Tree depth level */
  depth?: number
  /** Whether directory is expanded */
  expanded?: boolean
  /** Git-specific: whether file is staged */
  staged?: boolean
  /** Git-specific: change status */
  status?: 'added' | 'modified' | 'deleted' | 'renamed'
  /** Git-specific: lines added */
  additions?: number
  /** Git-specific: lines deleted */
  deletions?: number
}

/**
 * Context action for file operations.
 *
 * @public
 */
export interface FileAction {
  /** Action identifier */
  id: string
  /** Display label */
  label: string
  /** Icon name */
  icon: string
  /** Action handler */
  handler: string
}

/**
 * Properties for file explorer component.
 *
 * @public
 */
interface Props {
  /** Array of files to display */
  files: FileItem[]
  /** Context for styling and behavior */
  context: 'code' | 'git-changes' | 'git-history'
  /** Currently selected file ID */
  selectedFileId?: string
}

/**
 * Events emitted by file explorer.
 *
 * @public
 */
interface Emits {
  /** File selection changed */
  fileSelected: [file: FileItem]
  /** File staging changed (Git context) */
  stageChanged: [file: FileItem, staged: boolean]
  /** Context action performed */
  fileAction: [action: string, file: FileItem]
}

const props = withDefaults(defineProps<Props>(), {
  selectedFileId: '',
})

const emit = defineEmits<Emits>()

// Context menu state
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  file: null as FileItem | null,
})

/**
 * Get appropriate icon for file type and status.
 *
 * @param file - File item
 * @returns Icon name
 *
 * @private
 */
const getFileIcon = (file: FileItem): string => {
  if (file.type === 'directory') {
    return file.expanded ? 'Menu' : 'ArrowRight'
  }

  // Git context: Use status-based icons
  if (props.context === 'git-changes') {
    switch (file.status) {
      case 'added':
        return 'Plus'
      case 'modified':
        return 'Circle'
      case 'deleted':
        return 'X'
      case 'renamed':
        return 'ArrowRight'
      default:
        return 'Code'
    }
  }

  // Default file icon
  return 'Code'
}

/**
 * Get CSS class for file status.
 *
 * @param file - File item
 * @returns CSS class name
 *
 * @private
 */
const getStatusClass = (file: FileItem): string => {
  if (props.context !== 'git-changes') return ''

  switch (file.status) {
    case 'added':
      return 'status-added'
    case 'modified':
      return 'status-modified'
    case 'deleted':
      return 'status-deleted'
    case 'renamed':
      return 'status-renamed'
    default:
      return ''
  }
}

/**
 * Get available context actions for file.
 *
 * @param file - File item
 * @returns Array of available actions
 *
 * @private
 */
const getContextActions = (file: FileItem | null): FileAction[] => {
  if (!file) return []

  const baseActions: FileAction[] = []

  if (props.context === 'code') {
    baseActions.push(
      { id: 'open', label: 'Open', icon: 'Code', handler: 'open' },
      { id: 'rename', label: 'Rename', icon: 'ArrowRight', handler: 'rename' },
      { id: 'delete', label: 'Delete', icon: 'X', handler: 'delete' }
    )
  }

  if (props.context === 'git-changes') {
    if (file.staged) {
      baseActions.push({
        id: 'unstage',
        label: 'Unstage',
        icon: 'Circle',
        handler: 'unstage',
      })
    } else {
      baseActions.push({
        id: 'stage',
        label: 'Stage',
        icon: 'Plus',
        handler: 'stage',
      })
    }

    baseActions.push(
      { id: 'diff', label: 'View Diff', icon: 'Eye', handler: 'diff' },
      { id: 'discard', label: 'Discard Changes', icon: 'X', handler: 'discard' }
    )
  }

  return baseActions
}

/**
 * Handle file selection.
 *
 * @param file - Selected file
 *
 * @private
 */
const selectFile = (file: FileItem): void => {
  emit('fileSelected', file)
}

/**
 * Handle staging change for Git files.
 *
 * @param file - File being staged/unstaged
 *
 * @private
 */
const handleStageChange = (file: FileItem): void => {
  emit('stageChanged', file, file.staged || false)
}

/**
 * Toggle directory expansion.
 *
 * @param file - Directory to toggle
 *
 * @private
 */
const toggleExpanded = (file: FileItem): void => {
  file.expanded = !file.expanded
}

/**
 * Show context menu for file.
 *
 * @param file - Target file
 * @param event - Mouse event
 *
 * @private
 */
const showContextMenu = (file: FileItem, event: MouseEvent): void => {
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    file,
  }
}

/**
 * Hide context menu.
 *
 * @private
 */
const hideContextMenu = (): void => {
  contextMenu.value.visible = false
}

/**
 * Perform context action.
 *
 * @param action - Action to perform
 * @param file - Target file
 *
 * @private
 */
const performAction = (action: FileAction, file: FileItem | null): void => {
  if (!file) return

  emit('fileAction', action.handler, file)
  hideContextMenu()
}
</script>

<style scoped>
.file-explorer {
  display: flex;
  flex-direction: column;
}

.file-item {
  display: flex;
  align-items: center;
  padding: 4px 0;
  cursor: pointer;
  transition: background-color var(--transition-fast);
  -webkit-app-region: no-drag;
}

.file-item:hover {
  background-color: var(--bg-tertiary);
}

.file-selected {
  background-color: var(--accent-primary);
  color: white;
}

.file-content {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.file-checkbox {
  width: 14px;
  height: 14px;
  accent-color: var(--accent-primary);
  cursor: pointer;
  flex-shrink: 0;
}

.expand-icon {
  transition: transform var(--transition-fast);
  flex-shrink: 0;
}

.expand-icon.expanded {
  transform: rotate(90deg);
}

.file-icon {
  flex-shrink: 0;
}

.file-name {
  font-size: 13px;
  color: var(--text-primary);
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.change-stats {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 500;
  margin-left: auto;
  flex-shrink: 0;
}

.additions {
  color: #10b981;
}

.deletions {
  color: #ef4444;
}

/* Git context styling */
.context-git-changes .file-staged {
  background-color: rgba(16, 185, 129, 0.1);
}

.context-git-changes .file-staged .file-name {
  color: #10b981;
}

/* Status-specific styling */
.status-added {
  color: #10b981;
}

.status-modified {
  color: #f59e0b;
}

.status-deleted {
  color: #ef4444;
}

.status-renamed {
  color: #6366f1;
}

/* Context menu */
.context-menu {
  position: fixed;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 160px;
  overflow: hidden;
}

.context-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  font-size: 13px;
  color: var(--text-primary);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.context-item:hover {
  background-color: var(--bg-tertiary);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .file-item {
    padding: 6px 0;
  }

  .file-name {
    font-size: 12px;
  }

  .change-stats {
    font-size: 10px;
  }
}
</style>
