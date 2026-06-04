<!--
/**
 * @fileoverview Simplified TerminalView using terminal-system package.
 *
 * @description
 * A streamlined Vue wrapper that uses the terminal-system package to manage
 * XTerm.js terminals, eliminating thousands of lines of duplicate code.
 *
 * @author Hatcher DX Team
 * @since 2.0.0
 * @public
 */
-->
<template>
  <div class="terminal-view" :data-theme="props.theme">
    <!-- Loading state -->
    <div v-if="isLoading" class="terminal-loading">
      <div class="terminal-loading__spinner"></div>
      <div class="terminal-loading__text">Loading terminal...</div>
    </div>

    <div
      ref="terminalContainer"
      class="terminal-view__container"
      :class="{ 'terminal-view__container--loading': isLoading }"
    />

    <!-- Focus Overlay -->
    <div
      v-if="!terminalHasFocus && !isLoading"
      class="terminal-focus-overlay"
      @click="activateTerminal"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from 'vue'
import {
  XTerminalFactory,
  type XTerminalInstance,
  type XTerminalTheme,
} from '@hatcherdx/terminal-system/browser'
import 'xterm/css/xterm.css'

/**
 * Props interface for the TerminalView component.
 */
interface Props {
  terminalId?: string
  fontSize?: number
  fontFamily?: string
  theme?: 'dark' | 'light' | 'auto'
  cols?: number
  rows?: number
  cursorBlink?: boolean
  cursorStyle?: 'block' | 'underline' | 'bar'
  scrollSensitivity?: number
}

const props = withDefaults(defineProps<Props>(), {
  terminalId: () => `terminal-${Date.now()}`,
  fontSize: 14,
  fontFamily: 'Monaco, Consolas, "Courier New", monospace',
  theme: 'auto',
  cols: 80,
  rows: 24,
  cursorBlink: true,
  cursorStyle: 'block',
  scrollSensitivity: 1,
})

const emit = defineEmits<{
  ready: [terminalId: string]
  data: [terminalId: string, data: string]
  resize: [terminalId: string, cols: number, rows: number]
  exit: [terminalId: string, code?: number]
  focus: [terminalId: string]
  blur: [terminalId: string]
}>()

// Component state
const terminalContainer = ref<HTMLElement>()
const terminalInstance = ref<XTerminalInstance | null>(null)
const isLoading = ref(true)
const terminalHasFocus = ref(false)
const resizeObserver = ref<ResizeObserver | null>(null)
const resizeDebounceTimer = ref<ReturnType<typeof setTimeout> | null>(null)

/**
 * Computed theme configuration.
 */
const terminalTheme = computed<XTerminalTheme>(() => {
  const isDark =
    props.theme === 'dark' ||
    (props.theme === 'auto' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)

  return isDark
    ? {
        background: '#1e1e1e',
        foreground: '#ffffff',
        cursor: '#ffffff',
        cursorAccent: '#1e1e1e',
        selectionBackground: 'rgba(255, 255, 255, 0.3)',
        black: '#000000',
        red: '#ff5555',
        green: '#50fa7b',
        yellow: '#f1fa8c',
        blue: '#6272a4',
        magenta: '#ff79c6',
        cyan: '#8be9fd',
        white: '#f8f8f2',
        brightBlack: '#44475a',
        brightRed: '#ff6e6e',
        brightGreen: '#69ff94',
        brightYellow: '#ffffa5',
        brightBlue: '#d6acff',
        brightMagenta: '#ff92df',
        brightCyan: '#a4ffff',
        brightWhite: '#ffffff',
      }
    : {
        background: '#ffffff',
        foreground: '#000000',
        cursor: '#000000',
        cursorAccent: '#ffffff',
        selectionBackground: 'rgba(0, 0, 0, 0.3)',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5',
      }
})

/**
 * Initialize the terminal.
 */
async function initializeTerminal(): Promise<void> {
  if (!terminalContainer.value) return

  try {
    isLoading.value = true

    // Create terminal with factory
    terminalInstance.value = await XTerminalFactory.createTerminal(
      terminalContainer.value,
      {
        debug: true, // Enable debug logging to see WebGL status
        terminal: {
          cols: props.cols,
          rows: props.rows,
          fontSize: props.fontSize,
          fontFamily: props.fontFamily,
          cursorBlink: props.cursorBlink,
          cursorStyle: props.cursorStyle,
          fastScrollSensitivity: props.scrollSensitivity,
          theme:
            props.theme === 'dark' ||
            (props.theme === 'auto' &&
              window.matchMedia('(prefers-color-scheme: dark)').matches)
              ? 'dark'
              : 'light',
          allowProposedApi: true,
        },
        addons: {
          enableFit: true,
          enableWebLinks: true,
          enableSearch: true,
          enableClipboard: true,
          enableUnicode11: true,
          enableWebGL: true, // WebGL addon enabled
          debug: true, // Debug for addon manager
        },
        resize: {
          enabled: true,
        },
        focus: {
          enabled: true,
        },
        backpressure: {
          enabled: true,
        },
        webgl: {
          enabled: true, // Enable WebGL renderer
          debug: true, // Debug for WebGL renderer
          enablePerformanceMonitoring: true, // Monitor FPS
        },
      }
    )

    // Log WebGL status
    if (terminalInstance.value.webgl) {
      console.log('[TerminalView] ✅ WebGL renderer initialized')
      const contextInfo = terminalInstance.value.webgl.getContextInfo()
      if (contextInfo) {
        console.log('[TerminalView] WebGL Context:', contextInfo)
        console.log(
          `[TerminalView] GPU: ${contextInfo.vendor} - ${contextInfo.renderer}`
        )
      }
    } else {
      // Check if WebGL was loaded via AddonManager
      const loadedAddons = terminalInstance.value.addons.getLoadedAddons()
      const hasWebGL = loadedAddons.some(
        (addon) => addon.toString() === 'webgl'
      )
      if (hasWebGL) {
        console.log('[TerminalView] ✅ WebGL addon loaded via AddonManager')
      } else {
        console.warn(
          '[TerminalView] ⚠️  WebGL not available, using canvas renderer'
        )
      }
    }

    if (!terminalInstance.value) {
      throw new Error('Failed to create terminal')
    }

    // Set up event handlers
    setupEventHandlers()

    // Set up resize observer
    setupResizeObserver()

    // Connect to backend if in Electron
    if (window.electronAPI && typeof window.electronAPI.invoke === 'function') {
      await connectToBackend()
    }

    isLoading.value = false

    // Emit ready event
    emit('ready', props.terminalId)

    // Initial fit
    await nextTick()
    fitTerminal()
  } catch (error) {
    console.error('[TerminalView] Failed to initialize terminal:', error)
    isLoading.value = false
  }
}

/**
 * Set up terminal event handlers.
 */
function setupEventHandlers(): void {
  if (!terminalInstance.value) return

  const { terminal } = terminalInstance.value

  // Data handler
  terminal.onData((data: string) => {
    // Emit data event for parent component to handle
    // The parent component is responsible for sending to backend
    emit('data', props.terminalId, data)
  })

  // Resize handler
  terminal.onResize(({ cols, rows }) => {
    emit('resize', props.terminalId, cols, rows)
  })

  // Focus handlers using the focus manager if available
  if (terminalInstance.value.focus) {
    // Use terminal's native focus event handlers
    terminal.onTitleChange(() => {
      // Use this as a proxy for focus changes
      const hasFocus = document.activeElement === terminal.textarea
      if (hasFocus !== terminalHasFocus.value) {
        terminalHasFocus.value = hasFocus
        if (hasFocus) {
          emit('focus', props.terminalId)
        } else {
          emit('blur', props.terminalId)
        }
      }
    })
  }

  // Listen for backend data if in Electron
  if (window.electronAPI?.onTerminalData) {
    window.electronAPI.onTerminalData((data: { id: string; data: string }) => {
      if (data.id === props.terminalId && terminalInstance.value) {
        terminalInstance.value.manager.write(data.data)
      }
    })
  }

  // Listen for exit event if in Electron
  if (window.electronAPI?.onTerminalExit) {
    window.electronAPI.onTerminalExit(
      (data: { id: string; exitCode: number }) => {
        if (data.id === props.terminalId) {
          emit('exit', props.terminalId, data.exitCode)
        }
      }
    )
  }
}

/**
 * Set up resize observer for terminal container.
 */
function setupResizeObserver(): void {
  if (!terminalContainer.value) return

  resizeObserver.value = new ResizeObserver(() => {
    handleResize()
  })

  resizeObserver.value.observe(terminalContainer.value)
}

/**
 * Handle terminal container resize with debouncing.
 */
function handleResize(): void {
  if (resizeDebounceTimer.value) {
    clearTimeout(resizeDebounceTimer.value)
  }

  resizeDebounceTimer.value = setTimeout(() => {
    fitTerminal()
  }, 100)
}

/**
 * Fit terminal to container dimensions.
 */
function fitTerminal(): void {
  if (!terminalInstance.value?.resize) return

  try {
    terminalInstance.value.resize.fit()
  } catch (error) {
    console.warn('[TerminalView] Failed to fit terminal:', error)
  }
}

/**
 * Connect terminal to backend process.
 */
async function connectToBackend(): Promise<void> {
  if (!window.electronAPI?.invoke) return

  try {
    const response = (await window.electronAPI.invoke('terminal-create', {
      name: props.terminalId,
      cols: props.cols,
      rows: props.rows,
    })) as { success: boolean; error?: string }

    if (!response.success) {
      console.error(
        '[TerminalView] Failed to create backend terminal:',
        response.error
      )
    }
  } catch (error) {
    console.error('[TerminalView] Failed to connect to backend:', error)
  }
}

/**
 * Activate and focus the terminal.
 */
function activateTerminal(): void {
  if (!terminalInstance.value) return

  terminalInstance.value.terminal.focus()
  terminalHasFocus.value = true
}

/**
 * Clean up terminal resources.
 */
function cleanup(): void {
  // Clear resize timer
  if (resizeDebounceTimer.value) {
    clearTimeout(resizeDebounceTimer.value)
    resizeDebounceTimer.value = null
  }

  // Disconnect resize observer
  if (resizeObserver.value) {
    resizeObserver.value.disconnect()
    resizeObserver.value = null
  }

  // Dispose terminal instance
  if (terminalInstance.value) {
    terminalInstance.value.dispose()
    terminalInstance.value = null
  }

  // Kill backend process if in Electron
  if (window.electronAPI?.invoke) {
    window.electronAPI
      .invoke('terminal-close', props.terminalId)
      .catch((error) => {
        console.warn('[TerminalView] Failed to kill terminal:', error)
      })
  }
}

// Lifecycle hooks
onMounted(() => {
  initializeTerminal()
})

onUnmounted(() => {
  cleanup()
})

// Watchers
watch(
  () => props.fontSize,
  (newSize) => {
    if (terminalInstance.value) {
      terminalInstance.value.terminal.options.fontSize = newSize
      fitTerminal()
    }
  }
)

watch(
  () => props.fontFamily,
  (newFamily) => {
    if (terminalInstance.value) {
      terminalInstance.value.terminal.options.fontFamily = newFamily
      fitTerminal()
    }
  }
)

watch(
  () => props.theme,
  () => {
    if (terminalInstance.value) {
      terminalInstance.value.terminal.options.theme = terminalTheme.value
    }
  }
)

watch(
  () => props.cursorBlink,
  (newValue) => {
    if (terminalInstance.value) {
      terminalInstance.value.terminal.options.cursorBlink = newValue
    }
  }
)

watch(
  () => props.cursorStyle,
  (newStyle) => {
    if (terminalInstance.value) {
      terminalInstance.value.terminal.options.cursorStyle = newStyle
    }
  }
)

// Expose for parent components if needed
defineExpose({
  terminal: computed(() => terminalInstance.value?.terminal),
  focus: activateTerminal,
  fit: fitTerminal,
  clear: () => terminalInstance.value?.manager.clear(),
  write: (data: string) => terminalInstance.value?.manager.write(data),
})
</script>

<style scoped>
.terminal-view {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
  background: var(--terminal-bg, #1e1e1e);
  overflow: hidden;
}

.terminal-view[data-theme='light'] {
  --terminal-bg: #ffffff;
  --terminal-loading-bg: #f5f5f5;
  --terminal-loading-text: #333333;
  --terminal-spinner-color: #0066cc;
}

.terminal-view[data-theme='dark'],
.terminal-view[data-theme='auto'] {
  --terminal-bg: #1e1e1e;
  --terminal-loading-bg: #2d2d2d;
  --terminal-loading-text: #cccccc;
  --terminal-spinner-color: #4fc3f7;
}

.terminal-view__container {
  flex: 1;
  width: 100%;
  height: 100%;
  position: relative;
  opacity: 1;
  transition: opacity 0.2s ease-in-out;
}

.terminal-view__container--loading {
  opacity: 0;
}

.terminal-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  z-index: 10;
}

.terminal-loading__spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--terminal-loading-bg);
  border-top-color: var(--terminal-spinner-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.terminal-loading__text {
  color: var(--terminal-loading-text);
  font-size: 14px;
  font-family:
    system-ui,
    -apple-system,
    sans-serif;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.terminal-focus-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.02);
  cursor: text;
  z-index: 5;
}

.terminal-view[data-theme='dark'] .terminal-focus-overlay {
  background: rgba(255, 255, 255, 0.02);
}

/* XTerm.js styles */
:deep(.xterm) {
  width: 100%;
  height: 100%;
  padding: 8px;
}

:deep(.xterm-viewport) {
  width: 100% !important;
  height: 100% !important;
}

:deep(.xterm-screen) {
  width: 100% !important;
  height: 100% !important;
}

/* Scrollbar styling */
:deep(.xterm .xterm-viewport::-webkit-scrollbar) {
  width: 10px;
}

:deep(.xterm .xterm-viewport::-webkit-scrollbar-track) {
  background: transparent;
}

:deep(.xterm .xterm-viewport::-webkit-scrollbar-thumb) {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 5px;
}

:deep(.xterm .xterm-viewport::-webkit-scrollbar-thumb:hover) {
  background: rgba(255, 255, 255, 0.3);
}

.terminal-view[data-theme='light']
  :deep(.xterm .xterm-viewport::-webkit-scrollbar-thumb) {
  background: rgba(0, 0, 0, 0.2);
}

.terminal-view[data-theme='light']
  :deep(.xterm .xterm-viewport::-webkit-scrollbar-thumb:hover) {
  background: rgba(0, 0, 0, 0.3);
}
</style>
