<template>
  <div class="address-bar" :class="addressBarClasses">
    <!-- Adaptive Breadcrumb (hidden in generative mode) -->
    <div v-if="currentMode !== 'generative'" class="address-breadcrumb">
      <AdaptiveBreadcrumb
        :current-mode="currentMode"
        v-bind="breadcrumbContext"
      />
    </div>

    <!-- Input field -->
    <input
      ref="inputRef"
      v-model="inputValue"
      :placeholder="modeConfig.placeholder"
      :class="inputClasses"
      @keydown="handleKeydown"
      @focus="handleFocus"
      @blur="handleBlur"
    />

    <!-- Command suggestions dropdown -->
    <div v-if="showCommandSuggestions" class="command-suggestions">
      <div
        v-for="(command, index) in filteredCommands"
        :key="command.name"
        :class="[
          'command-suggestion',
          { selected: index === selectedCommandIndex },
        ]"
        @click="selectCommand(command)"
        @mouseenter="selectedCommandIndex = index"
      >
        <span class="command-name">/{{ command.name }}</span>
        <span class="command-description">{{ command.description }}</span>
      </div>
      <div v-if="filteredCommands.length === 0" class="no-commands">
        No commands found
      </div>
    </div>

    <!-- Action buttons -->
    <div class="address-actions">
      <BaseButton
        v-if="showClearButton"
        variant="ghost"
        size="sm"
        aria-label="Clear input"
        @click="clearInput"
      >
        <BaseIcon name="X" size="xs" />
      </BaseButton>

      <BaseButton
        variant="ghost"
        size="sm"
        :disabled="!canExecute"
        aria-label="Execute command"
        @click="executeCommand"
      >
        <BaseIcon name="ArrowRight" size="sm" />
      </BaseButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, nextTick, onMounted } from 'vue'
import type { ModeType } from './ModeSelector.vue'
import BaseIcon from '../atoms/BaseIcon.vue'
import BaseButton from '../atoms/BaseButton.vue'
import AdaptiveBreadcrumb from './AdaptiveBreadcrumb.vue'

interface Command {
  name: string
  description: string
  category: string
}

interface Props {
  currentMode: ModeType
  value?: string
  disabled?: boolean
  breadcrumbContext?: Record<string, unknown>
}

interface Emits {
  execute: [command: string, mode: ModeType]
  'update:value': [value: string]
  change: [value: string]
  enter: [value: string]
}

const props = withDefaults(defineProps<Props>(), {
  value: '',
  disabled: false,
  breadcrumbContext: () => ({}),
})

const emit = defineEmits<Emits>()

const inputRef = ref<HTMLInputElement | null>(null)
const isFocused = ref(false)
const availableCommands = ref<Command[]>([])
const selectedCommandIndex = ref(0)

const inputValue = computed({
  get: () => props.value,
  set: (value) => emit('update:value', value),
})

// Check if input starts with / (command mode)
const isCommandMode = computed(() => {
  return props.currentMode === 'generative' && inputValue.value.startsWith('/')
})

// Filter commands based on input
const filteredCommands = computed(() => {
  if (!isCommandMode.value) return []

  const query = inputValue.value.slice(1).toLowerCase() // Remove leading /
  if (query === '') return availableCommands.value

  return availableCommands.value.filter(
    (cmd) =>
      cmd.name.toLowerCase().includes(query) ||
      cmd.description.toLowerCase().includes(query)
  )
})

// Show command suggestions
const showCommandSuggestions = computed(() => {
  return (
    isCommandMode.value && isFocused.value && filteredCommands.value.length > 0
  )
})

// Load commands from Electron API
onMounted(async () => {
  if (window.electronAPI?.commands) {
    try {
      availableCommands.value = await window.electronAPI.commands.list()
    } catch (error) {
      console.error('[AddressBar] Failed to load commands:', error)
    }
  }
})

// Mode-specific configuration
const modeConfigs = {
  generative: {
    icon: 'Terminal',
    prefix: '$',
    placeholder: 'Enter command...',
  },
  visual: {
    icon: 'Eye',
    prefix: '→',
    placeholder: 'Describe what you want to do...',
  },
  code: {
    icon: 'Code',
    prefix: ':',
    placeholder: 'Search files, functions, or write code...',
  },
  timeline: {
    icon: 'Timeline',
    prefix: '📅',
    placeholder: 'Search timeline events or project history...',
  },
}

const modeConfig = computed(
  () =>
    modeConfigs[props.currentMode] || {
      icon: 'Terminal',
      prefix: '$',
      placeholder: 'Enter command...',
    }
)

const showClearButton = computed(() => {
  return inputValue.value.length > 0 && isFocused.value
})

const canExecute = computed(() => {
  return inputValue.value.trim().length > 0 && !props.disabled
})

const addressBarClasses = computed(() => {
  const base = ['address-bar']

  if (isFocused.value) {
    base.push('address-focused')
  }

  if (props.disabled) {
    base.push('address-disabled')
  }

  return base
})

const inputClasses = computed(() => {
  return ['address-input']
})

const handleKeydown = (event: KeyboardEvent) => {
  // Handle command suggestion navigation
  if (showCommandSuggestions.value) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      selectedCommandIndex.value = Math.min(
        selectedCommandIndex.value + 1,
        filteredCommands.value.length - 1
      )
      return
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      selectedCommandIndex.value = Math.max(selectedCommandIndex.value - 1, 0)
      return
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const command = filteredCommands.value[selectedCommandIndex.value]
      if (command) {
        selectCommand(command)
      }
      return
    } else if (event.key === 'Tab') {
      event.preventDefault()
      const command = filteredCommands.value[selectedCommandIndex.value]
      if (command) {
        inputValue.value = `/${command.name}`
      }
      return
    }
  }

  // Normal key handling
  if (event.key === 'Enter') {
    emit('enter', inputValue.value)
    if (canExecute.value) {
      executeCommand()
    }
  } else if (event.key === 'Escape') {
    inputRef.value?.blur()
  }
}

const selectCommand = async (command: Command) => {
  if (!window.electronAPI?.commands) {
    console.warn('[AddressBar] Commands API not available')
    return
  }

  try {
    console.log('[AddressBar] Executing command:', command.name)
    const result = await window.electronAPI.commands.execute(command.name)

    if (result.success) {
      console.log('[AddressBar] Command executed successfully:', result)
      // Clear input after successful execution
      inputValue.value = ''

      // Notify parent to handle command result
      if (result.data?.action) {
        emit('execute', result.data.action as string, props.currentMode)
      }
    } else {
      console.error('[AddressBar] Command execution failed:', result.message)
    }
  } catch (error) {
    console.error('[AddressBar] Failed to execute command:', error)
  }
}

const handleFocus = () => {
  isFocused.value = true
}

const handleBlur = () => {
  isFocused.value = false
  emit('change', inputValue.value)
}

const clearInput = () => {
  inputValue.value = ''
  nextTick(() => {
    inputRef.value?.focus()
  })
}

const executeCommand = () => {
  if (canExecute.value) {
    emit('execute', inputValue.value.trim(), props.currentMode)
  }
}

// Public methods
defineExpose({
  focus: () => inputRef.value?.focus(),
  blur: () => inputRef.value?.blur(),
  clear: clearInput,
})
</script>

<style scoped>
.address-bar {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 6px;
  width: 100%;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  transition: all 200ms ease;
}

.address-focused {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.2);
}

.address-disabled {
  opacity: 0.5;
  cursor: default;
}

.address-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: 14px;
  color: var(--text-primary);
}

.address-input::placeholder {
  color: var(--text-tertiary);
}

.address-breadcrumb {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  min-width: 0;
  max-width: 50%;
}

.address-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.address-actions button {
  border-radius: 0 !important;
  transition: background-color var(--transition-fast) !important;
}

.address-actions button:hover {
  background-color: var(--hover-bg-light) !important;
}

.dark .address-actions button:hover {
  background-color: var(--hover-bg-dark) !important;
}

/* Command suggestions dropdown */
.command-suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 8px;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-height: 300px;
  overflow-y: auto;
  z-index: 1000;
}

.command-suggestion {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  border-left: 3px solid transparent;
  transition: all 0.15s ease;
}

.command-suggestion:hover,
.command-suggestion.selected {
  background-color: var(--bg-secondary);
  border-left-color: var(--accent-color);
}

.command-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-right: 12px;
}

.command-description {
  font-size: 12px;
  color: var(--text-secondary);
  flex: 1;
}

.no-commands {
  padding: 24px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 14px;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .address-bar {
    min-width: 200px;
  }
}

@media (max-width: 480px) {
  .address-bar {
    min-width: 150px;
  }
}
</style>
