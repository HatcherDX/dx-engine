<!--
/**
 * @fileoverview Terminal Easter Egg component for developer onboarding navigation.
 *
 * @description
 * A retro-style terminal interface that provides keyboard navigation for the
 * onboarding process. Features typing animations, command history, and
 * responsive design that only appears on larger screens.
 *
 * @example
 * ```vue
 * <template>
 *   <TerminalEasterEgg
 *     :current-step="currentStep"
 *     @command="handleCommand"
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
  <Transition name="terminal-slide" appear>
    <div
      v-if="isVisible"
      ref="terminalContainer"
      class="terminal-easter-egg"
      :class="{
        'terminal-typing': terminalState.isTypingLine,
        'has-exclusive-focus': hasExclusiveFocus,
      }"
      tabindex="-1"
    >
      <!-- Hidden focusable element for focus management -->
      <input
        class="terminal-focus-target"
        type="text"
        aria-hidden="true"
        @blur="handleFocusLoss"
      />
      <!-- Terminal Body -->
      <div ref="terminalBody" class="terminal-body" @click.stop>
        <div class="terminal-content">
          <!-- Terminal Lines with proper push-up animation -->
          <TransitionGroup
            name="terminal-line-slide"
            tag="div"
            class="terminal-lines-container"
          >
            <div
              v-for="(line, index) in terminalState.lines"
              :key="line.id || `line-${index}`"
              class="terminal-line"
              :class="[
                `terminal-line--${line.type}`,
                { typing: line.isTyping },
              ]"
            >
              <span
                class="line-content"
                v-html="formatLineText(line.text)"
              ></span>
              <span v-if="line.isTyping" class="typing-cursor"></span>
            </div>
          </TransitionGroup>

          <!-- Input Line - Always show cursor line -->
          <!-- Debug: {{ terminalState.isTypingLine }} -->
          <div v-if="terminalState" class="terminal-input-line">
            <span class="terminal-prompt">$</span>
            <span class="terminal-input-container">
              <span class="terminal-input">{{
                terminalState.currentInput
              }}</span>
              <span class="input-cursor" :style="cursorStyle">{{
                characterAtCursor
              }}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
/**
 * @fileoverview Terminal Easter Egg component script.
 *
 * @description
 * Reactive logic for the terminal Easter Egg component, handling display,
 * animations, and integration with the terminal composable.
 */
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useTerminalEasterEgg } from '../../composables/useTerminalEasterEgg'
import { TERMINAL_DISABLE_EVENT } from '../../directives/disableTerminal'

// Terminal composable
const {
  terminalState,
  isVisible,
  hasExclusiveFocus,
  setTerminalElement,
  deactivateAndHide,
  executeCommand,
} = useTerminalEasterEgg()

// Debug
console.log('[TerminalComponent] Terminal component initialized')
watch(
  isVisible,
  (newVal) => {
    console.log('[TerminalComponent] Terminal visibility:', newVal)
  },
  { immediate: false }
)

// Template refs
const terminalBody = ref<HTMLElement>()
const terminalContainer = ref<HTMLElement>()

// Computed property for cursor position display
const characterAtCursor = computed(() => {
  if (!terminalState.value) return ' '
  const input = terminalState.value.currentInput || ''
  const cursorPos = terminalState.value.cursorPosition ?? 0
  return input[cursorPos] || ' '
})

// Calculate cursor position in ch units (character width in monospace font)
const cursorStyle = computed(() => {
  if (!terminalState.value) return {}
  const cursorPos = terminalState.value.cursorPosition ?? 0
  // Each character in monospace font is exactly 1ch wide
  return {
    left: `${cursorPos}ch`,
  }
})

/**
 * Formats terminal line text to support bold highlighting with **text** pattern.
 * @param text - The text to format
 * @returns HTML string with bold tags
 */
function formatLineText(text: string): string {
  // Escape HTML special characters first
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

  // Replace **text** pattern with bold tags
  return escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
}

/**
 * Scrolls terminal to bottom when new content is added.
 */
function scrollToBottom(): void {
  if (terminalBody.value) {
    nextTick(() => {
      // Check again after nextTick to ensure element still exists
      if (terminalBody.value) {
        terminalBody.value.scrollTop = terminalBody.value.scrollHeight
      }
    })
  }
}

// Watch for new lines and auto-scroll
watch(
  () => terminalState.value?.lines?.length || 0,
  () => {
    scrollToBottom()
  },
  { flush: 'post' }
)

// Watch for input changes and auto-scroll
watch(
  () => terminalState.value?.currentInput,
  () => {
    scrollToBottom()
  }
)

// Focus handling removed - keyboard input is handled via Electron IPC

/**
 * Handles clicks to detect interaction with UI elements.
 * Now simplified - only checks if click is inside/outside terminal.
 * The v-disable-terminal directive handles marking interactive elements.
 */
function handleDocumentClick(event: MouseEvent): void {
  console.log(
    '[TerminalEasterEgg] handleDocumentClick - hasExclusiveFocus:',
    hasExclusiveFocus.value
  )

  if (!hasExclusiveFocus.value) {
    console.log('[TerminalEasterEgg] No exclusive focus, ignoring click')
    return
  }

  const target = event.target as HTMLElement

  // Check if click is outside terminal
  if (terminalContainer.value && !terminalContainer.value.contains(target)) {
    // Check if target has the data-disable-terminal attribute
    // This is set by the v-disable-terminal directive
    const hasDisableTerminal =
      target.hasAttribute('data-disable-terminal') ||
      target.closest('[data-disable-terminal]')

    console.log('[TerminalEasterEgg] Click outside terminal:', {
      hasDisableTerminal,
      target: target.tagName,
      className: target.className,
    })

    if (hasDisableTerminal) {
      // Element is marked by directive - deactivate terminal
      console.log(
        '[TerminalEasterEgg] Click on element with v-disable-terminal, deactivating'
      )

      // IMPORTANT: Also emit the deactivation event to clear the hasBeenActivated flag
      window.dispatchEvent(
        new window.CustomEvent('terminal-deactivate-from-ui')
      )

      deactivateAndHide()

      // Focus the clicked element after a small delay
      setTimeout(() => {
        if (
          target.focus &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'BUTTON' ||
            target.tagName === 'TEXTAREA' ||
            target.tagName === 'SELECT' ||
            target.tagName === 'A')
        ) {
          target.focus()
        }
      }, 10)
    } else {
      // Clicking on non-interactive elements keeps terminal active
      console.log(
        '[TerminalEasterEgg] Click on non-interactive element, keeping terminal active'
      )
    }
  }
}

/**
 * Handles custom event from v-disable-terminal directive.
 * This provides a more reliable way to detect interaction with UI elements.
 */
function handleDisableTerminalEvent(event: globalThis.CustomEvent): void {
  console.log(
    '[TerminalEasterEgg] Received disable-terminal event:',
    event.detail
  )
  console.log(
    '[TerminalEasterEgg] Current hasExclusiveFocus value:',
    hasExclusiveFocus.value
  )
  console.log('[TerminalEasterEgg] Terminal isVisible:', isVisible.value)

  if (!hasExclusiveFocus.value) {
    console.log(
      '[TerminalEasterEgg] Ignoring event - terminal does not have exclusive focus'
    )
    return
  }

  // Terminal should be deactivated when interacting with marked elements
  console.log(
    '[TerminalEasterEgg] Deactivating terminal due to directive event'
  )

  // Emit the deactivation event to clear the hasBeenActivated flag
  window.dispatchEvent(
    new globalThis.CustomEvent('terminal-deactivate-from-ui')
  )

  deactivateAndHide()
}

/**
 * Handle arrow key navigation for terminal cursor movement
 */
const handleKeyDown = (event: KeyboardEvent) => {
  // Only handle arrow keys when terminal is visible and in supported steps
  if (!isVisible.value) return

  const supportedSteps = ['task-detail'] // Add other steps as needed
  if (!supportedSteps.includes(terminalState.value?.currentStep || '')) return

  const arrowKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']
  if (arrowKeys.includes(event.key)) {
    console.log(`[TerminalEasterEgg] Arrow key detected: ${event.key}`)

    // Prevent default browser behavior
    event.preventDefault()
    event.stopPropagation()

    // Send arrow key to terminal via executeCommand
    executeCommand(event.key)
    console.log(
      `[TerminalEasterEgg] Sent ${event.key} to terminal via executeCommand`
    )
  }
}

onMounted(() => {
  scrollToBottom()

  // Set the terminal element reference for focus management
  if (terminalContainer.value) {
    setTerminalElement(terminalContainer.value)
  }

  // Add click listener for detecting UI interaction
  document.addEventListener('click', handleDocumentClick, true)

  // Add keydown listener for arrow keys
  document.addEventListener('keydown', handleKeyDown, true)

  // Listen for custom disable-terminal events from directive
  document.addEventListener(
    TERMINAL_DISABLE_EVENT,
    handleDisableTerminalEvent as unknown as globalThis.EventListener
  )
})

onUnmounted(() => {
  // Clean up event listeners
  document.removeEventListener('click', handleDocumentClick, true)
  document.removeEventListener('keydown', handleKeyDown, true)
  document.removeEventListener(
    TERMINAL_DISABLE_EVENT,
    handleDisableTerminalEvent as unknown as globalThis.EventListener
  )

  // Clear terminal element reference
  setTerminalElement(null)
})
/**
 * Handles focus loss from the hidden input.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function handleFocusLoss(_event: globalThis.FocusEvent): void {
  // DISABLED: This logic was causing issues with the v-disable-terminal directive
  // The directive handles UI interaction detection more reliably
  // Commenting out to prevent race conditions where focus is lost before directive events

  // const relatedTarget = event.relatedTarget as HTMLElement
  // if (relatedTarget) {
  //   const isInteractive = ...
  //   if (isInteractive) {
  //     deactivateAndHide()
  //     return
  //   }
  // }

  // Only maintain focus for non-interactive areas
  if (hasExclusiveFocus.value) {
    const focusTarget = terminalContainer.value?.querySelector(
      '.terminal-focus-target'
    ) as HTMLElement
    if (focusTarget) {
      // Use immediate focus to prevent loss
      focusTarget.focus()
    }
  }
}
</script>

<style scoped>
/**
 * Terminal Easter Egg styles.
 * 
 * Features a retro terminal aesthetic with phosphorescent green text,
 * smooth animations, and responsive behavior.
 */

.terminal-easter-egg {
  position: fixed;
  bottom: 48px !important; /* Force bottom positioning */
  top: auto !important; /* Prevent any top positioning */
  left: 16px;
  right: 16px;
  height: auto;
  max-height: 180px;
  background: transparent;
  border: none;
  border-radius: 0;
  font-family: 'SF Mono', 'Monaco', 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 10px;
  font-weight: 300;
  color: rgba(255, 255, 255, 0.75);
  box-shadow: none;
  z-index: 100;
  backdrop-filter: none;
  overflow: hidden;
  display: block;
  opacity: 0.85;
  transition: none;
  pointer-events: auto;
  outline: none;
  transform: none !important; /* Prevent any transform that might affect position */
  /* Clean background without distracting effects */
}

/* When terminal has exclusive focus, keep subtle appearance */
.terminal-easter-egg.has-exclusive-focus {
  /* Keep the same subtle appearance - no changes */
  opacity: 0.8;
  pointer-events: auto;
}

/* Hidden focus target for keyboard capture */
.terminal-focus-target {
  position: absolute;
  left: -9999px;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

/* Terminal Body */
.terminal-body {
  padding: 4px 0;
  overflow: visible;
  max-height: none;
  scrollbar-width: none;
  scroll-behavior: smooth;
}

.terminal-body::-webkit-scrollbar {
  display: none;
}

.terminal-content {
  display: flex;
  flex-direction: column;
  gap: 0; /* No gap - let lines handle their own spacing */
}

/* Terminal Lines Container */
.terminal-lines-container {
  display: flex;
  flex-direction: column;
  gap: 0; /* Remove gap since we're using margin-bottom */
  position: relative;
}

/* Terminal Lines with animation */
.terminal-line {
  margin-bottom: 6px; /* Increased spacing between lines */
  white-space: nowrap;
  word-break: normal;
  line-height: 1.5; /* Better line height for readability */
  display: block;
  font-size: 9px;
  overflow: hidden;
  text-overflow: ellipsis;
  /* Lines appear instantly */
  opacity: 1;
  /* Subtle phosphor glow for terminal text */
  text-shadow: 0 0 2px rgba(255, 255, 255, 0.3);
  /* No will-change since no animations */
  /* Ensure lines maintain their space */
  min-height: 14px;
}

/* Line animation - instant appearance, no smooth transitions */
.terminal-line-slide-enter-active {
  /* New line appears instantly */
  transition: none;
}

.terminal-line-slide-leave-active {
  /* Lines removed instantly */
  transition: none;
}

.terminal-line-slide-enter-from {
  /* New line starts visible */
  opacity: 1;
}

.terminal-line-slide-enter-to {
  /* New line stays visible */
  opacity: 1;
}

.terminal-line-slide-leave-to {
  /* Removed lines disappear instantly */
  opacity: 0;
}

/* Lines jump to new position instantly - no smooth movement */
.terminal-line-slide-move {
  transition: none;
}

/* No animation needed - lines appear instantly */

.terminal-line--system {
  color: rgba(255, 255, 255, 0.5);
  text-shadow: 0 0 1px rgba(255, 255, 255, 0.2);
}

.terminal-line--prompt {
  color: rgba(255, 255, 255, 0.6);
  font-weight: 300;
  text-shadow: 0 0 2px rgba(255, 255, 255, 0.25);
}

.terminal-line--input {
  color: rgba(255, 255, 255, 0.8);
  text-shadow: 0 0 2px rgba(255, 255, 255, 0.4);
}

.terminal-line--error {
  color: rgba(255, 100, 100, 0.8);
  text-shadow: 0 0 3px rgba(255, 100, 100, 0.4);
}

.terminal-line--success {
  color: rgba(100, 255, 130, 0.8);
  text-shadow: 0 0 3px rgba(100, 255, 130, 0.4);
}

.line-content {
  flex: 1;
}

/* Typing Animation - Terminal-style cursor */
.typing-cursor {
  display: inline-block;
  width: 6px;
  position: relative;
  top: 1px;
  left: 0;
  height: 10px;
  background-color: rgba(255, 255, 255, 0.8);
  margin-left: 1px;
  animation: terminal-blink 1s step-end infinite;
  box-shadow: 0 0 3px rgba(255, 255, 255, 0.5);
}

@keyframes terminal-blink {
  0%,
  50% {
    background-color: rgba(255, 255, 255, 0.8);
    color: #1a1a1a; /* Dark text on light background */
    box-shadow: 0 0 3px rgba(255, 255, 255, 0.5);
  }
  51%,
  100% {
    background-color: transparent;
    color: rgba(255, 255, 255, 0.7); /* Light text when cursor is off */
    box-shadow: none;
  }
}

/* Input Line */
.terminal-input-line {
  display: flex;
  align-items: center; /* Center vertically for consistent alignment */
  margin-top: 0;
  font-size: 10px; /* Match cursor font size */
  line-height: 14px; /* Exact line height */
  height: 14px; /* Fixed height */
  font-family:
    'Monaco', 'SF Mono', 'JetBrains Mono', 'Fira Code', monospace; /* Monaco first */
}

.terminal-prompt {
  color: rgba(255, 255, 255, 0.4);
  margin-right: 4px;
  font-weight: 300;
  flex-shrink: 0;
  line-height: 14px;
  height: 14px;
}

.terminal-input-container {
  position: relative;
  display: inline-flex; /* Use inline-flex for better alignment */
  align-items: center; /* Center children vertically */
  font-family: inherit;
  letter-spacing: 0;
  min-width: 1ch; /* Ensure container has minimum width for cursor visibility */
  height: 14px; /* Fixed height to maintain cursor size */
  line-height: 14px; /* Consistent line height */
}

.terminal-input {
  color: rgba(255, 255, 255, 0.7);
  letter-spacing: 0;
  white-space: pre;
  font-family:
    'Monaco', 'SF Mono', 'JetBrains Mono', 'Fira Code', monospace; /* Monaco first */
  font-size: 10px; /* Consistent font size */
  line-height: 14px; /* Match line height */
  display: inline-block; /* Ensure consistent display */
  height: 14px; /* Fixed height */
  min-height: 14px; /* Ensure minimum height even when empty */
}

.input-cursor {
  position: absolute;
  top: -1px; /* Fine-tune vertical position as requested */
  left: 0;
  width: 1ch; /* Exactly one character width in monospace */
  height: 14px; /* Fixed height matching line height */
  line-height: 14px; /* Match terminal line height */
  text-align: center;
  background-color: rgba(255, 255, 255, 0.8);
  color: #1a1a1a; /* Dark text on light background when cursor is visible */
  animation: terminal-blink 1s step-end infinite;
  font-weight: 400; /* Normal weight for better character visibility */
  pointer-events: none;
  font-family:
    'Monaco', 'SF Mono', 'JetBrains Mono', 'Fira Code', monospace; /* Monaco first */
  font-size: 10px; /* Match terminal font size */
  display: flex; /* Use flex for consistent centering */
  align-items: center; /* Center text vertically */
  justify-content: center; /* Center text horizontally */
  padding: 0;
  margin: 0;
}

/* Transitions - Instant appear/disappear */
.terminal-slide-enter-active {
  transition: none;
}

.terminal-slide-leave-active {
  transition: none;
}

.terminal-slide-enter-from {
  opacity: 0.85;
}

.terminal-slide-leave-to {
  opacity: 0;
}

.terminal-slide-enter-to,
.terminal-slide-leave-from {
  opacity: 0.85;
}

/* Responsive Behavior */
@media (max-width: 768px) {
  .terminal-easter-egg {
    display: none;
  }
}

@media (max-width: 520px) {
  .terminal-easter-egg {
    width: calc(100vw - 32px);
    left: 16px;
  }
}

@media (max-height: 600px) {
  .terminal-easter-egg {
    max-height: 240px;
  }

  .terminal-body {
    max-height: 200px;
  }
}

/* Accessibility */
@media (prefers-reduced-motion: reduce) {
  .terminal-slide-enter-active,
  .terminal-slide-leave-active {
    transition: opacity 0.15s ease;
  }

  .terminal-slide-enter-from,
  .terminal-slide-leave-to {
    transform: none;
  }

  .typing-cursor,
  .input-cursor {
    animation: none;
    opacity: 0.6;
  }

  .terminal-easter-egg:hover {
    transition: none;
  }
}

/* Highlighted text for search matches - lighter in dark mode */
.line-content :deep(strong) {
  font-weight: 400 !important; /* Regular weight, not bold */
  color: rgba(255, 255, 255, 1) !important; /* Brighter white for matches */
  text-shadow: 0 0 4px rgba(255, 255, 255, 0.8) !important; /* Stronger glow */
  text-decoration: none;
  letter-spacing: 0.02em;
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .terminal-easter-egg {
    background: rgba(0, 0, 0, 0.98);
    border-color: rgba(255, 255, 255, 0.8);
    color: rgba(255, 255, 255, 1);
  }

  .terminal-line--system,
  .terminal-line--input,
  .terminal-prompt,
  .terminal-input {
    color: rgba(255, 255, 255, 1);
  }

  /* Highlighted text for search matches in high contrast */
  .line-content :deep(strong) {
    font-weight: 400 !important;
    color: #ffffff !important;
    text-shadow: 0 0 2px rgba(255, 255, 255, 0.5) !important;
  }
}
</style>
