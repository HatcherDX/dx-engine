<template>
  <IconBase v-bind="$attrs" :stroke-width="1.5">
    <polyline points="5,17 11,12 5,7" />
    <line x1="13" x2="19" y1="17" y2="17" />
  </IconBase>
</template>

<script setup lang="ts">
import IconBase from './IconBase.vue'

defineOptions({
  name: 'TerminalIcon',
  inheritAttrs: false,
})
</script>
