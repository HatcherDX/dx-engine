/**
 * @fileoverview Comprehensive test suite for FileExplorer component.
 *
 * @description
 * Tests all functionality of the FileExplorer component including file selection,
 * context menus, Git-specific features, directory expansion, and event handling.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { mount, VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import type { FileItem, FileAction } from './FileExplorer.vue'
import FileExplorer from './FileExplorer.vue'

// Component instance interface for testing
interface FileExplorerInstance {
  handleStageChange: (file: FileItem) => void
  toggleExpanded: (file: FileItem) => void
  selectFile: (file: FileItem) => void
  showContextMenu: (file: FileItem, event: MouseEvent) => void
  hideContextMenu: () => void
  performAction: (action: FileAction, file: FileItem | null) => void
  getFileIcon: (file: FileItem) => string
  getStatusClass: (file: FileItem) => string
  getContextActions: (file: FileItem | null) => FileAction[]
}

// Mock BaseIcon component
vi.mock('../atoms/BaseIcon.vue', () => ({
  default: {
    name: 'BaseIcon',
    template: '<div data-testid="base-icon"><slot /></div>',
  },
}))

describe('FileExplorer', () => {
  let wrapper: VueWrapper<InstanceType<typeof FileExplorer>>

  const mockFiles: FileItem[] = [
    {
      id: 'src',
      name: 'src',
      path: '/src',
      type: 'directory',
      depth: 0,
      expanded: false,
    },
    {
      id: 'index-ts',
      name: 'index.ts',
      path: '/src/index.ts',
      type: 'file',
      depth: 1,
      status: 'modified',
      staged: false,
      additions: 5,
      deletions: 2,
    },
    {
      id: 'app-vue',
      name: 'App.vue',
      path: '/App.vue',
      type: 'file',
      depth: 0,
      status: 'added',
      staged: true,
      additions: 10,
      deletions: 0,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Component Initialization', () => {
    it('should mount successfully with files', () => {
      wrapper = mount(FileExplorer, {
        props: {
          files: mockFiles,
          context: 'git-changes',
        },
      })

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('.file-explorer').exists()).toBe(true)
    })

    it('should render all files', () => {
      wrapper = mount(FileExplorer, {
        props: {
          files: mockFiles,
          context: 'git-changes',
        },
      })

      const fileItems = wrapper.findAll('.file-item')
      expect(fileItems).toHaveLength(3)
    })

    it('should apply context class', () => {
      wrapper = mount(FileExplorer, {
        props: {
          files: mockFiles,
          context: 'git-changes',
        },
      })

      expect(wrapper.find('.file-explorer').classes()).toContain(
        'context-git-changes'
      )
    })
  })

  describe('File Display', () => {
    beforeEach(() => {
      wrapper = mount(FileExplorer, {
        props: {
          files: mockFiles,
          context: 'git-changes',
        },
      })
    })

    it('should display file names correctly', () => {
      const fileItems = wrapper.findAll('.file-item')

      expect(fileItems[0].find('.file-name').text()).toBe('src')
      expect(fileItems[1].find('.file-name').text()).toBe('index.ts')
      expect(fileItems[2].find('.file-name').text()).toBe('App.vue')
    })

    it('should apply selected class to selected file', () => {
      wrapper = mount(FileExplorer, {
        props: {
          files: mockFiles,
          context: 'git-changes',
          selectedFileId: 'index-ts', // Select the second file (index 1)
        },
      })

      const selectedFile = wrapper.findAll('.file-item')[1]
      expect(selectedFile.classes()).toContain('file-selected')
    })

    it('should apply correct status classes', () => {
      const fileItems = wrapper.findAll('.file-item')

      expect(fileItems[1].classes()).toContain('file-modified')
      expect(fileItems[2].classes()).toContain('file-added')
      expect(fileItems[2].classes()).toContain('file-staged')
    })

    it('should apply correct depth padding', () => {
      const fileItems = wrapper.findAll('.file-item')

      expect(fileItems[0].attributes('style')).toContain('padding-left: 8px')
      expect(fileItems[1].attributes('style')).toContain('padding-left: 24px')
    })
  })

  describe('Git Context Features', () => {
    beforeEach(() => {
      wrapper = mount(FileExplorer, {
        props: {
          files: mockFiles,
          context: 'git-changes',
        },
      })
    })

    it('should show checkboxes for git files', () => {
      const checkboxes = wrapper.findAll('input[type="checkbox"]')
      expect(checkboxes).toHaveLength(2) // Only files, not directories
    })

    it('should reflect staging status in checkboxes', () => {
      const checkboxes = wrapper.findAll('input[type="checkbox"]')

      expect((checkboxes[0].element as HTMLInputElement).checked).toBe(false) // index.ts - not staged
      expect((checkboxes[1].element as HTMLInputElement).checked).toBe(true) // App.vue - staged
    })

    it('should emit stageChanged when checkbox changes', async () => {
      // Use direct method call instead of trigger
      const vm = wrapper.vm as unknown as FileExplorerInstance
      mockFiles[1].staged = true
      vm.handleStageChange(mockFiles[1])
      await nextTick()

      expect(wrapper.emitted('stageChanged')).toBeTruthy()
      const emittedEvents = wrapper.emitted('stageChanged')
      expect(emittedEvents?.[0]).toEqual([mockFiles[1], true])
    })

    it('should display change stats for modified files', () => {
      const changeStats = wrapper.findAll('.change-stats')
      expect(changeStats).toHaveLength(2)

      expect(changeStats[0].find('.additions').text()).toBe('+5')
      expect(changeStats[0].find('.deletions').text()).toBe('-2')

      expect(changeStats[1].find('.additions').text()).toBe('+10')
      expect(changeStats[1].find('.deletions').exists()).toBe(false)
    })
  })

  describe('Directory Expansion', () => {
    beforeEach(() => {
      wrapper = mount(FileExplorer, {
        props: {
          files: mockFiles,
          context: 'git-changes',
        },
      })
    })

    it('should show expand icon for directories', () => {
      const directoryItem = wrapper.findAll('.file-item')[0]
      expect(directoryItem.find('.expand-icon').exists()).toBe(true)
    })

    it('should toggle expanded state on icon click', async () => {
      const expandIcon = wrapper.find('.expand-icon')

      expect(expandIcon.classes()).not.toContain('expanded')

      // Use direct click event instead of trigger
      const vm = wrapper.vm as unknown as FileExplorerInstance
      vm.toggleExpanded(mockFiles[0])
      await nextTick()

      expect(mockFiles[0].expanded).toBe(true)
    })

    it('should show different icons for expanded directories', () => {
      // Set directory as expanded
      mockFiles[0].expanded = true

      wrapper = mount(FileExplorer, {
        props: {
          files: mockFiles,
          context: 'git-changes',
        },
      })

      const expandIcon = wrapper.find('.expand-icon')
      expect(expandIcon.classes()).toContain('expanded')
    })
  })

  describe('File Selection', () => {
    beforeEach(() => {
      wrapper = mount(FileExplorer, {
        props: {
          files: mockFiles,
          context: 'git-changes',
        },
      })
    })

    it('should emit fileSelected when file is clicked', async () => {
      // Use direct method call instead of trigger
      const vm = wrapper.vm as unknown as FileExplorerInstance
      vm.selectFile(mockFiles[1])
      await nextTick()

      expect(wrapper.emitted('fileSelected')).toBeTruthy()
      const emittedEvents = wrapper.emitted('fileSelected')
      expect(emittedEvents?.[0]).toEqual([mockFiles[1]])
    })

    it('should emit fileSelected for directories too', async () => {
      // Use direct method call instead of trigger
      const vm = wrapper.vm as unknown as FileExplorerInstance
      vm.selectFile(mockFiles[0])
      await nextTick()

      expect(wrapper.emitted('fileSelected')).toBeTruthy()
      const emittedEvents = wrapper.emitted('fileSelected')
      expect(emittedEvents?.[0]).toEqual([mockFiles[0]])
    })
  })

  describe('Context Menu', () => {
    beforeEach(() => {
      wrapper = mount(FileExplorer, {
        props: {
          files: mockFiles,
          context: 'git-changes',
        },
      })
    })

    it('should show context menu on right click', async () => {
      // Use direct method call instead of trigger
      const vm = wrapper.vm as unknown as FileExplorerInstance
      const mockEvent = { clientX: 100, clientY: 200 } as MouseEvent
      vm.showContextMenu(mockFiles[1], mockEvent)
      await nextTick()

      expect(wrapper.find('.context-menu').exists()).toBe(true)
    })

    it('should position context menu at mouse coordinates', async () => {
      // Use direct method call instead of trigger
      const vm = wrapper.vm as unknown as FileExplorerInstance
      const mockEvent = { clientX: 100, clientY: 200 } as MouseEvent
      vm.showContextMenu(mockFiles[1], mockEvent)
      await nextTick()

      const contextMenu = wrapper.find('.context-menu')
      expect(contextMenu.attributes('style')).toContain('left: 100px')
      expect(contextMenu.attributes('style')).toContain('top: 200px')
    })

    it('should show git-specific context actions', async () => {
      // Use direct method call instead of trigger
      const vm = wrapper.vm as unknown as FileExplorerInstance
      const mockEvent = { clientX: 100, clientY: 200 } as MouseEvent
      vm.showContextMenu(mockFiles[1], mockEvent)
      await nextTick()

      const contextItems = wrapper.findAll('.context-item')
      expect(contextItems.length).toBeGreaterThan(0)
    })

    it('should hide context menu when clicked', async () => {
      // Use direct method call instead of trigger
      const vm = wrapper.vm as unknown as FileExplorerInstance
      const mockEvent = { clientX: 100, clientY: 200 } as MouseEvent
      vm.showContextMenu(mockFiles[1], mockEvent)
      await nextTick()

      vm.hideContextMenu()
      await nextTick()

      expect(wrapper.find('.context-menu').exists()).toBe(false)
    })

    it('should emit fileAction when context item is clicked', async () => {
      // Use direct method call instead of trigger
      const vm = wrapper.vm as unknown as FileExplorerInstance
      const mockEvent = { clientX: 100, clientY: 200 } as MouseEvent
      vm.showContextMenu(mockFiles[1], mockEvent)
      await nextTick()

      const mockAction = {
        id: 'stage',
        label: 'Stage',
        icon: 'Plus',
        handler: 'stage',
      }
      vm.performAction(mockAction, mockFiles[1])

      expect(wrapper.emitted('fileAction')).toBeTruthy()
    })
  })

  describe('Icon Selection', () => {
    it('should return correct icons for file statuses in git context', () => {
      wrapper = mount(FileExplorer, {
        props: {
          files: [
            { ...mockFiles[1], status: 'added' },
            { ...mockFiles[1], status: 'modified' },
            { ...mockFiles[1], status: 'deleted' },
            { ...mockFiles[1], status: 'renamed' },
          ],
          context: 'git-changes',
        },
      })

      const vm = wrapper.vm as unknown as FileExplorerInstance

      expect(vm.getFileIcon({ ...mockFiles[1], status: 'added' })).toBe('Plus')
      expect(vm.getFileIcon({ ...mockFiles[1], status: 'modified' })).toBe(
        'Circle'
      )
      expect(vm.getFileIcon({ ...mockFiles[1], status: 'deleted' })).toBe('X')
      expect(vm.getFileIcon({ ...mockFiles[1], status: 'renamed' })).toBe(
        'ArrowRight'
      )
    })

    it('should return default icon for unknown status', () => {
      wrapper = mount(FileExplorer, {
        props: {
          files: mockFiles,
          context: 'git-changes',
        },
      })

      const vm = wrapper.vm as unknown as FileExplorerInstance
      expect(vm.getFileIcon({ ...mockFiles[1], status: undefined })).toBe(
        'Code'
      )
    })

    it('should return correct directory icons', () => {
      wrapper = mount(FileExplorer, {
        props: {
          files: mockFiles,
          context: 'git-changes',
        },
      })

      const vm = wrapper.vm as unknown as FileExplorerInstance

      expect(vm.getFileIcon({ ...mockFiles[0], expanded: false })).toBe(
        'ArrowRight'
      )
      expect(vm.getFileIcon({ ...mockFiles[0], expanded: true })).toBe('Menu')
    })
  })

  describe('Context Actions', () => {
    it('should return code context actions', () => {
      wrapper = mount(FileExplorer, {
        props: {
          files: mockFiles,
          context: 'code',
        },
      })

      const vm = wrapper.vm as unknown as FileExplorerInstance
      const actions = vm.getContextActions(mockFiles[1])

      expect(actions).toHaveLength(3)
      expect(actions[0].id).toBe('open')
      expect(actions[1].id).toBe('rename')
      expect(actions[2].id).toBe('delete')
    })

    it('should return git context actions for unstaged file', () => {
      wrapper = mount(FileExplorer, {
        props: {
          files: mockFiles,
          context: 'git-changes',
        },
      })

      const vm = wrapper.vm as unknown as FileExplorerInstance
      const unstagedFile = { ...mockFiles[1], staged: false }
      const actions = vm.getContextActions(unstagedFile)

      expect(actions.some((a: { id: string }) => a.id === 'stage')).toBe(true)
      expect(actions.some((a: { id: string }) => a.id === 'diff')).toBe(true)
      expect(actions.some((a: { id: string }) => a.id === 'discard')).toBe(true)
    })

    it('should return git context actions for staged file', () => {
      wrapper = mount(FileExplorer, {
        props: {
          files: mockFiles,
          context: 'git-changes',
        },
      })

      const vm = wrapper.vm as unknown as FileExplorerInstance
      const stagedFile = { ...mockFiles[2], staged: true }
      const actions = vm.getContextActions(stagedFile)

      expect(actions.some((a: { id: string }) => a.id === 'unstage')).toBe(true)
      expect(actions.some((a: { id: string }) => a.id === 'diff')).toBe(true)
      expect(actions.some((a: { id: string }) => a.id === 'discard')).toBe(true)
    })

    it('should return empty array for null file', () => {
      wrapper = mount(FileExplorer, {
        props: {
          files: mockFiles,
          context: 'git-changes',
        },
      })

      const vm = wrapper.vm as unknown as FileExplorerInstance
      const actions = vm.getContextActions(null)

      expect(actions).toEqual([])
    })

    it('should return empty actions for git-history context', () => {
      wrapper = mount(FileExplorer, {
        props: {
          files: mockFiles,
          context: 'git-history',
        },
      })

      const vm = wrapper.vm as unknown as FileExplorerInstance
      const actions = vm.getContextActions(mockFiles[1])

      expect(actions).toHaveLength(0)
    })
  })

  describe('Status Classes', () => {
    it('should return correct status classes for git context', () => {
      wrapper = mount(FileExplorer, {
        props: {
          files: mockFiles,
          context: 'git-changes',
        },
      })

      const vm = wrapper.vm as unknown as FileExplorerInstance

      expect(vm.getStatusClass({ ...mockFiles[1], status: 'added' })).toBe(
        'status-added'
      )
      expect(vm.getStatusClass({ ...mockFiles[1], status: 'modified' })).toBe(
        'status-modified'
      )
      expect(vm.getStatusClass({ ...mockFiles[1], status: 'deleted' })).toBe(
        'status-deleted'
      )
      expect(vm.getStatusClass({ ...mockFiles[1], status: 'renamed' })).toBe(
        'status-renamed'
      )
    })

    it('should return empty string for non-git context', () => {
      wrapper = mount(FileExplorer, {
        props: {
          files: mockFiles,
          context: 'code',
        },
      })

      const vm = wrapper.vm as unknown as FileExplorerInstance
      expect(vm.getStatusClass(mockFiles[1])).toBe('')
    })

    it('should return empty string for unknown status in git context', () => {
      wrapper = mount(FileExplorer, {
        props: {
          files: mockFiles,
          context: 'git-changes',
        },
      })

      const vm = wrapper.vm as unknown as FileExplorerInstance
      const fileWithUnknownStatus = { ...mockFiles[1], status: undefined }
      expect(vm.getStatusClass(fileWithUnknownStatus)).toBe('')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty files array', () => {
      wrapper = mount(FileExplorer, {
        props: {
          files: [],
          context: 'git-changes',
        },
      })

      expect(wrapper.findAll('.file-item')).toHaveLength(0)
    })

    it('should handle files without depth', () => {
      const filesWithoutDepth = [{ ...mockFiles[0], depth: undefined }]

      wrapper = mount(FileExplorer, {
        props: {
          files: filesWithoutDepth,
          context: 'git-changes',
        },
      })

      const fileItem = wrapper.find('.file-item')
      expect(fileItem.attributes('style')).toContain('padding-left: 8px')
    })

    it('should handle files without git-specific properties', () => {
      const basicFiles: FileItem[] = [
        {
          id: 'basic-file',
          name: 'basic.txt',
          path: '/basic.txt',
          type: 'file' as const,
          depth: 0,
        },
      ]

      wrapper = mount(FileExplorer, {
        props: {
          files: basicFiles,
          context: 'code',
        },
      })

      expect(wrapper.find('.file-item').exists()).toBe(true)
      expect(wrapper.find('.change-stats').exists()).toBe(false)
    })

    it('should handle performAction with null file', () => {
      wrapper = mount(FileExplorer, {
        props: {
          files: mockFiles,
          context: 'git-changes',
        },
      })

      const vm = wrapper.vm as unknown as FileExplorerInstance
      const mockAction = {
        id: 'test',
        label: 'Test',
        icon: 'Code',
        handler: 'test',
      }

      // Should not throw error and should not emit event
      vm.performAction(mockAction, null)
      expect(wrapper.emitted('fileAction')).toBeFalsy()
    })

    it('should handle git-history context', () => {
      wrapper = mount(FileExplorer, {
        props: {
          files: mockFiles,
          context: 'git-history',
        },
      })

      expect(wrapper.find('.file-explorer').classes()).toContain(
        'context-git-history'
      )
      expect(wrapper.find('input[type="checkbox"]').exists()).toBe(false)
    })

    it('should handle files with only additions in git context', () => {
      const filesWithOnlyAdditions: FileItem[] = [
        {
          id: 'added-only',
          name: 'new-file.js',
          path: '/new-file.js',
          type: 'file',
          depth: 0,
          additions: 15,
          deletions: 0, // Explicitly 0
        },
      ]

      wrapper = mount(FileExplorer, {
        props: {
          files: filesWithOnlyAdditions,
          context: 'git-changes',
        },
      })

      const changeStats = wrapper.find('.change-stats')
      expect(changeStats.exists()).toBe(true)
      expect(changeStats.find('.additions').text()).toBe('+15')
      expect(changeStats.find('.deletions').exists()).toBe(false)
    })

    it('should handle files with only deletions in git context', () => {
      const filesWithOnlyDeletions: FileItem[] = [
        {
          id: 'deleted-only',
          name: 'removed-file.js',
          path: '/removed-file.js',
          type: 'file',
          depth: 0,
          additions: 0, // Explicitly 0
          deletions: 10,
        },
      ]

      wrapper = mount(FileExplorer, {
        props: {
          files: filesWithOnlyDeletions,
          context: 'git-changes',
        },
      })

      const changeStats = wrapper.find('.change-stats')
      expect(changeStats.exists()).toBe(true)
      expect(changeStats.find('.additions').exists()).toBe(false)
      expect(changeStats.find('.deletions').text()).toBe('-10')
    })

    it('should not show change stats when no additions or deletions', () => {
      const filesWithNoChanges: FileItem[] = [
        {
          id: 'no-changes',
          name: 'unchanged.js',
          path: '/unchanged.js',
          type: 'file',
          depth: 0,
          additions: 0,
          deletions: 0,
        },
      ]

      wrapper = mount(FileExplorer, {
        props: {
          files: filesWithNoChanges,
          context: 'git-changes',
        },
      })

      expect(wrapper.find('.change-stats').exists()).toBe(false)
    })

    it('should get correct icon for non-git context files', () => {
      wrapper = mount(FileExplorer, {
        props: {
          files: mockFiles,
          context: 'code',
        },
      })

      const vm = wrapper.vm as unknown as FileExplorerInstance
      expect(vm.getFileIcon({ ...mockFiles[1], type: 'file' })).toBe('Code')
    })

    it('should handle files with file.staged as false explicitly', () => {
      const fileWithExplicitFalse: FileItem[] = [
        {
          id: 'explicit-false',
          name: 'explicit.js',
          path: '/explicit.js',
          type: 'file',
          depth: 0,
          staged: false,
        },
      ]

      wrapper = mount(FileExplorer, {
        props: {
          files: fileWithExplicitFalse,
          context: 'git-changes',
        },
      })

      const vm = wrapper.vm as unknown as FileExplorerInstance
      vm.handleStageChange(fileWithExplicitFalse[0])

      expect(wrapper.emitted('stageChanged')).toBeTruthy()
      const emittedEvents = wrapper.emitted('stageChanged')
      expect(emittedEvents?.[0]).toEqual([fileWithExplicitFalse[0], false])
    })
  })

  describe('Event Handling', () => {
    beforeEach(() => {
      wrapper = mount(FileExplorer, {
        props: {
          files: mockFiles,
          context: 'git-changes',
        },
      })
    })

    it('should prevent default on context menu', async () => {
      const fileItem = wrapper.find('.file-item')
      const event = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
      })

      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')
      fileItem.element.dispatchEvent(event)

      expect(preventDefaultSpy).toHaveBeenCalled()
    })

    it('should stop propagation on expand icon click', async () => {
      const expandIcon = wrapper.find('.expand-icon')
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      })

      vi.spyOn(clickEvent, 'stopPropagation')
      expandIcon.element.dispatchEvent(clickEvent)

      // Verify that file selection wasn't triggered
      expect(wrapper.emitted('fileSelected')).toBeFalsy()
    })

    it('should handle file items with directory type CSS class', () => {
      const fileItems = wrapper.findAll('.file-item')
      expect(fileItems[0].classes()).toContain('file-directory') // First item is directory
    })

    it('should handle file items with deleted status', () => {
      const filesWithDeleted: FileItem[] = [
        {
          id: 'deleted-file',
          name: 'deleted.js',
          path: '/deleted.js',
          type: 'file',
          depth: 0,
          status: 'deleted',
        },
      ]

      wrapper = mount(FileExplorer, {
        props: {
          files: filesWithDeleted,
          context: 'git-changes',
        },
      })

      const fileItem = wrapper.find('.file-item')
      expect(fileItem.classes()).toContain('file-deleted')
    })

    it('should trigger file selection when clicking on file item (template click handler)', async () => {
      const fileItem = wrapper.findAll('.file-item')[1] // Second item is a file
      await fileItem.trigger('click')

      expect(wrapper.emitted('fileSelected')).toBeTruthy()
      const emittedEvents = wrapper.emitted('fileSelected')
      expect(emittedEvents?.[0]).toEqual([mockFiles[1]])
    })

    it('should trigger context menu when right-clicking file item', async () => {
      const fileItem = wrapper.findAll('.file-item')[1] // Second item is a file
      await fileItem.trigger('contextmenu')

      await wrapper.vm.$nextTick()
      expect(wrapper.find('.context-menu').exists()).toBe(true)
    })

    it('should trigger checkbox change handler when clicking git checkbox', async () => {
      const checkbox = wrapper.find('input[type="checkbox"]')
      await checkbox.trigger('change')

      expect(wrapper.emitted('stageChanged')).toBeTruthy()
    })

    it('should render all context action items in context menu', async () => {
      // Show context menu first
      const vm = wrapper.vm as unknown as FileExplorerInstance
      const mockEvent = { clientX: 100, clientY: 200 } as MouseEvent
      vm.showContextMenu(mockFiles[1], mockEvent)
      await wrapper.vm.$nextTick()

      // Check that context items are rendered with icons and labels
      const contextItems = wrapper.findAll('.context-item')
      expect(contextItems.length).toBeGreaterThan(0)

      // Each context item should have an icon and span
      contextItems.forEach((item) => {
        expect(item.find('[data-testid="base-icon"]').exists()).toBe(true)
        expect(item.find('span').exists()).toBe(true)
      })
    })

    it('should trigger performAction when clicking context menu item', async () => {
      // Show context menu first
      const vm = wrapper.vm as unknown as FileExplorerInstance
      const mockEvent = { clientX: 100, clientY: 200 } as MouseEvent
      vm.showContextMenu(mockFiles[1], mockEvent)
      await wrapper.vm.$nextTick()

      // Click on a context menu item
      const contextItem = wrapper.find('.context-item')
      await contextItem.trigger('click')

      expect(wrapper.emitted('fileAction')).toBeTruthy()
      expect(wrapper.find('.context-menu').exists()).toBe(false) // Menu should be hidden
    })
  })
})
