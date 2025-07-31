<template>
  <div class="address-bar" :class="addressBarClasses">
    <!-- Adaptive Breadcrumb -->
    <div class="address-breadcrumb">
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
import { computed, ref, nextTick } from 'vue'
import type { ModeType } from './ModeSelector.vue'
import BaseIcon from '../atoms/BaseIcon.vue'
import BaseButton from '../atoms/BaseButton.vue'
import AdaptiveBreadcrumb from './AdaptiveBreadcrumb.vue'

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

const inputValue = computed({
  get: () => props.value,
  set: (value) => emit('update:value', value),
})

// Mode-specific configuration
const modeConfigs = {
  generative: {
    icon: 'Terminal',
    prefix: '$',
    placeholder: 'Ask AI or enter command...',
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
  if (event.key === 'Enter') {
    emit('enter', inputValue.value)
    if (canExecute.value) {
      executeCommand()
    }
  } else if (event.key === 'Escape') {
    inputRef.value?.blur()
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
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 6px;
  max-width: 100%;
  min-width: 300px;
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
  cursor: not-allowed;
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

  .address-prefix {
    gap: 4px;
  }
}
</style>
