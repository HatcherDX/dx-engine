<template>
  <div class="mode-selector">
    <button
      v-for="mode in modes"
      :key="mode.key"
      :class="getModeClasses(mode.key)"
      :aria-label="`Switch to ${mode.label} mode`"
      @click="selectMode(mode.key)"
    >
      <BaseIcon :name="mode.icon" size="sm" class="mode-icon" />
      <span class="mode-label">{{ mode.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import BaseIcon from '../atoms/BaseIcon.vue'

export type ModeType = 'generative' | 'visual' | 'code' | 'timeline'

interface Mode {
  key: ModeType
  label: string
  icon: string
  description: string
}

interface Props {
  currentMode: ModeType
}

interface Emits {
  'mode-change': [mode: ModeType]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const modes: Mode[] = [
  {
    key: 'generative',
    label: 'Deck',
    icon: 'Terminal',
    description: 'Decklog HAT - Command center with immutable audit trail',
  },
  {
    key: 'visual',
    label: 'Visual',
    icon: 'Eye',
    description: 'Direct manipulation interface',
  },
  {
    key: 'code',
    label: 'Code',
    icon: 'Code',
    description: 'Integrated code editor',
  },
  {
    key: 'timeline',
    label: 'Timegraph',
    icon: 'Timeline',
    description: 'Project timeline and history',
  },
]

const selectMode = (mode: ModeType) => {
  emit('mode-change', mode)
}

const getModeClasses = (mode: ModeType) => {
  const base = ['mode-button']

  if (mode === props.currentMode) {
    base.push('active')
  }

  return base
}
</script>

<style scoped>
.mode-selector {
  display: flex;
  align-items: stretch;
  height: 100%;
}

.mode-button {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0px;
  padding: 10px 16px;
  margin-top: -1px;
  border: none;
  background: transparent;
  cursor: pointer;
  outline: none;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  opacity: 0.7; /* Reduced opacity for inactive buttons */
  transition: all var(--transition-fast);
  /* Disable drag for interactive buttons */
  -webkit-app-region: no-drag;
  /* Make buttons span full height */
  height: 100%;
  border-radius: 0; /* No rounded corners */
}

.mode-button:hover {
  color: var(--text-primary);
  background-color: var(--hover-bg-light);
  opacity: 1; /* Full opacity on hover */
}

.dark .mode-button:hover {
  background-color: var(--hover-bg-dark);
}

.mode-button.active {
  background-color: var(--accent-primary);
  color: var(--text-on-accent);
  opacity: 1; /* Active button always has full opacity */
  /* Full height illuminated section effect */
  position: relative;
}

.mode-button.active::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: var(--accent-primary);
  z-index: -1;
  border-radius: 0; /* No rounded corners */
}

.mode-button.active:hover {
  background-color: var(--accent-primary-hover);
}

.mode-button.active:hover::before {
  background-color: var(--accent-primary-hover);
}

.mode-button:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: -2px;
}

.mode-icon {
  margin-right: 6px;
}

.mode-label {
  white-space: nowrap;
  position: relative;
  z-index: 1;
}

/* Hide labels on very small screens */
@media (max-width: 380px) {
  .mode-label {
    display: none;
  }

  .mode-button {
    padding: 12px 8px;
  }
}
</style>
