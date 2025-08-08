<template>
  <Teleport to="body">
    <div class="notification-container">
      <TransitionGroup
        name="notification"
        tag="div"
        class="notification-list"
        enter-active-class="notification-enter-active"
        leave-active-class="notification-leave-active"
        enter-from-class="notification-enter-from"
        leave-to-class="notification-leave-to"
        move-class="notification-move"
      >
        <div
          v-for="notification in visibleNotifications"
          :key="notification.id"
          :class="notificationClasses(notification)"
          role="alert"
          :aria-live="notification.type === 'error' ? 'assertive' : 'polite'"
        >
          <!-- Icon -->
          <div v-if="showIcon" class="notification-icon">
            <component
              :is="getIconComponent(notification.type || 'default')"
              class="notification-icon-svg"
            />
          </div>

          <!-- Content -->
          <div class="notification-content">
            <div v-if="notification.title" class="notification-title">
              {{ notification.title }}
            </div>
            <div class="notification-message">
              {{ notification.message }}
            </div>
          </div>

          <!-- Close button -->
          <button
            v-if="notification.dismissible"
            type="button"
            class="notification-close"
            :aria-label="closeLabel"
            @click="dismiss(notification.id)"
          >
            <BaseIcon name="X" size="sm" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useNotifications } from '../../composables/useNotifications'
import type { Notification } from '../../composables/useNotifications'
import BaseIcon from '../atoms/BaseIcon.vue'

/**
 * Props interface for NotificationContainer component
 */
interface Props {
  /**
   * Whether to show icons for notifications
   * @default true
   */
  showIcon?: boolean
  /**
   * Accessibility label for close button
   * @default 'Close notification'
   */
  closeLabel?: string
  /**
   * Maximum number of visible notifications
   * @default 5
   */
  maxVisible?: number
}

const props = withDefaults(defineProps<Props>(), {
  showIcon: true,
  closeLabel: 'Close notification',
  maxVisible: 5,
})

const { notifications, dismiss } = useNotifications()

/**
 * Get visible notifications (limited by maxVisible)
 */
const visibleNotifications = computed(() => {
  return notifications.value.filter((n) => n.visible).slice(-props.maxVisible) // Show only the latest notifications
})

/**
 * Get CSS classes for a notification
 */
const notificationClasses = (
  notification: Notification & { visible: boolean }
) => [
  'notification',
  `notification--${notification.type}`,
  {
    'notification--dismissible': notification.dismissible,
  },
]

/**
 * Get the appropriate icon component for the notification type
 */
const getIconComponent = (type: string) => {
  switch (type) {
    case 'success':
      return 'X' // Could be CheckCircle if available
    case 'error':
      return 'X' // Could be AlertCircle if available
    case 'warning':
      return 'X' // Could be AlertTriangle if available
    case 'info':
    case 'default':
    default:
      return 'X' // Could be Info if available
  }
}
</script>

<style scoped>
/* Notification Container */
.notification-container {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 9999;
  pointer-events: none;
  max-width: 400px;
  width: 100%;
}

.notification-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Notification Base Styles */
.notification {
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
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06),
    0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -2px rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(8px);
  pointer-events: auto;
  max-width: 100%;
  word-wrap: break-word;
}

/* Notification Variants */
.notification--default {
  border-color: var(--border-primary, #e5e7eb);
  background-color: var(--bg-secondary, #f9fafb);
  color: var(--text-primary, #111827);
}

.dark .notification--default {
  border-color: var(--border-primary-dark, #374151);
  background-color: var(--bg-secondary-dark, #1f2937);
  color: var(--text-primary-dark, #f9fafb);
}

.notification--error {
  border-color: #fecaca;
  background-color: #fef2f2;
  color: #7f1d1d;
}

.dark .notification--error {
  border-color: #b91c1c;
  background-color: #7f1d1d;
  color: #fef2f2;
}

.notification--warning {
  border-color: #fde68a;
  background-color: #fffbeb;
  color: #78350f;
}

.dark .notification--warning {
  border-color: #d97706;
  background-color: #78350f;
  color: #fffbeb;
}

.notification--success {
  border-color: #bbf7d0;
  background-color: #f0fdf4;
  color: #14532d;
}

.dark .notification--success {
  border-color: #16a34a;
  background-color: #14532d;
  color: #f0fdf4;
}

.notification--info {
  border-color: #bfdbfe;
  background-color: #eff6ff;
  color: #1e3a8a;
}

.dark .notification--info {
  border-color: #2563eb;
  background-color: #1e3a8a;
  color: #eff6ff;
}

/* Notification Icon */
.notification-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
}

.notification-icon-svg {
  width: 16px;
  height: 16px;
}

.notification--error .notification-icon-svg {
  color: #dc2626;
}

.dark .notification--error .notification-icon-svg {
  color: #fca5a5;
}

.notification--warning .notification-icon-svg {
  color: #d97706;
}

.dark .notification--warning .notification-icon-svg {
  color: #fbbf24;
}

.notification--success .notification-icon-svg {
  color: #16a34a;
}

.dark .notification--success .notification-icon-svg {
  color: #4ade80;
}

.notification--info .notification-icon-svg {
  color: #2563eb;
}

.dark .notification--info .notification-icon-svg {
  color: #60a5fa;
}

/* Notification Content */
.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-title {
  font-weight: 600;
  margin-bottom: 4px;
  color: inherit;
}

.notification-message {
  color: inherit;
  opacity: 0.9;
}

/* Notification Close Button */
.notification-close {
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

.notification-close:hover {
  opacity: 1;
}

.notification-close:focus {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}

/* Transition Animations */
.notification-enter-active {
  transition: all 0.3s ease-out;
}

.notification-leave-active {
  transition: all 0.3s ease-in;
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(100%) scale(0.95);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(100%) scale(0.95);
}

.notification-move {
  transition: transform 0.3s ease-out;
}

/* Responsive Design */
@media (max-width: 640px) {
  .notification-container {
    top: 12px;
    right: 12px;
    left: 12px;
    max-width: none;
  }

  .notification {
    padding: 12px;
    gap: 8px;
    font-size: 13px;
  }

  .notification-icon {
    width: 18px;
    height: 18px;
  }

  .notification-icon-svg {
    width: 14px;
    height: 14px;
  }

  .notification-close {
    width: 18px;
    height: 18px;
  }
}

/* Reduce motion for accessibility */
@media (prefers-reduced-motion: reduce) {
  .notification-enter-active,
  .notification-leave-active,
  .notification-move {
    transition: none;
  }
}
</style>
