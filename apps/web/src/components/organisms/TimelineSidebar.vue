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
        >
          <input
            :id="`file-${file.path}`"
            v-model="file.staged"
            type="checkbox"
            class="file-checkbox"
          />
          <BaseIcon
            :name="getStatusIcon(file.status)"
            size="xs"
            :class="getStatusClass(file.status)"
            class="status-icon"
          />
          <label
            ref="filePathRef"
            :for="`file-${file.path}`"
            class="file-path"
            :title="file.path"
          >
            {{ getTruncatedPath(file.path) }}
          </label>
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

    <!-- Logo Section -->
    <div class="logo-section">
      <BaseLogo size="lg" variant="inline" class="sidebar-content-logo" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import BaseIcon from '../atoms/BaseIcon.vue'
import BaseButton from '../atoms/BaseButton.vue'
import BaseLogo from '../atoms/BaseLogo.vue'
import { useSmartTruncation } from '../../composables/useSmartTruncation'

interface Tab {
  id: 'changes' | 'history'
  label: string
}

interface FileChange {
  path: string
  status: 'added' | 'modified' | 'deleted' | 'renamed'
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

// Update container width
const updateContainerWidth = () => {
  if (changesListRef.value) {
    // Account for padding and other elements: checkbox (16px) + gaps (8px * 3) + icon (16px) = 56px
    const reservedWidth = 56
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
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  } else {
    window.removeEventListener('resize', updateContainerWidth)
  }
})

const changedFiles = ref<FileChange[]>([
  {
    path: 'src/components/organisms/TimelineSidebar.vue',
    status: 'modified',
    staged: true,
  },
  {
    path: 'src/components/molecules/ModeSelector.vue',
    status: 'modified',
    staged: true,
  },
  {
    path: 'src/components/templates/UnifiedFrame.vue',
    status: 'modified',
    staged: false,
  },
  {
    path: 'src/App.vue',
    status: 'modified',
    staged: false,
  },
  {
    path: 'src/components/atoms/icons/Timeline.vue',
    status: 'added',
    staged: true,
  },
])

const commitHistory = ref<Commit[]>([
  {
    id: 'c1',
    hash: 'a1b2c3d',
    message: 'feat: implement timeline mode with git-like interface',
    author: 'Developer',
    date: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
  },
  {
    id: 'c2',
    hash: 'e4f5g6h',
    message: 'fix: update mode selector active state styling',
    author: 'Developer',
    date: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
  },
  {
    id: 'c3',
    hash: 'i7j8k9l',
    message: 'style: remove header padding and adjust button margins',
    author: 'Developer',
    date: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
  },
  {
    id: 'c4',
    hash: 'm0n1o2p',
    message: 'feat: add GitHub button styling with proper padding',
    author: 'Developer',
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
  },
])

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
      return 'GitBranch'
    case 'modified':
      return 'Terminal'
    case 'deleted':
      return 'X'
    case 'renamed':
      return 'Code'
    default:
      return 'Code'
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
    default:
      return ''
  }
}

const selectCommit = (commitId: string) => {
  console.log('Selected commit:', commitId)
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
  accent-color: var(--accent-primary);
  cursor: pointer;
}

.status-icon {
  flex-shrink: 0;
}

.status-added {
  color: #10b981; /* Green for added files */
}

.status-modified {
  color: #f59e0b; /* Orange for modified files */
}

.status-deleted {
  color: #ef4444; /* Red for deleted files */
}

.status-renamed {
  color: #6366f1; /* Blue for renamed files */
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

/* Logo Section */
.logo-section {
  padding: 16px;
  border-top: 1px solid var(--border-sidebar);
  display: flex;
  justify-content: center;
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
