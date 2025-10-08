<template>
  <IconBase v-bind="$attrs" :stroke-width="1.5">
    <!-- Organic growth staircase with 3 circles in perspective -->

    <!-- Connecting lines behind circles (perspective depth) -->
    <path d="M13.5 15.5 L9.5 13.5" stroke="currentColor" stroke-width="1.5" />
    <path d="M10 11 L14 8" stroke="currentColor" stroke-width="1" />

    <!-- Bottom circle (largest, closest/foreground) -->
    <circle
      cx="16"
      cy="17"
      r="4"
      stroke="currentColor"
      fill="none"
      stroke-width="1.5"
    />

    <!-- Middle circle (medium, middle distance) -->
    <circle
      cx="8"
      cy="12"
      r="3"
      stroke="currentColor"
      fill="none"
      stroke-width="1.3"
    />

    <!-- Top circle (smallest, farthest/background) -->
    <circle
      cx="15"
      cy="7"
      r="2"
      stroke="currentColor"
      fill="none"
      stroke-width="1"
    />
  </IconBase>
</template>

<script setup lang="ts">
import IconBase from './IconBase.vue'

defineOptions({
  name: 'TimelineIcon',
})
</script>
