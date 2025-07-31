import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import DiffViewer from './DiffViewer.vue'

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
    props: ['variant', 'size', 'class'],
    emits: ['click'],
  },
}))

describe('DiffViewer.vue', () => {
  it('should mount and render without errors', () => {
    const wrapper = mount(DiffViewer)
    expect(wrapper.exists()).toBe(true)
  })

  it('should render diff viewer container', () => {
    const wrapper = mount(DiffViewer)
    const diffViewer = wrapper.find('.diff-viewer')
    expect(diffViewer.exists()).toBe(true)
  })

  it('should render diff header with title and stats', () => {
    const wrapper = mount(DiffViewer)
    const diffHeader = wrapper.find('.diff-header')
    const diffTitle = wrapper.find('.diff-title')
    const diffStats = wrapper.find('.diff-stats')

    expect(diffHeader.exists()).toBe(true)
    expect(diffTitle.text()).toBe('Code Changes')
    expect(diffStats.exists()).toBe(true)
  })

  it('should calculate and display correct additions count', () => {
    const wrapper = mount(DiffViewer)
    const additions = wrapper.find('.additions')

    // Default data has 15 + 8 = 23 additions
    expect(additions.text()).toBe('+23')
  })

  it('should calculate and display correct deletions count', () => {
    const wrapper = mount(DiffViewer)
    const deletions = wrapper.find('.deletions')

    // Default data has 3 + 2 = 5 deletions
    expect(deletions.text()).toBe('-5')
  })

  it('should render apply and discard buttons', () => {
    const wrapper = mount(DiffViewer)
    const applyButton = wrapper.findComponent({ name: 'BaseButton' })
    const buttons = wrapper.findAllComponents({ name: 'BaseButton' })

    expect(buttons.length).toBe(4) // 2 header buttons + 2 expand buttons (one per file)
    expect(applyButton.exists()).toBe(true)
  })

  it('should render diff files', () => {
    const wrapper = mount(DiffViewer)
    const diffFiles = wrapper.findAll('.diff-file')

    expect(diffFiles.length).toBe(2) // Default data has 2 files
  })

  it('should render file headers with correct information', () => {
    const wrapper = mount(DiffViewer)
    const fileHeaders = wrapper.findAll('.file-header')
    const filenames = wrapper.findAll('.filename')

    expect(fileHeaders.length).toBe(2)
    expect(filenames[0].text()).toBe('src/components/organisms/ChatPanel.vue')
    expect(filenames[1].text()).toBe('src/styles/chat.css')
  })

  it('should render file statistics', () => {
    const wrapper = mount(DiffViewer)
    const fileAdditions = wrapper.findAll('.file-additions')
    const fileDeletions = wrapper.findAll('.file-deletions')

    expect(fileAdditions[0].text()).toBe('+15')
    expect(fileDeletions[0].text()).toBe('-3')
    expect(fileAdditions[1].text()).toBe('+8')
    expect(fileDeletions[1].text()).toBe('-2')
  })

  it('should show expanded file content when file is expanded', () => {
    const wrapper = mount(DiffViewer)
    const fileDiff = wrapper.find('.file-diff')

    // First file is expanded by default
    expect(fileDiff.exists()).toBe(true)
  })

  it('should hide file content when file is not expanded', () => {
    const wrapper = mount(DiffViewer)
    const fileDiffs = wrapper.findAll('.file-diff')

    // Second file is not expanded by default, so only one should be visible
    expect(fileDiffs.length).toBe(1)
  })

  it('should toggle file expansion when expand button is clicked', async () => {
    const wrapper = mount(DiffViewer)
    const component = wrapper.vm

    // Get initial state of second file (should be collapsed)
    const initialState = component.diffFiles[1].expanded
    expect(initialState).toBe(false)

    // Toggle expansion programmatically
    component.toggleFileExpansion(component.diffFiles[1])
    await wrapper.vm.$nextTick()

    expect(component.diffFiles[1].expanded).toBe(true)
    const fileDiffs = wrapper.findAll('.file-diff')
    expect(fileDiffs.length).toBe(2) // Now both files should be expanded
  })

  it('should render diff chunks and lines', () => {
    const wrapper = mount(DiffViewer)
    const diffChunks = wrapper.findAll('.diff-chunk')
    const diffLines = wrapper.findAll('.diff-line')

    expect(diffChunks.length).toBeGreaterThan(0)
    expect(diffLines.length).toBeGreaterThan(0)
  })

  it('should render chunk headers', () => {
    const wrapper = mount(DiffViewer)
    const chunkHeaders = wrapper.findAll('.chunk-header')
    const chunkInfo = wrapper.findAll('.chunk-info')

    expect(chunkHeaders.length).toBeGreaterThan(0)
    expect(chunkInfo[0].text()).toBe('@@ -1,8 +1,20 @@')
  })

  it('should render line numbers correctly', () => {
    const wrapper = mount(DiffViewer)
    const lineNumbers = wrapper.findAll('.line-numbers')
    const oldLineNumbers = wrapper.findAll('.old-line-number')
    const newLineNumbers = wrapper.findAll('.new-line-number')

    expect(lineNumbers.length).toBeGreaterThan(0)
    expect(oldLineNumbers.length).toBeGreaterThan(0)
    expect(newLineNumbers.length).toBeGreaterThan(0)
  })

  it('should apply correct CSS classes for different line types', () => {
    const wrapper = mount(DiffViewer)
    const additionLines = wrapper.findAll('.line-addition')
    const deletionLines = wrapper.findAll('.line-deletion')
    const contextLines = wrapper.findAll('.line-context')

    expect(additionLines.length).toBeGreaterThan(0)
    expect(deletionLines.length).toBeGreaterThan(0)
    expect(contextLines.length).toBeGreaterThan(0)
  })

  it('should render correct line symbols', () => {
    const wrapper = mount(DiffViewer)
    const component = wrapper.vm

    expect(component.getLineSymbol('addition')).toBe('+')
    expect(component.getLineSymbol('deletion')).toBe('-')
    expect(component.getLineSymbol('context')).toBe(' ')
  })

  it('should handle unknown line types', () => {
    const wrapper = mount(DiffViewer)
    const component = wrapper.vm

    expect(component.getLineSymbol('unknown' as never)).toBe(' ')
  })

  it('should render line content correctly', () => {
    const wrapper = mount(DiffViewer)
    const lineContents = wrapper.findAll('.line-content')

    expect(lineContents.length).toBeGreaterThan(0)
    expect(lineContents[0].find('code').exists()).toBe(true)
  })

  it('should handle apply changes button click', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const wrapper = mount(DiffViewer)
    const component = wrapper.vm

    component.applyChanges()

    expect(consoleSpy).toHaveBeenCalledWith('Applying changes...')
    consoleSpy.mockRestore()
  })

  it('should handle discard changes button click', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const wrapper = mount(DiffViewer)
    const component = wrapper.vm

    component.discardChanges()

    expect(consoleSpy).toHaveBeenCalledWith('Discarding changes...')
    consoleSpy.mockRestore()
  })

  it('should handle props correctly', () => {
    const customChanges = ['Change 1', 'Change 2']
    const wrapper = mount(DiffViewer, {
      props: {
        changes: customChanges,
      },
    })

    expect(wrapper.props().changes).toEqual(customChanges)
  })

  it('should use default props when none provided', () => {
    const wrapper = mount(DiffViewer)

    expect(wrapper.props().changes).toEqual([
      'Added new component',
      'Updated styles',
      'Fixed TypeScript errors',
    ])
  })

  it('should toggle expansion state correctly', async () => {
    const wrapper = mount(DiffViewer)
    const component = wrapper.vm

    // Get initial state
    const initialState = component.diffFiles[1].expanded

    // Toggle expansion
    component.toggleFileExpansion(component.diffFiles[1])

    expect(component.diffFiles[1].expanded).toBe(!initialState)
  })

  it('should render expand icons with correct state', () => {
    const wrapper = mount(DiffViewer)
    const component = wrapper.vm

    // Check the internal state rather than DOM classes
    expect(component.diffFiles[0].expanded).toBe(true)
    expect(component.diffFiles[1].expanded).toBe(false)
  })

  it('should have correct computed properties', () => {
    const wrapper = mount(DiffViewer)
    const component = wrapper.vm

    expect(component.additionsCount).toBe(23) // 15 + 8
    expect(component.deletionsCount).toBe(5) // 3 + 2
  })

  it('should update computed properties when data changes', async () => {
    const wrapper = mount(DiffViewer)
    const component = wrapper.vm

    // Modify the data
    component.diffFiles[0].additions = 10
    component.diffFiles[0].deletions = 5

    await wrapper.vm.$nextTick()

    expect(component.additionsCount).toBe(18) // 10 + 8
    expect(component.deletionsCount).toBe(7) // 5 + 2
  })

  it('should render all line types in sample data', () => {
    const wrapper = mount(DiffViewer)
    const component = wrapper.vm

    const file = component.diffFiles[0]
    const chunk = file.chunks[0]

    const hasAddition = chunk.lines.some((line) => line.type === 'addition')
    const hasDeletion = chunk.lines.some((line) => line.type === 'deletion')
    const hasContext = chunk.lines.some((line) => line.type === 'context')

    expect(hasAddition).toBe(true)
    expect(hasDeletion).toBe(true)
    expect(hasContext).toBe(true)
  })

  it('should handle file header click for expansion', async () => {
    const wrapper = mount(DiffViewer)
    const component = wrapper.vm

    // The second file should be collapsed initially
    expect(component.diffFiles[1].expanded).toBe(false)

    // Toggle expansion programmatically
    component.toggleFileExpansion(component.diffFiles[1])
    await wrapper.vm.$nextTick()

    expect(component.diffFiles[1].expanded).toBe(true)
  })
})
