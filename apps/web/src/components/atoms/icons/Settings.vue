<template>
  <IconBase v-bind="$attrs" :stroke-width="1.5">
    <circle cx="12" cy="12" r="2.5" />
    <path d="M12 2v4m0 12v4" />
    <path d="M20.5 12h-4m-9 0h-4" />
    <path d="M18.5 6l-2.8 2.8M8.3 15.7l-2.8 2.8" />
    <path d="M18.5 18l-2.8-2.8M8.3 8.3L5.5 5.5" />
  </IconBase>
</template>

<script setup lang="ts">
import IconBase from './IconBase.vue'

defineOptions({
  name: 'SettingsIcon',
  inheritAttrs: false,
})
</script>
