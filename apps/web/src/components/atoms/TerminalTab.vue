<template>
  <button
    :class="tabClass"
    @click="$emit('click')"
    @contextmenu.prevent="$emit('contextmenu', $event)"
  >
    <span class="terminal-tab__name">{{ name }}</span>
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
})

defineEmits<Emits>()

const tabClass = computed(() => [
  'terminal-tab',
  {
    'terminal-tab--active': props.active,
    'terminal-tab--inactive': !props.active,
    'terminal-tab--running': props.running,
    'terminal-tab--stopped': !props.running,
  },
])
</script>

<style scoped>
.terminal-tab {
  display: flex;
  align-items: center;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all var(--transition-fast);
  border-bottom: 2px solid transparent;
  background-color: var(--bg-tertiary);
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
  background-color: var(--bg-tertiary);
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

.terminal-tab--running .terminal-tab__name::before {
  content: '';
  display: inline-block;
  width: 0.5rem;
  height: 0.5rem;
  background-color: #22c55e;
  border-radius: 50%;
  margin-right: 0.5rem;
}

.terminal-tab--stopped .terminal-tab__name::before {
  content: '';
  display: inline-block;
  width: 0.5rem;
  height: 0.5rem;
  background-color: var(--text-tertiary);
  border-radius: 50%;
  margin-right: 0.5rem;
}
</style>
