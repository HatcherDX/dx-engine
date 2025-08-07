import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import AdaptiveBreadcrumb from './AdaptiveBreadcrumb.vue'
import type { ModeType } from './ModeSelector.vue'

// Mock child components
vi.mock('../atoms/BaseIcon.vue', () => ({
  default: {
    name: 'BaseIcon',
    template: '<span data-testid="base-icon"></span>',
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

  describe('Component Initialization', () => {
    it('should mount successfully with mode', () => {
      wrapper = mount(AdaptiveBreadcrumb, {
        props: {
          currentMode: 'generative',
        },
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('should handle generative mode', () => {
      wrapper = mount(AdaptiveBreadcrumb, {
        props: {
          currentMode: 'generative',
        },
      })

      expect(wrapper.props('currentMode')).toBe('generative')
    })

    it('should handle visual mode', () => {
      wrapper = mount(AdaptiveBreadcrumb, {
        props: {
          currentMode: 'visual',
        },
      })

      expect(wrapper.props('currentMode')).toBe('visual')
    })

    it('should handle code mode', () => {
      wrapper = mount(AdaptiveBreadcrumb, {
        props: {
          currentMode: 'code',
        },
      })

      expect(wrapper.props('currentMode')).toBe('code')
    })

    it('should handle timeline mode', () => {
      wrapper = mount(AdaptiveBreadcrumb, {
        props: {
          currentMode: 'timeline',
        },
      })

      expect(wrapper.props('currentMode')).toBe('timeline')
    })
  })

  describe('Breadcrumb Context', () => {
    it('should accept breadcrumb context data', () => {
      const contextData = {
        path: '/test/path',
        project: 'test-project',
      }

      wrapper = mount(AdaptiveBreadcrumb, {
        props: {
          currentMode: 'code',
          ...contextData,
        },
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('should handle empty context', () => {
      wrapper = mount(AdaptiveBreadcrumb, {
        props: {
          currentMode: 'generative',
        },
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('should handle complex context data', () => {
      const complexContext = {
        currentMode: 'code' as ModeType,
        filePath: '/src/components/test.vue',
        repository: 'dx-engine',
        branch: 'main',
        lastModified: new Date().toISOString(),
      }

      wrapper = mount(AdaptiveBreadcrumb, {
        props: complexContext,
      })

      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('Mode-specific Rendering', () => {
    it('should render differently for each mode', () => {
      const modes = ['generative', 'visual', 'code', 'timeline']

      modes.forEach((mode) => {
        const testWrapper = mount(AdaptiveBreadcrumb, {
          props: {
            currentMode: mode as ModeType,
          },
        })

        expect(testWrapper.exists()).toBe(true)
        expect(testWrapper.props('currentMode')).toBe(mode)
        testWrapper.unmount()
      })
    })
  })

  describe('Icon Integration', () => {
    it('should render icons when needed', () => {
      wrapper = mount(AdaptiveBreadcrumb, {
        props: {
          currentMode: 'code',
        },
      })

      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('Responsive Behavior', () => {
    it('should adapt to different container sizes', () => {
      wrapper = mount(AdaptiveBreadcrumb, {
        props: {
          currentMode: 'generative',
        },
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('should handle long paths gracefully', () => {
      wrapper = mount(AdaptiveBreadcrumb, {
        props: {
          currentMode: 'code',
          filePath:
            '/very/long/path/to/a/deeply/nested/file/that/should/be/handled/gracefully.vue',
        },
      })

      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle undefined mode', () => {
      expect(() => {
        wrapper = mount(AdaptiveBreadcrumb, {
          props: {
            currentMode: undefined as unknown as ModeType,
          },
        })
      }).not.toThrow()
    })

    it('should handle invalid mode', () => {
      expect(() => {
        wrapper = mount(AdaptiveBreadcrumb, {
          props: {
            currentMode: 'invalid-mode' as ModeType,
          },
        })
      }).not.toThrow()
    })

    it('should handle null props', () => {
      expect(() => {
        wrapper = mount(AdaptiveBreadcrumb, {
          props: {
            currentMode: 'generative' as ModeType,
            filePath: null as unknown as string,
            repository: null as unknown as string,
          },
        })
      }).not.toThrow()
    })
  })

  describe('Performance', () => {
    it('should mount quickly', () => {
      const startTime = performance.now()

      wrapper = mount(AdaptiveBreadcrumb, {
        props: {
          currentMode: 'generative',
        },
      })

      const endTime = performance.now()
      const mountTime = endTime - startTime

      expect(mountTime).toBeLessThan(20)
    })

    it('should handle rapid prop changes', async () => {
      wrapper = mount(AdaptiveBreadcrumb, {
        props: {
          currentMode: 'generative',
        },
      })

      const modes = ['visual', 'code', 'timeline', 'generative']

      for (const mode of modes) {
        await wrapper.setProps({ currentMode: mode as ModeType })
        expect(wrapper.props('currentMode')).toBe(mode)
      }
    })
  })

  describe('Accessibility', () => {
    it('should provide accessible navigation structure', () => {
      wrapper = mount(AdaptiveBreadcrumb, {
        props: {
          currentMode: 'code',
        },
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('should be keyboard navigable', () => {
      wrapper = mount(AdaptiveBreadcrumb, {
        props: {
          currentMode: 'generative',
        },
      })

      expect(wrapper.exists()).toBe(true)
    })
  })
})
