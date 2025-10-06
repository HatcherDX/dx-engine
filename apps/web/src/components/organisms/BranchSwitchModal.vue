<template>
  <Teleport :disabled="isTeleportDisabled" to="body">
    <Transition
      name="modal"
      enter-active-class="modal-enter-active"
      leave-active-class="modal-leave-active"
      enter-from-class="modal-enter-from"
      leave-to-class="modal-leave-to"
      :css="true"
      @before-enter="onBeforeEnter"
      @after-enter="onAfterEnter"
      @before-leave="onBeforeLeave"
      @after-leave="onAfterLeave"
    >
      <div
        v-if="isVisible"
        class="modal-overlay"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="headingId"
        @click="handleOverlayClick"
        @keydown.escape="handleClose"
      >
        <div class="modal-container" @click.stop>
          <!-- Header -->
          <header class="modal-header">
            <div class="modal-header-content">
              <div class="switch-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <!-- Git branch icon -->
                  <circle
                    cx="6"
                    cy="6"
                    r="3"
                    stroke="#60a5fa"
                    stroke-width="2"
                    fill="#60a5fa"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="3"
                    stroke="#60a5fa"
                    stroke-width="2"
                    fill="none"
                  />
                  <path
                    d="M6 9v6"
                    stroke="#60a5fa"
                    stroke-width="2"
                    stroke-linecap="round"
                  />
                  <path
                    d="M9 15h6"
                    stroke="#60a5fa"
                    stroke-width="2"
                    stroke-linecap="round"
                  />
                  <path
                    d="M15 15l3 3"
                    stroke="#60a5fa"
                    stroke-width="2"
                    stroke-linecap="round"
                  />
                </svg>
              </div>
              <div class="header-text">
                <h2 :id="headingId" class="modal-title">
                  Switch to "{{ targetBranch }}"
                </h2>
                <p class="modal-subtitle">
                  You have
                  <button
                    type="button"
                    class="files-count-button"
                    @click="showFilesModal"
                  >
                    {{ changedFiles.length }} uncommitted change{{
                      changedFiles.length === 1 ? '' : 's'
                    }}</button
                  >. What would you like to do?
                </p>
              </div>
            </div>
          </header>

          <!-- Content -->
          <div class="modal-content">
            <!-- Actions Section -->
            <div class="actions-section">
              <div class="action-buttons">
                <!-- Leave Changes Button -->
                <button
                  type="button"
                  class="action-button leave-changes"
                  :disabled="isProcessing"
                  @click="handleLeaveChanges"
                >
                  <div class="action-icon">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <!-- Stash/archive icon -->
                      <rect x="3" y="4" width="18" height="16" rx="2" />
                      <path d="M7 8h10" />
                      <path d="M7 12h10" />
                      <path d="M7 16h6" />
                      <circle cx="17" cy="16" r="2" />
                    </svg>
                  </div>
                  <div class="action-content">
                    <div class="action-title">
                      Leave on "{{ currentBranch }}"
                    </div>
                    <div class="action-description">
                      Stash changes temporarily
                    </div>
                  </div>
                </button>

                <!-- Bring Changes Button -->
                <button
                  type="button"
                  class="action-button bring-changes"
                  :disabled="isProcessing"
                  @click="handleBringChanges"
                >
                  <div class="action-icon">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <!-- Move/transfer icon -->
                      <path d="M3 12h13" />
                      <path d="M12 5l7 7-7 7" />
                      <rect x="3" y="8" width="4" height="8" rx="1" />
                    </svg>
                  </div>
                  <div class="action-content">
                    <div class="action-title">
                      Bring to "{{ targetBranch }}"
                    </div>
                    <div class="action-description">
                      Move changes to new branch
                    </div>
                  </div>
                </button>

                <!-- Cancel Button -->
                <button
                  type="button"
                  class="action-button cancel-action"
                  :disabled="isProcessing"
                  @click="handleClose"
                >
                  <div class="action-icon">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </div>
                  <div class="action-content">
                    <div class="action-title">Cancel</div>
                    <div class="action-description">Stay on current branch</div>
                  </div>
                </button>
              </div>

              <!-- Processing State -->
              <div v-if="isProcessing" class="processing-indicator">
                <div class="spinner"></div>
                <span>Switching branch...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Uncommitted Files Modal (Secondary Modal) -->
    <UncommittedFilesModal
      :is-visible="isFilesModalVisible"
      :changed-files="changedFiles"
      :current-branch="currentBranch"
      @close="closeFilesModal"
    />
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import UncommittedFilesModal from './UncommittedFilesModal.vue'

/**
 * Branch switching options modal props.
 *
 * @remarks
 * Provides user-friendly options for handling uncommitted changes
 * when switching branches, similar to GitHub Desktop's approach.
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
   * Current branch name.
   */
  currentBranch: string

  /**
   * Target branch name to switch to.
   */
  targetBranch: string

  /**
   * List of files with uncommitted changes.
   */
  changedFiles: string[]
}

defineProps<Props>()

/**
 * Events emitted by the modal.
 *
 * @remarks
 * The modal now uses direct action buttons instead of radio buttons
 * and a confirmation step. Users click directly on their preferred action.
 *
 * @public
 */
interface Emits {
  /**
   * Emitted when the modal should be closed without action.
   * Triggered by clicking Cancel or overlay.
   */
  close: []

  /**
   * Emitted when user clicks on an action button.
   *
   * @param option - The selected switching option ('stash' | 'bring')
   *
   * @example
   * ```typescript
   * // User clicked "Leave on current branch"
   * emit('switch', 'stash')
   *
   * // User clicked "Bring to new branch"
   * emit('switch', 'bring')
   * ```
   */
  switch: [option: 'stash' | 'bring']
}

const emit = defineEmits<Emits>()

/**
 * Detects if the application is running in SSR context.
 *
 * @returns True if in SSR context, false otherwise
 */
function isSSR(): boolean {
  return typeof window === 'undefined' || typeof document === 'undefined'
}

/**
 * Reactive state for managing modal behavior.
 */
const isProcessing = ref(false)
const isFilesModalVisible = ref(false)

/**
 * Unique heading ID for accessibility.
 */
const headingId = computed(() => `branch-switch-modal-${Date.now()}`)

/**
 * Determines if Teleport should be disabled (for SSR).
 */
const isTeleportDisabled = computed(() => isSSR())

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
 * Closes the modal and resets state.
 */
function handleClose(): void {
  isProcessing.value = false
  emit('close')
}

/**
 * Handles leaving changes on current branch (stash option).
 */
function handleLeaveChanges(): void {
  isProcessing.value = true
  emit('switch', 'stash')
}

/**
 * Handles bringing changes to new branch.
 */
function handleBringChanges(): void {
  isProcessing.value = true
  emit('switch', 'bring')
}

/**
 * Shows the detailed files modal.
 */
function showFilesModal(): void {
  isFilesModalVisible.value = true
}

/**
 * Closes the detailed files modal.
 */
function closeFilesModal(): void {
  isFilesModalVisible.value = false
}

/**
 * Transition callback: Before enter animation starts.
 *
 * @param el - The element being transitioned
 */
// eslint-disable-next-line no-undef
function onBeforeEnter(el: Element): void {
  const modalContainer = el.querySelector('.modal-container') as HTMLElement
  if (modalContainer) {
    modalContainer.style.transform = 'scale(0.9)'
    modalContainer.style.opacity = '0'
  }
}

/**
 * Transition callback: After enter animation completes.
 *
 * @param el - The element that was transitioned
 */
// eslint-disable-next-line no-undef
function onAfterEnter(el: Element): void {
  const modalContainer = el.querySelector('.modal-container') as HTMLElement
  if (modalContainer) {
    modalContainer.style.transform = ''
    modalContainer.style.opacity = ''
  }
  nextTick(() => {
    const firstButton = el.querySelector(
      '.action-button.leave-changes'
    ) as HTMLElement
    firstButton?.focus()
  })
}

/**
 * Transition callback: Before leave animation starts.
 */
function onBeforeLeave(): void {
  // Cleanup if needed
}

/**
 * Transition callback: After leave animation completes.
 */
function onAfterLeave(): void {
  // Reset state after animation
}

/**
 * Keyboard event handler for accessibility.
 */
function handleKeyDown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    handleClose()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
})
</script>

<style scoped>
/**
 * Modal overlay styles
 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  opacity: 1 !important;
}

.modal-container {
  background: #0a0f1a;
  border: 1px solid #374151;
  border-radius: 12px;
  box-shadow:
    0 25px 50px -12px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(255, 255, 255, 0.05);
  max-width: 480px;
  width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  opacity: 1 !important;
}

/**
 * Header section
 */
.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid #374151;
}

.modal-header-content {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.switch-icon {
  flex-shrink: 0;
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1e3a8a;
  border-radius: 8px;
}

.header-text {
  flex: 1;
  min-width: 0;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #f8fafc;
  margin: 0 0 0.5rem 0;
  line-height: 1.3;
}

.modal-subtitle {
  font-size: 0.875rem;
  color: #cbd5e1;
  margin: 0;
  line-height: 1.4;
}

/**
 * Content section
 */
.modal-content {
  flex: 1;
  padding: 0 1.5rem;
  overflow-y: auto;
}

/**
 * Files count button in header
 */
.files-count-button {
  background: none;
  border: none;
  color: #60a5fa;
  cursor: pointer;
  padding: 0;
  font-size: inherit;
  font-weight: inherit;
  text-decoration: underline;
  text-underline-offset: 2px;
  transition: all 0.15s ease;
}

.files-count-button:hover {
  color: #93c5fd;
  text-decoration-thickness: 2px;
}

/**
 * Actions section
 */
.actions-section {
  margin-bottom: 1.5rem;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
}

.action-button {
  border: 2px solid #475569;
  border-radius: 8px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.15s ease;
  background: #334155;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-align: left;
}

.action-button:hover:not(:disabled) {
  border-color: #6b7280;
  background: #475569;
  transform: translateY(-1px);
}

.action-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.action-button.leave-changes:hover:not(:disabled) {
  border-color: #f97316;
  background: #431407;
}

.action-button.bring-changes:hover:not(:disabled) {
  border-color: #22c55e;
  background: #052e16;
}

.action-button.cancel-action:hover:not(:disabled) {
  border-color: #6b7280;
  background: #475569;
}

.action-icon {
  flex-shrink: 0;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.leave-changes .action-icon {
  background: #7c2d12;
  color: #fed7aa;
}

.bring-changes .action-icon {
  background: #14532d;
  color: #dcfce7;
}

.cancel-action .action-icon {
  background: #475569;
  color: #cbd5e1;
}

.action-content {
  flex: 1;
}

.action-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #f8fafc;
  margin: 0 0 0.25rem 0;
}

.action-description {
  font-size: 0.75rem;
  color: #cbd5e1;
  margin: 0;
  line-height: 1.4;
}

.processing-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem;
  font-size: 0.875rem;
  color: #cbd5e1;
}

.spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid #e5e7eb;
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/**
 * Transition animations
 */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.25s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: all 0.25s ease;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.9);
  opacity: 0;
}
</style>
