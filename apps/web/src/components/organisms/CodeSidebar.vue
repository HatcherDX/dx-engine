<template>
  <div class="code-sidebar">
    <!-- File Explorer Section -->
    <div class="explorer-section">
      <h3 class="section-title">Explorer</h3>
      <div class="file-tree">
        <div
          v-for="item in fileTree"
          :key="item.id"
          class="file-item"
          :class="{
            'file-selected': item.id === selectedFileId,
            'file-directory': item.type === 'directory',
          }"
          :style="{ paddingLeft: `${item.depth * 16 + 8}px` }"
          @click="selectFile(item)"
          @contextmenu.prevent="showContextMenu(item, $event)"
        >
          <div class="file-content">
            <BaseIcon
              v-if="item.type === 'directory'"
              :name="'ArrowRight'"
              size="xs"
              class="expand-icon"
              :class="{ expanded: item.expanded }"
              @click.stop="toggleExpanded(item)"
            />
            <BaseIcon :name="getFileIcon(item)" size="xs" class="file-icon" />
            <span class="file-name">{{ item.name }}</span>
          </div>
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
      <div class="context-item" @click="createNewFile">
        <BaseIcon name="Code" size="xs" />
        <span>New File</span>
      </div>
      <div class="context-item" @click="createNewFolder">
        <BaseIcon name="Menu" size="xs" />
        <span>New Folder</span>
      </div>
      <div class="context-divider"></div>
      <div class="context-item" @click="renameFile">
        <BaseIcon name="Terminal" size="xs" />
        <span>Rename</span>
      </div>
      <div class="context-item danger" @click="deleteFile">
        <BaseIcon name="X" size="xs" />
        <span>Delete</span>
      </div>
    </div>

    <!-- Logo Section -->
    <div class="logo-section">
      <BaseLogo size="lg" variant="inline" class="sidebar-content-logo" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import BaseIcon from '../atoms/BaseIcon.vue'
import BaseLogo from '../atoms/BaseLogo.vue'

interface FileNode {
  id: string
  name: string
  type: 'file' | 'directory'
  depth: number
  expanded: boolean
  extension?: string
  children?: FileNode[]
}

const selectedFileId = ref<string>('package-json')

const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  item: null as FileNode | null,
})

const fileTree = ref<FileNode[]>([
  {
    id: 'src',
    name: 'src',
    type: 'directory',
    depth: 0,
    expanded: true,
    children: [
      {
        id: 'components',
        name: 'components',
        type: 'directory',
        depth: 1,
        expanded: true,
        children: [
          {
            id: 'atoms',
            name: 'atoms',
            type: 'directory',
            depth: 2,
            expanded: false,
            children: [
              {
                id: 'base-button',
                name: 'BaseButton.vue',
                type: 'file',
                depth: 3,
                expanded: false,
                extension: 'vue',
              },
              {
                id: 'base-icon',
                name: 'BaseIcon.vue',
                type: 'file',
                depth: 3,
                expanded: false,
                extension: 'vue',
              },
            ],
          },
          {
            id: 'molecules',
            name: 'molecules',
            type: 'directory',
            depth: 2,
            expanded: false,
          },
        ],
      },
      {
        id: 'composables',
        name: 'composables',
        type: 'directory',
        depth: 1,
        expanded: false,
        children: [
          {
            id: 'use-theme',
            name: 'useTheme.ts',
            type: 'file',
            depth: 2,
            expanded: false,
            extension: 'ts',
          },
        ],
      },
      {
        id: 'app-vue',
        name: 'App.vue',
        type: 'file',
        depth: 1,
        expanded: false,
        extension: 'vue',
      },
      {
        id: 'main-ts',
        name: 'main.ts',
        type: 'file',
        depth: 1,
        expanded: false,
        extension: 'ts',
      },
    ],
  },
  {
    id: 'package-json',
    name: 'package.json',
    type: 'file',
    depth: 0,
    expanded: false,
    extension: 'json',
  },
  {
    id: 'readme',
    name: 'README.md',
    type: 'file',
    depth: 0,
    expanded: false,
    extension: 'md',
  },
])

const selectFile = (item: FileNode) => {
  if (item.type === 'file') {
    selectedFileId.value = item.id
    console.log('Open file in editor:', item.name)
  } else {
    toggleExpanded(item)
  }
}

const toggleExpanded = (item: FileNode) => {
  item.expanded = !item.expanded
}

const showContextMenu = (item: FileNode, event: MouseEvent) => {
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    item,
  }
}

const hideContextMenu = () => {
  contextMenu.value.visible = false
}

const createNewFile = () => {
  console.log('Create new file')
  hideContextMenu()
}

const createNewFolder = () => {
  console.log('Create new folder')
  hideContextMenu()
}

const renameFile = () => {
  console.log('Rename file:', contextMenu.value.item?.name)
  hideContextMenu()
}

const deleteFile = () => {
  console.log('Delete file:', contextMenu.value.item?.name)
  hideContextMenu()
}

const getFileIcon = (item: FileNode) => {
  if (item.type === 'directory') {
    return 'Menu'
  }

  switch (item.extension) {
    case 'vue':
      return 'Eye'
    case 'ts':
    case 'js':
      return 'Code'
    case 'json':
      return 'GitBranch'
    case 'md':
      return 'Terminal'
    default:
      return 'Code'
  }
}
</script>

<style scoped>
.code-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
}

/* Explorer Section */
.explorer-section {
  flex: 1;
  padding: 16px 0;
  overflow-y: auto;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 0 16px;
}

.file-tree {
  display: flex;
  flex-direction: column;
}

.file-item {
  display: flex;
  align-items: center;
  min-height: 28px;
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

.file-selected .file-name {
  color: white;
}

.file-content {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
}

.expand-icon {
  color: var(--text-tertiary);
  transition: transform var(--transition-fast);
  cursor: pointer;
}

.expand-icon.expanded {
  transform: rotate(90deg);
}

.file-icon {
  color: var(--accent-primary);
  flex-shrink: 0;
}

.file-selected .file-icon {
  color: white;
}

.file-name {
  font-size: 13px;
  font-weight: 400;
  color: var(--text-primary);
}

/* Context Menu */
.context-menu {
  position: fixed;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  box-shadow: var(--shadow-lg);
  z-index: 1000;
  min-width: 160px;
  padding: 4px 0;
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

.context-item.danger {
  color: #ef4444;
}

.context-item.danger:hover {
  background-color: #fef2f2;
}

.context-divider {
  height: 1px;
  background: var(--border-primary);
  margin: 4px 0;
}

/* Logo Section */
.logo-section {
  padding: 16px;
  border-top: 1px solid var(--border-sidebar);
  display: flex;
  justify-content: center;
}

/* Scrollbar for explorer */
.explorer-section::-webkit-scrollbar {
  width: 4px;
}

.explorer-section::-webkit-scrollbar-track {
  background: transparent;
}

.explorer-section::-webkit-scrollbar-thumb {
  background: var(--border-sidebar);
  border-radius: 2px;
}
</style>
