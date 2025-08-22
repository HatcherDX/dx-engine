import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import CodeBlockComponent from './CodeBlockComponent.vue'

// Mock child components
vi.mock('../atoms/BaseIcon.vue', () => ({
  default: {
    name: 'BaseIcon',
    props: ['name', 'size', 'color'],
    template: '<span class="base-icon" :data-name="name"></span>',
  },
}))

vi.mock('../atoms/BaseButton.vue', () => ({
  default: {
    name: 'BaseButton',
    template:
      '<button class="base-button" @click="$emit(\'click\')"><slot /></button>',
  },
}))

describe('CodeBlockComponent.vue - Coverage Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should mount and render basic structure', () => {
    const wrapper = mount(CodeBlockComponent, {
      props: {
        content: 'const test = "hello"',
        language: 'javascript',
      },
    })
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('.code-block-container').exists()).toBe(true)
  })

  it('should render with filename', () => {
    const wrapper = mount(CodeBlockComponent, {
      props: {
        content: 'const test = "hello"',
        filename: 'test.js',
      },
    })
    expect(wrapper.find('.filename').text()).toBe('test.js')
  })

  it('should use default language', () => {
    const wrapper = mount(CodeBlockComponent, {
      props: {
        content: 'const test = "hello"',
      },
    })

    // Test that the default language 'javascript' results in 'JavaScript' name being displayed
    expect(wrapper.find('.language-name').text()).toBe('JavaScript')
    expect(wrapper.find('code').classes()).toContain('language-javascript')
  })

  it('should display correct language icon for vue', () => {
    const wrapper = mount(CodeBlockComponent, {
      props: {
        content: '<template><div>{{ message }}</div></template>',
        language: 'vue',
      },
    })

    // Test that vue language displays the Eye icon
    const icon = wrapper.findComponent({ name: 'BaseIcon' })
    expect(icon.props('name')).toBe('Eye')
  })

  it('should display correct language name for Vue', () => {
    const wrapper = mount(CodeBlockComponent, {
      props: {
        content: '<template><div>{{ message }}</div></template>',
        language: 'vue',
      },
    })

    // Test that Vue language displays the correct name
    expect(wrapper.find('.language-name').text()).toBe('Vue')
  })

  it('should highlight Vue/HTML content', () => {
    const wrapper = mount(CodeBlockComponent, {
      props: {
        content: '<template><div>Vue content</div></template>',
        language: 'vue',
      },
    })

    // Test that the code element contains the content
    const codeElement = wrapper.find('code')
    expect(codeElement.exists()).toBe(true)
    expect(codeElement.classes()).toContain('language-vue')
  })

  it('should highlight HTML content', () => {
    const wrapper = mount(CodeBlockComponent, {
      props: {
        content: '<div>HTML content</div>',
        language: 'html',
      },
    })

    // Test that the code element exists and has correct class
    const codeElement = wrapper.find('code')
    expect(codeElement.exists()).toBe(true)
    expect(codeElement.classes()).toContain('language-html')
  })

  it('should highlight JavaScript content', () => {
    const wrapper = mount(CodeBlockComponent, {
      props: {
        content: 'const js = "JavaScript"',
        language: 'javascript',
      },
    })

    // Test that the code element exists and has correct class
    const codeElement = wrapper.find('code')
    expect(codeElement.exists()).toBe(true)
    expect(codeElement.classes()).toContain('language-javascript')
  })

  it('should highlight TypeScript content', () => {
    const wrapper = mount(CodeBlockComponent, {
      props: {
        content: 'const ts: string = "TypeScript"',
        language: 'typescript',
      },
    })

    // Test that the code element exists and has correct class
    const codeElement = wrapper.find('code')
    expect(codeElement.exists()).toBe(true)
    expect(codeElement.classes()).toContain('language-typescript')
  })

  it('should highlight CSS content', () => {
    const wrapper = mount(CodeBlockComponent, {
      props: {
        content: '.container { color: red; }',
        language: 'css',
      },
    })

    // Test that the code element exists and has correct class
    const codeElement = wrapper.find('code')
    expect(codeElement.exists()).toBe(true)
    expect(codeElement.classes()).toContain('language-css')
  })

  it('should not highlight unknown languages', () => {
    const wrapper = mount(CodeBlockComponent, {
      props: {
        content: 'unknown code',
        language: 'unknown',
      },
    })

    // Test that the code element exists with unknown language
    const codeElement = wrapper.find('code')
    expect(codeElement.exists()).toBe(true)
    expect(codeElement.classes()).toContain('language-unknown')
  })

  it('should handle copy functionality with mock', async () => {
    // Mock clipboard
    global.navigator = {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    } as unknown as Navigator

    const wrapper = mount(CodeBlockComponent, {
      props: {
        content: 'const test = "hello"',
      },
    })

    // Trigger copy via button click instead of direct method call
    const copyButton = wrapper.findComponent({ name: 'BaseButton' })
    await copyButton.trigger('click')

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'const test = "hello"'
    )
  })

  it('should handle copy code method', async () => {
    const wrapper = mount(CodeBlockComponent, {
      props: {
        content: 'const test = "hello"',
      },
    })

    // Test UI elements instead of internal state
    const copyButton = wrapper.findComponent({ name: 'BaseButton' })
    expect(copyButton.exists()).toBe(true)

    const copyText = wrapper.find('.copy-text')
    expect(copyText.exists()).toBe(true)
    expect(copyText.text()).toBe('Copy')
  })

  it('should render copy button', () => {
    const wrapper = mount(CodeBlockComponent, {
      props: {
        content: 'const test = "hello"',
      },
    })

    const copyButton = wrapper.findComponent({ name: 'BaseButton' })
    expect(copyButton.exists()).toBe(true)

    const copyText = wrapper.find('.copy-text')
    expect(copyText.exists()).toBe(true)
    expect(copyText.text()).toBe('Copy')
  })
})
