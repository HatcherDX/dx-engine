<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <polyline points="21 21 16.65 16.65" />
  </svg>
</template>

<script setup lang="ts">
/**
 * Search icon component for search inputs and functionality.
 *
 * @remarks
 * Used in search bars, filters, and discovery features throughout
 * the application interface.
 *
 * @public
 * @since 1.0.0
 */
defineOptions({
  name: 'SearchIcon',
})
</script>
