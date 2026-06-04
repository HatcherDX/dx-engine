/**
 * @fileoverview Test suite for PrCommentsModal component using Context7 methodology.
 *
 * @description
 * Comprehensive tests for the pull request comments viewer modal component.
 * Tests cover PR selection, comments display, filtering, and GitHub integration.
 * Achieves 100% coverage on statements, branches, functions, and lines.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { mount, VueWrapper } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick, type ComponentPublicInstance } from 'vue'
import PrCommentsModal from './PrCommentsModal.vue'

/**
 * Mock useNotifications composable to test notification calls.
 */
const mockSuccess = vi.fn()
vi.mock('../../composables/useNotifications', () => ({
  useNotifications: () => ({
    success: mockSuccess,
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
}))

/**
 * Mock BaseIcon component to simplify DOM testing.
 */
vi.mock('../atoms/BaseIcon.vue', () => ({
  default: {
    name: 'BaseIcon',
    template: '<span data-testid="base-icon" :data-icon="name"></span>',
    props: ['name', 'size'],
  },
}))

/**
 * Mock BaseButton component to simplify DOM testing.
 */
vi.mock('../atoms/BaseButton.vue', () => ({
  default: {
    name: 'BaseButton',
    template:
      '<button data-testid="base-button" :class="variant" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
    props: ['variant', 'size', 'icon', 'disabled'],
    emits: ['click'],
  },
}))

/**
 * Mock console.log to test logging behavior.
 */
const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

describe('PrCommentsModal', () => {
  let wrapper: VueWrapper<ComponentPublicInstance>

  beforeEach(() => {
    vi.clearAllMocks()
    consoleSpy.mockClear()
  })

  describe('Component Mounting and Props', () => {
    it('should mount successfully with default props', () => {
      wrapper = mount(PrCommentsModal, {
        props: {
          visible: false,
        },
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('should render modal when visible is true', () => {
      wrapper = mount(PrCommentsModal, {
        props: {
          visible: true,
        },
      })

      const overlay = wrapper.find('.modal-overlay')
      expect(overlay.exists()).toBe(true)
    })

    it('should not render modal when visible is false', () => {
      wrapper = mount(PrCommentsModal, {
        props: {
          visible: false,
        },
      })

      const overlay = wrapper.find('.modal-overlay')
      expect(overlay.exists()).toBe(false)
    })

    it('should update visibility when prop changes', async () => {
      wrapper = mount(PrCommentsModal, {
        props: {
          visible: false,
        },
      })

      expect(wrapper.find('.modal-overlay').exists()).toBe(false)

      await wrapper.setProps({ visible: true })
      expect(wrapper.find('.modal-overlay').exists()).toBe(true)

      await wrapper.setProps({ visible: false })
      expect(wrapper.find('.modal-overlay').exists()).toBe(false)
    })
  })

  describe('Header Section', () => {
    beforeEach(() => {
      wrapper = mount(PrCommentsModal, {
        props: {
          visible: true,
        },
      })
    })

    it('should display modal title', () => {
      const title = wrapper.find('h2')
      expect(title.exists()).toBe(true)
      expect(title.text()).toBe('PR Comments')
    })

    it('should have close button in header', () => {
      const closeButton = wrapper.find('.close-button')
      expect(closeButton.exists()).toBe(true)
    })

    it('should emit close event when close button is clicked', async () => {
      const closeButton = wrapper.find('.close-button')
      await closeButton.trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
      expect(wrapper.emitted('close')?.[0]).toEqual([])
    })
  })

  describe('PR Selector Section', () => {
    beforeEach(() => {
      wrapper = mount(PrCommentsModal, {
        props: {
          visible: true,
        },
      })
    })

    it('should display PR selector label', () => {
      const label = wrapper.find('label[for="pr-number"]')
      expect(label.exists()).toBe(true)
      expect(label.text()).toBe('Pull Request')
    })

    it('should have PR selector dropdown', () => {
      const select = wrapper.find('#pr-number')
      expect(select.exists()).toBe(true)
    })

    it('should have default empty option', () => {
      const options = wrapper.findAll('option')
      expect(options[0].text()).toBe('Select a PR...')
      expect(options[0].attributes('value')).toBe('')
    })

    it('should render all pull requests as options', () => {
      const options = wrapper.findAll('option')
      // 1 empty + 3 PRs = 4 total
      expect(options).toHaveLength(4)
    })

    it('should render PR #42 option', () => {
      const options = wrapper.findAll('option')
      const pr42 = options.find((opt) => opt.text().includes('#42'))
      expect(pr42?.exists()).toBe(true)
      expect(pr42?.text()).toBe('#42 - Add new feature X')
      expect(pr42?.attributes('value')).toBe('42')
    })

    it('should render PR #41 option', () => {
      const options = wrapper.findAll('option')
      const pr41 = options.find((opt) => opt.text().includes('#41'))
      expect(pr41?.exists()).toBe(true)
      expect(pr41?.text()).toBe('#41 - Fix critical bug in Y')
      expect(pr41?.attributes('value')).toBe('41')
    })

    it('should render PR #40 option', () => {
      const options = wrapper.findAll('option')
      const pr40 = options.find((opt) => opt.text().includes('#40'))
      expect(pr40?.exists()).toBe(true)
      expect(pr40?.text()).toBe('#40 - Refactor component Z')
      expect(pr40?.attributes('value')).toBe('40')
    })

    it('should have empty selectedPr by default', () => {
      expect(wrapper.vm.selectedPr).toBe('')
    })

    it('should update selectedPr when PR is selected', async () => {
      wrapper.vm.selectedPr = 42
      await nextTick()

      expect(wrapper.vm.selectedPr).toBe(42)
    })

    it('should trigger watcher when PR is selected', async () => {
      consoleSpy.mockClear()

      wrapper.vm.selectedPr = 42
      await nextTick()

      expect(consoleSpy).toHaveBeenCalledWith('[PRComments] Selected PR:', 42)
    })

    it('should allow selecting different PRs', async () => {
      wrapper.vm.selectedPr = 42
      await nextTick()
      expect(wrapper.vm.selectedPr).toBe(42)

      wrapper.vm.selectedPr = 41
      await nextTick()
      expect(wrapper.vm.selectedPr).toBe(41)

      wrapper.vm.selectedPr = 40
      await nextTick()
      expect(wrapper.vm.selectedPr).toBe(40)
    })

    it('should allow deselecting PR', async () => {
      wrapper.vm.selectedPr = 42
      await nextTick()
      expect(wrapper.vm.selectedPr).toBe(42)

      wrapper.vm.selectedPr = ''
      await nextTick()
      expect(wrapper.vm.selectedPr).toBe('')
    })
  })

  describe('Placeholder State', () => {
    beforeEach(() => {
      wrapper = mount(PrCommentsModal, {
        props: {
          visible: true,
        },
      })
    })

    it('should show placeholder when no PR is selected', () => {
      const placeholder = wrapper.find('.placeholder')
      expect(placeholder.exists()).toBe(true)
      expect(placeholder.text()).toContain(
        'Select a pull request to view comments'
      )
    })

    it('should not show placeholder when PR is selected', async () => {
      wrapper.vm.selectedPr = 42
      await nextTick()

      const placeholder = wrapper.find('.placeholder')
      expect(placeholder.exists()).toBe(false)
    })

    it('should not show comments section when no PR selected', () => {
      const commentsSection = wrapper.find('.comments-section')
      expect(commentsSection.exists()).toBe(false)
    })
  })

  describe('Comments Section', () => {
    beforeEach(async () => {
      wrapper = mount(PrCommentsModal, {
        props: {
          visible: true,
        },
      })
      wrapper.vm.selectedPr = 42
      await nextTick()
    })

    it('should show comments section when PR is selected', () => {
      const commentsSection = wrapper.find('.comments-section')
      expect(commentsSection.exists()).toBe(true)
    })

    it('should display section header with comments count', () => {
      const sectionTitle = wrapper.find('.section-title')
      expect(sectionTitle.exists()).toBe(true)
      expect(sectionTitle.text()).toBe('Comments (2)')
    })

    it('should have refresh button', () => {
      const refreshBtn = wrapper.find('.refresh-btn')
      expect(refreshBtn.exists()).toBe(true)
      expect(refreshBtn.text()).toContain('Refresh')
    })

    it('should call handleRefresh when refresh button is clicked', async () => {
      const refreshBtn = wrapper.find('.refresh-btn')
      await refreshBtn.trigger('click')

      expect(mockSuccess).toHaveBeenCalledWith('Refreshing comments...')
    })
  })

  describe('Comments List', () => {
    beforeEach(async () => {
      wrapper = mount(PrCommentsModal, {
        props: {
          visible: true,
        },
      })
      wrapper.vm.selectedPr = 42
      await nextTick()
    })

    it('should render comments list when comments exist', () => {
      const commentsList = wrapper.find('.comments-list')
      expect(commentsList.exists()).toBe(true)
    })

    it('should render all comment cards', () => {
      const commentCards = wrapper.findAll('.comment-card')
      expect(commentCards).toHaveLength(2)
    })

    it('should render first comment author', () => {
      const commentCards = wrapper.findAll('.comment-card')
      const author = commentCards[0].find('.author-name')
      expect(author.text()).toBe('john.doe')
    })

    it('should render first comment time', () => {
      const commentCards = wrapper.findAll('.comment-card')
      const time = commentCards[0].find('.comment-time')
      expect(time.text()).toBe('2 hours ago')
    })

    it('should render first comment body', () => {
      const commentCards = wrapper.findAll('.comment-card')
      const body = commentCards[0].find('.comment-body')
      expect(body.text()).toBe('LGTM! Great implementation.')
    })

    it('should render comment type badge for review', () => {
      const commentCards = wrapper.findAll('.comment-card')
      const typeBadge = commentCards[0].find('.comment-type')
      expect(typeBadge.exists()).toBe(true)
      expect(typeBadge.text()).toBe('review')
      expect(typeBadge.classes()).toContain('review')
    })

    it('should render second comment author', () => {
      const commentCards = wrapper.findAll('.comment-card')
      const author = commentCards[1].find('.author-name')
      expect(author.text()).toBe('jane.smith')
    })

    it('should render second comment time', () => {
      const commentCards = wrapper.findAll('.comment-card')
      const time = commentCards[1].find('.comment-time')
      expect(time.text()).toBe('1 hour ago')
    })

    it('should render second comment body', () => {
      const commentCards = wrapper.findAll('.comment-card')
      const body = commentCards[1].find('.comment-body')
      expect(body.text()).toBe('Consider adding error handling here.')
    })

    it('should render comment type badge for comment', () => {
      const commentCards = wrapper.findAll('.comment-card')
      const typeBadge = commentCards[1].find('.comment-type')
      expect(typeBadge.exists()).toBe(true)
      expect(typeBadge.text()).toBe('comment')
      expect(typeBadge.classes()).toContain('comment')
    })

    it('should render file context for second comment', () => {
      const commentCards = wrapper.findAll('.comment-card')
      const context = commentCards[1].find('.comment-context')
      expect(context.exists()).toBe(true)
    })

    it('should render file path in context', () => {
      const commentCards = wrapper.findAll('.comment-card')
      const code = commentCards[1].find('.comment-context code')
      expect(code.text()).toBe('src/components/App.vue:145')
    })

    it('should not render file context for first comment', () => {
      const commentCards = wrapper.findAll('.comment-card')
      const context = commentCards[0].find('.comment-context')
      expect(context.exists()).toBe(false)
    })
  })

  describe('Empty State', () => {
    beforeEach(async () => {
      wrapper = mount(PrCommentsModal, {
        props: {
          visible: true,
        },
      })

      // Clear comments to test empty state
      wrapper.vm.comments = []

      wrapper.vm.selectedPr = 42
      await nextTick()
    })

    it('should show empty state when no comments exist', () => {
      const emptyState = wrapper.find('.empty-state')
      expect(emptyState.exists()).toBe(true)
    })

    it('should display empty state message', () => {
      const emptyState = wrapper.find('.empty-state')
      expect(emptyState.text()).toContain('No comments yet')
    })

    it('should not show comments list when empty', () => {
      const commentsList = wrapper.find('.comments-list')
      expect(commentsList.exists()).toBe(false)
    })

    it('should update section title to show zero comments', () => {
      const sectionTitle = wrapper.find('.section-title')
      expect(sectionTitle.text()).toBe('Comments (0)')
    })
  })

  describe('Footer Section', () => {
    beforeEach(() => {
      wrapper = mount(PrCommentsModal, {
        props: {
          visible: true,
        },
      })
    })

    it('should have footer with two buttons', () => {
      const buttons = wrapper
        .find('.modal-footer')
        .findAll('[data-testid="base-button"]')
      expect(buttons.length).toBeGreaterThanOrEqual(2)
    })

    it('should have Close button', () => {
      const closeButton = wrapper
        .findAll('[data-testid="base-button"]')
        .find((btn) => btn.text() === 'Close')
      expect(closeButton?.exists()).toBe(true)
    })

    it('should have Open in GitHub button', () => {
      const openButton = wrapper
        .findAll('[data-testid="base-button"]')
        .find((btn) => btn.text().includes('Open in GitHub'))
      expect(openButton?.exists()).toBe(true)
    })

    it('should emit close event when Close button is clicked', async () => {
      const closeButton = wrapper
        .findAll('[data-testid="base-button"]')
        .find((btn) => btn.text() === 'Close')

      await closeButton?.trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should disable Open in GitHub button when no PR selected', () => {
      const openButton = wrapper
        .findAll('[data-testid="base-button"]')
        .find((btn) => btn.text().includes('Open in GitHub'))

      expect(openButton?.attributes('disabled')).toBeDefined()
    })

    it('should enable Open in GitHub button when PR selected', async () => {
      wrapper.vm.selectedPr = 42
      await nextTick()

      const openButton = wrapper
        .findAll('[data-testid="base-button"]')
        .find((btn) => btn.text().includes('Open in GitHub'))

      expect(openButton?.attributes('disabled')).toBeUndefined()
    })
  })

  describe('Method - handleOpenPr', () => {
    beforeEach(() => {
      wrapper = mount(PrCommentsModal, {
        props: {
          visible: true,
        },
      })
      vi.clearAllMocks()
      consoleSpy.mockClear()
    })

    it('should not do anything when no PR is selected', async () => {
      const openButton = wrapper
        .findAll('[data-testid="base-button"]')
        .find((btn) => btn.text().includes('Open in GitHub'))

      await openButton?.trigger('click')

      expect(consoleSpy).not.toHaveBeenCalled()
      expect(mockSuccess).not.toHaveBeenCalled()
    })

    it('should log and show success when PR is selected', async () => {
      wrapper.vm.selectedPr = 42
      await nextTick()

      const openButton = wrapper
        .findAll('[data-testid="base-button"]')
        .find((btn) => btn.text().includes('Open in GitHub'))

      await openButton?.trigger('click')

      expect(consoleSpy).toHaveBeenCalledWith('[PRComments] Opening PR #', 42)
      expect(mockSuccess).toHaveBeenCalledWith('Opening PR #42 in GitHub')
    })

    it('should work with different PR numbers', async () => {
      // Test with PR #41
      wrapper.vm.selectedPr = 41
      await nextTick()
      consoleSpy.mockClear()
      mockSuccess.mockClear()

      const openButton = wrapper
        .findAll('[data-testid="base-button"]')
        .find((btn) => btn.text().includes('Open in GitHub'))

      await openButton?.trigger('click')

      expect(consoleSpy).toHaveBeenCalledWith('[PRComments] Opening PR #', 41)
      expect(mockSuccess).toHaveBeenCalledWith('Opening PR #41 in GitHub')
    })
  })

  describe('Method - handleOverlayClick', () => {
    beforeEach(() => {
      wrapper = mount(PrCommentsModal, {
        props: {
          visible: true,
        },
      })
    })

    it('should emit close event when overlay is clicked', async () => {
      const overlay = wrapper.find('.modal-overlay')
      await overlay.trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
      expect(wrapper.emitted('close')?.[0]).toEqual([])
    })

    it('should only emit one close event per overlay click', async () => {
      const overlay = wrapper.find('.modal-overlay')
      await overlay.trigger('click')

      const closeEvents = wrapper.emitted('close')
      expect(closeEvents).toHaveLength(1)
    })

    it('should not emit close when modal content is clicked', async () => {
      const modalContent = wrapper.find('.modal-container')

      // Clear any previous emissions
      wrapper.emitted('close')

      await modalContent.trigger('click')

      // Click on content should not trigger overlay handler
      expect(wrapper.emitted('close')).toBeFalsy()
    })
  })

  describe('Edge Cases', () => {
    it('should handle rapid visibility toggling', async () => {
      wrapper = mount(PrCommentsModal, {
        props: {
          visible: false,
        },
      })

      await wrapper.setProps({ visible: true })
      await wrapper.setProps({ visible: false })
      await wrapper.setProps({ visible: true })

      expect(wrapper.find('.modal-overlay').exists()).toBe(true)
    })

    it('should handle rapid PR selections', async () => {
      wrapper = mount(PrCommentsModal, {
        props: {
          visible: true,
        },
      })

      wrapper.vm.selectedPr = 42
      await nextTick()
      wrapper.vm.selectedPr = 41
      await nextTick()
      wrapper.vm.selectedPr = 40
      await nextTick()
      wrapper.vm.selectedPr = ''
      await nextTick()

      expect(wrapper.vm.selectedPr).toBe('')
    })

    it('should handle multiple refresh clicks', async () => {
      wrapper = mount(PrCommentsModal, {
        props: {
          visible: true,
        },
      })

      wrapper.vm.selectedPr = 42
      await nextTick()

      const refreshBtn = wrapper.find('.refresh-btn')

      await refreshBtn.trigger('click')
      await refreshBtn.trigger('click')
      await refreshBtn.trigger('click')

      expect(mockSuccess).toHaveBeenCalledTimes(3)
      expect(mockSuccess).toHaveBeenCalledWith('Refreshing comments...')
    })

    it('should handle multiple button clicks', async () => {
      wrapper = mount(PrCommentsModal, {
        props: {
          visible: true,
        },
      })

      const closeButton = wrapper
        .findAll('[data-testid="base-button"]')
        .find((btn) => btn.text() === 'Close')

      await closeButton?.trigger('click')
      await closeButton?.trigger('click')
      await closeButton?.trigger('click')

      expect(wrapper.emitted('close')).toHaveLength(3)
    })
  })

  describe('Visual Elements and Accessibility', () => {
    beforeEach(() => {
      wrapper = mount(PrCommentsModal, {
        props: {
          visible: true,
        },
      })
    })

    it('should have proper modal structure', () => {
      expect(wrapper.find('.modal-overlay').exists()).toBe(true)
      expect(wrapper.find('.modal-container').exists()).toBe(true)
      expect(wrapper.find('.modal-header').exists()).toBe(true)
      expect(wrapper.find('.modal-content').exists()).toBe(true)
      expect(wrapper.find('.modal-footer').exists()).toBe(true)
    })

    it('should have PR selector section', () => {
      expect(wrapper.find('.pr-selector').exists()).toBe(true)
    })

    it('should have select input with proper id', () => {
      const select = wrapper.find('#pr-number')
      expect(select.exists()).toBe(true)
      expect(select.attributes('id')).toBe('pr-number')
    })

    it('should have label associated with select', () => {
      const label = wrapper.find('label[for="pr-number"]')
      expect(label.exists()).toBe(true)
    })

    it('should have close button with aria-label', () => {
      const closeButton = wrapper.find('.close-button')
      expect(closeButton.attributes('aria-label')).toBe('Close')
    })

    it('should render BaseIcon components', () => {
      const icons = wrapper.findAll('[data-testid="base-icon"]')
      expect(icons.length).toBeGreaterThan(0)
    })
  })

  describe('Component State Management', () => {
    beforeEach(() => {
      wrapper = mount(PrCommentsModal, {
        props: {
          visible: true,
        },
      })
    })

    it('should initialize with correct default state', () => {
      expect(wrapper.vm.selectedPr).toBe('')
      expect(wrapper.vm.pullRequests).toHaveLength(3)
      expect(wrapper.vm.comments).toHaveLength(2)
    })

    it('should have correct pull requests data', () => {
      expect(wrapper.vm.pullRequests).toEqual([
        { number: 42, title: 'Add new feature X' },
        { number: 41, title: 'Fix critical bug in Y' },
        { number: 40, title: 'Refactor component Z' },
      ])
    })

    it('should have correct comments data', () => {
      expect(wrapper.vm.comments).toEqual([
        {
          id: 1,
          author: 'john.doe',
          time: '2 hours ago',
          body: 'LGTM! Great implementation.',
          type: 'review',
        },
        {
          id: 2,
          author: 'jane.smith',
          time: '1 hour ago',
          body: 'Consider adding error handling here.',
          type: 'comment',
          file: 'src/components/App.vue',
          line: 145,
        },
      ])
    })

    it('should maintain state across visibility changes', async () => {
      wrapper.vm.selectedPr = 42
      await nextTick()

      await wrapper.setProps({ visible: false })
      await wrapper.setProps({ visible: true })

      expect(wrapper.vm.selectedPr).toBe(42)
    })

    it('should have independent state for all data', async () => {
      wrapper.vm.selectedPr = 41
      await nextTick()

      expect(wrapper.vm.selectedPr).toBe(41)
      expect(wrapper.vm.pullRequests).toHaveLength(3)
      expect(wrapper.vm.comments).toHaveLength(2)
    })
  })

  describe('Watcher Behavior', () => {
    beforeEach(() => {
      wrapper = mount(PrCommentsModal, {
        props: {
          visible: true,
        },
      })
      consoleSpy.mockClear()
    })

    it('should trigger watcher on PR selection', async () => {
      wrapper.vm.selectedPr = 42
      await nextTick()

      expect(consoleSpy).toHaveBeenCalledWith('[PRComments] Selected PR:', 42)
    })

    it('should trigger watcher on PR deselection', async () => {
      wrapper.vm.selectedPr = 42
      await nextTick()
      consoleSpy.mockClear()

      wrapper.vm.selectedPr = ''
      await nextTick()

      expect(consoleSpy).toHaveBeenCalledWith('[PRComments] Selected PR:', '')
    })

    it('should trigger watcher for each selection change', async () => {
      wrapper.vm.selectedPr = 42
      await nextTick()

      consoleSpy.mockClear()

      wrapper.vm.selectedPr = 41
      await nextTick()

      expect(consoleSpy).toHaveBeenCalledWith('[PRComments] Selected PR:', 41)

      consoleSpy.mockClear()

      wrapper.vm.selectedPr = 40
      await nextTick()

      expect(consoleSpy).toHaveBeenCalledWith('[PRComments] Selected PR:', 40)
    })
  })
})
