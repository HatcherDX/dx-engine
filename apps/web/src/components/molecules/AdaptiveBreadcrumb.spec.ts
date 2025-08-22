import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import AdaptiveBreadcrumb from './AdaptiveBreadcrumb.vue'
import type { ModeType } from './ModeSelector.vue'

// Mock child components
vi.mock('../atoms/BaseIcon.vue', () => ({
  default: {
    name: 'BaseIcon',
    template:
      '<span class="base-icon" :data-name="name" :data-size="size"></span>',
    props: ['name', 'size'],
  },
}))

describe('AdaptiveBreadcrumb', () => {
  let wrapper: VueWrapper<InstanceType<typeof AdaptiveBreadcrumb>>

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.restoreAllMocks()
  })

  describe('Generative Mode Rendering', () => {
    it('should render filesystem breadcrumb for generative mode', () => {
      wrapper = mount(AdaptiveBreadcrumb, {
        props: {
          currentMode: 'generative' as ModeType,
          projectPath: '/home/user/my-project/',
        },
      })

      expect(wrapper.find('.breadcrumb-segment.filesystem').exists()).toBe(true)
      expect(wrapper.find('.breadcrumb-path').text()).toBe(
        '/home/user/my-project/'
      )
      expect(wrapper.find('[data-name="Menu"]').exists()).toBe(true)
    })

    it('should use default project path when not provided in generative mode', () => {
      wrapper = mount(AdaptiveBreadcrumb, {
        props: {
          currentMode: 'generative' as ModeType,
        },
      })

      expect(wrapper.find('.breadcrumb-path').text()).toBe(
        '/home/usuario/mi-proyecto/'
      )
    })
  })

  describe('Visual Mode Rendering', () => {
    it('should render URL breadcrumb for visual mode', () => {
      wrapper = mount(AdaptiveBreadcrumb, {
        props: {
          currentMode: 'visual' as ModeType,
          currentUrl: 'https://myapp.com/dashboard',
        },
      })

      expect(wrapper.find('.breadcrumb-segment.url').exists()).toBe(true)
      expect(wrapper.find('.breadcrumb-url').text()).toBe(
        'https://myapp.com/dashboard'
      )
      expect(wrapper.find('[data-name="Eye"]').exists()).toBe(true)
    })

    it('should use default URL when not provided in visual mode', () => {
      wrapper = mount(AdaptiveBreadcrumb, {
        props: {
          currentMode: 'visual' as ModeType,
        },
      })

      expect(wrapper.find('.breadcrumb-url').text()).toBe(
        'https://example.com/dashboard'
      )
    })
  })

  describe('Code Mode Rendering', () => {
    it('should render project and file path for code mode', () => {
      wrapper = mount(AdaptiveBreadcrumb, {
        props: {
          currentMode: 'code' as ModeType,
          projectName: 'awesome-project',
          filePath: 'src/components/Header.vue',
        },
      })

      expect(wrapper.find('.breadcrumb-segment.project-file').exists()).toBe(
        true
      )
      expect(wrapper.find('.project-badge').text()).toBe('awesome-project')
      expect(wrapper.find('.file-path').exists()).toBe(true)

      const segments = wrapper.findAll('.segment-text')
      expect(segments[0].text()).toBe('src')
      expect(segments[1].text()).toBe('components')
      expect(segments[2].text()).toBe('Header.vue')
    })

    it('should use default project name when not provided in code mode', () => {
      wrapper = mount(AdaptiveBreadcrumb, {
        props: {
          currentMode: 'code' as ModeType,
        },
      })

      expect(wrapper.find('.project-badge').text()).toBe('mi-proyecto')
    })

    it('should display path separators between segments', () => {
      wrapper = mount(AdaptiveBreadcrumb, {
        props: {
          currentMode: 'code' as ModeType,
          filePath: 'src/utils/helpers.ts',
        },
      })

      const separators = wrapper.findAll('.path-separator')
      expect(separators).toHaveLength(2)
      separators.forEach((sep) => {
        expect(sep.text()).toBe('>')
      })
    })

    it('should handle empty file path in code mode', () => {
      wrapper = mount(AdaptiveBreadcrumb, {
        props: {
          currentMode: 'code' as ModeType,
          projectName: 'test-project',
          filePath: '',
        },
      })

      // When filePath is empty, the file-path div is not rendered
      expect(wrapper.find('.file-path').exists()).toBe(false)
      // But the project badge should still be visible
      expect(wrapper.find('.project-badge').text()).toBe('test-project')
      // No segments should be rendered
      const segments = wrapper.findAll('.segment-text')
      expect(segments).toHaveLength(0)
    })

    it('should filter out empty segments from file path', () => {
      wrapper = mount(AdaptiveBreadcrumb, {
        props: {
          currentMode: 'code' as ModeType,
          filePath: '//src//components//Header.vue//',
        },
      })

      const segments = wrapper.findAll('.segment-text')
      expect(segments).toHaveLength(3)
      expect(segments[0].text()).toBe('src')
      expect(segments[1].text()).toBe('components')
      expect(segments[2].text()).toBe('Header.vue')
    })
  })

  describe('Timeline Mode Rendering', () => {
    it('should render project and git branch for timeline mode', () => {
      wrapper = mount(AdaptiveBreadcrumb, {
        props: {
          currentMode: 'timeline' as ModeType,
          projectName: 'my-repo',
          gitBranch: 'feature/new-feature',
        },
      })

      expect(wrapper.find('.breadcrumb-segment.project-git').exists()).toBe(
        true
      )
      expect(wrapper.find('.project-badge').text()).toBe('my-repo')
      expect(wrapper.find('.git-branch').exists()).toBe(true)
      expect(wrapper.find('.branch-text').text()).toBe('feature/new-feature')
      expect(wrapper.find('[data-name="GitBranch"]').exists()).toBe(true)
    })

    it('should use default git branch when not provided', () => {
      wrapper = mount(AdaptiveBreadcrumb, {
        props: {
          currentMode: 'timeline' as ModeType,
        },
      })

      expect(wrapper.find('.branch-text').text()).toBe('main')
    })

    it('should use default project name when not provided in timeline mode', () => {
      wrapper = mount(AdaptiveBreadcrumb, {
        props: {
          currentMode: 'timeline' as ModeType,
        },
      })

      expect(wrapper.find('.project-badge').text()).toBe('mi-proyecto')
    })
  })

  describe('Computed Property: pathSegments', () => {
    it('should compute path segments correctly from file path', () => {
      wrapper = mount(AdaptiveBreadcrumb, {
        props: {
          currentMode: 'code' as ModeType,
          filePath: 'src/views/Home.vue',
        },
      })

      const vm = wrapper.vm as InstanceType<typeof AdaptiveBreadcrumb> & {
        pathSegments?: string[]
      }

      expect(vm.pathSegments).toEqual(['src', 'views', 'Home.vue'])
    })

    it('should return default segments when filePath is empty', () => {
      wrapper = mount(AdaptiveBreadcrumb, {
        props: {
          currentMode: 'code' as ModeType,
          filePath: '',
        },
      })

      const vm = wrapper.vm as InstanceType<typeof AdaptiveBreadcrumb> & {
        pathSegments?: string[]
      }

      expect(vm.pathSegments).toEqual([
        'src',
        'components',
        'atoms',
        'Button.vue',
      ])
    })

    it('should filter empty segments from path', () => {
      wrapper = mount(AdaptiveBreadcrumb, {
        props: {
          currentMode: 'code' as ModeType,
          filePath: 'src//components///Header.vue',
        },
      })

      const vm = wrapper.vm as InstanceType<typeof AdaptiveBreadcrumb> & {
        pathSegments?: string[]
      }

      expect(vm.pathSegments).toEqual(['src', 'components', 'Header.vue'])
    })

    it('should handle single segment paths', () => {
      wrapper = mount(AdaptiveBreadcrumb, {
        props: {
          currentMode: 'code' as ModeType,
          filePath: 'index.html',
        },
      })

      const vm = wrapper.vm as InstanceType<typeof AdaptiveBreadcrumb> & {
        pathSegments?: string[]
      }

      expect(vm.pathSegments).toEqual(['index.html'])
    })

    it('should handle paths with only slashes', () => {
      wrapper = mount(AdaptiveBreadcrumb, {
        props: {
          currentMode: 'code' as ModeType,
          filePath: '///',
        },
      })

      const vm = wrapper.vm as InstanceType<typeof AdaptiveBreadcrumb> & {
        pathSegments?: string[]
      }

      // When path is only slashes, after filtering we get empty array
      expect(vm.pathSegments).toEqual([])

      // Since filePath is truthy (contains slashes), file-path div will be rendered
      // but with no segments inside it (empty array)
      expect(wrapper.find('.file-path').exists()).toBe(true)
      const segments = wrapper.findAll('.segment-text')
      expect(segments).toHaveLength(0)
    })
  })

  describe('Props and Defaults', () => {
    it('should apply all default prop values', () => {
      wrapper = mount(AdaptiveBreadcrumb, {
        props: {
          currentMode: 'generative' as ModeType,
        },
      })

      expect(wrapper.props('projectPath')).toBe('')
      expect(wrapper.props('currentUrl')).toBe('')
      expect(wrapper.props('projectName')).toBe('')
      expect(wrapper.props('filePath')).toBe('')
      expect(wrapper.props('gitBranch')).toBe('')
    })

    it('should accept all prop values', () => {
      const props = {
        currentMode: 'code' as ModeType,
        projectPath: '/custom/path',
        currentUrl: 'https://custom.url',
        projectName: 'custom-project',
        filePath: 'custom/file.ts',
        gitBranch: 'custom-branch',
      }

      wrapper = mount(AdaptiveBreadcrumb, { props })

      Object.entries(props).forEach(([key, value]) => {
        expect(wrapper.props(key as keyof typeof props)).toBe(value)
      })
    })
  })

  describe('Edge Cases and Invalid Modes', () => {
    it('should handle invalid mode gracefully (falls through to git mode)', () => {
      wrapper = mount(AdaptiveBreadcrumb, {
        props: {
          currentMode: 'invalid' as ModeType,
          projectName: 'fallback-project',
          gitBranch: 'fallback-branch',
        },
      })

      // Invalid mode should fall through to the default (git) mode
      expect(wrapper.find('.breadcrumb-segment.project-git').exists()).toBe(
        true
      )
      expect(wrapper.find('.project-badge').text()).toBe('fallback-project')
      expect(wrapper.find('.branch-text').text()).toBe('fallback-branch')
    })

    it('should handle undefined props without errors', () => {
      expect(() => {
        wrapper = mount(AdaptiveBreadcrumb, {
          props: {
            currentMode: 'code' as ModeType,
            projectPath: undefined as unknown as string,
            currentUrl: undefined as unknown as string,
            projectName: undefined as unknown as string,
            filePath: undefined as unknown as string,
            gitBranch: undefined as unknown as string,
          },
        })
      }).not.toThrow()

      // Should use default values
      expect(wrapper.find('.project-badge').text()).toBe('mi-proyecto')
    })
  })

  describe('Complex Scenarios', () => {
    it('should handle very long file paths', () => {
      const longPath =
        'src/components/organisms/features/users/management/admin/settings/preferences/advanced/security/encryption/keys/generator/RSAKeyGenerator.vue'

      wrapper = mount(AdaptiveBreadcrumb, {
        props: {
          currentMode: 'code' as ModeType,
          filePath: longPath,
        },
      })

      const segments = wrapper.findAll('.segment-text')
      expect(segments.length).toBeGreaterThan(10)
      expect(segments[segments.length - 1].text()).toBe('RSAKeyGenerator.vue')
    })

    it('should handle special characters in paths', () => {
      wrapper = mount(AdaptiveBreadcrumb, {
        props: {
          currentMode: 'code' as ModeType,
          filePath: 'src/@types/[id].vue',
        },
      })

      const segments = wrapper.findAll('.segment-text')
      expect(segments[0].text()).toBe('src')
      expect(segments[1].text()).toBe('@types')
      expect(segments[2].text()).toBe('[id].vue')
    })

    it('should handle rapid mode changes', async () => {
      wrapper = mount(AdaptiveBreadcrumb, {
        props: {
          currentMode: 'generative' as ModeType,
        },
      })

      const modes: ModeType[] = ['visual', 'code', 'timeline', 'generative']

      for (const mode of modes) {
        await wrapper.setProps({ currentMode: mode })
        expect(wrapper.props('currentMode')).toBe(mode)

        // Verify correct segment is rendered for each mode
        if (mode === 'generative') {
          expect(wrapper.find('.breadcrumb-segment.filesystem').exists()).toBe(
            true
          )
        } else if (mode === 'visual') {
          expect(wrapper.find('.breadcrumb-segment.url').exists()).toBe(true)
        } else if (mode === 'code') {
          expect(
            wrapper.find('.breadcrumb-segment.project-file').exists()
          ).toBe(true)
        } else if (mode === 'timeline') {
          expect(wrapper.find('.breadcrumb-segment.project-git').exists()).toBe(
            true
          )
        }
      }
    })

    it('should handle all props changing simultaneously', async () => {
      wrapper = mount(AdaptiveBreadcrumb, {
        props: {
          currentMode: 'generative' as ModeType,
          projectPath: '/initial/path',
        },
      })

      await wrapper.setProps({
        currentMode: 'code' as ModeType,
        projectPath: '/new/path',
        currentUrl: 'https://new.url',
        projectName: 'new-project',
        filePath: 'new/file.ts',
        gitBranch: 'new-branch',
      })

      expect(wrapper.find('.breadcrumb-segment.project-file').exists()).toBe(
        true
      )
      expect(wrapper.find('.project-badge').text()).toBe('new-project')

      const segments = wrapper.findAll('.segment-text')
      expect(segments[0].text()).toBe('new')
      expect(segments[1].text()).toBe('file.ts')
    })
  })

  describe('CSS Classes and Styling', () => {
    it('should apply correct CSS classes for each mode', () => {
      const modeClassMap = {
        generative: 'filesystem',
        visual: 'url',
        code: 'project-file',
        timeline: 'project-git',
      }

      Object.entries(modeClassMap).forEach(([mode, className]) => {
        const testWrapper = mount(AdaptiveBreadcrumb, {
          props: {
            currentMode: mode as ModeType,
          },
        })

        expect(
          testWrapper.find(`.breadcrumb-segment.${className}`).exists()
        ).toBe(true)
        testWrapper.unmount()
      })
    })

    it('should have adaptive-breadcrumb root class', () => {
      wrapper = mount(AdaptiveBreadcrumb, {
        props: {
          currentMode: 'generative' as ModeType,
        },
      })

      expect(wrapper.find('.adaptive-breadcrumb').exists()).toBe(true)
    })
  })
})
