<template>
  <div class="system-terminal-view">
    <!-- Terminal Content -->
    <div class="terminal-content">
      <!-- Error State -->
      <div v-if="initError" class="terminal-error">
        <BaseIcon name="X" size="md" class="error-icon" />
        <div class="error-content">
          <h4 class="error-title">Terminal System Error</h4>
          <p class="error-message">{{ initError }}</p>
          <button class="error-retry" @click="initializeTerminals">
            <BaseIcon name="RotateCcw" size="xs" />
            Retry
          </button>
        </div>
      </div>

      <!-- System Terminal -->
      <div
        v-else-if="props.activeTerminal === 'system'"
        ref="systemTerminalRef"
        class="terminal-output"
        :class="{ 'auto-scroll': systemTerminal.autoScroll }"
        @click="snapOnInput('system')"
      >
        <div
          v-for="line in systemTerminal.lines"
          :key="line.id"
          :class="[
            'terminal-line',
            `line-${line.type.toLowerCase()}`,
            { 'line-recent': isRecentLine(line) },
          ]"
          :title="`${line.timestamp.toISOString()} - ${line.type}`"
        >
          <span class="line-timestamp">{{
            formatTimestamp(line.timestamp)
          }}</span>
          <span class="line-content">{{ line.content }}</span>
        </div>

        <div v-if="systemTerminal.lines.length === 0" class="terminal-empty">
          <BaseIcon name="Terminal" size="lg" class="empty-icon" />
          <p class="empty-message">System terminal ready</p>
          <p class="empty-hint">IDE lifecycle events will appear here</p>
        </div>
      </div>

      <!-- Timeline Terminal -->
      <div
        v-else-if="props.activeTerminal === 'timeline'"
        ref="timelineTerminalRef"
        class="terminal-output"
        :class="{ 'auto-scroll': timelineTerminal.autoScroll }"
        @click="snapOnInput('timeline')"
      >
        <div
          v-for="line in timelineTerminal.lines"
          :key="line.id"
          :class="[
            'terminal-line',
            `line-${line.type.toLowerCase()}`,
            { 'line-recent': isRecentLine(line) },
          ]"
          :title="`${line.timestamp.toISOString()} - ${line.type}`"
        >
          <span class="line-timestamp">{{
            formatTimestamp(line.timestamp)
          }}</span>
          <span class="line-content">{{ line.content }}</span>
        </div>

        <div v-if="timelineTerminal.lines.length === 0" class="terminal-empty">
          <BaseIcon name="GitBranch" size="lg" class="empty-icon" />
          <p class="empty-message">Timeline terminal ready</p>
          <p class="empty-hint">
            Git operations will appear here with complete traceability
          </p>
        </div>
      </div>

      <!-- Default state - show System terminal when no specific terminal is active -->
      <div
        v-else
        ref="systemTerminalRef"
        class="terminal-output"
        :class="{ 'auto-scroll': systemTerminal.autoScroll }"
        @click="snapOnInput('system')"
      >
        <div
          v-for="line in systemTerminal.lines"
          :key="line.id"
          :class="[
            'terminal-line',
            `line-${line.type.toLowerCase()}`,
            { 'line-recent': isRecentLine(line) },
          ]"
          :title="`${line.timestamp.toISOString()} - ${line.type}`"
        >
          <span class="line-timestamp">{{
            formatTimestamp(line.timestamp)
          }}</span>
          <span class="line-content">{{ line.content }}</span>
        </div>

        <div v-if="systemTerminal.lines.length === 0" class="terminal-empty">
          <BaseIcon name="Terminal" size="lg" class="empty-icon" />
          <p class="empty-message">System terminal ready</p>
          <p class="empty-hint">IDE lifecycle events will appear here</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue'
import BaseIcon from '../atoms/BaseIcon.vue'
import { useSystemTerminals } from '../../composables/useSystemTerminals'

/**
 * Component props interface.
 *
 * @public
 */
interface Props {
  /** Currently active terminal type */
  activeTerminal?: 'system' | 'timeline' | null
}

/**
 * Component emits interface.
 *
 * @public
 */
// interface Emits {
//   /** Emitted when user wants to change active terminal */
//   (event: 'set-active-terminal', terminalType: 'system' | 'timeline'): void
// }

// Props and emits
const props = withDefaults(defineProps<Props>(), {
  activeTerminal: null,
})

// Unused for now but keeping for future expansion
// const emit = defineEmits<Emits>()

/**
 * SystemTerminalView - Vue component for read-only system terminals.
 *
 * @remarks
 * This component renders the System and Timeline terminals as a tabbed interface
 * with real-time updates, auto-scrolling, and professional terminal styling.
 *
 * Features:
 * - Tabbed interface for System and Timeline terminals
 * - Auto-scroll with manual override
 * - Activity indicators on inactive tabs
 * - Event count and status display
 * - Line-level styling based on log type
 * - Empty states with helpful messaging
 * - Error handling and retry functionality
 *
 * @public
 */

// Template refs
const systemTerminalRef = ref<HTMLElement>()
const timelineTerminalRef = ref<HTMLElement>()

// Terminal system integration
const { systemTerminal, timelineTerminal, initError, initializeTerminals } =
  useSystemTerminals()

/**
 * Format timestamp for display in terminal lines.
 *
 * @param timestamp - Date to format
 * @returns Formatted time string
 */
const formatTimestamp = (timestamp: Date): string => {
  // Get time with milliseconds
  const timeStr = timestamp.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const ms = timestamp.getMilliseconds().toString().padStart(3, '0')
  return `${timeStr}.${ms}`
}

/**
 * Check if a line is recent (within last 5 seconds).
 *
 * @param line - Terminal line to check
 * @returns Whether line is recent
 */
const isRecentLine = (line: { timestamp: Date }): boolean => {
  const fiveSecondsAgo = new Date(Date.now() - 5000)
  return line.timestamp > fiveSecondsAgo
}

/**
 * Intelligent auto-scroll implementation following Windows Terminal patterns.
 * Scrolls to bottom only when user is at virtual bottom, similar to XTerm behavior.
 *
 * @param terminal - Terminal type to scroll
 */
const scrollToBottom = async (
  terminal: 'system' | 'timeline'
): Promise<void> => {
  await nextTick()

  const terminalRef =
    terminal === 'system' ? systemTerminalRef : timelineTerminalRef

  if (terminalRef.value) {
    // Check if user is at virtual bottom (Windows Terminal pattern)
    const isAtBottom =
      terminalRef.value.scrollTop + terminalRef.value.clientHeight >=
      terminalRef.value.scrollHeight - 10

    // Only auto-scroll if at bottom (intelligent behavior)
    if (isAtBottom) {
      terminalRef.value.scrollTop = terminalRef.value.scrollHeight
    }
  }
}

/**
 * Snap-on-input implementation following Windows Terminal snapOnInput pattern.
 * Always scrolls to bottom when user interacts, regardless of auto-scroll state.
 * This provides immediate feedback for user actions like tab switching.
 *
 * @param terminal - Terminal type to snap to bottom
 */
const snapOnInput = async (terminal: 'system' | 'timeline'): Promise<void> => {
  await nextTick()

  const terminalRef =
    terminal === 'system' ? systemTerminalRef : timelineTerminalRef

  if (terminalRef.value) {
    // Always scroll to bottom on user input (Windows Terminal snapOnInput pattern)
    terminalRef.value.scrollTop = terminalRef.value.scrollHeight
  }
}

// Auto-scroll when new lines are added
watch(
  () => systemTerminal.lines.length,
  () => {
    if (props.activeTerminal === 'system') {
      scrollToBottom('system')
    }
  }
)

watch(
  () => timelineTerminal.lines.length,
  () => {
    if (props.activeTerminal === 'timeline') {
      scrollToBottom('timeline')
    }
  }
)

// Snap-on-input when switching terminals (Windows Terminal pattern)
watch(
  () => props.activeTerminal,
  (newTerminal) => {
    if (newTerminal) {
      // Use snap-on-input for user-initiated terminal switching
      // This always scrolls to bottom regardless of auto-scroll state
      snapOnInput(newTerminal)
    }
  }
)

// Initialize terminals on mount
onMounted(() => {
  initializeTerminals()
})
</script>

<style scoped>
.system-terminal-view {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-primary);
  overflow: hidden;
}

/* Terminal Content */
.terminal-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Loading State */
.terminal-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: 16px;
  color: var(--text-secondary);
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--border-primary);
  border-top: 2px solid var(--accent-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  font-size: 14px;
  font-weight: 500;
}

/* Error State */
.terminal-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: 16px;
  padding: 32px;
  text-align: center;
}

.error-icon {
  color: #ef4444;
}

.error-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}

.error-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.error-message {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
  max-width: 400px;
}

.error-retry {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--accent-primary);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background var(--transition-fast);
  margin-top: 8px;
}

.error-retry:hover {
  background: var(--accent-primary-hover);
}

/* Terminal Output */
.terminal-output {
  flex: 1;
  overflow-y: auto;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-size: 13px;
  line-height: 1.4;
  padding: 8px;
  background-color: #161b22; /* Match xterm dark theme background */
}

.terminal-output.auto-scroll {
  scroll-behavior: smooth;
}

/* Terminal Lines */
.terminal-line {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 2px 0;
  opacity: 0.8;
  transition: opacity var(--transition-fast);
  word-break: break-word;
}

.terminal-line:hover {
  opacity: 1;
}

.terminal-line.line-recent {
  opacity: 1;
  animation: fadeIn 0.3s ease-out;
}

.line-timestamp {
  color: var(--text-tertiary);
  font-size: 11px;
  font-weight: 400;
  flex-shrink: 0;
  user-select: none;
  min-width: 80px;
}

.line-content {
  flex: 1;
  color: var(--text-primary);
  white-space: pre-wrap;
}

/* Line Type Styling */
.line-cmd .line-content {
  color: #3b82f6;
  font-weight: 500;
}

.line-git .line-content {
  color: #10b981;
  font-weight: 500;
}

.line-info .line-content {
  color: var(--text-primary);
}

.line-warn .line-content {
  color: #f59e0b;
  font-weight: 500;
}

.line-error .line-content {
  color: #ef4444;
  font-weight: 600;
}

.line-fatal .line-content {
  color: #dc2626;
  font-weight: 700;
  background: rgba(220, 38, 38, 0.1);
  padding: 2px 4px;
  border-radius: 3px;
  margin: -2px -4px;
}

/* Empty States */
.terminal-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: 12px;
  color: var(--text-secondary);
  text-align: center;
  padding: 48px 24px;
}

.empty-icon {
  opacity: 0.6;
}

.empty-message {
  font-size: 14px;
  font-weight: 500;
  margin: 0;
}

.empty-hint {
  font-size: 12px;
  margin: 0;
  opacity: 0.7;
  max-width: 300px;
}

/* Scrollbar Styling */
.terminal-output::-webkit-scrollbar {
  width: 6px;
}

.terminal-output::-webkit-scrollbar-track {
  background: transparent;
}

.terminal-output::-webkit-scrollbar-thumb {
  background: var(--border-primary);
  border-radius: 3px;
}

.terminal-output::-webkit-scrollbar-thumb:hover {
  background: var(--border-secondary);
}

/* Animations */
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0.3;
    transform: translateY(-2px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive Design */
@media (max-width: 768px) {
  .terminal-footer {
    padding: 6px 8px;
  }

  .control-button {
    padding: 4px 6px;
    font-size: 11px;
    gap: 4px;
  }

  .control-label {
    display: none;
  }

  .terminal-output {
    font-size: 12px;
    padding: 6px;
  }

  .line-timestamp {
    min-width: 70px;
    font-size: 10px;
  }
}
</style>
