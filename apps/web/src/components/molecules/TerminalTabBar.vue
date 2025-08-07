<template>
  <div class="terminal-tab-bar">
    <div class="terminal-tab-bar__tabs">
      <TerminalTab
        v-for="terminal in terminals"
        :key="terminal.id"
        :name="terminal.name"
        :active="terminal.id === activeTerminalId"
        :running="terminal.isRunning"
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
      <BaseButton
        variant="ghost"
        size="sm"
        title="Split Terminal"
        :disabled="!activeTerminalId"
        @click="$emit('splitTerminal')"
      >
        <BaseIcon name="Split" size="sm" />
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
}

interface Props {
  terminals: Terminal[]
  activeTerminalId?: string
}

interface Emits {
  tabClick: [string]
  tabClose: [string]
  tabContextMenu: [string, MouseEvent]
  newTerminal: []
  splitTerminal: []
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
  align-items: center;
  justify-content: space-between;
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-primary);
  min-height: 3rem;
}

.terminal-tab-bar__tabs {
  display: flex;
  align-items: center;
  overflow-x: auto;
  scrollbar-width: none;
  flex: 1;
}

.terminal-tab-bar__tabs::-webkit-scrollbar {
  display: none;
}

.terminal-tab-bar__actions {
  display: flex;
  align-items: center;
  padding: 0 0.5rem;
  border-left: 1px solid var(--border-primary);
}

.terminal-tab-bar__actions > * + * {
  margin-left: 0.25rem;
}
</style>
