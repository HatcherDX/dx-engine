<template>
  <div
    class="tooltip-container"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <!-- Trigger element -->
    <div ref="triggerRef" class="tooltip-trigger">
      <slot name="trigger" />
    </div>

    <!-- Tooltip content -->
    <Teleport to="body">
      <Transition
        name="tooltip"
        enter-active-class="tooltip-enter-active"
        leave-active-class="tooltip-leave-active"
        enter-from-class="tooltip-enter-from"
        leave-to-class="tooltip-leave-to"
      >
        <div
          v-if="isVisible"
          ref="tooltipRef"
          :class="tooltipClasses"
          :style="tooltipStyle"
          role="tooltip"
          :aria-describedby="ariaId"
        >
          <div class="tooltip-content">
            <slot name="content">
              {{ content }}
            </slot>
          </div>
          <div :class="arrowClasses" />
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onUnmounted } from 'vue'

/**
 * Props interface for BaseTooltip component
 */
interface Props {
  /**
   * Tooltip content text
   */
  content?: string
  /**
   * Placement of the tooltip relative to the trigger
   * @default 'top'
   */
  placement?: 'top' | 'bottom' | 'left' | 'right'
  /**
   * Delay before showing tooltip (ms)
   * @default 500
   */
  delay?: number
  /**
   * Tooltip variant style
   * @default 'default'
   */
  variant?: 'default' | 'error' | 'warning' | 'success'
  /**
   * Whether the tooltip is disabled
   * @default false
   */
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  content: '',
  placement: 'top',
  delay: 500,
  variant: 'default',
  disabled: false,
})

const isVisible = ref(false)
const triggerRef = ref<HTMLElement>()
const tooltipRef = ref<HTMLElement>()
const showTimeout = ref<number>()
const hideTimeout = ref<number>()
const ariaId = computed(
  () => `tooltip-${Math.random().toString(36).substr(2, 9)}`
)

/**
 * Computed classes for the tooltip container
 */
const tooltipClasses = computed(() => [
  'tooltip',
  `tooltip--${props.placement}`,
  `tooltip--${props.variant}`,
])

/**
 * Computed classes for the tooltip arrow
 */
const arrowClasses = computed(() => [
  'tooltip-arrow',
  `tooltip-arrow--${props.placement}`,
  `tooltip-arrow--${props.variant}`,
])

/**
 * Tooltip positioning style
 */
const tooltipStyle = ref<Record<string, string>>({})

/**
 * Calculate tooltip position relative to trigger element
 */
const calculatePosition = async (): Promise<void> => {
  if (!triggerRef.value || !tooltipRef.value) return

  await nextTick()

  const triggerRect = triggerRef.value.getBoundingClientRect()
  const tooltipRect = tooltipRef.value.getBoundingClientRect()
  const offset = 8 // Distance from trigger

  let top = 0
  let left = 0

  switch (props.placement) {
    case 'top':
      top = triggerRect.top - tooltipRect.height - offset
      left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2
      break
    case 'bottom':
      top = triggerRect.bottom + offset
      left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2
      break
    case 'left':
      top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2
      left = triggerRect.left - tooltipRect.width - offset
      break
    case 'right':
      top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2
      left = triggerRect.right + offset
      break
  }

  // Ensure tooltip stays within viewport
  const padding = 8
  const maxLeft = window.innerWidth - tooltipRect.width - padding
  const maxTop = window.innerHeight - tooltipRect.height - padding

  left = Math.max(padding, Math.min(left, maxLeft))
  top = Math.max(padding, Math.min(top, maxTop))

  tooltipStyle.value = {
    position: 'fixed',
    top: `${top}px`,
    left: `${left}px`,
    zIndex: '9999',
  }
}

/**
 * Handle mouse enter event
 */
const handleMouseEnter = (): void => {
  if (props.disabled) return

  clearTimeout(hideTimeout.value)
  showTimeout.value = window.setTimeout(async () => {
    isVisible.value = true
    await calculatePosition()
  }, props.delay)
}

/**
 * Handle mouse leave event
 */
const handleMouseLeave = (): void => {
  clearTimeout(showTimeout.value)
  hideTimeout.value = window.setTimeout(() => {
    isVisible.value = false
  }, 150)
}

/**
 * Cleanup timeouts on unmount
 */
onUnmounted(() => {
  clearTimeout(showTimeout.value)
  clearTimeout(hideTimeout.value)
})
</script>

<style scoped>
.tooltip-container {
  display: inline-block;
}

.tooltip-trigger {
  display: inherit;
}

/* Tooltip Base Styles */
.tooltip {
  position: relative;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 14px;
  font-weight: 500;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
  border: 1px solid;
  backdrop-filter: blur(8px);
  max-width: 320px;
  word-wrap: break-word;
  hyphens: auto;
}

/* Tooltip Variants */
.tooltip--default {
  background-color: #1f2937;
  color: white;
  border-color: #374151;
}

.dark .tooltip--default {
  background-color: #f9fafb;
  color: #111827;
  border-color: #e5e7eb;
}

.tooltip--error {
  background-color: #fef2f2;
  color: #7f1d1d;
  border-color: #fecaca;
}

.dark .tooltip--error {
  background-color: #7f1d1d;
  color: #fef2f2;
  border-color: #b91c1c;
}

.tooltip--warning {
  background-color: #fffbeb;
  color: #78350f;
  border-color: #fde68a;
}

.dark .tooltip--warning {
  background-color: #78350f;
  color: #fffbeb;
  border-color: #d97706;
}

.tooltip--success {
  background-color: #f0fdf4;
  color: #14532d;
  border-color: #bbf7d0;
}

.dark .tooltip--success {
  background-color: #14532d;
  color: #f0fdf4;
  border-color: #16a34a;
}

.tooltip-content {
  line-height: 1.4;
}

/* Tooltip Arrow */
.tooltip-arrow {
  position: absolute;
  width: 8px;
  height: 8px;
  transform: rotate(45deg);
}

.tooltip-arrow--top {
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%) rotate(45deg);
}

.tooltip-arrow--bottom {
  top: -4px;
  left: 50%;
  transform: translateX(-50%) rotate(45deg);
}

.tooltip-arrow--left {
  right: -4px;
  top: 50%;
  transform: translateY(-50%) rotate(45deg);
}

.tooltip-arrow--right {
  left: -4px;
  top: 50%;
  transform: translateY(-50%) rotate(45deg);
}

/* Arrow Variants */
.tooltip-arrow--default {
  background-color: #1f2937;
  border-color: #374151;
}

.dark .tooltip-arrow--default {
  background-color: #f9fafb;
  border-color: #e5e7eb;
}

.tooltip-arrow--error {
  background-color: #fef2f2;
  border-color: #fecaca;
}

.dark .tooltip-arrow--error {
  background-color: #7f1d1d;
  border-color: #b91c1c;
}

.tooltip-arrow--warning {
  background-color: #fffbeb;
  border-color: #fde68a;
}

.dark .tooltip-arrow--warning {
  background-color: #78350f;
  border-color: #d97706;
}

.tooltip-arrow--success {
  background-color: #f0fdf4;
  border-color: #bbf7d0;
}

.dark .tooltip-arrow--success {
  background-color: #14532d;
  border-color: #16a34a;
}

/* Transition Animations */
.tooltip-enter-active,
.tooltip-leave-active {
  transition: all 0.15s ease-out;
}

.tooltip-enter-from,
.tooltip-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

/* Responsive Design */
@media (max-width: 640px) {
  .tooltip {
    max-width: 280px;
    font-size: 12px;
    padding: 6px 8px;
  }
}
</style>
