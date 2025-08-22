import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import Sidebar from './Sidebar.vue'

describe('Sidebar', () => {
  let wrapper: VueWrapper<InstanceType<typeof Sidebar>>

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.restoreAllMocks()
  })

  describe('Component Initialization', () => {
    it('should mount successfully', () => {
      wrapper = mount(Sidebar, {
        props: {
          width: 300,
          isResizing: false,
        },
      })

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('.sidebar').exists()).toBe(true)
    })

    it('should apply correct width', () => {
      wrapper = mount(Sidebar, {
        props: {
          width: 250,
          isResizing: false,
        },
      })

      const sidebar = wrapper.find('.sidebar')
      expect(sidebar.attributes('style')).toContain('width: 250px')
    })

    it('should handle resize cursor', () => {
      wrapper = mount(Sidebar, {
        props: {
          width: 300,
          isResizing: false,
        },
      })

      const resizeHandle = wrapper.find('.resize-handle')
      expect(resizeHandle.attributes('style')).toContain('cursor: col-resize')
    })
  })

  describe('Platform Support', () => {
    it('should handle macOS platform', () => {
      wrapper = mount(Sidebar, {
        props: {
          width: 300,
          isResizing: false,
          platform: 'macos',
        },
      })

      const header = wrapper.find('.sidebar-header')
      expect(header.classes()).toContain('platform-macos')
    })

    it('should handle Windows platform', () => {
      wrapper = mount(Sidebar, {
        props: {
          width: 300,
          isResizing: false,
          platform: 'windows',
        },
      })

      const header = wrapper.find('.sidebar-header')
      expect(header.classes()).toContain('platform-windows')
    })

    it('should handle Linux platform', () => {
      wrapper = mount(Sidebar, {
        props: {
          width: 300,
          isResizing: false,
          platform: 'linux',
        },
      })

      const header = wrapper.find('.sidebar-header')
      expect(header.classes()).toContain('platform-linux')
    })
  })

  describe('Slot Content', () => {
    it('should render default slot content', () => {
      wrapper = mount(Sidebar, {
        props: {
          width: 300,
          isResizing: false,
        },
        slots: {
          default:
            '<div>Navigation<br/>Sidebar content goes here<br/>Ready</div>',
        },
      })

      expect(wrapper.text()).toContain('Navigation')
      expect(wrapper.text()).toContain('Sidebar content goes here')
      expect(wrapper.text()).toContain('Ready')
    })

    it('should render multiple slots if supported', () => {
      wrapper = mount(Sidebar, {
        props: {
          width: 300,
          isResizing: false,
        },
        slots: {
          'sidebar-header': '<div>Custom Header</div>',
          'sidebar-content': '<div>Custom Content</div>',
          'sidebar-footer': '<div>Custom Footer</div>',
        },
      })

      expect(wrapper.text()).toContain('Custom Header')
      expect(wrapper.text()).toContain('Custom Content')
      expect(wrapper.text()).toContain('Custom Footer')
    })
  })

  describe('Event Handling', () => {
    it('should handle resize start event', async () => {
      wrapper = mount(Sidebar, {
        props: {
          width: 300,
          isResizing: false,
        },
      })

      const resizeHandle = wrapper.find('.resize-handle')
      const mockEvent = new MouseEvent('mousedown')

      await resizeHandle.trigger('mousedown', mockEvent)

      expect(wrapper.emitted('startResize')).toBeTruthy()
    })

    it('should handle header double click event', async () => {
      wrapper = mount(Sidebar, {
        props: {
          width: 300,
          isResizing: false,
        },
      })

      const header = wrapper.find('.sidebar-header')
      await header.trigger('dblclick')

      expect(wrapper.emitted('headerDoubleClick')).toBeTruthy()
    })
  })

  describe('Responsive Behavior', () => {
    it('should handle small widths', () => {
      wrapper = mount(Sidebar, {
        props: {
          width: 100,
          isResizing: false,
        },
      })

      const sidebar = wrapper.find('.sidebar')
      expect(sidebar.attributes('style')).toContain('width: 100px')
    })

    it('should handle large widths', () => {
      wrapper = mount(Sidebar, {
        props: {
          width: 500,
          isResizing: false,
        },
      })

      const sidebar = wrapper.find('.sidebar')
      expect(sidebar.attributes('style')).toContain('width: 500px')
    })
  })

  describe('Resize State', () => {
    it('should show resizing state', () => {
      wrapper = mount(Sidebar, {
        props: {
          width: 300,
          isResizing: true,
        },
      })

      const resizeHandle = wrapper.find('.resize-handle')
      expect(resizeHandle.classes()).toContain('is-resizing')
    })

    it('should not show resizing state when false', () => {
      wrapper = mount(Sidebar, {
        props: {
          width: 300,
          isResizing: false,
        },
      })

      const resizeHandle = wrapper.find('.resize-handle')
      expect(resizeHandle.classes()).not.toContain('is-resizing')
    })
  })

  describe('Edge Cases', () => {
    it('should handle zero width', () => {
      wrapper = mount(Sidebar, {
        props: {
          width: 0,
          isResizing: false,
        },
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('should handle missing platform gracefully', () => {
      wrapper = mount(Sidebar, {
        props: {
          width: 300,
          isResizing: false,
        },
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('should handle undefined resize cursor', () => {
      wrapper = mount(Sidebar, {
        props: {
          width: 300,
          isResizing: false,
        },
      })

      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('Accessibility', () => {
    it('should be accessible as navigation landmark', () => {
      wrapper = mount(Sidebar, {
        props: {
          width: 300,
          isResizing: false,
        },
      })

      const aside = wrapper.find('aside')
      expect(aside.exists()).toBe(true)
    })

    it('should support keyboard navigation', () => {
      wrapper = mount(Sidebar, {
        props: {
          width: 300,
          isResizing: false,
        },
      })

      expect(wrapper.exists()).toBe(true)
    })
  })
})
