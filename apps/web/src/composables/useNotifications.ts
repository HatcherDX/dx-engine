import { ref } from 'vue'

/**
 * Notification interface defining the structure of a notification
 */
export interface Notification {
  /**
   * Unique identifier for the notification
   */
  id: string
  /**
   * Notification title (optional)
   */
  title?: string
  /**
   * Notification message
   */
  message: string
  /**
   * Notification type/variant
   * @default 'default'
   */
  type?: 'default' | 'success' | 'error' | 'warning' | 'info'
  /**
   * Auto-dismiss duration in milliseconds (0 = no auto-dismiss)
   * @default 5000
   */
  duration?: number
  /**
   * Whether the notification can be manually dismissed
   * @default true
   */
  dismissible?: boolean
}

/**
 * Internal notification interface with computed properties
 */
interface InternalNotification extends Notification {
  /**
   * Timestamp when notification was created
   */
  createdAt: number
  /**
   * Whether the notification is currently visible
   */
  visible: boolean
}

// Global notification state
const notifications = ref<InternalNotification[]>([])

/**
 * Generate a unique ID for notifications
 */
const generateId = (): string => {
  return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Composable for managing toast notifications
 *
 * @remarks
 * Provides a centralized system for displaying floating notifications
 * in the top-right corner of the screen. Supports multiple types,
 * auto-dismiss, and manual dismissal.
 *
 * @example
 * ```typescript
 * const { notify, success, error, warning, info } = useNotifications()
 *
 * // Show success notification
 * success('Project loaded successfully!')
 *
 * // Show error with custom duration
 * error('Failed to load project', { duration: 10000 })
 *
 * // Show custom notification
 * notify({
 *   title: 'Custom Title',
 *   message: 'Custom message',
 *   type: 'info',
 *   duration: 3000
 * })
 * ```
 *
 * @returns Object containing notification methods and state
 *
 * @public
 * @since 1.0.0
 */
export const useNotifications = () => {
  /**
   * Add a new notification to the queue
   *
   * @param notification - The notification configuration
   * @returns The ID of the created notification
   */
  const notify = (notification: Omit<Notification, 'id'>): string => {
    const id = generateId()
    const internalNotification: InternalNotification = {
      id,
      title: notification.title,
      message: notification.message,
      type: notification.type || 'default',
      duration: notification.duration ?? 5000,
      dismissible: notification.dismissible ?? true,
      createdAt: Date.now(),
      visible: true,
    }

    notifications.value.push(internalNotification)

    // Auto-dismiss if duration is set
    if (internalNotification.duration && internalNotification.duration > 0) {
      setTimeout(() => {
        dismiss(id)
      }, internalNotification.duration)
    }

    return id
  }

  /**
   * Dismiss a notification by ID
   *
   * @param id - The notification ID to dismiss
   */
  const dismiss = (id: string): void => {
    const index = notifications.value.findIndex((n) => n.id === id)
    if (index > -1) {
      // Mark as not visible to trigger exit animation
      notifications.value[index].visible = false

      // Remove from array after animation completes
      setTimeout(() => {
        const currentIndex = notifications.value.findIndex((n) => n.id === id)
        if (currentIndex > -1) {
          notifications.value.splice(currentIndex, 1)
        }
      }, 300) // Match with CSS transition duration
    }
  }

  /**
   * Clear all notifications
   */
  const clear = (): void => {
    notifications.value.forEach((notification) => {
      notification.visible = false
    })

    setTimeout(() => {
      notifications.value = []
    }, 300)
  }

  /**
   * Show a success notification
   *
   * @param message - Success message
   * @param options - Additional notification options
   * @returns The notification ID
   */
  const success = (
    message: string,
    options?: Partial<Omit<Notification, 'message' | 'type'>>
  ): string => {
    return notify({
      message,
      type: 'success',
      ...options,
    })
  }

  /**
   * Show an error notification
   *
   * @param message - Error message
   * @param options - Additional notification options
   * @returns The notification ID
   */
  const error = (
    message: string,
    options?: Partial<Omit<Notification, 'message' | 'type'>>
  ): string => {
    return notify({
      message,
      type: 'error',
      ...options,
    })
  }

  /**
   * Show a warning notification
   *
   * @param message - Warning message
   * @param options - Additional notification options
   * @returns The notification ID
   */
  const warning = (
    message: string,
    options?: Partial<Omit<Notification, 'message' | 'type'>>
  ): string => {
    return notify({
      message,
      type: 'warning',
      ...options,
    })
  }

  /**
   * Show an info notification
   *
   * @param message - Info message
   * @param options - Additional notification options
   * @returns The notification ID
   */
  const info = (
    message: string,
    options?: Partial<Omit<Notification, 'message' | 'type'>>
  ): string => {
    return notify({
      message,
      type: 'info',
      ...options,
    })
  }

  /**
   * Reset notification state (for testing)
   */
  const reset = (): void => {
    notifications.value = []
  }

  return {
    // State
    notifications: notifications,

    // Methods
    notify,
    dismiss,
    clear,
    reset,

    // Convenience methods
    success,
    error,
    warning,
    info,
  }
}
