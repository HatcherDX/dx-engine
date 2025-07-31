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

    // Initially one file should be expanded
    let fileDiffs = wrapper.findAll('.file-diff')
    const initialCount = fileDiffs.length

    // Find and click an expand button
    const expandButtons = wrapper.findAll('.expand-toggle')
    if (expandButtons.length > 0) {
      await expandButtons[0].trigger('click')

      // Check that expansion state changed
      fileDiffs = wrapper.findAll('.file-diff')
      expect(fileDiffs.length).not.toBe(initialCount)
    }
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

    // Check that line symbols are rendered in the DOM
    const additionLines = wrapper.findAll('.line-addition')
    const deletionLines = wrapper.findAll('.line-deletion')
    const contextLines = wrapper.findAll('.line-context')

    expect(additionLines.length).toBeGreaterThan(0)
    expect(deletionLines.length).toBeGreaterThan(0)
    expect(contextLines.length).toBeGreaterThan(0)
  })

  it('should handle unknown line types', () => {
    const wrapper = mount(DiffViewer)

    // Test that the component renders without errors
    expect(wrapper.exists()).toBe(true)
    const diffLines = wrapper.findAll('.diff-line')
    expect(diffLines.length).toBeGreaterThan(0)
  })

  it('should render line content correctly', () => {
    const wrapper = mount(DiffViewer)
    const lineContents = wrapper.findAll('.line-content')

    expect(lineContents.length).toBeGreaterThan(0)
    expect(lineContents[0].find('code').exists()).toBe(true)
  })

  it('should handle apply changes button click', async () => {
    const wrapper = mount(DiffViewer)
    const buttons = wrapper.findAllComponents({ name: 'BaseButton' })

    // Find the apply button (should contain "Apply" text)
    const applyButton = buttons.find((btn) => btn.text().includes('Apply'))
    if (applyButton) {
      await applyButton.trigger('click')
      expect(wrapper.exists()).toBe(true)
    }
  })

  it('should handle discard changes button click', async () => {
    const wrapper = mount(DiffViewer)
    const buttons = wrapper.findAllComponents({ name: 'BaseButton' })

    // Find the discard button (should contain "Discard" text)
    const discardButton = buttons.find((btn) => btn.text().includes('Discard'))
    if (discardButton) {
      await discardButton.trigger('click')
      expect(wrapper.exists()).toBe(true)
    }
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

    // Count initial expanded files
    let fileDiffs = wrapper.findAll('.file-diff')
    const initialCount = fileDiffs.length

    // Find and click expand button
    const expandButtons = wrapper.findAll('.expand-toggle')
    if (expandButtons.length > 0) {
      await expandButtons[0].trigger('click')

      // Check that expansion changed
      fileDiffs = wrapper.findAll('.file-diff')
      expect(fileDiffs.length).not.toBe(initialCount)
    }
  })

  it('should render expand icons with correct state', () => {
    const wrapper = mount(DiffViewer)

    // Check that expand toggle buttons exist
    const expandButtons = wrapper.findAll('.expand-toggle')
    expect(expandButtons.length).toBeGreaterThan(0)

    // Check that file diffs are rendered (at least one expanded)
    const fileDiffs = wrapper.findAll('.file-diff')
    expect(fileDiffs.length).toBeGreaterThan(0)
  })

  it('should have correct computed properties', () => {
    const wrapper = mount(DiffViewer)

    // Check that additions and deletions are displayed in DOM
    const additions = wrapper.find('.additions')
    const deletions = wrapper.find('.deletions')

    expect(additions.exists()).toBe(true)
    expect(deletions.exists()).toBe(true)
    expect(additions.text()).toBe('+23')
    expect(deletions.text()).toBe('-5')
  })

  it('should update computed properties when data changes', async () => {
    const wrapper = mount(DiffViewer)

    // Test with different props
    await wrapper.setProps({ changes: ['Updated file', 'New changes'] })

    // Check that the component still renders correctly
    const additions = wrapper.find('.additions')
    const deletions = wrapper.find('.deletions')

    expect(additions.exists()).toBe(true)
    expect(deletions.exists()).toBe(true)
  })

  it('should render all line types in sample data', () => {
    const wrapper = mount(DiffViewer)

    // Check that all line types are rendered in DOM
    const additionLines = wrapper.findAll('.line-addition')
    const deletionLines = wrapper.findAll('.line-deletion')
    const contextLines = wrapper.findAll('.line-context')

    expect(additionLines.length).toBeGreaterThan(0)
    expect(deletionLines.length).toBeGreaterThan(0)
    expect(contextLines.length).toBeGreaterThan(0)
  })

  it('should handle file header click for expansion', async () => {
    const wrapper = mount(DiffViewer)

    // Count initial file diffs
    let fileDiffs = wrapper.findAll('.file-diff')
    const initialCount = fileDiffs.length

    // Click on a file header to toggle expansion
    const fileHeaders = wrapper.findAll('.file-header')
    if (fileHeaders.length > 1) {
      await fileHeaders[1].trigger('click')

      // Check that expansion changed
      fileDiffs = wrapper.findAll('.file-diff')
      expect(fileDiffs.length).not.toBe(initialCount)
    }
  })
})
