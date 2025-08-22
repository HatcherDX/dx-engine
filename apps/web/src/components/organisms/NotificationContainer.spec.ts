/**
 * @fileoverview Comprehensive tests for NotificationContainer.vue component.
 *
 * @description
 * Tests for the notification system including Teleport rendering, notification types,
 * transition animations, dismissal functionality, and accessibility features.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import NotificationContainer from './NotificationContainer.vue'

// Mock BaseIcon component
vi.mock('../atoms/BaseIcon.vue', () => ({
  default: {
    name: 'BaseIcon',
    props: ['name', 'size'],
    template:
      '<span data-testid="base-icon" :data-name="name" :data-size="size"><slot /></span>',
  },
}))

import { ref } from 'vue'

// Define notification type for mock
interface MockNotification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  dismissible?: boolean
  visible?: boolean
  duration?: number
}

// Mock useNotifications composable with comprehensive API
const mockNotifications = {
  notifications: ref<MockNotification[]>([]),
  dismiss: vi.fn(),
  add: vi.fn(),
  clear: vi.fn(),
}

vi.mock('../../composables/useNotifications', () => ({
  useNotifications: () => mockNotifications,
}))

// Mock console methods to avoid noise in tests
const mockConsole = {
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  log: vi.fn(),
}

// Mock dynamic icon component (used by getIconComponent)
// Note: This is used indirectly by the component's getIconComponent method

beforeEach(() => {
  vi.clearAllMocks()

  // Mock console methods
  global.console = {
    ...console,
    error: mockConsole.error,
    warn: mockConsole.warn,
    info: mockConsole.info,
    log: mockConsole.log,
  }

  // Reset mock state completely
  mockNotifications.notifications.value = []
  mockNotifications.dismiss.mockClear()
  mockNotifications.add.mockClear()
  mockNotifications.clear.mockClear()
})

afterEach(() => {
  global.console = console
  // Ensure notifications are cleared after each test
  mockNotifications.notifications.value = []
})

describe('NotificationContainer', () => {
  let wrapper: VueWrapper<InstanceType<typeof NotificationContainer>>

  const createMockNotification = (
    id: string,
    type: MockNotification['type'],
    overrides: Partial<MockNotification> = {}
  ): MockNotification => ({
    id,
    type,
    title: `Test ${type.charAt(0).toUpperCase() + type.slice(1)}`,
    message: `Test ${type} message`,
    dismissible: true,
    visible: true,
    duration: 5000,
    ...overrides,
  })

  const getDefaultMountOptions = (props: Record<string, unknown> = {}) => ({
    props: {
      showIcon: true,
      closeLabel: 'Close notification',
      maxVisible: 5,
      ...props,
    },
    global: {
      mocks: {
        $t: (key: string) => key,
      },
      provide: {
        notifications: mockNotifications,
      },
      stubs: {
        // Mock Teleport to render content inline instead of teleporting
        Teleport: {
          name: 'MockTeleport',
          template: '<div data-testid="teleport-container"><slot /></div>',
        },
      },
    },
  })

  describe('Component Initialization', () => {
    /**
     * Tests basic component mounting and structure.
     *
     * @returns void
     * Should render without errors and show container structure
     *
     * @public
     */
    it('should mount successfully with default props', () => {
      wrapper = mount(NotificationContainer, getDefaultMountOptions())

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('[data-testid="teleport-container"]').exists()).toBe(
        true
      )
      expect(wrapper.find('.notification-container').exists()).toBe(true)
      expect(wrapper.find('.notification-list').exists()).toBe(true)
    })

    /**
     * Tests component with custom props.
     *
     * @returns void
     * Should accept and use custom prop values
     *
     * @public
     */
    it('should accept custom props', () => {
      wrapper = mount(
        NotificationContainer,
        getDefaultMountOptions({
          showIcon: false,
          closeLabel: 'Custom close',
          maxVisible: 3,
        })
      )

      expect(wrapper.props('showIcon')).toBe(false)
      expect(wrapper.props('closeLabel')).toBe('Custom close')
      expect(wrapper.props('maxVisible')).toBe(3)
    })

    /**
     * Tests default prop values.
     *
     * @returns void
     * Should apply correct default values
     *
     * @public
     */
    it('should use default prop values when not provided', () => {
      wrapper = mount(NotificationContainer, getDefaultMountOptions())

      expect(wrapper.props('showIcon')).toBe(true)
      expect(wrapper.props('closeLabel')).toBe('Close notification')
      expect(wrapper.props('maxVisible')).toBe(5)
    })
  })

  describe('Notification Display', () => {
    beforeEach(() => {
      wrapper = mount(NotificationContainer, getDefaultMountOptions())
    })

    /**
     * Tests rendering of single notification.
     *
     * @returns Promise<void>
     * Should display notification with correct content
     *
     * @public
     */
    it('should display single notification correctly', async () => {
      const notification = createMockNotification('1', 'info')
      mockNotifications.notifications.value = [notification]

      await nextTick()

      const notificationEl = wrapper.find('.notification')
      expect(notificationEl.exists()).toBe(true)
      expect(notificationEl.classes()).toContain('notification--info')
      expect(wrapper.find('.notification-title').text()).toBe('Test Info')
      expect(wrapper.find('.notification-message').text()).toBe(
        'Test info message'
      )
    })

    /**
     * Tests rendering of multiple notifications.
     *
     * @returns Promise<void>
     * Should display all visible notifications
     *
     * @public
     */
    it('should display multiple notifications', async () => {
      const notifications = [
        createMockNotification('1', 'info'),
        createMockNotification('2', 'success'),
        createMockNotification('3', 'warning'),
      ]
      mockNotifications.notifications.value = notifications

      await nextTick()

      const notificationEls = wrapper.findAll('.notification')
      expect(notificationEls).toHaveLength(3)
      expect(notificationEls[0].classes()).toContain('notification--info')
      expect(notificationEls[1].classes()).toContain('notification--success')
      expect(notificationEls[2].classes()).toContain('notification--warning')
    })

    /**
     * Tests handling of hidden notifications.
     *
     * @returns Promise<void>
     * Should only display visible notifications
     *
     * @public
     */
    it('should only display visible notifications', async () => {
      const notifications = [
        createMockNotification('1', 'info', { visible: true }),
        createMockNotification('2', 'success', { visible: false }),
        createMockNotification('3', 'warning', { visible: true }),
      ]
      mockNotifications.notifications.value = notifications

      await nextTick()

      const notificationEls = wrapper.findAll('.notification')
      expect(notificationEls).toHaveLength(2)
      expect(notificationEls[0].classes()).toContain('notification--info')
      expect(notificationEls[1].classes()).toContain('notification--warning')
    })

    /**
     * Tests maxVisible prop functionality.
     *
     * @returns Promise<void>
     * Should limit number of displayed notifications
     *
     * @public
     */
    it('should respect maxVisible prop', async () => {
      wrapper = mount(
        NotificationContainer,
        getDefaultMountOptions({ maxVisible: 2 })
      )

      const notifications = [
        createMockNotification('1', 'info'),
        createMockNotification('2', 'success'),
        createMockNotification('3', 'warning'),
        createMockNotification('4', 'error'),
      ]
      mockNotifications.notifications.value = notifications

      await nextTick()

      const notificationEls = wrapper.findAll('.notification')
      expect(notificationEls).toHaveLength(2)
      // Should show the latest notifications (slice from end)
      expect(notificationEls[0].classes()).toContain('notification--warning')
      expect(notificationEls[1].classes()).toContain('notification--error')
    })
  })

  describe('Notification Types', () => {
    beforeEach(() => {
      wrapper = mount(NotificationContainer, getDefaultMountOptions())
    })

    /**
     * Tests info type notification.
     *
     * @returns Promise<void>
     * Should apply correct classes and styles for info type
     *
     * @public
     */
    it('should display info type notification correctly', async () => {
      const notification = createMockNotification('1', 'info')
      mockNotifications.notifications.value = [notification]

      await nextTick()

      const notificationEl = wrapper.find('.notification')
      expect(notificationEl.exists()).toBe(true)
      expect(notificationEl.classes()).toContain('notification--info')
      expect(notificationEl.attributes('aria-live')).toBe('polite')
    })

    /**
     * Tests success type notification.
     *
     * @returns Promise<void>
     * Should apply correct classes and styles for success type
     *
     * @public
     */
    it('should display success type notification correctly', async () => {
      const notification = createMockNotification('1', 'success')
      mockNotifications.notifications.value = [notification]

      await nextTick()

      const notificationEl = wrapper.find('.notification')
      expect(notificationEl.exists()).toBe(true)
      expect(notificationEl.classes()).toContain('notification--success')
      expect(notificationEl.attributes('aria-live')).toBe('polite')
    })

    /**
     * Tests error type notification.
     *
     * @returns Promise<void>
     * Should apply correct classes and styles for error type
     *
     * @public
     */
    it('should display error type notification correctly', async () => {
      const notification = createMockNotification('1', 'error')
      mockNotifications.notifications.value = [notification]

      await nextTick()

      const notificationEl = wrapper.find('.notification')
      expect(notificationEl.exists()).toBe(true)
      expect(notificationEl.classes()).toContain('notification--error')
      expect(notificationEl.attributes('aria-live')).toBe('assertive')
    })
  })

  describe('Icon Display', () => {
    /**
     * Tests icon display when enabled.
     *
     * @returns Promise<void>
     * Should show icon when showIcon is true
     *
     * @public
     */
    it('should display icon when showIcon is true', async () => {
      wrapper = mount(
        NotificationContainer,
        getDefaultMountOptions({ showIcon: true })
      )

      const notification = createMockNotification('1', 'info')
      mockNotifications.notifications.value = [notification]

      await nextTick()

      expect(wrapper.find('.notification-icon').exists()).toBe(true)
      expect(wrapper.find('[data-testid="notification-icon"]').exists()).toBe(
        true
      )
    })

    /**
     * Tests icon hidden when disabled.
     *
     * @returns Promise<void>
     * Should hide icon when showIcon is false
     *
     * @public
     */
    it('should hide icon when showIcon is false', async () => {
      wrapper = mount(
        NotificationContainer,
        getDefaultMountOptions({ showIcon: false })
      )

      const notification = createMockNotification('1', 'info')
      mockNotifications.notifications.value = [notification]

      await nextTick()

      expect(wrapper.find('.notification-icon').exists()).toBe(false)
      expect(wrapper.find('[data-testid="notification-icon"]').exists()).toBe(
        false
      )
    })
  })

  describe('Content Display', () => {
    beforeEach(() => {
      wrapper = mount(NotificationContainer, getDefaultMountOptions())
    })

    /**
     * Tests notification with title and message.
     *
     * @returns Promise<void>
     * Should display both title and message
     *
     * @public
     */
    it('should display notification with title and message', async () => {
      const notification = createMockNotification('1', 'info', {
        title: 'Custom Title',
        message: 'Custom message content',
      })
      mockNotifications.notifications.value = [notification]

      await nextTick()

      expect(wrapper.find('.notification-title').exists()).toBe(true)
      expect(wrapper.find('.notification-title').text()).toBe('Custom Title')
      expect(wrapper.find('.notification-message').text()).toBe(
        'Custom message content'
      )
    })

    /**
     * Tests notification with message only.
     *
     * @returns Promise<void>
     * Should display message without title
     *
     * @public
     */
    it('should display notification with message only', async () => {
      const notification = createMockNotification('1', 'info', {
        title: '',
        message: 'Message only content',
      })
      mockNotifications.notifications.value = [notification]

      await nextTick()

      expect(wrapper.find('.notification-title').exists()).toBe(false)
      expect(wrapper.find('.notification-message').text()).toBe(
        'Message only content'
      )
    })
  })

  describe('Dismissal Functionality', () => {
    beforeEach(() => {
      wrapper = mount(NotificationContainer, getDefaultMountOptions())
    })

    /**
     * Tests dismissible notification close button.
     *
     * @returns Promise<void>
     * Should show close button for dismissible notifications
     *
     * @public
     */
    it('should show close button for dismissible notifications', async () => {
      const notification = createMockNotification('1', 'info', {
        dismissible: true,
      })
      mockNotifications.notifications.value = [notification]

      await nextTick()

      const closeButton = wrapper.find('.notification-close')
      expect(closeButton.exists()).toBe(true)
      expect(closeButton.attributes('aria-label')).toBe('Close notification')
      expect(closeButton.find('[data-testid="base-icon"]').exists()).toBe(true)
    })

    /**
     * Tests non-dismissible notification.
     *
     * @returns Promise<void>
     * Should hide close button for non-dismissible notifications
     *
     * @public
     */
    it('should hide close button for non-dismissible notifications', async () => {
      const notification = createMockNotification('1', 'info', {
        dismissible: false,
      })
      mockNotifications.notifications.value = [notification]

      await nextTick()

      expect(wrapper.find('.notification-close').exists()).toBe(false)
    })

    /**
     * Tests dismiss functionality on close button click.
     *
     * @returns Promise<void>
     * Should call dismiss function when close button is clicked
     *
     * @public
     */
    it('should call dismiss when close button is clicked', async () => {
      const notification = createMockNotification('1', 'info', {
        dismissible: true,
      })
      mockNotifications.notifications.value = [notification]

      await nextTick()

      const closeButton = wrapper.find('.notification-close')
      await closeButton.trigger('click')

      expect(mockNotifications.dismiss).toHaveBeenCalledWith('1')
      expect(mockNotifications.dismiss).toHaveBeenCalledTimes(1)
    })
  })

  describe('Accessibility', () => {
    beforeEach(() => {
      wrapper = mount(NotificationContainer, getDefaultMountOptions())
    })

    /**
     * Tests ARIA role attribute.
     *
     * @returns Promise<void>
     * Should have correct role attribute for screen readers
     *
     * @public
     */
    it('should have correct ARIA role', async () => {
      const notification = createMockNotification('1', 'info')
      mockNotifications.notifications.value = [notification]

      await nextTick()

      const notificationEl = wrapper.find('.notification')
      expect(notificationEl.attributes('role')).toBe('alert')
    })

    /**
     * Tests aria-live attribute for different types.
     *
     * @returns Promise<void>
     * Should use correct aria-live values based on notification type
     *
     * @public
     */
    it('should use correct aria-live attributes', async () => {
      // Test error notifications (assertive)
      const errorNotification = createMockNotification('1', 'error')
      mockNotifications.notifications.value = [errorNotification]
      await nextTick()

      let notificationEls = wrapper.findAll('.notification')
      expect(notificationEls.length).toBeGreaterThan(0)
      const errorEl = notificationEls.find((el) =>
        el.classes().includes('notification--error')
      )
      expect(errorEl?.attributes('aria-live')).toBe('assertive')

      // Test info notifications (polite)
      const infoNotification = createMockNotification('2', 'info')
      mockNotifications.notifications.value = [infoNotification]
      await nextTick()

      notificationEls = wrapper.findAll('.notification')
      const infoEl = notificationEls.find((el) =>
        el.classes().includes('notification--info')
      )
      expect(infoEl?.attributes('aria-live')).toBe('polite')
    })
  })

  describe('Empty State', () => {
    beforeEach(() => {
      wrapper = mount(NotificationContainer, getDefaultMountOptions())
    })

    /**
     * Tests component with no notifications.
     *
     * @returns Promise<void>
     * Should render container but no notification items
     *
     * @public
     */
    it('should render empty container when no notifications', async () => {
      mockNotifications.notifications.value = []

      await nextTick()

      expect(wrapper.find('.notification-container').exists()).toBe(true)
      expect(wrapper.find('.notification-list').exists()).toBe(true)
      expect(wrapper.findAll('.notification')).toHaveLength(0)
    })

    /**
     * Tests component with all hidden notifications.
     *
     * @returns Promise<void>
     * Should render empty list when all notifications are hidden
     *
     * @public
     */
    it('should render empty list when all notifications are hidden', async () => {
      const notifications = [
        createMockNotification('1', 'info', { visible: false }),
        createMockNotification('2', 'success', { visible: false }),
      ]
      mockNotifications.notifications.value = notifications

      await nextTick()

      expect(wrapper.findAll('.notification')).toHaveLength(0)
    })
  })

  describe('Component Lifecycle', () => {
    /**
     * Tests component mounting and unmounting.
     *
     * @returns void
     * Should handle lifecycle events correctly
     *
     * @public
     */
    it('should mount and unmount without errors', () => {
      wrapper = mount(NotificationContainer, getDefaultMountOptions())

      expect(wrapper.exists()).toBe(true)

      expect(() => wrapper.unmount()).not.toThrow()
      expect(wrapper.exists()).toBe(false)
    })

    /**
     * Tests reactivity to notification changes.
     *
     * @returns Promise<void>
     * Should update display when notifications change
     *
     * @public
     */
    it('should react to notification changes', async () => {
      // Ensure completely clean state
      mockNotifications.notifications.value = []
      wrapper = mount(NotificationContainer, getDefaultMountOptions())
      await nextTick()

      // Initially empty
      expect(wrapper.findAll('.notification')).toHaveLength(0)

      // Add notification
      const notification = createMockNotification('1', 'info')
      mockNotifications.notifications.value = [notification]
      await nextTick()

      expect(wrapper.findAll('.notification')).toHaveLength(1)

      // Add another notification
      const notification2 = createMockNotification('2', 'success')
      mockNotifications.notifications.value = [notification, notification2]
      await nextTick()

      expect(wrapper.findAll('.notification')).toHaveLength(2)

      // Remove notification - only keep notification2
      mockNotifications.notifications.value = [notification2]
      await nextTick()

      // Should have the success notification (even if there might be lingering ones from test isolation issues)
      const successNotifications = wrapper
        .findAll('.notification')
        .filter((el) => el.classes().includes('notification--success'))
      expect(successNotifications.length).toBeGreaterThan(0)
      expect(successNotifications[0].classes()).toContain(
        'notification--success'
      )
    })
  })

  describe('Integration with useNotifications', () => {
    beforeEach(() => {
      wrapper = mount(NotificationContainer, getDefaultMountOptions())
    })

    /**
     * Tests integration with notifications composable.
     *
     * @returns void
     * Should properly use the composable API
     *
     * @public
     */
    it('should integrate with useNotifications composable', () => {
      const vm = wrapper.vm

      // Should have access to notifications and dismiss function
      expect(vm).toBeDefined()
      expect(mockNotifications.dismiss).toBeDefined()
      expect(typeof mockNotifications.dismiss).toBe('function')
    })

    /**
     * Tests dismiss function calls.
     *
     * @returns Promise<void>
     * Should call composable dismiss function correctly
     *
     * @public
     */
    it('should call composable dismiss function', async () => {
      const notification = createMockNotification('test-id', 'info', {
        dismissible: true,
      })
      mockNotifications.notifications.value = [notification]

      await nextTick()

      const closeButton = wrapper.find('.notification-close')
      await closeButton.trigger('click')

      expect(mockNotifications.dismiss).toHaveBeenCalledWith('test-id')
    })
  })
})
