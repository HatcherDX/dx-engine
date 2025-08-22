<template>
  <div class="code-sidebar">
    <!-- File Explorer Section -->
    <div class="explorer-section">
      <h3 class="section-title">
        Explorer
        <span v-if="isProjectLoaded && projectName" class="project-name">
          - {{ projectName }}
        </span>
      </h3>

      <div v-if="!isProjectLoaded" class="no-project-message">
        <p>No project opened</p>
        <p class="hint">Select a project from onboarding first</p>
      </div>

      <div v-else class="file-tree">
        <template v-for="item in flatFileTree" :key="item.id">
          <div
            v-show="shouldShowNode(item)"
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
                name="ArrowRight"
                size="xs"
                class="expand-icon"
                :class="{ expanded: expandedDirs.has(item.path) }"
                @click.stop="toggleExpanded(item)"
              />
              <BaseIcon :name="getFileIcon(item)" size="xs" class="file-icon" />
              <span class="file-name">{{ item.name }}</span>
            </div>
          </div>
        </template>
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import BaseIcon from '../atoms/BaseIcon.vue'
import { useProjectContext } from '../../composables/useProjectContext'

interface FileNode {
  id: string
  name: string
  type: 'file' | 'directory'
  depth: number
  expanded: boolean
  extension?: string
  path: string
  children?: FileNode[]
}

// Project context integration
const { projectFiles, isProjectLoaded, projectName } = useProjectContext()

const selectedFileId = ref<string>('')
const expandedDirs = ref<Set<string>>(new Set())

const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  item: null as FileNode | null,
})

/**
 * Get file extension from filename.
 *
 * @param filename - Name of the file
 * @returns File extension without the dot
 * @private
 */
const getFileExtension = (filename: string): string => {
  const lastDot = filename.lastIndexOf('.')
  return lastDot > 0 ? filename.substring(lastDot + 1) : ''
}

/**
 * Flatten the file tree for easier rendering.
 *
 * @returns Flat array of file nodes with correct depth
 * @private
 */
const buildFlatFileTree = (): FileNode[] => {
  if (!projectFiles.value.length) {
    return []
  }

  const nodes: FileNode[] = []
  const pathToNode = new Map<string, FileNode>()
  const allPaths = new Set<string>()

  // Collect all paths including intermediate directories
  for (const file of projectFiles.value) {
    const pathParts = file.path.split('/')
    for (let i = 1; i <= pathParts.length; i++) {
      const partialPath = pathParts.slice(0, i).join('/')
      if (partialPath) {
        allPaths.add(partialPath)
      }
    }
  }

  // Sort paths to ensure parents come before children
  const sortedPaths = Array.from(allPaths).sort((a, b) => {
    const aDepth = a.split('/').length
    const bDepth = b.split('/').length
    if (aDepth !== bDepth) {
      return aDepth - bDepth
    }
    return a.localeCompare(b)
  })

  // Create nodes
  for (const path of sortedPaths) {
    const pathParts = path.split('/')
    const name = pathParts[pathParts.length - 1]
    const depth = pathParts.length - 1

    const projectFile = projectFiles.value.find((f) => f.path === path)
    const isDirectory =
      projectFile?.type === 'directory' ||
      projectFiles.value.some((f) => f.path.startsWith(path + '/'))

    const node: FileNode = {
      id: path.replace(/[/\\]/g, '-') || 'root',
      name,
      type: isDirectory ? 'directory' : 'file',
      depth,
      expanded: expandedDirs.value.has(path),
      extension: isDirectory ? undefined : getFileExtension(name),
      path,
    }

    nodes.push(node)
    pathToNode.set(path, node)
  }

  return nodes
}

// Computed flat file tree
const flatFileTree = computed(() => buildFlatFileTree())

/**
 * Determine if a node should be visible based on parent expansion state.
 *
 * @param node - File node to check
 * @returns Whether the node should be shown
 * @private
 */
const shouldShowNode = (node: FileNode): boolean => {
  if (node.depth === 0) {
    return true // Always show root level
  }

  // Check if all parent directories are expanded
  const pathParts = node.path.split('/')
  for (let i = 1; i < pathParts.length; i++) {
    const parentPath = pathParts.slice(0, i).join('/')
    if (!expandedDirs.value.has(parentPath)) {
      return false
    }
  }

  return true
}

const selectFile = (item: FileNode) => {
  if (item.type === 'file') {
    selectedFileId.value = item.id
    console.log('Open file in editor:', item.name)
  } else {
    toggleExpanded(item)
  }
}

const toggleExpanded = (item: FileNode) => {
  if (item.type === 'directory') {
    if (expandedDirs.value.has(item.path)) {
      expandedDirs.value.delete(item.path)
    } else {
      expandedDirs.value.add(item.path)
    }
  }
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

  switch (item.extension?.toLowerCase()) {
    case 'vue':
      return 'Eye'
    case 'ts':
    case 'tsx':
    case 'js':
    case 'jsx':
      return 'Code'
    case 'json':
      return 'GitBranch'
    case 'md':
    case 'markdown':
      return 'Terminal'
    case 'css':
    case 'scss':
    case 'sass':
    case 'less':
      return 'Sun'
    case 'html':
    case 'htm':
      return 'GitBranch'
    case 'py':
    case 'rb':
    case 'php':
    case 'java':
    case 'cpp':
    case 'c':
    case 'go':
    case 'rs':
      return 'Terminal'
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
    case 'ico':
      return 'Eye'
    default:
      return 'Code'
  }
}
// Initialize expanded directories with some defaults
onMounted(() => {
  if (isProjectLoaded.value) {
    autoExpandCommonDirs()
  }
})

// Watch for project changes and reset state
watch(isProjectLoaded, (loaded) => {
  if (loaded) {
    selectedFileId.value = ''
    expandedDirs.value.clear()
    autoExpandCommonDirs()
  }
})

/**
 * Auto-expand commonly accessed directories.
 *
 * @private
 */
const autoExpandCommonDirs = () => {
  const commonDirs = ['src', 'src/components', 'src/composables', 'src/views']
  commonDirs.forEach((dir) => {
    if (projectFiles.value.some((f) => f.path.startsWith(dir + '/'))) {
      expandedDirs.value.add(dir)
    }
  })
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
  display: flex;
  align-items: center;
  gap: 4px;
}

.project-name {
  font-size: 11px;
  font-weight: 400;
  color: var(--text-tertiary);
  text-transform: none;
  letter-spacing: normal;
}

.no-project-message {
  padding: 16px;
  text-align: center;
  color: var(--text-secondary);
}

.no-project-message p {
  margin: 0;
  font-size: 13px;
}

.no-project-message .hint {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-top: 4px;
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
  transition: all 0.2s ease;
  -webkit-app-region: no-drag;
  position: relative;
}

.file-item:hover {
  background: rgba(59, 130, 246, 0.1);
}

.file-item::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 2px;
  background: var(--border-primary);
  border-radius: 1px;
  transition: all 0.2s ease;
  opacity: 0;
}

.file-item:hover::after {
  background: var(--accent-primary);
  width: 40px;
  opacity: 1;
}

.file-selected {
  background: rgba(59, 130, 246, 0.15);
  color: var(--text-primary);
}

.file-selected::after {
  background: var(--accent-primary);
  width: 40px;
  opacity: 1;
}

.file-selected .file-name {
  color: var(--text-primary);
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
  color: var(--text-primary);
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
