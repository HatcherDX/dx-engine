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
    <TerminalTabBar
      :terminals="terminals"
      :system-terminals="systemTerminals"
      :active-terminal-id="activeTerminalId"
      @tab-click="setActiveTerminal"
      @tab-close="closeTerminal"
      @tab-context-menu="showTerminalContextMenu"
      @new-terminal="createTerminal"
    />
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

      <!-- Regular Terminal Views -->
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
        @data="(data) => sendTerminalInput(terminal.id, data)"
        @resize="(size) => resizeTerminal(terminal.id, size)"
        @ready="onTerminalReady(terminal.id)"
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
import TerminalTabBar from '../molecules/TerminalTabBar.vue'
import TerminalView from './TerminalView.vue'
import SystemTerminalView from './SystemTerminalView.vue'
import { useTerminalManager } from '../../composables/useTerminalManager'
import { useSystemTerminals } from '../../composables/useSystemTerminals'
import { useTheme } from '../../composables/useTheme'

/**
 * Terminal instance interface for component state management.
 *
 * @interface Terminal
 * @public
 * @since 1.0.0
 */
interface Terminal {
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
} = useSystemTerminals()

const terminalRefs = ref<Map<string, InstanceType<typeof TerminalView>>>(
  new Map()
)

// Regular terminals
const terminals = computed((): Terminal[] =>
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
const systemTerminals = computed((): Terminal[] => {
  const result: Terminal[] = []

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
      name: 'Timeline',
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

const showTerminalContextMenu = () => {
  // Context menu implementation placeholder
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
onMounted(() => {
  // System terminals should be initialized automatically
  // They will become available once initialized

  // Create initial terminal if none exist (regular terminals)
  if (terminals.value.length === 0) {
    createTerminal().then((terminal) => {
      // If a system terminal is already active, deactivate the new regular terminal
      if (activeSystemTerminal.value && terminal) {
        switchTerminal(null)
      }
    })
  }
})

onUnmounted(() => {
  // Cleanup terminal resources if needed
  terminalRefs.value.clear()
})

// Note: IPC listeners are handled by individual TerminalView components
// This avoids duplication and allows each terminal to handle its own data

// Expose functions for testing
defineExpose({
  getSystemTerminalActivityState,
  terminals,
  systemTerminals,
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
  height: calc(100% - 6px); /* Subtract resize handle height */
  min-height: 0; /* Allow flex item to shrink */
}
</style>
