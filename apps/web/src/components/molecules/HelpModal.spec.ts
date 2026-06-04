/**
 * @fileoverview Comprehensive test suite for HelpModal component.
 *
 * @description
 * Tests all functionality including modal visibility, search filtering,
 * topic selection, commands display, shortcuts display, and footer actions.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick, type ComponentPublicInstance } from 'vue'
import HelpModal from './HelpModal.vue'
import BaseIcon from '../atoms/BaseIcon.vue'
import BaseButton from '../atoms/BaseButton.vue'

/**
 * Type definition for topic item.
 */
interface TopicItem {
  id: string
  title: string
  icon: string
  description: string
}

/**
 * Type definition for Help Modal VM instance.
 */
interface CommandItem {
  name: string
  description: string
}

interface ShortcutItem {
  id: string
  keys: string[]
  description: string
}

interface HelpModalVM {
  topics: TopicItem[]
  commands: CommandItem[]
  shortcuts: ShortcutItem[]
  selectedTopic: string | null
  searchQuery: string
  filteredTopics: TopicItem[]
  selectTopic: (id: string) => void
  openDocs: () => void
}

/**
 * Mock composables.
 */
vi.mock('../../composables/useNotifications', () => ({
  useNotifications: () => ({
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}))

describe('HelpModal.vue', () => {
  let wrapper: VueWrapper<ComponentPublicInstance>

  /**
   * Cleanup after each test.
   */
  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  /**
   * Helper to mount component.
   */
  const createWrapper = (props = {}, options = {}) => {
    return mount(HelpModal, {
      props: {
        visible: true,
        ...props,
      },
      global: {
        components: {
          BaseIcon,
          BaseButton,
        },
        stubs: {
          BaseIcon: true,
          BaseButton: true,
          ...options.stubs,
        },
      },
    })
  }

  describe('Rendering', () => {
    it('should mount and render without errors', () => {
      wrapper = createWrapper()
      expect(wrapper.exists()).toBe(true)
    })

    it('should not render when visible is false', () => {
      wrapper = createWrapper({ visible: false })
      expect(wrapper.find('.modal-overlay').exists()).toBe(false)
    })

    it('should render modal overlay when visible is true', () => {
      wrapper = createWrapper({ visible: true })
      expect(wrapper.find('.modal-overlay').exists()).toBe(true)
    })

    it('should render modal title "Help & Documentation"', () => {
      wrapper = createWrapper()
      expect(wrapper.find('.modal-title').text()).toBe('Help & Documentation')
    })

    it('should render close button with aria-label', () => {
      wrapper = createWrapper()
      const closeButton = wrapper.find('.close-button')
      expect(closeButton.exists()).toBe(true)
      expect(closeButton.attributes('aria-label')).toBe('Close')
    })

    it('should render search input', () => {
      wrapper = createWrapper()
      const searchInput = wrapper.find('.search-input')
      expect(searchInput.exists()).toBe(true)
      expect(searchInput.attributes('placeholder')).toBe(
        'Search help topics...'
      )
    })

    it('should render all 4 topic cards', () => {
      wrapper = createWrapper()
      const topicCards = wrapper.findAll('.topic-card')
      expect(topicCards).toHaveLength(4)
    })

    it('should render topic titles', () => {
      wrapper = createWrapper()
      const topicTitles = wrapper.findAll('.topic-title')
      expect(topicTitles[0].text()).toBe('Getting Started')
      expect(topicTitles[1].text()).toBe('Commands')
      expect(topicTitles[2].text()).toBe('Git Workflow')
      expect(topicTitles[3].text()).toBe('Shortcuts')
    })

    it('should render topic descriptions', () => {
      wrapper = createWrapper()
      const topicDescs = wrapper.findAll('.topic-desc')
      expect(topicDescs[0].text()).toBe('Learn the basics')
      expect(topicDescs[1].text()).toBe('Available slash commands')
      expect(topicDescs[2].text()).toBe('Version control guide')
      expect(topicDescs[3].text()).toBe('Keyboard shortcuts')
    })

    it('should render commands section title', () => {
      wrapper = createWrapper()
      const sectionTitles = wrapper.findAll('.section-title')
      expect(
        sectionTitles.some((el) => el.text() === 'Available Commands')
      ).toBe(true)
    })

    it('should render command count badge', () => {
      wrapper = createWrapper()
      const commandCount = wrapper.find('.command-count')
      expect(commandCount.text()).toBe('7')
    })

    it('should render all 7 commands', () => {
      wrapper = createWrapper()
      const commandItems = wrapper.findAll('.command-item')
      expect(commandItems).toHaveLength(7)
    })

    it('should render command names with / prefix', () => {
      wrapper = createWrapper()
      const commandNames = wrapper.findAll('.command-name')
      expect(commandNames[0].text()).toBe('/model')
      expect(commandNames[1].text()).toBe('/cost')
      expect(commandNames[2].text()).toBe('/context')
    })

    it('should render command descriptions', () => {
      wrapper = createWrapper()
      const commandDescs = wrapper.findAll('.command-desc')
      expect(commandDescs[0].text()).toBe('Switch AI model')
      expect(commandDescs[1].text()).toBe('View token usage and costs')
    })

    it('should render shortcuts section', () => {
      wrapper = createWrapper()
      const sectionTitles = wrapper.findAll('.section-title')
      expect(
        sectionTitles.some((el) => el.text() === 'Keyboard Shortcuts')
      ).toBe(true)
    })

    it('should render all 5 shortcuts', () => {
      wrapper = createWrapper()
      const shortcutItems = wrapper.findAll('.shortcut-item')
      expect(shortcutItems).toHaveLength(5)
    })

    it('should render shortcut keys', () => {
      wrapper = createWrapper()
      const keys = wrapper.findAll('.key')
      expect(keys.length).toBeGreaterThan(0)
      expect(keys[0].text()).toBe('Cmd')
      expect(keys[1].text()).toBe('K')
    })

    it('should render shortcut descriptions', () => {
      wrapper = createWrapper()
      const shortcutDescs = wrapper.findAll('.shortcut-desc')
      expect(shortcutDescs[0].text()).toBe('Open command palette')
      expect(shortcutDescs[1].text()).toBe('New terminal')
    })

    it('should render footer links', () => {
      wrapper = createWrapper()
      const footerLinks = wrapper.findAll('.footer-link')
      expect(footerLinks).toHaveLength(2)
      expect(footerLinks[0].text()).toContain('View Full Docs')
      expect(footerLinks[1].text()).toContain('GitHub Issues')
    })

    it('should render Close button in footer', () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      const buttons = wrapper.findAll('button')
      const closeButton = buttons.find((btn) => btn.text().includes('Close'))
      expect(closeButton).toBeTruthy()
    })
  })

  describe('Search Functionality', () => {
    it('should initialize search query as empty', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as HelpModalVM
      expect(vm.searchQuery).toBe('')
    })

    it('should bind search input with v-model', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as HelpModalVM
      const searchInput = wrapper.find('.search-input')

      await searchInput.setValue('commands')
      expect(vm.searchQuery).toBe('commands')
    })

    it('should show all topics when search is empty', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as HelpModalVM
      expect(vm.filteredTopics).toHaveLength(4)
    })

    it('should filter topics by title', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as HelpModalVM
      const searchInput = wrapper.find('.search-input')

      await searchInput.setValue('commands')
      await nextTick()

      expect(vm.filteredTopics).toHaveLength(1)
      expect(vm.filteredTopics[0].title).toBe('Commands')
    })

    it('should filter topics by description', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as HelpModalVM
      const searchInput = wrapper.find('.search-input')

      await searchInput.setValue('basics')
      await nextTick()

      expect(vm.filteredTopics).toHaveLength(1)
      expect(vm.filteredTopics[0].id).toBe('getting-started')
    })

    it('should filter topics case-insensitively', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as HelpModalVM
      const searchInput = wrapper.find('.search-input')

      await searchInput.setValue('GIT')
      await nextTick()

      expect(vm.filteredTopics).toHaveLength(1)
      expect(vm.filteredTopics[0].id).toBe('git-workflow')
    })

    it('should return empty array when no topics match', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as HelpModalVM
      const searchInput = wrapper.find('.search-input')

      await searchInput.setValue('nonexistent')
      await nextTick()

      expect(vm.filteredTopics).toHaveLength(0)
    })

    it('should update displayed topics based on search', async () => {
      wrapper = createWrapper()
      const searchInput = wrapper.find('.search-input')

      await searchInput.setValue('shortcuts')
      await nextTick()

      const topicCards = wrapper.findAll('.topic-card')
      expect(topicCards).toHaveLength(1)
      expect(topicCards[0].text()).toContain('Shortcuts')
    })

    it('should match partial strings in title', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as HelpModalVM
      const searchInput = wrapper.find('.search-input')

      await searchInput.setValue('work')
      await nextTick()

      expect(vm.filteredTopics).toHaveLength(1)
      expect(vm.filteredTopics[0].title).toBe('Git Workflow')
    })

    it('should match partial strings in description', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as HelpModalVM
      const searchInput = wrapper.find('.search-input')

      await searchInput.setValue('slash')
      await nextTick()

      expect(vm.filteredTopics).toHaveLength(1)
      expect(vm.filteredTopics[0].description).toBe('Available slash commands')
    })
  })

  describe('Topic Selection', () => {
    it('should call selectTopic when topic card is clicked', async () => {
      wrapper = createWrapper()
      const consoleLogSpy = vi.spyOn(console, 'log')
      const topicCards = wrapper.findAll('.topic-card')

      await topicCards[0].trigger('click')

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Help] Selected topic:',
        'getting-started'
      )
    })

    it('should call selectTopic for each different topic', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as HelpModalVM
      const consoleLogSpy = vi.spyOn(console, 'log')

      const topic = vm.topics[1]
      vm.selectTopic(topic)

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Help] Selected topic:',
        'commands'
      )
    })

    it('should handle topic selection for Git Workflow', async () => {
      wrapper = createWrapper()
      const topicCards = wrapper.findAll('.topic-card')
      const consoleLogSpy = vi.spyOn(console, 'log')

      await topicCards[2].trigger('click')

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Help] Selected topic:',
        'git-workflow'
      )
    })

    it('should handle topic selection for Shortcuts', async () => {
      wrapper = createWrapper()
      const topicCards = wrapper.findAll('.topic-card')
      const consoleLogSpy = vi.spyOn(console, 'log')

      await topicCards[3].trigger('click')

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Help] Selected topic:',
        'shortcuts'
      )
    })
  })

  describe('Footer Actions', () => {
    it('should call openDocs when View Full Docs is clicked', async () => {
      wrapper = createWrapper()
      const consoleLogSpy = vi.spyOn(console, 'log')
      const footerLinks = wrapper.findAll('.footer-link')

      await footerLinks[0].trigger('click')

      expect(consoleLogSpy).toHaveBeenCalledWith('[Help] Opening documentation')
    })

    it('should call openGitHub when GitHub Issues is clicked', async () => {
      wrapper = createWrapper()
      const consoleLogSpy = vi.spyOn(console, 'log')
      const footerLinks = wrapper.findAll('.footer-link')

      await footerLinks[1].trigger('click')

      expect(consoleLogSpy).toHaveBeenCalledWith('[Help] Opening GitHub')
    })

    it('should emit close when Close button is clicked', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      const buttons = wrapper.findAll('button')
      const closeButton = buttons.find((btn) => btn.text().includes('Close'))

      await closeButton!.trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
    })
  })

  describe('Modal Interactions', () => {
    it('should emit close event when close button is clicked', async () => {
      wrapper = createWrapper()
      const closeButton = wrapper.find('.close-button')
      await closeButton.trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should emit close event when overlay is clicked', async () => {
      wrapper = createWrapper()
      const overlay = wrapper.find('.modal-overlay')
      await overlay.trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should not emit close when modal container is clicked', async () => {
      wrapper = createWrapper()
      const container = wrapper.find('.modal-container')
      await container.trigger('click')

      expect(wrapper.emitted('close')).toBeFalsy()
    })

    it('should call handleOverlayClick when overlay is clicked', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as HelpModalVM

      vm.handleOverlayClick()

      expect(wrapper.emitted('close')).toBeTruthy()
    })
  })

  describe('Component Lifecycle', () => {
    it('should initialize with correct default values', () => {
      wrapper = createWrapper({ visible: false })
      const vm = wrapper.vm as unknown as HelpModalVM

      expect(vm.searchQuery).toBe('')
      expect(vm.topics).toHaveLength(4)
      expect(vm.commands).toHaveLength(7)
      expect(vm.shortcuts).toHaveLength(5)
    })

    it('should have topics with correct structure', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as HelpModalVM

      vm.topics.forEach((topic: TopicItem) => {
        expect(topic).toHaveProperty('id')
        expect(topic).toHaveProperty('title')
        expect(topic).toHaveProperty('description')
        expect(topic).toHaveProperty('icon')
      })
    })

    it('should have commands with correct structure', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as HelpModalVM

      vm.commands.forEach((cmd: CommandItem) => {
        expect(cmd).toHaveProperty('name')
        expect(cmd).toHaveProperty('description')
      })
    })

    it('should have shortcuts with correct structure', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as HelpModalVM

      vm.shortcuts.forEach((shortcut: ShortcutItem) => {
        expect(shortcut).toHaveProperty('id')
        expect(shortcut).toHaveProperty('keys')
        expect(shortcut).toHaveProperty('description')
        expect(Array.isArray(shortcut.keys)).toBe(true)
      })
    })

    it('should cleanup properly when unmounted', () => {
      wrapper = createWrapper()
      expect(() => wrapper.unmount()).not.toThrow()
    })
  })

  describe('Accessibility', () => {
    it('should have proper aria-label on close button', () => {
      wrapper = createWrapper()
      const closeButton = wrapper.find('.close-button')
      expect(closeButton.attributes('aria-label')).toBe('Close')
    })

    it('should have placeholder on search input', () => {
      wrapper = createWrapper()
      const searchInput = wrapper.find('.search-input')
      expect(searchInput.attributes('placeholder')).toBe(
        'Search help topics...'
      )
    })

    it('should render kbd elements for shortcuts', () => {
      wrapper = createWrapper()
      const kbdElements = wrapper.findAll('.key')
      expect(kbdElements.length).toBeGreaterThan(0)
    })

    it('should render code elements for commands', () => {
      wrapper = createWrapper()
      const codeElements = wrapper.findAll('.command-name')
      expect(codeElements.length).toBe(7)
    })
  })

  describe('Integration Tests', () => {
    it('should complete workflow: search and select topic', async () => {
      wrapper = createWrapper()
      const consoleLogSpy = vi.spyOn(console, 'log')

      // Search for commands
      const searchInput = wrapper.find('.search-input')
      await searchInput.setValue('commands')
      await nextTick()

      // Select the filtered topic
      const topicCards = wrapper.findAll('.topic-card')
      expect(topicCards).toHaveLength(1)

      await topicCards[0].trigger('click')

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Help] Selected topic:',
        'commands'
      )
    })

    it('should complete workflow: open documentation', async () => {
      wrapper = createWrapper()
      const consoleLogSpy = vi.spyOn(console, 'log')

      const footerLinks = wrapper.findAll('.footer-link')
      await footerLinks[0].trigger('click')

      expect(consoleLogSpy).toHaveBeenCalledWith('[Help] Opening documentation')
    })

    it('should complete workflow: open GitHub', async () => {
      wrapper = createWrapper()
      const consoleLogSpy = vi.spyOn(console, 'log')

      const footerLinks = wrapper.findAll('.footer-link')
      await footerLinks[1].trigger('click')

      expect(consoleLogSpy).toHaveBeenCalledWith('[Help] Opening GitHub')
    })
  })

  describe('Edge Cases', () => {
    it('should handle rapid search input changes', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as HelpModalVM
      const searchInput = wrapper.find('.search-input')

      await searchInput.setValue('git')
      await searchInput.setValue('commands')
      await searchInput.setValue('shortcuts')
      await nextTick()

      expect(vm.filteredTopics).toHaveLength(1)
      expect(vm.filteredTopics[0].title).toBe('Shortcuts')
    })

    it('should handle clearing search input', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as HelpModalVM
      const searchInput = wrapper.find('.search-input')

      await searchInput.setValue('commands')
      await nextTick()
      expect(vm.filteredTopics).toHaveLength(1)

      await searchInput.setValue('')
      await nextTick()
      expect(vm.filteredTopics).toHaveLength(4)
    })

    it('should handle multiple topic selections', async () => {
      wrapper = createWrapper()
      const consoleLogSpy = vi.spyOn(console, 'log')
      const topicCards = wrapper.findAll('.topic-card')

      await topicCards[0].trigger('click')
      await topicCards[1].trigger('click')
      await topicCards[2].trigger('click')

      expect(consoleLogSpy).toHaveBeenCalledTimes(3)
    })

    it('should handle search with special characters', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as HelpModalVM
      const searchInput = wrapper.find('.search-input')

      await searchInput.setValue('!@#$%')
      await nextTick()

      expect(vm.filteredTopics).toHaveLength(0)
    })

    it('should handle search with numbers', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as HelpModalVM
      const searchInput = wrapper.find('.search-input')

      await searchInput.setValue('123')
      await nextTick()

      expect(vm.filteredTopics).toHaveLength(0)
    })

    it('should handle very long search queries', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as HelpModalVM
      const searchInput = wrapper.find('.search-input')
      const longQuery = 'a'.repeat(200)

      await searchInput.setValue(longQuery)
      await nextTick()

      expect(vm.filteredTopics).toHaveLength(0)
    })

    it('should handle search with leading/trailing spaces', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as HelpModalVM
      const searchInput = wrapper.find('.search-input')

      // Component does not trim spaces, so "  commands  " won't match "Commands"
      await searchInput.setValue('  commands  ')
      await nextTick()

      expect(vm.filteredTopics).toHaveLength(0)

      // Without spaces it should match
      await searchInput.setValue('commands')
      await nextTick()

      expect(vm.filteredTopics).toHaveLength(1)
      expect(vm.filteredTopics[0].title).toBe('Commands')
    })
  })

  describe('Data Arrays', () => {
    it('should have correct number of topics', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as HelpModalVM
      expect(vm.topics).toHaveLength(4)
    })

    it('should have correct number of commands', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as HelpModalVM
      expect(vm.commands).toHaveLength(7)
    })

    it('should have correct number of shortcuts', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as HelpModalVM
      expect(vm.shortcuts).toHaveLength(5)
    })

    it('should have correct topic IDs', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as HelpModalVM
      const ids = vm.topics.map((t: TopicItem) => t.id)

      expect(ids).toContain('getting-started')
      expect(ids).toContain('commands')
      expect(ids).toContain('git-workflow')
      expect(ids).toContain('shortcuts')
    })

    it('should have correct command names', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as HelpModalVM
      const names = vm.commands.map((c: CommandItem) => c.name)

      expect(names).toContain('model')
      expect(names).toContain('cost')
      expect(names).toContain('context')
      expect(names).toContain('clear')
      expect(names).toContain('rewind')
      expect(names).toContain('review')
      expect(names).toContain('help')
    })

    it('should have shortcuts with multiple keys', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as HelpModalVM

      vm.shortcuts.forEach((shortcut: ShortcutItem) => {
        expect(shortcut.keys.length).toBeGreaterThan(0)
      })
    })
  })
})
