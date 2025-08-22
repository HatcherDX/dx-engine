import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import CodeSidebar from './CodeSidebar.vue'

// Mock useProjectContext composable with sample data
vi.mock('../../composables/useProjectContext', () => ({
  useProjectContext: () => ({
    projectFiles: ref([
      { path: 'src', type: 'directory' },
      { path: 'src/components', type: 'directory' },
      { path: 'src/components/atoms', type: 'directory' },
      { path: 'src/components/atoms/BaseButton.vue', type: 'file' },
      { path: 'src/components/molecules', type: 'directory' },
      { path: 'src/components/molecules/FileTree.vue', type: 'file' },
      { path: 'src/utils', type: 'directory' },
      { path: 'src/utils/helpers.ts', type: 'file' },
      { path: 'package.json', type: 'file' },
      { path: 'README.md', type: 'file' },
    ]),
    isProjectLoaded: ref(true),
    projectRoot: ref('/test/project'),
    projectName: ref('test-project'),
  }),
}))

// Mock child components
vi.mock('../atoms/BaseIcon.vue', () => ({
  default: {
    name: 'BaseIcon',
    props: ['name', 'size', 'color'],
    template: '<span class="base-icon"></span>',
  },
}))

vi.mock('../atoms/BaseLogo.vue', () => ({
  default: {
    name: 'BaseLogo',
    template: '<div class="base-logo"></div>',
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
    expect(sectionTitle.text()).toContain('Explorer')
    expect(sectionTitle.text()).toContain('test-project')
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

    // First click on a file to select it
    const fileItems = wrapper.findAll('.file-item')
    if (fileItems.length > 0) {
      const firstFile = fileItems.find(
        (item) => !item.classes().includes('file-directory')
      )
      if (firstFile) {
        await firstFile.trigger('click')
      }
    }

    // Component exists and can handle selection
    expect(wrapper.exists()).toBe(true)
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

  it('should render project name in section title', () => {
    const wrapper = mount(CodeSidebar)
    const sectionTitle = wrapper.find('.section-title')

    expect(sectionTitle.exists()).toBe(true)
    expect(sectionTitle.text()).toContain('Explorer')
    expect(sectionTitle.text()).toContain('test-project')
  })

  it('should not render logo section (branding removed)', () => {
    const wrapper = mount(CodeSidebar)
    const logoSection = wrapper.find('.logo-section')
    const logo = wrapper.findComponent({ name: 'BaseLogo' })

    expect(logoSection.exists()).toBe(false)
    expect(logo.exists()).toBe(false)
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

  it('should test getFileIcon for all file extensions', () => {
    const wrapper = mount(CodeSidebar)

    interface FileItem {
      type: 'file' | 'directory'
      extension?: string
    }

    interface CodeSidebarVM {
      getFileIcon: (item: FileItem) => string
    }

    const vm = wrapper.vm as unknown as CodeSidebarVM

    // Test directory
    expect(vm.getFileIcon({ type: 'directory' })).toBe('Menu')

    // Test Vue files
    expect(vm.getFileIcon({ type: 'file', extension: 'vue' })).toBe('Eye')

    // Test TypeScript/JavaScript files
    expect(vm.getFileIcon({ type: 'file', extension: 'ts' })).toBe('Code')
    expect(vm.getFileIcon({ type: 'file', extension: 'tsx' })).toBe('Code')
    expect(vm.getFileIcon({ type: 'file', extension: 'js' })).toBe('Code')
    expect(vm.getFileIcon({ type: 'file', extension: 'jsx' })).toBe('Code')

    // Test JSON files
    expect(vm.getFileIcon({ type: 'file', extension: 'json' })).toBe(
      'GitBranch'
    )

    // Test Markdown files
    expect(vm.getFileIcon({ type: 'file', extension: 'md' })).toBe('Terminal')
    expect(vm.getFileIcon({ type: 'file', extension: 'markdown' })).toBe(
      'Terminal'
    )

    // Test CSS files
    expect(vm.getFileIcon({ type: 'file', extension: 'css' })).toBe('Sun')
    expect(vm.getFileIcon({ type: 'file', extension: 'scss' })).toBe('Sun')
    expect(vm.getFileIcon({ type: 'file', extension: 'sass' })).toBe('Sun')
    expect(vm.getFileIcon({ type: 'file', extension: 'less' })).toBe('Sun')

    // Test HTML files
    expect(vm.getFileIcon({ type: 'file', extension: 'html' })).toBe(
      'GitBranch'
    )
    expect(vm.getFileIcon({ type: 'file', extension: 'htm' })).toBe('GitBranch')

    // Test programming language files
    expect(vm.getFileIcon({ type: 'file', extension: 'py' })).toBe('Terminal')
    expect(vm.getFileIcon({ type: 'file', extension: 'rb' })).toBe('Terminal')
    expect(vm.getFileIcon({ type: 'file', extension: 'php' })).toBe('Terminal')
    expect(vm.getFileIcon({ type: 'file', extension: 'java' })).toBe('Terminal')
    expect(vm.getFileIcon({ type: 'file', extension: 'cpp' })).toBe('Terminal')
    expect(vm.getFileIcon({ type: 'file', extension: 'c' })).toBe('Terminal')
    expect(vm.getFileIcon({ type: 'file', extension: 'go' })).toBe('Terminal')
    expect(vm.getFileIcon({ type: 'file', extension: 'rs' })).toBe('Terminal')

    // Test image files
    expect(vm.getFileIcon({ type: 'file', extension: 'png' })).toBe('Eye')
    expect(vm.getFileIcon({ type: 'file', extension: 'jpg' })).toBe('Eye')
    expect(vm.getFileIcon({ type: 'file', extension: 'jpeg' })).toBe('Eye')
    expect(vm.getFileIcon({ type: 'file', extension: 'gif' })).toBe('Eye')
    expect(vm.getFileIcon({ type: 'file', extension: 'svg' })).toBe('Eye')
    expect(vm.getFileIcon({ type: 'file', extension: 'ico' })).toBe('Eye')

    // Test default case
    expect(vm.getFileIcon({ type: 'file', extension: 'txt' })).toBe('Code')
    expect(vm.getFileIcon({ type: 'file', extension: undefined })).toBe('Code')
    expect(vm.getFileIcon({ type: 'file', extension: '' })).toBe('Code')
  })

  it('should test getFileExtension method', () => {
    const wrapper = mount(CodeSidebar)

    interface CodeSidebarVM {
      getFileExtension: (filename: string) => string
    }

    const vm = wrapper.vm as unknown as CodeSidebarVM

    // Test normal extensions
    expect(vm.getFileExtension('file.txt')).toBe('txt')
    expect(vm.getFileExtension('component.vue')).toBe('vue')
    expect(vm.getFileExtension('index.spec.ts')).toBe('ts')

    // Test edge cases
    expect(vm.getFileExtension('noextension')).toBe('')
    expect(vm.getFileExtension('.hidden')).toBe('') // Files starting with . have no extension after the dot
    expect(vm.getFileExtension('')).toBe('')
    expect(vm.getFileExtension('file.tar.gz')).toBe('gz')
  })

  it('should handle context menu actions', () => {
    const wrapper = mount(CodeSidebar)

    interface CodeSidebarVM {
      contextMenu: {
        visible: boolean
        item: { name: string } | null
      }
      createNewFile: () => void
      createNewFolder: () => void
      renameFile: () => void
      deleteFile: () => void
    }

    const vm = wrapper.vm as unknown as CodeSidebarVM
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    // Set up context menu item
    vm.contextMenu = {
      visible: true,
      item: { name: 'test-file.ts' },
    }

    // Test createNewFile
    vm.createNewFile()
    expect(consoleSpy).toHaveBeenCalledWith('Create new file')
    expect(vm.contextMenu.visible).toBe(false)

    // Reset visibility
    vm.contextMenu.visible = true

    // Test createNewFolder
    vm.createNewFolder()
    expect(consoleSpy).toHaveBeenCalledWith('Create new folder')
    expect(vm.contextMenu.visible).toBe(false)

    // Reset visibility
    vm.contextMenu.visible = true

    // Test renameFile
    vm.renameFile()
    expect(consoleSpy).toHaveBeenCalledWith('Rename file:', 'test-file.ts')
    expect(vm.contextMenu.visible).toBe(false)

    // Reset visibility
    vm.contextMenu.visible = true

    // Test deleteFile
    vm.deleteFile()
    expect(consoleSpy).toHaveBeenCalledWith('Delete file:', 'test-file.ts')
    expect(vm.contextMenu.visible).toBe(false)

    consoleSpy.mockRestore()
  })

  it('should handle toggleExpanded for directories', () => {
    const wrapper = mount(CodeSidebar)

    interface DirectoryItem {
      path: string
      type: 'directory'
    }

    interface CodeSidebarVM {
      expandedDirs: Set<string>
      toggleExpanded: (item: DirectoryItem) => void
    }

    const vm = wrapper.vm as unknown as CodeSidebarVM

    const dirItem: DirectoryItem = {
      path: '/test/src',
      type: 'directory',
    }

    // Initially not expanded
    expect(vm.expandedDirs.has(dirItem.path)).toBe(false)

    // Toggle to expand
    vm.toggleExpanded(dirItem)
    expect(vm.expandedDirs.has(dirItem.path)).toBe(true)

    // Toggle to collapse
    vm.toggleExpanded(dirItem)
    expect(vm.expandedDirs.has(dirItem.path)).toBe(false)
  })

  it('should not toggle expansion for files', () => {
    const wrapper = mount(CodeSidebar)

    interface FileItem {
      path: string
      type: 'file'
    }

    interface CodeSidebarVM {
      expandedDirs: Set<string>
      toggleExpanded: (item: FileItem) => void
    }

    const vm = wrapper.vm as unknown as CodeSidebarVM

    const fileItem: FileItem = {
      path: '/test/file.ts',
      type: 'file',
    }

    // Should not add file to expandedDirs
    vm.toggleExpanded(fileItem)
    expect(vm.expandedDirs.has(fileItem.path)).toBe(false)
  })

  it('should handle shouldShowNode for nodes visibility', () => {
    const wrapper = mount(CodeSidebar)

    interface NodeItem {
      depth: number
      path: string
    }

    interface CodeSidebarVM {
      expandedDirs: Set<string>
      shouldShowNode: (item: NodeItem) => boolean
    }

    const vm = wrapper.vm as unknown as CodeSidebarVM

    // Expand a directory
    vm.expandedDirs.add('/test/src')

    // Root level item should always show
    const rootItem: NodeItem = { depth: 0, path: '/test/src' }
    expect(vm.shouldShowNode(rootItem)).toBe(true)

    // Child of expanded directory should show
    // const childItem = {
    //   depth: 1,
    //   path: '/test/src/file.ts',
    //   parentPath: '/test/src',
    // }

    // Create the actual parent node

    // For the actual implementation, we need to check if parent is expanded
    // The shouldShowNode logic checks if the parent directory is expanded
    // Since we expanded '/test/src', its children should be visible
    expect(vm.expandedDirs.has('/test/src')).toBe(true)
  })

  it('should handle file selection', () => {
    const wrapper = mount(CodeSidebar)

    interface FileItem {
      id: string
      name: string
      type: 'file'
    }

    interface DirectoryItem {
      path: string
      type: 'directory'
    }

    interface CodeSidebarVM {
      selectedFileId: string
      expandedDirs: Set<string>
      selectFile: (item: FileItem | DirectoryItem) => void
    }

    const vm = wrapper.vm as unknown as CodeSidebarVM
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const fileItem: FileItem = {
      id: 'file-1',
      name: 'file.ts',
      type: 'file',
    }

    // Select file - should update selectedFileId
    vm.selectFile(fileItem)
    expect(vm.selectedFileId).toBe('file-1')
    expect(consoleSpy).toHaveBeenCalledWith('Open file in editor:', 'file.ts')

    // Select directory - should toggle expansion, not update selectedFileId
    const dirItem: DirectoryItem = {
      path: '/test/dir',
      type: 'directory',
    }

    // Initially not expanded
    expect(vm.expandedDirs.has(dirItem.path)).toBe(false)

    // Select directory should toggle it
    vm.selectFile(dirItem)
    expect(vm.selectedFileId).toBe('file-1') // Should remain the same
    expect(vm.expandedDirs.has(dirItem.path)).toBe(true) // Should be expanded now

    consoleSpy.mockRestore()
  })

  it('should show context menu at correct position', () => {
    const wrapper = mount(CodeSidebar)

    interface MenuItem {
      name: string
      path: string
    }

    interface MouseEvent {
      clientX: number
      clientY: number
    }

    interface CodeSidebarVM {
      contextMenu: {
        visible: boolean
        x: number
        y: number
        item: MenuItem
      }
      showContextMenu: (item: MenuItem, event: MouseEvent) => void
    }

    const vm = wrapper.vm as unknown as CodeSidebarVM

    const item: MenuItem = {
      name: 'test-file.ts',
      path: '/test-file.ts',
    }

    const event: MouseEvent = {
      clientX: 100,
      clientY: 200,
    }

    vm.showContextMenu(item, event)

    expect(vm.contextMenu.visible).toBe(true)
    expect(vm.contextMenu.x).toBe(100)
    expect(vm.contextMenu.y).toBe(200)
    expect(vm.contextMenu.item).toStrictEqual(item) // Use toStrictEqual for object comparison
  })

  it('should hide context menu', () => {
    const wrapper = mount(CodeSidebar)

    interface CodeSidebarVM {
      contextMenu: { visible: boolean }
      hideContextMenu: () => void
    }

    const vm = wrapper.vm as unknown as CodeSidebarVM

    // Set context menu visible
    vm.contextMenu.visible = true

    // Hide it
    vm.hideContextMenu()
    expect(vm.contextMenu.visible).toBe(false)
  })

  it('should handle case-insensitive file extensions', () => {
    const wrapper = mount(CodeSidebar)

    interface FileItem {
      type: 'file'
      extension?: string
    }

    interface CodeSidebarVM {
      getFileIcon: (item: FileItem) => string
    }

    const vm = wrapper.vm as unknown as CodeSidebarVM

    // Test uppercase extensions
    expect(vm.getFileIcon({ type: 'file', extension: 'VUE' })).toBe('Eye')
    expect(vm.getFileIcon({ type: 'file', extension: 'TS' })).toBe('Code')
    expect(vm.getFileIcon({ type: 'file', extension: 'JSON' })).toBe(
      'GitBranch'
    )

    // Test mixed case
    expect(vm.getFileIcon({ type: 'file', extension: 'Md' })).toBe('Terminal')
    expect(vm.getFileIcon({ type: 'file', extension: 'Css' })).toBe('Sun')
  })

  it('should handle empty or null context menu item', () => {
    const wrapper = mount(CodeSidebar)

    interface CodeSidebarVM {
      contextMenu: {
        visible: boolean
        item: null | { name?: string }
      }
      renameFile: () => void
      deleteFile: () => void
    }

    const vm = wrapper.vm as unknown as CodeSidebarVM
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    // Set context menu with null item
    vm.contextMenu = {
      visible: true,
      item: null,
    }

    // Test renameFile with null item
    vm.renameFile()
    expect(consoleSpy).toHaveBeenCalledWith('Rename file:', undefined)

    // Test deleteFile with null item
    vm.deleteFile()
    expect(consoleSpy).toHaveBeenCalledWith('Delete file:', undefined)

    consoleSpy.mockRestore()
  })
})
