<!--
/**
 * @fileoverview Reusable Git commit history component.
 *
 * @description
 * A dedicated component for displaying Git commit history with author info,
 * timestamps, and interactive selection. Designed for reuse across different
 * Git UI contexts (Timeline, Log, etc.).
 *
 * @example
 * ```vue
 * <template>
 *   <GitHistory
 *     :commits="commitData"
 *     :selected-commit="currentCommit"
 *     @commit-selected="navigateToCommit"
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
  <div class="git-history">
    <div class="commits-list">
      <div
        v-for="commit in commits"
        :key="commit.hash"
        class="commit-row"
        :class="{ 'commit-selected': commit.hash === selectedCommit }"
        @click="selectCommit(commit.hash)"
      >
        <div class="commit-hash">{{ commit.shortHash }}</div>
        <div class="commit-info">
          <div class="commit-message" :title="commit.message">
            {{ commit.message }}
          </div>
          <div class="commit-meta">
            <span class="commit-author">{{
              getAuthorName(commit.author)
            }}</span>
            <span class="commit-date">{{
              formatDate(commit.author.date)
            }}</span>
            <div
              v-if="commit.tags && commit.tags.length > 0"
              class="commit-tags"
            >
              <span v-for="tag in commit.tags" :key="tag" class="commit-tag">
                {{ tag }}
              </span>
            </div>
          </div>
        </div>
        <div class="commit-stats">
          <span class="files-changed">{{ commit.filesChanged }}</span>
          <div class="change-indicators">
            <span v-if="commit.linesAdded > 0" class="additions">
              +{{ commit.linesAdded }}
            </span>
            <span v-if="commit.linesDeleted > 0" class="deletions">
              -{{ commit.linesDeleted }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { GitCommitData } from '@hatcherdx/shared-rendering'

/**
 * Properties for Git history component.
 *
 * @public
 */
interface Props {
  /** Array of commit data */
  commits: GitCommitData[]
  /** Currently selected commit ID */
  selectedCommit?: string
}

/**
 * Events emitted by Git history component.
 *
 * @public
 */
interface Emits {
  /** Commit selection changed */
  commitSelected: [commitId: string]
}

withDefaults(defineProps<Props>(), {
  selectedCommit: '',
})

const emit = defineEmits<Emits>()

/**
 * Handle commit selection.
 *
 * @param commitHash - Selected commit hash
 *
 * @private
 */
const selectCommit = (commitHash: string): void => {
  emit('commitSelected', commitHash)
}

/**
 * Get author name from author object or string.
 *
 * @param author - Author information
 * @returns Author name
 *
 * @private
 */
const getAuthorName = (author: GitCommitData['author']): string => {
  if (typeof author === 'string') {
    return author
  }
  return author.name
}

/**
 * Format commit date for display.
 *
 * @param date - Commit date
 * @returns Formatted date string
 *
 * @private
 */
const formatDate = (date: Date): string => {
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
    if (diffInDays < 30) {
      return `${diffInDays}d ago`
    } else {
      return date.toLocaleDateString()
    }
  }
}
</script>

<style scoped>
.git-history {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.commits-list {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.commit-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  cursor: pointer;
  transition: background-color var(--transition-fast);
  border-left: 3px solid transparent;
  -webkit-app-region: no-drag;
}

.commit-row:hover {
  background-color: var(--bg-tertiary);
}

.commit-selected {
  background-color: var(--accent-primary);
  color: white;
  border-left-color: var(--accent-secondary);
}

.commit-selected .commit-hash {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.commit-selected .commit-author,
.commit-selected .commit-date {
  color: rgba(255, 255, 255, 0.8);
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
  font-weight: 600;
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
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.commit-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: var(--text-tertiary);
  flex-wrap: wrap;
}

.commit-author {
  font-weight: 500;
}

.commit-date {
  font-weight: 400;
}

.commit-tags {
  display: flex;
  gap: 4px;
}

.commit-tag {
  background: var(--accent-primary);
  color: white;
  padding: 1px 4px;
  border-radius: 2px;
  font-size: 10px;
  font-weight: 600;
}

.commit-stats {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  flex-shrink: 0;
  font-size: 11px;
}

.files-changed {
  color: var(--text-secondary);
  font-weight: 600;
}

.files-changed::after {
  content: ' files';
  font-weight: 400;
}

.change-indicators {
  display: flex;
  gap: 4px;
}

.additions {
  color: #10b981;
  font-weight: 600;
}

.deletions {
  color: #ef4444;
  font-weight: 600;
}

/* Scrollbar styling */
.commits-list::-webkit-scrollbar {
  width: 4px;
}

.commits-list::-webkit-scrollbar-track {
  background: transparent;
}

.commits-list::-webkit-scrollbar-thumb {
  background: var(--border-primary);
  border-radius: 2px;
}

.commits-list::-webkit-scrollbar-thumb:hover {
  background: var(--text-tertiary);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .commit-row {
    padding: 8px 10px;
    gap: 8px;
  }

  .commit-message {
    font-size: 12px;
  }

  .commit-meta {
    font-size: 10px;
    gap: 6px;
  }

  .commit-stats {
    font-size: 10px;
  }
}
</style>
