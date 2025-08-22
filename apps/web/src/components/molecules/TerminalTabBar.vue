<template>
  <div class="terminal-tab-bar">
    <div class="terminal-tab-bar__tabs">
      <!-- System terminals come first -->
      <TerminalTab
        v-for="terminal in systemTerminals"
        :key="`system-${terminal.id}`"
        :name="terminal.name"
        :active="terminal.id === activeTerminalId"
        :running="terminal.isRunning"
        :terminal-type="terminal.terminalType"
        :activity-state="terminal.activityState"
        :closable="terminal.closable ?? false"
        @click="$emit('tabClick', terminal.id)"
        @close="$emit('tabClose', terminal.id)"
        @contextmenu="$emit('tabContextMenu', terminal.id, $event)"
      />

      <!-- Separator between system and regular terminals -->
      <div
        v-if="
          systemTerminals && systemTerminals.length > 0 && terminals.length > 0
        "
        class="terminal-tab-bar__separator"
      />

      <!-- Regular terminals -->
      <TerminalTab
        v-for="terminal in terminals"
        :key="terminal.id"
        :name="terminal.name"
        :active="terminal.id === activeTerminalId"
        :running="terminal.isRunning"
        :terminal-type="terminal.terminalType ?? 'regular'"
        :activity-state="terminal.activityState"
        :closable="terminal.closable ?? true"
        @click="$emit('tabClick', terminal.id)"
        @close="$emit('tabClose', terminal.id)"
        @contextmenu="$emit('tabContextMenu', terminal.id, $event)"
      />
    </div>
    <div class="terminal-tab-bar__actions">
      <BaseButton
        variant="ghost"
        size="sm"
        title="New Terminal"
        @click="handleNewTerminal"
      >
        <BaseIcon name="Plus" size="sm" />
      </BaseButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import TerminalTab from '../atoms/TerminalTab.vue'
import BaseButton from '../atoms/BaseButton.vue'
import BaseIcon from '../atoms/BaseIcon.vue'

interface Terminal {
  id: string
  name: string
  isRunning: boolean
  terminalType?: 'system' | 'timeline' | 'regular'
  activityState?: 'info' | 'warning' | 'error' | 'idle'
  closable?: boolean
}

interface Props {
  terminals: Terminal[]
  systemTerminals?: Terminal[]
  activeTerminalId?: string
}

interface Emits {
  tabClick: [string]
  tabClose: [string]
  tabContextMenu: [string, MouseEvent]
  newTerminal: []
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const handleNewTerminal = () => {
  emit('newTerminal')
}
</script>

<style scoped>
.terminal-tab-bar {
  display: flex;
  justify-content: space-between;
  background-color: var(--bg-secondary);
}

.terminal-tab-bar__tabs {
  display: flex;
  overflow-x: auto;
  scrollbar-width: none;
  flex: 1;
}

.terminal-tab-bar__separator {
  width: 1px;
  height: 1.5rem;
  background-color: var(--border-primary);
  margin: 0.5rem 0.25rem;
}

.terminal-tab-bar__tabs::-webkit-scrollbar {
  display: none;
}

.terminal-tab-bar__actions {
  display: flex;
  align-items: center;
  padding: 0 0.5rem;
}

.terminal-tab-bar__actions > * + * {
  margin-left: 0.25rem;
}
</style>
