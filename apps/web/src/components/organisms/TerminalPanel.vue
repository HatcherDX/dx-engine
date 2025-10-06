<!--
/**
 * @fileoverview TerminalPanel component for managing multiple terminal instances.
 * 
 * @description
 * A comprehensive terminal management interface that provides tab-based terminal switching,
 * terminal creation/closure, and integrated terminal views. Supports multiple concurrent
 * terminal sessions with individual theming and IPC communication with Electron backend.
 * 
 * @example
 * ```vue
 * <template>
 *   <TerminalPanel 
 *     @terminal-created="handleTerminalCreated"
 *     @terminal-closed="handleTerminalClosed"
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
  <div class="terminal-panel">
    <!-- Tab bar removed - now handled by GlobalTerminalFooter -->
    <div class="terminal-panel__content">
      <!-- System Terminal Views - Always rendered for initialization -->
      <SystemTerminalView
        v-show="
          activeSystemTerminal === 'system' ||
          activeSystemTerminal === 'timeline'
        "
        :active-terminal="activeSystemTerminal"
        @set-active-terminal="setActiveSystemTerminal"
      />

      <!-- Regular Terminal Views - Show when it's the active terminal and no system terminal is active -->
      <TerminalView
        v-for="terminal in terminals"
        v-show="terminal.id === activeTerminalId && !activeSystemTerminal"
        :key="terminal.id"
        :ref="
          (el: Element | ComponentPublicInstance | null) =>
            setTerminalRef(
              terminal.id,
              el as InstanceType<typeof TerminalView> | null
            )
        "
        :terminal-id="terminal.id"
        :theme="themeMode === 'auto' ? 'dark' : themeMode"
        @data="(terminalId, data) => sendTerminalInput(terminalId, data)"
        @resize="
          (terminalId, cols, rows) => resizeTerminal(terminalId, { cols, rows })
        "
        @ready="(terminalId) => onTerminalReady(terminalId)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * @fileoverview TerminalPanel component logic for terminal session management.
 *
 * @description
 * This script provides the reactive logic for managing multiple terminal instances,
 * handling tab switching, terminal creation/destruction, and IPC communication
 * with the Electron backend for terminal operations.
 */

import {
  ref,
  computed,
  watch,
  onMounted,
  onUnmounted,
  type ComponentPublicInstance,
} from 'vue'
import type { ReadOnlyTerminalLine } from '@hatcherdx/terminal-system'
import TerminalView from './TerminalView.vue'
import SystemTerminalView from './SystemTerminalView.vue'
import { useTerminalManager } from '../../composables/useTerminalManager'
import { useSystemTerminals } from '../../composables/useSystemTerminals'
import { useTheme } from '../../composables/useTheme'

// Define emits
const emit = defineEmits<{
  initialized: []
}>()

/**
 * Terminal tab data for component state management.
 *
 * @interface TerminalTabData
 * @private
 * @since 1.0.0
 */
interface TerminalTabData {
  /** Unique identifier for the terminal session */
  id: string
  /** Display name for the terminal tab */
  name: string
  /** Whether the terminal process is currently running */
  isRunning: boolean
  /** Whether this terminal is currently the active/focused one */
  isActive: boolean
  /** Terminal type for system terminals */
  terminalType?: 'system' | 'timeline' | 'regular'
  /** Activity state for system terminals */
  activityState?: 'info' | 'warning' | 'error' | 'idle'
  /** Whether terminal can be closed */
  closable?: boolean
}

const { themeMode } = useTheme()
const {
  terminals: terminalStates,
  activeTerminalId,
  createTerminal: createNewTerminal,
  closeTerminal: removeTerminal,
  setActiveTerminal: switchTerminal,
} = useTerminalManager()

// System terminals integration
const {
  systemTerminal,
  timelineTerminal,
  activeTerminal: activeSystemTerminal,
  setActiveTerminal: setActiveSystemTerminal,
  isInitialized: systemTerminalsInitialized,
  initializeTerminals,
} = useSystemTerminals()

const terminalRefs = ref<Map<string, InstanceType<typeof TerminalView>>>(
  new Map()
)

// Regular terminals
const terminals = computed((): TerminalTabData[] =>
  terminalStates.value.map((terminal) => ({
    id: terminal.id,
    name: terminal.name,
    isRunning: terminal.isRunning,
    isActive: terminal.isActive,
    terminalType: 'regular',
    closable: true,
  }))
)

// System terminals
const systemTerminals = computed((): TerminalTabData[] => {
  const result: TerminalTabData[] = []

  if (systemTerminal.isReady) {
    result.push({
      id: 'system',
      name: 'System',
      isRunning: true,
      isActive: activeSystemTerminal.value === 'system',
      terminalType: 'system',
      activityState: getSystemTerminalActivityState('system'),
      closable: false,
    })
  }

  if (timelineTerminal.isReady) {
    result.push({
      id: 'timeline',
      name: 'Timegraph',
      isRunning: true,
      isActive: activeSystemTerminal.value === 'timeline',
      terminalType: 'timeline',
      activityState: getSystemTerminalActivityState('timeline'),
      closable: false,
    })
  }

  return result
})

// Determine activity state based on recent terminal activity
const getSystemTerminalActivityState = (
  terminalType: 'system' | 'timeline'
): 'info' | 'warning' | 'error' | 'idle' => {
  const terminal = terminalType === 'system' ? systemTerminal : timelineTerminal

  if (!terminal.lines.length) return 'idle'

  // Get most recent line to determine activity state
  const recentLines = terminal.lines.slice(-5) // Check last 5 lines

  if (
    recentLines.some(
      (line: ReadOnlyTerminalLine) =>
        line.type === 'ERROR' || line.type === 'FATAL'
    )
  ) {
    return 'error'
  } else if (
    recentLines.some((line: ReadOnlyTerminalLine) => line.type === 'WARN')
  ) {
    return 'warning'
  } else if (
    recentLines.some(
      (line: ReadOnlyTerminalLine) =>
        line.type === 'CMD' || line.type === 'GIT' || line.type === 'INFO'
    )
  ) {
    return 'info'
  }

  return 'idle'
}

const setTerminalRef = (
  id: string,
  ref: InstanceType<typeof TerminalView> | null
) => {
  if (ref) {
    terminalRefs.value.set(id, ref)
  } else {
    terminalRefs.value.delete(id)
  }
}

const createTerminal = async (options?: { name?: string; cwd?: string }) => {
  try {
    const terminal = await createNewTerminal(options)
    return terminal
  } catch (error) {
    console.error('Failed to create terminal:', error)
    throw error
  }
}

const closeTerminal = async (id: string) => {
  await removeTerminal(id)
  terminalRefs.value.delete(id)
}

const setActiveTerminal = (id: string) => {
  // Check if it's a system terminal
  if (id === 'system' || id === 'timeline') {
    // First, deactivate all regular terminals
    switchTerminal(null)
    // Then activate the system terminal
    setActiveSystemTerminal(id as 'system' | 'timeline')
  } else {
    // It's a regular terminal
    // First, deactivate all system terminals
    setActiveSystemTerminal(null)
    // Then activate the regular terminal
    switchTerminal(id)
    // Focus the terminal when activated
    setTimeout(() => {
      const terminalRef = terminalRefs.value.get(id)
      if (terminalRef) {
        terminalRef.focus()
      }
    }, 100)
  }
}

const sendTerminalInput = (id: string, data: string) => {
  // Send via IPC to terminal backend
  if (window.electronAPI) {
    if (window.electronAPI.sendTerminalInput) {
      window.electronAPI.sendTerminalInput({ id, data })
    } else {
      window.electronAPI.send('terminal-input', { id, data })
    }
  }
}

const resizeTerminal = (id: string, size: { cols: number; rows: number }) => {
  // Send resize via IPC to terminal backend
  if (window.electronAPI) {
    if (window.electronAPI.sendTerminalResize) {
      window.electronAPI.sendTerminalResize({
        id,
        cols: size.cols,
        rows: size.rows,
      })
    } else {
      window.electronAPI.send('terminal-resize', {
        id,
        cols: size.cols,
        rows: size.rows,
      })
    }
  }
}

const onTerminalReady = (id: string) => {
  // Terminal is ready, can perform initial setup if needed
  void id
}

// Watch for system terminal activation to deactivate regular terminals
watch(
  () => activeSystemTerminal.value,
  (activeSystem) => {
    // If a system terminal becomes active, deactivate all regular terminals
    if (activeSystem && activeTerminalId.value) {
      switchTerminal(null)
    }
  }
)

// Watch for regular terminal activation to deactivate system terminals
watch(
  () => activeTerminalId.value,
  (activeRegular) => {
    // If a regular terminal becomes active, deactivate all system terminals
    if (activeRegular && activeSystemTerminal.value) {
      setActiveSystemTerminal(null)
    }
  }
)

// Lifecycle
onMounted(async () => {
  console.log('[TerminalPanel] Mounted - initializing terminal system')

  // Initialize system terminals first - this is critical for proper terminal functioning
  // The system terminals must be ready before creating regular terminals
  try {
    if (!systemTerminalsInitialized.value) {
      console.log(
        '[TerminalPanel] System terminals not initialized, initializing...'
      )
      await initializeTerminals()
      console.log('[TerminalPanel] System terminals initialized successfully')

      // Give system terminals a moment to fully establish
      // This ensures the IPC channels are ready
      await new Promise((resolve) => setTimeout(resolve, 100))
    } else {
      console.log('[TerminalPanel] System terminals already initialized')
    }
  } catch (error) {
    console.error(
      '[TerminalPanel] Failed to initialize system terminals:',
      error
    )
    // Continue anyway - regular terminals might still work
  }

  // Create initial terminal if none exist (regular terminals)
  if (terminals.value.length === 0) {
    console.log('[TerminalPanel] No terminals exist, creating initial terminal')
    try {
      const terminal = await createTerminal()
      console.log('[TerminalPanel] Initial terminal created:', terminal?.id)

      // Clear system terminal selection to show regular terminal
      if (terminal) {
        setActiveSystemTerminal(null)
        switchTerminal(terminal.id)
        console.log('[TerminalPanel] Activated regular terminal:', terminal.id)
      }
    } catch (error) {
      console.error('[TerminalPanel] Failed to create initial terminal:', error)
    }
  } else {
    console.log(
      '[TerminalPanel] Terminals already exist:',
      terminals.value.length
    )
  }

  // Emit initialization complete event
  emit('initialized')
})

onUnmounted(() => {
  // Cleanup terminal resources if needed
  terminalRefs.value.clear()
})

// Note: IPC listeners are handled by individual TerminalView components
// This avoids duplication and allows each terminal to handle its own data

// Expose functions for parent component
defineExpose({
  getSystemTerminalActivityState,
  terminals,
  systemTerminals,
  activeTerminalId,
  setActiveTerminal,
  closeTerminal,
  createTerminal,
})
</script>

<style scoped>
.terminal-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--bg-primary);
}

.terminal-panel__content {
  flex: 1;
  position: relative;
  overflow: hidden;
  height: 100%;
  min-height: 0; /* Allow flex item to shrink */
}
</style>
