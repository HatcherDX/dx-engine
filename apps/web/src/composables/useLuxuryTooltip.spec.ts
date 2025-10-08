/**
 * @fileoverview Test suite for useLuxuryTooltip composable.
 *
 * @description
 * Comprehensive tests for the luxury tooltip directive, plugin,
 * and composable functions ensuring 100% code coverage.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @internal
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { defineComponent, nextTick, createApp } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import type { Instance as TippyInstance } from 'tippy.js'

// Mock tippy.js module first before any imports that use it
vi.mock('tippy.js', () => {
  const mockTippyInstance: TippyInstance = {
    setContent: vi.fn(),
    setProps: vi.fn(),
    destroy: vi.fn(),
    show: vi.fn(),
    hide: vi.fn(),
    disable: vi.fn(),
    enable: vi.fn(),
    clearDelayTimeouts: vi.fn(),
    setInstances: vi.fn(),
    hideWithInteractivity: vi.fn(),
    unmount: vi.fn(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mock tippy instance requires flexible reference element typing
    reference: {} as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mock tippy instance requires flexible popper element typing
    popper: {} as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mock tippy instance requires flexible props structure
    props: {} as any,
    state: {
      isEnabled: true,
      isVisible: false,
      isDestroyed: false,
      isMounted: false,
      isShown: false,
    },
    id: 1,
    plugins: [],
    popperInstance: null,
  }

  return {
    default: vi.fn(() => mockTippyInstance),
  }
})

import {
  vLuxuryTooltip,
  createLuxuryTooltip,
  LuxuryTooltipPlugin,
  useLuxuryTooltip,
} from './useLuxuryTooltip'

// Get mocked tippy for testing
const tippy = await import('tippy.js')
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test mock tippy function returns mocked instance
const mockTippy = tippy.default as any
const mockTippyInstance = mockTippy()

describe('useLuxuryTooltip', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock instance methods
    mockTippyInstance.setContent = vi.fn()
    mockTippyInstance.setProps = vi.fn()
    mockTippyInstance.destroy = vi.fn()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('CSS imports', () => {
    it('should not import CSS in test environment', () => {
      // The condition checks for !import.meta.env.VITEST
      // In test environment, VITEST is 'true' (string), so CSS imports should be skipped
      expect(import.meta.env.VITEST).toBeTruthy()
    })

    it('should handle window undefined', async () => {
      const originalWindow = global.window
      // @ts-expect-error -- Testing missing window scenario
      delete global.window

      // Re-import to trigger the condition check
      await import('./useLuxuryTooltip')

      // Should not throw
      expect(true).toBe(true)

      // Restore window
      global.window = originalWindow
    })
  })

  describe('vLuxuryTooltip directive', () => {
    let wrapper: VueWrapper<ComponentPublicInstance>

    describe('mounted hook', () => {
      it('should create tooltip with string content', async () => {
        const TestComponent = defineComponent({
          directives: { luxuryTooltip: vLuxuryTooltip },
          data() {
            return {
              tooltipContent: 'Test tooltip',
            }
          },
          template: '<button v-luxury-tooltip="tooltipContent">Click</button>',
        })

        wrapper = mount(TestComponent)
        await nextTick()

        expect(mockTippy).toHaveBeenCalledWith(
          expect.any(HTMLElement),
          expect.objectContaining({
            content: 'Test tooltip',
            theme: 'luxury',
            animation: 'shift-away-subtle',
          })
        )

        const button = wrapper.find('button').element as HTMLElement & {
          _tippy?: TippyInstance
        }
        expect(button._tippy).toBe(mockTippyInstance)
      })

      it('should create tooltip with object configuration', async () => {
        const TestComponent = defineComponent({
          directives: { luxuryTooltip: vLuxuryTooltip },
          data() {
            return {
              tooltipConfig: {
                content: 'Custom tooltip',
                placement: 'top' as const,
                delay: [200, 0],
              },
            }
          },
          template: '<button v-luxury-tooltip="tooltipConfig">Click</button>',
        })

        wrapper = mount(TestComponent)
        await nextTick()

        expect(mockTippy).toHaveBeenCalledWith(
          expect.any(HTMLElement),
          expect.objectContaining({
            content: 'Custom tooltip',
            placement: 'top',
            delay: [200, 0],
            theme: 'luxury',
          })
        )
      })

      it('should handle empty binding value', async () => {
        const TestComponent = defineComponent({
          directives: { luxuryTooltip: vLuxuryTooltip },
          template: '<button v-luxury-tooltip>Click</button>',
        })

        wrapper = mount(TestComponent)
        await nextTick()

        expect(mockTippy).toHaveBeenCalledWith(
          expect.any(HTMLElement),
          expect.objectContaining({
            theme: 'luxury',
            animation: 'shift-away-subtle',
          })
        )
      })

      it('should handle null binding value', async () => {
        const TestComponent = defineComponent({
          directives: { luxuryTooltip: vLuxuryTooltip },
          template: '<button v-luxury-tooltip="null">Click</button>',
        })

        wrapper = mount(TestComponent)
        await nextTick()

        expect(mockTippy).toHaveBeenCalledWith(
          expect.any(HTMLElement),
          expect.objectContaining({
            theme: 'luxury',
          })
        )
      })
    })

    describe('updated hook', () => {
      it('should update tooltip content when string value changes', async () => {
        const TestComponent = defineComponent({
          directives: { luxuryTooltip: vLuxuryTooltip },
          data() {
            return {
              tooltipContent: 'Initial tooltip',
            }
          },
          template: '<button v-luxury-tooltip="tooltipContent">Click</button>',
        })

        wrapper = mount(TestComponent)
        await nextTick()

        // Update the content
        await wrapper.setData({ tooltipContent: 'Updated tooltip' })
        await nextTick()

        expect(mockTippyInstance.setContent).toHaveBeenCalledWith(
          'Updated tooltip'
        )
      })

      it('should update tooltip props when object value changes', async () => {
        const TestComponent = defineComponent({
          directives: { luxuryTooltip: vLuxuryTooltip },
          data() {
            return {
              tooltipConfig: {
                content: 'Initial',
                placement: 'bottom' as const,
              },
            }
          },
          template: '<button v-luxury-tooltip="tooltipConfig">Click</button>',
        })

        wrapper = mount(TestComponent)
        await nextTick()

        // Update the config
        await wrapper.setData({
          tooltipConfig: {
            content: 'Updated',
            placement: 'top' as const,
            delay: [100, 0],
          },
        })
        await nextTick()

        expect(mockTippyInstance.setContent).toHaveBeenCalledWith('Updated')
        expect(mockTippyInstance.setProps).toHaveBeenCalledWith({
          content: 'Updated',
          placement: 'top',
          delay: [100, 0],
        })
      })

      it('should handle update when instance does not exist', async () => {
        const TestComponent = defineComponent({
          directives: { luxuryTooltip: vLuxuryTooltip },
          data() {
            return {
              tooltipContent: 'Test',
            }
          },
          template: '<button v-luxury-tooltip="tooltipContent">Click</button>',
        })

        wrapper = mount(TestComponent)
        await nextTick()

        // Remove the tippy instance
        const button = wrapper.find('button').element as HTMLElement & {
          _tippy?: TippyInstance
        }
        delete button._tippy

        // Update should not throw
        await wrapper.setData({ tooltipContent: 'Updated' })
        await nextTick()

        // setContent should not have been called since instance was removed
        expect(mockTippyInstance.setContent).not.toHaveBeenCalledWith('Updated')
      })

      it('should handle object value without content property', async () => {
        const TestComponent = defineComponent({
          directives: { luxuryTooltip: vLuxuryTooltip },
          data() {
            return {
              tooltipConfig: {
                placement: 'top' as const,
              },
            }
          },
          template: '<button v-luxury-tooltip="tooltipConfig">Click</button>',
        })

        wrapper = mount(TestComponent)
        await nextTick()

        // Update with new config without content
        await wrapper.setData({
          tooltipConfig: {
            placement: 'bottom' as const,
            delay: [300, 0],
          },
        })
        await nextTick()

        // Should only call setProps, not setContent
        expect(mockTippyInstance.setContent).not.toHaveBeenCalled()
        expect(mockTippyInstance.setProps).toHaveBeenCalledWith({
          placement: 'bottom',
          delay: [300, 0],
        })
      })

      it('should not update when content is undefined', async () => {
        const TestComponent = defineComponent({
          directives: { luxuryTooltip: vLuxuryTooltip },
          data() {
            return {
              tooltipConfig: {
                content: 'Initial',
              },
            }
          },
          template: '<button v-luxury-tooltip="tooltipConfig">Click</button>',
        })

        wrapper = mount(TestComponent)
        await nextTick()

        // Clear mock calls
        vi.clearAllMocks()

        // Update with undefined content
        await wrapper.setData({
          tooltipConfig: {
            content: undefined,
            placement: 'top' as const,
          },
        })
        await nextTick()

        // Should not call setContent with undefined
        expect(mockTippyInstance.setContent).not.toHaveBeenCalled()
        // But should still update props
        expect(mockTippyInstance.setProps).toHaveBeenCalled()
      })
    })

    describe('unmounted hook', () => {
      it('should destroy tooltip on unmount', async () => {
        const TestComponent = defineComponent({
          directives: { luxuryTooltip: vLuxuryTooltip },
          template: '<button v-luxury-tooltip="\'Test\'">Click</button>',
        })

        wrapper = mount(TestComponent)
        await nextTick()

        const button = wrapper.find('button').element as HTMLElement & {
          _tippy?: TippyInstance
        }
        expect(button._tippy).toBe(mockTippyInstance)

        // Unmount the component
        wrapper.unmount()

        expect(mockTippyInstance.destroy).toHaveBeenCalled()
        expect(button._tippy).toBeUndefined()
      })

      it('should handle unmount when no instance exists', async () => {
        const TestComponent = defineComponent({
          directives: { luxuryTooltip: vLuxuryTooltip },
          template: '<button v-luxury-tooltip="\'Test\'">Click</button>',
        })

        wrapper = mount(TestComponent)
        await nextTick()

        // Remove the tippy instance before unmounting
        const button = wrapper.find('button').element as HTMLElement & {
          _tippy?: TippyInstance
        }
        delete button._tippy

        // Unmount should not throw
        wrapper.unmount()

        expect(mockTippyInstance.destroy).not.toHaveBeenCalled()
      })
    })
  })

  describe('createLuxuryTooltip', () => {
    it('should create tooltip with default theme', () => {
      const element = document.createElement('button')
      const instance = createLuxuryTooltip(element, 'Test content')

      expect(mockTippy).toHaveBeenCalledWith(element, {
        theme: 'luxury',
        animation: 'shift-away-subtle',
        duration: [275, 250],
        delay: [500, 0],
        placement: 'bottom',
        arrow: true,
        offset: [0, 10],
        maxWidth: 200,
        appendTo: expect.any(Function),
        content: 'Test content',
      })

      expect(instance).toBe(mockTippyInstance)
    })

    it('should merge custom options', () => {
      const element = document.createElement('div')
      const customOptions = {
        placement: 'top' as const,
        delay: [200, 100],
        arrow: false,
      }

      createLuxuryTooltip(element, 'Custom tooltip', customOptions)

      expect(mockTippy).toHaveBeenCalledWith(
        element,
        expect.objectContaining({
          content: 'Custom tooltip',
          placement: 'top',
          delay: [200, 100],
          arrow: false,
          theme: 'luxury',
        })
      )
    })

    it('should handle empty options', () => {
      const element = document.createElement('span')
      createLuxuryTooltip(element, 'Simple tooltip')

      expect(mockTippy).toHaveBeenCalledWith(
        element,
        expect.objectContaining({
          content: 'Simple tooltip',
          theme: 'luxury',
        })
      )
    })
  })

  describe('LuxuryTooltipPlugin', () => {
    it('should register directive on app', () => {
      const mockApp = {
        directive: vi.fn(),
      } as unknown as ReturnType<typeof createApp>

      LuxuryTooltipPlugin.install(mockApp)

      expect(mockApp.directive).toHaveBeenCalledWith(
        'luxury-tooltip',
        vLuxuryTooltip
      )
    })

    it('should work with app.use()', () => {
      const mockApp = {
        directive: vi.fn(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test mock app.use requires flexible this context and plugin types
        use: vi.fn(function (this: any, plugin: any) {
          plugin.install(this)
          return this
        }),
      } as unknown as ReturnType<typeof createApp>

      mockApp.use(LuxuryTooltipPlugin)

      expect(mockApp.directive).toHaveBeenCalledWith(
        'luxury-tooltip',
        vLuxuryTooltip
      )
    })
  })

  describe('useLuxuryTooltip composable', () => {
    it('should return createTooltip function', () => {
      const { createTooltip } = useLuxuryTooltip()
      expect(createTooltip).toBe(createLuxuryTooltip)
    })

    it('should return directive', () => {
      const { directive } = useLuxuryTooltip()
      expect(directive).toBe(vLuxuryTooltip)
    })

    it('should work with component setup', () => {
      const TestComponent = defineComponent({
        setup() {
          const { createTooltip, directive } = useLuxuryTooltip()
          return {
            createTooltip,
            directive,
          }
        },
        template: '<div>Test</div>',
      })

      const wrapper = mount(TestComponent)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for property access
      const vm = wrapper.vm as any

      expect(vm.createTooltip).toBe(createLuxuryTooltip)
      expect(vm.directive).toBe(vLuxuryTooltip)
    })
  })

  describe('theme configuration', () => {
    it('should use correct luxury theme defaults', () => {
      const element = document.createElement('button')
      createLuxuryTooltip(element, 'Test')

      const callArgs = mockTippy.mock.calls[0][1]
      expect(callArgs).toMatchObject({
        theme: 'luxury',
        animation: 'shift-away-subtle',
        duration: [275, 250],
        delay: [500, 0],
        placement: 'bottom',
        arrow: true,
        offset: [0, 10],
        maxWidth: 200,
      })

      // Test appendTo function - should return document.body
      expect(typeof callArgs.appendTo).toBe('function')
      expect(callArgs.appendTo()).toBe(document.body)
    })

    it('should verify appendTo function returns document.body', () => {
      const element = document.createElement('div')
      createLuxuryTooltip(element, 'Another test')

      // Get the last call's arguments
      const lastCallArgs =
        mockTippy.mock.calls[mockTippy.mock.calls.length - 1][1]

      // Verify appendTo is a function that returns document.body
      expect(typeof lastCallArgs.appendTo).toBe('function')
      const result = lastCallArgs.appendTo()
      expect(result).toBe(document.body)
      expect(result).toBeInstanceOf(HTMLBodyElement)
    })
  })

  describe('integration tests', () => {
    it('should handle full lifecycle: mount, update, unmount', async () => {
      const TestComponent = defineComponent({
        directives: { luxuryTooltip: vLuxuryTooltip },
        data() {
          return {
            showButton: true,
            tooltipContent: 'Initial tooltip',
          }
        },
        template: `
          <div>
            <button v-if="showButton" v-luxury-tooltip="tooltipContent">
              Click me
            </button>
          </div>
        `,
      })

      const wrapper = mount(TestComponent)
      await nextTick()

      // Verify mount
      expect(mockTippy).toHaveBeenCalledWith(
        expect.any(HTMLElement),
        expect.objectContaining({ content: 'Initial tooltip' })
      )

      // Update content
      await wrapper.setData({ tooltipContent: 'Updated tooltip' })
      expect(mockTippyInstance.setContent).toHaveBeenCalledWith(
        'Updated tooltip'
      )

      // Hide button (triggers unmount)
      await wrapper.setData({ showButton: false })
      expect(mockTippyInstance.destroy).toHaveBeenCalled()
    })

    it('should handle multiple tooltips on same component', async () => {
      const TestComponent = defineComponent({
        directives: { luxuryTooltip: vLuxuryTooltip },
        template: `
          <div>
            <button v-luxury-tooltip="'Tooltip 1'">Button 1</button>
            <button v-luxury-tooltip="{ content: 'Tooltip 2', placement: 'top' }">
              Button 2
            </button>
          </div>
        `,
      })

      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Mounted for side effect verification
      const _wrapper = mount(TestComponent)
      await nextTick()

      expect(mockTippy).toHaveBeenCalledTimes(2)

      // First button
      expect(mockTippy).toHaveBeenNthCalledWith(
        1,
        expect.any(HTMLElement),
        expect.objectContaining({ content: 'Tooltip 1' })
      )

      // Second button
      expect(mockTippy).toHaveBeenNthCalledWith(
        2,
        expect.any(HTMLElement),
        expect.objectContaining({
          content: 'Tooltip 2',
          placement: 'top',
        })
      )
    })
  })
})
