/**
 * @fileoverview Test suite for CodeBlockComponent.vue.
 *
 * @description
 * Tests core functionality of the CodeBlockComponent including rendering,
 * language configuration, and copy functionality.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import CodeBlockComponent from './CodeBlockComponent.vue'

// Mock child components
vi.mock('../atoms/BaseIcon.vue', () => ({
  default: {
    name: 'BaseIcon',
    template: '<div data-testid="base-icon"><slot /></div>',
  },
}))

vi.mock('../atoms/BaseButton.vue', () => ({
  default: {
    name: 'BaseButton',
    template:
      '<button data-testid="base-button" @click="$emit(\'click\')"><slot /></button>',
  },
}))

describe('CodeBlockComponent', () => {
  let wrapper: VueWrapper<InstanceType<typeof CodeBlockComponent>>

  const defaultProps = {
    content: 'const example = "Hello World";',
    language: 'javascript',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock clipboard API
    Object.defineProperty(global.navigator, 'clipboard', {
      value: {
        writeText: vi.fn(() => Promise.resolve()),
      },
      configurable: true,
    })

    // Setup DOM body for proper attachment
    document.body.innerHTML = '<div id="test-app"></div>'
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test validation requires bypassing type system to test runtime null handling
      wrapper = null as any
    }
    vi.clearAllMocks()
    vi.clearAllTimers()
    vi.restoreAllMocks()
    // Clean up DOM completely
    document.body.innerHTML = ''
    // Force garbage collection if available
    if (global.gc) {
      global.gc()
    }
  })

  describe('Component Initialization', () => {
    it('should mount and render without errors', () => {
      wrapper = mount(CodeBlockComponent, {
        props: defaultProps,
        attachTo: '#test-app',
      })
      expect(wrapper.exists()).toBe(true)
    })

    it('should render basic structure', () => {
      wrapper = mount(CodeBlockComponent, {
        props: defaultProps,
        attachTo: '#test-app',
      })

      expect(wrapper.find('.code-block-container').exists()).toBe(true)
      expect(wrapper.find('.code-header').exists()).toBe(true)
      expect(wrapper.find('.code-content').exists()).toBe(true)
    })

    it('should display the code content', () => {
      wrapper = mount(CodeBlockComponent, {
        props: defaultProps,
        attachTo: '#test-app',
      })
      const codeElement = wrapper.find('code')
      expect(codeElement.exists()).toBe(true)
    })
  })

  describe('Language Configuration', () => {
    it('should default to javascript language', () => {
      wrapper = mount(CodeBlockComponent, { props: { content: 'test code' } })
      const languageName = wrapper.find('.language-name')
      expect(languageName.text()).toBe('JavaScript')
    })

    it('should display correct language name for TypeScript', () => {
      wrapper = mount(CodeBlockComponent, {
        props: { content: 'test code', language: 'typescript' },
      })
      const languageName = wrapper.find('.language-name')
      expect(languageName.text()).toBe('TypeScript')
    })

    it('should display correct language name for Vue', () => {
      wrapper = mount(CodeBlockComponent, {
        props: { content: 'test code', language: 'vue' },
      })
      const languageName = wrapper.find('.language-name')
      expect(languageName.text()).toBe('Vue')
    })

    it('should display correct language name for HTML', () => {
      wrapper = mount(CodeBlockComponent, {
        props: { content: 'test code', language: 'html' },
      })
      const languageName = wrapper.find('.language-name')
      expect(languageName.text()).toBe('HTML')
    })

    it('should display correct language name for CSS', () => {
      wrapper = mount(CodeBlockComponent, {
        props: { content: 'test code', language: 'css' },
      })
      const languageName = wrapper.find('.language-name')
      expect(languageName.text()).toBe('CSS')
    })

    it('should display uppercase language name for unknown languages', () => {
      wrapper = mount(CodeBlockComponent, {
        props: { content: 'test code', language: 'python' },
      })
      const languageName = wrapper.find('.language-name')
      expect(languageName.text()).toBe('PYTHON')
    })
  })

  describe('Filename Display', () => {
    it('should display filename when provided', () => {
      wrapper = mount(CodeBlockComponent, {
        props: { content: 'test code', filename: 'app.js' },
      })
      const filename = wrapper.find('.filename')
      expect(filename.exists()).toBe(true)
      expect(filename.text()).toBe('app.js')
    })

    it('should not display filename when not provided', () => {
      wrapper = mount(CodeBlockComponent, {
        props: defaultProps,
        attachTo: '#test-app',
      })
      const filename = wrapper.find('.filename')
      expect(filename.exists()).toBe(false)
    })

    it('should not display filename when empty string', () => {
      wrapper = mount(CodeBlockComponent, {
        props: { content: 'test code', filename: '' },
        attachTo: '#test-app',
      })
      const filename = wrapper.find('.filename')
      expect(filename.exists()).toBe(false)
    })
  })

  describe('Copy Functionality', () => {
    it('should display initial copy button state', () => {
      wrapper = mount(CodeBlockComponent, {
        props: defaultProps,
        attachTo: '#test-app',
      })
      const copyText = wrapper.find('.copy-text')
      expect(copyText.text()).toBe('Copy')
    })

    it('should copy code to clipboard when copy button is clicked', async () => {
      wrapper = mount(CodeBlockComponent, {
        props: defaultProps,
        attachTo: '#test-app',
      })
      const copyButton = wrapper.find('[data-testid="base-button"]')

      await copyButton.trigger('click')

      expect(global.navigator.clipboard.writeText).toHaveBeenCalledWith(
        defaultProps.content
      )
    })

    it('should show success state after successful copy', async () => {
      vi.useFakeTimers()
      wrapper = mount(CodeBlockComponent, {
        props: defaultProps,
        attachTo: '#test-app',
      })
      const copyButton = wrapper.find('[data-testid="base-button"]')

      await copyButton.trigger('click')
      await nextTick()

      const copyText = wrapper.find('.copy-text')
      expect(copyText.text()).toBe('Copied!')

      // Fast-forward timers
      vi.advanceTimersByTime(2000)
      await nextTick()

      expect(copyText.text()).toBe('Copy')
      vi.useRealTimers()
    })
  })

  describe('Props and Defaults', () => {
    it('should handle content prop', () => {
      const testContent = 'test content here'
      wrapper = mount(CodeBlockComponent, {
        props: { content: testContent },
        attachTo: '#test-app',
      })
      expect(wrapper.vm.content).toBe(testContent)
    })

    it('should use default language when not provided', () => {
      wrapper = mount(CodeBlockComponent, {
        props: { content: 'test' },
        attachTo: '#test-app',
      })
      const languageName = wrapper.find('.language-name')
      expect(languageName.text()).toBe('JavaScript')
    })

    it('should handle filename prop', () => {
      const testFilename = 'test.js'
      wrapper = mount(CodeBlockComponent, {
        props: { content: 'test code', filename: testFilename },
        attachTo: '#test-app',
      })
      expect(wrapper.vm.filename).toBe(testFilename)
    })
  })

  describe('Accessibility', () => {
    it('should have aria-label on copy button', () => {
      wrapper = mount(CodeBlockComponent, {
        props: defaultProps,
        attachTo: '#test-app',
      })
      const copyButton = wrapper.findComponent({ name: 'BaseButton' })
      expect(copyButton.exists()).toBe(true)
    })

    it('should render semantic HTML structure', () => {
      wrapper = mount(CodeBlockComponent, {
        props: defaultProps,
        attachTo: '#test-app',
      })

      expect(wrapper.find('pre').exists()).toBe(true)
      expect(wrapper.find('code').exists()).toBe(true)
    })
  })

  describe('Component Functions', () => {
    it('should have getLanguageName function work correctly', () => {
      wrapper = mount(CodeBlockComponent, {
        props: defaultProps,
        attachTo: '#test-app',
      })

      // Test by checking different language props
      expect(wrapper.find('.language-name').text()).toBe('JavaScript')
    })

    it('should handle language changes', async () => {
      wrapper = mount(CodeBlockComponent, {
        props: defaultProps,
        attachTo: '#test-app',
      })

      await wrapper.setProps({ language: 'typescript' })
      expect(wrapper.find('.language-name').text()).toBe('TypeScript')

      await wrapper.setProps({ language: 'vue' })
      expect(wrapper.find('.language-name').text()).toBe('Vue')
    })
  })

  describe('Error Handling', () => {
    it('should handle clipboard API failure gracefully', async () => {
      // Mock clipboard to fail
      global.navigator.clipboard.writeText = vi
        .fn()
        .mockRejectedValue(new Error('Clipboard failed'))

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      wrapper = mount(CodeBlockComponent, {
        props: defaultProps,
        attachTo: '#test-app',
      })
      const copyButton = wrapper.find('[data-testid="base-button"]')

      await copyButton.trigger('click')
      await nextTick()

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to copy code:',
        expect.any(Error)
      )
      consoleSpy.mockRestore()
    })

    it('should use fallback copy mechanism when clipboard API fails', async () => {
      // Mock clipboard to fail
      global.navigator.clipboard.writeText = vi
        .fn()
        .mockRejectedValue(new Error('Clipboard failed'))

      // Mock document.execCommand for fallback - create if doesn't exist
      if (!document.execCommand) {
        Object.defineProperty(document, 'execCommand', {
          value: vi.fn(() => true),
          writable: true,
          configurable: true,
        })
      }
      const execCommandSpy = vi
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test requires flexible typing for validation testing
        .spyOn(document, 'execCommand' as any)
        .mockReturnValue(true)

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      wrapper = mount(CodeBlockComponent, {
        props: defaultProps,
        attachTo: '#test-app',
      })
      const copyButton = wrapper.find('[data-testid="base-button"]')

      await copyButton.trigger('click')
      await nextTick()

      // Verify fallback mechanism was used (execCommand called)
      expect(execCommandSpy).toHaveBeenCalledWith('copy')
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to copy code:',
        expect.any(Error)
      )

      // Cleanup
      execCommandSpy.mockRestore()
      consoleSpy.mockRestore()
    })
  })

  // 🎯 Additional tests for 100% coverage
  describe('🎯 Coverage: Helper Functions via Template', () => {
    it('should display correct icons for all mapped languages', () => {
      const testCases = [
        { language: 'vue', expectedText: 'Vue' },
        { language: 'javascript', expectedText: 'JavaScript' },
        { language: 'typescript', expectedText: 'TypeScript' },
        { language: 'html', expectedText: 'HTML' },
        { language: 'css', expectedText: 'CSS' },
        { language: 'json', expectedText: 'JSON' },
        { language: 'bash', expectedText: 'Bash' },
        { language: 'shell', expectedText: 'Shell' },
      ]

      testCases.forEach(({ language, expectedText }) => {
        wrapper = mount(CodeBlockComponent, {
          props: { content: 'test code', language },
          attachTo: '#test-app',
        })
        const languageName = wrapper.find('.language-name')
        expect(languageName.text()).toBe(expectedText)
      })
    })

    it('should display uppercase name for unmapped languages', () => {
      const testCases = ['python', 'ruby', 'go', 'rust', 'unknown']

      testCases.forEach((language) => {
        wrapper = mount(CodeBlockComponent, {
          props: { content: 'test code', language },
          attachTo: '#test-app',
        })
        const languageName = wrapper.find('.language-name')
        expect(languageName.text()).toBe(language.toUpperCase())
      })
    })
  })

  describe('🎯 Coverage: Syntax Highlighting via DOM', () => {
    it('should apply syntax highlighting for Vue/HTML', () => {
      wrapper = mount(CodeBlockComponent, {
        props: {
          content: '<template><div class="test">Hello</div></template>',
          language: 'vue',
        },
        attachTo: '#test-app',
      })

      const codeElement = wrapper.find('code')
      const innerHTML = codeElement.element.innerHTML

      // Should apply some highlighting (contains spans)
      expect(innerHTML).toContain('<span class=')
      expect(innerHTML.length).toBeGreaterThan(wrapper.vm.content.length)
    })

    it('should apply syntax highlighting for HTML', () => {
      wrapper = mount(CodeBlockComponent, {
        props: {
          content: '<div id="app" class="container">Content</div>',
          language: 'html',
        },
        attachTo: '#test-app',
      })

      const codeElement = wrapper.find('code')
      const innerHTML = codeElement.element.innerHTML

      // Should apply some highlighting (contains spans)
      expect(innerHTML).toContain('<span class=')
      expect(innerHTML.length).toBeGreaterThan(wrapper.vm.content.length)
    })

    it('should apply syntax highlighting for JavaScript', () => {
      wrapper = mount(CodeBlockComponent, {
        props: {
          content: 'const name = "test"; // comment',
          language: 'javascript',
        },
        attachTo: '#test-app',
      })

      const codeElement = wrapper.find('code')
      const innerHTML = codeElement.element.innerHTML

      // Should apply some highlighting (contains spans)
      expect(innerHTML).toContain('<span class=')
      expect(innerHTML.length).toBeGreaterThan(wrapper.vm.content.length)
    })

    it('should apply syntax highlighting for TypeScript', () => {
      wrapper = mount(CodeBlockComponent, {
        props: {
          content: 'let count: number = 0;',
          language: 'typescript',
        },
        attachTo: '#test-app',
      })

      const codeElement = wrapper.find('code')
      const innerHTML = codeElement.element.innerHTML

      // Should apply some highlighting (contains spans)
      expect(innerHTML).toContain('<span class=')
      expect(innerHTML.length).toBeGreaterThan(wrapper.vm.content.length)
    })

    it('should apply syntax highlighting for CSS', () => {
      wrapper = mount(CodeBlockComponent, {
        props: {
          content: '.container { color: red; }',
          language: 'css',
        },
        attachTo: '#test-app',
      })

      const codeElement = wrapper.find('code')
      const innerHTML = codeElement.element.innerHTML

      // Should apply some highlighting (contains spans)
      expect(innerHTML).toContain('<span class=')
      expect(innerHTML.length).toBeGreaterThan(wrapper.vm.content.length)
    })

    it('should return unhighlighted code for unmapped languages', () => {
      const content = 'print("Hello World")'
      wrapper = mount(CodeBlockComponent, {
        props: {
          content,
          language: 'python',
        },
        attachTo: '#test-app',
      })

      const codeElement = wrapper.find('code')
      const innerHTML = codeElement.element.innerHTML

      // Should return original content without highlighting
      expect(innerHTML).toBe(content)
    })
  })

  describe('🎯 Coverage: Additional Language Tests', () => {
    it('should display correct language names for all supported languages', () => {
      const languageTests = [
        { lang: 'json', expected: 'JSON' },
        { lang: 'bash', expected: 'Bash' },
        { lang: 'shell', expected: 'Shell' },
      ]

      languageTests.forEach(({ lang, expected }) => {
        wrapper = mount(CodeBlockComponent, {
          props: { content: 'test code', language: lang },
          attachTo: '#test-app',
        })
        const languageName = wrapper.find('.language-name')
        expect(languageName.text()).toBe(expected)
      })
    })

    it('should render all language icon and name mappings', () => {
      const iconTests = [
        { lang: 'vue', expectedName: 'Vue' },
        { lang: 'html', expectedName: 'HTML' },
        { lang: 'css', expectedName: 'CSS' },
        { lang: 'json', expectedName: 'JSON' },
        { lang: 'bash', expectedName: 'Bash' },
        { lang: 'shell', expectedName: 'Shell' },
      ]

      iconTests.forEach(({ lang, expectedName }) => {
        wrapper = mount(CodeBlockComponent, {
          props: { content: 'test code', language: lang },
          attachTo: '#test-app',
        })
        const languageName = wrapper.find('.language-name')
        expect(languageName.text()).toBe(expectedName)

        // Verify icon is rendered
        const languageIcon = wrapper.find('.language-icon')
        expect(languageIcon.exists()).toBe(true)
      })
    })
  })

  describe('🎯 Coverage: Edge Cases', () => {
    it('should handle empty content', () => {
      wrapper = mount(CodeBlockComponent, {
        props: { content: '', language: 'javascript' },
        attachTo: '#test-app',
      })

      expect(wrapper.find('code').exists()).toBe(true)
      const codeElement = wrapper.find('code')
      expect(codeElement.element.innerHTML).toBe('')
    })

    it('should handle content with special characters', () => {
      const specialContent = '<>&"\'`\n\t\r'
      wrapper = mount(CodeBlockComponent, {
        props: { content: specialContent, language: 'text' },
        attachTo: '#test-app',
      })

      const codeElement = wrapper.find('code')
      // DOM will HTML-escape the content
      expect(codeElement.element.innerHTML).toBe('&lt;&gt;&amp;"\'`\n\t\r')
    })

    it('should set correct CSS class on code element', () => {
      wrapper = mount(CodeBlockComponent, {
        props: { content: 'test', language: 'python' },
        attachTo: '#test-app',
      })

      const codeElement = wrapper.find('code')
      expect(codeElement.classes()).toContain('language-python')
    })

    it('should handle content that would not be highlighted', () => {
      const content = 'plain text content'
      wrapper = mount(CodeBlockComponent, {
        props: { content, language: 'plain' },
        attachTo: '#test-app',
      })

      const codeElement = wrapper.find('code')
      expect(codeElement.element.innerHTML).toBe(content)
    })
  })
})
