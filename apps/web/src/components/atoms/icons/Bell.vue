<template>
  <IconBase v-bind="$attrs" :stroke-width="1.5">
    <path
      d="M10 5a2 2 0 1 1 4 0c0 1.5.5 2 1 3s1 2.5 1 4v3a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-3c0-1.5.5-3 1-4s1-1.5 1-3z"
    />
    <path d="M10.5 19a1.5 1.5 0 0 0 3 0" />
  </IconBase>
</template>

<script setup lang="ts">
import IconBase from './IconBase.vue'

defineOptions({
  name: 'BellIcon',
  inheritAttrs: false,
})
</script>
