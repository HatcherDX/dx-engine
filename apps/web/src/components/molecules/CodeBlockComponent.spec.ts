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
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.clearAllTimers()
  })

  describe('Component Initialization', () => {
    it('should mount and render without errors', () => {
      wrapper = mount(CodeBlockComponent, { props: defaultProps })
      expect(wrapper.exists()).toBe(true)
    })

    it('should render basic structure', () => {
      wrapper = mount(CodeBlockComponent, { props: defaultProps })

      expect(wrapper.find('.code-block-container').exists()).toBe(true)
      expect(wrapper.find('.code-header').exists()).toBe(true)
      expect(wrapper.find('.code-content').exists()).toBe(true)
    })

    it('should display the code content', () => {
      wrapper = mount(CodeBlockComponent, { props: defaultProps })
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
      wrapper = mount(CodeBlockComponent, { props: defaultProps })
      const filename = wrapper.find('.filename')
      expect(filename.exists()).toBe(false)
    })

    it('should not display filename when empty string', () => {
      wrapper = mount(CodeBlockComponent, {
        props: { content: 'test code', filename: '' },
      })
      const filename = wrapper.find('.filename')
      expect(filename.exists()).toBe(false)
    })
  })

  describe('Copy Functionality', () => {
    it('should display initial copy button state', () => {
      wrapper = mount(CodeBlockComponent, { props: defaultProps })
      const copyText = wrapper.find('.copy-text')
      expect(copyText.text()).toBe('Copy')
    })

    it('should copy code to clipboard when copy button is clicked', async () => {
      wrapper = mount(CodeBlockComponent, { props: defaultProps })
      const copyButton = wrapper.find('[data-testid="base-button"]')

      await copyButton.trigger('click')

      expect(global.navigator.clipboard.writeText).toHaveBeenCalledWith(
        defaultProps.content
      )
    })

    it('should show success state after successful copy', async () => {
      vi.useFakeTimers()
      wrapper = mount(CodeBlockComponent, { props: defaultProps })
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
      wrapper = mount(CodeBlockComponent, { props: { content: testContent } })
      expect(wrapper.vm.content).toBe(testContent)
    })

    it('should use default language when not provided', () => {
      wrapper = mount(CodeBlockComponent, { props: { content: 'test' } })
      const languageName = wrapper.find('.language-name')
      expect(languageName.text()).toBe('JavaScript')
    })

    it('should handle filename prop', () => {
      const testFilename = 'test.js'
      wrapper = mount(CodeBlockComponent, {
        props: { content: 'test code', filename: testFilename },
      })
      expect(wrapper.vm.filename).toBe(testFilename)
    })
  })

  describe('Accessibility', () => {
    it('should have aria-label on copy button', () => {
      wrapper = mount(CodeBlockComponent, { props: defaultProps })
      const copyButton = wrapper.findComponent({ name: 'BaseButton' })
      expect(copyButton.exists()).toBe(true)
    })

    it('should render semantic HTML structure', () => {
      wrapper = mount(CodeBlockComponent, { props: defaultProps })

      expect(wrapper.find('pre').exists()).toBe(true)
      expect(wrapper.find('code').exists()).toBe(true)
    })
  })

  describe('Component Functions', () => {
    it('should have getLanguageName function work correctly', () => {
      wrapper = mount(CodeBlockComponent, { props: defaultProps })

      // Test by checking different language props
      expect(wrapper.find('.language-name').text()).toBe('JavaScript')
    })

    it('should handle language changes', async () => {
      wrapper = mount(CodeBlockComponent, { props: defaultProps })

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

      wrapper = mount(CodeBlockComponent, { props: defaultProps })
      const copyButton = wrapper.find('[data-testid="base-button"]')

      await copyButton.trigger('click')
      await nextTick()

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to copy code:',
        expect.any(Error)
      )
      consoleSpy.mockRestore()
    })
  })
})
