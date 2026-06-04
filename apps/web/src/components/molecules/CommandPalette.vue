<!--
/**
 * @fileoverview Command palette component for executing commands.
 *
 * @description
 * VS Code-style command palette with search, keyboard navigation,
 * and command execution. Provides quick access to system commands
 * like model switching, metrics viewing, and session management.
 *
 * @example
 * <CommandPalette
 *   :visible="showPalette"
 *   @close="showPalette = false"
 *   @execute="handleCommand"
 * />
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */
-->

<template>
  <div
    v-if="visible"
    class="command-palette-overlay"
    @click="handleOverlayClick"
  >
    <div class="command-palette" @click.stop>
      <!-- Search Input -->
      <div class="search-section">
        <input
          ref="searchInputRef"
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="Type a command..."
          @keydown.up.prevent="selectPrevious"
          @keydown.down.prevent="selectNext"
          @keydown.enter.prevent="executeSelected"
          @keydown.escape="$emit('close')"
        />
      </div>

      <!-- Command List -->
      <div class="commands-list">
        <div
          v-for="(command, index) in filteredCommands"
          :key="command.name"
          :class="['command-item', { selected: index === selectedIndex }]"
          @click="executeCommand(command.name)"
          @mouseenter="selectedIndex = index"
        >
          <div class="command-info">
            <span class="command-name">{{ command.name }}</span>
            <span class="command-description">{{ command.description }}</span>
          </div>
          <span class="command-category">{{ command.category }}</span>
        </div>

        <!-- Empty State -->
        <div v-if="filteredCommands.length === 0" class="empty-state">
          No commands found for "{{ searchQuery }}"
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import type { Command } from '@hatcherdx/ai-cli'

/**
 * Component props.
 *
 * @public
 */
interface Props {
  /**
   * Controls visibility of the command palette.
   * @defaultValue false
   */
  visible: boolean

  /**
   * List of available commands.
   * @defaultValue []
   */
  commands?: Command[]
}

/**
 * Component emits.
 *
 * @public
 */
interface Emits {
  /**
   * Emitted when the palette should close.
   */
  (event: 'close'): void

  /**
   * Emitted when a command is executed.
   *
   * @param event - Event name
   * @param commandName - Name of the executed command
   */
  (event: 'execute', commandName: string): void
}

const props = withDefaults(defineProps<Props>(), {
  commands: () => [],
})

const emit = defineEmits<Emits>()

// Reactive state
const searchQuery = ref('')
const selectedIndex = ref(0)
const searchInputRef = ref<HTMLInputElement | null>(null)

/**
 * Filter commands based on search query.
 *
 * @returns Filtered array of commands
 *
 * @remarks
 * Searches both command name and description for matches.
 * Case-insensitive search.
 *
 * @public
 */
const filteredCommands = computed<Command[]>(() => {
  if (!searchQuery.value) {
    return props.commands
  }

  const query = searchQuery.value.toLowerCase()
  return props.commands.filter(
    (cmd) =>
      cmd.name.toLowerCase().includes(query) ||
      cmd.description.toLowerCase().includes(query)
  )
})

/**
 * Select the previous command in the list.
 *
 * @remarks
 * Wraps to the end of the list if at the beginning.
 *
 * @public
 */
function selectPrevious(): void {
  if (filteredCommands.value.length === 0) return

  selectedIndex.value =
    selectedIndex.value > 0
      ? selectedIndex.value - 1
      : filteredCommands.value.length - 1
}

/**
 * Select the next command in the list.
 *
 * @remarks
 * Wraps to the beginning of the list if at the end.
 *
 * @public
 */
function selectNext(): void {
  if (filteredCommands.value.length === 0) return

  selectedIndex.value =
    selectedIndex.value < filteredCommands.value.length - 1
      ? selectedIndex.value + 1
      : 0
}

/**
 * Execute the currently selected command.
 *
 * @remarks
 * Does nothing if no commands are available.
 *
 * @public
 */
function executeSelected(): void {
  if (filteredCommands.value.length === 0) return

  const command = filteredCommands.value[selectedIndex.value]
  executeCommand(command.name)
}

/**
 * Execute a command by name.
 *
 * @param commandName - Name of the command to execute
 *
 * @public
 */
function executeCommand(commandName: string): void {
  emit('execute', commandName)
  emit('close')
}

/**
 * Handle clicks on the overlay background.
 *
 * @remarks
 * Closes the palette when clicking outside the command list.
 *
 * @public
 */
function handleOverlayClick(): void {
  emit('close')
}

/**
 * Watch for visibility changes to focus input and reset state.
 *
 * @remarks
 * Auto-focuses search input when palette becomes visible.
 * Resets search query and selection when opening.
 *
 * @public
 */
watch(
  () => props.visible,
  (newVisible) => {
    if (newVisible) {
      searchQuery.value = ''
      selectedIndex.value = 0
      nextTick(() => {
        searchInputRef.value?.focus()
      })
    }
  }
)

/**
 * Reset selection when search results change.
 *
 * @remarks
 * Ensures selected index stays within bounds when filtering.
 *
 * @public
 */
watch(filteredCommands, () => {
  if (selectedIndex.value >= filteredCommands.value.length) {
    selectedIndex.value = Math.max(0, filteredCommands.value.length - 1)
  }
})
</script>

<style scoped>
/**
 * Overlay backdrop
 */
.command-palette-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  padding-top: 10vh;
  z-index: 9999;
}

/**
 * Command palette container
 */
.command-palette {
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  width: 600px;
  max-width: 90vw;
  max-height: 500px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

/**
 * Search section
 */
.search-section {
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
}

.search-input {
  width: 100%;
  padding: 12px;
  font-size: 16px;
  border: none;
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  border-radius: 4px;
  outline: none;
}

.search-input::placeholder {
  color: var(--text-secondary);
}

/**
 * Commands list
 */
.commands-list {
  overflow-y: auto;
  max-height: 400px;
}

/**
 * Individual command item
 */
.command-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  border-left: 3px solid transparent;
  transition: all 0.15s ease;
}

.command-item:hover,
.command-item.selected {
  background-color: var(--bg-secondary);
  border-left-color: var(--accent-color);
}

.command-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.command-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.command-description {
  font-size: 12px;
  color: var(--text-secondary);
}

.command-category {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-secondary);
  background-color: var(--bg-tertiary);
  padding: 2px 8px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/**
 * Empty state
 */
.empty-state {
  padding: 40px 16px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 14px;
}
</style>
