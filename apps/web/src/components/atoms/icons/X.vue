<template>
  <IconBase v-bind="$attrs" :stroke-width="1.5">
    <path d="M18 6L6 18" />
    <path d="M6 6l12 12" />
  </IconBase>
</template>

<script setup lang="ts">
import IconBase from './IconBase.vue'

defineOptions({
  name: 'XIcon',
  inheritAttrs: false,
})
</script>
