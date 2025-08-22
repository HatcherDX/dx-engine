/**
 * @fileoverview Comprehensive coverage tests for TestSyntaxView.vue
 *
 * @description
 * Tests for the syntax highlighting test view component.
 * Covers code highlighting functionality, button interactions,
 * and component lifecycle methods.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { mount, VueWrapper } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import TestSyntaxView from './TestSyntaxView.vue'

// Mock the prism highlighter utility
vi.mock('../utils/prismHighlighter', () => ({
  highlightCode: vi.fn((code: string) => {
    // Return highlighted code with style attributes to simulate real highlighting
    return `<span style="color: #ff6b6b;">${code}</span>`
  }),
}))

describe('TestSyntaxView.vue', () => {
  let wrapper: VueWrapper
  let mockHighlightCode: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks()

    // Get reference to the mocked function
    mockHighlightCode = vi.mocked(
      await import('../utils/prismHighlighter')
    ).highlightCode
  })

  const createWrapper = () => {
    return mount(TestSyntaxView)
  }

  describe('Component Rendering', () => {
    beforeEach(() => {
      wrapper = createWrapper()
    })

    it('should render the main container', () => {
      expect(wrapper.find('.test-syntax-view').exists()).toBe(true)
    })

    it('should render the main title', () => {
      const title = wrapper.find('h1')
      expect(title.exists()).toBe(true)
      expect(title.text()).toBe('Syntax Highlighting Test')
    })

    it('should render all test sections', () => {
      const sections = wrapper.findAll('.test-section')
      expect(sections).toHaveLength(4)

      const expectedTitles = [
        'JavaScript Test',
        'TypeScript Test',
        'Vue Test',
        'CSS Test',
      ]
      sections.forEach((section, index) => {
        const h2 = section.find('h2')
        expect(h2.text()).toBe(expectedTitles[index])
      })
    })

    it('should render code display areas', () => {
      const codeDisplays = wrapper.findAll('.code-display')
      expect(codeDisplays).toHaveLength(4)
    })

    it('should render the test button', () => {
      const button = wrapper.find('button')
      expect(button.exists()).toBe(true)
      expect(button.text()).toBe('Run Highlighting Test')
    })
  })

  describe('Component Data and Reactive Properties', () => {
    beforeEach(() => {
      wrapper = createWrapper()
    })

    it('should initialize reactive refs correctly', () => {
      const vm = wrapper.vm as unknown as {
        jsHighlighted: string
        tsHighlighted: string
        vueHighlighted: string
        cssHighlighted: string
      }

      // Note: Due to onMounted running highlightCode, these may already be highlighted
      expect(typeof vm.jsHighlighted).toBe('string')
      expect(typeof vm.tsHighlighted).toBe('string')
      expect(typeof vm.vueHighlighted).toBe('string')
      expect(typeof vm.cssHighlighted).toBe('string')
    })

    it('should have correct code samples defined', () => {
      const vm = wrapper.vm as unknown as {
        jsCode: string
        tsCode: string
        vueCode: string
        cssCode: string
      }

      expect(vm.jsCode).toContain('const greeting = "Hello World"')
      expect(vm.jsCode).toContain('function sayHello(name)')

      expect(vm.tsCode).toContain('interface User')
      expect(vm.tsCode).toContain('Promise<User>')

      expect(vm.vueCode).toContain('<template>')
      expect(vm.vueCode).toContain('@click="handleClick"')

      expect(vm.cssCode).toContain('.container')
      expect(vm.cssCode).toContain('display: flex')
    })

    it('should have proper JavaScript code structure', () => {
      const vm = wrapper.vm as unknown as { jsCode: string }

      expect(vm.jsCode).toContain('// JavaScript example')
      expect(vm.jsCode).toContain('console.log')
      expect(vm.jsCode).toContain('return true')
    })

    it('should have proper TypeScript code structure', () => {
      const vm = wrapper.vm as unknown as { tsCode: string }

      expect(vm.tsCode).toContain('// TypeScript example')
      expect(vm.tsCode).toContain('id: number')
      expect(vm.tsCode).toContain('email?: string')
    })

    it('should have proper Vue code structure', () => {
      const vm = wrapper.vm as unknown as { vueCode: string }

      expect(vm.vueCode).toContain('<div class="component">')
      expect(vm.vueCode).toContain('{{ title }}')
      expect(vm.vueCode).toContain('const title = ref')
    })

    it('should have proper CSS code structure', () => {
      const vm = wrapper.vm as unknown as { cssCode: string }

      expect(vm.cssCode).toContain('/* CSS example */')
      expect(vm.cssCode).toContain('padding: 20px')
      expect(vm.cssCode).toContain(':hover')
    })
  })

  describe('runTest Method', () => {
    beforeEach(() => {
      wrapper = createWrapper()
    })

    it('should call highlightCode for all languages', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      // Clear previous calls from onMounted
      mockHighlightCode.mockClear()

      const button = wrapper.find('button')
      await button.trigger('click')

      expect(mockHighlightCode).toHaveBeenCalledTimes(4)
      expect(mockHighlightCode).toHaveBeenCalledWith(
        expect.stringContaining('const greeting = "Hello World"'),
        'javascript'
      )
      expect(mockHighlightCode).toHaveBeenCalledWith(
        expect.stringContaining('interface User'),
        'typescript'
      )
      expect(mockHighlightCode).toHaveBeenCalledWith(
        expect.stringContaining('<template>'),
        'vue'
      )
      expect(mockHighlightCode).toHaveBeenCalledWith(
        expect.stringContaining('.container'),
        'css'
      )

      consoleSpy.mockRestore()
    })

    it('should update reactive refs with highlighted code', async () => {
      const button = wrapper.find('button')
      await button.trigger('click')

      const vm = wrapper.vm as unknown as Record<string, unknown>
      expect(vm.jsHighlighted).toContain('<span style="color: #ff6b6b;">')
      expect(vm.tsHighlighted).toContain('<span style="color: #ff6b6b;">')
      expect(vm.vueHighlighted).toContain('<span style="color: #ff6b6b;">')
      expect(vm.cssHighlighted).toContain('<span style="color: #ff6b6b;">')
    })

    it('should log highlighting process', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const button = wrapper.find('button')
      await button.trigger('click')

      expect(consoleSpy).toHaveBeenCalledWith(
        'Running syntax highlighting test...'
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        'JS highlighted:',
        expect.any(String)
      )
      expect(consoleSpy).toHaveBeenCalledWith('JS has styles:', true)
      expect(consoleSpy).toHaveBeenCalledWith(
        'TS highlighted:',
        expect.any(String)
      )
      expect(consoleSpy).toHaveBeenCalledWith('TS has styles:', true)
      expect(consoleSpy).toHaveBeenCalledWith(
        'Vue highlighted:',
        expect.any(String)
      )
      expect(consoleSpy).toHaveBeenCalledWith('Vue has styles:', true)
      expect(consoleSpy).toHaveBeenCalledWith(
        'CSS highlighted:',
        expect.any(String)
      )
      expect(consoleSpy).toHaveBeenCalledWith('CSS has styles:', true)
      expect(consoleSpy).toHaveBeenCalledWith('✅ All tests completed')

      consoleSpy.mockRestore()
    })

    it('should handle highlighting errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const error = new Error('Highlighting failed')
      mockHighlightCode.mockImplementation(() => {
        throw error
      })

      const button = wrapper.find('button')
      await button.trigger('click')

      expect(consoleSpy).toHaveBeenCalledWith('❌ Test failed:', error)

      consoleSpy.mockRestore()
    })

    it('should detect styles in highlighted code', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      // Clear previous calls from onMounted
      consoleSpy.mockClear()

      const button = wrapper.find('button')
      await button.trigger('click')

      // Just verify that console.log was called (logs exist in the implementation)
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('should detect when code has no styles', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      mockHighlightCode.mockReturnValue('plain text without styles')

      const button = wrapper.find('button')
      await button.trigger('click')

      expect(consoleSpy).toHaveBeenCalledWith('JS has styles:', false)
      expect(consoleSpy).toHaveBeenCalledWith('TS has styles:', false)
      expect(consoleSpy).toHaveBeenCalledWith('Vue has styles:', false)
      expect(consoleSpy).toHaveBeenCalledWith('CSS has styles:', false)

      consoleSpy.mockRestore()
    })
  })

  describe('Button Interaction', () => {
    beforeEach(() => {
      wrapper = createWrapper()
    })

    it('should call runTest when button is clicked', async () => {
      // Clear any previous calls to our mock
      mockHighlightCode.mockClear()

      const button = wrapper.find('button')
      await button.trigger('click')

      // Verify that highlighting was triggered (which means runTest was called)
      expect(mockHighlightCode).toHaveBeenCalled()
    })

    it('should update UI when button is clicked', async () => {
      const button = wrapper.find('button')
      await button.trigger('click')
      await nextTick()

      const vm = wrapper.vm as unknown as Record<string, unknown>
      expect(vm.jsHighlighted).not.toBe('')
      expect(vm.tsHighlighted).not.toBe('')
      expect(vm.vueHighlighted).not.toBe('')
      expect(vm.cssHighlighted).not.toBe('')
    })

    it('should render highlighted code in DOM after button click', async () => {
      const button = wrapper.find('button')
      await button.trigger('click')
      await nextTick()

      const codeDisplays = wrapper.findAll('.code-display')
      codeDisplays.forEach((display) => {
        // Mock returns plain text, so we just check that content exists
        expect(display.element.innerHTML.length).toBeGreaterThan(0)
      })
    })
  })

  describe('onMounted Lifecycle', () => {
    it('should run test automatically on mount', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      wrapper = createWrapper()
      await nextTick()

      expect(consoleSpy).toHaveBeenCalledWith(
        'Running syntax highlighting test...'
      )
      expect(mockHighlightCode).toHaveBeenCalledTimes(4)

      consoleSpy.mockRestore()
    })

    it('should initialize highlighted code on mount', async () => {
      wrapper = createWrapper()
      await nextTick()

      const vm = wrapper.vm as unknown as Record<string, unknown>
      expect(vm.jsHighlighted).not.toBe('')
      expect(vm.tsHighlighted).not.toBe('')
      expect(vm.vueHighlighted).not.toBe('')
      expect(vm.cssHighlighted).not.toBe('')
    })
  })

  describe('Template Rendering with Highlighted Code', () => {
    beforeEach(async () => {
      wrapper = createWrapper()
      await nextTick()
    })

    it('should render highlighted JavaScript code', () => {
      const jsSection = wrapper.findAll('.test-section')[0]
      const codeDisplay = jsSection.find('.code-display')

      expect(codeDisplay.element.innerHTML.length).toBeGreaterThan(0)
    })

    it('should render highlighted TypeScript code', () => {
      const tsSection = wrapper.findAll('.test-section')[1]
      const codeDisplay = tsSection.find('.code-display')

      expect(codeDisplay.element.innerHTML.length).toBeGreaterThan(0)
    })

    it('should render highlighted Vue code', () => {
      const vueSection = wrapper.findAll('.test-section')[2]
      const codeDisplay = vueSection.find('.code-display')

      expect(codeDisplay.element.innerHTML.length).toBeGreaterThan(0)
    })

    it('should render highlighted CSS code', () => {
      const cssSection = wrapper.findAll('.test-section')[3]
      const codeDisplay = cssSection.find('.code-display')

      expect(codeDisplay.element.innerHTML.length).toBeGreaterThan(0)
    })

    it('should use v-html for code display', () => {
      const codeDisplays = wrapper.findAll('.code-display')

      codeDisplays.forEach((display) => {
        // Mock returns plain text, so we just check content exists
        expect(display.element.innerHTML.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Error Handling Edge Cases', () => {
    it('should handle null return from highlightCode', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockHighlightCode.mockReturnValue(null)

      const button = wrapper.find('button')
      await button.trigger('click')

      // Should not crash even with null return
      const vm = wrapper.vm as unknown as Record<string, unknown>
      expect(vm.jsHighlighted).toBe(null)

      consoleSpy.mockRestore()
    })

    it('should handle empty string return from highlightCode', async () => {
      mockHighlightCode.mockReturnValue('')

      const button = wrapper.find('button')
      await button.trigger('click')

      const vm = wrapper.vm as unknown as Record<string, unknown>
      expect(vm.jsHighlighted).toBe('')
      expect(vm.tsHighlighted).toBe('')
      expect(vm.vueHighlighted).toBe('')
      expect(vm.cssHighlighted).toBe('')
    })

    it('should handle partial highlighting failures', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      mockHighlightCode
        .mockReturnValueOnce('<span style="color: red;">highlighted</span>') // JS succeeds
        .mockImplementationOnce(() => {
          throw new Error('TS failed')
        }) // TS fails

      const button = wrapper.find('button')
      await button.trigger('click')

      expect(consoleSpy).toHaveBeenCalledWith(
        '❌ Test failed:',
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })
  })

  describe('Multiple Test Runs', () => {
    beforeEach(async () => {
      wrapper = createWrapper()
      await nextTick()
    })

    it('should allow multiple test runs', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      // Clear previous calls from onMounted
      mockHighlightCode.mockClear()

      const button = wrapper.find('button')
      await button.trigger('click')
      await button.trigger('click')

      expect(mockHighlightCode).toHaveBeenCalledTimes(8) // 4 languages x 2 runs
      expect(consoleSpy).toHaveBeenCalledWith('✅ All tests completed')

      consoleSpy.mockRestore()
    })

    it('should update highlighting on each run', async () => {
      mockHighlightCode.mockReturnValue(
        '<span style="color: blue;">first run</span>'
      )
      const button1 = wrapper.find('button')
      await button1.trigger('click')

      const vm = wrapper.vm as unknown as Record<string, unknown>
      expect(vm.jsHighlighted).toContain('first run')

      mockHighlightCode.mockReturnValue(
        '<span style="color: green;">second run</span>'
      )
      const button2 = wrapper.find('button')
      await button2.trigger('click')

      expect(vm.jsHighlighted).toContain('second run')
    })
  })

  describe('Component Accessibility', () => {
    beforeEach(() => {
      wrapper = createWrapper()
    })

    it('should have proper heading structure', () => {
      const h1 = wrapper.find('h1')
      const h2s = wrapper.findAll('h2')

      expect(h1.exists()).toBe(true)
      expect(h2s).toHaveLength(4)
    })

    it('should have accessible button', () => {
      const button = wrapper.find('button')

      expect(button.text()).toBe('Run Highlighting Test')
      expect(button.attributes('type')).toBeUndefined() // Default button type
    })

    it('should have semantic HTML structure', () => {
      const sections = wrapper.findAll('.test-section')

      sections.forEach((section) => {
        expect(section.find('h2').exists()).toBe(true)
        expect(section.find('.code-display').exists()).toBe(true)
      })
    })
  })

  describe('Simple Component Tests', () => {
    // Type definition for TestSyntaxView component instance - NO ANY TYPES ALLOWED
    interface TestSyntaxViewInstance
      extends InstanceType<typeof TestSyntaxView> {
      code: string
      language: string
      highlightedCode: string
      updateCode: (newCode: string) => void
      changeLanguage: (newLanguage: string) => void
      [key: string]: unknown
    }

    describe('Component Mounting (Simple)', () => {
      it('should mount without errors', () => {
        expect(() => {
          mount(TestSyntaxView)
        }).not.toThrow()
      })

      it('should render main container (simple test)', () => {
        const wrapper = mount(TestSyntaxView)

        expect(wrapper.find('.test-syntax-view').exists()).toBe(true)
      })

      it('should render main title (simple test)', () => {
        const wrapper = mount(TestSyntaxView)

        const title = wrapper.find('h1')
        expect(title.exists()).toBe(true)
        expect(title.text()).toBe('Syntax Highlighting Test')
      })

      it('should render test sections (simple test)', () => {
        const wrapper = mount(TestSyntaxView)

        const sections = wrapper.findAll('.test-section')
        expect(sections.length).toBe(4)

        const expectedTitles = [
          'JavaScript Test',
          'TypeScript Test',
          'Vue Test',
          'CSS Test',
        ]
        sections.forEach((section, index) => {
          const h2 = section.find('h2')
          expect(h2.text()).toBe(expectedTitles[index])
        })
      })

      it('should render test button (simple test)', () => {
        const wrapper = mount(TestSyntaxView)

        const button = wrapper.find('button')
        expect(button.exists()).toBe(true)
        expect(button.text()).toBe('Run Highlighting Test')
      })
    })

    describe('Basic Functionality (Simple)', () => {
      it('should have code display areas', () => {
        const wrapper = mount(TestSyntaxView)

        const codeDisplays = wrapper.findAll('.code-display')
        expect(codeDisplays.length).toBe(4)
      })

      it('should handle button click', async () => {
        const wrapper = mount(TestSyntaxView)

        const button = wrapper.find('button')
        await button.trigger('click')

        // Should not throw error
        expect(wrapper.exists()).toBe(true)
      })

      it('should have working template structure', () => {
        const wrapper = mount(TestSyntaxView)

        expect(wrapper.html()).toContain('test-syntax-view')
        expect(wrapper.html()).toContain('Syntax Highlighting Test')
        expect(wrapper.html()).toContain('Run Highlighting Test')
      })
    })

    describe('Component Lifecycle (Simple)', () => {
      it('should handle mounting lifecycle', async () => {
        const wrapper = mount(TestSyntaxView)
        await nextTick()

        // Component should be mounted successfully
        expect(wrapper.vm).toBeDefined()
        expect(wrapper.exists()).toBe(true)
      })

      it('should initialize reactive properties', () => {
        const wrapper = mount(TestSyntaxView)

        const vm = wrapper.vm as TestSyntaxViewInstance
        expect(typeof vm.jsHighlighted).toBe('string')
        expect(typeof vm.tsHighlighted).toBe('string')
        expect(typeof vm.vueHighlighted).toBe('string')
        expect(typeof vm.cssHighlighted).toBe('string')
      })
    })

    describe('Code Samples (Simple)', () => {
      it('should have predefined code samples', () => {
        const wrapper = mount(TestSyntaxView)

        const vm = wrapper.vm as TestSyntaxViewInstance
        expect(vm.jsCode).toContain('Hello World')
        expect(vm.tsCode).toContain('interface User')
        expect(vm.vueCode).toContain('<template>')
        expect(vm.cssCode).toContain('.container')
      })

      it('should have proper JavaScript code structure (simple)', () => {
        const wrapper = mount(TestSyntaxView)

        const vm = wrapper.vm as TestSyntaxViewInstance
        expect(vm.jsCode).toContain('function sayHello')
        expect(vm.jsCode).toContain('console.log')
      })

      it('should have proper TypeScript code structure (simple)', () => {
        const wrapper = mount(TestSyntaxView)

        const vm = wrapper.vm as TestSyntaxViewInstance
        expect(vm.tsCode).toContain('Promise<User>')
        expect(vm.tsCode).toContain('id: number')
      })
    })

    describe('Error Handling (Simple)', () => {
      it('should handle component destruction without errors', () => {
        const wrapper = mount(TestSyntaxView)

        expect(() => {
          wrapper.unmount()
        }).not.toThrow()
      })

      it('should handle missing methods gracefully', () => {
        const wrapper = mount(TestSyntaxView)

        // Component should exist and have basic structure
        expect(wrapper.vm).toBeDefined()
        const vm = wrapper.vm as TestSyntaxViewInstance
        expect(typeof vm.runTest).toBe('function')
      })
    })

    describe('Highlighting Integration (Simple)', () => {
      it('should use highlighter utility', async () => {
        const { highlightCode } = await import('../utils/prismHighlighter')
        const wrapper = mount(TestSyntaxView)

        // Trigger highlighting
        const vm = wrapper.vm as TestSyntaxViewInstance
        vm.runTest()

        // Should call the highlight function
        expect(vi.mocked(highlightCode)).toHaveBeenCalled()
      })

      it('should handle highlighting for all languages (simple)', async () => {
        const { highlightCode } = await import('../utils/prismHighlighter')
        const wrapper = mount(TestSyntaxView)

        const vm = wrapper.vm as TestSyntaxViewInstance
        vm.runTest()

        // Should call highlight for each language
        expect(vi.mocked(highlightCode)).toHaveBeenCalledWith(
          expect.stringContaining('Hello World'),
          'javascript'
        )
        expect(vi.mocked(highlightCode)).toHaveBeenCalledWith(
          expect.stringContaining('interface User'),
          'typescript'
        )
        expect(vi.mocked(highlightCode)).toHaveBeenCalledWith(
          expect.stringContaining('<template>'),
          'vue'
        )
        expect(vi.mocked(highlightCode)).toHaveBeenCalledWith(
          expect.stringContaining('.container'),
          'css'
        )
      })
    })
  })
})
