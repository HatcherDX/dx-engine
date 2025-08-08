<template>
  <Transition
    name="alert"
    enter-active-class="alert-enter-active"
    leave-active-class="alert-leave-active"
    enter-from-class="alert-enter-from"
    leave-to-class="alert-leave-to"
  >
    <div
      v-if="visible"
      :class="alertClasses"
      role="alert"
      :aria-live="variant === 'error' ? 'assertive' : 'polite'"
    >
      <!-- Icon -->
      <div v-if="showIcon" class="alert-icon">
        <component :is="iconComponent" class="alert-icon-svg" />
      </div>

      <!-- Content -->
      <div class="alert-content">
        <div v-if="title" class="alert-title">{{ title }}</div>
        <div class="alert-description">
          <slot>{{ description }}</slot>
        </div>
      </div>

      <!-- Close button -->
      <button
        v-if="dismissible"
        type="button"
        class="alert-close"
        :aria-label="closeLabel"
        @click="handleClose"
      >
        <BaseIcon name="X" size="sm" />
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import BaseIcon from './BaseIcon.vue'

/**
 * Props interface for BaseAlert component
 */
interface Props {
  /**
   * Alert variant determining visual style
   * @default 'default'
   */
  variant?: 'default' | 'destructive' | 'warning' | 'success' | 'info' | 'error'
  /**
   * Alert title text
   */
  title?: string
  /**
   * Alert description text
   */
  description?: string
  /**
   * Whether to show an icon
   * @default true
   */
  showIcon?: boolean
  /**
   * Whether the alert can be dismissed
   * @default true
   */
  dismissible?: boolean
  /**
   * Auto-dismiss timeout in milliseconds (0 = no auto-dismiss)
   * @default 0
   */
  autoClose?: number
  /**
   * Accessibility label for close button
   * @default 'Close alert'
   */
  closeLabel?: string
  /**
   * Whether the alert is initially visible
   * @default true
   */
  modelValue?: boolean
}

/**
 * Emits interface for BaseAlert component
 */
interface Emits {
  /**
   * Emitted when alert visibility changes
   */
  (e: 'update:modelValue', value: boolean): void
  /**
   * Emitted when alert is closed
   */
  (e: 'close'): void
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  title: '',
  description: '',
  showIcon: true,
  dismissible: true,
  autoClose: 0,
  closeLabel: 'Close alert',
  modelValue: true,
})

const emit = defineEmits<Emits>()

const visible = ref(props.modelValue)
const autoCloseTimer = ref<number>()

/**
 * Computed classes for the alert container
 */
const alertClasses = computed(() => [
  'alert',
  `alert--${props.variant}`,
  {
    'alert--dismissible': props.dismissible,
  },
])

/**
 * Get the appropriate icon component for the variant
 */
const iconComponent = computed(() => {
  switch (props.variant) {
    case 'destructive':
    case 'error':
      return 'X' // Could be AlertCircle if available
    case 'warning':
      return 'X' // Could be AlertTriangle if available
    case 'success':
      return 'X' // Could be CheckCircle if available
    case 'info':
    case 'default':
    default:
      return 'X' // Could be Info if available
  }
})

/**
 * Handle alert close
 */
const handleClose = (): void => {
  visible.value = false
  emit('update:modelValue', false)
  emit('close')
}

/**
 * Set up auto-close timer
 */
const setupAutoClose = (): void => {
  if (props.autoClose > 0) {
    autoCloseTimer.value = window.setTimeout(() => {
      handleClose()
    }, props.autoClose)
  }
}

/**
 * Clear auto-close timer
 */
const clearAutoClose = (): void => {
  if (autoCloseTimer.value) {
    clearTimeout(autoCloseTimer.value)
    autoCloseTimer.value = undefined
  }
}

/**
 * Watch for modelValue changes
 */
const updateVisible = (newValue: boolean): void => {
  visible.value = newValue
  if (newValue) {
    setupAutoClose()
  } else {
    clearAutoClose()
  }
}

// Initialize auto-close on mount
onMounted(() => {
  if (visible.value) {
    setupAutoClose()
  }
})

// Clean up timer on unmount
onUnmounted(() => {
  clearAutoClose()
})

// Watch for prop changes
watch(
  () => props.modelValue,
  (newValue) => updateVisible(newValue)
)
</script>

<style scoped>
/* Alert Base Styles */
.alert {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid;
  background-color: var(--bg-primary);
  font-size: 14px;
  line-height: 1.4;
  box-shadow:
    0 1px 3px 0 rgba(0, 0, 0, 0.1),
    0 1px 2px 0 rgba(0, 0, 0, 0.06);
}

/* Alert Variants */
.alert--default {
  border-color: var(--border-primary, #e5e7eb);
  background-color: var(--bg-secondary, #f9fafb);
  color: var(--text-primary, #111827);
}

.dark .alert--default {
  border-color: var(--border-primary-dark, #374151);
  background-color: var(--bg-secondary-dark, #1f2937);
  color: var(--text-primary-dark, #f9fafb);
}

.alert--destructive,
.alert--error {
  border-color: #fecaca;
  background-color: #fef2f2;
  color: #7f1d1d;
}

.dark .alert--destructive,
.dark .alert--error {
  border-color: #b91c1c;
  background-color: #7f1d1d;
  color: #fef2f2;
}

.alert--warning {
  border-color: #fde68a;
  background-color: #fffbeb;
  color: #78350f;
}

.dark .alert--warning {
  border-color: #d97706;
  background-color: #78350f;
  color: #fffbeb;
}

.alert--success {
  border-color: #bbf7d0;
  background-color: #f0fdf4;
  color: #14532d;
}

.dark .alert--success {
  border-color: #16a34a;
  background-color: #14532d;
  color: #f0fdf4;
}

.alert--info {
  border-color: #bfdbfe;
  background-color: #eff6ff;
  color: #1e3a8a;
}

.dark .alert--info {
  border-color: #2563eb;
  background-color: #1e3a8a;
  color: #eff6ff;
}

/* Alert Icon */
.alert-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
}

.alert-icon-svg {
  width: 16px;
  height: 16px;
}

.alert--destructive .alert-icon-svg,
.alert--error .alert-icon-svg {
  color: #dc2626;
}

.dark .alert--destructive .alert-icon-svg,
.dark .alert--error .alert-icon-svg {
  color: #fca5a5;
}

.alert--warning .alert-icon-svg {
  color: #d97706;
}

.dark .alert--warning .alert-icon-svg {
  color: #fbbf24;
}

.alert--success .alert-icon-svg {
  color: #16a34a;
}

.dark .alert--success .alert-icon-svg {
  color: #4ade80;
}

.alert--info .alert-icon-svg {
  color: #2563eb;
}

.dark .alert--info .alert-icon-svg {
  color: #60a5fa;
}

/* Alert Content */
.alert-content {
  flex: 1;
  min-width: 0;
}

.alert-title {
  font-weight: 600;
  margin-bottom: 4px;
  color: inherit;
}

.alert-description {
  color: inherit;
  opacity: 0.9;
}

/* Alert Close Button */
.alert-close {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  border-radius: 4px;
  opacity: 0.7;
  transition: opacity 0.15s ease-in-out;
}

.alert-close:hover {
  opacity: 1;
}

.alert-close:focus {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}

/* Transition Animations */
.alert-enter-active,
.alert-leave-active {
  transition: all 0.2s ease-out;
}

.alert-enter-from {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}

.alert-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}

/* Responsive Design */
@media (max-width: 640px) {
  .alert {
    padding: 12px;
    gap: 8px;
    font-size: 13px;
  }

  .alert-icon {
    width: 18px;
    height: 18px;
  }

  .alert-icon-svg {
    width: 14px;
    height: 14px;
  }

  .alert-close {
    width: 18px;
    height: 18px;
  }
}
</style>
