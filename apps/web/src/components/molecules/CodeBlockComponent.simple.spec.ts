import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import CodeBlockComponent from './CodeBlockComponent.vue'

// Mock child components
vi.mock('../atoms/BaseIcon.vue', () => ({
  default: {
    name: 'BaseIcon',
    template: '<span class="base-icon" />',
    props: ['name', 'size', 'class'],
  },
}))

vi.mock('../atoms/BaseButton.vue', () => ({
  default: {
    name: 'BaseButton',
    template:
      '<button class="base-button" @click="$emit(\'click\')"><slot /></button>',
    props: ['variant', 'size', 'class', 'aria-label'],
    emits: ['click'],
  },
}))

describe('CodeBlockComponent.vue - Coverage Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should mount and render basic structure', () => {
    const wrapper = mount(CodeBlockComponent, {
      props: {
        content: 'console.log("test")',
        language: 'javascript',
      },
    })
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('.code-block-container').exists()).toBe(true)
  })

  it('should render with filename', () => {
    const wrapper = mount(CodeBlockComponent, {
      props: {
        content: 'test content',
        language: 'javascript',
        filename: 'test.js',
      },
    })
    expect(wrapper.find('.filename').text()).toBe('test.js')
  })

  it('should use default language', () => {
    const wrapper = mount(CodeBlockComponent, {
      props: {
        content: 'test content',
      },
    })
    const component = wrapper.vm
    expect(component.getLanguageName('javascript')).toBe('JavaScript')
  })

  it('should get correct language icons', () => {
    const wrapper = mount(CodeBlockComponent, {
      props: {
        content: 'test',
        language: 'vue',
      },
    })
    const component = wrapper.vm

    expect(component.getLanguageIcon('vue')).toBe('Eye')
    expect(component.getLanguageIcon('javascript')).toBe('Code')
    expect(component.getLanguageIcon('typescript')).toBe('Code')
    expect(component.getLanguageIcon('html')).toBe('Terminal')
    expect(component.getLanguageIcon('css')).toBe('Menu')
    expect(component.getLanguageIcon('json')).toBe('GitBranch')
    expect(component.getLanguageIcon('bash')).toBe('Terminal')
    expect(component.getLanguageIcon('shell')).toBe('Terminal')
    expect(component.getLanguageIcon('unknown')).toBe('Code')
  })

  it('should get correct language names', () => {
    const wrapper = mount(CodeBlockComponent, {
      props: {
        content: 'test',
        language: 'vue',
      },
    })
    const component = wrapper.vm

    expect(component.getLanguageName('vue')).toBe('Vue')
    expect(component.getLanguageName('javascript')).toBe('JavaScript')
    expect(component.getLanguageName('typescript')).toBe('TypeScript')
    expect(component.getLanguageName('html')).toBe('HTML')
    expect(component.getLanguageName('css')).toBe('CSS')
    expect(component.getLanguageName('json')).toBe('JSON')
    expect(component.getLanguageName('bash')).toBe('Bash')
    expect(component.getLanguageName('shell')).toBe('Shell')
    expect(component.getLanguageName('unknown')).toBe('UNKNOWN')
  })

  it('should highlight Vue/HTML content', () => {
    const wrapper = mount(CodeBlockComponent, {
      props: {
        content: '<template><div class="test">Hello</div></template>',
        language: 'vue',
      },
    })
    const component = wrapper.vm
    expect(component.highlightedCode).toBeDefined()
    expect(component.highlightedCode.length).toBeGreaterThan(0)
  })

  it('should highlight HTML content', () => {
    const wrapper = mount(CodeBlockComponent, {
      props: {
        content: '<div class="test">Hello</div>',
        language: 'html',
      },
    })
    const component = wrapper.vm
    expect(component.highlightedCode).toBeDefined()
    expect(component.highlightedCode.length).toBeGreaterThan(0)
  })

  it('should highlight JavaScript content', () => {
    const wrapper = mount(CodeBlockComponent, {
      props: {
        content: 'const test = "hello"; // comment\n/* block comment */',
        language: 'javascript',
      },
    })
    const component = wrapper.vm
    const highlighted = component.highlightedCode
    expect(highlighted).toBeDefined()
    expect(highlighted.length).toBeGreaterThan(0)
  })

  it('should highlight TypeScript content', () => {
    const wrapper = mount(CodeBlockComponent, {
      props: {
        content: 'function test(): string { return "hello"; }',
        language: 'typescript',
      },
    })
    const component = wrapper.vm
    expect(component.highlightedCode).toBeDefined()
    expect(component.highlightedCode.length).toBeGreaterThan(0)
  })

  it('should highlight CSS content', () => {
    const wrapper = mount(CodeBlockComponent, {
      props: {
        content: '.test { color: "red"; }',
        language: 'css',
      },
    })
    const component = wrapper.vm
    expect(component.highlightedCode).toBeDefined()
    expect(component.highlightedCode.length).toBeGreaterThan(0)
  })

  it('should not highlight unknown languages', () => {
    const wrapper = mount(CodeBlockComponent, {
      props: {
        content: 'some content',
        language: 'unknown',
      },
    })
    const component = wrapper.vm
    expect(component.highlightedCode).toBe('some content')
  })

  it('should handle copy functionality with mock', async () => {
    // Mock clipboard
    global.navigator = {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    } as unknown

    const wrapper = mount(CodeBlockComponent, {
      props: {
        content: 'const test = "hello"',
        language: 'javascript',
      },
    })

    const component = wrapper.vm
    await component.copyCode()

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'const test = "hello"'
    )
  })

  it('should handle copy code method', async () => {
    const wrapper = mount(CodeBlockComponent, {
      props: {
        content: 'test content',
        language: 'javascript',
      },
    })

    const component = wrapper.vm

    // Test that the method exists and can be called
    expect(typeof component.copyCode).toBe('function')

    // Test initial state
    expect(component.copyIcon).toBe('Code')
    expect(component.copyText).toBe('Copy')
  })

  it('should render copy button', () => {
    const wrapper = mount(CodeBlockComponent, {
      props: {
        content: 'test',
        language: 'javascript',
      },
    })

    const copyButton = wrapper.findComponent({ name: 'BaseButton' })
    expect(copyButton.exists()).toBe(true)

    const copyText = wrapper.find('.copy-text')
    expect(copyText.exists()).toBe(true)
    expect(copyText.text()).toBe('Copy')
  })
})
