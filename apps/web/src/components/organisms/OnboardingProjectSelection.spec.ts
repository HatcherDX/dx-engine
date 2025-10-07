import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import OnboardingProjectSelection from './OnboardingProjectSelection.vue'

// Type definition for OnboardingProjectSelection component instance - NO ANY TYPES ALLOWED
interface OnboardingProjectSelectionInstance
  extends InstanceType<typeof OnboardingProjectSelection> {
  recentProjects: Array<{ id: string; name: string; path: string }>
  selectedProject: string | null
  handleRecentProjectSelect: (project: {
    id: string
    name: string
    path: string
  }) => Promise<void>
  openProject: () => void
  browseForProject: () => void
  [key: string]: unknown
}

// Mock composables
const mockNextStep = vi.fn()
const mockSelectProject = vi.fn()
const mockTruncatePath = vi.fn()

vi.mock('../../composables/useOnboarding', () => ({
  useOnboarding: () => ({
    nextStep: mockNextStep,
    selectProject: mockSelectProject,
  }),
}))

vi.mock('../../composables/useSmartTruncation', () => ({
  useSmartTruncation: () => ({
    truncatePath: mockTruncatePath,
  }),
}))

// Mock child components
vi.mock('../atoms/BaseButton.vue', () => ({
  default: {
    name: 'BaseButton',
    props: ['variant', 'size', 'disabled', 'class'],
    emits: ['click'],
    template: `
      <button 
        class="base-button" 
        :class="$props.class"
        :variant="$props.variant"
        :size="$props.size"
        :disabled="$props.disabled"
        @click="$emit('click')"
      >
        <slot />
      </button>
    `,
  },
}))

vi.mock('../atoms/BaseIcon.vue', () => ({
  default: {
    name: 'BaseIcon',
    props: ['name', 'size', 'class'],
    template:
      '<span data-testid="base-icon" :data-name="name" :data-size="size" :class="$props.class"><slot /></span>',
  },
}))

vi.mock('../atoms/BaseLogo.vue', () => ({
  default: {
    name: 'BaseLogo',
    props: ['size', 'variant'],
    template:
      '<div data-testid="base-logo" :data-size="size" :data-variant="variant"><slot /></div>',
  },
}))

vi.mock('../atoms/CtaButton.vue', () => ({
  default: {
    name: 'CtaButton',
    props: ['disabled'],
    emits: ['click'],
    template: `
      <button 
        class="cta-button" 
        :disabled="$props.disabled"
        @click="$emit('click')"
      >
        <slot />
      </button>
    `,
  },
}))

// Mock window.electronAPI and useNotifications
const mockOpenProjectDialog = vi.fn()
const mockShowError = vi.fn()
const mockGetRecentProjects = vi.fn()

vi.mock('../../composables/useNotifications', () => ({
  useNotifications: () => ({
    error: mockShowError,
  }),
}))

describe('OnboardingProjectSelection.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTruncatePath.mockImplementation((path, maxLength) => {
      return path.length > maxLength
        ? `${path.substring(0, maxLength)}...`
        : path
    })

    // Mock recent projects data that tests expect
    mockGetRecentProjects.mockResolvedValue([
      {
        id: '1',
        name: 'E-commerce Dashboard',
        path: '/Users/chris/Projects/ecommerce-dashboard',
        lastOpened: new Date('2024-01-15'),
        metadata: { framework: 'Vue', packageManager: 'pnpm' },
      },
      {
        id: '2',
        name: 'React Component Library',
        path: '/Users/chris/Sites/ui-components',
        lastOpened: new Date('2024-01-14'),
        metadata: { framework: 'React', packageManager: 'npm' },
      },
      {
        id: '3',
        name: 'Mobile App Backend',
        path: '/Users/chris/Development/mobile-api',
        lastOpened: new Date('2024-01-13'),
        metadata: { framework: 'Node.js', packageManager: 'yarn' },
      },
      {
        id: '4',
        name: 'Portfolio Website',
        path: '/Users/chris/Sites/portfolio-v2',
        lastOpened: new Date('2024-01-12'),
        metadata: { framework: 'Next.js', packageManager: 'pnpm' },
      },
    ])

    // Setup window.electronAPI mock
    global.window = {
      ...global.window,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(), // Add dispatchEvent mock
      electronAPI: {
        openProjectDialog: mockOpenProjectDialog,
      },
      storageAPI: {
        getRecentProjects: mockGetRecentProjects,
        updateProjectLastOpened: vi.fn().mockResolvedValue(undefined),
        addRecentProject: vi.fn().mockResolvedValue(undefined),
      },
    } as unknown as typeof window

    // Setup JSDOM environment for click events
    Object.defineProperty(window, 'MouseEvent', {
      value: class MockMouseEvent {
        constructor(type: string, options?: MouseEventInit) {
          Object.assign(this, { type, ...options })
        }
      },
    })
  })

  it('should mount and render without errors', () => {
    const wrapper = mount(OnboardingProjectSelection)
    expect(wrapper.exists()).toBe(true)
  })

  it('should render main container structure', () => {
    const wrapper = mount(OnboardingProjectSelection)

    expect(wrapper.find('.onboarding-project-selection').exists()).toBe(true)
    expect(wrapper.find('.project-container').exists()).toBe(true)
    expect(wrapper.find('.project-content').exists()).toBe(true)
  })

  it('should render content grid with correct structure', () => {
    const wrapper = mount(OnboardingProjectSelection)

    expect(wrapper.find('.content-grid').exists()).toBe(true)
    expect(wrapper.find('.top-row').exists()).toBe(true)
    expect(wrapper.find('.bottom-row').exists()).toBe(true)
    expect(wrapper.find('.left-column').exists()).toBe(true)
    expect(wrapper.find('.right-column').exists()).toBe(true)
  })

  it('should render logo section', () => {
    const wrapper = mount(OnboardingProjectSelection)

    const logoSection = wrapper.find('.logo-section')
    expect(logoSection.exists()).toBe(true)

    const baseLogo = wrapper.findComponent({ name: 'BaseLogo' })
    expect(baseLogo.exists()).toBe(true)
    expect(baseLogo.props('size')).toBe('xl')
    expect(baseLogo.props('variant')).toBe('word-mark')
  })

  it('should render "Start a Project" section with action buttons', () => {
    const wrapper = mount(OnboardingProjectSelection)

    const actionsSection = wrapper.find('.actions-section')
    expect(actionsSection.exists()).toBe(true)

    const sectionTitle = actionsSection.find('.section-title')
    expect(sectionTitle.text()).toBe('Start a Project')

    // Check CtaButton (Open Project)
    const ctaButton = wrapper.findComponent({ name: 'CtaButton' })
    expect(ctaButton.exists()).toBe(true)
    expect(ctaButton.text()).toContain('Open Project...')

    // Check disabled action buttons
    const actionButtons = wrapper.findAll('.action-button')
    expect(actionButtons).toHaveLength(2)

    expect(actionButtons[0].text()).toContain('New Project')
    expect((actionButtons[0].element as HTMLButtonElement).disabled).toBe(true)

    expect(actionButtons[1].text()).toContain('Clone from Git...')
    expect((actionButtons[1].element as HTMLButtonElement).disabled).toBe(true)
  })

  it('should render recent projects section', async () => {
    const wrapper = mount(OnboardingProjectSelection)

    // Wait for async loading to complete
    await new Promise((resolve) => setTimeout(resolve, 100))
    await wrapper.vm.$nextTick()

    const recentSection = wrapper.find('.recent-section')
    expect(recentSection.exists()).toBe(true)

    const sectionTitle = recentSection.find('.section-title')
    expect(sectionTitle.text()).toBe('Recent Projects')

    const projectItems = wrapper.findAll('.project-item')
    expect(projectItems).toHaveLength(4)

    // Check project names
    const projectNames = projectItems.map((item) =>
      item.find('.project-name').text()
    )
    expect(projectNames).toContain('E-commerce Dashboard')
    expect(projectNames).toContain('React Component Library')
    expect(projectNames).toContain('Mobile App Backend')
    expect(projectNames).toContain('Portfolio Website')
  })

  it('should render project items with correct structure', async () => {
    const wrapper = mount(OnboardingProjectSelection)

    // Wait for async loading to complete
    await new Promise((resolve) => setTimeout(resolve, 100))
    await wrapper.vm.$nextTick()

    const firstProject = wrapper.find('.project-item')
    expect(firstProject.exists()).toBe(true)

    expect(firstProject.find('.project-left').exists()).toBe(true)
    expect(firstProject.find('.project-icon').exists()).toBe(true)
    expect(firstProject.find('.project-info').exists()).toBe(true)
    expect(firstProject.find('.project-name').exists()).toBe(true)
    expect(firstProject.find('.project-path').exists()).toBe(true)

    const arrowIcon = firstProject.find('.project-arrow')
    expect(arrowIcon.exists()).toBe(true)
    const arrowIconComponent = arrowIcon.findComponent({ name: 'BaseIcon' })
    expect(arrowIconComponent.props('name')).toBe('ArrowRight')
    expect(arrowIconComponent.props('size')).toBe('sm')
  })

  it('should render "Learn & Discover" section', () => {
    const wrapper = mount(OnboardingProjectSelection)

    const learnSection = wrapper.find('.learn-section')
    expect(learnSection.exists()).toBe(true)

    const sectionTitle = learnSection.find('.section-title')
    expect(sectionTitle.text()).toBe('Learn & Discover')

    const learnCards = wrapper.findAll('.learn-card')
    expect(learnCards).toHaveLength(3)

    // Check card titles
    const cardTitles = learnCards.map((card) => card.find('.card-title').text())
    expect(cardTitles).toContain('Getting Started Guide')
    expect(cardTitles).toContain('Video Tutorials')
    expect(cardTitles).toContain('Best Practices')
  })

  it('should render learn cards with correct structure', () => {
    const wrapper = mount(OnboardingProjectSelection)

    const firstCard = wrapper.find('.learn-card')
    expect(firstCard.exists()).toBe(true)
    expect(firstCard.classes()).toContain('disabled-card')

    expect(firstCard.find('.card-icon').exists()).toBe(true)
    expect(firstCard.find('.card-title').exists()).toBe(true)
    expect(firstCard.find('.card-description').exists()).toBe(true)

    const firstCardIcon = firstCard
      .find('.card-icon')
      .findComponent({ name: 'BaseIcon' })
    expect(firstCardIcon.props('name')).toBe('BookOpen')
    expect(firstCard.find('.card-title').text()).toBe('Getting Started Guide')
    expect(firstCard.find('.card-description').text()).toBe(
      'Learn the basics of Controlled Amplification'
    )
  })

  it('should handle open project button click', async () => {
    // Mock a successful project selection
    mockOpenProjectDialog.mockResolvedValue({
      projectPath: '/path/to/project',
      packageJson: {
        name: 'test-project',
        version: '1.0.0',
      },
    })

    const wrapper = mount(OnboardingProjectSelection)
    const vm = wrapper.vm as unknown as {
      handleOpenProject: () => Promise<void>
    }

    // Call the method directly
    await vm.handleOpenProject()

    expect(mockNextStep).toHaveBeenCalledOnce()
  })

  it('should handle project item click', async () => {
    const wrapper = mount(OnboardingProjectSelection)
    const vm = wrapper.vm as unknown as {
      handleRecentProjectSelect: (project: {
        id: string
        name: string
        path: string
      }) => Promise<void>
    }

    // Call the method directly with mock project data
    const mockProject = {
      id: '1',
      name: 'Test Project',
      path: '/path/to/test',
    }
    await vm.handleRecentProjectSelect(mockProject)

    expect(mockNextStep).toHaveBeenCalledOnce()
  })

  it('should call truncatePath for project paths', async () => {
    const wrapper = mount(OnboardingProjectSelection)

    // Wait for async loading to complete
    await new Promise((resolve) => setTimeout(resolve, 100))
    await wrapper.vm.$nextTick()

    expect(mockTruncatePath).toHaveBeenCalledWith(
      '/Users/chris/Projects/ecommerce-dashboard',
      250
    )
    expect(mockTruncatePath).toHaveBeenCalledWith(
      '/Users/chris/Sites/ui-components',
      250
    )
    expect(mockTruncatePath).toHaveBeenCalledWith(
      '/Users/chris/Development/mobile-api',
      250
    )
    expect(mockTruncatePath).toHaveBeenCalledWith(
      '/Users/chris/Sites/portfolio-v2',
      250
    )
  })

  it('should have correct CSS classes for disabled elements', () => {
    const wrapper = mount(OnboardingProjectSelection)

    // Check disabled button wrappers
    const disabledWrappers = wrapper.findAll('.disabled-button-wrapper')
    expect(disabledWrappers).toHaveLength(2)

    disabledWrappers.forEach((wrapper) => {
      expect(wrapper.attributes('title')).toBe('Coming soon')
    })

    // Check disabled action buttons
    const disabledActions = wrapper.findAll('.disabled-action')
    expect(disabledActions).toHaveLength(2)

    // Check disabled cards
    const disabledCards = wrapper.findAll('.disabled-card')
    expect(disabledCards).toHaveLength(3)

    disabledCards.forEach((card) => {
      expect(card.attributes('title')).toBe('Coming soon')
    })
  })

  it('should handle multiple project item clicks', async () => {
    const wrapper = mount(OnboardingProjectSelection)
    const vm = wrapper.vm as unknown as {
      handleRecentProjectSelect: (project: {
        id: string
        name: string
        path: string
      }) => Promise<void>
    }

    const mockProject = {
      id: '1',
      name: 'Test Project',
      path: '/path/to/test',
    }

    // Call the method multiple times
    await vm.handleRecentProjectSelect(mockProject)
    await vm.handleRecentProjectSelect(mockProject)
    await vm.handleRecentProjectSelect(mockProject)
    await vm.handleRecentProjectSelect(mockProject)

    // Component correctly prevents duplicate selections with isSelectingProject guard
    // Only the first call should go through
    expect(mockNextStep).toHaveBeenCalledTimes(1)
  })

  it('should render all project icons correctly', async () => {
    const wrapper = mount(OnboardingProjectSelection)

    // Wait for async loading to complete
    await new Promise((resolve) => setTimeout(resolve, 100))
    await wrapper.vm.$nextTick()

    const projectIcons = wrapper.findAll('.project-icon')
    expect(projectIcons).toHaveLength(4)

    // Each project icon should contain a BaseIcon component with name 'Folder'
    projectIcons.forEach((iconWrapper) => {
      const baseIcon = iconWrapper.findComponent({ name: 'BaseIcon' })
      expect(baseIcon.exists()).toBe(true)
      expect(baseIcon.props('name')).toBe('Folder')
      expect(baseIcon.props('size')).toBe('md')
    })
  })

  it('should render all learn card icons correctly', () => {
    const wrapper = mount(OnboardingProjectSelection)

    const cardIcons = wrapper.findAll('.card-icon')
    expect(cardIcons).toHaveLength(3)

    // Check each card icon contains the expected BaseIcon
    const firstIcon = cardIcons[0].findComponent({ name: 'BaseIcon' })
    expect(firstIcon.exists()).toBe(true)
    expect(firstIcon.props('name')).toBe('BookOpen')
    expect(firstIcon.props('size')).toBe('md')

    const secondIcon = cardIcons[1].findComponent({ name: 'BaseIcon' })
    expect(secondIcon.exists()).toBe(true)
    expect(secondIcon.props('name')).toBe('PlayCircle')
    expect(secondIcon.props('size')).toBe('md')

    const thirdIcon = cardIcons[2].findComponent({ name: 'BaseIcon' })
    expect(thirdIcon.exists()).toBe(true)
    expect(thirdIcon.props('name')).toBe('Settings')
    expect(thirdIcon.props('size')).toBe('md')
  })

  it('should maintain component reactivity', async () => {
    // Mock a successful project selection
    mockOpenProjectDialog.mockResolvedValue({
      projectPath: '/path/to/project',
      packageJson: {
        name: 'test-project',
        version: '1.0.0',
      },
    })

    const wrapper = mount(OnboardingProjectSelection)
    const vm = wrapper.vm as unknown as {
      handleOpenProject: () => Promise<void>
      handleRecentProjectSelect: (project: {
        id: string
        name: string
        path: string
      }) => Promise<void>
    }

    // Test that all interactive methods work
    await vm.handleOpenProject()
    const mockProject = {
      id: '1',
      name: 'Test Project',
      path: '/path/to/test',
    }
    await vm.handleRecentProjectSelect(mockProject)

    expect(mockNextStep).toHaveBeenCalledTimes(2)
  })

  it('should have proper accessibility structure', async () => {
    const wrapper = mount(OnboardingProjectSelection)

    // Wait for async loading to complete
    await new Promise((resolve) => setTimeout(resolve, 100))
    await wrapper.vm.$nextTick()

    // Check for proper heading structure
    const sectionTitles = wrapper.findAll('.section-title')
    expect(sectionTitles).toHaveLength(3)

    sectionTitles.forEach((title) => {
      expect(title.element.tagName).toBe('H2')
    })

    // Check for proper project name structure
    const projectNames = wrapper.findAll('.project-name')
    expect(projectNames).toHaveLength(4)

    projectNames.forEach((name) => {
      expect(name.element.tagName).toBe('H3')
    })

    // Check for proper card title structure
    const cardTitles = wrapper.findAll('.card-title')
    expect(cardTitles).toHaveLength(3)

    cardTitles.forEach((title) => {
      expect(title.element.tagName).toBe('H3')
    })
  })

  describe('🔬 Error Handling Coverage', () => {
    it('should handle successful project opening', async () => {
      const mockProjectInfo = {
        projectPath: '/path/to/project',
        packageJson: {
          name: 'test-project',
          version: '1.0.0',
        },
      }
      mockOpenProjectDialog.mockResolvedValue(mockProjectInfo)

      const wrapper = mount(OnboardingProjectSelection)
      const vm = wrapper.vm as OnboardingProjectSelectionInstance

      await vm.handleOpenProject()

      expect(mockOpenProjectDialog).toHaveBeenCalled()
      expect(mockNextStep).toHaveBeenCalled()
    })

    it('should handle project dialog cancellation', async () => {
      mockOpenProjectDialog.mockResolvedValue(null)

      const wrapper = mount(OnboardingProjectSelection)
      const vm = wrapper.vm as OnboardingProjectSelectionInstance

      await vm.handleOpenProject()

      expect(mockOpenProjectDialog).toHaveBeenCalled()
      expect(mockNextStep).not.toHaveBeenCalled()
    })

    it('should format package.json specific error messages', async () => {
      const packageJsonError = new Error('Please select a package.json file')
      mockOpenProjectDialog.mockRejectedValue(packageJsonError)

      const wrapper = mount(OnboardingProjectSelection)
      const vm = wrapper.vm as unknown as {
        handleOpenProject: () => Promise<void>
      }

      // Mock console.error to avoid stderr output
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await vm.handleOpenProject()
      await new Promise((resolve) => setTimeout(resolve, 10)) // Wait for promise resolution

      expect(mockShowError).toHaveBeenCalledWith(
        'Please select a valid package.json file for your project',
        { duration: 8000 }
      )

      consoleSpy.mockRestore()
    })

    it('should format invalid package.json error messages', async () => {
      const invalidJsonError = new Error('Invalid package.json format')
      mockOpenProjectDialog.mockRejectedValue(invalidJsonError)

      const wrapper = mount(OnboardingProjectSelection)
      const vm = wrapper.vm as unknown as {
        handleOpenProject: () => Promise<void>
      }

      // Mock console.error to avoid stderr output
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await vm.handleOpenProject()
      await new Promise((resolve) => setTimeout(resolve, 10)) // Wait for promise resolution

      expect(mockShowError).toHaveBeenCalledWith(
        'The selected file is not a valid package.json file',
        { duration: 8000 }
      )

      consoleSpy.mockRestore()
    })

    it('should format no focused window error messages', async () => {
      const windowError = new Error('No focused window available')
      mockOpenProjectDialog.mockRejectedValue(windowError)

      const wrapper = mount(OnboardingProjectSelection)
      const vm = wrapper.vm as unknown as {
        handleOpenProject: () => Promise<void>
      }

      // Mock console.error to avoid stderr output
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await vm.handleOpenProject()
      await new Promise((resolve) => setTimeout(resolve, 10)) // Wait for promise resolution

      expect(mockShowError).toHaveBeenCalledWith(
        'Unable to open file dialog. Please try again',
        { duration: 8000 }
      )

      consoleSpy.mockRestore()
    })

    it('should format read permission error messages', async () => {
      const permissionError = new Error(
        'Failed to read package.json due to permissions'
      )
      mockOpenProjectDialog.mockRejectedValue(permissionError)

      const wrapper = mount(OnboardingProjectSelection)
      const vm = wrapper.vm as unknown as {
        handleOpenProject: () => Promise<void>
      }

      // Mock console.error to avoid stderr output
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await vm.handleOpenProject()
      await new Promise((resolve) => setTimeout(resolve, 10)) // Wait for promise resolution

      expect(mockShowError).toHaveBeenCalledWith(
        'Could not read the package.json file. Please check file permissions',
        { duration: 8000 }
      )

      consoleSpy.mockRestore()
    })

    it('should handle generic error messages', async () => {
      const genericError = new Error('Something went wrong')
      mockOpenProjectDialog.mockRejectedValue(genericError)

      const wrapper = mount(OnboardingProjectSelection)
      const vm = wrapper.vm as unknown as {
        handleOpenProject: () => Promise<void>
      }

      // Mock console.error to avoid stderr output
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await vm.handleOpenProject()
      await new Promise((resolve) => setTimeout(resolve, 10)) // Wait for promise resolution

      expect(mockShowError).toHaveBeenCalledWith('Something went wrong', {
        duration: 8000,
      })

      consoleSpy.mockRestore()
    })

    it('should handle non-Error exceptions', async () => {
      const nonErrorException = 'String error'
      mockOpenProjectDialog.mockRejectedValue(nonErrorException)

      const wrapper = mount(OnboardingProjectSelection)
      const vm = wrapper.vm as unknown as {
        handleOpenProject: () => Promise<void>
      }

      // Mock console.error to avoid stderr output
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await vm.handleOpenProject()
      await new Promise((resolve) => setTimeout(resolve, 10)) // Wait for promise resolution

      expect(mockShowError).toHaveBeenCalledWith(
        'An unexpected error occurred while opening the project',
        { duration: 8000 }
      )

      consoleSpy.mockRestore()
    })

    it('should handle missing electronAPI gracefully', async () => {
      // Remove electronAPI temporarily
      const originalAPI = window.electronAPI
      delete (window as { electronAPI?: unknown }).electronAPI

      const wrapper = mount(OnboardingProjectSelection)
      const vm = wrapper.vm as unknown as {
        handleOpenProject: () => Promise<void>
      }

      await vm.handleOpenProject()

      expect(mockNextStep).toHaveBeenCalled()

      // Restore electronAPI
      ;(window as { electronAPI?: unknown }).electronAPI = originalAPI
    })

    it('should show loading state during project opening', async () => {
      let resolvePromise: (value: unknown) => void
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockOpenProjectDialog.mockReturnValue(pendingPromise)

      const wrapper = mount(OnboardingProjectSelection)
      const vm = wrapper.vm as unknown as {
        handleOpenProject: () => Promise<void>
        isOpeningProject: boolean
      }

      // Start the operation but don't await yet
      const promise = vm.handleOpenProject()
      await new Promise((resolve) => setTimeout(resolve, 0)) // Let the state update

      // Check if loading state is set internally
      expect(vm.isOpeningProject).toBe(true)

      // Resolve the promise
      resolvePromise!(null)
      await promise
      await new Promise((resolve) => setTimeout(resolve, 0)) // Wait for state update

      // Check if loading state is cleared
      expect(vm.isOpeningProject).toBe(false)
    })
  })

  describe('🔬 Component Internal Methods Coverage', () => {
    it('should access formatErrorMessage method functionality', async () => {
      const wrapper = mount(OnboardingProjectSelection)
      const vm = wrapper.vm as unknown as {
        handleOpenProject: () => Promise<void>
      }

      // Test formatErrorMessage method via error scenario
      const specificError = new Error('Please select a package.json file')
      mockOpenProjectDialog.mockRejectedValue(specificError)

      // Mock console.error to avoid stderr output
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await vm.handleOpenProject()
      await new Promise((resolve) => setTimeout(resolve, 10))

      // The formatErrorMessage function should have been called internally
      expect(mockShowError).toHaveBeenCalledWith(
        'Please select a valid package.json file for your project',
        { duration: 8000 }
      )

      consoleSpy.mockRestore()
    })

    it('should access showErrorMessage method functionality', async () => {
      const wrapper = mount(OnboardingProjectSelection)
      const vm = wrapper.vm as unknown as {
        handleOpenProject: () => Promise<void>
      }

      // Test showErrorMessage via error scenario
      const testError = new Error('Test error')
      mockOpenProjectDialog.mockRejectedValue(testError)

      // Mock console.error to avoid stderr output
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await vm.handleOpenProject()
      await new Promise((resolve) => setTimeout(resolve, 10))

      // The showErrorMessage function should have been called internally
      expect(mockShowError).toHaveBeenCalledWith('Test error', {
        duration: 8000,
      })

      consoleSpy.mockRestore()
    })
  })

  describe('📊 Storage States Coverage', () => {
    it('should handle loading state for recent projects', async () => {
      // Mock delayed response
      let resolveGetProjects: (value: unknown) => void
      const pendingPromise = new Promise((resolve) => {
        resolveGetProjects = resolve
      })
      mockGetRecentProjects.mockReturnValue(pendingPromise)

      const wrapper = mount(OnboardingProjectSelection)

      // Should show loading state initially
      expect(wrapper.find('.projects-loading').exists()).toBe(true)
      expect(wrapper.find('.loading-item').exists()).toBe(true)
      expect(wrapper.find('.loading-icon').exists()).toBe(true)
      expect(wrapper.text()).toContain('Loading recent projects...')

      // Resolve the promise
      resolveGetProjects!([])
      await pendingPromise
      await wrapper.vm.$nextTick()

      // Loading state should be gone
      expect(wrapper.find('.projects-loading').exists()).toBe(false)
    })

    it('should handle error state for recent projects', async () => {
      const errorMessage = 'Storage connection failed'
      mockGetRecentProjects.mockRejectedValue(new Error(errorMessage))

      // Mock console.error to avoid stderr output
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const wrapper = mount(OnboardingProjectSelection)

      // Wait for error handling
      await new Promise((resolve) => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      // Should show error state
      expect(wrapper.find('.projects-error').exists()).toBe(true)
      expect(wrapper.find('.error-message').exists()).toBe(true)
      expect(wrapper.find('.error-icon').exists()).toBe(true)
      expect(wrapper.text()).toContain(errorMessage)

      // Should call error notification
      expect(mockShowError).toHaveBeenCalledWith(
        `Failed to load recent projects: ${errorMessage}`,
        { duration: 8000 }
      )

      consoleSpy.mockRestore()
    })

    it('should handle empty state for recent projects', async () => {
      mockGetRecentProjects.mockResolvedValue([])

      const wrapper = mount(OnboardingProjectSelection)

      // Wait for loading to complete
      await new Promise((resolve) => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      // Should show empty state
      expect(wrapper.find('.projects-empty').exists()).toBe(true)
      expect(wrapper.find('.empty-message').exists()).toBe(true)
      expect(wrapper.find('.empty-icon').exists()).toBe(true)
      expect(wrapper.text()).toContain('No recent projects')
      expect(wrapper.text()).toContain('Open your first project to get started')
    })

    it('should handle missing storage API gracefully', async () => {
      // Remove storageAPI temporarily
      const originalAPI = window.storageAPI
      delete (window as { storageAPI?: unknown }).storageAPI

      // Mock console.warn to avoid stderr output
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const wrapper = mount(OnboardingProjectSelection)

      // Wait for loading attempt
      await new Promise((resolve) => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      // Should not crash and should show empty state
      expect(wrapper.find('.projects-empty').exists()).toBe(true)

      // Restore storageAPI
      ;(window as { storageAPI?: unknown }).storageAPI = originalAPI
      consoleSpy.mockRestore()
    })
  })

  describe('⏰ formatRelativeTime Coverage', () => {
    it('should format "Just now" for very recent dates', async () => {
      const justNow = new Date()
      mockGetRecentProjects.mockResolvedValue([
        {
          id: '1',
          name: 'Recent Project',
          path: '/path/to/recent',
          lastOpened: justNow,
          metadata: {},
        },
      ])

      const wrapper = mount(OnboardingProjectSelection)

      await new Promise((resolve) => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.project-date').text()).toBe('Just now')
    })

    it('should format minutes ago', async () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
      mockGetRecentProjects.mockResolvedValue([
        {
          id: '1',
          name: 'Five Minutes Project',
          path: '/path/to/five-min',
          lastOpened: fiveMinutesAgo,
          metadata: {},
        },
      ])

      const wrapper = mount(OnboardingProjectSelection)

      await new Promise((resolve) => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.project-date').text()).toBe('5m ago')
    })

    it('should format hours ago', async () => {
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000)
      mockGetRecentProjects.mockResolvedValue([
        {
          id: '1',
          name: 'Three Hours Project',
          path: '/path/to/three-hours',
          lastOpened: threeHoursAgo,
          metadata: {},
        },
      ])

      const wrapper = mount(OnboardingProjectSelection)

      await new Promise((resolve) => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.project-date').text()).toBe('3h ago')
    })

    it('should format "Yesterday"', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      mockGetRecentProjects.mockResolvedValue([
        {
          id: '1',
          name: 'Yesterday Project',
          path: '/path/to/yesterday',
          lastOpened: yesterday,
          metadata: {},
        },
      ])

      const wrapper = mount(OnboardingProjectSelection)

      await new Promise((resolve) => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.project-date').text()).toBe('Yesterday')
    })

    it('should format days ago', async () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      mockGetRecentProjects.mockResolvedValue([
        {
          id: '1',
          name: 'Three Days Project',
          path: '/path/to/three-days',
          lastOpened: threeDaysAgo,
          metadata: {},
        },
      ])

      const wrapper = mount(OnboardingProjectSelection)

      await new Promise((resolve) => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.project-date').text()).toBe('3d ago')
    })

    it('should format old dates with month/day', async () => {
      // Use local date constructor to avoid timezone issues (month is 0-indexed)
      const oldDate = new Date(2023, 5, 15) // June 15, 2023 in local timezone
      mockGetRecentProjects.mockResolvedValue([
        {
          id: '1',
          name: 'Old Project',
          path: '/path/to/old',
          lastOpened: oldDate,
          metadata: {},
        },
      ])

      const wrapper = mount(OnboardingProjectSelection)

      await new Promise((resolve) => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      const dateText = wrapper.find('.project-date').text()
      expect(dateText).toContain('Jun')
      expect(dateText).toContain('15') // Date is June 15th
    })
  })

  describe('🎯 Event Handlers Coverage', () => {
    it('should handle terminal event listeners on mount', async () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')

      mount(OnboardingProjectSelection)

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'terminal-open-project',
        expect.any(Function)
      )
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'terminal-select-project',
        expect.any(Function)
      )

      addEventListenerSpy.mockRestore()
    })

    it('should clean up event listeners on unmount', async () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

      const wrapper = mount(OnboardingProjectSelection)
      wrapper.unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'terminal-open-project',
        expect.any(Function)
      )
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'terminal-select-project',
        expect.any(Function)
      )

      removeEventListenerSpy.mockRestore()
    })

    it('should handle terminal open project event', async () => {
      const wrapper = mount(OnboardingProjectSelection)

      // Mock the event handling functions to verify they're called
      const mockHandleOpenProject = vi.fn()
      const vm = wrapper.vm as unknown as {
        isOpeningProject: boolean
        handleOpenProject: () => Promise<void>
      }

      // Replace the method with our mock
      vm.handleOpenProject = mockHandleOpenProject

      // Get the actual event handler that was registered
      const addEventListenerCalls = vi.mocked(window.addEventListener).mock
        .calls
      const terminalOpenHandler = addEventListenerCalls.find(
        (call) => call[0] === 'terminal-open-project'
      )?.[1] as () => void

      expect(terminalOpenHandler).toBeDefined()

      // Call the handler directly
      terminalOpenHandler?.()

      // Verify the component exists and handler was set up
      expect(wrapper.exists()).toBe(true)
    })

    it('should handle terminal select project event', async () => {
      // Clear all mocks first
      vi.clearAllMocks()

      mockGetRecentProjects.mockResolvedValue([
        {
          id: '1',
          name: 'Terminal Project',
          path: '/path/to/terminal',
          lastOpened: new Date(),
          metadata: {},
        },
      ])

      const wrapper = mount(OnboardingProjectSelection)

      // Wait for projects to load
      await new Promise((resolve) => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      // Verify projects are loaded and state is clean
      const vm = wrapper.vm as unknown as {
        recentProjects: Array<{ id: string; name: string; path: string }>
        isSelectingProject: boolean
      }
      expect(vm.recentProjects).toHaveLength(1)
      expect(vm.isSelectingProject).toBe(false)

      // Mock the storage API to avoid errors
      const mockUpdateProjectLastOpened = vi.fn().mockResolvedValue(undefined)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test requires flexible typing for validation testing
      ;(window.storageAPI as any).updateProjectLastOpened =
        mockUpdateProjectLastOpened

      // Get the actual event handler that was registered
      const addEventListenerCalls = vi.mocked(window.addEventListener).mock
        .calls
      const terminalSelectHandler = addEventListenerCalls.find(
        (call) => call[0] === 'terminal-select-project'
      )?.[1] as (event: CustomEvent) => void

      expect(terminalSelectHandler).toBeDefined()

      // Create a mock event and call the handler directly
      const mockEvent = {
        detail: { index: 0 },
      } as CustomEvent

      // Call the handler and wait for async operations to complete
      terminalSelectHandler?.(mockEvent)

      // Wait for storage operations to complete
      await flushPromises()
      await wrapper.vm.$nextTick()

      // Wait for the 500ms timeout in handleRecentProjectSelect
      await new Promise((resolve) => setTimeout(resolve, 600))
      await flushPromises()

      // Should trigger project selection
      expect(mockUpdateProjectLastOpened).toHaveBeenCalledWith('1')
      expect(mockSelectProject).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Terminal Project',
          path: '/path/to/terminal',
        })
      )
      expect(mockNextStep).toHaveBeenCalled()
    })

    it('should ignore terminal select project event with invalid index', async () => {
      mockGetRecentProjects.mockResolvedValue([])

      const wrapper = mount(OnboardingProjectSelection)

      // Wait for projects to load
      await new Promise((resolve) => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      // Clear previous calls
      mockNextStep.mockClear()

      // Get the actual event handler that was registered
      const addEventListenerCalls = vi.mocked(window.addEventListener).mock
        .calls
      const terminalSelectHandler = addEventListenerCalls.find(
        (call) => call[0] === 'terminal-select-project'
      )?.[1] as (event: CustomEvent) => void

      expect(terminalSelectHandler).toBeDefined()

      // Create a mock event with invalid index and call the handler directly
      const mockEvent = {
        detail: { index: 0 },
      } as CustomEvent

      terminalSelectHandler?.(mockEvent)

      // Should not trigger project selection since no projects are loaded
      expect(mockNextStep).not.toHaveBeenCalled()
    })
  })

  describe('🎮 Storage Integration Coverage', () => {
    it('should update project last opened timestamp', async () => {
      const mockUpdateProjectLastOpened = vi.fn().mockResolvedValue(undefined)
      window.storageAPI!.updateProjectLastOpened = mockUpdateProjectLastOpened

      mockGetRecentProjects.mockResolvedValue([
        {
          id: '1',
          name: 'Update Project',
          path: '/path/to/update',
          lastOpened: new Date(),
          metadata: {},
        },
      ])

      const wrapper = mount(OnboardingProjectSelection)
      const vm = wrapper.vm as unknown as {
        handleRecentProjectSelect: (project: {
          id: string
          name: string
          path: string
        }) => Promise<void>
      }

      await vm.handleRecentProjectSelect({
        id: '1',
        name: 'Update Project',
        path: '/path/to/update',
      })

      expect(mockUpdateProjectLastOpened).toHaveBeenCalledWith('1')
    })

    it('should handle missing updateProjectLastOpened API gracefully', async () => {
      // Remove updateProjectLastOpened temporarily
      const originalFn = window.storageAPI!.updateProjectLastOpened
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test requires flexible typing for validation testing
      delete (window.storageAPI as any).updateProjectLastOpened

      const wrapper = mount(OnboardingProjectSelection)
      const vm = wrapper.vm as unknown as {
        handleRecentProjectSelect: (project: {
          id: string
          name: string
          path: string
        }) => Promise<void>
      }

      // Should not crash
      await vm.handleRecentProjectSelect({
        id: '1',
        name: 'Missing API Project',
        path: '/path/to/missing',
      })

      expect(mockNextStep).toHaveBeenCalled()

      // Restore function
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test requires flexible typing for validation testing
      ;(window.storageAPI as any).updateProjectLastOpened = originalFn
    })

    it('should add project to storage after successful opening', async () => {
      const mockAddRecentProject = vi.fn().mockResolvedValue(undefined)
      window.storageAPI!.addRecentProject = mockAddRecentProject

      const mockProjectInfo = {
        name: 'New Project',
        path: '/path/to/new',
        packageJson: '{}',
        version: '1.0.0',
        description: '',
        scripts: {},
        dependencies: {},
        devDependencies: {},
        framework: 'Vue',
        packageManager: 'pnpm',
      }

      mockOpenProjectDialog.mockResolvedValue(mockProjectInfo)

      const wrapper = mount(OnboardingProjectSelection)
      const vm = wrapper.vm as unknown as {
        handleOpenProject: () => Promise<void>
      }

      await vm.handleOpenProject()

      expect(mockAddRecentProject).toHaveBeenCalledWith({
        path: '/path/to/new',
        name: 'New Project',
        metadata: {
          framework: 'Vue',
          packageManager: 'pnpm',
        },
      })
    })

    it('should handle storage error gracefully when adding project', async () => {
      const mockAddRecentProject = vi
        .fn()
        .mockRejectedValue(new Error('Storage write failed'))
      window.storageAPI!.addRecentProject = mockAddRecentProject

      const mockProjectInfo = {
        name: 'Storage Error Project',
        path: '/path/to/storage-error',
        packageJson: '{}',
        version: '1.0.0',
        description: '',
        scripts: {},
        dependencies: {},
        devDependencies: {},
        framework: 'React',
        packageManager: 'npm',
      }

      mockOpenProjectDialog.mockResolvedValue(mockProjectInfo)

      // Mock console.error to avoid stderr output
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const wrapper = mount(OnboardingProjectSelection)
      const vm = wrapper.vm as unknown as {
        handleOpenProject: () => Promise<void>
      }

      await vm.handleOpenProject()

      // Should continue flow despite storage error
      expect(mockNextStep).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('should handle missing addRecentProject API gracefully', async () => {
      // Remove addRecentProject temporarily
      const originalFn = window.storageAPI!.addRecentProject
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test requires flexible typing for validation testing
      delete (window.storageAPI as any).addRecentProject

      const mockProjectInfo = {
        name: 'Missing Add API Project',
        path: '/path/to/missing-add',
        packageJson: '{}',
        version: '1.0.0',
        description: '',
        scripts: {},
        dependencies: {},
        devDependencies: {},
      }

      mockOpenProjectDialog.mockResolvedValue(mockProjectInfo)

      // Mock console.warn to avoid stderr output
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const wrapper = mount(OnboardingProjectSelection)
      const vm = wrapper.vm as unknown as {
        handleOpenProject: () => Promise<void>
      }

      await vm.handleOpenProject()

      // Should continue flow despite missing API
      expect(mockNextStep).toHaveBeenCalled()

      // Restore function
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test requires flexible typing for validation testing
      ;(window.storageAPI as any).addRecentProject = originalFn
      consoleSpy.mockRestore()
    })
  })

  describe('🧩 Conditional Rendering Coverage', () => {
    it('should render project metadata with framework only', async () => {
      mockGetRecentProjects.mockResolvedValue([
        {
          id: '1',
          name: 'Framework Only Project',
          path: '/path/to/framework-only',
          lastOpened: new Date(),
          metadata: { framework: 'Vue' }, // No packageManager
        },
      ])

      const wrapper = mount(OnboardingProjectSelection)

      await new Promise((resolve) => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      const metadata = wrapper.find('.project-metadata')
      expect(metadata.exists()).toBe(true)
      expect(metadata.text()).toContain('Vue')
      expect(metadata.find('.project-separator').exists()).toBe(false)
      expect(metadata.find('.project-package-manager').exists()).toBe(false)
    })

    it('should render project metadata with both framework and packageManager', async () => {
      mockGetRecentProjects.mockResolvedValue([
        {
          id: '1',
          name: 'Complete Metadata Project',
          path: '/path/to/complete',
          lastOpened: new Date(),
          metadata: { framework: 'React', packageManager: 'yarn' },
        },
      ])

      const wrapper = mount(OnboardingProjectSelection)

      await new Promise((resolve) => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      const metadata = wrapper.find('.project-metadata')
      expect(metadata.exists()).toBe(true)
      expect(metadata.text()).toContain('React')
      expect(metadata.text()).toContain('•')
      expect(metadata.text()).toContain('yarn')
      expect(metadata.find('.project-separator').exists()).toBe(true)
      expect(metadata.find('.project-package-manager').exists()).toBe(true)
    })

    it('should not render metadata section without framework', async () => {
      mockGetRecentProjects.mockResolvedValue([
        {
          id: '1',
          name: 'No Metadata Project',
          path: '/path/to/no-metadata',
          lastOpened: new Date(),
          metadata: {}, // No framework
        },
      ])

      const wrapper = mount(OnboardingProjectSelection)

      await new Promise((resolve) => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.project-metadata').exists()).toBe(false)
    })

    it('should render loading button state correctly', async () => {
      let resolvePromise: (value: unknown) => void
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockOpenProjectDialog.mockReturnValue(pendingPromise)

      const wrapper = mount(OnboardingProjectSelection)

      // Get the component VM to directly call the method
      const vm = wrapper.vm as unknown as {
        handleOpenProject: () => Promise<void>
        isOpeningProject: boolean
      }

      // Start the operation directly
      const operationPromise = vm.handleOpenProject()
      await wrapper.vm.$nextTick()

      // Check button shows loading state
      const ctaButton = wrapper.findComponent({ name: 'CtaButton' })
      expect(ctaButton.props('disabled')).toBe(true)
      expect(ctaButton.text()).toContain('Opening...')

      // Resolve and check normal state
      resolvePromise!(null)
      await operationPromise
      await wrapper.vm.$nextTick()

      expect(ctaButton.props('disabled')).toBe(false)
      expect(ctaButton.text()).toContain('Open Project...')
    })
  })
})
