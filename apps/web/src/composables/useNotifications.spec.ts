import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useNotifications } from './useNotifications'

/**
 * Test suite for useNotifications composable
 *
 * @remarks
 * Tests notification creation, dismissal, and management functionality.
 * Covers different notification types and auto-dismiss behavior.
 *
 * @since 1.0.0
 */
describe('useNotifications', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Reset notifications state before each test
    const { reset } = useNotifications()
    reset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  /**
   * Test basic notification creation
   */
  it('creates a notification with default properties', () => {
    const { notify, notifications } = useNotifications()

    const id = notify({
      message: 'Test notification',
    })

    expect(notifications.value).toHaveLength(1)
    expect(notifications.value[0]).toMatchObject({
      id,
      message: 'Test notification',
      type: 'default',
      duration: 5000,
      dismissible: true,
      visible: true,
    })
  })

  /**
   * Test notification with custom properties
   */
  it('creates a notification with custom properties', () => {
    const { notify, notifications } = useNotifications()

    const id = notify({
      title: 'Custom Title',
      message: 'Custom message',
      type: 'error',
      duration: 10000,
      dismissible: false,
    })

    expect(notifications.value[0]).toMatchObject({
      id,
      title: 'Custom Title',
      message: 'Custom message',
      type: 'error',
      duration: 10000,
      dismissible: false,
      visible: true,
    })
  })

  /**
   * Test manual dismissal
   */
  it('dismisses a notification manually', async () => {
    const { notify, dismiss, notifications } = useNotifications()

    const id = notify({
      message: 'Test notification',
      duration: 0, // No auto-dismiss
    })

    expect(notifications.value).toHaveLength(1)
    expect(notifications.value[0].visible).toBe(true)

    dismiss(id)

    expect(notifications.value[0].visible).toBe(false)

    // Fast-forward to after removal timeout
    vi.advanceTimersByTime(350)

    expect(notifications.value).toHaveLength(0)
  })

  /**
   * Test auto-dismiss functionality
   */
  it('auto-dismisses notification after duration', () => {
    const { notify, notifications } = useNotifications()

    notify({
      message: 'Auto-dismiss notification',
      duration: 1000,
    })

    expect(notifications.value).toHaveLength(1)
    expect(notifications.value[0].visible).toBe(true)

    // Fast-forward time to trigger auto-dismiss
    vi.advanceTimersByTime(1000)

    expect(notifications.value[0].visible).toBe(false)

    // Fast-forward to after removal timeout
    vi.advanceTimersByTime(350)

    expect(notifications.value).toHaveLength(0)
  })

  /**
   * Test clearing all notifications
   */
  it('clears all notifications', () => {
    const { notify, clear, notifications } = useNotifications()

    notify({ message: 'First notification' })
    notify({ message: 'Second notification' })
    notify({ message: 'Third notification' })

    expect(notifications.value).toHaveLength(3)

    clear()

    notifications.value.forEach((notification) => {
      expect(notification.visible).toBe(false)
    })

    // Fast-forward to after removal timeout
    vi.advanceTimersByTime(350)

    expect(notifications.value).toHaveLength(0)
  })

  /**
   * Test success convenience method
   */
  it('creates success notification using convenience method', () => {
    const { success, notifications } = useNotifications()

    const id = success('Success message')

    expect(notifications.value[0]).toMatchObject({
      id,
      message: 'Success message',
      type: 'success',
    })
  })

  /**
   * Test error convenience method
   */
  it('creates error notification using convenience method', () => {
    const { error, notifications } = useNotifications()

    const id = error('Error message', { duration: 10000 })

    expect(notifications.value[0]).toMatchObject({
      id,
      message: 'Error message',
      type: 'error',
      duration: 10000,
    })
  })

  /**
   * Test warning convenience method
   */
  it('creates warning notification using convenience method', () => {
    const { warning, notifications } = useNotifications()

    const id = warning('Warning message')

    expect(notifications.value[0]).toMatchObject({
      id,
      message: 'Warning message',
      type: 'warning',
    })
  })

  /**
   * Test info convenience method
   */
  it('creates info notification using convenience method', () => {
    const { info, notifications } = useNotifications()

    const id = info('Info message')

    expect(notifications.value[0]).toMatchObject({
      id,
      message: 'Info message',
      type: 'info',
    })
  })

  /**
   * Test multiple notifications
   */
  it('handles multiple notifications correctly', () => {
    const { success, error, warning, notifications } = useNotifications()

    success('Success message')
    error('Error message')
    warning('Warning message')

    expect(notifications.value).toHaveLength(3)
    expect(notifications.value[0].type).toBe('success')
    expect(notifications.value[1].type).toBe('error')
    expect(notifications.value[2].type).toBe('warning')
  })

  /**
   * Test dismissing non-existent notification
   */
  it('handles dismissing non-existent notification gracefully', () => {
    const { dismiss, notifications } = useNotifications()

    expect(() => dismiss('non-existent-id')).not.toThrow()
    expect(notifications.value).toHaveLength(0)
  })

  /**
   * Test notification without auto-dismiss
   */
  it('does not auto-dismiss when duration is 0', () => {
    const { notify, notifications } = useNotifications()

    notify({
      message: 'Persistent notification',
      duration: 0,
    })

    expect(notifications.value[0].visible).toBe(true)

    // Fast-forward time
    vi.advanceTimersByTime(10000)

    expect(notifications.value[0].visible).toBe(true)
    expect(notifications.value).toHaveLength(1)
  })
})
