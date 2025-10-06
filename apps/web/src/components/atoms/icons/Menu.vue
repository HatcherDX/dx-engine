<template>
  <IconBase v-bind="$attrs" :stroke-width="1.5">
    <line x1="5" x2="19" y1="7" y2="7" />
    <line x1="5" x2="19" y1="12" y2="12" />
    <line x1="5" x2="19" y1="17" y2="17" />
  </IconBase>
</template>

<script setup lang="ts">
import IconBase from './IconBase.vue'

defineOptions({
  name: 'MenuIcon',
  inheritAttrs: false,
})
</script>
