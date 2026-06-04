<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="none"
    style="transform: rotate(35deg)"
  >
    <!-- Main rocket body -->
    <path d="M12 2L10 18L12 18L14 18Z" />

    <!-- Rocket nose cone -->
    <path d="M12 2L10 8L14 8Z" />

    <!-- Left fin -->
    <path d="M10 12L7 16L10 18Z" />

    <!-- Right fin -->
    <path d="M14 12L17 16L14 18Z" />

    <!-- Bottom center fin -->
    <path d="M11 18L12 21L13 18Z" />

    <!-- Rocket window -->
    <circle
      cx="12"
      cy="10"
      r="1.5"
      fill="none"
      stroke="currentColor"
      stroke-width="1"
    />

    <!-- Flame exhaust -->
    <path d="M10 18L12 22L14 18" fill="currentColor" opacity="0.8" />
  </svg>
</template>

<script setup lang="ts">
/**
 * Rocket icon component for launch and startup actions.
 *
 * @remarks
 * Used in onboarding transitions and action buttons that represent
 * launching or starting processes.
 *
 * @public
 * @since 1.0.0
 */
defineOptions({
  name: 'RocketIcon',
})
</script>
