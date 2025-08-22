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

    <!-- Changes Tab Content -->
    <div v-if="activeTab === 'changes'" class="tab-content changes-content">
      <div ref="changesListRef" class="changes-list">
        <div
          v-for="file in changedFiles"
          :key="file.path"
          class="file-change-row"
          @click="selectFile(file.path)"
        >
          <input
            :id="`file-${file.path}`"
            v-model="file.staged"
            type="checkbox"
            class="file-checkbox"
            @click.stop="handleCheckboxClick"
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
const { selectFile: selectFileGlobal, selectCommit: selectCommitGlobal } =
  useTimelineEvents()

// Project context for real file system access
const { isProjectLoaded, projectRoot, projectName } = useProjectContext()

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

const isGitRepository = ref(false)

/**
 * Loads Git status using pure Electron/Node.js simple-git API.
 * Maximum performance - no web hybrid operations.
 *
 * @private
 */
const loadGitStatus = async () => {
  console.log('[TimelineSidebar] 🔍 loadGitStatus called')
  console.log('[TimelineSidebar] 🔍 Current state:', {
    projectRoot: projectRoot.value,
    isProjectLoaded: isProjectLoaded.value,
    electronAPIExists: !!window.electronAPI,
    getGitStatusExists: !!(
      window.electronAPI && window.electronAPI.getGitStatus
    ),
  })

  if (!projectRoot.value || !isProjectLoaded.value) {
    console.log('[TimelineSidebar] ❌ No project root or project not loaded')
    console.log('[TimelineSidebar] 📊 Details:', {
      projectRootValue: projectRoot.value,
      isProjectLoadedValue: isProjectLoaded.value,
    })
    gitFiles.value = []
    isGitRepository.value = false
    return
  }

  try {
    console.log(
      `[TimelineSidebar] 🚀 Loading Git status via Electron API for: ${projectRoot.value}`
    )

    // Verificar que window.electronAPI existe
    if (!window.electronAPI) {
      console.error('[TimelineSidebar] ❌ window.electronAPI is not defined!')
      gitFiles.value = []
      isGitRepository.value = false
      return
    }

    // Verificar que getGitStatus existe
    if (!window.electronAPI.getGitStatus) {
      console.error(
        '[TimelineSidebar] ❌ window.electronAPI.getGitStatus is not defined!'
      )
      console.log(
        '[TimelineSidebar] 📊 Available APIs:',
        Object.keys(window.electronAPI)
      )
      gitFiles.value = []
      isGitRepository.value = false
      return
    }

    console.log(
      '[TimelineSidebar] 📡 Calling window.electronAPI.getGitStatus...'
    )
    const result = await window.electronAPI.getGitStatus(projectRoot.value)
    console.log('[TimelineSidebar] 📡 IPC call completed, result:', result)

    if (!result) {
      console.error('[TimelineSidebar] ❌ Git status result is null/undefined')
      gitFiles.value = []
      isGitRepository.value = false
      return
    }

    console.log(
      `[TimelineSidebar] ✅ Got ${result.totalFiles} files from Electron:`,
      result.files.map((f: GitFileStatus) => f.path)
    )

    gitFiles.value = result.files
    isGitRepository.value = result.isRepository

    console.log(
      `[TimelineSidebar] 📊 Status breakdown:`,
      gitFiles.value.reduce(
        (acc: Record<string, number>, f) => {
          acc[f.simplifiedStatus] = (acc[f.simplifiedStatus] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      )
    )
  } catch (error) {
    console.error('[TimelineSidebar] ❌ Failed to load Git status:', error)
    console.error('[TimelineSidebar] ❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      projectRoot: projectRoot.value,
    })
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
  console.log(
    '[TimelineSidebar] 🔧 onMounted - project loaded?',
    isProjectLoaded.value,
    'project root:',
    projectRoot.value
  )
  console.log('[TimelineSidebar] 🔧 onMounted - useProjectContext state:', {
    isProjectLoaded: isProjectLoaded.value,
    projectRoot: projectRoot.value,
    projectName: projectName.value,
  })

  if (isProjectLoaded.value) {
    console.log(
      '[TimelineSidebar] 🔧 onMounted - calling loadGitStatus immediately'
    )
    loadGitStatus()
  } else {
    console.log(
      '[TimelineSidebar] 🔧 onMounted - no project loaded yet, waiting for watch trigger'
    )
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
  console.log('[TimelineSidebar] Computing changedFiles:', {
    isProjectLoaded: isProjectLoaded.value,
    isGitRepository: isGitRepository.value,
    gitFilesLength: gitFiles.value.length,
  })

  if (!isProjectLoaded.value || !isGitRepository.value) {
    console.log(
      '[TimelineSidebar] Not loaded or not git repo, returning empty array'
    )
    return []
  }

  if (gitFiles.value.length === 0) {
    console.log('[TimelineSidebar] No git files available')
    return []
  }

  // Convert pure Electron Git files to UI format
  const uiFiles = gitFiles.value.map((gitFile) => ({
    path: gitFile.path,
    status: gitFile.simplifiedStatus,
    staged: gitFile.isStaged,
  }))

  console.log(
    `[TimelineSidebar] 📋 UI files (${uiFiles.length}):`,
    uiFiles.map((f) => `${f.path} [${f.status}]`)
  )
  return uiFiles
})

// Real commit history from Git - simplified for now
const commitHistory = ref<Commit[]>([])

// Watch for project changes and load git data
watch(
  () => isProjectLoaded.value,
  async (loaded, oldLoaded) => {
    console.log('[TimelineSidebar] 👀 isProjectLoaded watch triggered:', {
      loaded,
      oldLoaded,
      projectRoot: projectRoot.value,
    })
    if (loaded) {
      console.log(
        '[TimelineSidebar] 👀 Project loaded, loading Git data via pure Electron'
      )
      await loadGitStatus()
    }
  }
)

// Also watch for project root changes
watch(
  () => projectRoot.value,
  async (newRoot, oldRoot) => {
    console.log('[TimelineSidebar] 👀 projectRoot watch triggered:', {
      newRoot,
      oldRoot,
      isProjectLoaded: isProjectLoaded.value,
    })
    if (newRoot && isProjectLoaded.value) {
      console.log(
        '[TimelineSidebar] 👀 Root changed and project loaded, calling loadGitStatus'
      )
      await loadGitStatus()
    }
  }
)

const canCommit = computed(() => {
  const hasStagedFiles = changedFiles.value.some((file) => file.staged)
  const hasTitle = commitTitle.value.trim().length > 0
  return hasStagedFiles && hasTitle
})

const commitButtonText = computed(() => {
  const stagedCount = changedFiles.value.filter((file) => file.staged).length
  if (stagedCount === 0) {
    return 'No files staged'
  }
  const fileText = stagedCount === 1 ? 'file' : 'files'
  return `Commit ${stagedCount} ${fileText} to main`
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
  // El v-model ya maneja el cambio del estado del checkbox
  // Solo necesitamos prevenir el event bubbling, que ya hace @click.stop
}

const selectFile = (filePath: string) => {
  console.log('Selected file:', filePath, 'in tab:', activeTab.value)
  // Use context based on active tab
  const context = activeTab.value === 'changes' ? 'changes' : 'history'
  selectFileGlobal(filePath, context)
}

const selectCommit = (commitId: string) => {
  console.log('Selected commit:', commitId)
  // Find commit index by ID
  const commitIndex = commitHistory.value.findIndex((c) => c.id === commitId)
  if (commitIndex !== -1) {
    selectCommitGlobal(commitHistory.value[commitIndex].hash, commitIndex)
  }
}

const performCommit = () => {
  if (canCommit.value) {
    const stagedFiles = changedFiles.value.filter((file) => file.staged)
    console.log('Committing files:', stagedFiles)
    console.log('Commit title:', commitTitle.value)
    console.log('Commit message:', commitMessage.value)

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

/* Changes Tab */
.changes-list {
  display: flex;
  flex-direction: column;
}

.file-change-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  cursor: pointer;
  transition: background-color var(--transition-fast);
  -webkit-app-region: no-drag;
}

.file-change-row:hover {
  background-color: var(--bg-tertiary);
}

.file-checkbox {
  width: 16px;
  height: 16px;
  min-width: 16px;
  min-height: 16px;
  max-width: 16px;
  max-height: 16px;
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
  font-size: 13px;
  color: var(--text-primary);
  cursor: pointer;
  flex: 1;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
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

/* Commit Section */
.commit-section {
  border-top: 1px solid var(--border-sidebar);
  padding: 16px;
  background: var(--bg-secondary);
}

.commit-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.commit-title-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
  transition: border-color var(--transition-fast);
}

.commit-title-input:focus {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px rgba(var(--accent-primary-rgb), 0.1);
}

.commit-title-input::placeholder {
  color: var(--text-tertiary);
}

.commit-message-textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  resize: vertical;
  min-height: 60px;
  transition: border-color var(--transition-fast);
}

.commit-message-textarea:focus {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px rgba(var(--accent-primary-rgb), 0.1);
}

.commit-message-textarea::placeholder {
  color: var(--text-tertiary);
}

.commit-button {
  align-self: center;
  -webkit-app-region: no-drag;
  transition: all var(--transition-fast);
  position: relative;
  overflow: hidden;
  color: white !important;
  background-color: var(--accent-primary) !important;
  border: 1px solid var(--accent-primary) !important;
  padding: 4px 16px !important;
  width: 100% !important;
}

.commit-button:hover {
  background: var(--accent-secondary) !important;
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
