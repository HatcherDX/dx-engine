<template>
  <img :src="logoSrc" :alt="alt" :class="logoClasses" @error="handleError" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTheme } from '../../composables/useTheme'

interface Props {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl'
  alt?: string
  variant?: 'inline' | 'hero' | 'egg-white' | 'word-mark'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  alt: 'Hatcher DX Engine',
  variant: 'inline',
})

const { isDark } = useTheme()

const logoSrc = computed(() => {
  if (props.variant === 'egg-white') {
    return '/egg-white.svg'
  }

  const theme = isDark.value ? 'dark' : 'light'
  if (props.variant === 'word-mark') {
    return `/word-mark-${theme}.svg`
  }
  if (props.variant === 'inline') {
    return `/logo-inline-${theme}.svg`
  }
  return `/logo-${theme}.svg`
})

const logoClasses = computed(() => {
  const base = ['select-none', 'pointer-events-none']

  // Size variants
  const sizes = {
    sm: ['h-8', 'w-auto'], // 32px height
    md: ['h-8', 'w-auto'],
    lg: ['h-12', 'w-auto'], // 48px height
    xl: ['h-16', 'w-auto'], // 64px height
    xxl: ['h-20', 'w-auto'], // 80px height
  }

  return [...base, ...sizes[props.size]]
})

const handleError = () => {
  console.warn('Logo failed to load')
  // Could implement fallback logic here if needed
}
</script>
