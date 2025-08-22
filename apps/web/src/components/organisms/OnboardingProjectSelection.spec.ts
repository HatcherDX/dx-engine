import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import OnboardingProjectSelection from './OnboardingProjectSelection.vue'

// Type definition for OnboardingProjectSelection component instance - NO ANY TYPES ALLOWED
interface OnboardingProjectSelectionInstance
  extends InstanceType<typeof OnboardingProjectSelection> {
  recentProjects: Array<{ id: string; name: string; path: string }>
  selectedProject: string | null
  selectProject: (projectId: string) => void
  openProject: () => void
  browseForProject: () => void
  [key: string]: unknown
}

// Mock composables
const mockNextStep = vi.fn()
const mockPreviousStep = vi.fn()
const mockSelectProject = vi.fn()
const mockTruncatePath = vi.fn()

vi.mock('../../composables/useOnboarding', () => ({
  useOnboarding: () => ({
    nextStep: mockNextStep,
    previousStep: mockPreviousStep,
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
      '<span data-testid="base-icon" :data-name="name" :data-size="size"><slot /></span>',
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

// Mock window.electronAPI and useNotifications
const mockOpenProjectDialog = vi.fn()
const mockShowError = vi.fn()

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

    // Setup window.electronAPI mock
    global.window = {
      ...global.window,
      electronAPI: {
        openProjectDialog: mockOpenProjectDialog,
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
    expect(baseLogo.props('size')).toBe('lg')
    expect(baseLogo.props('variant')).toBe('inline')
  })

  it('should render "Start a Project" section with action buttons', () => {
    const wrapper = mount(OnboardingProjectSelection)

    const actionsSection = wrapper.find('.actions-section')
    expect(actionsSection.exists()).toBe(true)

    const sectionTitle = actionsSection.find('.section-title')
    expect(sectionTitle.text()).toBe('Start a Project')

    const actionButtons = wrapper.findAll('.action-button')
    expect(actionButtons).toHaveLength(3)

    // Check first button (Open Project)
    expect(actionButtons[0].text()).toContain('📂 Open Project...')
    expect((actionButtons[0].element as HTMLButtonElement).disabled).toBeFalsy()

    // Check disabled buttons
    expect(actionButtons[1].text()).toContain('+ New Project')
    expect((actionButtons[1].element as HTMLButtonElement).disabled).toBe(true)

    expect(actionButtons[2].text()).toContain('🌐 Clone from Git...')
    expect((actionButtons[2].element as HTMLButtonElement).disabled).toBe(true)
  })

  it('should render recent projects section', () => {
    const wrapper = mount(OnboardingProjectSelection)

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

  it('should render project items with correct structure', () => {
    const wrapper = mount(OnboardingProjectSelection)

    const firstProject = wrapper.find('.project-item')
    expect(firstProject.exists()).toBe(true)

    expect(firstProject.find('.project-left').exists()).toBe(true)
    expect(firstProject.find('.project-icon').exists()).toBe(true)
    expect(firstProject.find('.project-info').exists()).toBe(true)
    expect(firstProject.find('.project-name').exists()).toBe(true)
    expect(firstProject.find('.project-path').exists()).toBe(true)

    const arrowIcon = firstProject.findComponent({ name: 'BaseIcon' })
    expect(arrowIcon.exists()).toBe(true)
    expect(arrowIcon.props('name')).toBe('ArrowRight')
    expect(arrowIcon.props('size')).toBe('sm')
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

    expect(firstCard.find('.card-icon').text()).toBe('📚')
    expect(firstCard.find('.card-title').text()).toBe('Getting Started Guide')
    expect(firstCard.find('.card-description').text()).toBe(
      'Learn the basics of Controlled Amplification'
    )
  })

  it('should render navigation section with back button', () => {
    const wrapper = mount(OnboardingProjectSelection)

    const navigationSection = wrapper.find('.navigation-section')
    expect(navigationSection.exists()).toBe(true)

    const backButton = navigationSection.findComponent({ name: 'BaseButton' })
    expect(backButton.exists()).toBe(true)
    expect(backButton.props('variant')).toBe('ghost')
    expect(backButton.props('size')).toBe('md')
    expect(backButton.classes()).toContain('back-button')
    expect(backButton.text()).toContain('Welcome')

    const backIcon = backButton.findComponent({ name: 'BaseIcon' })
    expect(backIcon.exists()).toBe(true)
    expect(backIcon.props('name')).toBe('ArrowRight')
    // Note: back-icon class is added via component props, not directly on BaseIcon
    expect(backIcon.props('class')).toContain('back-icon')
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
      handleProjectSelect: () => void
    }

    // Call the method directly
    vm.handleProjectSelect()

    expect(mockNextStep).toHaveBeenCalledOnce()
  })

  it('should handle back button click', async () => {
    const wrapper = mount(OnboardingProjectSelection)
    const vm = wrapper.vm as unknown as {
      handleBack: () => void
    }

    // Call the method directly
    vm.handleBack()

    expect(mockPreviousStep).toHaveBeenCalledOnce()
  })

  it('should call truncatePath for project paths', () => {
    mount(OnboardingProjectSelection)

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
      handleProjectSelect: () => void
    }

    // Call the method multiple times
    vm.handleProjectSelect()
    vm.handleProjectSelect()
    vm.handleProjectSelect()
    vm.handleProjectSelect()

    expect(mockNextStep).toHaveBeenCalledTimes(4)
  })

  it('should render all project icons correctly', () => {
    const wrapper = mount(OnboardingProjectSelection)

    const projectIcons = wrapper.findAll('.project-icon')
    expect(projectIcons).toHaveLength(4)

    projectIcons.forEach((icon) => {
      expect(icon.text()).toBe('📁')
    })
  })

  it('should render all learn card icons correctly', () => {
    const wrapper = mount(OnboardingProjectSelection)

    const cardIcons = wrapper.findAll('.card-icon')
    expect(cardIcons).toHaveLength(3)

    expect(cardIcons[0].text()).toBe('📚')
    expect(cardIcons[1].text()).toBe('🎥')
    expect(cardIcons[2].text()).toBe('🛠️')
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
      handleProjectSelect: () => void
      handleBack: () => void
    }

    // Test that all interactive methods work
    await vm.handleOpenProject()
    vm.handleProjectSelect()
    vm.handleBack()

    expect(mockNextStep).toHaveBeenCalledTimes(2)
    expect(mockPreviousStep).toHaveBeenCalledTimes(1)
  })

  it('should have proper accessibility structure', () => {
    const wrapper = mount(OnboardingProjectSelection)

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
})
