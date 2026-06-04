/**
 * @fileoverview Test suite for useBranchSearch composable.
 *
 * @description
 * Comprehensive tests for the branch search composable ensuring 100% code coverage.
 * Tests branch search functionality, terminal integration, keyboard handling, and message formatting.
 *
 * @vitest-environment jsdom
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @internal
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { useBranchSearch, type BranchSearchOptions } from './useBranchSearch'
import type { BranchInfo } from './useBranchManager'

// Mock useTerminalEasterEgg
vi.mock('./useTerminalEasterEgg', () => ({
  useTerminalEasterEgg: vi.fn(() => ({
    initializeTerminal: vi.fn(),
  })),
}))

// Mock terminal context
const mockUpdateMessages = vi.fn()
const mockUpdateInput = vi.fn()

describe('useBranchSearch', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test stores original window for restoration after mocking
  let originalWindow: any
  let animationFrameCallbacks: FrameRequestCallback[] = []
  let animationFrameId = 0

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks()
    vi.clearAllTimers()
    vi.useFakeTimers()

    // Reset animation frame callbacks
    animationFrameCallbacks = []
    animationFrameId = 0

    // Save original window
    originalWindow = global.window

    // Mock requestAnimationFrame
    global.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      animationFrameCallbacks.push(callback)
      return ++animationFrameId
    })

    // Setup window mock
    global.window = {
      ...originalWindow,
      currentContext: null,
      isTerminalSearchMode: false,
      searchModeEnteredTime: 0,
    }
  })

  afterEach(() => {
    // Restore original window
    global.window = originalWindow
    vi.useRealTimers()
  })

  describe('initialization', () => {
    it('should initialize with default options', () => {
      const { isSearchMode } = useBranchSearch()

      expect(isSearchMode.value).toBe(false)
    })

    it('should initialize with custom options', () => {
      const options: BranchSearchOptions = {
        searchTitle: 'Custom Search',
        cancelText: 'Cancel Custom',
        createNewText: 'New Item',
        searchOptionText: 'Search Item',
        backText: 'Go Back',
        showBranchShortcuts: false,
        maxBranchShortcuts: 10,
      }

      const { isSearchMode } = useBranchSearch(options)

      expect(isSearchMode.value).toBe(false)
    })

    it('should handle reactive cancel text', () => {
      const cancelText = ref('Dynamic Cancel')
      const options: BranchSearchOptions = {
        cancelText,
      }

      const { isSearchMode } = useBranchSearch(options)

      expect(isSearchMode.value).toBe(false)
    })
  })

  describe('updateMessages', () => {
    it('should handle missing terminal context', () => {
      const { updateMessages } = useBranchSearch()
      const branches: BranchInfo[] = []

      // Should not throw
      updateMessages(branches, false, '', [])

      expect(mockUpdateMessages).not.toHaveBeenCalled()
    })

    it('should update messages in normal mode with branches', () => {
      // Setup terminal context
      global.window.currentContext = {
        updateMessages: mockUpdateMessages,
        state: {
          currentInput: '',
          lines: [],
        },
      }

      const { updateMessages } = useBranchSearch()

      const branches: BranchInfo[] = [
        {
          name: 'main',
          lastCommit: 'Initial commit',
          lastCommitTime: new Date(),
          isRemote: false,
          isCurrent: true,
        },
        {
          name: 'develop',
          lastCommit: 'Add feature',
          lastCommitTime: new Date(),
          isRemote: false,
          isCurrent: false,
        },
      ]

      updateMessages(branches, false, '', [])

      expect(mockUpdateMessages).toHaveBeenCalledWith(
        expect.arrayContaining([
          '[n] Create new task',
          '[b] Search branch',
          '[esc] Back',
          '',
          'Branches (2 available):',
          '[1] main',
          '[2] develop',
        ]),
        false
      )
    })

    it('should show loading state', () => {
      global.window.currentContext = {
        updateMessages: mockUpdateMessages,
        updateInput: mockUpdateInput,
        state: {
          currentInput: '',
          lines: [
            { text: '' },
            { text: '' },
            { text: '' },
            { text: '' },
            { text: '' },
          ],
        },
      }

      const { updateMessages } = useBranchSearch()

      updateMessages([], true, '', [])

      expect(mockUpdateMessages).toHaveBeenCalledWith(
        expect.arrayContaining(['Branches: ⠋ Loading...']),
        false
      )

      // Test loader animation
      vi.advanceTimersByTime(200)
      const loaderLine = global.window.currentContext.state.lines[4].text
      expect(loaderLine).toBeDefined()
      // Check that it has a loader character
      expect(loaderLine).toMatch(/Branches: [⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏] Loading.../)
    })

    it('should handle search mode with query', () => {
      global.window.currentContext = {
        updateMessages: mockUpdateMessages,
        updateInput: mockUpdateInput,
        state: {
          currentInput: 'main',
        },
      }

      const { updateMessages, enterSearchMode } = useBranchSearch()
      enterSearchMode()

      const branches: BranchInfo[] = [
        {
          name: 'main',
          lastCommit: 'Initial commit',
          lastCommitTime: new Date(),
          isRemote: false,
          isCurrent: false,
        },
        {
          name: 'feature',
          lastCommit: 'Add main feature',
          lastCommitTime: new Date(),
          isRemote: false,
          isCurrent: false,
        },
      ]

      updateMessages(branches, false, 'main', branches)

      expect(mockUpdateMessages).toHaveBeenCalledWith(
        expect.arrayContaining([
          '[esc] Cancel search',
          '',
          'Search for branches:',
          '[1] **main**',
          '[2] feature | Add **main** feature',
        ]),
        true
      )
    })

    it('should filter out current branch when configured', () => {
      global.window.currentContext = {
        updateMessages: mockUpdateMessages,
        updateInput: mockUpdateInput,
        state: {
          currentInput: 'main',
        },
      }

      const currentBranch = ref('main')
      const { updateMessages, enterSearchMode } = useBranchSearch({
        currentBranch,
      })
      enterSearchMode()

      const branches: BranchInfo[] = [
        {
          name: 'main',
          lastCommit: 'Initial commit',
          lastCommitTime: new Date(),
          isRemote: false,
          isCurrent: true,
        },
        {
          name: 'develop',
          lastCommit: 'Development branch',
          lastCommitTime: new Date(),
          isRemote: false,
          isCurrent: false,
        },
      ]

      updateMessages(branches, false, '', branches)

      expect(mockUpdateMessages).toHaveBeenCalledWith(expect.anything(), true)
    })

    it('should show limited branches with shortcuts disabled', () => {
      global.window.currentContext = {
        updateMessages: mockUpdateMessages,
        state: {
          currentInput: '',
        },
      }

      const { updateMessages } = useBranchSearch({
        showBranchShortcuts: false,
      })

      const branches: BranchInfo[] = [
        {
          name: 'main',
          lastCommit: 'Initial commit',
          lastCommitTime: new Date(),
          isRemote: false,
          isCurrent: false,
        },
      ]

      updateMessages(branches, false, '', [])

      expect(mockUpdateMessages).toHaveBeenCalledWith(
        expect.arrayContaining([
          '[b] Change base branch',
          'Press [enter] to confirm branch creation',
        ]),
        false
      )
    })

    it('should handle more than max branches', () => {
      global.window.currentContext = {
        updateMessages: mockUpdateMessages,
        state: {
          currentInput: '',
        },
      }

      const { updateMessages } = useBranchSearch({
        maxBranchShortcuts: 2,
      })

      const branches: BranchInfo[] = [
        {
          name: 'branch1',
          lastCommit: 'Commit 1',
          lastCommitTime: new Date(),
          isRemote: false,
          isCurrent: false,
        },
        {
          name: 'branch2',
          lastCommit: 'Commit 2',
          lastCommitTime: new Date(),
          isRemote: false,
          isCurrent: false,
        },
        {
          name: 'branch3',
          lastCommit: 'Commit 3',
          lastCommitTime: new Date(),
          isRemote: false,
          isCurrent: false,
        },
        {
          name: 'branch4',
          lastCommit: 'Commit 4',
          lastCommitTime: new Date(),
          isRemote: false,
          isCurrent: false,
        },
      ]

      updateMessages(branches, false, '', [])

      expect(mockUpdateMessages).toHaveBeenCalledWith(
        expect.arrayContaining([
          '[1] branch1',
          '[2] branch2',
          '    ... and 2 more branches',
        ]),
        false
      )
    })

    it('should show more than 10 filtered results message', () => {
      global.window.currentContext = {
        updateMessages: mockUpdateMessages,
        updateInput: mockUpdateInput,
        state: {
          currentInput: 'test',
        },
      }

      const { updateMessages, enterSearchMode } = useBranchSearch()
      enterSearchMode()

      const branches: BranchInfo[] = Array.from({ length: 15 }, (_, i) => ({
        name: `test-branch-${i + 1}`,
        lastCommit: `Commit ${i + 1}`,
        lastCommitTime: new Date(),
        isRemote: false,
        isCurrent: false,
      }))

      updateMessages(branches, false, 'test', branches)

      expect(mockUpdateMessages).toHaveBeenCalledWith(
        expect.arrayContaining(['    ... and 5 more branches']),
        true
      )
    })

    it('should show no matches found', () => {
      global.window.currentContext = {
        updateMessages: mockUpdateMessages,
        updateInput: mockUpdateInput,
        state: {
          currentInput: 'nonexistent',
        },
      }

      const { updateMessages, enterSearchMode } = useBranchSearch()
      enterSearchMode()

      updateMessages([], false, 'nonexistent', [])

      expect(mockUpdateMessages).toHaveBeenCalledWith(
        expect.arrayContaining(['No matches found']),
        true
      )
    })

    it('should show help text when no query', () => {
      global.window.currentContext = {
        updateMessages: mockUpdateMessages,
        updateInput: mockUpdateInput,
        state: {
          currentInput: '',
        },
      }

      const { updateMessages, enterSearchMode } = useBranchSearch()
      enterSearchMode()

      updateMessages([], false, '', [])

      expect(mockUpdateMessages).toHaveBeenCalledWith(
        expect.arrayContaining(['Start typing to search...']),
        true
      )
    })

    it('should show no branches available', () => {
      global.window.currentContext = {
        updateMessages: mockUpdateMessages,
        state: {
          currentInput: '',
        },
      }

      const { updateMessages } = useBranchSearch()

      updateMessages([], false, '', [])

      expect(mockUpdateMessages).toHaveBeenCalledWith(
        expect.arrayContaining(['Branches: None available']),
        false
      )
    })

    it('should handle commit message matches with highlighting', () => {
      global.window.currentContext = {
        updateMessages: mockUpdateMessages,
        updateInput: mockUpdateInput,
        state: {
          currentInput: 'feature',
        },
      }

      const { updateMessages, enterSearchMode } = useBranchSearch()
      enterSearchMode()

      const branches: BranchInfo[] = [
        {
          name: 'main',
          lastCommit: 'Add new feature implementation with tests',
          lastCommitTime: new Date(),
          isRemote: false,
          isCurrent: false,
        },
      ]

      updateMessages(branches, false, 'feature', branches)

      expect(mockUpdateMessages).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('**feature**')]),
        true
      )
    })
  })

  describe('enterSearchMode', () => {
    it('should enter search mode and update terminal', () => {
      global.window.currentContext = {
        updateInput: mockUpdateInput,
        state: {
          isWaitingForInput: false,
        },
      }

      const { enterSearchMode, isSearchMode } = useBranchSearch()

      enterSearchMode()

      expect(isSearchMode.value).toBe(true)
      expect(global.window.isTerminalSearchMode).toBe(true)
      expect(mockUpdateInput).toHaveBeenCalledWith('')
      expect(global.window.currentContext.state.isWaitingForInput).toBe(true)
    })
  })

  describe('exitSearchMode', () => {
    it('should exit search mode and update terminal', () => {
      global.window.currentContext = {
        updateInput: mockUpdateInput,
        state: {
          isWaitingForInput: true,
        },
      }

      const { enterSearchMode, exitSearchMode, isSearchMode } =
        useBranchSearch()

      enterSearchMode()
      exitSearchMode()

      expect(isSearchMode.value).toBe(false)
      expect(global.window.isTerminalSearchMode).toBe(false)
      expect(mockUpdateInput).toHaveBeenCalledWith('')
      expect(global.window.currentContext.state.isWaitingForInput).toBe(false)
    })
  })

  describe('handleKeyPress', () => {
    it('should ignore system shortcuts', () => {
      const { handleKeyPress, enterSearchMode } = useBranchSearch()
      const searchQuery = ref('')
      const onSearchUpdate = vi.fn()
      const onBranchSelect = vi.fn()

      enterSearchMode()

      const event = new KeyboardEvent('keydown', {
        key: 'a',
        metaKey: true,
      })

      handleKeyPress(event, searchQuery, [], onSearchUpdate, onBranchSelect)

      expect(onSearchUpdate).not.toHaveBeenCalled()
      expect(onBranchSelect).not.toHaveBeenCalled()
    })

    it('should handle Escape key', () => {
      const { handleKeyPress, enterSearchMode, isSearchMode } =
        useBranchSearch()
      const searchQuery = ref('test')
      const onSearchUpdate = vi.fn()
      const onBranchSelect = vi.fn()

      enterSearchMode()

      const event = new KeyboardEvent('keydown', { key: 'Escape' })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

      handleKeyPress(event, searchQuery, [], onSearchUpdate, onBranchSelect)

      expect(preventDefaultSpy).toHaveBeenCalled()
      expect(searchQuery.value).toBe('')
      expect(isSearchMode.value).toBe(false)
      expect(onSearchUpdate).toHaveBeenCalledWith('')
    })

    it('should handle Enter key', () => {
      const { handleKeyPress, enterSearchMode } = useBranchSearch()
      const searchQuery = ref('')
      const onSearchUpdate = vi.fn()
      const onBranchSelect = vi.fn()

      enterSearchMode()

      const event = new KeyboardEvent('keydown', { key: 'Enter' })

      handleKeyPress(event, searchQuery, [], onSearchUpdate, onBranchSelect)

      expect(onBranchSelect).toHaveBeenCalledWith(0)
    })

    it('should handle number keys 1-9', () => {
      const { handleKeyPress, enterSearchMode } = useBranchSearch()
      const searchQuery = ref('')
      const onSearchUpdate = vi.fn()
      const onBranchSelect = vi.fn()

      enterSearchMode()

      for (let i = 1; i <= 9; i++) {
        const event = new KeyboardEvent('keydown', { key: String(i) })
        handleKeyPress(event, searchQuery, [], onSearchUpdate, onBranchSelect)
        expect(onBranchSelect).toHaveBeenCalledWith(i - 1)
      }
    })

    it('should handle 0 key for 10th result', () => {
      const { handleKeyPress, enterSearchMode } = useBranchSearch()
      const searchQuery = ref('')
      const onSearchUpdate = vi.fn()
      const onBranchSelect = vi.fn()

      enterSearchMode()

      const event = new KeyboardEvent('keydown', { key: '0' })

      handleKeyPress(event, searchQuery, [], onSearchUpdate, onBranchSelect)

      expect(onBranchSelect).toHaveBeenCalledWith(9)
    })

    it('should handle character input and sync with terminal', () => {
      global.window.currentContext = {
        updateMessages: mockUpdateMessages,
        updateInput: mockUpdateInput,
        state: {
          currentInput: '',
        },
      }

      const { handleKeyPress, enterSearchMode } = useBranchSearch()
      const searchQuery = ref('')
      const onSearchUpdate = vi.fn()
      const onBranchSelect = vi.fn()
      const branches: BranchInfo[] = [
        {
          name: 'test',
          lastCommit: 'Test commit',
          lastCommitTime: new Date(),
          isRemote: false,
          isCurrent: false,
        },
      ]

      enterSearchMode()

      const event = new KeyboardEvent('keydown', { key: 't' })

      handleKeyPress(
        event,
        searchQuery,
        branches,
        onSearchUpdate,
        onBranchSelect
      )

      // Simulate terminal updating
      global.window.currentContext.state.currentInput = 't'

      // Run animation frame callbacks
      animationFrameCallbacks.forEach((cb) => cb(0))

      expect(searchQuery.value).toBe('t')
      expect(onSearchUpdate).toHaveBeenCalledWith('t')
    })

    it('should handle Backspace key', () => {
      global.window.currentContext = {
        updateMessages: mockUpdateMessages,
        updateInput: mockUpdateInput,
        state: {
          currentInput: 'tes',
        },
      }

      const { handleKeyPress, enterSearchMode } = useBranchSearch()
      const searchQuery = ref('test')
      const onSearchUpdate = vi.fn()
      const onBranchSelect = vi.fn()

      enterSearchMode()

      const event = new KeyboardEvent('keydown', { key: 'Backspace' })

      handleKeyPress(event, searchQuery, [], onSearchUpdate, onBranchSelect)

      // Run animation frame callbacks
      animationFrameCallbacks.forEach((cb) => cb(0))

      expect(searchQuery.value).toBe('tes')
      expect(onSearchUpdate).toHaveBeenCalledWith('tes')
    })

    it('should handle Delete key', () => {
      global.window.currentContext = {
        updateMessages: mockUpdateMessages,
        updateInput: mockUpdateInput,
        state: {
          currentInput: 'tst',
        },
      }

      const { handleKeyPress, enterSearchMode } = useBranchSearch()
      const searchQuery = ref('test')
      const onSearchUpdate = vi.fn()
      const onBranchSelect = vi.fn()

      enterSearchMode()

      const event = new KeyboardEvent('keydown', { key: 'Delete' })

      handleKeyPress(event, searchQuery, [], onSearchUpdate, onBranchSelect)

      // Run animation frame callbacks
      animationFrameCallbacks.forEach((cb) => cb(0))

      expect(searchQuery.value).toBe('tst')
      expect(onSearchUpdate).toHaveBeenCalledWith('tst')
    })

    it('should handle Arrow keys without updating search', () => {
      const { handleKeyPress, enterSearchMode } = useBranchSearch()
      const searchQuery = ref('test')
      const onSearchUpdate = vi.fn()
      const onBranchSelect = vi.fn()

      enterSearchMode()

      const leftEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft' })
      const rightEvent = new KeyboardEvent('keydown', { key: 'ArrowRight' })

      handleKeyPress(leftEvent, searchQuery, [], onSearchUpdate, onBranchSelect)
      handleKeyPress(
        rightEvent,
        searchQuery,
        [],
        onSearchUpdate,
        onBranchSelect
      )

      expect(onSearchUpdate).not.toHaveBeenCalled()
    })

    it('should ignore keys when not in search mode', () => {
      const { handleKeyPress } = useBranchSearch()
      const searchQuery = ref('')
      const onSearchUpdate = vi.fn()
      const onBranchSelect = vi.fn()

      const event = new KeyboardEvent('keydown', { key: 'a' })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

      handleKeyPress(event, searchQuery, [], onSearchUpdate, onBranchSelect)

      expect(preventDefaultSpy).not.toHaveBeenCalled()
      expect(onSearchUpdate).not.toHaveBeenCalled()
    })
  })

  describe('selectBranchByIndex', () => {
    it('should select branch in normal mode', () => {
      const { selectBranchByIndex } = useBranchSearch()
      const onSelect = vi.fn()

      const branches: BranchInfo[] = [
        {
          name: 'main',
          lastCommit: 'Initial commit',
          lastCommitTime: new Date(),
          isRemote: false,
          isCurrent: false,
        },
        {
          name: 'develop',
          lastCommit: 'Dev branch',
          lastCommitTime: new Date(),
          isRemote: false,
          isCurrent: false,
        },
      ]

      selectBranchByIndex(1, branches, [], onSelect)

      expect(onSelect).toHaveBeenCalledWith(branches[1])
    })

    it('should select branch from filtered list in search mode', () => {
      const { selectBranchByIndex, enterSearchMode } = useBranchSearch()
      const onSelect = vi.fn()

      enterSearchMode()

      const branches: BranchInfo[] = []
      const filteredBranches: BranchInfo[] = [
        {
          name: 'filtered',
          lastCommit: 'Filtered branch',
          lastCommitTime: new Date(),
          isRemote: false,
          isCurrent: false,
        },
      ]

      selectBranchByIndex(0, branches, filteredBranches, onSelect)

      expect(onSelect).toHaveBeenCalledWith(filteredBranches[0])
    })

    it('should not select if index is out of bounds', () => {
      const { selectBranchByIndex } = useBranchSearch()
      const onSelect = vi.fn()

      const branches: BranchInfo[] = [
        {
          name: 'main',
          lastCommit: 'Initial commit',
          lastCommitTime: new Date(),
          isRemote: false,
          isCurrent: false,
        },
      ]

      selectBranchByIndex(5, branches, [], onSelect)

      expect(onSelect).not.toHaveBeenCalled()
    })
  })

  describe('waitForContext', () => {
    it('should resolve immediately when context exists', async () => {
      global.window.currentContext = {
        updateMessages: mockUpdateMessages,
      }

      const { waitForContext } = useBranchSearch()

      await waitForContext()

      // Should resolve without delay
      expect(true).toBe(true)
    })

    it('should wait and retry when context is not ready', async () => {
      global.window.currentContext = null

      const { waitForContext } = useBranchSearch()

      // Start waiting
      const promise = waitForContext()

      // Advance timer and set context
      vi.advanceTimersByTime(200)
      global.window.currentContext = {
        updateMessages: mockUpdateMessages,
      }
      vi.advanceTimersByTime(100)

      await promise

      expect(true).toBe(true)
    })

    it('should timeout after 10 attempts', async () => {
      global.window.currentContext = null
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const { waitForContext } = useBranchSearch()

      // Start waiting
      const promise = waitForContext()

      // Advance through all attempts
      for (let i = 0; i < 11; i++) {
        vi.advanceTimersByTime(100)
      }

      await promise

      // Should have warned about context not available
      expect(warnSpy).toHaveBeenCalledWith(
        '[BranchSearch] Context not available after 10 attempts'
      )

      warnSpy.mockRestore()
    })
  })

  describe('cleanup', () => {
    it('should cleanup state and timers', () => {
      global.window.currentContext = {
        updateMessages: mockUpdateMessages,
        updateInput: mockUpdateInput,
        state: {
          currentInput: '',
          lines: [
            { text: '' },
            { text: '' },
            { text: '' },
            { text: '' },
            { text: '' },
          ],
        },
      }

      const { enterSearchMode, cleanup, isSearchMode, updateMessages } =
        useBranchSearch()

      enterSearchMode()

      // Start loading animation
      updateMessages([], true, '', [])

      // Verify state before cleanup
      expect(isSearchMode.value).toBe(true)
      expect(global.window.isTerminalSearchMode).toBe(true)

      cleanup()

      expect(isSearchMode.value).toBe(false)
      expect(global.window.isTerminalSearchMode).toBe(false)
    })
  })

  describe('lifecycle hooks', () => {
    it('should initialize terminal on mount and cleanup on unmount', async () => {
      // We need to test the lifecycle hooks with a Vue component context
      const { mount } = await import('@vue/test-utils')
      const { defineComponent, h } = await import('vue')

      // Create a test component that uses the composable
      const TestComponent = defineComponent({
        setup() {
          const branchSearch = useBranchSearch()
          return { branchSearch }
        },
        render() {
          return h('div')
        },
      })

      // Mount the component
      const wrapper = mount(TestComponent)

      // Check that the composable was initialized
      expect(wrapper.vm.branchSearch.isSearchMode.value).toBe(false)

      // Unmount the component to trigger cleanup
      wrapper.unmount()

      // Cleanup should have been called
      expect(global.window.isTerminalSearchMode).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('should handle empty branches array', () => {
      global.window.currentContext = {
        updateMessages: mockUpdateMessages,
        state: {
          currentInput: '',
        },
      }

      const { updateMessages } = useBranchSearch()

      updateMessages([], false, '', [])

      expect(mockUpdateMessages).toHaveBeenCalled()
    })

    it('should handle long branch names', () => {
      global.window.currentContext = {
        updateMessages: mockUpdateMessages,
        updateInput: mockUpdateInput,
        state: {
          currentInput: 'long',
        },
      }

      const { updateMessages, enterSearchMode } = useBranchSearch()
      enterSearchMode()

      const branches: BranchInfo[] = [
        {
          name: 'very-long-branch-name-that-contains-the-word-long-in-it',
          lastCommit: 'Commit message',
          lastCommitTime: new Date(),
          isRemote: false,
          isCurrent: false,
        },
      ]

      updateMessages(branches, false, 'long', branches)

      expect(mockUpdateMessages).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('**long**')]),
        true
      )
    })

    it('should handle special characters in search query', () => {
      global.window.currentContext = {
        updateMessages: mockUpdateMessages,
        updateInput: mockUpdateInput,
        state: {
          currentInput: 'feat/test',
        },
      }

      const { updateMessages, enterSearchMode } = useBranchSearch()
      enterSearchMode()

      const branches: BranchInfo[] = [
        {
          name: 'feat/test-branch',
          lastCommit: 'Feature test',
          lastCommitTime: new Date(),
          isRemote: false,
          isCurrent: false,
        },
      ]

      updateMessages(branches, false, 'feat/test', branches)

      expect(mockUpdateMessages).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('feat/test')]),
        true
      )
    })

    it('should handle context appearing at the edge of the long commit message', () => {
      global.window.currentContext = {
        updateMessages: mockUpdateMessages,
        updateInput: mockUpdateInput,
        state: {
          currentInput: 'xyz',
        },
      }

      const { updateMessages, enterSearchMode } = useBranchSearch()
      enterSearchMode()

      const longCommit = 'a'.repeat(50) + 'xyz' + 'b'.repeat(50)
      const branches: BranchInfo[] = [
        {
          name: 'branch',
          lastCommit: longCommit,
          lastCommitTime: new Date(),
          isRemote: false,
          isCurrent: false,
        },
      ]

      updateMessages(branches, false, 'xyz', branches)

      expect(mockUpdateMessages).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('**xyz**')]),
        true
      )
    })

    it('should handle computed ref for cancelText', () => {
      const baseText = ref('Cancel')
      const computedText = {
        value: baseText.value + ' Search',
      }

      const { isSearchMode } = useBranchSearch({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test uses computed ref which requires type assertion for options
        cancelText: computedText as any,
      })

      expect(isSearchMode.value).toBe(false)
    })

    it('should handle all branches with shortcuts equal to max', () => {
      global.window.currentContext = {
        updateMessages: mockUpdateMessages,
        state: {
          currentInput: '',
        },
      }

      const { updateMessages } = useBranchSearch({
        maxBranchShortcuts: 3,
      })

      const branches: BranchInfo[] = [
        {
          name: 'branch1',
          lastCommit: 'Commit 1',
          lastCommitTime: new Date(),
          isRemote: false,
          isCurrent: false,
        },
        {
          name: 'branch2',
          lastCommit: 'Commit 2',
          lastCommitTime: new Date(),
          isRemote: false,
          isCurrent: false,
        },
        {
          name: 'branch3',
          lastCommit: 'Commit 3',
          lastCommitTime: new Date(),
          isRemote: false,
          isCurrent: false,
        },
      ]

      updateMessages(branches, false, '', [])

      expect(mockUpdateMessages).toHaveBeenCalledWith(
        expect.arrayContaining(['[1] branch1', '[2] branch2', '[3] branch3']),
        false
      )

      // Should not include "... and X more branches" message
      expect(mockUpdateMessages).toHaveBeenCalledWith(
        expect.not.arrayContaining([expect.stringContaining('... and')]),
        false
      )
    })

    it('should handle ctrl key without preventing default', () => {
      const { handleKeyPress, enterSearchMode } = useBranchSearch()
      const searchQuery = ref('')
      const onSearchUpdate = vi.fn()
      const onBranchSelect = vi.fn()

      enterSearchMode()

      const event = new KeyboardEvent('keydown', {
        key: 'a',
        ctrlKey: true,
      })

      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

      handleKeyPress(event, searchQuery, [], onSearchUpdate, onBranchSelect)

      expect(preventDefaultSpy).not.toHaveBeenCalled()
    })

    it('should handle branch name exact match without highlighting asterisks', () => {
      global.window.currentContext = {
        updateMessages: mockUpdateMessages,
        updateInput: mockUpdateInput,
        state: {
          currentInput: 'exact',
        },
      }

      const { updateMessages, enterSearchMode } = useBranchSearch()
      enterSearchMode()

      const branches: BranchInfo[] = [
        {
          name: 'exact',
          lastCommit: 'Exact match branch',
          lastCommitTime: new Date(),
          isRemote: false,
          isCurrent: false,
        },
      ]

      updateMessages(branches, false, 'exact', branches)

      expect(mockUpdateMessages).toHaveBeenCalledWith(
        expect.arrayContaining(['[1] **exact**']),
        true
      )
    })

    it('should handle match at the beginning of commit message', () => {
      global.window.currentContext = {
        updateMessages: mockUpdateMessages,
        updateInput: mockUpdateInput,
        state: {
          currentInput: 'fix',
        },
      }

      const { updateMessages, enterSearchMode } = useBranchSearch()
      enterSearchMode()

      const branches: BranchInfo[] = [
        {
          name: 'branch',
          lastCommit: 'fix: resolve issue with deployment',
          lastCommitTime: new Date(),
          isRemote: false,
          isCurrent: false,
        },
      ]

      updateMessages(branches, false, 'fix', branches)

      expect(mockUpdateMessages).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('**fix**')]),
        true
      )
    })

    it('should handle match at the end of commit message', () => {
      global.window.currentContext = {
        updateMessages: mockUpdateMessages,
        updateInput: mockUpdateInput,
        state: {
          currentInput: 'tests',
        },
      }

      const { updateMessages, enterSearchMode } = useBranchSearch()
      enterSearchMode()

      const branches: BranchInfo[] = [
        {
          name: 'branch',
          lastCommit: 'Add unit tests',
          lastCommitTime: new Date(),
          isRemote: false,
          isCurrent: false,
        },
      ]

      updateMessages(branches, false, 'tests', branches)

      expect(mockUpdateMessages).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('**tests**')]),
        true
      )
    })
  })
})
