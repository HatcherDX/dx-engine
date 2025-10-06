<template>
  <div class="terminal-demo">
    <header class="demo-header">
      <h1>🚀 Terminal System Lab - Electron + node-pty</h1>
      <div class="header-info">
        <span class="backend-info">Backend: {{ backendInfo }}</span>
        <span class="capability-info">{{ capabilityInfo }}</span>
      </div>
    </header>

    <div class="demo-controls">
      <button class="btn btn-primary" @click="createNewTerminal">
        New Terminal
      </button>
      <button class="btn" :disabled="!activeTerminal" @click="clearTerminal">
        Clear Terminal
      </button>
      <button
        class="btn"
        :disabled="!activeTerminal"
        @click="closeActiveTerminal"
      >
        Close Terminal
      </button>

      <!-- Zoom controls -->
      <div class="zoom-controls">
        <button
          class="btn btn-zoom"
          :disabled="currentZoom <= MIN_ZOOM"
          title="Zoom Out (Ctrl+-)"
          @click="zoomOut"
        >
          −
        </button>
        <span class="zoom-display">{{ currentZoom }}%</span>
        <button
          class="btn btn-zoom"
          :disabled="currentZoom >= MAX_ZOOM"
          title="Zoom In (Ctrl++)"
          @click="zoomIn"
        >
          +
        </button>
        <button class="btn" title="Reset Zoom (Ctrl+0)" @click="resetZoom">
          Reset
        </button>
      </div>

      <select
        v-model="selectedTheme"
        class="theme-selector"
        @change="applyTheme"
      >
        <option value="dark">Dark</option>
        <option value="light">Light</option>
        <option value="vscode">VSCode</option>
      </select>
    </div>

    <!-- Tab bar -->
    <div v-if="terminals.size > 0" class="terminal-tabs">
      <div
        v-for="[id, termInfo] in terminals"
        :key="id"
        :class="['terminal-tab', { active: activeTerminalId === id }]"
        @click="setActiveTerminal(id)"
      >
        <span>{{ termInfo.title }}</span>
        <button class="tab-close" @click.stop="closeTerminal(id)">×</button>
      </div>
    </div>

    <!-- Terminal containers -->
    <div class="terminal-container">
      <div
        v-for="[id] in terminals"
        :key="id"
        :ref="(el) => (terminalRefs[id] = el)"
        :class="['terminal-pane', { active: activeTerminalId === id }]"
      />
    </div>

    <div class="demo-status">
      <span>Active Terminals: {{ terminals.size }}</span>
      <span>Theme: {{ selectedTheme }}</span>
      <span v-if="activeTerminalId">Active: {{ activeTerminalId }}</span>
    </div>
  </div>
</template>

<script setup>
/* eslint-disable no-undef */
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { Terminal } from 'xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'

// Only import CSS in non-test environments
if (!import.meta.env.TEST && !import.meta.env.VITEST) {
  import('xterm/css/xterm.css')
}

// State
const selectedTheme = ref('dark')
const backendInfo = ref('Detecting...')
const capabilityInfo = ref('')
const activeTerminalId = ref(null)
const activeTerminal = ref(null)
const terminals = ref(new Map())
const terminalRefs = ref({})

// Zoom state
const currentZoom = ref(100)
const BASE_FONT_SIZE = 14
const MIN_ZOOM = 50
const MAX_ZOOM = 200
const ZOOM_STEP = 10

let terminalCounter = 0

// Themes
const themes = {
  dark: {
    background: '#1e1e1e',
    foreground: '#d4d4d4',
    cursor: '#f0f0f0',
    selectionBackground: 'rgba(255, 255, 255, 0.3)',
    black: '#000000',
    red: '#cd3131',
    green: '#0dbc79',
    yellow: '#e5e510',
    blue: '#2472c8',
    magenta: '#bc3fbc',
    cyan: '#11a8cd',
    white: '#e5e5e5',
  },
  light: {
    background: '#ffffff',
    foreground: '#333333',
    cursor: '#333333',
    selectionBackground: 'rgba(0, 0, 0, 0.1)',
    black: '#000000',
    red: '#cd3131',
    green: '#00bc00',
    yellow: '#949800',
    blue: '#0451a5',
    magenta: '#bc05bc',
    cyan: '#0598bc',
    white: '#555555',
  },
  vscode: {
    background: '#1e1e1e',
    foreground: '#cccccc',
    cursor: '#aeafad',
    selectionBackground: '#264f78',
    black: '#000000',
    red: '#f48771',
    green: '#89d185',
    yellow: '#e5c07b',
    blue: '#61afef',
    magenta: '#c678dd',
    cyan: '#56b6c2',
    white: '#d4d4d4',
  },
}

// Lifecycle
onMounted(async () => {
  await detectCapabilities()
  createNewTerminal()

  // Setup keyboard shortcuts for zoom
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  terminals.value.forEach((term) => {
    if (term.terminal) {
      term.terminal.dispose()
    }
  })
})

// Methods
async function detectCapabilities() {
  if (!window.terminalAPI) {
    backendInfo.value = 'Error: Electron API not available'
    capabilityInfo.value = 'This demo requires Electron. Run: pnpm electron:dev'
    console.error('Terminal API not available. This demo requires Electron.')
    return
  }

  try {
    const capabilities = await window.terminalAPI.getCapabilities()
    backendInfo.value = capabilities.backend

    const features = []
    if (capabilities.supportsResize) features.push('Resize')
    if (capabilities.supportsAnsi) features.push('ANSI')
    if (capabilities.supportsColor) features.push('Color')
    if (capabilities.supportsPty) features.push('PTY')

    capabilityInfo.value = `Features: ${features.join(', ')}`
  } catch (error) {
    console.error('Failed to detect capabilities:', error)
    backendInfo.value = 'Error detecting backend'
    capabilityInfo.value = error.message
  }
}

async function createNewTerminal() {
  if (!window.terminalAPI) {
    console.error('Cannot create terminal: Electron API not available')
    return
  }

  const id = `terminal-${++terminalCounter}`

  // Create xterm terminal with current zoom
  const fontSize = Math.round(BASE_FONT_SIZE * (currentZoom.value / 100))
  const terminal = new Terminal({
    theme: themes[selectedTheme.value],
    fontSize,
    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    cursorBlink: true,
    scrollback: 10000,
    convertEol: true, // Convert \n to \r\n
    allowProposedApi: true, // Enable proposed API features for better escape sequence handling
    cols: 80, // Set default dimensions
    rows: 24, // Match typical terminal size
  })

  // Add addons
  const fitAddon = new FitAddon()
  const webLinksAddon = new WebLinksAddon()
  terminal.loadAddon(fitAddon)
  terminal.loadAddon(webLinksAddon)

  // Store terminal info
  terminals.value.set(id, {
    terminal,
    fitAddon,
    title: `Terminal ${terminalCounter}`,
    id,
  })

  // Set as active
  activeTerminalId.value = id
  activeTerminal.value = terminal

  // Wait for DOM update then mount
  await nextTick()
  const element = terminalRefs.value[id]
  if (element) {
    terminal.open(element)
    fitAddon.fit()

    // Connect to Electron backend
    try {
      console.log(
        `[Frontend] Creating terminal with dimensions: ${terminal.cols}x${terminal.rows}`
      )
      await window.terminalAPI.create({
        id,
        cols: terminal.cols,
        rows: terminal.rows,
      })

      // Forward data
      terminal.onData((data) => {
        console.log(
          `[Frontend] Sending data to terminal ${id}:`,
          JSON.stringify(data).slice(0, 50)
        )
        window.terminalAPI.write(id, data)
      })

      // Listen for backend data
      const removeDataListener = window.terminalAPI.onData((payload) => {
        console.log(
          `[Frontend] Raw payload received:`,
          JSON.stringify(payload).slice(0, 200)
        )
        if (payload && payload.id === id) {
          const data = payload.data || ''
          // Show both raw and visible characters
          console.log(
            `[Frontend] Received data for terminal ${id}:`,
            data ? JSON.stringify(data).slice(0, 100) : '(empty)',
            'Length:',
            data.length
          )
          if (data) {
            terminal.write(data)
            console.log(
              `[Frontend] Data written to xterm, terminal buffer size:`,
              terminal.buffer.active.length
            )
          } else {
            console.warn(`[Frontend] No data to write`)
          }
        }
      })

      const removeExitListener = window.terminalAPI.onExit((payload) => {
        if (payload.id === id) {
          terminal.write(
            `\r\n[Process exited with code ${payload.exitCode}]\r\n`
          )
          closeTerminal(id)
        }
      })

      // Handle resize
      terminal.onResize(({ cols, rows }) => {
        window.terminalAPI.resize(id, cols, rows)
      })

      // Store cleanup functions
      terminals.value.get(id)._cleanup = () => {
        removeDataListener()
        removeExitListener()
      }
    } catch (error) {
      console.error('Failed to create backend terminal:', error)
      terminal.writeln('❌ Failed to connect to Electron backend')
      terminal.writeln(`Error: ${error.message}`)
    }

    terminal.focus()
  }
}

// Zoom functions
function zoomIn() {
  if (currentZoom.value < MAX_ZOOM) {
    currentZoom.value = Math.min(currentZoom.value + ZOOM_STEP, MAX_ZOOM)
    applyZoom()
  }
}

function zoomOut() {
  if (currentZoom.value > MIN_ZOOM) {
    currentZoom.value = Math.max(currentZoom.value - ZOOM_STEP, MIN_ZOOM)
    applyZoom()
  }
}

function resetZoom() {
  currentZoom.value = 100
  applyZoom()
}

function applyZoom() {
  const newFontSize = Math.round(BASE_FONT_SIZE * (currentZoom.value / 100))
  terminals.value.forEach((termInfo) => {
    termInfo.terminal.options.fontSize = newFontSize
    if (termInfo.fitAddon) {
      termInfo.fitAddon.fit()
    }
  })
}

function handleKeydown(e) {
  if (e.ctrlKey || e.metaKey) {
    if (e.key === '+' || e.key === '=') {
      e.preventDefault()
      zoomIn()
    } else if (e.key === '-' || e.key === '_') {
      e.preventDefault()
      zoomOut()
    } else if (e.key === '0') {
      e.preventDefault()
      resetZoom()
    }
  }
}

function setActiveTerminal(id) {
  activeTerminalId.value = id
  const termInfo = terminals.value.get(id)
  if (termInfo) {
    activeTerminal.value = termInfo.terminal
    termInfo.terminal.focus()
  }
}

function clearTerminal() {
  if (activeTerminal.value) {
    activeTerminal.value.clear()
  }
}

async function closeTerminal(id) {
  const termInfo = terminals.value.get(id)
  if (!termInfo) return

  // Cleanup backend if exists
  if (window.terminalAPI) {
    try {
      await window.terminalAPI.kill(id)
    } catch (error) {
      console.error('Failed to kill backend terminal:', error)
    }
  }

  // Cleanup listeners
  if (termInfo._cleanup) {
    termInfo._cleanup()
  }

  // Dispose terminal
  termInfo.terminal.dispose()
  terminals.value.delete(id)

  // Update active terminal
  if (activeTerminalId.value === id) {
    const remaining = Array.from(terminals.value.keys())
    activeTerminalId.value = remaining[0] || null
    activeTerminal.value = remaining[0]
      ? terminals.value.get(remaining[0]).terminal
      : null
  }
}

function closeActiveTerminal() {
  if (activeTerminalId.value) {
    closeTerminal(activeTerminalId.value)
  }
}

function applyTheme() {
  const theme = themes[selectedTheme.value]
  terminals.value.forEach((termInfo) => {
    termInfo.terminal.options.theme = theme
  })
}

// Handle window resize
window.addEventListener('resize', () => {
  terminals.value.forEach((termInfo) => {
    if (termInfo.fitAddon) {
      termInfo.fitAddon.fit()
    }
  })
})
</script>

<style>
/* Reset and base styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu,
    sans-serif;
  background: #1e1e1e;
  color: #d4d4d4;
  overflow: hidden;
}

.terminal-demo {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.demo-header {
  background: #2d2d30;
  padding: 12px 20px;
  border-bottom: 1px solid #3e3e42;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.demo-header h1 {
  font-size: 18px;
  font-weight: 500;
  margin: 0;
}

.header-info {
  display: flex;
  gap: 20px;
  font-size: 13px;
  color: #969696;
}

.backend-info {
  color: #4ec9b0;
}

.capability-info {
  color: #9cdcfe;
}

.demo-controls {
  background: #252526;
  padding: 10px 20px;
  border-bottom: 1px solid #3e3e42;
  display: flex;
  gap: 10px;
  align-items: center;
}

.btn {
  padding: 6px 14px;
  background: #3c3c3c;
  color: #cccccc;
  border: 1px solid #464647;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.btn:hover:not(:disabled) {
  background: #464647;
  color: #ffffff;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #0e639c;
  border-color: #0e639c;
  color: white;
}

.btn-primary:hover {
  background: #1177bb;
  border-color: #1177bb;
}

.theme-selector {
  padding: 6px 10px;
  background: #3c3c3c;
  color: #cccccc;
  border: 1px solid #464647;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  margin-left: auto;
}

.zoom-controls {
  display: flex;
  gap: 5px;
  align-items: center;
  padding: 0 10px;
  border-left: 1px solid #3e3e42;
  margin-left: auto;
}

.zoom-display {
  min-width: 50px;
  text-align: center;
  font-size: 13px;
  color: #4ec9b0;
  font-weight: 500;
}

.btn-zoom {
  width: 32px;
  height: 32px;
  padding: 0;
  font-size: 18px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
}

.terminal-tabs {
  display: flex;
  background: #252526;
  border-bottom: 1px solid #3e3e42;
  overflow-x: auto;
}

.terminal-tab {
  padding: 8px 16px;
  background: transparent;
  border-right: 1px solid #3e3e42;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #969696;
  transition: all 0.2s;
}

.terminal-tab:hover {
  background: #2a2d2e;
  color: #cccccc;
}

.terminal-tab.active {
  background: #1e1e1e;
  color: #ffffff;
}

.tab-close {
  background: transparent;
  border: none;
  color: #969696;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tab-close:hover {
  color: #e74c3c;
}

.terminal-container {
  flex: 1;
  overflow: hidden;
  background: #1e1e1e;
  position: relative;
}

.terminal-pane {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: none;
}

.terminal-pane.active {
  display: block;
}

.demo-status {
  background: #007acc;
  color: white;
  padding: 6px 20px;
  font-size: 12px;
  display: flex;
  gap: 20px;
  align-items: center;
}
</style>
