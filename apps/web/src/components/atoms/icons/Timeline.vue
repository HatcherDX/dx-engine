<template>
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <!-- Timeline line -->
    <line
      x1="3"
      y1="2"
      x2="3"
      y2="14"
      stroke="currentColor"
      stroke-width="1.5"
    />

    <!-- Timeline nodes -->
    <circle cx="3" cy="3" r="2" fill="currentColor" />
    <circle cx="3" cy="8" r="2" fill="currentColor" />
    <circle cx="3" cy="13" r="2" fill="currentColor" />

    <!-- Timeline content lines -->
    <line
      x1="7"
      y1="3"
      x2="13"
      y2="3"
      stroke="currentColor"
      stroke-width="1.5"
    />
    <line
      x1="7"
      y1="8"
      x2="11"
      y2="8"
      stroke="currentColor"
      stroke-width="1.5"
    />
    <line
      x1="7"
      y1="13"
      x2="14"
      y2="13"
      stroke="currentColor"
      stroke-width="1.5"
    />
  </svg>
</template>

<script setup lang="ts">
defineOptions({
  name: 'TimelineIcon',
})
</script>
