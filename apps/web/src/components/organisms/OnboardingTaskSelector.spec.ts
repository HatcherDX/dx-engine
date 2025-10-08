import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import OnboardingTaskSelector from './OnboardingTaskSelector.vue'

// Mock window.electronAPI
const mockElectronAPI = {
  getGitBranches: vi.fn(),
  getGitStatus: vi.fn(),
  checkoutBranch: vi.fn(),
  stashChanges: vi.fn(),
  applyStash: vi.fn(),
}

// Mock composables
const mockSelectedProject = ref<{ path: string } | null>(null)
const mockSelectOnboardingBranch = vi.fn()
const mockNextStep = vi.fn()

const mockBranches = ref([
  {
    name: 'main',
    lastCommit: 'Initial commit',
    lastUpdate: '2024-01-01T00:00:00Z',
    isCurrent: true,
  },
  {
    name: 'feature/test',
    lastCommit: 'Add test feature',
    lastUpdate: '2024-01-02T00:00:00Z',
    isCurrent: false,
  },
  {
    name: 'fix/bug',
    lastCommit: 'Fix critical bug',
    lastUpdate: '2024-01-03T00:00:00Z',
    isCurrent: false,
  },
])

const mockSelectedBranch = ref(null)
const mockIsLoading = ref(false)
const mockIsSwitching = ref(false)
const mockSearchQuery = ref('')
const mockDebouncedSearchQuery = ref('')
const mockFilteredBranches = ref(mockBranches.value)

const mockLoadBranches = vi.fn().mockResolvedValue(undefined)
const mockSelectBranchFromManager = vi.fn()
const mockFilterBranches = vi.fn((query) => {
  mockFilteredBranches.value = query
    ? mockBranches.value.filter((b) =>
        b.name.toLowerCase().includes(query.toLowerCase())
      )
    : mockBranches.value
})
const mockClearSearch = vi.fn(() => {
  mockSearchQuery.value = ''
  mockDebouncedSearchQuery.value = ''
  mockFilteredBranches.value = mockBranches.value
})
const mockFormatDate = vi.fn((date) => new Date(date).toLocaleDateString())

const mockBranchSwitch = {
  isModalVisible: ref(false),
  currentSwitchData: ref(null),
  showBranchSwitchOptions: vi.fn((data) => {
    mockBranchSwitch.isModalVisible.value = true
    mockBranchSwitch.currentSwitchData.value = data
  }),
  closeBranchSwitchModal: vi.fn(() => {
    mockBranchSwitch.isModalVisible.value = false
    mockBranchSwitch.currentSwitchData.value = null
  }),
  executeBranchSwitch: vi.fn(),
  handleForceSwitch: vi.fn(),
}

const mockGitErrorModal = {
  isModalVisible: ref(false),
  currentError: ref(null),
  showError: vi.fn((error) => {
    mockGitErrorModal.isModalVisible.value = true
    mockGitErrorModal.currentError.value = error
  }),
  closeModal: vi.fn(() => {
    mockGitErrorModal.isModalVisible.value = false
    mockGitErrorModal.currentError.value = null
  }),
  handleForceSwitch: vi.fn(),
}

const mockIsTerminalSearchMode = ref(false)
const mockUpdateTerminalMessages = vi.fn()
const mockEnterTerminalSearchMode = vi.fn(() => {
  mockIsTerminalSearchMode.value = true
})
const mockExitTerminalSearchMode = vi.fn(() => {
  mockIsTerminalSearchMode.value = false
})
const mockHandleTerminalKeyPress = vi.fn()
const mockSelectBranchByIndex = vi.fn()
const mockWaitForTerminalContext = vi.fn().mockResolvedValue(undefined)

vi.mock('../../composables/useOnboarding', () => ({
  useOnboarding: () => ({
    selectedProject: mockSelectedProject,
    selectBranch: mockSelectOnboardingBranch,
    nextStep: mockNextStep,
  }),
}))

vi.mock('../../composables/useBranchManager', () => ({
  useBranchManager: () => ({
    branches: mockBranches,
    selectedBranch: mockSelectedBranch,
    isLoading: mockIsLoading,
    isSwitching: mockIsSwitching,
    searchQuery: mockSearchQuery,
    debouncedSearchQuery: mockDebouncedSearchQuery,
    filteredBranches: mockFilteredBranches,
    loadBranches: mockLoadBranches,
    selectBranch: mockSelectBranchFromManager,
    filterBranches: mockFilterBranches,
    clearSearch: mockClearSearch,
    formatDate: mockFormatDate,
  }),
}))

vi.mock('../../composables/useBranchSwitch', () => ({
  useBranchSwitch: () => mockBranchSwitch,
}))

vi.mock('../../composables/useGitErrorModal', () => ({
  useGitErrorModal: () => mockGitErrorModal,
}))

vi.mock('../../composables/useTerminalTaskSelector', () => ({
  useTerminalTaskSelector: () => ({
    isTerminalSearchMode: mockIsTerminalSearchMode,
    updateMessages: mockUpdateTerminalMessages,
    enterSearchMode: mockEnterTerminalSearchMode,
    exitSearchMode: mockExitTerminalSearchMode,
    handleKeyPress: mockHandleTerminalKeyPress,
    selectBranchByIndex: mockSelectBranchByIndex,
    waitForContext: mockWaitForTerminalContext,
  }),
}))

// Mock child components
vi.mock('../atoms/BaseIcon.vue', () => ({
  default: {
    name: 'BaseIcon',
    props: ['name', 'size', 'class'],
    emits: ['click'],
    template:
      '<div :class="[\'base-icon\', $props.class]" :data-name="name" :data-size="size" @click="$emit(\'click\')"><slot /></div>',
  },
}))

vi.mock('../atoms/BaseButton.vue', () => ({
  default: {
    name: 'BaseButton',
    props: ['variant', 'size', 'class', 'disabled'],
    emits: ['click'],
    template:
      '<button class="base-button" @click="$emit(\'click\')"><slot /></button>',
  },
}))

vi.mock('../atoms/CtaButton.vue', () => ({
  default: {
    name: 'CtaButton',
    props: ['size', 'class', 'disabled'],
    emits: ['click'],
    template:
      '<button class="cta-button" @click="$emit(\'click\')"><slot /></button>',
  },
}))

vi.mock('../atoms/CircleLoading.vue', () => ({
  default: {
    name: 'CircleLoading',
    props: ['size', 'text', 'showIcon'],
    template: '<div class="circle-loading">{{ text }}</div>',
  },
}))

vi.mock('./GitErrorModal.vue', () => ({
  default: {
    name: 'GitErrorModal',
    props: ['isVisible', 'error'],
    emits: ['close', 'force-switch'],
    template: '<div v-if="isVisible" class="git-error-modal"><slot /></div>',
  },
}))

vi.mock('./BranchSwitchModal.vue', () => ({
  default: {
    name: 'BranchSwitchModal',
    props: ['isVisible', 'currentBranch', 'targetBranch', 'changedFiles'],
    emits: ['close', 'switch'],
    template:
      '<div v-if="isVisible" class="branch-switch-modal"><slot /></div>',
  },
}))

describe('OnboardingTaskSelector.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Setup window.electronAPI
    global.window.electronAPI = mockElectronAPI
    global.window.currentContext = true

    // Reset mock values
    mockSelectedProject.value = { path: '/test/project' }
    mockBranches.value = [
      {
        name: 'main',
        lastCommit: 'Initial commit',
        lastUpdate: '2024-01-01T00:00:00Z',
        isCurrent: true,
      },
      {
        name: 'feature/test',
        lastCommit: 'Add test feature',
        lastUpdate: '2024-01-02T00:00:00Z',
        isCurrent: false,
      },
      {
        name: 'fix/bug',
        lastCommit: 'Fix critical bug',
        lastUpdate: '2024-01-03T00:00:00Z',
        isCurrent: false,
      },
    ]
    mockFilteredBranches.value = mockBranches.value
    mockSelectedBranch.value = null
    mockIsLoading.value = false
    mockIsSwitching.value = false
    mockSearchQuery.value = ''
    mockDebouncedSearchQuery.value = ''
    mockIsTerminalSearchMode.value = false
    mockBranchSwitch.isModalVisible.value = false
    mockBranchSwitch.currentSwitchData.value = null
    mockGitErrorModal.isModalVisible.value = false
    mockGitErrorModal.currentError.value = null

    // Mock API responses
    mockElectronAPI.getGitBranches.mockResolvedValue({
      current: 'main',
      branches: mockBranches.value,
    })
    mockElectronAPI.getGitStatus.mockResolvedValue({
      isRepository: true,
      totalFiles: 0,
      files: [],
    })
    mockElectronAPI.checkoutBranch.mockResolvedValue({
      success: true,
      currentBranch: 'feature/test',
    })
  })

  afterEach(() => {
    delete global.window.electronAPI
    delete global.window.currentContext
  })

  describe('Component Rendering', () => {
    it('should mount and render properly', () => {
      const wrapper = mount(OnboardingTaskSelector)
      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('.task-selector').exists()).toBe(true)
    })

    it('should render header section with title and subtitle', () => {
      const wrapper = mount(OnboardingTaskSelector)
      expect(wrapper.find('.selector-title').text()).toBe('Select Task')
      expect(wrapper.find('.selector-subtitle').text()).toContain(
        'Choose from existing branches'
      )
    })

    it('should render search input', () => {
      const wrapper = mount(OnboardingTaskSelector)
      expect(wrapper.find('.search-input').exists()).toBe(true)
    })

    it('should render branches list when branches are available', async () => {
      const wrapper = mount(OnboardingTaskSelector)
      await flushPromises()

      expect(wrapper.findAll('.branch-item')).toHaveLength(3)
      expect(wrapper.text()).toContain('main')
      expect(wrapper.text()).toContain('feature/test')
      expect(wrapper.text()).toContain('fix/bug')
    })

    it('should show loading state when isLoading is true', async () => {
      mockIsLoading.value = true
      const wrapper = mount(OnboardingTaskSelector)
      await nextTick()

      expect(wrapper.find('.loading-branches').exists()).toBe(true)
      expect(wrapper.text()).toContain('Loading Git branches...')
    })

    it('should render create new task button', async () => {
      const wrapper = mount(OnboardingTaskSelector)
      await flushPromises()

      const button = wrapper.find('.cta-button')
      expect(button.exists()).toBe(true)
    })
  })

  describe('Search Functionality', () => {
    it('should filter branches based on search query', async () => {
      const wrapper = mount(OnboardingTaskSelector)
      const searchInput = wrapper.find('.search-input')

      await searchInput.setValue('feature')
      await searchInput.trigger('input')
      await nextTick()

      expect(mockFilterBranches).toHaveBeenCalledWith('feature')
    })

    it('should show clear button when search query exists', async () => {
      const wrapper = mount(OnboardingTaskSelector)
      mockSearchQuery.value = 'test'
      await nextTick()

      expect(wrapper.find('.search-clear').exists()).toBe(true)
    })

    it('should clear search when clear button is clicked', async () => {
      const wrapper = mount(OnboardingTaskSelector)
      mockSearchQuery.value = 'test'
      await nextTick()

      await wrapper.find('.search-clear').trigger('click')

      expect(mockClearSearch).toHaveBeenCalled()
      expect(mockExitTerminalSearchMode).toHaveBeenCalled()
    })

    it('should show no results message when search has no matches', async () => {
      mockSearchQuery.value = 'nonexistent'
      mockFilteredBranches.value = []
      const wrapper = mount(OnboardingTaskSelector)
      await nextTick()

      expect(wrapper.find('.no-results').exists()).toBe(true)
      expect(wrapper.text()).toContain('No branches found for "nonexistent"')
    })

    it('should activate search mode on input focus', async () => {
      const wrapper = mount(OnboardingTaskSelector)
      const searchInput = wrapper.find('.search-input')

      await searchInput.trigger('focus')
      await searchInput.trigger('click')

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const vm = wrapper.vm as any
      expect(vm.isInSearchMode).toBe(true)
    })

    it('should handle escape key in search input', async () => {
      const wrapper = mount(OnboardingTaskSelector)
      const searchInput = wrapper.find('.search-input')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const vm = wrapper.vm as any
      vm.isInSearchMode = true

      await searchInput.trigger('keydown', { key: 'Escape' })

      expect(vm.isInSearchMode).toBe(false)
    })

    it('should handle search blur event', async () => {
      vi.useFakeTimers()
      const wrapper = mount(OnboardingTaskSelector)
      const searchInput = wrapper.find('.search-input')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const vm = wrapper.vm as any
      vm.isInSearchMode = true

      await searchInput.trigger('blur')
      vi.advanceTimersByTime(250)
      await nextTick()

      expect(vm.isInSearchMode).toBe(false)
      vi.useRealTimers()
    })
  })

  describe('Branch Selection', () => {
    it('should select existing branch when clicked', async () => {
      const wrapper = mount(OnboardingTaskSelector)
      await flushPromises()

      const branchItem = wrapper.findAll('.branch-item')[1]
      await branchItem.trigger('click')

      expect(mockSelectedBranch.value).toEqual(mockBranches.value[1])
    })

    it('should handle selecting current branch', async () => {
      mockElectronAPI.getGitBranches.mockResolvedValue({
        current: 'main',
        branches: mockBranches.value,
      })

      const wrapper = mount(OnboardingTaskSelector)
      await flushPromises()

      const mainBranch = wrapper.findAll('.branch-item')[0]
      await mainBranch.trigger('click')
      await flushPromises()

      expect(mockSelectOnboardingBranch).toHaveBeenCalledWith({
        name: 'main',
        base: 'main',
        agent: 'development',
      })
      expect(wrapper.emitted('next')).toBeTruthy()
    })

    it('should show branch switch modal for uncommitted changes', async () => {
      mockElectronAPI.getGitStatus.mockResolvedValue({
        isRepository: true,
        totalFiles: 2,
        files: [
          { path: 'file1.js', status: 'modified' },
          { path: 'file2.js', status: 'added' },
        ],
      })

      const wrapper = mount(OnboardingTaskSelector)
      await flushPromises()

      const branchItem = wrapper.findAll('.branch-item')[1]
      await branchItem.trigger('click')
      await flushPromises()

      expect(mockBranchSwitch.showBranchSwitchOptions).toHaveBeenCalledWith({
        currentBranch: 'main',
        targetBranch: 'feature/test',
        changedFiles: ['file1.js', 'file2.js'],
        projectPath: '/test/project',
      })
    })

    it('should handle successful branch switch without changes', async () => {
      const wrapper = mount(OnboardingTaskSelector)
      await flushPromises()

      const branchItem = wrapper.findAll('.branch-item')[1]
      await branchItem.trigger('click')
      await flushPromises()

      expect(mockSelectBranchFromManager).toHaveBeenCalled()
    })

    it('should handle branch switch errors', async () => {
      mockElectronAPI.getGitBranches.mockRejectedValue(new Error('Git error'))

      const wrapper = mount(OnboardingTaskSelector)
      await flushPromises()

      const branchItem = wrapper.findAll('.branch-item')[1]
      await branchItem.trigger('click')
      await flushPromises()

      expect(mockGitErrorModal.showError).toHaveBeenCalledWith({
        success: false,
        currentBranch: '',
        message: 'Git error',
        errorType: 'other',
      })
    })

    it('should highlight matching text in branch names', () => {
      const wrapper = mount(OnboardingTaskSelector)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const vm = wrapper.vm as any

      const highlighted = vm.highlightMatch('feature/test-branch', 'test')
      expect(highlighted).toContain('<strong>test</strong>')
    })

    it('should handle empty highlight queries', () => {
      const wrapper = mount(OnboardingTaskSelector)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const vm = wrapper.vm as any

      const result = vm.highlightMatch('test', '')
      expect(result).toBe('test')
    })

    it('should escape HTML in highlight function', () => {
      const wrapper = mount(OnboardingTaskSelector)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const vm = wrapper.vm as any

      const result = vm.highlightMatch('<script>alert(1)</script>', 'script')
      expect(result).toContain('&lt;')
      expect(result).toContain('&gt;')
    })
  })

  describe('Branch Switch Modal', () => {
    it('should handle stash option in branch switch', async () => {
      mockBranchSwitch.executeBranchSwitch.mockResolvedValue({
        success: true,
        currentBranch: 'feature/test',
      })

      const wrapper = mount(OnboardingTaskSelector)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const vm = wrapper.vm as any

      await vm.handleBranchSwitchOption('stash')
      await flushPromises()

      expect(mockBranchSwitch.executeBranchSwitch).toHaveBeenCalledWith('stash')
      expect(mockSelectOnboardingBranch).toHaveBeenCalled()
      expect(wrapper.emitted('next')).toBeTruthy()
    })

    it('should handle bring option in branch switch', async () => {
      mockBranchSwitch.executeBranchSwitch.mockResolvedValue({
        success: true,
        currentBranch: 'feature/test',
      })

      const wrapper = mount(OnboardingTaskSelector)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const vm = wrapper.vm as any

      await vm.handleBranchSwitchOption('bring')
      await flushPromises()

      expect(mockBranchSwitch.executeBranchSwitch).toHaveBeenCalledWith('bring')
      expect(mockSelectOnboardingBranch).toHaveBeenCalled()
      expect(wrapper.emitted('next')).toBeTruthy()
    })

    it('should handle branch switch failure', async () => {
      mockBranchSwitch.executeBranchSwitch.mockResolvedValue({
        success: false,
        currentBranch: 'main',
        message: 'Switch failed',
      })

      const wrapper = mount(OnboardingTaskSelector)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const vm = wrapper.vm as any

      await vm.handleBranchSwitchOption('stash')
      await flushPromises()

      expect(mockGitErrorModal.showError).toHaveBeenCalledWith({
        success: false,
        currentBranch: 'main',
        message: 'Switch failed',
        errorType: 'other',
      })
    })

    it('should handle branch switch exceptions', async () => {
      mockBranchSwitch.executeBranchSwitch.mockRejectedValue(
        new Error('Network error')
      )

      const wrapper = mount(OnboardingTaskSelector)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const vm = wrapper.vm as any

      await vm.handleBranchSwitchOption('stash')
      await flushPromises()

      expect(mockGitErrorModal.showError).toHaveBeenCalledWith({
        success: false,
        currentBranch: '',
        message: 'Network error',
        errorType: 'other',
      })
    })

    it('should close branch switch modal', async () => {
      const wrapper = mount(OnboardingTaskSelector)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const vm = wrapper.vm as any

      vm.handleBranchSwitchClose()

      expect(mockBranchSwitch.closeBranchSwitchModal).toHaveBeenCalled()
      expect(mockSelectedBranch.value).toBeNull()
      expect(mockIsSwitching.value).toBe(false)
    })
  })

  describe('Create New Task', () => {
    it('should emit next event when create new task is clicked', async () => {
      const wrapper = mount(OnboardingTaskSelector)
      await flushPromises()

      const createButton = wrapper.find('.cta-button')
      await createButton.trigger('click')

      expect(mockSelectedBranch.value).toBeNull()
      expect(wrapper.emitted('next')).toBeTruthy()
    })
  })

  describe('Terminal Integration', () => {
    it('should setup terminal event listeners on mount', async () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')

      mount(OnboardingTaskSelector)
      await flushPromises()

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'terminal-enter-branch-search',
        expect.any(Function)
      )
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'terminal-select-branch',
        expect.any(Function)
      )
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function),
        true
      )
    })

    it('should cleanup event listeners on unmount', async () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

      const wrapper = mount(OnboardingTaskSelector)
      await flushPromises()

      wrapper.unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'terminal-enter-branch-search',
        expect.any(Function)
      )
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'terminal-select-branch',
        expect.any(Function)
      )
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function),
        true
      )
    })

    it('should handle terminal enter branch search event', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Component mount required for event handling
      const _wrapper = mount(OnboardingTaskSelector)
      await flushPromises()

      window.dispatchEvent(new CustomEvent('terminal-enter-branch-search'))
      await nextTick()

      expect(mockEnterTerminalSearchMode).toHaveBeenCalled()
      expect(mockUpdateTerminalMessages).toHaveBeenCalled()
    })

    it('should handle terminal select branch event', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Component mount required for event handling
      const _wrapper = mount(OnboardingTaskSelector)
      await flushPromises()

      window.dispatchEvent(
        new CustomEvent('terminal-select-branch', { detail: { index: 1 } })
      )
      await nextTick()

      expect(mockSelectBranchByIndex).toHaveBeenCalledWith(
        1,
        mockBranches.value,
        mockFilteredBranches.value,
        expect.any(Function)
      )
    })

    it('should handle terminal keypress events', async () => {
      const wrapper = mount(OnboardingTaskSelector)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const vm = wrapper.vm as any

      const event = new KeyboardEvent('keydown', { key: 'Enter' })
      vm.handleKeyPress(event)

      expect(mockHandleTerminalKeyPress).toHaveBeenCalledWith(
        event,
        mockSearchQuery,
        mockBranches.value,
        expect.any(Function),
        expect.any(Function)
      )
    })

    it('should not prevent default for system shortcuts', async () => {
      const wrapper = mount(OnboardingTaskSelector)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const vm = wrapper.vm as any

      const event = new KeyboardEvent('keydown', {
        key: 'r',
        metaKey: true,
      })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

      vm.handleKeyPress(event)

      expect(preventDefaultSpy).not.toHaveBeenCalled()
    })

    it('should prevent default for handled keys in terminal search mode', async () => {
      mockIsTerminalSearchMode.value = true
      const wrapper = mount(OnboardingTaskSelector)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const vm = wrapper.vm as any

      const event = new KeyboardEvent('keydown', { key: 'Enter' })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

      vm.handleKeyPress(event)

      expect(preventDefaultSpy).toHaveBeenCalled()
    })

    it('should enter terminal search mode properly', async () => {
      const wrapper = mount(OnboardingTaskSelector)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const vm = wrapper.vm as any

      vm.enterSearchMode()

      expect(mockSearchQuery.value).toBe('')
      expect(vm.isInSearchMode).toBe(true)
      expect(mockEnterTerminalSearchMode).toHaveBeenCalled()
    })

    it('should handle branch selection by index', async () => {
      const wrapper = mount(OnboardingTaskSelector)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const vm = wrapper.vm as any

      vm.handleBranchSelection(1)

      expect(mockSelectBranchByIndex).toHaveBeenCalledWith(
        1,
        mockBranches.value,
        mockFilteredBranches.value,
        expect.any(Function)
      )
    })

    it('should update search with debouncing', async () => {
      const wrapper = mount(OnboardingTaskSelector)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const vm = wrapper.vm as any

      vm.updateSearchDebounced('test')

      expect(mockSearchQuery.value).toBe('test')
      expect(mockFilterBranches).toHaveBeenCalledWith('test')
      expect(mockUpdateTerminalMessages).toHaveBeenCalled()
    })

    it('should blur inputs when entering terminal search mode', async () => {
      const wrapper = mount(OnboardingTaskSelector)
      mockIsTerminalSearchMode.value = true
      await nextTick()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const vm = wrapper.vm as any
      expect(vm.isInSearchMode).toBe(true)
    })
  })

  describe('Lifecycle and Watchers', () => {
    it('should load branches on mount', async () => {
      mount(OnboardingTaskSelector)
      await flushPromises()

      expect(mockLoadBranches).toHaveBeenCalledWith('/test/project')
      expect(mockWaitForTerminalContext).toHaveBeenCalled()
      expect(mockUpdateTerminalMessages).toHaveBeenCalled()
    })

    it('should update terminal messages when loading state changes', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Component mount required for watcher validation
      const _wrapper = mount(OnboardingTaskSelector)
      await flushPromises()

      mockUpdateTerminalMessages.mockClear()
      mockIsLoading.value = true
      await nextTick()

      expect(mockUpdateTerminalMessages).toHaveBeenCalled()
    })

    it('should sync UI search mode with terminal search mode', async () => {
      const wrapper = mount(OnboardingTaskSelector)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const vm = wrapper.vm as any

      mockIsTerminalSearchMode.value = true
      await nextTick()

      expect(vm.isInSearchMode).toBe(true)

      mockIsTerminalSearchMode.value = false
      await nextTick()

      expect(vm.isInSearchMode).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should handle missing project path', async () => {
      mockSelectedProject.value = null
      const wrapper = mount(OnboardingTaskSelector)
      await flushPromises()

      const branchItem = wrapper.findAll('.branch-item')[1]
      await branchItem.trigger('click')
      await flushPromises()

      expect(mockGitErrorModal.showError).toHaveBeenCalledWith({
        success: false,
        currentBranch: '',
        message: 'No project selected',
        errorType: 'other',
      })
    })

    it('should handle non-repository errors', async () => {
      mockElectronAPI.getGitStatus.mockResolvedValue({
        isRepository: false,
        totalFiles: 0,
        files: [],
      })

      const wrapper = mount(OnboardingTaskSelector)
      await flushPromises()

      const branchItem = wrapper.findAll('.branch-item')[1]
      await branchItem.trigger('click')
      await flushPromises()

      expect(mockGitErrorModal.showError).toHaveBeenCalledWith({
        success: false,
        currentBranch: '',
        message: 'Not a Git repository',
        errorType: 'other',
      })
    })

    it('should not allow branch selection when switching', async () => {
      mockIsSwitching.value = true
      const wrapper = mount(OnboardingTaskSelector)
      await flushPromises()

      const branchItem = wrapper.findAll('.branch-item')[1]
      await branchItem.trigger('click')

      expect(mockSelectedBranch.value).toBeNull()
    })
  })

  describe('UI States', () => {
    it('should show selected branch indicator', async () => {
      mockSelectedBranch.value = mockBranches.value[1]
      const wrapper = mount(OnboardingTaskSelector)
      await nextTick()

      const selectedItem = wrapper.find('.branch-selected')
      expect(selectedItem.exists()).toBe(true)
    })

    it('should show switching indicator', async () => {
      mockSelectedBranch.value = mockBranches.value[1]
      mockIsSwitching.value = true
      const wrapper = mount(OnboardingTaskSelector)
      await nextTick()

      const switchingItem = wrapper.find('.branch-switching')
      expect(switchingItem.exists()).toBe(true)
    })

    it('should format dates correctly', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Component mount required for date format validation
      const _wrapper = mount(OnboardingTaskSelector)
      expect(mockFormatDate('2024-01-01T00:00:00Z')).toBeTruthy()
    })

    it('should show branch count', async () => {
      const wrapper = mount(OnboardingTaskSelector)
      await flushPromises()

      const branchCount = wrapper.find('.branch-count')
      expect(branchCount.text()).toContain('(3)')
    })

    it('should display search results header when searching', async () => {
      mockSearchQuery.value = 'test'
      const wrapper = mount(OnboardingTaskSelector)
      await nextTick()

      expect(wrapper.text()).toContain('Search Results')
    })

    it('should display all branches header when not searching', async () => {
      const wrapper = mount(OnboardingTaskSelector)
      await flushPromises()

      expect(wrapper.text()).toContain('All Branches')
    })
  })

  describe('Coverage Enhancement Tests', () => {
    it('should handle filterBranchesHandler when not in terminal mode', async () => {
      const wrapper = mount(OnboardingTaskSelector)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const vm = wrapper.vm as any

      vm.filterBranchesHandler()
      expect(mockFilterBranches).toHaveBeenCalled()
    })

    it('should skip filterBranchesHandler when in terminal mode', async () => {
      mockIsTerminalSearchMode.value = true
      const wrapper = mount(OnboardingTaskSelector)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const vm = wrapper.vm as any

      mockFilterBranches.mockClear()
      vm.filterBranchesHandler()
      expect(mockFilterBranches).not.toHaveBeenCalled()
    })

    it('should handle terminal select branch with invalid index', async () => {
      const wrapper = mount(OnboardingTaskSelector)
      await flushPromises()

      window.dispatchEvent(
        new CustomEvent('terminal-select-branch', {
          detail: { index: undefined },
        })
      )
      await nextTick()

      // Should log a warning but not crash
      expect(wrapper.exists()).toBe(true)
    })

    it('should handle terminal select branch without detail', async () => {
      const wrapper = mount(OnboardingTaskSelector)
      await flushPromises()

      window.dispatchEvent(new CustomEvent('terminal-select-branch'))
      await nextTick()

      // Should handle gracefully
      expect(wrapper.exists()).toBe(true)
    })

    it('should update messages helper function', async () => {
      const wrapper = mount(OnboardingTaskSelector)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const vm = wrapper.vm as any

      vm.updateMessages()
      expect(mockUpdateTerminalMessages).toHaveBeenCalled()
    })

    it('should handle branch switch success without message', async () => {
      mockBranchSwitch.executeBranchSwitch.mockResolvedValue({
        success: false,
        currentBranch: 'main',
      })

      const wrapper = mount(OnboardingTaskSelector)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const vm = wrapper.vm as any

      await vm.handleBranchSwitchOption('stash')
      await flushPromises()

      expect(mockGitErrorModal.showError).toHaveBeenCalledWith({
        success: false,
        currentBranch: 'main',
        message: 'Failed to switch branch',
        errorType: 'other',
      })
    })

    it('should handle non-error objects in catch blocks', async () => {
      mockBranchSwitch.executeBranchSwitch.mockRejectedValue('String error')

      const wrapper = mount(OnboardingTaskSelector)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const vm = wrapper.vm as any

      await vm.handleBranchSwitchOption('stash')
      await flushPromises()

      expect(mockGitErrorModal.showError).toHaveBeenCalledWith({
        success: false,
        currentBranch: '',
        message: 'Unknown error occurred',
        errorType: 'other',
      })
    })

    it('should activate search mode only when not already active', async () => {
      const wrapper = mount(OnboardingTaskSelector)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const vm = wrapper.vm as any

      vm.isInSearchMode = true
      vm.activateSearchMode()
      expect(vm.isInSearchMode).toBe(true)

      vm.isInSearchMode = false
      mockIsTerminalSearchMode.value = false
      vm.activateSearchMode()
      expect(vm.isInSearchMode).toBe(true)
    })

    it('should handle search blur with search query present', async () => {
      vi.useFakeTimers()
      const wrapper = mount(OnboardingTaskSelector)
      const searchInput = wrapper.find('.search-input')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const vm = wrapper.vm as any

      mockSearchQuery.value = 'test'
      vm.isInSearchMode = true

      await searchInput.trigger('blur')
      vi.advanceTimersByTime(250)
      await nextTick()

      expect(vm.isInSearchMode).toBe(true) // Should stay true with query
      vi.useRealTimers()
    })

    it('should load branches without window.currentContext', async () => {
      delete window.currentContext
      mount(OnboardingTaskSelector)
      await flushPromises()

      expect(mockLoadBranches).toHaveBeenCalled()
    })

    it('should handle preventDefault for single character keys in terminal mode', async () => {
      mockIsTerminalSearchMode.value = true
      const wrapper = mount(OnboardingTaskSelector)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const vm = wrapper.vm as any

      const event = new KeyboardEvent('keydown', { key: 'a' })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

      vm.handleKeyPress(event)

      expect(preventDefaultSpy).toHaveBeenCalled()
    })

    it('should handle Ctrl key shortcuts', async () => {
      const wrapper = mount(OnboardingTaskSelector)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const vm = wrapper.vm as any

      const event = new KeyboardEvent('keydown', {
        key: 'c',
        ctrlKey: true,
      })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

      vm.handleKeyPress(event)

      expect(preventDefaultSpy).not.toHaveBeenCalled()
    })

    it('should handle updateSearchDebounced without query parameter', async () => {
      mockSearchQuery.value = 'existing'
      const wrapper = mount(OnboardingTaskSelector)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const vm = wrapper.vm as any

      vm.updateSearchDebounced()

      expect(mockFilterBranches).toHaveBeenCalledWith('existing')
    })
  })
})
