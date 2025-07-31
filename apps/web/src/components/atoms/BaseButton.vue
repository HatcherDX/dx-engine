<template>
  <button :class="buttonClasses" :disabled="disabled" @click="handleClick">
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  fullWidth?: boolean
}

interface Emits {
  click: [event: MouseEvent]
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  disabled: false,
  fullWidth: false,
})

const emit = defineEmits<Emits>()

const buttonClasses = computed(() => {
  const base = [
    'inline-flex',
    'items-center',
    'justify-center',
    'font-medium',
    'transition-all',
    'duration-200',
    'focus:outline-none',
    'focus:ring-2',
    'focus:ring-offset-2',
    'disabled:opacity-50',
    'disabled:cursor-not-allowed',
    'disabled:pointer-events-none',
  ]

  // Size variants
  const sizes = {
    sm: ['px-3', 'py-1.5', 'text-sm', 'rounded-md'],
    md: ['px-4', 'py-2', 'text-sm', 'rounded-md'],
    lg: ['px-6', 'py-3', 'text-base', 'rounded-lg'],
  }

  // Color variants
  const variants = {
    primary: [
      'bg-primary-600',
      'text-white',
      'hover:bg-primary-700',
      'focus:ring-primary-500',
      'dark:bg-primary-500',
      'dark:hover:bg-primary-600',
    ],
    secondary: [
      'bg-neutral-100',
      'text-neutral-900',
      'hover:bg-neutral-200',
      'focus:ring-neutral-500',
      'dark:bg-neutral-800',
      'dark:text-neutral-100',
      'dark:hover:bg-neutral-700',
    ],
    ghost: [
      'bg-transparent',
      'text-neutral-700',
      'hover:bg-neutral-100',
      'focus:ring-neutral-500',
      'dark:text-neutral-300',
      'dark:hover:bg-neutral-800',
    ],
    danger: [
      'bg-error-600',
      'text-white',
      'hover:bg-error-700',
      'focus:ring-error-500',
      'dark:bg-error-500',
      'dark:hover:bg-error-600',
    ],
    outline: [
      'border',
      'border-neutral-300',
      'bg-transparent',
      'text-neutral-700',
      'hover:bg-neutral-50',
      'focus:ring-neutral-500',
      'dark:border-neutral-600',
      'dark:text-neutral-300',
      'dark:hover:bg-neutral-800',
    ],
  }

  const classes = [...base, ...sizes[props.size], ...variants[props.variant]]

  if (props.fullWidth) {
    classes.push('w-full')
  }

  return classes
})

const handleClick = (event: MouseEvent) => {
  if (!props.disabled) {
    emit('click', event)
  }
}
</script>
