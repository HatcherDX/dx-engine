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
      :active-terminal-id="activeTerminalId"
      @tab-click="setActiveTerminal"
      @tab-close="closeTerminal"
      @tab-context-menu="showTerminalContextMenu"
      @new-terminal="createTerminal"
      @split-terminal="splitTerminal"
    />
    <div class="terminal-panel__content">
      <TerminalView
        v-for="terminal in terminals"
        v-show="terminal.id === activeTerminalId"
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
      <div v-if="terminals.length === 0" class="terminal-panel__empty">
        <div class="terminal-panel__empty-content">
          <BaseIcon
            name="Terminal"
            size="xl"
            style="color: var(--text-tertiary)"
          />
          <h3
            style="
              font-size: 1.125rem;
              font-weight: 500;
              color: var(--text-secondary);
              margin: 1rem 0 0.5rem 0;
            "
          >
            No Terminal Open
          </h3>
          <p
            style="
              font-size: 0.875rem;
              color: var(--text-tertiary);
              margin-bottom: 1rem;
            "
          >
            Create a new terminal to get started
          </p>
          <BaseButton @click="() => createTerminal()">
            <span style="display: flex; align-items: center">
              <BaseIcon name="Plus" size="sm" />
              <span style="margin-left: 0.5rem">New Terminal</span>
            </span>
          </BaseButton>
        </div>
      </div>
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
  onMounted,
  onUnmounted,
  type ComponentPublicInstance,
} from 'vue'
import TerminalTabBar from '../molecules/TerminalTabBar.vue'
import TerminalView from './TerminalView.vue'
import BaseIcon from '../atoms/BaseIcon.vue'
import BaseButton from '../atoms/BaseButton.vue'
import { useTerminalManager } from '../../composables/useTerminalManager'
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
}

const { themeMode } = useTheme()
const {
  terminals: terminalStates,
  activeTerminalId,
  createTerminal: createNewTerminal,
  closeTerminal: removeTerminal,
  setActiveTerminal: switchTerminal,
} = useTerminalManager()

const terminalRefs = ref<Map<string, InstanceType<typeof TerminalView>>>(
  new Map()
)

const terminals = computed((): Terminal[] =>
  terminalStates.value.map((terminal) => ({
    id: terminal.id,
    name: terminal.name,
    isRunning: terminal.isRunning,
    isActive: terminal.isActive,
  }))
)

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
  switchTerminal(id)
  // Focus the terminal when activated
  setTimeout(() => {
    const terminalRef = terminalRefs.value.get(id)
    if (terminalRef) {
      terminalRef.focus()
    }
  }, 100)
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

const splitTerminal = async () => {
  if (!activeTerminalId.value) return

  // Create new terminal with same CWD as active terminal
  await createTerminal({
    name: `Terminal ${terminals.value.length + 1}`,
  })
}

const showTerminalContextMenu = () => {
  // Context menu implementation placeholder
}

// Lifecycle
onMounted(() => {
  // Create initial terminal if none exist
  if (terminals.value.length === 0) {
    createTerminal()
  }
})

onUnmounted(() => {
  // Cleanup terminal resources if needed
  terminalRefs.value.clear()
})

// Note: IPC listeners are handled by individual TerminalView components
// This avoids duplication and allows each terminal to handle its own data
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

.terminal-panel__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.terminal-panel__empty-content {
  text-align: center;
}
</style>
