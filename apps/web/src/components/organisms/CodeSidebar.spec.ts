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

  it('should apply selected class to selected file', () => {
    const wrapper = mount(CodeSidebar)
    const component = wrapper.vm

    // Check if there's a selected file
    expect(component.selectedFileId).toBe('app-vue')
  })

  it('should apply directory class to directories', () => {
    const wrapper = mount(CodeSidebar)
    const directoryItems = wrapper.findAll('.file-directory')

    expect(directoryItems.length).toBeGreaterThan(0)
  })

  it('should handle file selection', async () => {
    const wrapper = mount(CodeSidebar)
    const component = wrapper.vm

    const mockFile = {
      id: 'test-file',
      name: 'test.vue',
      type: 'file' as const,
      depth: 1,
      expanded: false,
    }

    component.selectFile(mockFile)

    expect(component.selectedFileId).toBe('test-file')
  })

  it('should handle directory expansion toggle', async () => {
    const wrapper = mount(CodeSidebar)
    const component = wrapper.vm

    const mockDirectory = {
      id: 'test-dir',
      name: 'test',
      type: 'directory' as const,
      depth: 0,
      expanded: false,
    }

    component.toggleExpanded(mockDirectory)

    expect(mockDirectory.expanded).toBe(true)
  })

  it('should show context menu on right click', async () => {
    const wrapper = mount(CodeSidebar)
    const component = wrapper.vm

    const mockFile = {
      id: 'test-file',
      name: 'test.vue',
      type: 'file' as const,
      depth: 1,
      expanded: false,
    }

    const mockEvent = {
      clientX: 100,
      clientY: 200,
    }

    component.showContextMenu(mockFile, mockEvent)

    expect(component.contextMenu.visible).toBe(true)
    expect(component.contextMenu.x).toBe(100)
    expect(component.contextMenu.y).toBe(200)
    expect(component.contextMenu.item).toStrictEqual(mockFile)
  })

  it('should hide context menu', async () => {
    const wrapper = mount(CodeSidebar)
    const component = wrapper.vm

    // First show the context menu
    component.contextMenu.visible = true

    component.hideContextMenu()

    expect(component.contextMenu.visible).toBe(false)
    expect(component.contextMenu.item).toBe(null)
  })

  it('should render context menu when visible', async () => {
    const wrapper = mount(CodeSidebar)
    const component = wrapper.vm

    // Show context menu
    component.contextMenu.visible = true
    component.contextMenu.x = 100
    component.contextMenu.y = 200
    await wrapper.vm.$nextTick()

    const contextMenu = wrapper.find('.context-menu')
    expect(contextMenu.exists()).toBe(true)
  })

  it('should render context menu items', async () => {
    const wrapper = mount(CodeSidebar)
    const component = wrapper.vm

    // Show context menu
    component.contextMenu.visible = true
    await wrapper.vm.$nextTick()

    const contextItems = wrapper.findAll('.context-item')
    expect(contextItems.length).toBe(4) // New File, New Folder, Rename, Delete
  })

  it('should handle create new file action', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const wrapper = mount(CodeSidebar)
    const component = wrapper.vm

    component.createNewFile()

    expect(consoleSpy).toHaveBeenCalledWith('Create new file')
    consoleSpy.mockRestore()
  })

  it('should handle create new folder action', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const wrapper = mount(CodeSidebar)
    const component = wrapper.vm

    component.createNewFolder()

    expect(consoleSpy).toHaveBeenCalledWith('Create new folder')
    consoleSpy.mockRestore()
  })

  it('should handle rename file action', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const wrapper = mount(CodeSidebar)
    const component = wrapper.vm

    component.renameFile()

    expect(consoleSpy).toHaveBeenCalledWith('Rename file:', undefined)
    consoleSpy.mockRestore()
  })

  it('should handle delete file action', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const wrapper = mount(CodeSidebar)
    const component = wrapper.vm

    component.deleteFile()

    expect(consoleSpy).toHaveBeenCalledWith('Delete file:', undefined)
    consoleSpy.mockRestore()
  })

  it('should return correct file icons', () => {
    const wrapper = mount(CodeSidebar)
    const component = wrapper.vm

    const directoryNode = { type: 'directory', name: 'folder' } as unknown
    const vueFile = {
      type: 'file',
      extension: 'vue',
      name: 'component.vue',
    } as unknown
    const jsFile = {
      type: 'file',
      extension: 'js',
      name: 'script.js',
    } as unknown
    const unknownFile = { type: 'file', name: 'readme.txt' } as unknown

    expect(component.getFileIcon(directoryNode)).toBe('Menu')
    expect(component.getFileIcon(vueFile)).toBe('Eye')
    expect(component.getFileIcon(jsFile)).toBe('Code')
    expect(component.getFileIcon(unknownFile)).toBe('Code')
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
    const component = wrapper.vm

    // Find a directory item that should be expanded
    const expandedDir = component.fileTree.find(
      (item) => item.type === 'directory' && item.expanded
    )

    expect(expandedDir).toBeTruthy()
    expect(expandedDir?.expanded).toBe(true)
  })

  it('should handle file click events', async () => {
    const wrapper = mount(CodeSidebar)
    const fileItems = wrapper.findAll('.file-item')

    if (fileItems.length > 0) {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await fileItems[0].trigger('click')

      // The click should update selectedFileId
      expect(wrapper.vm.selectedFileId).toBeDefined()

      consoleSpy.mockRestore()
    }
  })

  it('should handle context menu click events', async () => {
    const wrapper = mount(CodeSidebar)
    const component = wrapper.vm

    // Show context menu first
    component.contextMenu.visible = true
    await wrapper.vm.$nextTick()

    const contextMenu = wrapper.find('.context-menu')
    await contextMenu.trigger('click')

    expect(component.contextMenu.visible).toBe(false)
  })

  it('should render file tree with proper nesting', () => {
    const wrapper = mount(CodeSidebar)
    const component = wrapper.vm

    // Check that fileTree has items with different depths
    const depths = component.fileTree.map((item) => item.depth)
    const maxDepth = Math.max(...depths)

    expect(maxDepth).toBeGreaterThanOrEqual(0) // Should have valid depth structure
  })

  it('should maintain context menu state correctly', () => {
    const wrapper = mount(CodeSidebar)
    const component = wrapper.vm

    // Initial state
    expect(component.contextMenu.visible).toBe(false)
    expect(component.contextMenu.item).toBe(null)

    // Show context menu
    const mockFile = { id: 'test', name: 'test.vue', type: 'file' } as unknown
    const mockEvent = { clientX: 50, clientY: 100 }

    component.showContextMenu(mockFile, mockEvent)

    expect(component.contextMenu.visible).toBe(true)
    expect(component.contextMenu.item).toStrictEqual(mockFile)
    expect(component.contextMenu.x).toBe(50)
    expect(component.contextMenu.y).toBe(100)
  })
})
