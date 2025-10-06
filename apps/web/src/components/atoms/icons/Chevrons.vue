<template>
  <IconBase v-bind="$attrs" :stroke-width="1.5">
    <!-- Military chevrons (sergeant stripes) -->
    <!-- Top chevron -->
    <path d="M6 8 L12 4 L18 8" stroke="currentColor" fill="none" />
    <!-- Middle chevron -->
    <path d="M6 13 L12 9 L18 13" stroke="currentColor" fill="none" />
    <!-- Bottom chevron -->
    <path d="M6 18 L12 14 L18 18" stroke="currentColor" fill="none" />
  </IconBase>
</template>

<script setup lang="ts">
import IconBase from './IconBase.vue'

defineOptions({
  name: 'ChevronsIcon',
})
</script>
