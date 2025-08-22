<template>
  <div class="git-timeline-view">
    <!-- Content Area: Side-by-Side Diff Viewer -->
    <div class="timeline-content-container">
      <WebGLDiffViewer
        :current-file="selectedFile"
        :commits="commitHistory"
        :current-commit-index="selectedCommitIndex"
        :diff-data="currentDiff"
        :is-loading="isDiffLoading"
        :old-version="oldVersionLabel"
        :new-version="newVersionLabel"
        @navigate-to-commit="handleCommitNavigation"
        @file-selected="handleFileSelection"
        @request-diff="handleDiffRequest"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import WebGLDiffViewer from '../components/organisms/WebGLDiffViewer.vue'
import { useTimelineEvents } from '../composables/useTimelineEvents'
import { useProjectContext } from '../composables/useProjectContext'
import { useGitIntegration } from '../composables/useGitIntegration'
import type {
  GitDiffData,
  TimelineState,
  GitCommitData,
} from '@hatcherdx/shared-rendering'
// Timeline events for communication with sidebar
const {
  selectedFile,
  selectedFileContext,
  selectedCommitHash,
  selectedCommitIndex,
} = useTimelineEvents()

// Project context for paths
const { projectRoot, isProjectLoaded } = useProjectContext()

// Git integration for real diffs
const { getFileDiff, getCommitHistory } = useGitIntegration()

// Local state
const currentDiff = ref<GitDiffData | null>(null)
const isDiffLoading = ref(false)

// Timeline state
const timelineState = ref<TimelineState>({
  currentCommit: 0,
  totalCommits: 0,
  isPlaying: false,
  speed: 1,
  direction: 'forward',
})

// Real commit history from Git
const commitHistory = ref<GitCommitData[]>([])

// Load real commit history
const loadCommitHistory = async (): Promise<void> => {
  if (!projectRoot.value || !isProjectLoaded.value) {
    return
  }

  try {
    console.log('[GitTimelineView] Loading real commit history')
    const gitCommits = await getCommitHistory(projectRoot.value, 25)

    // Convert to GitCommitData format
    commitHistory.value = gitCommits.map((commit) => ({
      hash: commit.hash,
      shortHash: commit.shortHash,
      message: commit.message,
      author: commit.author,
      branch: 'main', // TODO: Get actual branch info
      parents: commit.parents,
      filesChanged: commit.filesChanged,
      linesAdded: commit.linesAdded,
      linesDeleted: commit.linesDeleted,
      tags: [], // TODO: Get actual tags
    }))

    console.log(
      `[GitTimelineView] Loaded ${commitHistory.value.length} commits`
    )
  } catch (error) {
    console.error('[GitTimelineView] Failed to load commit history:', error)
  }
}

// Computed properties
const oldVersionLabel = computed(() => {
  // Handle empty commit history
  if (commitHistory.value.length === 0) return 'Previous'
  if (selectedCommitIndex.value === 0) return 'Working Directory'
  const commit = commitHistory.value[selectedCommitIndex.value - 1]
  return commit?.shortHash || 'Previous'
})

const newVersionLabel = computed(() => {
  // Handle empty commit history
  if (commitHistory.value.length === 0) return 'Current'
  if (selectedCommitIndex.value === 0) return 'Working Directory'
  const commit = commitHistory.value[selectedCommitIndex.value]
  return commit?.shortHash || 'Current'
})

/**
 * Handle file selection from sidebar.
 *
 * @param filePath - Selected file path
 * @private
 */
const handleFileSelection = (filePath: string): void => {
  // Request diff data for selected file
  const commit = commitHistory.value[selectedCommitIndex.value]
  if (commit) {
    handleDiffRequest(commit.hash, filePath)
  }
}

/**
 * Handle commit navigation from diff viewer.
 *
 * @param index - Target commit index
 * @private
 */
const handleCommitNavigation = (index: number): void => {
  if (index >= 0 && index < commitHistory.value.length) {
    timelineState.value.currentCommit = index
  }
}

/**
 * Handle diff data requests using real Git integration.
 *
 * @param commitHash - Commit hash (null for working tree changes)
 * @param filePath - File path
 * @private
 */
const handleDiffRequest = async (
  commitHash: string | null,
  filePath: string
): Promise<void> => {
  if (!projectRoot.value || !isProjectLoaded.value) {
    console.warn('[GitTimelineView] No project loaded, cannot generate diff')
    return
  }

  isDiffLoading.value = true

  try {
    console.log(
      `[GitTimelineView] Getting real diff for ${filePath}${commitHash ? ` at ${commitHash}` : ' (working tree)'}`
    )

    // Get real diff from Git
    const diffData = await getFileDiff(projectRoot.value, filePath, commitHash)

    currentDiff.value = diffData
    console.log(
      `[GitTimelineView] Loaded diff with ${diffData.hunks.length} hunks`
    )
  } catch (error) {
    console.error('[GitTimelineView] Failed to load diff data:', error)
    currentDiff.value = null
  } finally {
    isDiffLoading.value = false
  }
}

// Watch for sidebar selections and update diff accordingly
watch(
  [selectedFile, selectedFileContext, selectedCommitHash],
  ([newFile, newContext, newCommitHash]) => {
    if (newFile) {
      if (newContext === 'changes') {
        // For changes tab: compare with working tree (no commit hash)
        handleDiffRequest(null, newFile)
      } else if (newContext === 'history' && newCommitHash) {
        // For history tab: compare commit with its parent
        handleDiffRequest(newCommitHash, newFile)
      }
    }
  }
)

// Watch for timeline state changes from timeline controls
watch(
  () => timelineState.value.currentCommit,
  (newCommitIndex) => {
    if (newCommitIndex !== selectedCommitIndex.value) {
      // Update global state when timeline controls change commit
      const commit = commitHistory.value[newCommitIndex]
      if (commit) {
        // This will trigger the watcher above
        const { selectCommit } = useTimelineEvents()
        selectCommit(commit.hash, newCommitIndex)
      }
    }
  }
)

// Watch for project loading and load commit history
watch([isProjectLoaded, projectRoot], async ([loaded, root]) => {
  if (loaded && root) {
    await loadCommitHistory()
  }
})

// Initialize timeline state
onMounted(async () => {
  // Load commit history if project is already loaded
  if (isProjectLoaded.value && projectRoot.value) {
    await loadCommitHistory()
  }

  // Use the global timeline events to set initial selections
  const { selectFile, selectCommit } = useTimelineEvents()

  // Auto-select first commit when history is loaded
  watch(
    commitHistory,
    (commits) => {
      if (commits.length > 0 && timelineState.value.currentCommit === 0) {
        const firstCommit = commits[0]
        selectCommit(firstCommit.hash, 0)
        timelineState.value.currentCommit = 0
        timelineState.value.totalCommits = commits.length
      }
    },
    { immediate: true }
  )

  // Auto-select first file for demo
  selectFile('apps/web/src/views/GitTimelineView.vue')
})
</script>

<style scoped>
.git-timeline-view {
  width: 100%;
  height: 100%;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  overflow: hidden;
  box-sizing: border-box;
}

.timeline-content-container {
  flex: 1;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  min-height: 0;
  background: var(--bg-primary);
  overflow: hidden;
  box-sizing: border-box;
}

/* Dark theme optimizations */
@media (prefers-color-scheme: dark) {
  .git-timeline-view {
    background: #0d1117;
  }

  .timeline-sidebar-container {
    background: #161b22;
    border-right-color: #30363d;
  }

  .timeline-content-container {
    background: #0d1117;
  }

  .timeline-controls-container {
    background: #161b22;
    border-top-color: #30363d;
  }
}

/* Responsive layout */
@media (max-width: 1024px) {
  .timeline-sidebar-container {
    width: 280px;
  }
}

@media (max-width: 768px) {
  .timeline-layout {
    flex-direction: column;
  }

  .timeline-sidebar-container {
    width: 100%;
    height: 40%;
    border-right: none;
    border-bottom: 1px solid var(--border-primary);
  }

  .timeline-content-container {
    height: 60%;
  }
}

/* High DPI displays */
@media (-webkit-min-device-pixel-ratio: 2) {
  .timeline-layout {
    will-change: transform;
  }
}

/* Performance optimizations */
.timeline-layout,
.timeline-sidebar-container,
.timeline-content-container {
  contain: layout style paint;
}
</style>
