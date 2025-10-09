/**
 * @fileoverview Comprehensive tests for GitTimelineView component
 *
 * @description
 * Achieves 100% code coverage for GitTimelineView.vue by testing all
 * functionality including timeline events, git integration, and diff viewing.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper, flushPromises } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import GitTimelineView from './GitTimelineView.vue'
import DualColumnDiffViewer from '../components/organisms/DualColumnDiffViewer.vue'

// Mock composables
const mockSelectedFile = ref<string | null>(null)
const mockSelectedFileContext = ref<'changes' | 'history'>('changes')
const mockSelectedCommitHash = ref<string | null>(null)
const mockSelectedCommitIndex = ref(0)
const mockSelectFile = vi.fn()
const mockSelectCommit = vi.fn()

const mockProjectRoot = ref<string | null>(null)
const mockIsProjectLoaded = ref(false)

const mockGetFileDiff = vi.fn()
const mockGetCommitHistory = vi.fn()
const mockGetGitStatus = vi.fn()

vi.mock('../composables/useTimelineEvents', () => ({
  useTimelineEvents: () => ({
    selectedFile: mockSelectedFile,
    selectedFileContext: mockSelectedFileContext,
    selectedCommitHash: mockSelectedCommitHash,
    selectedCommitIndex: mockSelectedCommitIndex,
    selectFile: mockSelectFile,
    selectCommit: mockSelectCommit,
  }),
}))

vi.mock('../composables/useProjectContext', () => ({
  useProjectContext: () => ({
    projectRoot: mockProjectRoot,
    isProjectLoaded: mockIsProjectLoaded,
  }),
}))

vi.mock('../composables/useGitIntegration', () => ({
  useGitIntegration: () => ({
    getFileDiff: mockGetFileDiff,
    getCommitHistory: mockGetCommitHistory,
    getGitStatus: mockGetGitStatus,
  }),
}))

// Mock console methods
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Test variable not used in this scenario
const _originalConsoleLog = console.log
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Test variable not used in this scenario
const _originalConsoleError = console.error
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Test variable not used in this scenario
const _originalConsoleWarn = console.warn

describe('GitTimelineView', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
  let wrapper: VueWrapper<any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
  let consoleLogSpy: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
  let consoleErrorSpy: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
  let consoleWarnSpy: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Reset refs
    mockSelectedFile.value = null
    mockSelectedFileContext.value = 'changes'
    mockSelectedCommitHash.value = null
    mockSelectedCommitIndex.value = 0
    mockProjectRoot.value = null
    mockIsProjectLoaded.value = false

    // Setup console spies
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    // Setup default mock returns
    mockGetFileDiff.mockResolvedValue({
      oldContent: 'old content',
      newContent: 'new content',
      hunks: [
        {
          oldStart: 1,
          oldLines: 1,
          newStart: 1,
          newLines: 1,
          lines: [],
        },
      ],
    })

    mockGetCommitHistory.mockResolvedValue([
      {
        hash: 'abc123',
        shortHash: 'abc123',
        message: 'Test commit',
        author: 'Test Author',
        parents: [],
        filesChanged: 1,
        linesAdded: 10,
        linesDeleted: 5,
      },
    ])

    mockGetGitStatus.mockResolvedValue([
      { path: 'test.ts', status: 'modified' },
    ])
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
    consoleErrorSpy.mockRestore()
    consoleWarnSpy.mockRestore()
    if (wrapper) {
      wrapper.unmount()
    }
  })

  const createWrapper = () => {
    return mount(GitTimelineView, {
      global: {
        components: {
          DualColumnDiffViewer,
        },
        stubs: {
          DualColumnDiffViewer: {
            template: `
              <div class="webgl-diff-viewer-stub"
                   :current-file="currentFile"
                   :current-commit-index="String(currentCommitIndex)"
                   :is-loading="String(isLoading)"
                   :has-changed-files="String(hasChangedFiles)"
                   :total-changed-files="String(totalChangedFiles)">
                <slot />
              </div>
            `,
            props: [
              'currentFile',
              'commits',
              'currentCommitIndex',
              'diffData',
              'isLoading',
              'oldVersion',
              'newVersion',
              'hasChangedFiles',
              'totalChangedFiles',
            ],
            emits: ['navigate-to-commit', 'file-selected', 'request-diff'],
          },
        },
      },
    })
  }

  describe('Component Rendering', () => {
    it('should render the component structure', () => {
      wrapper = createWrapper()

      expect(wrapper.find('.git-timeline-view').exists()).toBe(true)
      expect(wrapper.find('.timeline-content-container').exists()).toBe(true)
      expect(
        wrapper.findComponent({ name: 'DualColumnDiffViewer' }).exists()
      ).toBe(false) // It's stubbed
      expect(wrapper.find('.webgl-diff-viewer-stub').exists()).toBe(true)
    })

    it('should pass correct props to DualColumnDiffViewer', async () => {
      wrapper = createWrapper()

      // Set some test data
      mockSelectedFile.value = 'test.ts'
      mockSelectedCommitIndex.value = 2
      await nextTick()

      const diffViewer = wrapper.find('.webgl-diff-viewer-stub')

      // Check the attributes directly on the stub element
      // Vue Test Utils converts props to kebab-case attributes on stubs
      expect(diffViewer.attributes('current-file')).toBe('test.ts')
      expect(diffViewer.attributes('current-commit-index')).toBe('2')
      expect(diffViewer.attributes('is-loading')).toBe('false')
      expect(diffViewer.attributes('has-changed-files')).toBe('false')
      expect(diffViewer.attributes('total-changed-files')).toBe('0')
    })
  })

  describe('Commit History Loading', () => {
    it('should load commit history when project is loaded', async () => {
      wrapper = createWrapper()

      // Set project as loaded
      mockProjectRoot.value = '/test/project'
      mockIsProjectLoaded.value = true
      await flushPromises()

      expect(mockGetCommitHistory).toHaveBeenCalledWith('/test/project', 25)
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[GitTimelineView] Loading real commit history'
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[GitTimelineView] Loaded 1 commits'
      )
    })

    it('should handle commit history loading error', async () => {
      mockGetCommitHistory.mockRejectedValueOnce(new Error('Git error'))
      wrapper = createWrapper()

      mockProjectRoot.value = '/test/project'
      mockIsProjectLoaded.value = true
      await flushPromises()

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[GitTimelineView] Failed to load commit history:',
        expect.any(Error)
      )
    })

    it('should not load commit history if project is not loaded', async () => {
      wrapper = createWrapper()

      mockProjectRoot.value = null
      mockIsProjectLoaded.value = false
      await flushPromises()

      expect(mockGetCommitHistory).not.toHaveBeenCalled()
    })

    it('should not load commit history if only projectRoot is missing', async () => {
      wrapper = createWrapper()

      mockProjectRoot.value = null
      mockIsProjectLoaded.value = true
      await flushPromises()

      expect(mockGetCommitHistory).not.toHaveBeenCalled()
    })
  })

  describe('File Selection', () => {
    it('should handle file selection and request diff', async () => {
      wrapper = createWrapper()

      // Setup commit history
      const commits = [
        {
          hash: 'commit1',
          shortHash: 'commit1',
          message: 'First commit',
          author: 'Author',
          parents: [],
          filesChanged: 1,
          linesAdded: 10,
          linesDeleted: 5,
        },
      ]
      mockGetCommitHistory.mockResolvedValueOnce(commits)

      mockProjectRoot.value = '/test/project'
      mockIsProjectLoaded.value = true
      await flushPromises()

      // Call handleFileSelection directly
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const vm = wrapper.vm as any
      await vm.handleFileSelection('test.ts')

      expect(mockGetFileDiff).toHaveBeenCalledWith(
        '/test/project',
        'test.ts',
        'commit1'
      )
    })

    it('should auto-select first changed file on mount', async () => {
      mockProjectRoot.value = '/test/project'
      mockIsProjectLoaded.value = true
      mockGetGitStatus.mockResolvedValueOnce([
        { path: 'first.ts', status: 'modified' },
        { path: 'second.ts', status: 'added' },
      ])

      wrapper = createWrapper()
      await flushPromises()

      expect(mockSelectFile).toHaveBeenCalledWith('first.ts', 'changes')
      expect(mockGetFileDiff).toHaveBeenCalledWith(
        '/test/project',
        'first.ts',
        null
      )
    })

    it('should not auto-select if file already selected', async () => {
      mockSelectedFile.value = 'existing.ts'
      mockProjectRoot.value = '/test/project'
      mockIsProjectLoaded.value = true

      wrapper = createWrapper()
      await flushPromises()

      expect(mockSelectFile).not.toHaveBeenCalled()
    })

    it('should handle empty changed files list', async () => {
      mockProjectRoot.value = '/test/project'
      mockIsProjectLoaded.value = true
      mockGetGitStatus.mockResolvedValueOnce([])

      wrapper = createWrapper()
      await flushPromises()

      expect(mockSelectFile).not.toHaveBeenCalled()
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[GitTimelineView] onMounted: No files with changes'
      )
    })

    it('should handle git status as object with files property', async () => {
      mockProjectRoot.value = '/test/project'
      mockIsProjectLoaded.value = true
      mockGetGitStatus.mockResolvedValueOnce({
        files: [{ path: 'object.ts', status: 'modified' }],
      })

      wrapper = createWrapper()
      await flushPromises()

      expect(mockSelectFile).toHaveBeenCalledWith('object.ts', 'changes')
    })

    it('should handle git status error', async () => {
      mockProjectRoot.value = '/test/project'
      mockIsProjectLoaded.value = true
      mockGetGitStatus.mockRejectedValueOnce(new Error('Git status error'))

      wrapper = createWrapper()
      await flushPromises()

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[GitTimelineView] onMounted: Failed to load status:',
        expect.any(Error)
      )
    })
  })

  describe('Commit Navigation', () => {
    it('should handle commit navigation', async () => {
      wrapper = createWrapper()

      const commits = [
        { hash: 'commit1', shortHash: 'c1' },
        { hash: 'commit2', shortHash: 'c2' },
        { hash: 'commit3', shortHash: 'c3' },
      ]
      mockGetCommitHistory.mockResolvedValueOnce(commits)

      mockProjectRoot.value = '/test/project'
      mockIsProjectLoaded.value = true
      await flushPromises()

      // Get VM and call handleCommitNavigation directly
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const vm = wrapper.vm as any
      vm.handleCommitNavigation(1)

      // Check timeline state was updated
      expect(vm.timelineState.currentCommit).toBe(1)
    })

    it('should not navigate to invalid commit index', async () => {
      wrapper = createWrapper()

      const commits = [{ hash: 'commit1', shortHash: 'c1' }]
      mockGetCommitHistory.mockResolvedValueOnce(commits)

      mockProjectRoot.value = '/test/project'
      mockIsProjectLoaded.value = true
      await flushPromises()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const vm = wrapper.vm as any
      const initialCommit = vm.timelineState.currentCommit

      // Try to navigate to invalid index
      const diffViewer = wrapper.find('.webgl-diff-viewer-stub')
      await diffViewer.trigger('navigate-to-commit', -1)
      expect(vm.timelineState.currentCommit).toBe(initialCommit)

      await diffViewer.trigger('navigate-to-commit', 10)
      expect(vm.timelineState.currentCommit).toBe(initialCommit)
    })
  })

  describe('Diff Request Handling', () => {
    it('should handle diff request for working tree changes', async () => {
      wrapper = createWrapper()

      mockProjectRoot.value = '/test/project'
      mockIsProjectLoaded.value = true
      await nextTick()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const vm = wrapper.vm as any
      await vm.handleDiffRequest(null, 'test.ts')
      await flushPromises()

      expect(mockGetFileDiff).toHaveBeenCalledWith(
        '/test/project',
        'test.ts',
        null
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[GitTimelineView] Getting real diff for test.ts (working tree)'
      )
    })

    it('should handle diff request for specific commit', async () => {
      wrapper = createWrapper()

      mockProjectRoot.value = '/test/project'
      mockIsProjectLoaded.value = true
      await nextTick()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const vm = wrapper.vm as any
      await vm.handleDiffRequest('abc123', 'test.ts')

      expect(mockGetFileDiff).toHaveBeenCalledWith(
        '/test/project',
        'test.ts',
        'abc123'
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[GitTimelineView] Getting real diff for test.ts at abc123'
      )
    })

    it('should handle diff request error', async () => {
      // Override the default mock with a rejection
      mockGetFileDiff.mockImplementation(() =>
        Promise.reject(new Error('Diff error'))
      )

      wrapper = createWrapper()

      mockProjectRoot.value = '/test/project'
      mockIsProjectLoaded.value = true
      await nextTick()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const vm = wrapper.vm as any

      // Set initial value to verify it gets cleared
      vm.currentDiff = { oldFile: 'test', newFile: 'test' }

      await vm.handleDiffRequest(null, 'test.ts')
      await flushPromises()

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[GitTimelineView] Failed to load diff data:',
        expect.any(Error)
      )

      // Verify currentDiff is set to null after error
      expect(vm.currentDiff).toBeNull()

      // Restore the default mock for other tests
      mockGetFileDiff.mockResolvedValue({
        oldContent: 'old content',
        newContent: 'new content',
        hunks: [
          {
            oldStart: 1,
            oldLines: 1,
            newStart: 1,
            newLines: 1,
            lines: [],
          },
        ],
      })
    })

    it('should warn when no project is loaded for diff request', async () => {
      wrapper = createWrapper()

      mockProjectRoot.value = null
      mockIsProjectLoaded.value = false

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const vm = wrapper.vm as any
      await vm.handleDiffRequest(null, 'test.ts')

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[GitTimelineView] No project loaded, cannot generate diff'
      )
      expect(mockGetFileDiff).not.toHaveBeenCalled()
    })

    it('should set loading state during diff request', async () => {
      wrapper = createWrapper()

      mockProjectRoot.value = '/test/project'
      mockIsProjectLoaded.value = true
      await nextTick()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const vm = wrapper.vm as any
      expect(vm.isDiffLoading).toBe(false)

      // Setup a delayed response
      mockGetFileDiff.mockImplementation(
        () =>
          new Promise((resolve) => setTimeout(() => resolve({ hunks: [] }), 10))
      )

      // Start the request without awaiting
      const diffPromise = vm.handleDiffRequest(null, 'test.ts')

      // Check loading state immediately
      expect(vm.isDiffLoading).toBe(true)

      // Wait for request to complete
      await diffPromise
      await flushPromises()
      expect(vm.isDiffLoading).toBe(false)
    })
  })

  describe('Watchers', () => {
    it('should handle file selection from changes context', async () => {
      wrapper = createWrapper()

      mockProjectRoot.value = '/test/project'
      mockIsProjectLoaded.value = true
      await nextTick()

      // Simulate sidebar selection
      mockSelectedFile.value = 'watched.ts'
      mockSelectedFileContext.value = 'changes'
      await nextTick()
      await flushPromises()

      expect(mockGetFileDiff).toHaveBeenCalledWith(
        '/test/project',
        'watched.ts',
        null
      )
    })

    it('should handle file selection from history context', async () => {
      wrapper = createWrapper()

      mockProjectRoot.value = '/test/project'
      mockIsProjectLoaded.value = true
      await nextTick()

      // Simulate sidebar selection
      mockSelectedFile.value = 'history.ts'
      mockSelectedFileContext.value = 'history'
      mockSelectedCommitHash.value = 'hash123'
      await nextTick()
      await flushPromises()

      expect(mockGetFileDiff).toHaveBeenCalledWith(
        '/test/project',
        'history.ts',
        'hash123'
      )
    })

    it('should not request diff without commit hash in history context', async () => {
      wrapper = createWrapper()

      mockProjectRoot.value = '/test/project'
      mockIsProjectLoaded.value = true
      await nextTick()

      // Clear any previous calls
      mockGetFileDiff.mockClear()

      // Simulate sidebar selection without commit hash
      mockSelectedFile.value = 'history.ts'
      mockSelectedFileContext.value = 'history'
      mockSelectedCommitHash.value = null
      await nextTick()
      await flushPromises()

      expect(mockGetFileDiff).not.toHaveBeenCalled()
    })

    it('should update commit selection when timeline state changes', async () => {
      wrapper = createWrapper()

      const commits = [
        { hash: 'commit1', shortHash: 'c1' },
        { hash: 'commit2', shortHash: 'c2' },
      ]
      mockGetCommitHistory.mockResolvedValueOnce(commits)

      mockProjectRoot.value = '/test/project'
      mockIsProjectLoaded.value = true
      await flushPromises()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const vm = wrapper.vm as any

      // Change timeline state
      vm.timelineState.currentCommit = 1
      await nextTick()

      expect(mockSelectCommit).toHaveBeenCalledWith('commit2', 1)
    })

    it('should not update commit selection if index matches', async () => {
      wrapper = createWrapper()

      mockProjectRoot.value = '/test/project'
      mockIsProjectLoaded.value = true
      mockSelectedCommitIndex.value = 1
      await flushPromises()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const vm = wrapper.vm as any
      mockSelectCommit.mockClear()

      // Set same index
      vm.timelineState.currentCommit = 1
      await nextTick()

      expect(mockSelectCommit).not.toHaveBeenCalled()
    })

    it('should auto-select first commit when history loads', async () => {
      wrapper = createWrapper()

      const commits = [
        { hash: 'firstcommit', shortHash: 'fc' },
        { hash: 'secondcommit', shortHash: 'sc' },
      ]
      mockGetCommitHistory.mockResolvedValueOnce(commits)

      mockProjectRoot.value = '/test/project'
      mockIsProjectLoaded.value = true
      await flushPromises()

      expect(mockSelectCommit).toHaveBeenCalledWith('firstcommit', 0)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const vm = wrapper.vm as any
      expect(vm.timelineState.currentCommit).toBe(0)
      expect(vm.timelineState.totalCommits).toBe(2)
    })

    it('should handle project loading in watch', async () => {
      wrapper = createWrapper()

      // Simulate project loading after component mount
      await nextTick()

      mockProjectRoot.value = '/test/project'
      mockIsProjectLoaded.value = true
      await flushPromises()

      expect(mockGetCommitHistory).toHaveBeenCalledWith('/test/project', 25)
      expect(mockGetGitStatus).toHaveBeenCalledWith('/test/project')
    })

    it('should not load when only projectRoot changes', async () => {
      wrapper = createWrapper()

      mockProjectRoot.value = '/test/project'
      mockIsProjectLoaded.value = false
      await flushPromises()

      expect(mockGetCommitHistory).not.toHaveBeenCalled()
      expect(mockGetGitStatus).not.toHaveBeenCalled()
    })
  })

  describe('Computed Properties', () => {
    it('should compute changedFilesCount', async () => {
      wrapper = createWrapper()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const vm = wrapper.vm as any
      expect(vm.changedFilesCount).toBe(0)

      vm.changedFiles = [
        { path: 'file1.ts', status: 'modified' },
        { path: 'file2.ts', status: 'added' },
      ]
      await nextTick()

      expect(vm.changedFilesCount).toBe(2)
    })

    it('should compute oldVersionLabel with commits', async () => {
      wrapper = createWrapper()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const vm = wrapper.vm as any
      vm.commitHistory = [{ shortHash: 'abc123' }, { shortHash: 'def456' }]

      // Index 0 should show Working Directory
      vm.selectedCommitIndex = 0
      await nextTick()
      expect(vm.oldVersionLabel).toBe('Working Directory')

      // Index 1 should show previous commit
      mockSelectedCommitIndex.value = 1
      await nextTick()
      expect(vm.oldVersionLabel).toBe('abc123')
    })

    it('should compute oldVersionLabel without commits', async () => {
      wrapper = createWrapper()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const vm = wrapper.vm as any
      vm.commitHistory = []

      expect(vm.oldVersionLabel).toBe('Previous')
    })

    it('should compute newVersionLabel with commits', async () => {
      wrapper = createWrapper()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const vm = wrapper.vm as any
      vm.commitHistory = [{ shortHash: 'abc123' }, { shortHash: 'def456' }]

      // Index 0 should show Working Directory
      vm.selectedCommitIndex = 0
      await nextTick()
      expect(vm.newVersionLabel).toBe('Working Directory')

      // Index 1 should show current commit
      mockSelectedCommitIndex.value = 1
      await nextTick()
      expect(vm.newVersionLabel).toBe('def456')
    })

    it('should compute newVersionLabel without commits', async () => {
      wrapper = createWrapper()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const vm = wrapper.vm as any
      vm.commitHistory = []

      expect(vm.newVersionLabel).toBe('Current')
    })

    it('should handle missing commit in oldVersionLabel', async () => {
      wrapper = createWrapper()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const vm = wrapper.vm as any
      vm.commitHistory = [{ shortHash: 'abc123' }]
      mockSelectedCommitIndex.value = 2 // Out of bounds

      await nextTick()
      expect(vm.oldVersionLabel).toBe('Previous')
    })

    it('should handle missing commit in newVersionLabel', async () => {
      wrapper = createWrapper()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const vm = wrapper.vm as any
      vm.commitHistory = [{ shortHash: 'abc123' }]
      mockSelectedCommitIndex.value = 2 // Out of bounds

      await nextTick()
      expect(vm.newVersionLabel).toBe('Current')
    })
  })

  describe('onMounted Lifecycle', () => {
    it('should log mount information', async () => {
      wrapper = createWrapper()
      await flushPromises()

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[GitTimelineView] Component mounted'
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[GitTimelineView] isProjectLoaded:',
        false
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[GitTimelineView] projectRoot:',
        null
      )
    })

    it('should handle already loaded project on mount', async () => {
      mockProjectRoot.value = '/test/project'
      mockIsProjectLoaded.value = true
      mockGetGitStatus.mockResolvedValueOnce({
        files: [{ path: 'mounted.ts', status: 'modified' }],
      })

      wrapper = createWrapper()
      await flushPromises()

      expect(mockGetCommitHistory).toHaveBeenCalled()
      expect(mockGetGitStatus).toHaveBeenCalled()
      expect(mockSelectFile).toHaveBeenCalledWith('mounted.ts', 'changes')
      expect(mockGetFileDiff).toHaveBeenCalledWith(
        '/test/project',
        'mounted.ts',
        null
      )
    })

    it('should handle mount with no changes', async () => {
      mockProjectRoot.value = '/test/project'
      mockIsProjectLoaded.value = true
      mockGetGitStatus.mockResolvedValueOnce({ files: [] })

      wrapper = createWrapper()
      await flushPromises()

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[GitTimelineView] onMounted: No files with changes'
      )
    })

    it('should handle mount git status error', async () => {
      mockProjectRoot.value = '/test/project'
      mockIsProjectLoaded.value = true
      mockGetGitStatus.mockRejectedValueOnce(new Error('Mount error'))

      wrapper = createWrapper()
      await flushPromises()

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[GitTimelineView] onMounted: Failed to load status:',
        expect.any(Error)
      )
    })

    it('should log when project not loaded on mount', async () => {
      mockProjectRoot.value = null
      mockIsProjectLoaded.value = false

      wrapper = createWrapper()
      await flushPromises()

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[GitTimelineView] onMounted: Project not loaded yet, waiting for watch'
      )
    })

    it('should not auto-select if file already selected on mount', async () => {
      mockSelectedFile.value = 'already-selected.ts'
      mockProjectRoot.value = '/test/project'
      mockIsProjectLoaded.value = true
      mockGetGitStatus.mockResolvedValueOnce([
        { path: 'other.ts', status: 'modified' },
      ])

      wrapper = createWrapper()
      await flushPromises()

      expect(mockSelectFile).not.toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('should handle null diff data gracefully', async () => {
      // Override the default mock with null return
      mockGetFileDiff.mockImplementation(() => Promise.resolve(null))

      wrapper = createWrapper()

      mockProjectRoot.value = '/test/project'
      mockIsProjectLoaded.value = true
      await nextTick()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const vm = wrapper.vm as any

      // Set initial value to verify it changes
      vm.currentDiff = { oldFile: 'test', newFile: 'test' }

      await vm.handleDiffRequest(null, 'test.ts')
      await flushPromises()

      // Verify currentDiff is set to null (the null value from the API)
      expect(vm.currentDiff).toBeNull()

      // Verify the log was called with 0 hunks (since null has no hunks)
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[GitTimelineView] Loaded diff with 0 hunks'
      )

      // Restore the default mock for other tests
      mockGetFileDiff.mockResolvedValue({
        oldContent: 'old content',
        newContent: 'new content',
        hunks: [
          {
            oldStart: 1,
            oldLines: 1,
            newStart: 1,
            newLines: 1,
            lines: [],
          },
        ],
      })
    })

    it('should handle diff with no hunks', async () => {
      mockGetFileDiff.mockResolvedValueOnce({ hunks: undefined })
      wrapper = createWrapper()

      mockProjectRoot.value = '/test/project'
      mockIsProjectLoaded.value = true
      await nextTick()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const vm = wrapper.vm as any
      await vm.handleDiffRequest(null, 'test.ts')
      await flushPromises()

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[GitTimelineView] Loaded diff with 0 hunks'
      )
    })

    it('should handle invalid commit in timeline state change', async () => {
      wrapper = createWrapper()

      mockProjectRoot.value = '/test/project'
      mockIsProjectLoaded.value = true
      await flushPromises()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const vm = wrapper.vm as any
      vm.commitHistory = []
      mockSelectCommit.mockClear()

      // Try to change to non-existent commit
      vm.timelineState.currentCommit = 5
      await nextTick()

      expect(mockSelectCommit).not.toHaveBeenCalled()
    })

    it('should handle git status returning null', async () => {
      mockProjectRoot.value = '/test/project'
      mockIsProjectLoaded.value = true
      mockGetGitStatus.mockResolvedValueOnce(null)

      wrapper = createWrapper()
      await flushPromises()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const vm = wrapper.vm as any
      expect(vm.changedFiles).toEqual([])
      expect(mockSelectFile).not.toHaveBeenCalled()
    })

    it('should log diff data when set', async () => {
      wrapper = createWrapper()

      mockProjectRoot.value = '/test/project'
      mockIsProjectLoaded.value = true
      await nextTick()

      const diffData = { hunks: [{ lines: [] }] }
      mockGetFileDiff.mockResolvedValueOnce(diffData)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const vm = wrapper.vm as any
      await vm.handleDiffRequest(null, 'test.ts')
      await flushPromises()

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[GitTimelineView] Diff data set, currentDiff:',
        diffData
      )
    })
  })
})
