<template>
  <button
    :class="tabClass"
    @click="$emit('click')"
    @contextmenu.prevent="$emit('contextmenu', $event)"
  >
    <!-- Terminal icon - unified for all terminals -->
    <BaseIcon :name="terminalIcon" size="xs" :class="terminalIconClass" />
    <span class="terminal-tab__name">
      {{ name }}
    </span>
    <button
      v-if="closable"
      class="terminal-tab__close"
      @click.stop="$emit('close')"
    >
      <BaseIcon name="X" size="xs" />
    </button>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseIcon from './BaseIcon.vue'

interface Props {
  name: string
  active?: boolean
  closable?: boolean
  running?: boolean
  /** Terminal type for system terminals (system, timeline, or undefined for regular terminals) */
  terminalType?: 'system' | 'timeline' | 'regular'
  /** Activity state for system terminals (info, warning, error, idle) */
  activityState?: 'info' | 'warning' | 'error' | 'idle'
}

interface Emits {
  click: []
  close: []
  contextmenu: [MouseEvent]
}

const props = withDefaults(defineProps<Props>(), {
  active: false,
  closable: true,
  running: true,
  terminalType: 'regular',
  activityState: 'idle',
})

defineEmits<Emits>()

const isSystemTerminal = computed(
  () => props.terminalType === 'system' || props.terminalType === 'timeline'
)

const terminalIcon = computed(() => {
  if (props.terminalType === 'system') {
    return 'Settings' // System/cog icon for System terminal
  } else if (props.terminalType === 'timeline') {
    return 'GitBranch' // Git branch icon for Timeline terminal
  }
  return 'Terminal' // Terminal icon for regular terminals
})

const terminalIconClass = computed(() => [
  'terminal-tab__icon',
  {
    // For system terminals, use activity state colors
    'terminal-tab__icon--info':
      isSystemTerminal.value && props.activityState === 'info',
    'terminal-tab__icon--warning':
      isSystemTerminal.value && props.activityState === 'warning',
    'terminal-tab__icon--error':
      isSystemTerminal.value && props.activityState === 'error',
    'terminal-tab__icon--idle':
      isSystemTerminal.value && props.activityState === 'idle',
    // For regular terminals, use running state colors
    'terminal-tab__icon--running': !isSystemTerminal.value && props.running,
    'terminal-tab__icon--stopped': !isSystemTerminal.value && !props.running,
  },
])

const tabClass = computed(() => [
  'terminal-tab',
  {
    'terminal-tab--active': props.active,
    'terminal-tab--inactive': !props.active,
    'terminal-tab--running': props.running,
    'terminal-tab--stopped': !props.running,
    'terminal-tab--system': isSystemTerminal.value,
  },
])
</script>

<style scoped>
.terminal-tab {
  display: flex;
  align-items: center;
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all var(--transition-fast);
  border-bottom: 2px solid transparent;
  color: var(--text-secondary);
}

.terminal-tab:hover {
  background-color: var(--hover-bg-light);
}

.terminal-tab > * + * {
  margin-left: 0.5rem;
}

.terminal-tab--active {
  background-color: var(--bg-primary);
  border-bottom-color: var(--accent-primary);
  color: var(--text-primary);
}

.terminal-tab--inactive {
  color: var(--text-secondary);
}

.terminal-tab--stopped {
  opacity: 0.6;
}

.terminal-tab__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 8rem;
}

.terminal-tab__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1rem;
  height: 1rem;
  border-radius: 2px;
  opacity: 0;
  transition: all var(--transition-fast);
}

.terminal-tab__close:hover {
  background-color: var(--border-primary);
}

.terminal-tab:hover .terminal-tab__close {
  opacity: 1;
}

/* Regular terminal icon colors - unified with system terminals */
.terminal-tab__icon--running {
  color: #22c55e; /* Green for running - standardized */
}

.terminal-tab__icon--stopped {
  color: var(--text-tertiary); /* Gray for stopped */
}

/* System terminal specific styles */
.terminal-tab--system {
  background-color: var(--bg-secondary);
}

.terminal-tab--system.terminal-tab--active {
  background-color: var(--bg-primary);
  border-bottom-color: var(--accent-secondary);
}

.terminal-tab__icon {
  margin-right: 0.5rem;
  transition: color var(--transition-fast);
}

/* Activity state colors for system terminal icons */
.terminal-tab__icon--idle {
  color: var(--text-tertiary);
}

.terminal-tab__icon--info {
  color: #22c55e; /* Green for info - standardized with regular terminals */
}

.terminal-tab__icon--warning {
  color: #f59e0b; /* Amber for warning */
}

.terminal-tab__icon--error {
  color: #ef4444; /* Red for error */
}

/* System terminals are not closable by default */
.terminal-tab--system .terminal-tab__close {
  display: none;
}
</style>
