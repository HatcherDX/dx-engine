<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" />
    <circle cx="12" cy="12" r="6" stroke="currentColor" stroke-width="2" />
    <circle cx="12" cy="12" r="2" stroke="currentColor" stroke-width="2" />
  </svg>
</template>

<script setup lang="ts">
defineOptions({
  name: 'TargetIcon',
})

interface Props {
  size?: number | string
}

withDefaults(defineProps<Props>(), {
  size: 24,
})
</script>
