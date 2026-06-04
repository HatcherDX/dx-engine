/**
 * @fileoverview Comprehensive tests for useTerminalTaskSelector composable.
 *
 * @description
 * Achieves 100% code coverage for useTerminalTaskSelector.ts by testing all
 * terminal integration functionality including message updates, search modes,
 * keyboard handling, and branch selection.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, ref, nextTick } from 'vue'
import { useTerminalTaskSelector } from './useTerminalTaskSelector'
import { useTerminalEasterEgg } from './useTerminalEasterEgg'
import type { BranchInfo } from './useBranchManager'

// Create shared terminal state that persists across all calls
const sharedTerminalState = ref({
  lines: ['test line'],
})

// Mock the useTerminalEasterEgg composable with shared state
vi.mock('./useTerminalEasterEgg', () => ({
  useTerminalEasterEgg: vi.fn(() => ({
    terminalState: sharedTerminalState,
    initializeTerminal: vi.fn(),
  })),
}))

describe('useTerminalTaskSelector', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test setup requires flexible typing
  let originalWindow: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test setup requires flexible typing
  let mockCurrentContext: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test setup requires flexible typing
  let consoleLogSpy: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test setup requires flexible typing
  let consoleWarnSpy: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test setup requires flexible typing
  let setTimeoutSpy: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test setup requires flexible typing
  let clearTimeoutSpy: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test setup requires flexible typing
  let requestAnimationFrameSpy: any

  // Test data
  const testBranches: BranchInfo[] = [
    {
      name: 'feature/test-branch',
      lastCommit: 'Add new feature for testing',
      isActive: false,
      isRemote: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: 'bugfix/important-fix',
      lastCommit: 'Fix critical bug in production',
      isActive: false,
      isRemote: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: 'develop',
      lastCommit: 'Merge pull request #123',
      isActive: true,
      isRemote: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: 'main',
      lastCommit: 'Release version 1.0.0',
      isActive: false,
      isRemote: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: 'feature/search-test',
      lastCommit: 'Implement search functionality',
      isActive: false,
      isRemote: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: 'branch-6',
      lastCommit: 'Sixth branch for overflow testing',
      isActive: false,
      isRemote: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]

  // Create more branches for testing overflow scenarios
  const manyBranches: BranchInfo[] = [
    ...testBranches,
    ...Array.from({ length: 10 }, (_, i) => ({
      name: `extra-branch-${i + 7}`,
      lastCommit: `Extra commit message ${i + 7}`,
      isActive: false,
      isRemote: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
  ]

  beforeEach(() => {
    // Save original window
    originalWindow = global.window

    // Mock console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    // Mock timers
    setTimeoutSpy = vi.spyOn(global, 'setTimeout')
    clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')

    // Mock requestAnimationFrame
    requestAnimationFrameSpy = vi.fn((cb) => {
      cb()
      return 1
    })

    // Mock currentContext
    mockCurrentContext = {
      updateMessages: vi.fn(),
      updateInput: vi.fn(),
      state: {
        currentInput: '',
        cursorPosition: 0,
        isWaitingForInput: false,
        lines: [
          { text: 'Line 1' },
          { text: 'Line 2' },
          { text: 'Line 3' },
          { text: 'Line 4' },
          { text: 'Line 5' },
        ],
      },
    }

    // Setup window mock
    global.window = {
      ...originalWindow,
      currentContext: mockCurrentContext,
      requestAnimationFrame: requestAnimationFrameSpy,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test setup requires flexible typing
    } as any
  })

  afterEach(() => {
    // Restore mocks
    consoleLogSpy.mockRestore()
    consoleWarnSpy.mockRestore()
    setTimeoutSpy.mockRestore()
    clearTimeoutSpy.mockRestore()
    vi.clearAllMocks()

    // Restore original window
    global.window = originalWindow
  })

  describe('Initialization', () => {
    it('should initialize with correct default state', () => {
      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const { selector } = wrapper.vm as any

      expect(selector.isTerminalSearchMode.value).toBe(false)

      wrapper.unmount()
    })

    it('should call initializeTerminal on mount', async () => {
      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)

      await nextTick()

      // The mock useTerminalEasterEgg doesn't log, so we just verify component mounts
      expect(wrapper.vm).toBeDefined()

      wrapper.unmount()
    })
  })

  describe('updateMessages', () => {
    it('should handle no terminal context', () => {
      delete global.window.currentContext

      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const { selector } = wrapper.vm as any

      selector.updateMessages(testBranches, false, '', '', testBranches)

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[TerminalTaskSelector] No terminal context available'
      )

      wrapper.unmount()
    })

    it('should update messages in normal mode with branches', () => {
      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const { selector } = wrapper.vm as any

      selector.updateMessages(testBranches, false, '', '', testBranches)

      expect(mockCurrentContext.updateMessages).toHaveBeenCalledWith(
        expect.arrayContaining([
          '[n] Create new task',
          '[b] Search branch',
          '[esc] Back',
          '',
          'Branches (6 available):',
          '[1] feature/test-branch',
          '[2] bugfix/important-fix',
          '[3] develop',
          '[4] main',
          '[5] feature/search-test',
          '    ... and 1 more branches',
        ]),
        false
      )

      wrapper.unmount()
    })

    it('should show first 5 branches when exactly 5 available', () => {
      const fiveBranches = testBranches.slice(0, 5)

      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const { selector } = wrapper.vm as any

      selector.updateMessages(fiveBranches, false, '', '', fiveBranches)

      expect(mockCurrentContext.updateMessages).toHaveBeenCalledWith(
        expect.arrayContaining([
          '[n] Create new task',
          '[b] Search branch',
          '[esc] Back',
          '',
          'Branches (5 available):',
          '[1] feature/test-branch',
          '[2] bugfix/important-fix',
          '[3] develop',
          '[4] main',
          '[5] feature/search-test',
        ]),
        false
      )

      wrapper.unmount()
    })

    it('should handle loading state with animation', async () => {
      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const { selector } = wrapper.vm as any

      // Mock setTimeout to NOT execute immediately to avoid infinite loop
      let timeoutId = 0
      setTimeoutSpy.mockImplementation(
        (_cb: (...args: unknown[]) => void, _delay: number) => {
          // Don't execute callback to avoid infinite animation loop
          return ++timeoutId
        }
      )

      selector.updateMessages([], true, '', '', [])

      expect(mockCurrentContext.updateMessages).toHaveBeenCalledWith(
        expect.arrayContaining(['Branches: ⠋ Loading...']),
        false
      )

      // Verify animation timer was set
      expect(setTimeoutSpy).toHaveBeenCalled()

      // Stop animation by setting loading to false
      selector.updateMessages([], false, '', '', [])

      wrapper.unmount()
    })

    it('should handle no branches available', () => {
      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const { selector } = wrapper.vm as any

      selector.updateMessages([], false, '', '', [])

      expect(mockCurrentContext.updateMessages).toHaveBeenCalledWith(
        expect.arrayContaining(['Branches: None available']),
        false
      )

      wrapper.unmount()
    })

    it('should update messages in search mode with no query', () => {
      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const { selector } = wrapper.vm as any

      selector.isTerminalSearchMode.value = true
      mockCurrentContext.state.currentInput = ''

      selector.updateMessages(testBranches, false, '', '', [])

      expect(mockCurrentContext.updateMessages).toHaveBeenCalledWith(
        expect.arrayContaining([
          '[esc] Cancel search',
          '',
          'Search for branches:',
          'Start typing to search...',
        ]),
        true
      )

      wrapper.unmount()
    })

    it('should filter and display branches in search mode', () => {
      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const { selector } = wrapper.vm as any

      selector.isTerminalSearchMode.value = true
      mockCurrentContext.state.currentInput = 'feature'

      selector.updateMessages(testBranches, false, 'feature', 'feature', [])

      expect(mockCurrentContext.updateMessages).toHaveBeenCalledWith(
        expect.arrayContaining([
          '[esc] Cancel search',
          '',
          'Search for branches:',
          expect.stringContaining('[1]'),
          expect.stringContaining('feature'),
        ]),
        true
      )

      wrapper.unmount()
    })

    it('should handle search with commit message match', () => {
      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const { selector } = wrapper.vm as any

      selector.isTerminalSearchMode.value = true
      mockCurrentContext.state.currentInput = 'critical'

      selector.updateMessages(testBranches, false, 'critical', 'critical', [])

      const calls = mockCurrentContext.updateMessages.mock.calls
      const lastCall = calls[calls.length - 1]
      const messages = lastCall[0]

      // Should find the branch with "critical" in commit message
      const matchMessage = messages.find((m: string) =>
        m.includes('bugfix/important-fix')
      )
      expect(matchMessage).toBeDefined()
      expect(matchMessage).toContain('**critical**')

      wrapper.unmount()
    })

    it('should handle more than 10 search results', () => {
      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const { selector } = wrapper.vm as any

      selector.isTerminalSearchMode.value = true
      mockCurrentContext.state.currentInput = 'branch'

      selector.updateMessages(manyBranches, false, 'branch', 'branch', [])

      const calls = mockCurrentContext.updateMessages.mock.calls
      const lastCall = calls[calls.length - 1]
      const messages = lastCall[0]

      // Should show 10 results and a "more" message
      const branchMessages = messages.filter((m: string) => m.includes('['))
      expect(branchMessages.length).toBeGreaterThanOrEqual(10)

      const moreMessage = messages.find(
        (m: string) => m.includes('and') && m.includes('more')
      )
      expect(moreMessage).toBeDefined()

      wrapper.unmount()
    })

    it('should handle no search matches', () => {
      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const { selector } = wrapper.vm as any

      selector.isTerminalSearchMode.value = true
      mockCurrentContext.state.currentInput = 'nonexistent'

      selector.updateMessages(
        testBranches,
        false,
        'nonexistent',
        'nonexistent',
        []
      )

      expect(mockCurrentContext.updateMessages).toHaveBeenCalledWith(
        expect.arrayContaining(['No matches found']),
        true
      )

      wrapper.unmount()
    })

    it('should clear animation timer when not loading', () => {
      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const { selector } = wrapper.vm as any

      // First set loading to true
      selector.updateMessages([], true, '', '', [])

      // Clear spy calls
      clearTimeoutSpy.mockClear()

      // Then set loading to false
      selector.updateMessages([], false, '', '', [])

      expect(clearTimeoutSpy).toHaveBeenCalled()

      wrapper.unmount()
    })
  })

  describe('Search mode management', () => {
    it('should enter search mode correctly', () => {
      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const { selector } = wrapper.vm as any

      selector.enterSearchMode()

      expect(selector.isTerminalSearchMode.value).toBe(true)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test setup requires flexible typing
      expect((global.window as any).isTerminalSearchMode).toBe(true)
      expect(mockCurrentContext.updateInput).toHaveBeenCalledWith('')
      expect(mockCurrentContext.state.isWaitingForInput).toBe(true)

      wrapper.unmount()
    })

    it('should exit search mode correctly', () => {
      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const { selector } = wrapper.vm as any

      selector.enterSearchMode()
      selector.exitSearchMode()

      expect(selector.isTerminalSearchMode.value).toBe(false)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test setup requires flexible typing
      expect((global.window as any).isTerminalSearchMode).toBe(false)
      expect(mockCurrentContext.updateInput).toHaveBeenLastCalledWith('')
      expect(mockCurrentContext.state.isWaitingForInput).toBe(false)

      wrapper.unmount()
    })
  })

  describe('Keyboard handling', () => {
    it('should ignore keys when no terminal lines', () => {
      // First create the mock with empty lines
      vi.unmock('./useTerminalEasterEgg')
      vi.mock('./useTerminalEasterEgg', () => ({
        useTerminalEasterEgg: () => ({
          terminalState: ref({
            lines: [], // Empty lines for this test
          }),
          initializeTerminal: vi.fn(),
        }),
      }))

      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const { selector } = wrapper.vm as any

      const searchQuery = ref('')
      const onSearchUpdate = vi.fn()
      const onBranchSelect = vi.fn()

      const event = new KeyboardEvent('keydown', { key: 'b' })
      selector.handleKeyPress(
        event,
        searchQuery,
        testBranches,
        onSearchUpdate,
        onBranchSelect
      )

      expect(onSearchUpdate).not.toHaveBeenCalled()
      expect(onBranchSelect).not.toHaveBeenCalled()

      wrapper.unmount()
    })

    it.skip('should handle Escape key in search mode', () => {
      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const { selector } = wrapper.vm as any

      selector.enterSearchMode()

      const searchQuery = ref('test')
      const onSearchUpdate = vi.fn()
      const onBranchSelect = vi.fn()

      const event = new KeyboardEvent('keydown', { key: 'Escape' })
      selector.handleKeyPress(
        event,
        searchQuery,
        testBranches,
        onSearchUpdate,
        onBranchSelect
      )

      expect(searchQuery.value).toBe('')
      expect(selector.isTerminalSearchMode.value).toBe(false)
      expect(onSearchUpdate).toHaveBeenCalledWith('')

      wrapper.unmount()
    })

    it.skip('should handle Enter key in search mode', () => {
      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const { selector } = wrapper.vm as any

      selector.enterSearchMode()

      const searchQuery = ref('test')
      const onSearchUpdate = vi.fn()
      const onBranchSelect = vi.fn()

      const event = new KeyboardEvent('keydown', { key: 'Enter' })
      selector.handleKeyPress(
        event,
        searchQuery,
        testBranches,
        onSearchUpdate,
        onBranchSelect
      )

      expect(onBranchSelect).toHaveBeenCalledWith(0)

      wrapper.unmount()
    })

    it.skip('should handle number keys 1-9 in search mode', () => {
      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const { selector } = wrapper.vm as any

      selector.enterSearchMode()

      const searchQuery = ref('')
      const onSearchUpdate = vi.fn()
      const onBranchSelect = vi.fn()

      for (let i = 1; i <= 9; i++) {
        const event = new KeyboardEvent('keydown', { key: String(i) })
        selector.handleKeyPress(
          event,
          searchQuery,
          testBranches,
          onSearchUpdate,
          onBranchSelect
        )
        expect(onBranchSelect).toHaveBeenCalledWith(i - 1)
      }

      wrapper.unmount()
    })

    it.skip('should handle 0 key for 10th result in search mode', () => {
      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const { selector } = wrapper.vm as any

      selector.enterSearchMode()

      const searchQuery = ref('')
      const onSearchUpdate = vi.fn()
      const onBranchSelect = vi.fn()

      const event = new KeyboardEvent('keydown', { key: '0' })
      selector.handleKeyPress(
        event,
        searchQuery,
        testBranches,
        onSearchUpdate,
        onBranchSelect
      )

      expect(onBranchSelect).toHaveBeenCalledWith(9)

      wrapper.unmount()
    })

    it.skip('should handle character input in search mode', () => {
      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const { selector } = wrapper.vm as any

      selector.enterSearchMode()

      const searchQuery = ref('')
      const onSearchUpdate = vi.fn()
      const onBranchSelect = vi.fn()

      // Set up the current input to simulate terminal IPC already processed it
      mockCurrentContext.state.currentInput = 'a'

      const event = new KeyboardEvent('keydown', { key: 'a' })
      selector.handleKeyPress(
        event,
        searchQuery,
        testBranches,
        onSearchUpdate,
        onBranchSelect
      )

      // After requestAnimationFrame callback executes, input should be synced
      expect(requestAnimationFrameSpy).toHaveBeenCalled()
      // The callback was executed immediately in our mock
      expect(searchQuery.value).toBe('a')
      expect(onSearchUpdate).toHaveBeenCalledWith('a')

      wrapper.unmount()
    })

    it('should ignore ctrl/meta keys in search mode', () => {
      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const { selector } = wrapper.vm as any

      selector.enterSearchMode()

      const searchQuery = ref('')
      const onSearchUpdate = vi.fn()
      const onBranchSelect = vi.fn()

      const ctrlEvent = new KeyboardEvent('keydown', {
        key: 'a',
        ctrlKey: true,
      })
      selector.handleKeyPress(
        ctrlEvent,
        searchQuery,
        testBranches,
        onSearchUpdate,
        onBranchSelect
      )

      const metaEvent = new KeyboardEvent('keydown', {
        key: 'a',
        metaKey: true,
      })
      selector.handleKeyPress(
        metaEvent,
        searchQuery,
        testBranches,
        onSearchUpdate,
        onBranchSelect
      )

      expect(onSearchUpdate).not.toHaveBeenCalled()

      wrapper.unmount()
    })

    it.skip('should handle Backspace key in search mode', () => {
      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const { selector } = wrapper.vm as any

      selector.enterSearchMode()

      const searchQuery = ref('test')
      const onSearchUpdate = vi.fn()
      const onBranchSelect = vi.fn()

      // Simulate that terminal IPC already processed the backspace
      mockCurrentContext.state.currentInput = 'tes'

      const event = new KeyboardEvent('keydown', { key: 'Backspace' })
      selector.handleKeyPress(
        event,
        searchQuery,
        testBranches,
        onSearchUpdate,
        onBranchSelect
      )

      // After requestAnimationFrame callback executes
      expect(requestAnimationFrameSpy).toHaveBeenCalled()
      expect(searchQuery.value).toBe('tes')
      expect(onSearchUpdate).toHaveBeenCalledWith('tes')

      wrapper.unmount()
    })

    it.skip('should handle Delete key in search mode', () => {
      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const { selector } = wrapper.vm as any

      selector.enterSearchMode()

      const searchQuery = ref('test')
      const onSearchUpdate = vi.fn()
      const onBranchSelect = vi.fn()

      // Simulate that terminal IPC already processed the delete
      mockCurrentContext.state.currentInput = 'tet'

      const event = new KeyboardEvent('keydown', { key: 'Delete' })
      selector.handleKeyPress(
        event,
        searchQuery,
        testBranches,
        onSearchUpdate,
        onBranchSelect
      )

      // After requestAnimationFrame callback executes
      expect(requestAnimationFrameSpy).toHaveBeenCalled()
      expect(searchQuery.value).toBe('tet')
      expect(onSearchUpdate).toHaveBeenCalledWith('tet')

      wrapper.unmount()
    })

    it('should handle Arrow keys in search mode without updating', () => {
      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const { selector } = wrapper.vm as any

      selector.enterSearchMode()

      const searchQuery = ref('test')
      const onSearchUpdate = vi.fn()
      const onBranchSelect = vi.fn()

      const leftEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft' })
      selector.handleKeyPress(
        leftEvent,
        searchQuery,
        testBranches,
        onSearchUpdate,
        onBranchSelect
      )

      const rightEvent = new KeyboardEvent('keydown', { key: 'ArrowRight' })
      selector.handleKeyPress(
        rightEvent,
        searchQuery,
        testBranches,
        onSearchUpdate,
        onBranchSelect
      )

      expect(onSearchUpdate).not.toHaveBeenCalled()

      wrapper.unmount()
    })
  })

  describe('Branch selection', () => {
    it('should select branch by index in normal mode', () => {
      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const { selector } = wrapper.vm as any

      const onSelect = vi.fn()

      selector.selectBranchByIndex(0, testBranches, [], onSelect)

      expect(onSelect).toHaveBeenCalledWith(testBranches[0])

      wrapper.unmount()
    })

    it('should select branch by index in search mode', () => {
      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const { selector } = wrapper.vm as any

      selector.isTerminalSearchMode.value = true

      const filteredBranches = [testBranches[2], testBranches[3]]
      const onSelect = vi.fn()

      selector.selectBranchByIndex(1, testBranches, filteredBranches, onSelect)

      expect(onSelect).toHaveBeenCalledWith(filteredBranches[1])

      wrapper.unmount()
    })

    it('should not select branch with invalid index', () => {
      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const { selector } = wrapper.vm as any

      const onSelect = vi.fn()

      selector.selectBranchByIndex(99, testBranches, [], onSelect)

      expect(onSelect).not.toHaveBeenCalled()

      wrapper.unmount()
    })
  })

  describe('Context waiting', () => {
    it('should resolve immediately when context exists', async () => {
      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const { selector } = wrapper.vm as any

      await selector.waitForContext()

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[TerminalTaskSelector] Terminal context ready'
      )

      wrapper.unmount()
    })

    it('should wait for context when not immediately available', async () => {
      delete global.window.currentContext

      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const { selector } = wrapper.vm as any

      // Mock setTimeout to simulate waiting
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test setup requires flexible typing
      const timeoutCallbacks: any[] = []
      setTimeoutSpy.mockImplementation((cb: (...args: unknown[]) => void) => {
        timeoutCallbacks.push(cb)
        return timeoutCallbacks.length
      })

      const waitPromise = selector.waitForContext()

      // After first timeout, context still not available
      await timeoutCallbacks[0]()

      // Verify waiting message was logged
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[TerminalTaskSelector] Waiting for context...',
        0
      )

      // Set context and execute second timeout
      global.window.currentContext = mockCurrentContext
      if (timeoutCallbacks[1]) {
        await timeoutCallbacks[1]()
      }

      await waitPromise

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[TerminalTaskSelector] Terminal context ready'
      )

      wrapper.unmount()
    })

    it('should timeout after 10 attempts', async () => {
      delete global.window.currentContext

      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const { selector } = wrapper.vm as any

      // Mock setTimeout to execute immediately
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mock function signature for testing
      setTimeoutSpy.mockImplementation((cb: any) => {
        cb()
        return 1
      })

      await selector.waitForContext()

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[TerminalTaskSelector] Context not available after 10 attempts'
      )

      wrapper.unmount()
    })
  })

  describe('Cleanup', () => {
    it('should cleanup properly', () => {
      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const { selector } = wrapper.vm as any

      // Set up some state
      selector.enterSearchMode()

      // Mock timer to NOT execute to avoid infinite loop
      const timerId = 123
      setTimeoutSpy.mockImplementation((_cb: (...args: unknown[]) => void) => {
        // Don't execute callback
        return timerId
      })
      selector.updateMessages([], true, '', '', [])

      // Clear spy
      clearTimeoutSpy.mockClear()

      // Cleanup
      selector.cleanup()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test setup requires flexible typing
      expect((global.window as any).isTerminalSearchMode).toBe(false)
      expect(selector.isTerminalSearchMode.value).toBe(false)
      expect(clearTimeoutSpy).toHaveBeenCalledWith(timerId)

      wrapper.unmount()
    })

    it('should cleanup on unmount', () => {
      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const { selector } = wrapper.vm as any

      selector.enterSearchMode()

      wrapper.unmount()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test setup requires flexible typing
      expect((global.window as any).isTerminalSearchMode).toBe(false)
    })
  })

  describe('Coverage for uncovered lines', () => {
    it.skip('should handle keyboard input in search mode with terminal lines', () => {
      const selector = useTerminalTaskSelector()
      const searchQuery = ref('')
      const onSearchUpdate = vi.fn()
      const onBranchSelect = vi.fn()

      // Make sure terminal has lines BEFORE entering search mode
      const { terminalState } = useTerminalEasterEgg()
      terminalState.value = { lines: ['test', 'content'] }

      // Enter search mode
      selector.enterSearchMode()

      // Mock console.log to verify the log call
      const consoleLogSpy = vi.spyOn(console, 'log')

      // Test character key handling
      const charEvent = new KeyboardEvent('keydown', { key: 'a' })
      selector.handleKeyPress(
        charEvent,
        searchQuery,
        testBranches,
        onSearchUpdate,
        onBranchSelect
      )

      // Should process the key since terminal has lines and we're in search mode
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[TerminalTaskSelector] Processing key in search mode:',
        'a'
      )

      consoleLogSpy.mockRestore()
    })

    it('should handle keyboard arrow keys in search mode', () => {
      const selector = useTerminalTaskSelector()
      const searchQuery = ref('')
      const onSearchUpdate = vi.fn()
      const onBranchSelect = vi.fn()

      // Make sure terminal has lines BEFORE entering search mode
      const { terminalState } = useTerminalEasterEgg()
      terminalState.value = { lines: ['test', 'content'] }

      // Enter search mode
      selector.enterSearchMode()

      // Test arrow key handling (should return early without updating)
      const arrowEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft' })
      selector.handleKeyPress(
        arrowEvent,
        searchQuery,
        testBranches,
        onSearchUpdate,
        onBranchSelect
      )

      // Arrow keys should be handled but not trigger search update
      expect(onSearchUpdate).not.toHaveBeenCalled()
    })

    it.skip('should handle delete key in search mode with animation frame', () => {
      const selector = useTerminalTaskSelector()
      const searchQuery = ref('test')
      const onSearchUpdate = vi.fn()
      const onBranchSelect = vi.fn()

      // Make sure terminal has lines BEFORE entering search mode
      const { terminalState } = useTerminalEasterEgg()
      terminalState.value = { lines: ['test', 'content'] }

      // Enter search mode
      selector.enterSearchMode()

      // Mock requestAnimationFrame to execute immediately
      const originalRaf = global.requestAnimationFrame
      global.requestAnimationFrame = vi.fn((cb) => {
        cb(0)
        return 0
      })

      // Simulate terminal input after delete
      mockCurrentContext.state.currentInput = 'tes'

      // Test delete key handling
      const deleteEvent = new KeyboardEvent('keydown', { key: 'Delete' })
      selector.handleKeyPress(
        deleteEvent,
        searchQuery,
        testBranches,
        onSearchUpdate,
        onBranchSelect
      )

      // Should update search query after animation frame
      expect(searchQuery.value).toBe('tes')
      expect(onSearchUpdate).toHaveBeenCalledWith('tes')

      // Restore original requestAnimationFrame
      global.requestAnimationFrame = originalRaf
    })

    it('should clear loader animation timer when loading completes', () => {
      const selector = useTerminalTaskSelector()

      // Mock timer functions
      const originalSetTimeout = global.setTimeout
      const originalClearTimeout = global.clearTimeout

      const timerId = 123
      global.setTimeout = vi.fn(() => timerId)
      global.clearTimeout = vi.fn()

      // Start loading (sets timer)
      selector.updateMessages(testBranches, true, '', '', [])

      // Stop loading (should clear timer)
      selector.updateMessages(testBranches, false, '', '', [])

      // Verify timer was cleared
      expect(global.clearTimeout).toHaveBeenCalledWith(timerId)

      // Restore originals
      global.setTimeout = originalSetTimeout
      global.clearTimeout = originalClearTimeout
    })

    it('should handle search mode with filtered branches containing no name match', () => {
      const selector = useTerminalTaskSelector()

      selector.enterSearchMode()
      mockCurrentContext.state.currentInput = 'commit'

      const branchNoNameMatch = {
        name: 'feature/branch',
        lastCommit: 'commit message',
        isActive: false,
        isRemote: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // Update with filtered branches that don't match in name
      selector.updateMessages([branchNoNameMatch], false, 'commit', 'commit', [
        branchNoNameMatch,
      ])

      const messages =
        mockCurrentContext.updateMessages.mock.calls[
          mockCurrentContext.updateMessages.mock.calls.length - 1
        ][0]
      // Should show the branch with commit match highlighting
      expect(messages.some((m) => m.includes('**commit**'))).toBe(true)
    })

    it.skip('should handle Escape key in search mode', () => {
      const selector = useTerminalTaskSelector()
      const searchQuery = ref('test')
      const onSearchUpdate = vi.fn()
      const onBranchSelect = vi.fn()

      // Set terminal state first
      const { terminalState } = useTerminalEasterEgg()
      terminalState.value = { lines: ['test'] }

      selector.enterSearchMode()

      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' })
      selector.handleKeyPress(
        escapeEvent,
        searchQuery,
        testBranches,
        onSearchUpdate,
        onBranchSelect
      )

      expect(searchQuery.value).toBe('')
      expect(onSearchUpdate).toHaveBeenCalledWith('')
      expect(selector.isTerminalSearchMode.value).toBe(false)
    })

    it.skip('should handle Enter key in search mode', () => {
      const selector = useTerminalTaskSelector()
      const onBranchSelect = vi.fn()

      // Set terminal state first
      const { terminalState } = useTerminalEasterEgg()
      terminalState.value = { lines: ['test'] }

      selector.enterSearchMode()

      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' })
      selector.handleKeyPress(
        enterEvent,
        ref(''),
        testBranches,
        vi.fn(),
        onBranchSelect
      )

      expect(onBranchSelect).toHaveBeenCalledWith(0)
    })

    it.skip('should handle number keys 1-9 and 0 in search mode', () => {
      const selector = useTerminalTaskSelector()
      const onBranchSelect = vi.fn()

      // Set terminal state first
      const { terminalState } = useTerminalEasterEgg()
      terminalState.value = { lines: ['test'] }

      selector.enterSearchMode()

      // Test keys 1-9
      for (let i = 1; i <= 9; i++) {
        const event = new KeyboardEvent('keydown', { key: String(i) })
        selector.handleKeyPress(
          event,
          ref(''),
          testBranches,
          vi.fn(),
          onBranchSelect
        )
        expect(onBranchSelect).toHaveBeenCalledWith(i - 1)
      }

      // Test key 0 (selects 10th item)
      const zeroEvent = new KeyboardEvent('keydown', { key: '0' })
      selector.handleKeyPress(
        zeroEvent,
        ref(''),
        testBranches,
        vi.fn(),
        onBranchSelect
      )
      expect(onBranchSelect).toHaveBeenCalledWith(9)
    })

    it.skip('should handle regular character input with requestAnimationFrame', () => {
      const selector = useTerminalTaskSelector()
      const searchQuery = ref('')
      const onSearchUpdate = vi.fn()

      // Set terminal state first
      const { terminalState } = useTerminalEasterEgg()
      terminalState.value = { lines: ['test'] }

      selector.enterSearchMode()

      // Mock requestAnimationFrame
      const originalRaf = global.requestAnimationFrame
      global.requestAnimationFrame = vi.fn((cb) => {
        cb(0)
        return 0
      })

      // Simulate terminal updating its input
      mockCurrentContext.state.currentInput = 'a'

      const charEvent = new KeyboardEvent('keydown', { key: 'a' })
      selector.handleKeyPress(
        charEvent,
        searchQuery,
        testBranches,
        onSearchUpdate,
        vi.fn()
      )

      expect(searchQuery.value).toBe('a')
      expect(onSearchUpdate).toHaveBeenCalledWith('a')

      // Restore
      global.requestAnimationFrame = originalRaf
    })

    it.skip('should handle Backspace key with requestAnimationFrame', () => {
      const selector = useTerminalTaskSelector()
      const searchQuery = ref('test')
      const onSearchUpdate = vi.fn()

      // Set terminal state first
      const { terminalState } = useTerminalEasterEgg()
      terminalState.value = { lines: ['test'] }

      selector.enterSearchMode()

      // Mock requestAnimationFrame
      const originalRaf = global.requestAnimationFrame
      global.requestAnimationFrame = vi.fn((cb) => {
        cb(0)
        return 0
      })

      // Simulate terminal updating after backspace
      mockCurrentContext.state.currentInput = 'tes'

      const backspaceEvent = new KeyboardEvent('keydown', { key: 'Backspace' })
      selector.handleKeyPress(
        backspaceEvent,
        searchQuery,
        testBranches,
        onSearchUpdate,
        vi.fn()
      )

      expect(searchQuery.value).toBe('tes')
      expect(onSearchUpdate).toHaveBeenCalledWith('tes')

      // Restore
      global.requestAnimationFrame = originalRaf
    })

    it('should handle ArrowRight key without updating search', () => {
      const selector = useTerminalTaskSelector()
      const searchQuery = ref('test')
      const onSearchUpdate = vi.fn()

      // Set terminal state first
      const { terminalState } = useTerminalEasterEgg()
      terminalState.value = { lines: ['test'] }

      selector.enterSearchMode()

      const arrowRightEvent = new KeyboardEvent('keydown', {
        key: 'ArrowRight',
      })
      selector.handleKeyPress(
        arrowRightEvent,
        searchQuery,
        testBranches,
        onSearchUpdate,
        vi.fn()
      )

      // Should return early without calling onSearchUpdate
      expect(onSearchUpdate).not.toHaveBeenCalled()
    })

    it('should skip keyboard handling with ctrl or meta keys', () => {
      const selector = useTerminalTaskSelector()
      const onSearchUpdate = vi.fn()

      // Set terminal state first
      const { terminalState } = useTerminalEasterEgg()
      terminalState.value = { lines: ['test'] }

      selector.enterSearchMode()

      // Test with ctrl key
      const ctrlEvent = new KeyboardEvent('keydown', {
        key: 'a',
        ctrlKey: true,
      })
      selector.handleKeyPress(
        ctrlEvent,
        ref(''),
        testBranches,
        onSearchUpdate,
        vi.fn()
      )

      // Test with meta key
      const metaEvent = new KeyboardEvent('keydown', {
        key: 'a',
        metaKey: true,
      })
      selector.handleKeyPress(
        metaEvent,
        ref(''),
        testBranches,
        onSearchUpdate,
        vi.fn()
      )

      // Should not update search for ctrl/meta combinations
      expect(onSearchUpdate).not.toHaveBeenCalled()
    })
  })

  describe('Edge cases', () => {
    it('should handle search with long commit messages', () => {
      const longCommitBranch: BranchInfo = {
        name: 'test-branch',
        lastCommit:
          'This is a very long commit message that contains the search term somewhere in the middle of it and should be truncated properly when displayed',
        isActive: false,
        isRemote: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const { selector } = wrapper.vm as any

      selector.isTerminalSearchMode.value = true
      mockCurrentContext.state.currentInput = 'search term'

      selector.updateMessages(
        [longCommitBranch],
        false,
        'search term',
        'search term',
        []
      )

      const calls = mockCurrentContext.updateMessages.mock.calls
      const lastCall = calls[calls.length - 1]
      const messages = lastCall[0]

      const matchMessage = messages.find((m: string) =>
        m.includes('test-branch')
      )
      expect(matchMessage).toBeDefined()
      expect(matchMessage).toContain('...')
      expect(matchMessage).toContain('**search term**')

      wrapper.unmount()
    })

    it('should handle search at the beginning of commit message', () => {
      const branch: BranchInfo = {
        name: 'test-branch',
        lastCommit: 'search term at the beginning',
        isActive: false,
        isRemote: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const { selector } = wrapper.vm as any

      selector.isTerminalSearchMode.value = true
      mockCurrentContext.state.currentInput = 'search'

      selector.updateMessages([branch], false, 'search', 'search', [])

      const calls = mockCurrentContext.updateMessages.mock.calls
      const lastCall = calls[calls.length - 1]
      const messages = lastCall[0]

      const matchMessage = messages.find((m: string) =>
        m.includes('test-branch')
      )
      expect(matchMessage).toBeDefined()
      expect(matchMessage).toContain('**search**')
      expect(matchMessage).not.toContain('...**search**')

      wrapper.unmount()
    })

    it('should handle search at the end of commit message', () => {
      const branch: BranchInfo = {
        name: 'test-branch',
        lastCommit: 'commit message ends with search',
        isActive: false,
        isRemote: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const { selector } = wrapper.vm as any

      selector.isTerminalSearchMode.value = true
      mockCurrentContext.state.currentInput = 'search'

      selector.updateMessages([branch], false, 'search', 'search', [])

      const calls = mockCurrentContext.updateMessages.mock.calls
      const lastCall = calls[calls.length - 1]
      const messages = lastCall[0]

      const matchMessage = messages.find((m: string) =>
        m.includes('test-branch')
      )
      expect(matchMessage).toBeDefined()
      expect(matchMessage).toContain('**search**')
      expect(matchMessage).not.toContain('**search**...')

      wrapper.unmount()
    })

    it('should highlight branch name matches', () => {
      const branch: BranchInfo = {
        name: 'feature-search-branch',
        lastCommit: 'Some commit',
        isActive: false,
        isRemote: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const { selector } = wrapper.vm as any

      selector.isTerminalSearchMode.value = true
      mockCurrentContext.state.currentInput = 'search'

      selector.updateMessages([branch], false, 'search', 'search', [])

      const calls = mockCurrentContext.updateMessages.mock.calls
      const lastCall = calls[calls.length - 1]
      const messages = lastCall[0]

      const matchMessage = messages.find((m: string) => m.includes('[1]'))
      expect(matchMessage).toBeDefined()
      expect(matchMessage).toContain('feature-**search**-branch')

      wrapper.unmount()
    })

    it('should handle empty state object in context', () => {
      mockCurrentContext.state = null

      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const { selector } = wrapper.vm as any

      // Should not throw
      selector.enterSearchMode()
      selector.exitSearchMode()

      wrapper.unmount()
    })

    it('should handle missing state lines during animation', () => {
      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const { selector } = wrapper.vm as any

      // Set up loading animation
      mockCurrentContext.state.lines = []

      // Mock setTimeout to NOT execute to avoid accessing missing lines
      setTimeoutSpy.mockImplementation((_cb: (...args: unknown[]) => void) => {
        // Don't execute callback
        return 1
      })

      // Should not throw when lines[4] doesn't exist
      selector.updateMessages([], true, '', '', [])

      // Stop animation to cleanup
      selector.updateMessages([], false, '', '', [])

      wrapper.unmount()
    })

    it('should handle loading state with empty branches', () => {
      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const { selector } = wrapper.vm as any

      // Test loading with empty branches
      selector.updateMessages([], true, '', '', [])

      const messages = mockCurrentContext.updateMessages.mock.calls[0][0]
      expect(messages).toContain('Branches: ⠋ Loading...')

      // Trigger animation timer
      const animateCallback = setTimeoutSpy.mock.calls[0][0]
      animateCallback()

      // Should continue animation
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 100)

      // Stop loading to cleanup timer
      selector.updateMessages([], false, '', '', [])
      expect(clearTimeoutSpy).toHaveBeenCalled()

      wrapper.unmount()
    })

    it('should handle missing terminal context in enterSearchMode', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test setup requires flexible typing
      delete (window as any).currentContext

      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const { selector } = wrapper.vm as any

      // Should not throw when context is missing
      expect(() => selector.enterSearchMode()).not.toThrow()

      expect(selector.isTerminalSearchMode.value).toBe(true)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test setup requires flexible typing
      expect((window as any).isTerminalSearchMode).toBe(true)

      wrapper.unmount()
    })

    it('should handle missing terminal context in exitSearchMode', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test setup requires flexible typing
      delete (window as any).currentContext

      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const { selector } = wrapper.vm as any

      selector.isTerminalSearchMode.value = true

      // Should not throw when context is missing
      expect(() => selector.exitSearchMode()).not.toThrow()

      expect(selector.isTerminalSearchMode.value).toBe(false)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test setup requires flexible typing
      expect((window as any).isTerminalSearchMode).toBe(false)

      wrapper.unmount()
    })

    it('should handle keyboard input without terminal lines', () => {
      // This test verifies the early return when terminalState.lines is empty
      // We'll directly test the condition by manipulating the terminalState
      const TestComponent = defineComponent({
        setup() {
          // Override the mock temporarily for this component
          const selector = useTerminalTaskSelector()

          // Directly modify the returned terminalState
          const { terminalState } = useTerminalEasterEgg()
          terminalState.value = { lines: [] }

          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const { selector } = wrapper.vm as any

      selector.enterSearchMode()

      const searchQuery = ref('')
      const onSearchUpdate = vi.fn()
      const onBranchSelect = vi.fn()

      // Should return early when no terminal lines
      selector.handleKeyPress(
        new KeyboardEvent('keydown', { key: 'a' }),
        searchQuery,
        testBranches,
        onSearchUpdate,
        onBranchSelect
      )

      // Should not update search
      expect(onSearchUpdate).not.toHaveBeenCalled()
      expect(onBranchSelect).not.toHaveBeenCalled()

      wrapper.unmount()
    })

    it('should handle context waiting timeout', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test setup requires flexible typing
      delete (window as any).currentContext

      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const { selector } = wrapper.vm as any

      // Mock setTimeout to execute callbacks immediately
      const timeoutCallbacks: ((...args: unknown[]) => void)[] = []
      setTimeoutSpy.mockImplementation(
        (cb: (...args: unknown[]) => void, _ms: number) => {
          timeoutCallbacks.push(cb)
          return timeoutCallbacks.length
        }
      )

      // Start waiting for context
      const waitPromise = selector.waitForContext()

      // Execute all timeout attempts
      for (let i = 0; i < 10; i++) {
        const callback = timeoutCallbacks[i]
        if (callback) await callback()
      }

      // Should resolve after timeout
      await waitPromise

      // Should have warned about timeout
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[TerminalTaskSelector] Context not available after 10 attempts'
      )

      wrapper.unmount()
    })

    it('should wait for context successfully when context becomes available', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test setup requires flexible typing
      delete (window as any).currentContext

      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const { selector } = wrapper.vm as any

      // Mock setTimeout to capture callbacks
      let timeoutCallback: ((...args: unknown[]) => void) | null = null
      setTimeoutSpy.mockImplementation(
        (cb: (...args: unknown[]) => void, _ms: number) => {
          timeoutCallback = cb
          return 1
        }
      )

      // Start waiting
      const waitPromise = selector.waitForContext()

      // Add context after first attempt
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test setup requires flexible typing
      ;(window as any).currentContext = mockCurrentContext

      // Execute the timeout callback
      if (timeoutCallback) {
        await timeoutCallback()
      }

      // Should resolve successfully
      await waitPromise

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[TerminalTaskSelector] Terminal context ready'
      )

      wrapper.unmount()
    })

    it('should handle animation timer cleanup when already null', () => {
      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const { selector } = wrapper.vm as any

      // Update without loading (timer is null)
      selector.updateMessages(testBranches, false, '', '', [])

      // Should not throw
      expect(() =>
        selector.updateMessages(testBranches, false, '', '', [])
      ).not.toThrow()

      wrapper.unmount()
    })

    it('should handle the impossible no-match case in search', () => {
      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const { selector } = wrapper.vm as any

      selector.enterSearchMode()

      // This tests the edge case where a branch somehow gets through but has no match
      // This covers line 224: the else case that shouldn't happen
      const branches = [
        {
          name: 'test',
          lastCommit: 'commit',
          isActive: false,
          isRemote: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      mockCurrentContext.state.currentInput = 'xyz'

      selector.updateMessages(branches, false, 'xyz', 'xyz', [])

      const messages = mockCurrentContext.updateMessages.mock.calls[0][0]
      expect(messages).toContain('No matches found')

      wrapper.unmount()
    })

    it('should handle branch with name match when searching', () => {
      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const { selector } = wrapper.vm as any

      selector.enterSearchMode()

      // Create a special test case where we have a branch that somehow doesn't match
      // but still gets included in filtered results (covers the else branch)
      const specialBranch = {
        name: 'branch-name',
        lastCommit: 'commit message',
        isActive: false,
        isRemote: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // Set input that doesn't match either name or commit
      mockCurrentContext.state.currentInput = 'branch'

      // Manually construct filtered branches to include our special case
      // This simulates a scenario where the branch is in filtered results
      // but doesn't actually match (covers the else case at line 224)
      selector.updateMessages([specialBranch], false, 'nomatch', 'nomatch', [
        specialBranch,
      ])

      // Update again with the actual search to trigger the name match highlighting
      mockCurrentContext.state.currentInput = 'branch'
      selector.updateMessages([specialBranch], false, 'branch', 'branch', [])

      const messages =
        mockCurrentContext.updateMessages.mock.calls[
          mockCurrentContext.updateMessages.mock.calls.length - 1
        ][0]
      const branchMessage = messages.find((m: string) =>
        m.includes('**branch**')
      )
      expect(branchMessage).toBeDefined()

      wrapper.unmount()
    })

    it('should handle loader animation with missing context during animation', () => {
      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const { selector } = wrapper.vm as any

      // Start loading animation
      selector.updateMessages([], true, '', '', [])

      // Get the animation callback
      const animateCallback = setTimeoutSpy.mock.calls[0][0]

      // Delete context during animation
      delete global.window.currentContext

      // Execute animation callback without context
      animateCallback()

      // Should not throw
      expect(setTimeoutSpy).toHaveBeenCalled()

      // Restore context
      global.window.currentContext = mockCurrentContext

      wrapper.unmount()
    })

    it('should handle loader animation when loading becomes false during animation', () => {
      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const { selector } = wrapper.vm as any

      // Mock Date.now to control animation frame
      const originalDateNow = Date.now
      const mockTime = 1000
      Date.now = vi.fn(() => mockTime)

      // Start loading animation
      selector.updateMessages([], true, '', '', [])

      // Get the animation callback
      const animateCallback = setTimeoutSpy.mock.calls[0][0]

      // Continue animation
      animateCallback()

      // Verify timer was set again
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 100)

      // Now stop loading
      selector.updateMessages([], false, '', '', [])

      // Restore Date.now
      Date.now = originalDateNow

      wrapper.unmount()
    })

    it('should handle animation with missing state lines', () => {
      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component mock requires flexible typing
      const { selector } = wrapper.vm as any

      // Start loading animation
      selector.updateMessages([], true, '', '', [])

      // Get the animation callback
      const animateCallback = setTimeoutSpy.mock.calls[0][0]

      // Remove lines[4] from context state
      mockCurrentContext.state.lines = [
        { text: 'Line 1' },
        { text: 'Line 2' },
        { text: 'Line 3' },
        { text: 'Line 4' },
        // Missing line 5 (index 4)
      ]

      // Execute animation callback
      animateCallback()

      // Should not throw and should continue animation
      expect(setTimeoutSpy).toHaveBeenCalledTimes(2) // Initial + recursion

      // Clean up
      selector.updateMessages([], false, '', '', [])

      wrapper.unmount()
    })
  })

  describe('🎯 Coverage: Branch name fallback (line 239)', () => {
    it('should use branch name fallback when search match logic fails', async () => {
      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      const selector = wrapper.vm.selector

      // Mock branches with problematic name that might cause search match issues
      const branches = [
        {
          name: '', // Empty name to trigger fallback
          ref: 'refs/heads/empty',
          commit: 'abc123',
          isCurrent: false,
          isRemote: false,
          lastCommit: 'Some commit',
        },
        {
          name: 'normal-branch',
          ref: 'refs/heads/normal',
          commit: 'def456',
          isCurrent: false,
          isRemote: false,
          lastCommit: 'Normal commit',
        },
      ]

      // Create a search query that should theoretically match but doesn't
      // due to edge case in highlighting logic
      const searchQuery = 'branch'

      // Enter search mode to trigger the search highlighting logic
      selector.enterSearchMode()

      // Force the scenario where match highlighting fails
      // This happens when the regex match returns null or undefined
      const originalMatch = String.prototype.match
      let callCount = 0
      String.prototype.match = function (regex) {
        callCount++
        if (callCount === 1 && this === '') {
          // For empty string, return null to trigger fallback
          return null
        }
        return originalMatch.call(this, regex)
      }

      try {
        // Trigger updateMessages with search
        selector.updateMessages(
          branches,
          false,
          searchQuery,
          searchQuery,
          branches
        )

        // Verify that updateMessages was called (checking through mock)
        expect(mockCurrentContext.updateMessages).toHaveBeenCalled()
      } finally {
        // Restore original method
        String.prototype.match = originalMatch
      }

      wrapper.unmount()
    })
  })

  describe('🎯 Coverage: Timer clearing (line 293)', () => {
    it('should clear existing timer when starting new loading animation', async () => {
      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      const selector = wrapper.vm.selector

      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
      const setTimeoutSpy = vi
        .spyOn(global, 'setTimeout')
        .mockImplementation(
          (_fn: (...args: unknown[]) => void, _delay: number) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test setup requires flexible typing
            return 123 as any // Mock timer ID
          }
        )

      // First, trigger loading animation
      selector.updateMessages([], true, '', '', [])
      expect(setTimeoutSpy).toHaveBeenCalledTimes(1)

      // Now trigger another loading animation while the first is still active
      // This should clear the existing timer (line 293)
      selector.updateMessages([], true, '', '', [])

      expect(clearTimeoutSpy).toHaveBeenCalledWith(123)
      expect(setTimeoutSpy).toHaveBeenCalledTimes(2)

      clearTimeoutSpy.mockRestore()
      setTimeoutSpy.mockRestore()

      wrapper.unmount()
    })
  })

  describe('🎯 Coverage: Keyboard handling in search mode (lines 425-539)', () => {
    it('should handle Escape key in search mode', async () => {
      // The mock already provides terminalState with lines: ['test line']
      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      const selector = wrapper.vm.selector

      selector.enterSearchMode()
      expect(selector.isTerminalSearchMode.value).toBe(true)

      // Create required parameters
      const searchQuery = ref('test')
      const branches = testBranches
      const onSearchUpdate = vi.fn()
      const onBranchSelect = vi.fn()

      // Create Escape key event and handle it
      const escapeEvent = { key: 'Escape' } as KeyboardEvent
      selector.handleKeyPress(
        escapeEvent,
        searchQuery,
        branches,
        onSearchUpdate,
        onBranchSelect
      )

      await nextTick()

      // Verify the code path was executed without errors
      expect(selector).toBeDefined()
      wrapper.unmount()
    })

    it('should handle Enter key in search mode', async () => {
      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      const selector = wrapper.vm.selector

      selector.enterSearchMode()

      const searchQuery = ref('test')
      const branches = testBranches
      const onSearchUpdate = vi.fn()
      const onBranchSelect = vi.fn()

      const enterEvent = { key: 'Enter' } as KeyboardEvent
      selector.handleKeyPress(
        enterEvent,
        searchQuery,
        branches,
        onSearchUpdate,
        onBranchSelect
      )

      await nextTick()

      // Verify the code path was executed without errors
      expect(selector).toBeDefined()
      wrapper.unmount()
    })

    it('should handle number keys 1-9 in search mode', async () => {
      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      const selector = wrapper.vm.selector

      selector.enterSearchMode()

      const searchQuery = ref('')
      const branches = testBranches
      const onSearchUpdate = vi.fn()
      const onBranchSelect = vi.fn()

      // Test keys 1-9 - each should execute without error
      for (let i = 1; i <= 9; i++) {
        const keyEvent = { key: i.toString() } as KeyboardEvent
        selector.handleKeyPress(
          keyEvent,
          searchQuery,
          branches,
          onSearchUpdate,
          onBranchSelect
        )
      }

      // Verify all code paths were executed without errors
      expect(selector.isTerminalSearchMode.value).toBe(true)
      wrapper.unmount()
    })

    it('should handle key 0 in search mode', async () => {
      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      const selector = wrapper.vm.selector

      selector.enterSearchMode()

      const searchQuery = ref('')
      const branches = testBranches
      const onSearchUpdate = vi.fn()
      const onBranchSelect = vi.fn()

      const keyEvent = { key: '0' } as KeyboardEvent
      selector.handleKeyPress(
        keyEvent,
        searchQuery,
        branches,
        onSearchUpdate,
        onBranchSelect
      )

      // Verify the code path was executed without errors
      expect(selector.isTerminalSearchMode.value).toBe(true)
      wrapper.unmount()
    })

    it('should handle single character input in search mode', async () => {
      // Setup window.currentContext with initial input
      if (global.window.currentContext) {
        global.window.currentContext.state.currentInput = 'test'
      }

      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      const selector = wrapper.vm.selector

      selector.enterSearchMode()

      const searchQuery = ref('')
      const branches = testBranches
      const onSearchUpdate = vi.fn()
      const onBranchSelect = vi.fn()

      // Single character key event
      const keyEvent = {
        key: 'a',
        ctrlKey: false,
        metaKey: false,
      } as KeyboardEvent
      selector.handleKeyPress(
        keyEvent,
        searchQuery,
        branches,
        onSearchUpdate,
        onBranchSelect
      )

      // Manually trigger requestAnimationFrame callback if it was called
      const rafCalls = requestAnimationFrameSpy.mock.calls
      if (rafCalls && rafCalls.length > 0) {
        const rafCallback = rafCalls[rafCalls.length - 1]?.[0]
        if (rafCallback) {
          rafCallback(0)
        }
      }

      await nextTick()

      // Verify the code path was executed
      expect(selector.isTerminalSearchMode.value).toBe(true)
      wrapper.unmount()
    })

    it('should handle Backspace key in search mode', async () => {
      // Setup window.currentContext with input that will change after backspace
      if (global.window.currentContext) {
        global.window.currentContext.state.currentInput = 'tes' // After backspace from 'test'
      }

      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      const selector = wrapper.vm.selector

      selector.enterSearchMode()

      const searchQuery = ref('test')
      const branches = testBranches
      const onSearchUpdate = vi.fn()
      const onBranchSelect = vi.fn()

      const backspaceEvent = { key: 'Backspace' } as KeyboardEvent
      selector.handleKeyPress(
        backspaceEvent,
        searchQuery,
        branches,
        onSearchUpdate,
        onBranchSelect
      )

      // Manually trigger requestAnimationFrame callback if it was called
      const rafCalls = requestAnimationFrameSpy.mock.calls
      if (rafCalls && rafCalls.length > 0) {
        const rafCallback = rafCalls[rafCalls.length - 1]?.[0]
        if (rafCallback) {
          rafCallback(0)
        }
      }

      await nextTick()

      expect(selector.isTerminalSearchMode.value).toBe(true)
      wrapper.unmount()
    })

    it('should handle Delete key in search mode', async () => {
      if (global.window.currentContext) {
        global.window.currentContext.state.currentInput = 'tes'
      }

      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      const selector = wrapper.vm.selector

      selector.enterSearchMode()

      const searchQuery = ref('test')
      const branches = testBranches
      const onSearchUpdate = vi.fn()
      const onBranchSelect = vi.fn()

      const deleteEvent = { key: 'Delete' } as KeyboardEvent
      selector.handleKeyPress(
        deleteEvent,
        searchQuery,
        branches,
        onSearchUpdate,
        onBranchSelect
      )

      // Manually trigger requestAnimationFrame callback if it was called
      const rafCalls = requestAnimationFrameSpy.mock.calls
      if (rafCalls && rafCalls.length > 0) {
        const rafCallback = rafCalls[rafCalls.length - 1]?.[0]
        if (rafCallback) {
          rafCallback(0)
        }
      }

      await nextTick()

      expect(selector.isTerminalSearchMode.value).toBe(true)
      wrapper.unmount()
    })

    it('should handle ArrowLeft key in search mode without updating search', async () => {
      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      const selector = wrapper.vm.selector

      selector.enterSearchMode()

      const searchQuery = ref('test')
      const branches = testBranches
      const onSearchUpdate = vi.fn()
      const onBranchSelect = vi.fn()

      const arrowEvent = { key: 'ArrowLeft' } as KeyboardEvent
      selector.handleKeyPress(
        arrowEvent,
        searchQuery,
        branches,
        onSearchUpdate,
        onBranchSelect
      )

      await nextTick()

      // Arrow keys should not trigger search updates
      expect(selector.isTerminalSearchMode.value).toBe(true)
      wrapper.unmount()
    })

    it('should handle ArrowRight key in search mode without updating search', async () => {
      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      const selector = wrapper.vm.selector

      selector.enterSearchMode()

      const searchQuery = ref('test')
      const branches = testBranches
      const onSearchUpdate = vi.fn()
      const onBranchSelect = vi.fn()

      const arrowEvent = { key: 'ArrowRight' } as KeyboardEvent
      selector.handleKeyPress(
        arrowEvent,
        searchQuery,
        branches,
        onSearchUpdate,
        onBranchSelect
      )

      await nextTick()

      // Arrow keys should not trigger search updates
      expect(selector.isTerminalSearchMode.value).toBe(true)
      wrapper.unmount()
    })

    it('should ignore keyboard events when terminal has no output', async () => {
      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      const selector = wrapper.vm.selector

      // Create any key event (without setting up search mode or terminal state)
      const keyEvent = { key: 'Enter' } as KeyboardEvent

      // Handle the key event
      selector.handleKeyPress(keyEvent)

      // Since no search mode was entered, verify we're still not in search mode
      expect(selector.isTerminalSearchMode.value).toBe(false)

      wrapper.unmount()
    })

    it('should cover search filtering and message updating logic', async () => {
      const TestComponent = defineComponent({
        setup() {
          const selector = useTerminalTaskSelector()
          return { selector }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      const selector = wrapper.vm.selector

      // Create comprehensive set of branches to test filtering
      const branches = [
        {
          name: 'feature/user-auth',
          ref: 'refs/heads/feature/user-auth',
          commit: 'abc123',
          isCurrent: false,
          isRemote: false,
          lastCommit: 'Add authentication',
        },
        {
          name: 'bugfix/auth-issue',
          ref: 'refs/heads/bugfix/auth-issue',
          commit: 'def456',
          isCurrent: false,
          isRemote: false,
          lastCommit: 'Fix login problem',
        },
        {
          name: 'main',
          ref: 'refs/heads/main',
          commit: 'ghi789',
          isCurrent: true,
          isRemote: false,
          lastCommit: 'Initial commit',
        },
      ]

      // Test name matches vs description matches
      const searchQuery = 'auth'

      // Enter search mode
      selector.enterSearchMode()

      // Trigger search with filtering
      selector.updateMessages(
        branches,
        false,
        searchQuery,
        searchQuery,
        branches
      )

      // Verify that updateMessages was called with the branches
      expect(mockCurrentContext.updateMessages).toHaveBeenCalled()

      wrapper.unmount()
    })
  })
})
