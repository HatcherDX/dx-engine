<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <rect width="8" height="14" x="8" y="6" rx="4" />
    <path d="m19 7-3 2" />
    <path d="m5 7 3 2" />
    <path d="m19 19-3-2" />
    <path d="m5 19 3-2" />
    <path d="M20 13h-4" />
    <path d="M4 13h4" />
    <path d="m10 4 1 2" />
    <path d="m14 4-1 2" />
  </svg>
</template>

<script setup lang="ts">
/**
 * Bug icon component for issue tracking and debugging.
 *
 * @remarks
 * Used in bug reports, error states, and debugging interfaces
 * to indicate issues or problems.
 *
 * @public
 * @since 1.0.0
 */
defineOptions({
  name: 'BugIcon',
})
</script>
