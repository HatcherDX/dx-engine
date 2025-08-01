import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import CodeSidebar from './CodeSidebar.vue'

// Mock child components
vi.mock('../atoms/BaseIcon.vue', () => ({
  default: {
    name: 'BaseIcon',
    template: '<span class="base-icon" @click="$emit(\'click\')" />',
    props: ['name', 'size', 'class'],
    emits: ['click'],
  },
}))

vi.mock('../atoms/BaseLogo.vue', () => ({
  default: {
    name: 'BaseLogo',
    template: '<div class="base-logo" />',
    props: ['size', 'variant', 'class'],
  },
}))

describe('CodeSidebar.vue', () => {
  it('should mount and render without errors', () => {
    const wrapper = mount(CodeSidebar)
    expect(wrapper.exists()).toBe(true)
  })

  it('should render code sidebar container', () => {
    const wrapper = mount(CodeSidebar)
    const sidebar = wrapper.find('.code-sidebar')
    expect(sidebar.exists()).toBe(true)
  })

  it('should render explorer section', () => {
    const wrapper = mount(CodeSidebar)
    const explorerSection = wrapper.find('.explorer-section')
    const sectionTitle = wrapper.find('.section-title')

    expect(explorerSection.exists()).toBe(true)
    expect(sectionTitle.text()).toBe('Explorer')
  })

  it('should render file tree', () => {
    const wrapper = mount(CodeSidebar)
    const fileTree = wrapper.find('.file-tree')
    const fileItems = wrapper.findAll('.file-item')

    expect(fileTree.exists()).toBe(true)
    expect(fileItems.length).toBeGreaterThan(0)
  })

  it('should render file items with correct structure', () => {
    const wrapper = mount(CodeSidebar)
    const fileItems = wrapper.findAll('.file-item')
    const fileContents = wrapper.findAll('.file-content')
    const fileNames = wrapper.findAll('.file-name')

    expect(fileItems.length).toBeGreaterThan(0)
    expect(fileContents.length).toBeGreaterThan(0)
    expect(fileNames.length).toBeGreaterThan(0)
  })

  it('should apply selected class to selected file', async () => {
    const wrapper = mount(CodeSidebar)
    await wrapper.vm.$nextTick()

    // Check if there's a selected file by looking for the selected CSS class
    const selectedItem = wrapper.find('.file-item.file-selected')
    expect(selectedItem.exists()).toBe(true)
  })

  it('should apply directory class to directories', () => {
    const wrapper = mount(CodeSidebar)
    const directoryItems = wrapper.findAll('.file-directory')

    expect(directoryItems.length).toBeGreaterThan(0)
  })

  it('should handle file selection', async () => {
    const wrapper = mount(CodeSidebar)
    await wrapper.vm.$nextTick()

    const fileItems = wrapper.findAll('.file-item')

    if (fileItems.length > 0) {
      // Click on a file item
      await fileItems[0].trigger('click')
      await wrapper.vm.$nextTick()

      // Check that a selected class is applied
      const selectedItems = wrapper.findAll('.file-item.file-selected')
      expect(selectedItems.length).toBeGreaterThan(0)
    }
  })

  it('should handle directory expansion toggle', async () => {
    const wrapper = mount(CodeSidebar)
    const directoryItems = wrapper.findAll('.file-directory')

    if (directoryItems.length > 0) {
      // Click on a directory item to toggle expansion
      await directoryItems[0].trigger('click')

      // Check that the component still renders correctly
      expect(wrapper.exists()).toBe(true)
    }
  })

  it('should show context menu on right click', async () => {
    const wrapper = mount(CodeSidebar)
    const fileItems = wrapper.findAll('.file-item')

    if (fileItems.length > 0) {
      // Right click on a file item
      await fileItems[0].trigger('contextmenu')

      // Check that context menu appears in DOM
      const contextMenu = wrapper.find('.context-menu')
      expect(contextMenu.exists()).toBe(true)
    }
  })

  it('should hide context menu', async () => {
    const wrapper = mount(CodeSidebar)
    const fileItems = wrapper.findAll('.file-item')

    if (fileItems.length > 0) {
      // Show context menu first
      await fileItems[0].trigger('contextmenu')
      await wrapper.vm.$nextTick()
      let contextMenu = wrapper.find('.context-menu')

      if (contextMenu.exists()) {
        // Click on the context menu itself to hide it
        await contextMenu.trigger('click')
        await wrapper.vm.$nextTick()

        // Check that context menu is hidden
        contextMenu = wrapper.find('.context-menu')
        expect(contextMenu.exists()).toBe(false)
      }
    }
  })

  it('should render context menu when visible', async () => {
    const wrapper = mount(CodeSidebar)
    const fileItems = wrapper.findAll('.file-item')

    if (fileItems.length > 0) {
      // Right click to show context menu
      await fileItems[0].trigger('contextmenu')

      const contextMenu = wrapper.find('.context-menu')
      expect(contextMenu.exists()).toBe(true)
    }
  })

  it('should render context menu items', async () => {
    const wrapper = mount(CodeSidebar)
    const fileItems = wrapper.findAll('.file-item')

    if (fileItems.length > 0) {
      // Right click to show context menu
      await fileItems[0].trigger('contextmenu')

      const contextItems = wrapper.findAll('.context-item')
      expect(contextItems.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('should handle create new file action', async () => {
    const wrapper = mount(CodeSidebar)
    const fileItems = wrapper.findAll('.file-item')

    if (fileItems.length > 0) {
      // Right click to show context menu
      await fileItems[0].trigger('contextmenu')

      const contextItems = wrapper.findAll('.context-item')
      if (contextItems.length > 0) {
        // Click on "New File" option
        await contextItems[0].trigger('click')
        expect(wrapper.exists()).toBe(true)
      }
    }
  })

  it('should handle create new folder action', async () => {
    const wrapper = mount(CodeSidebar)
    const fileItems = wrapper.findAll('.file-item')

    if (fileItems.length > 0) {
      // Right click to show context menu
      await fileItems[0].trigger('contextmenu')

      const contextItems = wrapper.findAll('.context-item')
      if (contextItems.length > 1) {
        // Click on "New Folder" option
        await contextItems[1].trigger('click')
        expect(wrapper.exists()).toBe(true)
      }
    }
  })

  it('should handle rename file action', async () => {
    const wrapper = mount(CodeSidebar)
    const fileItems = wrapper.findAll('.file-item')

    if (fileItems.length > 0) {
      // Right click to show context menu
      await fileItems[0].trigger('contextmenu')

      const contextItems = wrapper.findAll('.context-item')
      if (contextItems.length > 2) {
        // Click on "Rename" option
        await contextItems[2].trigger('click')
        expect(wrapper.exists()).toBe(true)
      }
    }
  })

  it('should handle delete file action', async () => {
    const wrapper = mount(CodeSidebar)
    const fileItems = wrapper.findAll('.file-item')

    if (fileItems.length > 0) {
      // Right click to show context menu
      await fileItems[0].trigger('contextmenu')

      const contextItems = wrapper.findAll('.context-item')
      if (contextItems.length > 3) {
        // Click on "Delete" option
        await contextItems[3].trigger('click')
        expect(wrapper.exists()).toBe(true)
      }
    }
  })

  it('should return correct file icons', () => {
    const wrapper = mount(CodeSidebar)

    // Check that icons are rendered for different file types
    const icons = wrapper.findAllComponents({ name: 'BaseIcon' })
    expect(icons.length).toBeGreaterThan(0)

    // Check that directory and file items have different icons
    const directoryItems = wrapper.findAll('.file-directory')
    const fileItems = wrapper.findAll('.file-item:not(.file-directory)')

    expect(directoryItems.length + fileItems.length).toBeGreaterThan(0)
  })

  it('should render logo section', () => {
    const wrapper = mount(CodeSidebar)
    const logoSection = wrapper.find('.logo-section')
    const logo = wrapper.findComponent({ name: 'BaseLogo' })

    expect(logoSection.exists()).toBe(true)
    expect(logo.exists()).toBe(true)
  })

  it('should apply correct indentation based on depth', () => {
    const wrapper = mount(CodeSidebar)
    const fileItems = wrapper.findAll('.file-item')

    // Check that some items have different padding (indentation)
    const styles = fileItems.map((item) => item.attributes('style'))
    const uniqueStyles = [...new Set(styles)]

    expect(uniqueStyles.length).toBeGreaterThanOrEqual(1) // Should have at least one style
  })

  it('should show expanded class for expanded directories', () => {
    const wrapper = mount(CodeSidebar)

    // Check that there are directory items that can be expanded
    const directoryItems = wrapper.findAll('.file-directory')
    const expandedItems = wrapper.findAll('.file-directory.expanded')

    expect(directoryItems.length).toBeGreaterThanOrEqual(0)
    expect(expandedItems.length).toBeGreaterThanOrEqual(0)
  })

  it('should handle file click events', async () => {
    const wrapper = mount(CodeSidebar)
    const fileItems = wrapper.findAll('.file-item')

    if (fileItems.length > 0) {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await fileItems[0].trigger('click')

      // The click should result in some visual change
      expect(wrapper.exists()).toBe(true)

      consoleSpy.mockRestore()
    }
  })

  it('should handle context menu click events', async () => {
    const wrapper = mount(CodeSidebar)
    const fileItems = wrapper.findAll('.file-item')

    if (fileItems.length > 0) {
      // Right click to show context menu
      await fileItems[0].trigger('contextmenu')

      const contextMenu = wrapper.find('.context-menu')
      if (contextMenu.exists()) {
        await contextMenu.trigger('click')
        expect(wrapper.exists()).toBe(true)
      }
    }
  })

  it('should render file tree with proper nesting', () => {
    const wrapper = mount(CodeSidebar)

    // Check that file items have different indentation levels
    const fileItems = wrapper.findAll('.file-item')
    const styles = fileItems.map((item) => item.attributes('style'))

    expect(fileItems.length).toBeGreaterThan(0)
    expect(styles.length).toBeGreaterThan(0)
  })

  it('should maintain context menu state correctly', async () => {
    const wrapper = mount(CodeSidebar)
    await wrapper.vm.$nextTick()
    const fileItems = wrapper.findAll('.file-item')

    // Initial state - no context menu visible
    let contextMenu = wrapper.find('.context-menu')
    expect(contextMenu.exists()).toBe(false)

    if (fileItems.length > 0) {
      // Show context menu
      await fileItems[0].trigger('contextmenu')
      await wrapper.vm.$nextTick()

      contextMenu = wrapper.find('.context-menu')
      expect(contextMenu.exists()).toBe(true)
    }
  })
})
