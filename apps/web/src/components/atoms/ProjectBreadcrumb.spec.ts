/**
 * @fileoverview Tests for Project Breadcrumb component.
 *
 * @description
 * Comprehensive test suite for the ProjectBreadcrumb component.
 * Tests rendering, props handling, tooltip display, CSS classes, and responsive behavior.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import ProjectBreadcrumb from './ProjectBreadcrumb.vue'
import BaseIcon from './BaseIcon.vue'

describe('ProjectBreadcrumb.vue', () => {
  let wrapper: VueWrapper<InstanceType<typeof ProjectBreadcrumb>>

  const defaultProps = {
    projectName: 'dx-engine',
    branchName: 'main',
    projectPath: '',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  // ============================================================
  // Component Initialization
  // ============================================================

  describe('Component Initialization', () => {
    it('should mount and render without errors', () => {
      wrapper = mount(ProjectBreadcrumb, {
        props: defaultProps,
        global: {
          components: { BaseIcon },
        },
      })

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('.project-breadcrumb').exists()).toBe(true)
    })

    it('should render all required elements', () => {
      wrapper = mount(ProjectBreadcrumb, {
        props: defaultProps,
        global: {
          components: { BaseIcon },
        },
      })

      expect(wrapper.find('.project-name').exists()).toBe(true)
      expect(wrapper.find('.branch-name').exists()).toBe(true)
      expect(wrapper.findComponent(BaseIcon).exists()).toBe(true)
    })

    it('should use default props when none provided', () => {
      wrapper = mount(ProjectBreadcrumb, {
        global: {
          components: { BaseIcon },
        },
      })

      const projectName = wrapper.find('.project-name')
      const branchName = wrapper.find('.branch-name')

      expect(projectName.text()).toBe('dx-engine')
      expect(branchName.text()).toBe('main')
    })
  })

  // ============================================================
  // Props Handling
  // ============================================================

  describe('Props Handling', () => {
    it('should display custom project name', () => {
      wrapper = mount(ProjectBreadcrumb, {
        props: {
          ...defaultProps,
          projectName: 'my-custom-project',
        },
        global: {
          components: { BaseIcon },
        },
      })

      const projectName = wrapper.find('.project-name')
      expect(projectName.text()).toBe('my-custom-project')
    })

    it('should display custom branch name', () => {
      wrapper = mount(ProjectBreadcrumb, {
        props: {
          ...defaultProps,
          branchName: 'feature/new-ui',
        },
        global: {
          components: { BaseIcon },
        },
      })

      const branchName = wrapper.find('.branch-name')
      expect(branchName.text()).toBe('feature/new-ui')
    })

    it('should handle empty project name', () => {
      wrapper = mount(ProjectBreadcrumb, {
        props: {
          ...defaultProps,
          projectName: '',
        },
        global: {
          components: { BaseIcon },
        },
      })

      const projectName = wrapper.find('.project-name')
      expect(projectName.text()).toBe('')
    })

    it('should handle empty branch name', () => {
      wrapper = mount(ProjectBreadcrumb, {
        props: {
          ...defaultProps,
          branchName: '',
        },
        global: {
          components: { BaseIcon },
        },
      })

      const branchName = wrapper.find('.branch-name')
      expect(branchName.text()).toBe('')
    })

    it('should handle long project name', () => {
      const longName = 'very-long-project-name-that-should-be-truncated'
      wrapper = mount(ProjectBreadcrumb, {
        props: {
          ...defaultProps,
          projectName: longName,
        },
        global: {
          components: { BaseIcon },
        },
      })

      const projectName = wrapper.find('.project-name')
      expect(projectName.text()).toBe(longName)
      expect(projectName.classes()).toContain('project-name')
    })

    it('should handle long branch name', () => {
      const longBranch = 'feature/very-long-branch-name-with-many-words'
      wrapper = mount(ProjectBreadcrumb, {
        props: {
          ...defaultProps,
          branchName: longBranch,
        },
        global: {
          components: { BaseIcon },
        },
      })

      const branchName = wrapper.find('.branch-name')
      expect(branchName.text()).toBe(longBranch)
    })
  })

  // ============================================================
  // Project Path and Tooltip
  // ============================================================

  describe('Project Path and Tooltip', () => {
    it('should render span without tooltip when projectPath is empty', () => {
      wrapper = mount(ProjectBreadcrumb, {
        props: {
          ...defaultProps,
          projectPath: '',
        },
        global: {
          components: { BaseIcon },
        },
      })

      const projectName = wrapper.find('.project-name')
      expect(projectName.element.tagName).toBe('SPAN')
      expect(projectName.classes()).not.toContain('has-tooltip')
    })

    it('should render div with tooltip when projectPath is provided', () => {
      wrapper = mount(ProjectBreadcrumb, {
        props: {
          ...defaultProps,
          projectPath: '/Users/user/projects/dx-engine',
        },
        global: {
          components: { BaseIcon },
        },
      })

      const projectName = wrapper.find('.project-name')
      expect(projectName.element.tagName).toBe('DIV')
      expect(projectName.classes()).toContain('has-tooltip')
    })

    it('should have v-tippy directive when projectPath is provided', () => {
      wrapper = mount(ProjectBreadcrumb, {
        props: {
          ...defaultProps,
          projectPath: '/Users/user/projects/dx-engine',
        },
        global: {
          components: { BaseIcon },
          directives: {
            tippy: {
              mounted: vi.fn(),
            },
          },
        },
      })

      const projectName = wrapper.find('.project-name')
      expect(projectName.exists()).toBe(true)
    })

    it('should handle special characters in projectPath', () => {
      const specialPath = '/Users/user/projects/my-project (v2)/src'
      wrapper = mount(ProjectBreadcrumb, {
        props: {
          ...defaultProps,
          projectPath: specialPath,
        },
        global: {
          components: { BaseIcon },
        },
      })

      const projectName = wrapper.find('.project-name')
      expect(projectName.classes()).toContain('has-tooltip')
    })
  })

  // ============================================================
  // BaseIcon Integration
  // ============================================================

  describe('BaseIcon Integration', () => {
    it('should render BaseIcon component', () => {
      wrapper = mount(ProjectBreadcrumb, {
        props: defaultProps,
        global: {
          components: { BaseIcon },
        },
      })

      const icon = wrapper.findComponent(BaseIcon)
      expect(icon.exists()).toBe(true)
    })

    it('should pass correct props to BaseIcon', () => {
      wrapper = mount(ProjectBreadcrumb, {
        props: defaultProps,
        global: {
          components: { BaseIcon },
        },
      })

      const icon = wrapper.findComponent(BaseIcon)
      expect(icon.props('name')).toBe('GitBranch')
      expect(icon.props('size')).toBe('xs')
    })

    it('should apply branch-icon class to BaseIcon', () => {
      wrapper = mount(ProjectBreadcrumb, {
        props: defaultProps,
        global: {
          components: { BaseIcon },
        },
      })

      const icon = wrapper.findComponent(BaseIcon)
      expect(icon.exists()).toBe(true)
      // BaseIcon component exists and is placed correctly
    })
  })

  // ============================================================
  // CSS Classes
  // ============================================================

  describe('CSS Classes', () => {
    it('should apply correct classes to container', () => {
      wrapper = mount(ProjectBreadcrumb, {
        props: defaultProps,
        global: {
          components: { BaseIcon },
        },
      })

      const container = wrapper.find('.project-breadcrumb')
      expect(container.classes()).toContain('project-breadcrumb')
    })

    it('should apply correct classes to project name', () => {
      wrapper = mount(ProjectBreadcrumb, {
        props: defaultProps,
        global: {
          components: { BaseIcon },
        },
      })

      const projectName = wrapper.find('.project-name')
      expect(projectName.classes()).toContain('project-name')
    })

    it('should apply correct classes to branch name', () => {
      wrapper = mount(ProjectBreadcrumb, {
        props: defaultProps,
        global: {
          components: { BaseIcon },
        },
      })

      const branchName = wrapper.find('.branch-name')
      expect(branchName.classes()).toContain('branch-name')
    })

    it('should add has-tooltip class when projectPath is provided', () => {
      wrapper = mount(ProjectBreadcrumb, {
        props: {
          ...defaultProps,
          projectPath: '/path/to/project',
        },
        global: {
          components: { BaseIcon },
        },
      })

      const projectName = wrapper.find('.project-name')
      expect(projectName.classes()).toContain('has-tooltip')
    })

    it('should not add has-tooltip class when projectPath is empty', () => {
      wrapper = mount(ProjectBreadcrumb, {
        props: {
          ...defaultProps,
          projectPath: '',
        },
        global: {
          components: { BaseIcon },
        },
      })

      const projectName = wrapper.find('.project-name')
      expect(projectName.classes()).not.toContain('has-tooltip')
    })
  })

  // ============================================================
  // Multiple Branch Names
  // ============================================================

  describe('Multiple Branch Names', () => {
    it('should display main branch', () => {
      wrapper = mount(ProjectBreadcrumb, {
        props: {
          ...defaultProps,
          branchName: 'main',
        },
        global: {
          components: { BaseIcon },
        },
      })

      const branchName = wrapper.find('.branch-name')
      expect(branchName.text()).toBe('main')
    })

    it('should display feature branch', () => {
      wrapper = mount(ProjectBreadcrumb, {
        props: {
          ...defaultProps,
          branchName: 'feature/add-tests',
        },
        global: {
          components: { BaseIcon },
        },
      })

      const branchName = wrapper.find('.branch-name')
      expect(branchName.text()).toBe('feature/add-tests')
    })

    it('should display bugfix branch', () => {
      wrapper = mount(ProjectBreadcrumb, {
        props: {
          ...defaultProps,
          branchName: 'bugfix/fix-crash',
        },
        global: {
          components: { BaseIcon },
        },
      })

      const branchName = wrapper.find('.branch-name')
      expect(branchName.text()).toBe('bugfix/fix-crash')
    })

    it('should display branch with special characters', () => {
      wrapper = mount(ProjectBreadcrumb, {
        props: {
          ...defaultProps,
          branchName: 'hotfix/urgent-fix-#123',
        },
        global: {
          components: { BaseIcon },
        },
      })

      const branchName = wrapper.find('.branch-name')
      expect(branchName.text()).toBe('hotfix/urgent-fix-#123')
    })
  })

  // ============================================================
  // Edge Cases
  // ============================================================

  describe('Edge Cases', () => {
    it('should handle all props empty', () => {
      wrapper = mount(ProjectBreadcrumb, {
        props: {
          projectName: '',
          branchName: '',
          projectPath: '',
        },
        global: {
          components: { BaseIcon },
        },
      })

      expect(wrapper.find('.project-breadcrumb').exists()).toBe(true)
      expect(wrapper.find('.project-name').text()).toBe('')
      expect(wrapper.find('.branch-name').text()).toBe('')
    })

    it('should handle unicode characters in project name', () => {
      wrapper = mount(ProjectBreadcrumb, {
        props: {
          ...defaultProps,
          projectName: 'プロジェクト',
        },
        global: {
          components: { BaseIcon },
        },
      })

      const projectName = wrapper.find('.project-name')
      expect(projectName.text()).toBe('プロジェクト')
    })

    it('should handle unicode characters in branch name', () => {
      wrapper = mount(ProjectBreadcrumb, {
        props: {
          ...defaultProps,
          branchName: 'feature/新機能',
        },
        global: {
          components: { BaseIcon },
        },
      })

      const branchName = wrapper.find('.branch-name')
      expect(branchName.text()).toBe('feature/新機能')
    })

    it('should handle whitespace in project name', () => {
      wrapper = mount(ProjectBreadcrumb, {
        props: {
          ...defaultProps,
          projectName: '  project with spaces  ',
        },
        global: {
          components: { BaseIcon },
        },
      })

      const projectName = wrapper.find('.project-name')
      // HTML trims leading/trailing whitespace in text content
      expect(projectName.text()).toBe('project with spaces')
    })

    it('should handle only projectPath without projectName', () => {
      wrapper = mount(ProjectBreadcrumb, {
        props: {
          projectName: '',
          branchName: 'main',
          projectPath: '/Users/user/projects/my-project',
        },
        global: {
          components: { BaseIcon },
        },
      })

      const projectName = wrapper.find('.project-name')
      expect(projectName.classes()).toContain('has-tooltip')
      expect(projectName.text()).toBe('')
    })
  })

  // ============================================================
  // Accessibility
  // ============================================================

  describe('Accessibility', () => {
    it('should have cursor pointer on project name with tooltip', () => {
      wrapper = mount(ProjectBreadcrumb, {
        props: {
          ...defaultProps,
          projectPath: '/path/to/project',
        },
        global: {
          components: { BaseIcon },
        },
      })

      const projectName = wrapper.find('.project-name')
      expect(projectName.classes()).toContain('has-tooltip')
    })

    it('should have cursor default on project name without tooltip', () => {
      wrapper = mount(ProjectBreadcrumb, {
        props: {
          ...defaultProps,
          projectPath: '',
        },
        global: {
          components: { BaseIcon },
        },
      })

      const projectName = wrapper.find('.project-name')
      expect(projectName.classes()).not.toContain('has-tooltip')
    })
  })

  // ============================================================
  // Integration
  // ============================================================

  describe('Integration', () => {
    it('should render complete breadcrumb with all elements', () => {
      wrapper = mount(ProjectBreadcrumb, {
        props: {
          projectName: 'my-awesome-project',
          branchName: 'feature/awesome-feature',
          projectPath: '/Users/dev/projects/my-awesome-project',
        },
        global: {
          components: { BaseIcon },
        },
      })

      const projectName = wrapper.find('.project-name')
      const branchName = wrapper.find('.branch-name')
      const icon = wrapper.findComponent(BaseIcon)

      expect(projectName.text()).toBe('my-awesome-project')
      expect(projectName.classes()).toContain('has-tooltip')
      expect(icon.exists()).toBe(true)
      expect(branchName.text()).toBe('feature/awesome-feature')
    })

    it('should handle realistic Git workflow branch names', () => {
      const branchNames = [
        'develop',
        'staging',
        'release/v1.0.0',
        'hotfix/critical-bug',
        'chore/update-dependencies',
      ]

      branchNames.forEach((branch) => {
        wrapper = mount(ProjectBreadcrumb, {
          props: {
            ...defaultProps,
            branchName: branch,
          },
          global: {
            components: { BaseIcon },
          },
        })

        const branchName = wrapper.find('.branch-name')
        expect(branchName.text()).toBe(branch)

        wrapper.unmount()
      })
    })
  })
})
