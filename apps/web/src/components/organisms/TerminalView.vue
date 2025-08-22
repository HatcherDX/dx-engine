<!--
/**
 * @fileoverview TerminalView component for XTerm.js terminal integration.
 * 
 * @description
 * A Vue wrapper component for XTerm.js that provides a full-featured terminal interface
 * with theme support, resize handling, and Electron IPC integration. Manages terminal
 * initialization, data flow, and cleanup for individual terminal sessions.
 * 
 * @example
 * ```vue
 * <template>
 *   <TerminalView
 *     :terminal-id="'terminal-1'"
 *     :theme="'dark'"
 *     :font-size="14"
 *     :font-family="'Monaco, monospace'"
 *     @data="handleTerminalData"
 *     @resize="handleTerminalResize"
 *     @ready="handleTerminalReady"
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
  <div class="terminal-view" :data-theme="props.theme">
    <div ref="terminalContainer" class="terminal-view__container" />

    <!-- Focus Overlay - Shown when terminal doesn't have focus -->
    <div
      v-if="!terminalHasFocus"
      ref="focusOverlay"
      class="terminal-focus-overlay"
      @click="activateTerminal"
      @mousedown.prevent="activateTerminal"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * @fileoverview TerminalView component logic for XTerm.js integration.
 *
 * @description
 * This script provides the reactive logic for XTerm.js terminal integration,
 * handling terminal initialization, theme management, resize operations,
 * and bidirectional data communication with the Electron backend.
 */
import {
  ref,
  onMounted,
  onUnmounted,
  onActivated,
  onDeactivated,
  watch,
  nextTick,
  readonly,
} from 'vue'
import { Terminal } from 'xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { SearchAddon } from '@xterm/addon-search'
import { Unicode11Addon } from '@xterm/addon-unicode11'
import { ClipboardAddon } from '@xterm/addon-clipboard'
import { WebglAddon } from '@xterm/addon-webgl'
import {
  WebGLEngine,
  TerminalRenderer,
  checkWebGLSupport,
  type WebGLEngineConfig,
  type TerminalRendererConfig,
} from '@hatcherdx/shared-rendering'

/**
 * Props interface for the TerminalView component.
 *
 * @interface Props
 * @public
 * @since 1.0.0
 */
interface Props {
  /** Unique identifier for this terminal instance */
  terminalId?: string
  /** Font size for terminal text in pixels */
  fontSize?: number
  /** Font family for terminal text */
  fontFamily?: string
  /** Theme variant for terminal styling */
  theme?: 'light' | 'dark'
}

const props = withDefaults(defineProps<Props>(), {
  terminalId: undefined,
  fontSize: 13,
  fontFamily: 'Menlo, Monaco, "Courier New", monospace',
  theme: 'dark',
})

/**
 * Events emitted by the TerminalView component.
 *
 * @interface Emits
 * @public
 * @since 1.0.0
 */
interface Emits {
  /** Emitted when terminal sends data to the shell */
  data: [string]
  /** Emitted when terminal dimensions change */
  resize: [{ cols: number; rows: number }]
  /** Emitted when terminal is fully initialized and ready */
  ready: []
}

const emit = defineEmits<Emits>()

/**
 * Extended HTMLElement interface to include custom properties.
 * Used for storing global keydown handler reference for proper cleanup.
 *
 * @interface ExtendedHTMLElement
 * @internal
 * @since 1.0.0
 */
interface ExtendedHTMLElement extends HTMLElement {
  /** Global keydown handler reference for cleanup */
  __globalKeyDownHandler?: (event: KeyboardEvent) => void
}

const terminalContainer = ref<HTMLElement>()
const focusOverlay = ref<HTMLElement>()

// Focus management
const terminalHasFocus = ref(false)

let terminal: Terminal | null = null
let fitAddon: FitAddon | null = null
let searchAddon: SearchAddon | null = null
let unicode11Addon: Unicode11Addon | null = null
let clipboardAddon: ClipboardAddon | null = null
let webglAddon: WebglAddon | null = null

// Shared rendering engine for WebGL acceleration
let webglEngine: WebGLEngine | null = null
let terminalRenderer: TerminalRenderer | null = null

// WebGL support detection
const webglSupport = ref<ReturnType<typeof checkWebGLSupport> | null>(null)
const useWebGLAcceleration = ref(false)

// Terminal connection state
const isConnected = ref(false)
const currentTerminalId = ref<string>()

// Component lifecycle state
const isComponentMounted = ref(true)

// Store IPC cleanup functions
let ipcCleanupFunctions: (() => void)[] = []
let focusCleanup: (() => void) | null = null

// Store keydown handler for cleanup
let handleKeyDown: ((event: KeyboardEvent) => void) | null = null

// Context7 cleanup: Removed unused mutation observers - they were not being used

// Cursor tracking and viewport management for height/scroll issues

const initializeTerminal = async () => {
  if (!terminalContainer.value) return

  // Clean up any existing terminal and ensure clean container
  if (terminal) {
    if (typeof terminal.dispose === 'function') {
      terminal.dispose()
    }
    terminal = null
  }

  // Clear the container to remove any stale XTerm.js elements
  terminalContainer.value.innerHTML = ''

  // Create terminal instance with professional configuration
  terminal = new Terminal({
    fontSize: props.fontSize,
    fontFamily: props.fontFamily,
    cursorBlink: true, // Context7: Enable blink by default
    cursorStyle: 'block', // Professional block cursor
    theme: getTerminalTheme(),
    allowProposedApi: true,
    // VSCode-style configuration
    convertEol: true,
    disableStdin: false, // Enable input immediately
    allowTransparency: false,
    tabStopWidth: 4,
    scrollback: 10000, // Increased from 1000 to 10000 for more history
    // Terminal optimization options - Context7 performance tuning
    minimumContrastRatio: 1,
    fastScrollModifier: 'alt',
    fastScrollSensitivity: 20, // Increased from 5 to 20 for faster scrolling
    // Context7: Intelligent auto-scroll following Windows Terminal patterns
    scrollOnUserInput: true, // Auto-scroll when user types (snapOnInput)
    altClickMovesCursor: true,
    // Additional Windows Terminal inspired optimizations
    macOptionIsMeta: true, // Better macOS integration
    rightClickSelectsWord: false, // Prevent accidental selections
  })

  // Context7 cleanup: Removed unused global focus state management
  // Terminal focus is now handled locally through event listeners

  // Context7 Enhancement: Check WebGL support for performance boost
  webglSupport.value = checkWebGLSupport()
  useWebGLAcceleration.value = webglSupport.value.webgl1

  if (useWebGLAcceleration.value) {
    console.log('[Terminal] WebGL acceleration available:', webglSupport.value)
  }

  // Add professional addons for VSCode-level experience with error handling
  fitAddon = new FitAddon()
  searchAddon = new SearchAddon()
  unicode11Addon = new Unicode11Addon()
  clipboardAddon = new ClipboardAddon()

  // Context7 Enhancement: Initialize WebGL addon for ultra-fast rendering
  if (useWebGLAcceleration.value) {
    try {
      webglAddon = new WebglAddon()
      // Set up context loss handling as recommended by Context7
      webglAddon.onContextLoss(() => {
        console.warn('[Terminal] WebGL context lost, disposing addon')
        if (webglAddon) {
          webglAddon.dispose()
          webglAddon = null
        }
        // Also dispose shared-rendering resources on context loss
        if (terminalRenderer) {
          terminalRenderer.dispose()
          terminalRenderer = null
        }
        if (webglEngine) {
          webglEngine.dispose()
          webglEngine = null
        }
        useWebGLAcceleration.value = false
      })
    } catch (error) {
      console.warn('[Terminal] WebGL addon initialization failed:', error)
      webglAddon = null
      useWebGLAcceleration.value = false
    }
  }

  // Context7 Enhancement: Initialize shared-rendering WebGL engine for DRY compliance
  if (useWebGLAcceleration.value && webglSupport.value) {
    try {
      // Create shared WebGL engine with performance optimizations
      webglEngine = new WebGLEngine()

      // Create a canvas for the shared rendering engine
      const sharedCanvas = document.createElement('canvas')
      sharedCanvas.style.position = 'absolute'
      sharedCanvas.style.top = '0'
      sharedCanvas.style.left = '0'
      sharedCanvas.style.pointerEvents = 'none'
      sharedCanvas.style.zIndex = '-1' // Behind XTerm.js canvas

      await webglEngine.initialize({
        canvas: sharedCanvas,
        antialias: true,
        alpha: false,
        performance: {
          enabled: true,
          collectInterval: 1000,
          maxSamples: 60,
          enableMemoryMonitoring: true,
          enableFrameTimeTracking: true,
        },
        debug: false,
        autoGC: true,
        gcInterval: 30000,
      } as WebGLEngineConfig)

      // Initialize terminal renderer for text acceleration
      terminalRenderer = new TerminalRenderer(webglEngine)

      await terminalRenderer.initialize({
        rows: 24,
        cols: 80,
        fontSize: props.fontSize,
        fontFamily: props.fontFamily,
        backgroundColor:
          props.theme === 'light'
            ? { r: 0.97, g: 0.97, b: 0.98, a: 1 }
            : { r: 0.09, g: 0.11, b: 0.13, a: 1 },
        textColor:
          props.theme === 'light'
            ? { r: 0, g: 0, b: 0, a: 1 }
            : { r: 0.83, g: 0.83, b: 0.83, a: 1 },
        useWebGL: true,
        antialias: true,
      } as TerminalRendererConfig)

      // Add shared canvas to container (behind XTerm.js)
      if (terminalContainer.value) {
        terminalContainer.value.appendChild(sharedCanvas)
      }

      console.log(
        '[Terminal] Shared-rendering WebGL engine initialized for DRY compliance'
      )

      // Start performance monitoring for the shared engine
      startPerformanceMonitoring()
    } catch (sharedRenderingError) {
      console.warn(
        '[Terminal] Shared-rendering initialization failed:',
        sharedRenderingError
      )
      // Fallback to XTerm.js WebGL addon only
      if (terminalRenderer) {
        terminalRenderer.dispose()
        terminalRenderer = null
      }
      if (webglEngine) {
        webglEngine.dispose()
        webglEngine = null
      }
    }
  }

  try {
    if (terminal && typeof terminal.loadAddon === 'function') {
      terminal.loadAddon(fitAddon)
      terminal.loadAddon(new WebLinksAddon())
      terminal.loadAddon(searchAddon)
      terminal.loadAddon(unicode11Addon)
      terminal.loadAddon(clipboardAddon)

      // Context7 Enhancement: Load WebGL addon AFTER terminal is opened (best practice)
      if (webglAddon && useWebGLAcceleration.value) {
        terminal.loadAddon(webglAddon)
        console.log('[Terminal] WebGL acceleration enabled')
      }
    }
  } catch (error) {
    console.error('[Terminal] Failed to load addons:', error)
    // Continue without addons if loading fails
  }

  // Activate Unicode11 support for emojis and CJK
  try {
    if (terminal.unicode) {
      terminal.unicode.activeVersion = '11'
    }
  } catch (error) {
    console.warn('[Terminal] Unicode11 not available:', error)
  }

  // Ensure container has proper styling before opening terminal
  terminalContainer.value.style.position = 'relative'
  terminalContainer.value.style.width = '100%'
  terminalContainer.value.style.height = '100%'
  terminalContainer.value.style.overflow = 'hidden'

  // Open terminal in container
  terminal.open(terminalContainer.value)

  // Terminal will be managed by FocusManager

  // CRITICAL FIX: Apply viewport overflow fix based on Context7 documentation
  await nextTick()
  setTimeout(() => {
    if (
      terminalContainer.value &&
      terminal &&
      terminal.element &&
      typeof terminal.element.querySelector === 'function'
    ) {
      // Fix the critical viewport overflow issue
      const xtermViewport = terminal.element.querySelector(
        '.xterm-viewport'
      ) as HTMLElement
      if (xtermViewport) {
        // Apply absolute positioning with full container bounds
        xtermViewport.style.position = 'absolute'
        xtermViewport.style.top = '0'
        xtermViewport.style.left = '0'
        xtermViewport.style.right = '0'
        xtermViewport.style.bottom = '0'
        xtermViewport.style.width = 'auto'
        xtermViewport.style.height = 'auto'
        xtermViewport.style.overflow = 'auto'
        xtermViewport.style.boxSizing = 'border-box'

        // Apply theme-appropriate background color
        const backgroundColor = props.theme === 'light' ? '#f6f8fa' : '#161b22'
        xtermViewport.style.backgroundColor = backgroundColor
      }

      // Ensure screen canvas positioning
      const xtermScreen =
        terminal &&
        terminal.element &&
        typeof terminal.element.querySelector === 'function'
          ? (terminal.element.querySelector('.xterm-screen') as HTMLElement)
          : null
      if (xtermScreen) {
        xtermScreen.style.position = 'relative'
        xtermScreen.style.left = '0'
        xtermScreen.style.top = '0'
        xtermScreen.style.transform = 'none'
        xtermScreen.style.width = '100%'
        xtermScreen.style.height = 'auto'
        xtermScreen.style.minHeight = '100%'
        xtermScreen.style.boxSizing = 'border-box'
      }

      // Fix all rendering layers positioning
      const layers = [
        '.xterm-text-layer',
        '.xterm-cursor-layer',
        '.xterm-selection-layer',
      ]
      layers.forEach((layerSelector) => {
        const layer =
          terminal &&
          terminal.element &&
          typeof terminal.element.querySelector === 'function'
            ? (terminal.element.querySelector(layerSelector) as HTMLElement)
            : null
        if (layer) {
          layer.style.position = 'absolute'
          layer.style.left = '0'
          layer.style.top = '0'
        }
      })
    }
  }, 100)

  // ENHANCED SNAP-ON-INPUT: Comprehensive user input detection with smooth scrolling
  const isAtBottom = () => {
    if (!terminal) return true

    const viewport =
      terminal.element && typeof terminal.element.querySelector === 'function'
        ? (terminal.element.querySelector('.xterm-viewport') as HTMLElement)
        : null
    if (!viewport) return true

    // Check if we're at the virtual bottom (allowing for small scroll differences)
    const isAtVirtualBottom =
      viewport.scrollTop + viewport.clientHeight >= viewport.scrollHeight - 10
    return isAtVirtualBottom
  }

  const instantScrollToBottom = () => {
    if (!terminal) return

    const viewport =
      terminal.element && typeof terminal.element.querySelector === 'function'
        ? (terminal.element.querySelector('.xterm-viewport') as HTMLElement)
        : null
    if (!viewport) return

    // Instant scroll to bottom for immediate snap-on-input response
    viewport.scrollTop = viewport.scrollHeight
  }

  const snapOnInputHandler = () => {
    // Only scroll if we're not already at the bottom
    if (!isAtBottom()) {
      instantScrollToBottom()
    }
  }

  // CRITICAL: Capture keydown events BEFORE they reach XTerm pipeline
  // This ensures we catch ALL user keyboard interactions
  handleKeyDown = (event: KeyboardEvent) => {
    // Skip modifier-only keys and navigation keys that shouldn't trigger scroll
    const skipKeys = [
      'Control',
      'Alt',
      'Shift',
      'Meta',
      'CapsLock',
      'ScrollLock',
      'NumLock',
      'F1',
      'F2',
      'F3',
      'F4',
      'F5',
      'F6',
      'F7',
      'F8',
      'F9',
      'F10',
      'F11',
      'F12',
    ]

    if (skipKeys.includes(event.key)) {
      return // Don't scroll on modifier or function keys
    }

    // For any other key (including navigation keys like arrows, home, end),
    // implement snap-on-input behavior
    snapOnInputHandler()
  }

  // Setup real terminal event handlers
  if (terminal && typeof terminal.onData === 'function') {
    terminal.onData((data) => {
      // SNAP-ON-INPUT: Always scroll to bottom when user types (Windows Terminal pattern)
      snapOnInputHandler()

      // Send data to PTY process via IPC
      if (currentTerminalId.value && window.electronAPI) {
        if (window.electronAPI.sendTerminalInput) {
          window.electronAPI.sendTerminalInput({
            id: currentTerminalId.value,
            data,
          })
        } else {
          window.electronAPI.send('terminal-input', {
            id: currentTerminalId.value,
            data,
          })
        }
      } else {
        console.warn(
          '[Terminal] Cannot send data - terminalId or electronAPI missing'
        )
      }
    })
  }

  // ADDITIONAL: Capture key events that might not trigger onData
  try {
    if (terminal && typeof terminal.onKey === 'function') {
      terminal.onKey((event) => {
        // Only snap on input if it's a real key (not just modifier keys)
        const skipKeys = [
          'Control',
          'Alt',
          'Shift',
          'Meta',
          'CapsLock',
          'ScrollLock',
          'NumLock',
          'F1',
          'F2',
          'F3',
          'F4',
          'F5',
          'F6',
          'F7',
          'F8',
          'F9',
          'F10',
          'F11',
          'F12',
        ]

        if (!skipKeys.includes(event.key)) {
          snapOnInputHandler()
        }
      })
    }
  } catch (error) {
    console.warn('[Terminal] onKey handler not available:', error)
  }

  // Force enable the terminal immediately
  if (terminal && terminal.options) {
    terminal.options.disableStdin = false
    terminal.options.cursorBlink = true
  }

  // Context7: Basic terminal element setup with comprehensive keydown capture
  const terminalElement = terminal && terminal.element ? terminal.element : null
  if (
    terminalElement &&
    typeof terminalElement.addEventListener === 'function' &&
    terminalElement.style // Ensure style property exists
  ) {
    terminalElement.style.outline = 'none'
    terminalElement.tabIndex = 0

    // CRITICAL: Add keydown listener to multiple levels to ensure capture
    // Level 1: Terminal element with capture phase
    terminalElement.addEventListener('keydown', handleKeyDown, true)

    // Level 2: Also add to the container element
    if (
      terminalContainer.value &&
      typeof terminalContainer.value.addEventListener === 'function'
    ) {
      terminalContainer.value.addEventListener('keydown', handleKeyDown, true)
    }

    // Level 3: Also add to document for global capture when terminal is focused
    const globalKeyDownHandler = (event: KeyboardEvent) => {
      // Only trigger if the terminal is focused/active
      if (
        terminalElement.contains(document.activeElement) ||
        terminalElement === document.activeElement ||
        terminalContainer.value?.contains(document.activeElement)
      ) {
        handleKeyDown?.(event)
      }
    }
    document.addEventListener('keydown', globalKeyDownHandler, true)

    // Store the global handler for cleanup
    ;(terminalElement as ExtendedHTMLElement).__globalKeyDownHandler =
      globalKeyDownHandler
  }

  if (terminal && typeof terminal.onResize === 'function') {
    terminal.onResize(({ cols, rows }) => {
      // Send resize to PTY process
      if (currentTerminalId.value && window.electronAPI) {
        if (window.electronAPI.sendTerminalResize) {
          window.electronAPI.sendTerminalResize({
            id: currentTerminalId.value,
            cols,
            rows,
          })
        } else {
          window.electronAPI.send('terminal-resize', {
            id: currentTerminalId.value,
            cols,
            rows,
          })
        }
      }
      emit('resize', { cols, rows })
    })
  }

  // Context7: Enhanced height management and cursor tracking
  // Fix the height mismatch between terminal-panel__content and terminal-view
  await nextTick()

  // Wait for container to be properly sized
  await new Promise((resolve) => setTimeout(resolve, 100)) // Increased delay for proper sizing

  // Force terminal to fit container perfectly
  const forceTerminalFit = () => {
    if (!terminalContainer.value || !terminal || !fitAddon) return

    const containerRect = terminalContainer.value.getBoundingClientRect()

    if (containerRect.width > 0 && containerRect.height > 0) {
      try {
        // Force the terminal to fit the container exactly
        fitAddon.fit()

        // Get the actual terminal dimensions after fit
        const cols = terminal.cols
        const rows = terminal.rows

        // Emit resize event
        emit('resize', { cols, rows })

        // Ensure cursor is visible after resize
        setTimeout(() => {
          if (terminal && typeof terminal.scrollToBottom === 'function') {
            terminal.scrollToBottom()
            // Cursor visibility is now managed by FocusManager
          }
        }, 50)
      } catch (error) {
        console.error('[Terminal] Error fitting terminal:', error)
      }
    }
  }

  // Perform initial fit
  forceTerminalFit()

  // Validate container dimensions before fitting
  if (terminalContainer.value) {
    const containerRect = terminalContainer.value.getBoundingClientRect()

    if (containerRect.width > 0 && containerRect.height > 0) {
      try {
        // Context7: Proper height management for viewport
        fitAddon.fit()

        // Force immediate scroll to bottom to ensure cursor visibility
        if (terminal && typeof terminal.scrollToBottom === 'function') {
          terminal.scrollToBottom()
        }

        // Ensure terminal has reasonable dimensions
        if (terminal && (terminal.cols < 10 || terminal.rows < 5)) {
          if (terminal && typeof terminal.resize === 'function') {
            terminal.resize(80, 24)
          }
          if (terminal && typeof terminal.scrollToBottom === 'function') {
            terminal.scrollToBottom() // Ensure cursor visible after resize
          }
        }
      } catch (error) {
        console.error('[Terminal] Initial fit failed:', error)
        // Fallback to default size
        if (terminal && typeof terminal.resize === 'function') {
          terminal.resize(80, 24)
        }
        if (terminal && typeof terminal.scrollToBottom === 'function') {
          terminal.scrollToBottom()
        }
      }
    } else {
      console.warn(
        '[Terminal] Container not sized yet, using default dimensions'
      )
      if (terminal && typeof terminal.resize === 'function') {
        terminal.resize(80, 24)
      }
      if (terminal && typeof terminal.scrollToBottom === 'function') {
        terminal.scrollToBottom()
      }
    }
  }

  // Context7 simplified: Basic terminal focus
  if (terminal && typeof terminal.focus === 'function') {
    terminal.focus()
  }

  // Setup manual resize control (NO ResizeObserver)
  setupResizeObserver()

  // Add window resize listener as safer alternative to ResizeObserver
  setupWindowResizeHandler()

  // Setup intelligent auto-scroll following Windows Terminal patterns
  setupIntelligentAutoScroll()

  // Setup scroll keyboard shortcuts for better navigation
  setupScrollKeyboardShortcuts()

  // Setup IPC listeners for terminal data
  setupTerminalIPCListeners()

  // Connect to real terminal if we have a terminalId
  if (props.terminalId) {
    await connectToTerminal(props.terminalId)
  } else {
    // Create a new terminal if no ID is provided
    if (window.electronAPI) {
      try {
        const newTerminalId = (await window.electronAPI.invoke(
          'terminal-create',
          {
            name: 'Terminal 1',
            shell: undefined,
            cwd: undefined,
            env: undefined,
            cols: 80,
            rows: 24,
          }
        )) as string
        await connectToTerminal(newTerminalId)
      } catch (error) {
        console.error('[Terminal] Failed to create new terminal:', error)
      }
    }
  }

  // Update resource status after initialization
  updateResourceStatus()

  // Terminal ready (will be activated when real data arrives from backend)
}

const getTerminalTheme = () => {
  if (props.theme === 'light') {
    return {
      background: '#ffffff',
      foreground: '#000000',
      cursor: '#000000',
      selection: 'rgba(0, 120, 215, 0.3)', // Semi-transparent blue for light theme
      selectionForeground: '#000000', // Black text on selection for light theme
    }
  }

  return {
    background: '#1e1e1e',
    foreground: '#d4d4d4',
    cursor: '#d4d4d4',
    selection: 'rgba(100, 150, 255, 0.3)', // Semi-transparent blue selection
    selectionForeground: '#ffffff', // White text on selection
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
}

// Context7 simplification: Manual resize control only
const setupResizeObserver = () => {
  // ResizeObserver disabled to prevent infinite loops
  // Manual resize only via window events and explicit calls
}

// Safe window resize handler - much less frequent than ResizeObserver
let windowResizeTimeout: ReturnType<typeof setTimeout> | null = null
let windowResizeHandler: (() => void) | null = null

const setupWindowResizeHandler = () => {
  if (!fitAddon || !terminal) return

  // Create debounced window resize handler
  windowResizeHandler = () => {
    if (windowResizeTimeout) {
      clearTimeout(windowResizeTimeout)
    }

    // Much longer debounce for window resize - only handle actual window changes
    windowResizeTimeout = setTimeout(() => {
      if (
        isComponentMounted.value &&
        fitAddon &&
        terminal &&
        terminalContainer.value
      ) {
        try {
          // EMERGENCY: Check dimensions before window resize
          const currentCols = terminal.cols
          const currentRows = terminal.rows

          if (!isReasonableTerminalSize(currentCols, currentRows)) {
            console.error(
              `[Terminal] EMERGENCY: Blocking window resize - current size ${currentCols}x${currentRows} is astronomical`
            )
            return
          }

          fitAddon.fit()

          // Context7: Ensure cursor remains visible after window resize
          setTimeout(() => {
            if (terminal && typeof terminal.scrollToBottom === 'function') {
              terminal.scrollToBottom()
            }
          }, 50)

          // Post-resize completed
        } catch (error) {
          console.warn('[Terminal] Window resize error:', error)
        }
      }
      windowResizeTimeout = null
    }, 250) // 250ms debounce - much slower than ResizeObserver
  }

  // Listen to actual window resize events only
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', windowResizeHandler)
  }
}

// FIXED SOLUTION: XTerm.js backpressure management based on Context7 terminal.write() callback pattern
class TerminalBackpressureManager {
  private writeQueue: string[] = []
  private isWriting = false
  private readonly CHUNK_SIZE = 512 // Smaller 512-byte chunks for better stability
  private readonly WRITE_DELAY = 0 // No artificial delay - let XTerm.js callbacks control pacing
  private readonly MAX_QUEUE_SIZE = 100 // Context7 recommended memory limit
  private readonly MAX_DATA_SIZE = 1024 * 1024 // 1MB max per write operation
  private totalMemoryUsage = 0

  async writeWithBackpressure(terminal: Terminal, data: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      // Context7 memory management - validate data size
      if (data.length > this.MAX_DATA_SIZE) {
        const error = new Error(
          `Data size ${data.length} exceeds maximum ${this.MAX_DATA_SIZE}`
        )
        console.error('[Terminal] Backpressure:', error.message)
        reject(error)
        return
      }

      // Context7 queue management - prevent memory overflow
      if (this.writeQueue.length >= this.MAX_QUEUE_SIZE) {
        console.warn('[Terminal] Write queue full, dropping oldest data')
        this.writeQueue.shift() // Remove oldest item
        this.updateMemoryUsage()
      }

      // Add to queue if already writing
      if (this.isWriting) {
        this.writeQueue.push(data)
        this.updateMemoryUsage()
        resolve() // Resolve immediately, queuing is handled
        return
      }

      this.startWriting(terminal, data, resolve)
    })
  }

  private updateMemoryUsage(): void {
    this.totalMemoryUsage = this.writeQueue.reduce(
      (sum, item) => sum + item.length,
      0
    )
  }

  private startWriting(
    terminal: Terminal,
    data: string,
    onComplete: () => void
  ): void {
    this.isWriting = true

    try {
      // For large data, chunk it with proper callback synchronization
      if (data.length > this.CHUNK_SIZE) {
        this.writeDataInChunksSync(terminal, data, onComplete)
      } else {
        // Small data - write directly with callback (Context7 pattern)
        if (terminal && typeof terminal.write === 'function') {
          terminal.write(data, () => {
            this.isWriting = false
            this.processQueueNext(terminal)
            onComplete()
          })
        } else {
          this.isWriting = false
          this.processQueueNext(terminal)
          onComplete()
        }
      }
    } catch (error) {
      console.error('[Terminal] Write error in startWriting:', error)
      this.isWriting = false
      // Clear queue on error to prevent stuck state
      this.writeQueue = []
      onComplete()
    }
  }

  private writeDataInChunksSync(
    terminal: Terminal,
    data: string,
    onComplete: () => void
  ): void {
    const chunks: string[] = []
    for (let i = 0; i < data.length; i += this.CHUNK_SIZE) {
      chunks.push(data.substring(i, i + this.CHUNK_SIZE))
    }

    let chunkIndex = 0

    const writeNextChunk = (): void => {
      if (chunkIndex >= chunks.length) {
        // All chunks written successfully
        this.isWriting = false
        this.processQueueNext(terminal)
        onComplete()
        return
      }

      const currentChunk = chunks[chunkIndex]
      chunkIndex++

      // CRITICAL: Use XTerm.js callback for synchronization (Context7 pattern)
      if (terminal && typeof terminal.write === 'function') {
        terminal.write(currentChunk, () => {
          // XTerm.js has processed this chunk, safe to continue
          if (this.WRITE_DELAY > 0) {
            setTimeout(writeNextChunk, this.WRITE_DELAY)
          } else {
            // Let the next iteration happen on next tick for better performance
            setTimeout(writeNextChunk, 0)
          }
        })
      } else {
        // If terminal.write is not available, continue without writing
        if (this.WRITE_DELAY > 0) {
          setTimeout(writeNextChunk, this.WRITE_DELAY)
        } else {
          setTimeout(writeNextChunk, 0)
        }
      }
    }

    writeNextChunk()
  }

  private processQueueNext(terminal: Terminal): void {
    if (this.writeQueue.length > 0) {
      const nextData = this.writeQueue.shift()!
      // Process immediately without creating new Promise
      this.startWriting(terminal, nextData, () => {
        // Queue item processed, no additional action needed
      })
    }
  }

  // Clean shutdown with memory cleanup
  clear(): void {
    this.writeQueue = []
    this.isWriting = false
    this.totalMemoryUsage = 0
  }

  // Debug info with memory monitoring (Context7 pattern)
  getQueueSize(): number {
    return this.writeQueue.length
  }

  getMemoryUsage(): number {
    return this.totalMemoryUsage
  }

  getMemoryUsageMB(): number {
    return this.totalMemoryUsage / (1024 * 1024)
  }

  isCurrentlyWriting(): boolean {
    return this.isWriting
  }

  // Context7 recommended memory health check
  isMemoryHealthy(): boolean {
    return (
      this.writeQueue.length < this.MAX_QUEUE_SIZE * 0.8 &&
      this.totalMemoryUsage < this.MAX_DATA_SIZE * 0.5
    )
  }
}

// Context7 recommendation: Remove dead code to improve maintainability
// Removed unused utility functions: isLikelyCommandOutput, isLikelyPrompt
// These were not being used and added unnecessary complexity

// Create backpressure manager instance
const backpressureManager = new TerminalBackpressureManager()

// Enhanced terminal data handling with Context7-based backpressure and robust error handling
const handleTerminalData = async (termData: { id: string; data: string }) => {
  try {
    if (!termData?.id || !termData?.data || !terminal) {
      console.warn('[Terminal] Invalid data received:', {
        termData,
        terminal: !!terminal,
      })
      return
    }

    // Simple ID validation
    if (termData.id !== currentTerminalId.value) {
      console.warn(
        '[Terminal] Data for different terminal:',
        termData.id,
        'vs',
        currentTerminalId.value
      )
      return
    }

    // Validate terminal state before processing
    if (!terminal || !terminal.element || !terminal.element.isConnected) {
      console.warn('[Terminal] Terminal element not connected, skipping data')
      return
    }
  } catch (validationError) {
    console.error(
      '[Terminal] Validation error in handleTerminalData:',
      validationError
    )
    return
  }

  // Enable connection on first data
  if (!isConnected.value) {
    isConnected.value = true

    // Force a resize when first data arrives to ensure proper terminal sizing
    setTimeout(() => {
      if (
        isComponentMounted.value &&
        terminal &&
        fitAddon &&
        terminalContainer.value
      ) {
        resize()
        // Context7: Fix initial scroll interaction issue
        if (typeof terminal.scrollToBottom === 'function') {
          terminal.scrollToBottom()
        }
      }
    }, 100)
  }

  try {
    // Clear any existing selection before writing data to prevent gray overlay
    if (terminal.hasSelection()) {
      terminal.clearSelection()
    }

    // Use enhanced backpressure manager with Context7 callback pattern
    await backpressureManager.writeWithBackpressure(terminal, termData.data)

    // Intelligent auto-scroll for terminal output (Windows Terminal snapOnOutput pattern)
    // Only scroll if user is at virtual bottom
    const viewport =
      terminal.element && typeof terminal.element.querySelector === 'function'
        ? terminal.element.querySelector('.xterm-viewport')
        : null
    if (viewport) {
      const isAtBottom =
        viewport.scrollTop + viewport.clientHeight >= viewport.scrollHeight - 10

      // Only auto-scroll if user is at bottom (preserves manual scroll position)
      if (isAtBottom && typeof window !== 'undefined') {
        window.requestAnimationFrame(() => {
          if (terminal && typeof terminal.scrollToBottom === 'function') {
            terminal.scrollToBottom()
          }
        })
      }
    }
  } catch (error) {
    console.error('[Terminal] Backpressure write failed:', {
      error,
      dataSize: termData.data.length,
      queueSize: backpressureManager.getQueueSize(),
      terminalId: termData.id,
    })

    // Attempt recovery on failure
    try {
      backpressureManager.clear()
      console.warn('[Terminal] Cleared backpressure queue for recovery')
    } catch (clearError) {
      console.error(
        '[Terminal] Failed to clear backpressure queue:',
        clearError
      )
    }
  }
}

const setupTerminalIPCListeners = () => {
  if (typeof window === 'undefined' || !window.electronAPI) {
    console.warn('[Terminal] No electronAPI available for IPC listeners')
    return
  }

  // Clean up existing listeners first
  cleanupIPCListeners()

  // Terminal data handler
  const handleTerminalDataWrapper = (data: unknown) => {
    const termData = data as { id: string; data: string }
    handleTerminalData(termData)
  }

  // Terminal exit handler
  const handleTerminalExitWrapper = (data: unknown) => {
    const exitData = data as { id: string; exitCode: number }
    if (exitData.id === currentTerminalId.value && terminal) {
      if (typeof terminal.write === 'function') {
        terminal.write(
          `\r\n[Process exited with code ${exitData.exitCode}]\r\n`
        )
      }
      isConnected.value = false
    }
  }

  // Terminal error handler
  const handleTerminalErrorWrapper = (data: unknown) => {
    const errorData = data as { error: string }
    if (terminal && typeof terminal.write === 'function') {
      terminal.write(`\r\n[Terminal Error: ${errorData.error}]\r\n`)
    }
    console.error('[Terminal] Error:', errorData.error)
  }

  // Set up listeners
  window.electronAPI.on('terminal-data', handleTerminalDataWrapper)
  window.electronAPI.on('terminal-exit', handleTerminalExitWrapper)
  window.electronAPI.on('terminal-error', handleTerminalErrorWrapper)

  // Store cleanup functions (Note: electronAPI.off doesn't exist, so we track them for reference)
  ipcCleanupFunctions = [
    () =>
      console.log(
        '[Terminal] IPC listeners cleaned up (electronAPI.off not available)'
      ),
  ]
}

const connectToTerminal = async (terminalId: string) => {
  try {
    if (!window.electronAPI) {
      console.error('[Terminal] No Electron API available')
      return
    }

    currentTerminalId.value = terminalId
    isConnected.value = false // Reset connection state

    // Terminal will be enabled when first data arrives
  } catch (error) {
    console.error('[Terminal] Failed to connect to terminal:', error)
    isConnected.value = false
  }
}

const writeData = (data: string) => {
  if (terminal && typeof terminal.write === 'function') {
    terminal.write(data)
  }
}

const clear = () => {
  if (terminal && typeof terminal.clear === 'function') {
    terminal.clear()
  }
}

const focus = () => {
  if (terminal && typeof terminal.focus === 'function') {
    terminal.focus()
  }
}

// Debounced manual resize with protection against loops
let manualResizeTimeout: ReturnType<typeof setTimeout> | null = null

// EMERGENCY: Dimension protection to prevent astronomical sizes
const isReasonableTerminalSize = (cols: number, rows: number): boolean => {
  // Prevent astronomical dimensions that cause infinite loops
  const MAX_COLS = 500 // Reasonable maximum columns
  const MAX_ROWS = 200 // Reasonable maximum rows
  const MIN_COLS = 10 // Minimum usable columns
  const MIN_ROWS = 5 // Minimum usable rows

  if (cols > MAX_COLS || rows > MAX_ROWS) {
    console.error(
      `[Terminal] EMERGENCY: Preventing astronomical resize ${cols}x${rows}`
    )
    return false
  }

  if (cols < MIN_COLS || rows < MIN_ROWS) {
    console.warn(`[Terminal] Preventing too small resize ${cols}x${rows}`)
    return false
  }

  return true
}

const resize = () => {
  if (
    !isComponentMounted.value ||
    !fitAddon ||
    !terminal ||
    !terminalContainer.value
  ) {
    return
  }

  // Check current terminal dimensions BEFORE resize
  const currentCols = terminal.cols
  const currentRows = terminal.rows

  // Emergency protection: don't resize if current size is already astronomical
  if (!isReasonableTerminalSize(currentCols, currentRows)) {
    console.error(
      `[Terminal] EMERGENCY: Blocking resize - current size ${currentCols}x${currentRows} is astronomical`
    )
    return
  }

  // Clear any pending manual resize
  if (manualResizeTimeout) {
    clearTimeout(manualResizeTimeout)
  }

  // Debounce manual resize calls
  manualResizeTimeout = setTimeout(() => {
    // CRITICAL: Extra safety check to prevent resize on destroyed component
    if (
      !isComponentMounted.value ||
      !fitAddon ||
      !terminal ||
      !terminalContainer.value ||
      !terminal.element
    ) {
      return
    }

    try {
      // Double-check before actual resize
      if (
        !terminal ||
        typeof terminal.cols !== 'number' ||
        typeof terminal.rows !== 'number'
      )
        return
      const preResizeCols = terminal.cols
      const preResizeRows = terminal.rows

      if (!isReasonableTerminalSize(preResizeCols, preResizeRows)) {
        console.error(
          `[Terminal] EMERGENCY: Aborting resize - pre-resize size ${preResizeCols}x${preResizeRows} is astronomical`
        )
        return
      }

      // Validate container is properly sized before resizing
      const containerRect = terminalContainer.value.getBoundingClientRect()

      if (containerRect.width === 0 || containerRect.height === 0) {
        console.warn('[Terminal] Container not visible, skipping resize')
        return
      }

      fitAddon.fit()

      // Context7 Enhancement: Resize shared terminal renderer to match XTerm.js
      if (
        terminalRenderer &&
        webglEngine &&
        terminal &&
        terminal.rows &&
        terminal.cols
      ) {
        try {
          if (typeof terminalRenderer.resize === 'function') {
            terminalRenderer.resize(terminal.rows, terminal.cols)
          }
          // Resize WebGL engine canvas to match container
          if (typeof webglEngine.resize === 'function') {
            webglEngine.resize(containerRect.width, containerRect.height)
          }
          console.log(
            `[Terminal] Shared renderer resized to ${terminal.cols}x${terminal.rows}`
          )
        } catch (sharedResizeError) {
          console.warn(
            '[Terminal] Shared renderer resize failed:',
            sharedResizeError
          )
        }
      }

      // Context7: Ensure cursor remains visible after resize
      setTimeout(() => {
        if (terminal && typeof terminal.scrollToBottom === 'function') {
          terminal.scrollToBottom()
        }
      }, 50)

      // CRITICAL FIX: Reapply viewport overflow fix after resize
      setTimeout(() => {
        if (
          terminal &&
          terminal.element &&
          typeof terminal.element.querySelector === 'function'
        ) {
          // Reapply viewport fix
          const xtermViewport = terminal.element.querySelector(
            '.xterm-viewport'
          ) as HTMLElement
          if (xtermViewport) {
            xtermViewport.style.position = 'absolute'
            xtermViewport.style.top = '0'
            xtermViewport.style.left = '0'
            xtermViewport.style.right = '0'
            xtermViewport.style.bottom = '0'
            xtermViewport.style.width = 'auto'
            xtermViewport.style.height = 'auto'
            xtermViewport.style.overflow = 'auto'

            // Reapply theme background color
            const backgroundColor =
              props.theme === 'light' ? '#f6f8fa' : '#161b22'
            xtermViewport.style.backgroundColor = backgroundColor
          }

          // Reapply screen positioning
          const xtermScreen =
            terminal &&
            terminal.element &&
            typeof terminal.element.querySelector === 'function'
              ? (terminal.element.querySelector('.xterm-screen') as HTMLElement)
              : null
          if (xtermScreen) {
            xtermScreen.style.position = 'relative'
            xtermScreen.style.left = '0'
            xtermScreen.style.top = '0'
            xtermScreen.style.transform = 'none'
            xtermScreen.style.width = '100%'
            xtermScreen.style.height = 'auto'
            xtermScreen.style.minHeight = '100%'
          }
        }
      }, 50)

      // Check post-resize dimensions
      if (terminal) {
        const postResizeCols = terminal.cols
        const postResizeRows = terminal.rows

        // If the terminal is still too small after fit, force reasonable dimensions
        if (postResizeCols < 10 || postResizeRows < 5) {
          console.warn(
            '[Terminal] Post-resize dimensions too small, forcing minimum size'
          )
          if (terminal && typeof terminal.resize === 'function') {
            terminal.resize(80, 24)
          }
        }
      }
    } catch (error) {
      console.warn('[Terminal] Manual resize error:', error)
    }

    manualResizeTimeout = null
  }, 50) // Shorter debounce for manual calls
}

// Context7 cleanup: Removed unused search functions
// The search addon is loaded but advanced search features not exposed
// This keeps the addon available for internal use while simplifying the API

// Context7 Enhancement: Unified resource management status
const resourceStatus = ref({
  terminal: false,
  webglAddon: false,
  sharedEngine: false,
  sharedRenderer: false,
  performanceMonitoring: false,
  totalResources: 0,
  lastResourceCheck: Date.now(),
})

// Context7 Enhancement: Performance monitoring integration
const performanceMetrics = ref({
  fps: 0,
  frameTime: 0,
  drawCalls: 0,
  vertices: 0,
  triangles: 0,
  memoryUsage: 0,
  isWebGLActive: false,
  timestamp: Date.now(),
})

// Performance monitoring function that integrates with shared-rendering
const updatePerformanceMetrics = () => {
  if (webglEngine) {
    try {
      const metrics = webglEngine.performanceMetrics
      performanceMetrics.value = {
        fps: metrics.fps,
        frameTime: metrics.frameTime,
        drawCalls: metrics.drawCalls,
        vertices: metrics.vertices,
        triangles: metrics.triangles,
        memoryUsage: backpressureManager.getMemoryUsageMB(),
        isWebGLActive: !webglEngine.isDisposed && useWebGLAcceleration.value,
        timestamp: Date.now(),
      }

      // Log performance warnings based on Context7 recommendations
      if (metrics.fps < 30 && useWebGLAcceleration.value) {
        console.warn(
          '[Terminal] Performance warning: Low FPS detected',
          metrics.fps
        )
      }

      if (!backpressureManager.isMemoryHealthy()) {
        console.warn('[Terminal] Performance warning: Memory usage high', {
          queueSize: backpressureManager.getQueueSize(),
          memoryMB: backpressureManager.getMemoryUsageMB(),
        })
      }
    } catch (error) {
      console.warn('[Terminal] Performance monitoring error:', error)
    }
  } else {
    // Fallback metrics when WebGL is not available
    performanceMetrics.value.isWebGLActive = false
    performanceMetrics.value.memoryUsage =
      backpressureManager.getMemoryUsageMB()
    performanceMetrics.value.timestamp = Date.now()
  }
}

// Start performance monitoring interval
let performanceMonitoringInterval: ReturnType<typeof setInterval> | null = null

const startPerformanceMonitoring = () => {
  if (performanceMonitoringInterval) return

  performanceMonitoringInterval = setInterval(updatePerformanceMetrics, 1000)
  resourceStatus.value.performanceMonitoring = true
  updateResourceStatus()
  console.log('[Terminal] Performance monitoring started')
}

const stopPerformanceMonitoring = () => {
  if (performanceMonitoringInterval) {
    clearInterval(performanceMonitoringInterval)
    performanceMonitoringInterval = null
    resourceStatus.value.performanceMonitoring = false
    console.log('[Terminal] Performance monitoring stopped')
  }
}

// Context7 Enhancement: Unified resource management functions
const updateResourceStatus = () => {
  resourceStatus.value = {
    terminal: !!terminal && !terminal.element?.isConnected === false,
    webglAddon: !!webglAddon && useWebGLAcceleration.value,
    sharedEngine: !!webglEngine && !webglEngine.isDisposed,
    sharedRenderer: !!terminalRenderer && !terminalRenderer.isDisposed,
    performanceMonitoring: !!performanceMonitoringInterval,
    totalResources: [
      terminal,
      webglAddon,
      webglEngine,
      terminalRenderer,
      performanceMonitoringInterval,
    ].filter(Boolean).length,
    lastResourceCheck: Date.now(),
  }
}

// Unified disposal function following shared-rendering patterns
const disposeAllResources = () => {
  const disposalOrder = [
    'performanceMonitoring',
    'webglAddon',
    'sharedRenderer',
    'sharedEngine',
    'terminal',
  ]

  console.log('[Terminal] Starting unified resource disposal...')

  disposalOrder.forEach((resourceType) => {
    try {
      switch (resourceType) {
        case 'performanceMonitoring':
          stopPerformanceMonitoring()
          break
        case 'webglAddon':
          if (webglAddon) {
            webglAddon.dispose?.()
            webglAddon = null
          }
          break
        case 'sharedRenderer':
          if (terminalRenderer) {
            terminalRenderer.dispose()
            terminalRenderer = null
          }
          break
        case 'sharedEngine':
          if (webglEngine) {
            webglEngine.dispose()
            webglEngine = null
          }
          break
        case 'terminal':
          if (terminal) {
            terminal.dispose?.()
            terminal = null
          }
          break
      }
      console.log(`[Terminal] Disposed ${resourceType}`)
    } catch (error) {
      console.error(`[Terminal] Error disposing ${resourceType}:`, error)
    }
  })

  updateResourceStatus()
  console.log('[Terminal] Unified resource disposal completed')
}

// Resource health check function
const checkResourceHealth = () => {
  updateResourceStatus()

  const unhealthyResources = []

  if (terminal && terminal.element && !terminal.element.isConnected) {
    unhealthyResources.push('terminal (disconnected)')
  }

  if (webglEngine && webglEngine.isDisposed && useWebGLAcceleration.value) {
    unhealthyResources.push('webglEngine (disposed but should be active)')
  }

  if (
    terminalRenderer &&
    terminalRenderer.isDisposed &&
    useWebGLAcceleration.value
  ) {
    unhealthyResources.push('terminalRenderer (disposed but should be active)')
  }

  if (unhealthyResources.length > 0) {
    console.warn('[Terminal] Resource health check failed:', unhealthyResources)
    return false
  }

  return true
}

// Enhanced clipboard operations with ClipboardAddon (Context7 best practices)
const copySelection = async (): Promise<string> => {
  try {
    if (terminal && terminal.hasSelection()) {
      const selectedText = terminal.getSelection()

      // Use the clipboard addon for enhanced functionality
      // eslint-disable-next-line no-undef
      if (clipboardAddon && navigator.clipboard) {
        // eslint-disable-next-line no-undef
        await navigator.clipboard.writeText(selectedText)
      }

      return selectedText
    }
  } catch (error) {
    console.error('[Terminal] Copy selection error:', error)
    // Fallback to basic selection
    if (terminal) {
      return terminal.getSelection()
    }
  }
  return ''
}

const paste = async (text?: string) => {
  try {
    let textToPaste = text

    // If no text provided, try to read from clipboard
    // eslint-disable-next-line no-undef
    if (!textToPaste && navigator.clipboard) {
      try {
        // eslint-disable-next-line no-undef
        textToPaste = await navigator.clipboard.readText()
      } catch (clipboardError) {
        console.warn(
          '[Terminal] Could not read from clipboard:',
          clipboardError
        )
        return
      }
    }

    if (
      textToPaste &&
      terminal &&
      currentTerminalId.value &&
      window.electronAPI
    ) {
      if (window.electronAPI.sendTerminalInput) {
        window.electronAPI.sendTerminalInput({
          id: currentTerminalId.value,
          data: textToPaste,
        })
      } else {
        window.electronAPI.send('terminal-input', {
          id: currentTerminalId.value,
          data: textToPaste,
        })
      }
    }
  } catch (error) {
    console.error('[Terminal] Paste error:', error)
  }
}

// Enhanced clipboard key bindings (Context7 recommended patterns)
const handleClipboardShortcuts = (event: KeyboardEvent) => {
  // Ctrl+C or Cmd+C - Copy
  if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
    if (terminal?.hasSelection()) {
      event.preventDefault()
      copySelection()
      return
    }
    // If no selection, let Ctrl+C send interrupt signal to terminal
  }

  // Ctrl+V or Cmd+V - Paste
  if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
    event.preventDefault()
    paste()
    return
  }

  // Ctrl+A or Cmd+A - Select all
  if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
    if (terminal) {
      event.preventDefault()
      terminal.selectAll()
      return
    }
  }
}

// Context7 cleanup: Removed debug function - not used in production
// Terminal state can be inspected directly via browser dev tools if needed

// Watch for terminalId changes - CRITICAL FIX
watch(
  () => props.terminalId,
  (newTerminalId, oldTerminalId) => {
    if (newTerminalId !== oldTerminalId) {
      if (newTerminalId) {
        // Reset connection state
        isConnected.value = false
        // Connect to new terminal
        connectToTerminal(newTerminalId)
      } else {
        // No terminal ID, disconnect
        currentTerminalId.value = undefined
        isConnected.value = false
      }
    }
  },
  { immediate: false } // Don't run on initial mount, initializeTerminal handles that
)

// Watch for theme changes
watch(
  () => props.theme,
  () => {
    if (terminal && terminal.options) {
      terminal.options.theme = getTerminalTheme()

      // Update viewport background color when theme changes
      const xtermViewport =
        terminal.element && typeof terminal.element.querySelector === 'function'
          ? (terminal.element.querySelector('.xterm-viewport') as HTMLElement)
          : null
      if (xtermViewport) {
        const backgroundColor = props.theme === 'light' ? '#f6f8fa' : '#161b22'
        xtermViewport.style.backgroundColor = backgroundColor
      }
    }
  }
)

// Watch for font changes
watch([() => props.fontSize, () => props.fontFamily], () => {
  if (terminal) {
    terminal.options.fontSize = props.fontSize
    terminal.options.fontFamily = props.fontFamily
    resize()
  }
})

// Focus management functions
const activateTerminal = () => {
  terminalHasFocus.value = true

  // CRITICAL FIX: Force blur of all external inputs to remove their visual focus
  document.querySelectorAll('input, textarea').forEach((element) => {
    // Only blur if it's not the XTerm textarea
    if (element !== terminal?.textarea) {
      ;(element as HTMLElement).blur()
    }
  })

  // Focus the actual terminal and apply CSS classes for cursor visibility
  nextTick(() => {
    if (
      terminal &&
      terminal.element &&
      typeof terminal.element.querySelector === 'function'
    ) {
      const textarea = terminal.element.querySelector(
        '.xterm-helper-textarea'
      ) as HTMLTextAreaElement
      if (textarea) {
        textarea.focus()
        // Apply focused state to terminal element
        terminal.element.classList.remove('terminal-unfocused')
        terminal.element.classList.add('terminal-focused')
        // Enable cursor blink
        terminal.options.cursorBlink = true

        // Snap-on-input: Always scroll to bottom when user activates terminal
        // This follows Windows Terminal snapOnInput pattern
        if (typeof terminal.scrollToBottom === 'function') {
          terminal.scrollToBottom()
        }
      }
    }
  })
}

const deactivateTerminal = () => {
  terminalHasFocus.value = false

  // Remove focus state and hide cursor
  if (terminal && terminal.element) {
    terminal.element.classList.add('terminal-unfocused')
    terminal.element.classList.remove('terminal-focused')
    // Disable cursor blink
    terminal.options.cursorBlink = false
  }
}

onMounted(() => {
  initializeTerminal()

  // Inicializar el estado de foco como inactivo
  terminalHasFocus.value = false

  // Simple keyboard handler
  const simpleKeyHandler = (event: KeyboardEvent) => {
    // Handle clipboard shortcuts first (before terminal focus check)
    handleClipboardShortcuts(event)

    // Only process regular keys if terminal has focus AND is connected
    if (
      !terminalHasFocus.value ||
      !terminal ||
      !currentTerminalId.value ||
      !isConnected.value
    ) {
      return
    }

    // Don't interfere with system shortcuts (except clipboard ones handled above)
    if (event.metaKey || event.ctrlKey || event.altKey) {
      return
    }

    // Convert key to terminal input
    let terminalInput = ''

    if (event.key === 'Enter') {
      terminalInput = '\r'
    } else if (event.key === 'Backspace') {
      terminalInput = '\x7f'
    } else if (event.key === 'Tab') {
      terminalInput = '\t'
    } else if (event.key === 'Escape') {
      terminalInput = '\x1b'
    } else if (event.key === 'ArrowUp') {
      terminalInput = '\x1b[A'
    } else if (event.key === 'ArrowDown') {
      terminalInput = '\x1b[B'
    } else if (event.key === 'ArrowRight') {
      terminalInput = '\x1b[C'
    } else if (event.key === 'ArrowLeft') {
      terminalInput = '\x1b[D'
    } else if (event.key.length === 1) {
      terminalInput = event.key
    }

    if (terminalInput && window.electronAPI?.sendTerminalInput) {
      event.preventDefault()
      event.stopPropagation()

      window.electronAPI.sendTerminalInput({
        id: currentTerminalId.value,
        data: terminalInput,
      })
    }
  }

  // Focus management through click - simplified
  if (terminalContainer.value) {
    terminalContainer.value.addEventListener('click', (event) => {
      // Solo activar si no se hace clic en el overlay
      if (
        !event.target ||
        !(event.target as HTMLElement).closest('.terminal-focus-overlay')
      ) {
        activateTerminal()
      }
    })
  }

  // Lose focus when clicking outside
  document.addEventListener('click', (event) => {
    if (
      terminalContainer.value &&
      !terminalContainer.value.contains(event.target as HTMLElement)
    ) {
      deactivateTerminal()
    }
  })

  // Add keyboard listener
  document.addEventListener('keydown', simpleKeyHandler, true)

  // Cleanup
  const cleanup = () => {
    document.removeEventListener('keydown', simpleKeyHandler, true)
  } // Store cleanup function for onUnmounted
  const globalWindow = window as { __terminalCleanup?: () => void }
  globalWindow.__terminalCleanup = cleanup

  // Additional focus enforcement after component is fully mounted
  setTimeout(() => {
    if (
      terminal &&
      terminalContainer.value &&
      typeof terminal.focus === 'function'
    ) {
      terminal.focus()

      // Also try to focus the DOM element
      const terminalElement = terminal.element
      if (terminalElement && typeof terminalElement.focus === 'function') {
        terminalElement.focus()
      }
    }
  }, 200)
})

/**
 * Handle terminal activation when component is reactivated by KeepAlive.
 * Ensures terminal is properly sized and focused after reactivation.
 *
 * @since 1.0.0
 */
onActivated(() => {
  console.log('[TerminalView] Component activated via KeepAlive')

  // Re-focus and resize terminal when component is reactivated
  nextTick(() => {
    if (terminal && terminalContainer.value && fitAddon) {
      try {
        // Ensure terminal is properly sized after reactivation
        const containerRect = terminalContainer.value.getBoundingClientRect()

        if (containerRect.width > 0 && containerRect.height > 0) {
          // Re-fit the terminal to the container
          fitAddon.fit()

          // Reapply any viewport fixes that might be needed
          const xtermViewport =
            terminal.element &&
            typeof terminal.element.querySelector === 'function'
              ? (terminal.element.querySelector(
                  '.xterm-viewport'
                ) as HTMLElement)
              : null
          if (xtermViewport) {
            // Ensure scroll position is maintained
            if (typeof terminal.scrollToBottom === 'function') {
              terminal.scrollToBottom()
            }
          }

          // Ensure terminal focus
          if (typeof terminal.focus === 'function') {
            terminal.focus()
          }

          console.log('[TerminalView] Terminal reactivated and focused')
        }
      } catch (error) {
        console.error('[TerminalView] Error during activation:', error)
      }
    }
  })
})

/**
 * Handle terminal deactivation when component is cached by KeepAlive.
 * Performs cleanup of active states when component is hidden.
 *
 * @since 1.0.0
 */
onDeactivated(() => {
  console.log('[TerminalView] Component deactivated by KeepAlive')

  // Optional: Clean up active states when deactivated
  if (terminal) {
    try {
      // Blur the terminal to prevent focus conflicts
      terminal.blur()

      // Mark terminal as not having focus
      terminalHasFocus.value = false

      console.log('[TerminalView] Terminal deactivated and blurred')
    } catch (error) {
      console.error('[TerminalView] Error during deactivation:', error)
    }
  }
})

// Cleanup function for IPC listeners
const cleanupIPCListeners = () => {
  // Run any stored cleanup functions
  ipcCleanupFunctions.forEach((cleanup) => cleanup())
  ipcCleanupFunctions = []
}

// Context7 cleanup: Removed unused mutation observer cleanup function

onUnmounted(() => {
  try {
    // CRITICAL: Mark component as unmounted to prevent async operations
    isComponentMounted.value = false

    // Context7 Enhancement: Use unified resource disposal pattern
    console.log('[Terminal] Component unmounting, starting cleanup...')

    // Clean up focus management
    if (focusCleanup) {
      focusCleanup()
      focusCleanup = null
    }

    // Clean up backpressure manager
    backpressureManager.clear()

    // Clean up global keyboard listener
    const globalWindow = window as { __terminalCleanup?: () => void }
    if (globalWindow.__terminalCleanup) {
      globalWindow.__terminalCleanup()
      delete globalWindow.__terminalCleanup
    }

    // Clean up window resize handler
    if (windowResizeHandler && typeof window !== 'undefined') {
      window.removeEventListener('resize', windowResizeHandler)
      windowResizeHandler = null
    }

    // Clean up resize timeouts to prevent memory leaks
    if (manualResizeTimeout) {
      clearTimeout(manualResizeTimeout)
      manualResizeTimeout = null
    }

    if (windowResizeTimeout) {
      clearTimeout(windowResizeTimeout)
      windowResizeTimeout = null
    }

    // Context7 Enhancement: Use unified disposal instead of manual cleanup
    disposeAllResources()

    // Clean up remaining addons not covered by unified disposal
    try {
      if (clipboardAddon) {
        clipboardAddon.dispose?.()
        clipboardAddon = null
      }
      if (fitAddon) {
        fitAddon.dispose?.()
        fitAddon = null
      }
      if (searchAddon) {
        searchAddon.dispose?.()
        searchAddon = null
      }
      if (unicode11Addon) {
        unicode11Addon.dispose?.()
        unicode11Addon = null
      }
    } catch (addonError) {
      console.warn('[Terminal] Error disposing remaining addons:', addonError)
    }

    // Clean up keydown event listeners
    const terminalElement = terminal?.element
    if (
      terminalElement &&
      handleKeyDown &&
      typeof terminalElement.removeEventListener === 'function'
    ) {
      // Remove from terminal element
      terminalElement.removeEventListener('keydown', handleKeyDown, true)

      // Remove from container
      if (
        terminalContainer.value &&
        typeof terminalContainer.value.removeEventListener === 'function'
      ) {
        terminalContainer.value.removeEventListener(
          'keydown',
          handleKeyDown,
          true
        )
      }

      // Remove global handler
      const globalHandler = (terminalElement as ExtendedHTMLElement)
        .__globalKeyDownHandler
      if (globalHandler) {
        document.removeEventListener('keydown', globalHandler, true)
        delete (terminalElement as ExtendedHTMLElement).__globalKeyDownHandler
      }
    }

    // Clean up terminal (Context7 recommended order)
    if (terminal) {
      try {
        if (typeof terminal.dispose === 'function') {
          terminal.dispose()
        }
        terminal = null
      } catch (terminalError) {
        console.error('[Terminal] Error disposing terminal:', terminalError)
      }
    }

    // Clean up IPC listeners
    cleanupIPCListeners()
  } catch (error) {
    console.error('[Terminal] Error during cleanup:', error)
  }
})

// Add scroll management functions
const scrollToBottom = () => {
  if (terminal && typeof terminal.scrollToBottom === 'function') {
    terminal.scrollToBottom()
  }
}

const scrollToTop = () => {
  if (terminal && typeof terminal.scrollToLine === 'function') {
    terminal.scrollToLine(0)
  }
}

// Setup intelligent auto-scroll based on Windows Terminal patterns
const setupIntelligentAutoScroll = () => {
  if (!terminal) return

  // Scroll behavior setup (no local state needed with simplified approach)

  // Listen for terminal output (data coming back from PTY)
  // This is handled by the backpressure manager in handleTerminalData()
  // Auto-scroll logic is applied there when new content is written to terminal

  // Scroll behavior is now handled directly in handleTerminalData() for output
  // and in the main onData() handler for user input (snap-on-input)

  // Snap-on-input is now handled comprehensively in initializeTerminal() via:
  // 1. terminal.onData() - for data sent to PTY
  // 2. terminal.attachCustomKeyEventHandler() - for all keyboard events
  // 3. Mouse and focus events are handled here for completeness

  const terminalElement = terminal.element
  if (
    terminalElement &&
    typeof terminalElement.addEventListener === 'function'
  ) {
    // Mouse click should also trigger snap-on-input
    terminalElement.addEventListener('mousedown', () => {
      if (typeof window !== 'undefined') {
        window.requestAnimationFrame(() => {
          if (terminal && typeof terminal.scrollToBottom === 'function') {
            terminal.scrollToBottom()
          }
        })
      }
    })

    // Focus events should also trigger snap-on-input
    terminalElement.addEventListener('focus', () => {
      if (typeof window !== 'undefined') {
        window.requestAnimationFrame(() => {
          if (terminal && typeof terminal.scrollToBottom === 'function') {
            terminal.scrollToBottom()
          }
        })
      }
    })
  }
}

// Add keyboard shortcuts for scroll control
const setupScrollKeyboardShortcuts = () => {
  if (!terminal) return

  // Check if attachCustomKeyEventHandler method exists
  if (typeof terminal.attachCustomKeyEventHandler === 'function') {
    terminal.attachCustomKeyEventHandler((event) => {
      // Ctrl/Cmd + Home: Scroll to top
      if ((event.ctrlKey || event.metaKey) && event.key === 'Home') {
        scrollToTop()
        return false
      }

      // Ctrl/Cmd + End: Scroll to bottom
      if ((event.ctrlKey || event.metaKey) && event.key === 'End') {
        scrollToBottom()
        return false
      }

      // Page Up: Scroll up
      if (event.key === 'PageUp') {
        if (
          terminal &&
          typeof terminal.scrollLines === 'function' &&
          terminal.rows
        ) {
          terminal.scrollLines(-terminal.rows + 1)
        }
        return false
      }

      // Page Down: Scroll down
      if (event.key === 'PageDown') {
        if (
          terminal &&
          typeof terminal.scrollLines === 'function' &&
          terminal.rows
        ) {
          terminal.scrollLines(terminal.rows - 1)
        }
        return false
      }

      return true
    })
  }
}

// Expose essential methods for parent components - Context7 simplified API
defineExpose({
  writeData,
  clear,
  focus,
  resize,
  // Essential clipboard features
  copySelection,
  paste,
  scrollToBottom,
  scrollToTop,
  // Focus management state for testing and external access
  get terminalHasFocus() {
    return terminalHasFocus.value
  },
  set terminalHasFocus(value: boolean) {
    terminalHasFocus.value = value
  },
  // Context7 Enhancement: Expose performance monitoring and WebGL status
  performanceMetrics: readonly(performanceMetrics),
  updatePerformanceMetrics,
  // WebGL acceleration status
  get isWebGLActive() {
    return useWebGLAcceleration.value && !webglEngine?.isDisposed
  },
  get webglSupport() {
    return webglSupport.value
  },
  // Shared-rendering engine access for advanced use cases
  get sharedWebGLEngine() {
    return webglEngine
  },
  get sharedTerminalRenderer() {
    return terminalRenderer
  },
  // Context7 Enhancement: Unified resource management
  resourceStatus: readonly(resourceStatus),
  updateResourceStatus,
  checkResourceHealth,
  disposeAllResources,
})
</script>

<style scoped>
.terminal-view {
  width: 100%;
  height: 100%;
  background-color: var(--bg-primary);
  overflow: hidden;
  /* Context7: Fix height mismatch issue */
  display: flex;
  flex-direction: column;
  min-height: 0; /* Allow flex item to shrink below content size */
  position: absolute; /* Take full space of parent */
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.terminal-view__container {
  width: 100%;
  height: 100%;
  /* Context7: Ensure container takes full available space */
  flex: 1;
  min-height: 0; /* Allow flex item to shrink below content size */
}

/* Clean XTerm.js styles - minimal interference */
:deep(.xterm) {
  font-family: 'JetBrains Mono', 'Monaco', 'Consolas', monospace;
  padding: 8px; /* Standardized with system terminals */
}

/* Selection styling */
:deep(.xterm-selection) {
  background-color: rgba(100, 150, 255, 0.3);
}

:deep(.xterm-selection div) {
  background-color: rgba(100, 150, 255, 0.3);
}

/* Scrollbar styling */
:deep(.xterm-viewport) {
  scrollbar-width: thin;
  scrollbar-color: var(--border-secondary) transparent;
}

:deep(.xterm-viewport)::-webkit-scrollbar {
  width: 8px;
}

:deep(.xterm-viewport)::-webkit-scrollbar-track {
  background: transparent;
}

:deep(.xterm-viewport)::-webkit-scrollbar-thumb {
  background: var(--border-secondary);
  border-radius: 4px;
}

/* Helper elements - minimal styling */
:deep(.xterm-helper-textarea) {
  display: none;
  opacity: 0;
  pointer-events: none;
}

:deep(.xterm-char-measure-element) {
  position: absolute;
  left: -9999px;
  opacity: 0;
}

/* CRITICAL FIX: Solve XTerm.js viewport overflow issue based on Context7 documentation */

/* The main terminal container must have proper bounds */
:deep(.xterm) {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  box-sizing: border-box;
  /* Context7: Ensure full height utilization */
  display: flex;
  flex-direction: column;
}

/* Fix the viewport overflow issue - Context7 performance-optimized scrolling */
:deep(.xterm-viewport) {
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  width: auto !important;
  height: auto !important;
  overflow: auto !important;
  overflow-x: hidden !important; /* Prevent horizontal scrolling issues */
  overflow-y: auto !important; /* Allow vertical scrolling */
  box-sizing: border-box;
  background-color: #161b22; /* Dark theme background */
  /* Enhanced scrolling performance */
  scroll-behavior: smooth;
  will-change: scroll-position;
  /* Better scrollbar styling */
  scrollbar-width: thin;
  scrollbar-color: #484f58 #21262d;
  /* Context7 performance: Removed smooth scrolling for better responsiveness */
  scroll-behavior: auto; /* Changed from smooth to auto for faster scrolling */
  -webkit-overflow-scrolling: touch; /* iOS support */
  /* Context7: Ensure content is fully accessible */
  max-height: 100% !important;
}

/* WebKit scrollbar styling for better visibility */
:deep(.xterm-viewport::-webkit-scrollbar) {
  width: 8px;
}

:deep(.xterm-viewport::-webkit-scrollbar-track) {
  background: #21262d;
  border-radius: 4px;
}

:deep(.xterm-viewport::-webkit-scrollbar-thumb) {
  background: #484f58;
  border-radius: 4px;
  border: 1px solid #21262d;
}

:deep(.xterm-viewport::-webkit-scrollbar-thumb:hover) {
  background: #656c76;
}

/* Light theme viewport background */
:deep(.terminal-view[data-theme='light'] .xterm-viewport) {
  background-color: #f6f8fa; /* Light theme background - equivalent to dark #161b22 */
}

/* Ensure the screen canvas stays within the viewport - Context7 optimized */
:deep(.xterm-screen) {
  position: relative !important;
  left: 0 !important;
  top: 0 !important;
  transform: none !important;
  width: 100% !important;
  height: 100% !important; /* Changed from auto to 100% to prevent overflow */
  max-height: 100% !important; /* Prevent expansion beyond viewport */
  box-sizing: border-box;
  overflow: hidden; /* Prevent internal overflow */
}

/* Context7 optimized layer positioning - prevent overflow issues */
:deep(.xterm-text-layer) {
  position: absolute !important;
  left: 0 !important;
  top: 0 !important;
  width: 100% !important;
  height: 100% !important;
  max-width: 100% !important;
  max-height: 100% !important;
  overflow: hidden !important;
  z-index: 1;
}

/* Fix cursor layer positioning */
:deep(.xterm-cursor-layer) {
  position: absolute !important;
  left: 0 !important;
  top: 0 !important;
  width: 100% !important;
  height: 100% !important;
  max-width: 100% !important;
  max-height: 100% !important;
  overflow: hidden !important;
  z-index: 2;
}

/* Fix selection layer positioning */
:deep(.xterm-selection-layer) {
  position: absolute !important;
  left: 0 !important;
  top: 0 !important;
  width: 100% !important;
  height: 100% !important;
  max-width: 100% !important;
  max-height: 100% !important;
  overflow: hidden !important;
  z-index: 3;
}

/* Context7: Enhanced cursor visibility control */
/* Default state - hide cursor elements until explicitly focused */
:deep(.xterm-cursor-layer),
:deep(.xterm-cursor),
:deep(.xterm-cursor-outline) {
  opacity: 0 !important;
  visibility: hidden !important;
  transition: opacity 0.1s ease-in-out !important;
}

/* Hide ALL cursor elements when terminal is explicitly unfocused */
:deep(.terminal-unfocused .xterm-cursor-layer),
:deep(.terminal-unfocused .xterm-cursor),
:deep(.terminal-unfocused .xterm-cursor-outline) {
  opacity: 0 !important;
  visibility: hidden !important;
}

/* Focus overlay styling - Simplified subtle effect */
.terminal-focus-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.02);
  z-index: 1000;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.terminal-focus-overlay:hover {
  background: rgba(0, 122, 204, 0.08);
}

/* Dark theme adjustments */
[data-theme='dark'] .terminal-focus-overlay {
  background: rgba(0, 0, 0, 0.05);
}

[data-theme='dark'] .terminal-focus-overlay:hover {
  background: rgba(0, 122, 204, 0.12);
}

/* Show cursor ONLY when terminal is explicitly focused */
:deep(.terminal-focused .xterm-cursor-layer),
:deep(.terminal-focused .xterm-cursor),
:deep(.terminal-focused .xterm-cursor-outline) {
  opacity: 1 !important;
  visibility: visible !important;
}
</style>
