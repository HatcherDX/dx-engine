<template>
  <IconBase v-bind="$attrs" :stroke-width="1.5">
    <line x1="6" x2="6" y1="3" y2="15" />
    <circle cx="18" cy="6" r="2.5" />
    <circle cx="6" cy="18" r="2.5" />
    <path d="M18 9a9 9 0 0 1-9 9" />
  </IconBase>
</template>

<script setup lang="ts">
import IconBase from './IconBase.vue'

defineOptions({
  name: 'GitBranchIcon',
  inheritAttrs: false,
})
</script>
