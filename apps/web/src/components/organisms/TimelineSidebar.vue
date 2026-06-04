<template>
  <div class="timeline-sidebar">
    <!-- Tab Navigation -->
    <div class="tabs-header">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-button"
        :class="{ 'tab-active': activeTab === tab.id }"
        @click="switchTab(tab.id)"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Master checkbox for all files - Fixed header -->
    <div
      v-if="activeTab === 'changes' && changedFiles.length > 0"
      class="master-checkbox-container"
    >
      <div class="master-checkbox-wrapper" @click="toggleAllFiles">
        <div class="master-checkbox" :class="masterCheckboxClass">
          <svg
            v-if="masterCheckboxState === 'checked'"
            width="10"
            height="8"
            viewBox="0 0 10 8"
          >
            <path
              d="M1 4L3.5 6.5L9 1"
              stroke="currentColor"
              stroke-width="1.5"
              fill="none"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <svg
            v-else-if="masterCheckboxState === 'indeterminate'"
            width="8"
            height="2"
            viewBox="0 0 8 2"
          >
            <rect width="8" height="2" fill="currentColor" rx="0.5" />
          </svg>
        </div>
        <span class="master-checkbox-label">
          {{ changedFiles.length }} changed
          {{ changedFiles.length === 1 ? 'file' : 'files' }}
        </span>
      </div>
    </div>

    <!-- Changes Tab Content -->
    <div v-if="activeTab === 'changes'" class="tab-content changes-content">
      <div ref="changesListRef" class="changes-list">
        <div
          v-for="file in changedFiles"
          :key="file.path"
          class="file-change-row"
          :class="{
            'file-selected':
              globalSelectedFile === file.path &&
              selectedFileContext === 'changes',
          }"
          @click="selectFile(file.path)"
        >
          <input
            :id="`file-${file.path}`"
            :checked="file.staged"
            type="checkbox"
            class="file-checkbox"
            @click.stop="handleCheckboxClick"
            @change="toggleFileStaging(file.path)"
          />
          <span ref="filePathRef" class="file-path" :title="file.path">
            {{ getTruncatedPath(file.path) }}
          </span>
          <BaseIcon
            :name="getStatusIcon(file.status)"
            size="xs"
            :class="getStatusClass(file.status)"
            class="status-icon"
          />
        </div>
      </div>
    </div>

    <!-- History Tab Content -->
    <div
      v-else-if="activeTab === 'history'"
      class="tab-content history-content"
    >
      <div class="commits-list">
        <div
          v-for="commit in commitHistory"
          :key="commit.id"
          class="commit-row"
          @click="selectCommit(commit.id)"
        >
          <div class="commit-hash">{{ commit.hash }}</div>
          <div class="commit-info">
            <div class="commit-message">{{ commit.message }}</div>
            <div class="commit-meta">
              <span class="commit-author">{{ commit.author }}</span>
              <span class="commit-date">{{ formatDate(commit.date) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Commit Organism (only visible on Changes tab) -->
    <div v-if="activeTab === 'changes'" class="commit-section">
      <div class="commit-form">
        <input
          v-model="commitTitle"
          type="text"
          placeholder="Commit title"
          class="commit-title-input"
        />
        <textarea
          v-model="commitMessage"
          placeholder="Commit description (optional)"
          class="commit-message-textarea"
          rows="3"
        />
        <BaseButton
          variant="primary"
          size="md"
          class="commit-button"
          :class="{ 'commit-button-active': canCommit }"
          :disabled="!canCommit"
          @click="performCommit"
        >
          {{ commitButtonText }}
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import BaseIcon from '../atoms/BaseIcon.vue'
import BaseButton from '../atoms/BaseButton.vue'
import { useSmartTruncation } from '../../composables/useSmartTruncation'
import { useTimelineEvents } from '../../composables/useTimelineEvents'
import { useProjectContext } from '../../composables/useProjectContext'

interface Tab {
  id: 'changes' | 'history'
  label: string
}

interface FileChange {
  path: string
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'untracked'
  staged: boolean
}

interface Commit {
  id: string
  hash: string
  message: string
  author: string
  date: Date
}

const tabs: Tab[] = [
  { id: 'changes', label: 'Changes' },
  { id: 'history', label: 'History' },
]

const activeTab = ref<'changes' | 'history'>('changes')
const commitTitle = ref('')
const commitMessage = ref('')
const filePathRef = ref<HTMLElement>()

// Smart truncation functionality
const { truncatePath } = useSmartTruncation()
const containerWidth = ref(200) // Default fallback width
const changesListRef = ref<HTMLElement>()

// Timeline events for communication with GitTimelineView
const {
  selectFile: selectFileGlobal,
  selectCommit: selectCommitGlobal,
  selectedFile: globalSelectedFile,
  selectedFileContext,
} = useTimelineEvents()

// Project context for real file system access
const { isProjectLoaded, projectRoot } = useProjectContext()

// Define GitFileStatus type locally
interface GitFileStatus {
  path: string
  indexStatus: string
  worktreeStatus: string
  isStaged: boolean
  simplifiedStatus: 'added' | 'modified' | 'deleted' | 'renamed' | 'untracked'
}

// Pure Electron Git status - all files directly from simple-git
const gitFiles = ref<GitFileStatus[]>([])
const currentBranch = ref<string>('main')

const isGitRepository = ref(false)

/**
 * Loads Git status using pure Electron/Node.js simple-git API.
 * Maximum performance - no web hybrid operations.
 *
 * @private
 */
const loadGitStatus = async () => {
  if (!projectRoot.value || !isProjectLoaded.value) {
    gitFiles.value = []
    isGitRepository.value = false
    return
  }

  try {
    if (!window.electronAPI) {
      console.error('[TimelineSidebar] ❌ window.electronAPI is not defined!')
      gitFiles.value = []
      isGitRepository.value = false
      return
    }

    if (!window.electronAPI.getGitStatus) {
      console.error(
        '[TimelineSidebar] ❌ window.electronAPI.getGitStatus is not defined!'
      )
      gitFiles.value = []
      isGitRepository.value = false
      return
    }

    const result = await window.electronAPI.getGitStatus(projectRoot.value)

    if (!result) {
      console.error('[TimelineSidebar] ❌ Git status result is null/undefined')
      gitFiles.value = []
      isGitRepository.value = false
      return
    }

    gitFiles.value = result.files
    isGitRepository.value = result.isRepository
    currentBranch.value = result.currentBranch || 'main'
  } catch (error) {
    console.error('[TimelineSidebar] ❌ Failed to load Git status:', error)
    gitFiles.value = []
    isGitRepository.value = false
  }
}

// Update container width
const updateContainerWidth = () => {
  if (changesListRef.value) {
    // Account for layout: [checkbox] [gap] [file-path] [margin-left] [status-icon]
    // checkbox (16px) + initial gap (8px) + status-icon (16px) + icon margin-left (8px) + row padding (32px) = 80px
    const reservedWidth = 80
    const availableWidth = changesListRef.value.clientWidth - reservedWidth
    const newWidth = Math.max(availableWidth, 100) // Minimum 100px
    containerWidth.value = newWidth
  }
}

// Use ResizeObserver for better resize detection
let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  // Initial width calculation with a small delay to ensure DOM is ready
  setTimeout(() => {
    updateContainerWidth()
  }, 50)

  // Set up ResizeObserver for more reliable resize detection
  if (changesListRef.value && window.ResizeObserver) {
    resizeObserver = new ResizeObserver(() => {
      updateContainerWidth()
    })
    resizeObserver.observe(changesListRef.value)
  } else {
    // Fallback to window resize
    window.addEventListener('resize', updateContainerWidth)
  }

  // Load initial Git data if project is already loaded
  if (isProjectLoaded.value) {
    loadGitStatus()
  }
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  } else {
    window.removeEventListener('resize', updateContainerWidth)
  }
})

// Pure Electron Git status integration
const changedFiles = computed(() => {
  if (!isProjectLoaded.value || !isGitRepository.value) {
    return []
  }

  if (gitFiles.value.length === 0) {
    return []
  }

  // Convert pure Electron Git files to UI format
  const uiFiles = gitFiles.value.map((gitFile) => ({
    path: gitFile.path,
    status: gitFile.simplifiedStatus,
    staged: gitFile.isStaged,
  }))

  return uiFiles
})

// Real commit history from Git - simplified for now
const commitHistory = ref<Commit[]>([])

// Watch for project changes and load git data
watch(
  () => isProjectLoaded.value,
  async (loaded) => {
    if (loaded) {
      await loadGitStatus()
    }
  }
)

// Also watch for project root changes
watch(
  () => projectRoot.value,
  async (newRoot) => {
    if (newRoot && isProjectLoaded.value) {
      await loadGitStatus()
    }
  }
)

const canCommit = computed(() => {
  const hasStagedFiles = gitFiles.value.some((file) => file.isStaged)
  const hasTitle = commitTitle.value.trim().length > 0
  return hasStagedFiles && hasTitle
})

const commitButtonText = computed(() => {
  // Count staged files directly from gitFiles to ensure reactivity
  const stagedCount = gitFiles.value.filter((file) => file.isStaged).length
  const branch = currentBranch.value || 'main'
  if (stagedCount === 0) {
    return `Commit to ${branch}`
  }
  const fileText = stagedCount === 1 ? 'file' : 'files'
  return `Commit ${stagedCount} ${fileText} to ${branch}`
})

const switchTab = (tabId: 'changes' | 'history') => {
  activeTab.value = tabId
}

const getTruncatedPath = (path: string) => {
  const width = containerWidth.value
  if (width <= 100) return path
  return truncatePath(path, width, 13)
}

const getStatusIcon = (status: FileChange['status']) => {
  switch (status) {
    case 'added':
      return 'Plus'
    case 'modified':
      return 'Circle'
    case 'deleted':
      return 'Minus'
    case 'renamed':
      return 'ArrowRight'
    case 'untracked':
      return 'Plus'
    default:
      return 'Circle'
  }
}

const getStatusClass = (status: FileChange['status']) => {
  switch (status) {
    case 'added':
      return 'status-added'
    case 'modified':
      return 'status-modified'
    case 'deleted':
      return 'status-deleted'
    case 'renamed':
      return 'status-renamed'
    case 'untracked':
      return 'status-untracked'
    default:
      return 'status-modified'
  }
}

const handleCheckboxClick = () => {
  // Solo necesitamos prevenir el event bubbling, que ya hace @click.stop
}

const toggleFileStaging = (filePath: string) => {
  // Find the file in gitFiles and toggle its staged status
  const file = gitFiles.value.find((f) => f.path === filePath)
  if (file) {
    file.isStaged = !file.isStaged
  }
}

// Master checkbox state management
const masterCheckboxState = computed(() => {
  const totalFiles = gitFiles.value.length
  const stagedFiles = gitFiles.value.filter((f) => f.isStaged).length

  if (stagedFiles === 0) return 'unchecked'
  if (stagedFiles === totalFiles) return 'checked'
  return 'indeterminate'
})

const masterCheckboxClass = computed(() => {
  return {
    checked: masterCheckboxState.value === 'checked',
    indeterminate: masterCheckboxState.value === 'indeterminate',
    unchecked: masterCheckboxState.value === 'unchecked',
  }
})

const toggleAllFiles = () => {
  const allStaged = gitFiles.value.every((f) => f.isStaged)
  gitFiles.value.forEach((file) => {
    file.isStaged = !allStaged
  })
}

const selectFile = (filePath: string) => {
  // Use context based on active tab
  const context = activeTab.value === 'changes' ? 'changes' : 'history'
  selectFileGlobal(filePath, context)
}

const selectCommit = (commitId: string) => {
  // Find commit index by ID
  const commitIndex = commitHistory.value.findIndex((c) => c.id === commitId)
  if (commitIndex !== -1) {
    selectCommitGlobal(commitHistory.value[commitIndex].hash, commitIndex)
  }
}

const performCommit = () => {
  if (canCommit.value) {
    // Reset form
    commitTitle.value = ''
    commitMessage.value = ''

    // Note: Git commit functionality will be implemented when integrating with actual VCS
  }
}

const formatDate = (date: Date) => {
  const now = new Date()
  const diffInHours = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60)
  )

  if (diffInHours < 1) {
    return 'Just now'
  } else if (diffInHours < 24) {
    return `${diffInHours}h ago`
  } else {
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}d ago`
  }
}
</script>

<style scoped>
.timeline-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* Tab Navigation */
.tabs-header {
  display: flex;
  border-bottom: 1px solid var(--border-sidebar);
  background: var(--bg-secondary);
}

.tab-button {
  flex: 1;
  padding: 12px 16px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  border-bottom: 2px solid transparent;
  -webkit-app-region: no-drag;
}

.tab-button:hover {
  color: var(--text-primary);
  background: var(--bg-tertiary);
}

.tab-active {
  color: var(--accent-primary) !important;
  border-bottom-color: var(--accent-primary);
  background: var(--bg-primary);
}

/* Tab Content */
.tab-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.changes-content {
  padding-top: 0; /* Remove top padding since master checkbox provides spacing */
}

/* Master Checkbox */
.master-checkbox-container {
  padding: 10px 16px;
  border-bottom: 1px solid var(--border-sidebar);
  background: var(--bg-sidebar);
  position: sticky;
  top: 0;
  z-index: 10;
}

.master-checkbox-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  -webkit-app-region: no-drag;
}

.master-checkbox {
  width: 14px;
  height: 14px;
  border: 1px solid var(--border-primary);
  border-radius: 3px;
  background: var(--bg-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  flex-shrink: 0;
  color: var(--text-primary);
}

.master-checkbox.checked {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  color: var(--text-on-accent);
}

.master-checkbox.indeterminate {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  color: var(--text-on-accent);
}

.master-checkbox-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  text-transform: none;
  letter-spacing: 0;
}

/* Changes Tab */
.changes-list {
  display: flex;
  flex-direction: column;
}

.file-change-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  cursor: pointer;
  transition: background-color var(--transition-fast);
  -webkit-app-region: no-drag;
  min-height: 28px;
}

.file-change-row:hover {
  background-color: var(--bg-tertiary);
}

.file-change-row.file-selected {
  background-color: var(--accent-primary-bg);
  border-left: 2px solid var(--accent-primary);
  padding-left: 14px; /* Compensate for border */
}

.file-checkbox {
  width: 14px;
  height: 14px;
  min-width: 14px;
  min-height: 14px;
  max-width: 14px;
  max-height: 14px;
  accent-color: var(--accent-primary);
  cursor: pointer;
  flex-shrink: 0;
  box-sizing: border-box;
}

.status-icon {
  flex-shrink: 0;
  margin-left: 8px;
}

.status-added {
  color: #10b981; /* Green for added files */
  background-color: rgba(16, 185, 129, 0.1);
  border: 1px solid #10b981;
  border-radius: 3px;
  padding: 2px;
}

.status-modified {
  color: #f59e0b; /* Orange for modified files */
  background-color: rgba(245, 158, 11, 0.1);
  border: 1px solid #f59e0b;
  border-radius: 3px;
  padding: 2px;
}

.status-deleted {
  color: #ef4444; /* Red for deleted files */
  background-color: rgba(239, 68, 68, 0.1);
  border: 1px solid #ef4444;
  border-radius: 3px;
  padding: 2px;
}

.status-renamed {
  color: #6366f1; /* Blue for renamed files */
  background-color: rgba(99, 102, 241, 0.1);
  border: 1px solid #6366f1;
  border-radius: 3px;
  padding: 2px;
}

.status-untracked {
  color: #10b981; /* Green for untracked files (same as added) */
  background-color: rgba(16, 185, 129, 0.1);
  border: 1px solid #10b981;
  border-radius: 3px;
  padding: 2px;
}

.file-path {
  font-size: 12px;
  color: var(--text-primary);
  cursor: pointer;
  flex: 1;
  font-family:
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
  font-weight: 400;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* History Tab */
.commits-list {
  display: flex;
  flex-direction: column;
}

.commit-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color var(--transition-fast);
  -webkit-app-region: no-drag;
}

.commit-row:hover {
  background-color: var(--bg-tertiary);
}

.commit-hash {
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-size: 11px;
  color: var(--accent-primary);
  background: var(--bg-tertiary);
  padding: 2px 6px;
  border-radius: 3px;
  flex-shrink: 0;
  margin-top: 1px;
}

.commit-info {
  flex: 1;
  min-width: 0;
}

.commit-message {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
  line-height: 1.3;
}

.commit-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: var(--text-tertiary);
}

.commit-author {
  font-weight: 500;
}

.commit-date {
  font-weight: 400;
}

/* Commit Section - Footer Style */
.commit-section {
  border-top: 1px solid var(--border-sidebar);
  padding: 6px 16px;
  background: var(--bg-sidebar);
  min-height: fit-content;
  position: relative;
}

.commit-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0.02) 0%,
    rgba(255, 255, 255, 0) 100%
  );
  pointer-events: none;
}

.dark .commit-section::before {
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0.03) 0%,
    rgba(255, 255, 255, 0) 100%
  );
}

.commit-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
  z-index: 1;
}

.commit-title-input {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 12px;
  outline: none;
  transition: border-color var(--transition-fast);
}

.commit-title-input:focus {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 2px rgba(223, 169, 39, 0.1);
}

.commit-title-input::placeholder {
  color: var(--text-tertiary);
  font-size: 12px;
}

.commit-message-textarea {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 12px;
  font-family: inherit;
  outline: none;
  resize: vertical;
  min-height: 50px;
  transition: border-color var(--transition-fast);
}

.commit-message-textarea:focus {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 2px rgba(223, 169, 39, 0.1);
}

.commit-message-textarea::placeholder {
  color: var(--text-tertiary);
  font-size: 12px;
}

.commit-button {
  align-self: center;
  -webkit-app-region: no-drag;
  transition: all var(--transition-fast);
  position: relative;
  overflow: hidden;
  color: var(--text-on-accent) !important;
  background-color: var(--accent-primary) !important;
  border: 1px solid var(--accent-primary) !important;
  border-radius: 4px !important;
  padding: 6px 14px !important;
  width: 100% !important;
  font-size: 12px !important;
  font-weight: 500 !important;
  min-height: 28px !important;
}

.commit-button:hover:not(:disabled) {
  background: var(--accent-primary-hover) !important;
  color: var(--text-on-accent) !important;
}

.commit-button:disabled {
  background: var(--accent-primary) !important;
  color: var(--text-on-accent) !important;
  opacity: 0.6 !important;
}

.commit-button-active::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.2),
    transparent
  );
  transition: left 0.5s;
}

.commit-button-active:hover::before {
  left: 100%;
}

/* Scrollbar styling */
.tab-content::-webkit-scrollbar {
  width: 4px;
}

.tab-content::-webkit-scrollbar-track {
  background: transparent;
}

.tab-content::-webkit-scrollbar-thumb {
  background: var(--border-sidebar);
  border-radius: 2px;
}
</style>
