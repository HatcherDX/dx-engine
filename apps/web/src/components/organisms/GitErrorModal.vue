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
      >
        <div class="modal-container" @click.stop>
          <!-- Header -->
          <header class="modal-header">
            <div class="modal-header-content">
              <div class="error-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L22 20H2L12 2Z" fill="#fbbf24" />
                  <path
                    d="M12 8V13"
                    stroke="white"
                    stroke-width="2"
                    stroke-linecap="round"
                  />
                  <circle cx="12" cy="17" r="1.5" fill="white" />
                </svg>
              </div>
              <div class="header-text">
                <div class="title-row">
                  <h2 :id="headingId" class="modal-title">
                    Branch Switch Blocked
                  </h2>
                  <span class="error-badge-pill" :class="errorTypeClass">
                    {{ errorTypeLabel }}
                  </span>
                </div>
                <p class="modal-subtitle">
                  {{ error.message }}
                </p>
              </div>
            </div>
          </header>

          <!-- Content -->
          <div class="modal-content">
            <!-- Modified Files Section -->
            <div
              v-if="error.modifiedFiles?.length"
              class="files-section modified-files"
            >
              <div class="section-header">
                <h3 class="section-title">
                  <span class="section-icon modified">M</span>
                  Modified Files ({{ error.modifiedFiles.length }})
                </h3>
                <button
                  type="button"
                  class="toggle-button"
                  :aria-expanded="showModifiedFiles"
                  @click="showModifiedFiles = !showModifiedFiles"
                >
                  <span>{{ showModifiedFiles ? 'Hide' : 'Show' }}</span>
                  <svg
                    class="toggle-icon"
                    :class="{ rotated: showModifiedFiles }"
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                  >
                    <path
                      d="M4 6L8 10L12 6"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </button>
              </div>

              <Transition
                name="expand"
                enter-active-class="expand-enter-active"
                leave-active-class="expand-leave-active"
                enter-from-class="expand-enter-from"
                leave-to-class="expand-leave-to"
              >
                <div v-if="showModifiedFiles" class="files-list modified-list">
                  <div
                    v-for="file in error.modifiedFiles"
                    :key="file"
                    class="file-item modified-file"
                  >
                    <div class="file-icon">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        <circle
                          cx="8"
                          cy="8"
                          r="6"
                          fill="#fbbf24"
                          stroke="#f59e0b"
                          stroke-width="1"
                        />
                        <text
                          x="8"
                          y="11"
                          text-anchor="middle"
                          font-size="8"
                          fill="white"
                        >
                          M
                        </text>
                      </svg>
                    </div>
                    <span class="file-path">{{ file }}</span>
                  </div>
                </div>
              </Transition>
            </div>

            <!-- Untracked Files Section -->
            <div
              v-if="error.untrackedFiles?.length"
              class="files-section untracked-files"
            >
              <div class="section-header">
                <h3 class="section-title">
                  <span class="section-icon untracked">+</span>
                  Untracked Files ({{ error.untrackedFiles.length }})
                </h3>
                <button
                  type="button"
                  class="toggle-button"
                  :aria-expanded="showUntrackedFiles"
                  @click="showUntrackedFiles = !showUntrackedFiles"
                >
                  <span>{{
                    showUntrackedFiles
                      ? 'Hide'
                      : error.untrackedFiles.length > 5
                        ? `Show ${Math.min(5, error.untrackedFiles.length)} of ${error.untrackedFiles.length}`
                        : 'Show all'
                  }}</span>
                  <svg
                    class="toggle-icon"
                    :class="{ rotated: showUntrackedFiles }"
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                  >
                    <path
                      d="M4 6L8 10L12 6"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </button>
              </div>

              <Transition
                name="expand"
                enter-active-class="expand-enter-active"
                leave-active-class="expand-leave-active"
                enter-from-class="expand-enter-from"
                leave-to-class="expand-leave-to"
              >
                <div
                  v-if="showUntrackedFiles"
                  class="files-list untracked-list"
                >
                  <div
                    v-for="file in displayedUntrackedFiles"
                    :key="file"
                    class="file-item untracked-file"
                  >
                    <div class="file-icon">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        <circle
                          cx="8"
                          cy="8"
                          r="6"
                          fill="#22c55e"
                          stroke="#16a34a"
                          stroke-width="1"
                        />
                        <text
                          x="8"
                          y="11"
                          text-anchor="middle"
                          font-size="8"
                          fill="white"
                        >
                          +
                        </text>
                      </svg>
                    </div>
                    <span class="file-path">{{ file }}</span>
                  </div>
                  <div
                    v-if="
                      error.untrackedFiles.length > 5 && !showAllUntrackedFiles
                    "
                    class="more-files-indicator"
                    @click="showAllUntrackedFiles = true"
                  >
                    <span class="more-files-text">
                      ... and {{ error.untrackedFiles.length - 5 }} more file{{
                        error.untrackedFiles.length - 5 > 1 ? 's' : ''
                      }}
                    </span>
                  </div>
                </div>
              </Transition>
            </div>

            <!-- Solutions Section -->
            <div v-if="error.suggestions?.length" class="solutions-section">
              <h3 class="section-title">
                <span class="section-icon solutions">✓</span>
                Available Solutions
              </h3>
              <div class="solutions-grid">
                <div
                  v-for="(suggestion, index) in error.suggestions"
                  :key="index"
                  class="solution-card"
                >
                  <div class="solution-header">
                    <div class="solution-number">{{ index + 1 }}</div>
                    <h4 class="solution-title">
                      {{ getSolutionTitle(suggestion) }}
                    </h4>
                  </div>
                  <p class="solution-description">
                    {{ getSolutionDescription(suggestion) }}
                  </p>
                  <div
                    v-if="getSolutionCommand(suggestion)"
                    class="solution-command"
                  >
                    <code>{{ getSolutionCommand(suggestion) }}</code>
                    <button
                      type="button"
                      class="copy-button"
                      :aria-label="`Copy command: ${getSolutionCommand(suggestion)}`"
                      @click="copyToClipboard(getSolutionCommand(suggestion)!)"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                      >
                        <path
                          d="M11.5 4.5H6.5C5.95 4.5 5.5 4.95 5.5 5.5V10.5C5.5 11.05 5.95 11.5 6.5 11.5H11.5C12.05 11.5 12.5 11.05 12.5 10.5V5.5C12.5 4.95 12.05 4.5 11.5 4.5Z"
                          stroke="currentColor"
                          fill="none"
                          stroke-width="1"
                        />
                        <path
                          d="M2.5 9.5H1.5C1.22 9.5 1 9.28 1 9V3C1 2.72 1.22 2.5 1.5 2.5H7.5C7.78 2.5 8 2.72 8 3V4"
                          stroke="currentColor"
                          fill="none"
                          stroke-width="1"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <footer class="modal-footer">
            <slot
              name="custom-actions"
              :error="error"
              :close="() => $emit('close')"
            >
              <button
                type="button"
                class="secondary-button"
                @click="handleClose"
              >
                {{ copySuccess ? 'Copied ✓' : 'Got it' }}
              </button>
              <button
                v-if="error.canForce"
                type="button"
                class="primary-button danger"
                :disabled="isProcessing"
                @click="handleForceSwitch"
              >
                {{ isProcessing ? 'Processing...' : 'Force Switch (caution)' }}
              </button>
            </slot>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'

/**
 * Detects if the application is running in SSR context.
 *
 * @returns True if in SSR context, false otherwise
 */
function isSSR(): boolean {
  return typeof window === 'undefined' || typeof document === 'undefined'
}

/**
 * Props interface for the Git Error Modal component.
 *
 * @remarks
 * Defines the structure for Git branch switching error information
 * and modal visibility state.
 *
 * @public
 * @since 1.0.0
 */
interface Props {
  /**
   * Whether the modal is visible.
   * @defaultValue false
   */
  isVisible: boolean

  /**
   * Git error information with detailed context.
   */
  error: {
    success: boolean
    currentBranch: string
    message: string
    errorType?: 'uncommitted_changes' | 'untracked_files' | 'both' | 'other'
    affectedFiles?: string[]
    modifiedFiles?: string[]
    untrackedFiles?: string[]
    suggestions?: string[]
    canForce?: boolean
    rawError?: string
  }
}

/**
 * Emits interface for the Git Error Modal component.
 *
 * @remarks
 * Events emitted by the modal for parent component interaction.
 *
 * @public
 * @since 1.0.0
 */
interface Emits {
  /**
   * Emitted when the modal should be closed.
   */
  (e: 'close'): void

  /**
   * Emitted when user chooses to force the branch switch.
   */
  (e: 'force-switch'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Reactive state
const showModifiedFiles = ref(false)
const showUntrackedFiles = ref(false)
const showAllUntrackedFiles = ref(false)
const headingId = ref(`git-error-modal-${Date.now()}`)
const copySuccess = ref(false)
const isProcessing = ref(false)
const copyTimeoutId = ref<number | null>(null)

/**
 * Computed property to determine if Teleport should be disabled.
 *
 * @remarks
 * Follows Vue.js core SSR patterns for Teleport handling.
 * Disables teleport during SSR and when document.body is not available.
 */
const isTeleportDisabled = computed(() => {
  return isSSR() || !document?.body
})

/**
 * Computed property for displaying untracked files with smart truncation.
 */
const displayedUntrackedFiles = computed(() => {
  if (!props.error.untrackedFiles) return []

  if (showAllUntrackedFiles.value || props.error.untrackedFiles.length <= 5) {
    return props.error.untrackedFiles
  }

  return props.error.untrackedFiles.slice(0, 5)
})

/**
 * Computed class for error type styling.
 *
 * @remarks
 * Maps Git error types to CSS classes for visual distinction.
 *
 * @returns CSS class string based on error type
 */
const errorTypeClass = computed(() => {
  switch (props.error.errorType) {
    case 'uncommitted_changes':
      return 'error-badge--warning'
    case 'untracked_files':
      return 'error-badge--info'
    case 'both':
      return 'error-badge--muted'
    default:
      return 'error-badge--default'
  }
})

/**
 * Computed label for error type display.
 *
 * @remarks
 * Provides user-friendly Spanish labels for Git error types.
 *
 * @returns Localized error type description
 */
const errorTypeLabel = computed(() => {
  switch (props.error.errorType) {
    case 'uncommitted_changes':
      return 'Uncommitted Changes'
    case 'untracked_files':
      return 'Untracked Files'
    case 'both':
      return 'Pending Changes'
    default:
      return 'Git Error'
  }
})

/**
 * Extracts solution title from suggestion text.
 *
 * @param suggestion - Raw Git suggestion text
 * @returns User-friendly solution title
 *
 * @example
 * ```typescript
 * getSolutionTitle('git stash') // 'Guardar cambios temporalmente'
 * ```
 */
function getSolutionTitle(suggestion: string): string {
  if (suggestion.includes('stash')) {
    return 'Save changes temporarily'
  }
  if (suggestion.includes('commit')) {
    return 'Commit current changes'
  }
  if (suggestion.includes('reset')) {
    return 'Discard changes'
  }
  if (suggestion.includes('add')) {
    return 'Add files to tracking'
  }
  return 'Git Solution'
}

/**
 * Provides detailed description for solution.
 *
 * @param suggestion - Raw Git suggestion text
 * @returns Detailed explanation in Spanish
 */
function getSolutionDescription(suggestion: string): string {
  if (suggestion.includes('stash')) {
    return 'Temporarily saves your changes without committing, allowing you to switch branches.'
  }
  if (suggestion.includes('commit')) {
    return 'Commits the current changes before switching branches.'
  }
  if (suggestion.includes('reset')) {
    return 'Permanently discards uncommitted changes. Caution! This action cannot be undone.'
  }
  if (suggestion.includes('add')) {
    return 'Adds the new files to Git tracking before continuing.'
  }
  return suggestion
}

/**
 * Extracts Git command from suggestion.
 *
 * @param suggestion - Raw Git suggestion text
 * @returns Git command or null if not extractable
 */
function getSolutionCommand(suggestion: string): string | null {
  const gitCommandMatch = suggestion.match(/git\s+[\w\s.-]+/)
  return gitCommandMatch ? gitCommandMatch[0].trim() : null
}

/**
 * Copies text to system clipboard with visual feedback.
 *
 * @param text - Text to copy to clipboard
 *
 * @throws Will log error if clipboard operation fails
 *
 * @example
 * ```typescript
 * await copyToClipboard('git stash')
 * ```
 */
async function copyToClipboard(text: string): Promise<void> {
  try {
    await window.navigator.clipboard.writeText(text)

    // Visual feedback
    copySuccess.value = true

    // Clear previous timeout
    if (copyTimeoutId.value) {
      clearTimeout(copyTimeoutId.value)
    }

    // Reset success state after 2 seconds
    copyTimeoutId.value = window.setTimeout(() => {
      copySuccess.value = false
    }, 2000)
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    // Could show error toast here
  }
}

/**
 * Enhanced close handler with processing state.
 */
function handleClose(): void {
  emit('close')
}

/**
 * Enhanced force switch handler with processing state.
 */
function handleForceSwitch(): void {
  isProcessing.value = true
  emit('force-switch')
  // Processing state will be reset when modal closes
}

/**
 * Transition callback: Before enter animation starts.
 *
 * @param el - The element being transitioned
 */
// eslint-disable-next-line no-undef
function onBeforeEnter(el: Element): void {
  // Prepare element for animation
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
  // Focus management after animation
  nextTick(() => {
    const firstButton = el.querySelector('button') as HTMLElement
    firstButton?.focus()
  })
}

/**
 * Transition callback: Before leave animation starts.
 *
 * @param el - The element being transitioned
 */
function onBeforeLeave(): void {
  // Cleanup any timeouts
  if (copyTimeoutId.value) {
    clearTimeout(copyTimeoutId.value)
    copyTimeoutId.value = null
  }

  // Reset states
  copySuccess.value = false
  isProcessing.value = false
}

/**
 * Transition callback: After leave animation completes.
 *
 * @param el - The element that was transitioned
 */
function onAfterLeave(): void {
  // Final cleanup after modal is completely hidden
  showModifiedFiles.value = false
  showUntrackedFiles.value = false
  showAllUntrackedFiles.value = false
}

/**
 * Handles clicking on modal overlay for closing.
 *
 * @param event - Mouse click event
 */
function handleOverlayClick(event: MouseEvent): void {
  if (event.target === event.currentTarget) {
    emit('close')
  }
}

/**
 * Handles escape key press for closing modal.
 *
 * @param event - Keyboard event
 */
function handleEscapeKey(event: KeyboardEvent): void {
  if (event.key === 'Escape' && props.isVisible) {
    emit('close')
  }
}

/**
 * Manages focus trap within modal for accessibility.
 *
 * @param event - Keyboard event
 */
function handleTabTrap(event: KeyboardEvent): void {
  if (event.key !== 'Tab' || !props.isVisible) return

  const modal = document.querySelector('.modal-container')
  if (!modal) return

  const focusableElements = modal.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )

  const firstElement = focusableElements[0] as HTMLElement
  const lastElement = focusableElements[
    focusableElements.length - 1
  ] as HTMLElement

  if (event.shiftKey) {
    if (document.activeElement === firstElement) {
      lastElement?.focus()
      event.preventDefault()
    }
  } else {
    if (document.activeElement === lastElement) {
      firstElement?.focus()
      event.preventDefault()
    }
  }
}

// Lifecycle hooks for accessibility
onMounted(() => {
  document.addEventListener('keydown', handleEscapeKey)
  document.addEventListener('keydown', handleTabTrap)

  if (props.isVisible) {
    nextTick(() => {
      const firstButton = document.querySelector(
        '.modal-container button'
      ) as HTMLElement
      firstButton?.focus()
    })
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscapeKey)
  document.removeEventListener('keydown', handleTabTrap)

  // Cleanup timeouts
  if (copyTimeoutId.value) {
    clearTimeout(copyTimeoutId.value)
  }
})
</script>

<style scoped>
/**
 * Modal overlay and transition animations
 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
  opacity: 1 !important;
}

.modal-container {
  opacity: 1 !important;
}

.modal-container {
  background: white;
  border-radius: 16px;
  box-shadow:
    0 25px 50px -12px rgba(0, 0, 0, 0.25),
    0 0 0 1px rgba(0, 0, 0, 0.05);
  max-width: 640px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/**
 * Modal transitions with advanced keyframes
 */
.modal-enter-active {
  animation: modal-bounce-in 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.modal-leave-active {
  animation: modal-fade-out 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes modal-bounce-in {
  0% {
    opacity: 0;
    transform: scale(0.9) translateY(-20px);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.03) translateY(-5px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes modal-fade-out {
  0% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
  100% {
    opacity: 0;
    transform: scale(0.95) translateY(-10px);
  }
}

/* Backup fallback for browsers that don't support animations */
@media (prefers-reduced-motion: reduce) {
  .modal-enter-active,
  .modal-leave-active {
    animation: none;
    transition: opacity 0.2s ease;
  }

  .modal-enter-from,
  .modal-leave-to {
    opacity: 0;
  }
}

/**
 * Expand transitions for file list with spring animation
 */
.expand-enter-active {
  animation: expand-spring-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  overflow: hidden;
}

.expand-leave-active {
  animation: expand-fade-out 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

@keyframes expand-spring-in {
  0% {
    opacity: 0;
    max-height: 0;
    transform: translateY(-8px) scale(0.98);
  }
  60% {
    opacity: 0.8;
    max-height: 200px;
    transform: translateY(2px) scale(1.01);
  }
  100% {
    opacity: 1;
    max-height: 200px;
    transform: translateY(0) scale(1);
  }
}

@keyframes expand-fade-out {
  0% {
    opacity: 1;
    max-height: 200px;
    transform: translateY(0) scale(1);
  }
  100% {
    opacity: 0;
    max-height: 0;
    transform: translateY(-8px) scale(0.98);
  }
}

/**
 * Header section
 */
.modal-header {
  padding: 1.5rem 1.5rem 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header-content {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.error-icon {
  flex-shrink: 0;
  width: 2.5rem;
  height: 2.5rem;
  background: #fef3c7;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #d97706;
  border: 1px solid #fbbf24;
}

.header-text {
  flex: 1;
  min-width: 0;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.25rem;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
  line-height: 1.3;
}

.error-badge-pill {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  font-size: 0.625rem;
  font-weight: 400;
  border-radius: 8px;
  white-space: nowrap;
  text-transform: lowercase;
  letter-spacing: 0;
  margin-left: 0.5rem;
}

.modal-subtitle {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
  line-height: 1.4;
  word-break: break-word;
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
 * Error badge
 */
.error-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 1rem;
  border-radius: 2rem;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 1.5rem;
}

.error-badge--warning {
  background: #fef3c7;
  color: #d97706;
  border: 1px solid #fbbf24;
}

.error-badge--info {
  background: #dbeafe;
  color: #2563eb;
  border: 1px solid #60a5fa;
}

.error-badge--danger {
  background: #fee2e2;
  color: #dc2626;
  border: 1px solid #f87171;
}
.error-badge--muted {
  background: #f3f4f6;
  color: #6b7280;
  border: 1px solid #d1d5db;
}

.error-badge--default {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

/**
 * Files section
 */
.files-section {
  margin-bottom: 1.5rem;
}

/**
 * Section icons
 */
.section-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  margin-right: 8px;
  font-family:
    ui-monospace, 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
}

.section-icon.modified {
  background: #fef3c7;
  color: #d97706;
  border: 1px solid #fbbf24;
}

.section-icon.untracked {
  background: #dcfce7;
  color: #16a34a;
  border: 1px solid #22c55e;
}

.section-icon.solutions {
  background: #e0f2fe;
  color: #0284c7;
  border: 1px solid #38bdf8;
}

.modified-files .section-title {
  color: #f59e0b;
}

.untracked-files .section-title {
  color: #16a34a;
}

.modified-file .file-icon {
  color: #f59e0b;
}

.untracked-file .file-icon {
  color: #16a34a;
}

.more-files-indicator {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: #f3f4f6;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.more-files-indicator:hover {
  background: #e5e7eb;
}

.more-files-text {
  color: #6b7280;
  font-size: 0.875rem;
  font-style: italic;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.toggle-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  background: white;
  color: #6b7280;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.toggle-button:hover {
  border-color: #9ca3af;
  color: #374151;
}

.toggle-button:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 1px;
}

.toggle-icon {
  transition: transform 0.2s ease;
}

.toggle-icon.rotated {
  transform: rotate(180deg);
}

.files-list {
  background: #f9fafb;
  border-radius: 0.75rem;
  padding: 1rem;
  border: 1px solid #e5e7eb;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0;
  font-size: 0.875rem;
}

.file-item:not(:last-child) {
  border-bottom: 1px solid #e5e7eb;
}

.file-icon {
  flex-shrink: 0;
  color: #6b7280;
}

.file-path {
  color: #374151;
  font-family:
    ui-monospace, SFMono-Regular, 'SF Mono', Consolas, 'Liberation Mono', Menlo,
    monospace;
  word-break: break-all;
}

/**
 * Solutions section  
 */
.solutions-section {
  margin-bottom: 1.5rem;
}

.solutions-grid {
  display: grid;
  gap: 1rem;
  margin-top: 1rem;
}

.solution-card {
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  padding: 1rem;
  background: white;
  transition: all 0.15s ease;
  transform: translateY(0);
}

.solution-card:hover {
  border-color: #d1d5db;
  box-shadow: 0 4px 12px 0 rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
  animation: card-lift 0.3s ease-out;
}

@keyframes card-lift {
  0% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-4px);
  }
  100% {
    transform: translateY(-2px);
  }
}

.solution-header {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.solution-number {
  flex-shrink: 0;
  width: 1.5rem;
  height: 1.5rem;
  background: #3b82f6;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
}

.solution-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
  line-height: 1.3;
}

.solution-description {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0 0 0.75rem;
  line-height: 1.4;
  padding-left: 2.25rem;
}

.solution-command {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-left: 2.25rem;
}

.solution-command code {
  flex: 1;
  font-family:
    ui-monospace, SFMono-Regular, 'SF Mono', Consolas, 'Liberation Mono', Menlo,
    monospace;
  font-size: 0.8125rem;
  background: #f3f4f6;
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  border: 1px solid #e5e7eb;
  color: #374151;
}

.copy-button {
  flex-shrink: 0;
  width: 1.75rem;
  height: 1.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  background: white;
  color: #6b7280;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.copy-button:hover {
  border-color: #9ca3af;
  background: #f9fafb;
  color: #374151;
  transform: translateY(-1px);
  animation: pulse-subtle 0.6s ease-in-out;
}

.copy-button:active {
  transform: translateY(0);
  animation: click-bounce 0.15s ease-out;
}

.copy-button:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 1px;
  animation: focus-ring 0.3s ease-out;
}

@keyframes pulse-subtle {
  0%,
  100% {
    transform: translateY(-1px) scale(1);
  }
  50% {
    transform: translateY(-1px) scale(1.05);
  }
}

@keyframes click-bounce {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(0.95);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes focus-ring {
  0% {
    outline-offset: 1px;
  }
  50% {
    outline-offset: 3px;
  }
  100% {
    outline-offset: 1px;
  }
}

/**
 * Footer section
 */
.modal-footer {
  padding: 1rem 1.5rem 1.5rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.secondary-button,
.primary-button {
  padding: 0.625rem 1.25rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  border: 1px solid;
}

.secondary-button {
  background: white;
  border-color: #d1d5db;
  color: #374151;
}

.secondary-button:hover {
  border-color: #9ca3af;
  background: #f9fafb;
}

.secondary-button:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 1px;
}

.primary-button {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

.primary-button:hover {
  background: #2563eb;
  border-color: #2563eb;
}

.primary-button:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 1px;
}

.primary-button.danger {
  background: #dc2626;
  border-color: #dc2626;
}

.primary-button.danger:hover {
  background: #b91c1c;
  border-color: #b91c1c;
}

/**
 * Responsive design
 */
@media (max-width: 768px) {
  .modal-overlay {
    padding: 0.5rem;
  }

  .modal-header {
    padding: 1rem 1rem 0.75rem;
  }

  .modal-content {
    padding: 0 1rem;
  }

  .modal-footer {
    padding: 0.75rem 1rem 1rem;
    flex-direction: column-reverse;
  }

  .modal-footer button {
    width: 100%;
  }

  .solution-header {
    flex-direction: column;
    gap: 0.5rem;
  }

  .solution-description,
  .solution-command {
    padding-left: 0;
  }

  .solution-command {
    flex-direction: column;
    align-items: stretch;
  }

  .copy-button {
    align-self: flex-end;
  }
}

/**
 * Dark mode support
 */
@media (prefers-color-scheme: dark) {
  .modal-container {
    background: #1f2937;
    box-shadow:
      0 25px 50px -12px rgba(0, 0, 0, 0.5),
      0 0 0 1px rgba(255, 255, 255, 0.1);
  }

  .modal-header {
    border-bottom-color: #374151;
  }

  .modal-title {
    color: #f9fafb;
  }

  .modal-subtitle {
    color: #d1d5db;
  }

  .section-title {
    color: #f9fafb;
  }

  .toggle-button {
    background: #374151;
    border-color: #4b5563;
    color: #d1d5db;
  }

  .toggle-button:hover {
    border-color: #6b7280;
    color: #f9fafb;
  }

  .files-list {
    background: #374151;
    border-color: #4b5563;
  }

  .file-item {
    border-bottom-color: #4b5563;
  }

  .file-path {
    color: #e5e7eb;
  }

  .solution-card {
    background: #374151;
    border-color: #4b5563;
  }

  .solution-card:hover {
    border-color: #6b7280;
  }

  .solution-title {
    color: #f9fafb;
  }

  .solution-description {
    color: #d1d5db;
  }

  .solution-command code {
    background: #1f2937;
    border-color: #4b5563;
    color: #e5e7eb;
  }

  .copy-button {
    background: #1f2937;
    border-color: #4b5563;
    color: #d1d5db;
  }

  .copy-button:hover {
    background: #374151;
    border-color: #6b7280;
    color: #f9fafb;
  }

  .modal-footer {
    border-top-color: #374151;
  }

  .secondary-button {
    background: #374151;
    border-color: #4b5563;
    color: #e5e7eb;
  }

  .secondary-button:hover {
    border-color: #6b7280;
    background: #4b5563;
  }
}
</style>
