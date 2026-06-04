<!--
/**
 * @fileoverview Pull request comments viewer modal.
 *
 * @description
 * Modal for viewing and managing pull request comments from GitHub.
 * Displays threaded discussions, review comments, and inline code feedback.
 *
 * @example
 * <PrCommentsModal
 *   :visible="showPrComments"
 *   @close="showPrComments = false"
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
          <BaseIcon name="GitBranch" size="md" class="header-icon" />
          <h2 class="modal-title">PR Comments</h2>
        </div>
        <button class="close-button" aria-label="Close" @click="$emit('close')">
          <BaseIcon name="X" size="sm" />
        </button>
      </div>

      <!-- Content -->
      <div class="modal-content">
        <!-- PR Selector -->
        <div class="pr-selector">
          <label for="pr-number" class="label">Pull Request</label>
          <select id="pr-number" v-model="selectedPr" class="select-input">
            <option value="">Select a PR...</option>
            <option
              v-for="pr in pullRequests"
              :key="pr.number"
              :value="pr.number"
            >
              #{{ pr.number }} - {{ pr.title }}
            </option>
          </select>
        </div>

        <!-- Comments List -->
        <div v-if="selectedPr" class="comments-section">
          <div class="section-header">
            <h3 class="section-title">Comments ({{ comments.length }})</h3>
            <button class="refresh-btn" @click="handleRefresh">
              <BaseIcon name="RotateCcw" size="sm" />
              Refresh
            </button>
          </div>

          <div v-if="comments.length === 0" class="empty-state">
            <BaseIcon name="FileText" size="lg" />
            <p>No comments yet</p>
          </div>

          <div v-else class="comments-list">
            <div
              v-for="comment in comments"
              :key="comment.id"
              class="comment-card"
            >
              <div class="comment-header">
                <div class="author-info">
                  <span class="author-name">{{ comment.author }}</span>
                  <span class="comment-time">{{ comment.time }}</span>
                </div>
                <span
                  v-if="comment.type"
                  class="comment-type"
                  :class="comment.type"
                >
                  {{ comment.type }}
                </span>
              </div>
              <div class="comment-body">{{ comment.body }}</div>
              <div v-if="comment.file" class="comment-context">
                <BaseIcon name="Code" size="xs" />
                <code>{{ comment.file }}:{{ comment.line }}</code>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="placeholder">
          <p>Select a pull request to view comments</p>
        </div>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <BaseButton variant="ghost" @click="$emit('close')">Close</BaseButton>
        <BaseButton
          variant="primary"
          :disabled="!selectedPr"
          @click="handleOpenPr"
        >
          <BaseIcon name="GitBranch" size="xs" />
          Open in GitHub
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
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
}

/**
 * Pull request interface.
 *
 * @public
 */
interface PullRequest {
  number: number
  title: string
}

/**
 * Comment interface.
 *
 * @public
 */
interface Comment {
  id: number
  author: string
  time: string
  body: string
  type?: 'review' | 'comment'
  file?: string
  line?: number
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const { success } = useNotifications()

const selectedPr = ref<number | ''>('')

const pullRequests = ref<PullRequest[]>([
  { number: 42, title: 'Add new feature X' },
  { number: 41, title: 'Fix critical bug in Y' },
  { number: 40, title: 'Refactor component Z' },
])

const comments = ref<Comment[]>([
  {
    id: 1,
    author: 'john.doe',
    time: '2 hours ago',
    body: 'LGTM! Great implementation.',
    type: 'review',
  },
  {
    id: 2,
    author: 'jane.smith',
    time: '1 hour ago',
    body: 'Consider adding error handling here.',
    type: 'comment',
    file: 'src/components/App.vue',
    line: 145,
  },
])

/**
 * Watch for PR selection changes.
 *
 * @private
 */
watch(selectedPr, () => {
  // TODO: Fetch comments for selected PR
  console.log('[PRComments] Selected PR:', selectedPr.value)
})

/**
 * Handle refresh comments.
 *
 * @private
 */
const handleRefresh = (): void => {
  success('Refreshing comments...')
}

/**
 * Handle open PR in GitHub.
 *
 * @private
 */
const handleOpenPr = (): void => {
  if (selectedPr.value) {
    console.log('[PRComments] Opening PR #', selectedPr.value)
    success(`Opening PR #${selectedPr.value} in GitHub`)
  }
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

.modal-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.pr-selector {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.select-input {
  padding: 10px 12px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 14px;
  color: var(--text-primary);
}

.comments-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
}

.empty-state,
.placeholder {
  text-align: center;
  padding: 48px 24px;
  color: var(--text-secondary);
}

.comments-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.comment-card {
  padding: 16px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.comment-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.author-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.author-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.comment-time {
  font-size: 12px;
  color: var(--text-secondary);
}

.comment-type {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 500;
}

.comment-type.review {
  background-color: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.comment-type.comment {
  background-color: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.comment-body {
  font-size: 13px;
  color: var(--text-primary);
  line-height: 1.5;
}

.comment-context {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background-color: var(--bg-primary);
  border-radius: 4px;
  font-size: 12px;
}

.comment-context code {
  color: var(--text-secondary);
  font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
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
