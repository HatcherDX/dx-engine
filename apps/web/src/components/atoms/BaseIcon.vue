<template>
  <component
    :is="component"
    :class="iconClasses"
    :aria-hidden="!accessible"
    :aria-label="accessible ? ariaLabel : undefined"
  />
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'

interface Props {
  name: string
  size?: '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  color?: string
  accessible?: boolean
  ariaLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  color: undefined,
  accessible: false,
  ariaLabel: undefined,
})

// Dynamic icon component loading
const component = computed(() => {
  return defineAsyncComponent(() => import(`./icons/${props.name}.vue`))
})

const iconClasses = computed(() => {
  const base = ['inline-block', 'flex-shrink-0']

  // Size variants
  const sizes = {
    '2xs': ['w-2', 'h-2'],
    xs: ['w-3', 'h-3'],
    sm: ['w-4', 'h-4'],
    md: ['w-5', 'h-5'],
    lg: ['w-6', 'h-6'],
    xl: ['w-8', 'h-8'],
  }

  const classes = [...base, ...sizes[props.size]]

  // Custom color override
  if (props.color) {
    classes.push(props.color)
  }

  return classes
})

// Expose computed properties for testing
defineExpose({
  iconClasses,
})
</script>
