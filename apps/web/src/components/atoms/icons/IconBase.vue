<template>
  <svg
    :width="size"
    :height="size"
    :viewBox="`0 0 ${viewBox} ${viewBox}`"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    :class="['hatcher-icon', iconClass]"
    :style="iconStyle"
    aria-hidden="true"
  >
    <slot />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'

/**
 * Base icon component for Hatcher's luxury minimalist design system.
 *
 * @remarks
 * All icons follow a flat, single-color, minimalist design philosophy.
 * Icons are designed to be elegant, simple, and professional.
 *
 * @public
 * @since 1.0.0
 */
interface Props {
  /**
   * Icon size in pixels.
   * @defaultValue 24
   */
  size?: number | string

  /**
   * Icon color - uses CSS color values or theme variables.
   * @defaultValue 'currentColor'
   */
  color?: string

  /**
   * Stroke width for line-based icons.
   * @defaultValue 1.5
   */
  strokeWidth?: number | string

  /**
   * ViewBox size for SVG scaling.
   * @defaultValue 24
   */
  viewBox?: number

  /**
   * Additional CSS classes.
   */
  class?: string

  /**
   * Whether the icon should use stroke instead of fill.
   * @defaultValue true
   */
  useStroke?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 24,
  color: 'currentColor',
  strokeWidth: 1.5,
  viewBox: 24,
  class: '',
  useStroke: true,
})

/**
 * Computed icon class combining base and custom classes.
 */
const iconClass = computed(() => {
  return [props.class, props.useStroke ? 'stroke-icon' : 'fill-icon']
    .filter(Boolean)
    .join(' ')
})

/**
 * Computed icon style for color and stroke.
 */
const iconStyle = computed(() => {
  if (props.useStroke) {
    return {
      stroke: props.color,
      strokeWidth: props.strokeWidth,
      strokeLinecap: 'round' as const,
      strokeLinejoin: 'round' as const,
    }
  }
  return {
    fill: props.color,
  }
})
</script>

<style scoped>
.hatcher-icon {
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.hatcher-icon:deep(path),
.hatcher-icon:deep(line),
.hatcher-icon:deep(polyline),
.hatcher-icon:deep(circle),
.hatcher-icon:deep(rect),
.hatcher-icon:deep(polygon) {
  transition: all 0.2s ease;
}

.stroke-icon:deep(path),
.stroke-icon:deep(line),
.stroke-icon:deep(polyline),
.stroke-icon:deep(circle),
.stroke-icon:deep(rect),
.stroke-icon:deep(polygon) {
  stroke: currentColor;
  fill: none;
}

.fill-icon:deep(path),
.fill-icon:deep(circle),
.fill-icon:deep(rect),
.fill-icon:deep(polygon) {
  fill: currentColor;
  stroke: none;
}
</style>
