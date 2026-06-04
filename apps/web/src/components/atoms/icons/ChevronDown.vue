<template>
  <IconBase v-bind="$attrs" :stroke-width="1.5">
    <path d="M6 9 L12 15 L18 9" stroke="currentColor" fill="none" />
  </IconBase>
</template>

<script setup lang="ts">
/**
 * @fileoverview ChevronDown icon component.
 *
 * @description
 * A simple chevron pointing downward, commonly used for dropdown indicators.
 * Follows Hatcher's luxury minimalist design system.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */
import IconBase from './IconBase.vue'

defineOptions({
  name: 'ChevronDownIcon',
})
</script>
