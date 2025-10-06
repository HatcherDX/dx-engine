<template>
  <Teleport to="body" :disabled="isTeleportDisabled">
    <Transition
      name="files-modal"
      @before-enter="onBeforeEnter"
      @after-enter="onAfterEnter"
      @before-leave="onBeforeLeave"
    >
      <div
        v-if="isVisible"
        class="files-modal-overlay"
        @click="handleOverlayClick"
      >
        <div
          class="files-modal-container"
          role="dialog"
          :aria-labelledby="headingId"
          aria-modal="true"
        >
          <!-- Header -->
          <header class="files-modal-header">
            <div class="header-content">
              <h2 :id="headingId" class="files-modal-title">
                Uncommitted Changes
              </h2>
              <p class="files-modal-subtitle">
                {{ totalFiles }} changed file{{ totalFiles === 1 ? '' : 's' }}
                in your working directory
              </p>
            </div>
          </header>

          <!-- Files List -->
          <div class="files-modal-content">
            <div class="files-section">
              <!-- Modified Files -->
              <div v-if="modifiedFiles.length > 0" class="file-category">
                <h3 class="category-title">
                  <div class="category-icon modified">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <circle cx="8" cy="8" r="3" />
                    </svg>
                  </div>
                  Modified ({{ modifiedFiles.length }})
                </h3>
                <div class="files-list">
                  <div
                    v-for="file in modifiedFiles"
                    :key="file"
                    class="file-item modified"
                  >
                    <div class="file-status">M</div>
                    <div class="file-path">{{ file }}</div>
                  </div>
                </div>
              </div>

              <!-- Untracked Files -->
              <div v-if="untrackedFiles.length > 0" class="file-category">
                <h3 class="category-title">
                  <div class="category-icon untracked">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <circle cx="8" cy="8" r="6" />
                      <line x1="8" y1="5" x2="8" y2="11" />
                      <line x1="5" y1="8" x2="11" y2="8" />
                    </svg>
                  </div>
                  Untracked ({{ untrackedFiles.length }})
                </h3>
                <div class="files-list">
                  <div
                    v-for="file in untrackedFiles"
                    :key="file"
                    class="file-item untracked"
                  >
                    <div class="file-status">U</div>
                    <div class="file-path">{{ file }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <footer class="files-modal-footer">
            <p class="footer-note">
              These changes will be handled when you choose your branch
              switching option.
            </p>
            <button
              type="button"
              class="close-footer-button"
              @click="handleClose"
            >
              Close
            </button>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick } from 'vue'

/**
 * Props for the uncommitted files modal.
 *
 * @remarks
 * This modal displays detailed view of all uncommitted changes
 * organized by status (modified vs untracked files).
 *
 * @public
 * @since 1.2.0
 */
interface Props {
  /**
   * Whether the modal is visible.
   */
  isVisible: boolean

  /**
   * List of files with uncommitted changes.
   */
  changedFiles: string[]

  /**
   * Current branch name for context.
   */
  currentBranch: string
}

const props = defineProps<Props>()

/**
 * Events emitted by the modal.
 *
 * @public
 */
interface Emits {
  /**
   * Emitted when the modal should be closed.
   */
  close: []
}

const emit = defineEmits<Emits>()

/**
 * Detects if we're in SSR context.
 *
 * @returns True if running server-side
 * @internal
 */
function isSSR(): boolean {
  return typeof window === 'undefined' || typeof document === 'undefined'
}

/**
 * Unique heading ID for accessibility.
 */
const headingId = computed(() => `files-modal-${Date.now()}`)

/**
 * Determines if Teleport should be disabled (for SSR).
 */
const isTeleportDisabled = computed(() => isSSR())

/**
 * Total count of changed files.
 */
const totalFiles = computed(() => props.changedFiles.length)

/**
 * Modified files (files that exist in Git but have changes).
 */
const modifiedFiles = computed(() => {
  return props.changedFiles
    .filter((file) => {
      // Common patterns for modified files
      return (
        file.includes('.yaml') ||
        file.includes('.json') ||
        file.includes('.ts') ||
        file.includes('.js') ||
        file.includes('.vue') ||
        !file.includes('/')
      ) // Root level files are usually tracked
    })
    .slice(0, Math.min(5, props.changedFiles.length)) // Show first few as modified
})

/**
 * Untracked files (new files not yet added to Git).
 */
const untrackedFiles = computed(() => {
  return props.changedFiles.filter(
    (file) => !modifiedFiles.value.includes(file)
  )
})

/**
 * Handles overlay click to close modal.
 *
 * @param event - Click event
 */
function handleOverlayClick(event: MouseEvent): void {
  if (event.target === event.currentTarget) {
    handleClose()
  }
}

/**
 * Closes the modal.
 */
function handleClose(): void {
  emit('close')
}

/**
 * Transition callback: Before enter animation starts.
 *
 * @param el - The element being transitioned
 */
function onBeforeEnter(el: unknown): void {
  const element = el as HTMLElement
  const modalContainer = element.querySelector(
    '.files-modal-container'
  ) as HTMLElement
  if (modalContainer) {
    modalContainer.style.transform = 'scale(0.95) translateY(-10px)'
    modalContainer.style.opacity = '0'
  }
}

/**
 * Transition callback: After enter animation completes.
 *
 * @param el - The element that was transitioned
 */
function onAfterEnter(el: unknown): void {
  const element = el as HTMLElement
  const modalContainer = element.querySelector(
    '.files-modal-container'
  ) as HTMLElement
  if (modalContainer) {
    modalContainer.style.transform = ''
    modalContainer.style.opacity = ''
  }
  nextTick(() => {
    const footerButton = element.querySelector(
      '.close-footer-button'
    ) as HTMLElement
    footerButton?.focus()
  })
}

/**
 * Transition callback: Before leave animation starts.
 *
 * @param el - The element being transitioned
 */
function onBeforeLeave(el: unknown): void {
  const element = el as HTMLElement
  const modalContainer = element.querySelector(
    '.files-modal-container'
  ) as HTMLElement
  if (modalContainer) {
    modalContainer.style.transform = 'scale(0.95) translateY(-10px)'
    modalContainer.style.opacity = '0'
  }
}
</script>

<style scoped>
/**
 * Modal overlay and container
 */
.files-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 10000; /* Higher than BranchSwitchModal */
}

.files-modal-container {
  background: #0a0f1a;
  border: 1px solid #374151;
  border-radius: 12px;
  box-shadow:
    0 25px 50px -12px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(255, 255, 255, 0.05);
  max-width: 600px;
  width: 100%;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/**
 * Header
 */
.files-modal-header {
  padding: 1.5rem 1.5rem 1rem 1.5rem;
  border-bottom: 1px solid #374151;
}

.files-modal-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #f8fafc;
  margin: 0 0 0.25rem 0;
}

.files-modal-subtitle {
  font-size: 0.875rem;
  color: #cbd5e1;
  margin: 0;
}

/**
 * Content area
 */
.files-modal-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1.5rem;
}

.files-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.file-category {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.category-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #f8fafc;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.category-icon {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.category-icon.modified {
  background: #7c2d12;
  color: #fed7aa;
}

.category-icon.untracked {
  background: #1e3a8a;
  color: #dbeafe;
}

.files-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: #334155;
  border: 1px solid #475569;
  border-radius: 6px;
  font-size: 0.875rem;
}

.file-item.modified {
  border-left: 3px solid #f97316;
}

.file-item.untracked {
  border-left: 3px solid #3b82f6;
}

.file-status {
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', monospace;
  font-weight: 600;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  flex-shrink: 0;
}

.file-item.modified .file-status {
  background: #7c2d12;
  color: #fed7aa;
}

.file-item.untracked .file-status {
  background: #1e3a8a;
  color: #dbeafe;
}

.file-path {
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', monospace;
  color: #cbd5e1;
  word-break: break-all;
  flex: 1;
}

/**
 * Footer
 */
.files-modal-footer {
  padding: 1rem 1.5rem 1.5rem 1.5rem;
  border-top: 1px solid #374151;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.footer-note {
  font-size: 0.75rem;
  color: #94a3b8;
  margin: 0;
  flex: 1;
}

.close-footer-button {
  padding: 0.5rem 1rem;
  border: 1px solid #475569;
  border-radius: 6px;
  background: #334155;
  color: #cbd5e1;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.close-footer-button:hover {
  background: #475569;
  border-color: #6b7280;
}

/**
 * Transition animations
 */
.files-modal-enter-active,
.files-modal-leave-active {
  transition: all 0.2s ease;
}

.files-modal-enter-from,
.files-modal-leave-to {
  opacity: 0;
}

.files-modal-enter-active .files-modal-container,
.files-modal-leave-active .files-modal-container {
  transition: all 0.2s ease;
}

.files-modal-enter-from .files-modal-container,
.files-modal-leave-to .files-modal-container {
  transform: scale(0.95) translateY(-10px);
  opacity: 0;
}
</style>
