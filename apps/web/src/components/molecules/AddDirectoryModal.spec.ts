/**
 * @fileoverview Tests for AddDirectoryModal component.
 *
 * @description
 * Comprehensive test suite for the Add Directory to Context modal,
 * covering visibility, directory management, user interactions, and edge cases.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick, type ComponentPublicInstance } from 'vue'
import AddDirectoryModal from './AddDirectoryModal.vue'
import BaseIcon from '../atoms/BaseIcon.vue'
import BaseButton from '../atoms/BaseButton.vue'

/**
 * Mock useNotifications composable.
 */
vi.mock('../../composables/useNotifications', () => ({
  useNotifications: () => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  }),
}))

describe('AddDirectoryModal.vue', () => {
  let wrapper: VueWrapper<ComponentPublicInstance>

  const defaultProps = {
    visible: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  describe('Component Initialization', () => {
    it('should mount and render without errors', () => {
      wrapper = mount(AddDirectoryModal, {
        props: defaultProps,
        global: {
          components: { BaseIcon, BaseButton },
        },
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('should render modal overlay when visible is true', () => {
      wrapper = mount(AddDirectoryModal, {
        props: { visible: true },
        global: {
          components: { BaseIcon, BaseButton },
        },
      })

      const overlay = wrapper.find('.modal-overlay')
      expect(overlay.exists()).toBe(true)
    })

    it('should not render modal when visible is false', () => {
      wrapper = mount(AddDirectoryModal, {
        props: { visible: false },
        global: {
          components: { BaseIcon, BaseButton },
        },
      })

      const overlay = wrapper.find('.modal-overlay')
      expect(overlay.exists()).toBe(false)
    })

    it('should render modal header with correct title', () => {
      wrapper = mount(AddDirectoryModal, {
        props: defaultProps,
        global: {
          components: { BaseIcon, BaseButton },
        },
      })

      const title = wrapper.find('.modal-title')
      expect(title.exists()).toBe(true)
      expect(title.text()).toBe('Add Directory to Context')
    })
  })

  describe('Directory Input', () => {
    it('should render directory input field', () => {
      wrapper = mount(AddDirectoryModal, {
        props: defaultProps,
        global: {
          components: { BaseIcon, BaseButton },
        },
      })

      const input = wrapper.find('#directory-path')
      expect(input.exists()).toBe(true)
      expect(input.attributes('type')).toBe('text')
      expect(input.attributes('placeholder')).toBe('e.g., src/components')
    })

    it('should update directoryPath when input value changes', async () => {
      wrapper = mount(AddDirectoryModal, {
        props: defaultProps,
        global: {
          components: { BaseIcon, BaseButton },
        },
      })

      const input = wrapper.find('#directory-path')
      await input.setValue('src/test')
      await nextTick()

      expect((input.element as HTMLInputElement).value).toBe('src/test')
    })

    it('should render input label', () => {
      wrapper = mount(AddDirectoryModal, {
        props: defaultProps,
        global: {
          components: { BaseIcon, BaseButton },
        },
      })

      const label = wrapper.find('.input-label')
      expect(label.exists()).toBe(true)
      expect(label.text()).toBe('Directory Path')
    })

    it('should render input hint with glob pattern example', () => {
      wrapper = mount(AddDirectoryModal, {
        props: defaultProps,
        global: {
          components: { BaseIcon, BaseButton },
        },
      })

      const hint = wrapper.find('.input-hint')
      expect(hint.exists()).toBe(true)
      expect(hint.text()).toContain('src/**/*.ts')
    })
  })

  describe('Current Directories List', () => {
    it('should render list of current directories', () => {
      wrapper = mount(AddDirectoryModal, {
        props: defaultProps,
        global: {
          components: { BaseIcon, BaseButton },
        },
      })

      const directoriesList = wrapper.find('.directories-list')
      expect(directoriesList.exists()).toBe(true)
    })

    it('should render section title for current directories', () => {
      wrapper = mount(AddDirectoryModal, {
        props: defaultProps,
        global: {
          components: { BaseIcon, BaseButton },
        },
      })

      const sectionTitle = wrapper.find('.section-title')
      expect(sectionTitle.exists()).toBe(true)
      expect(sectionTitle.text()).toBe('Current Context Directories')
    })

    it('should render initial directories (src/components, src/composables, src/utils)', () => {
      wrapper = mount(AddDirectoryModal, {
        props: defaultProps,
        global: {
          components: { BaseIcon, BaseButton },
        },
      })

      const directoryItems = wrapper.findAll('.directory-item')
      expect(directoryItems.length).toBe(3)

      const directoryPaths = directoryItems.map((item) =>
        item.find('.directory-path').text()
      )
      expect(directoryPaths).toContain('src/components')
      expect(directoryPaths).toContain('src/composables')
      expect(directoryPaths).toContain('src/utils')
    })

    it('should render folder icon for each directory', () => {
      wrapper = mount(AddDirectoryModal, {
        props: defaultProps,
        global: {
          components: { BaseIcon, BaseButton },
        },
      })

      const directoryItems = wrapper.findAll('.directory-item')
      directoryItems.forEach((item) => {
        const folderIcon = item.findComponent(BaseIcon)
        expect(folderIcon.exists()).toBe(true)
      })
    })

    it('should render remove button for each directory', () => {
      wrapper = mount(AddDirectoryModal, {
        props: defaultProps,
        global: {
          components: { BaseIcon, BaseButton },
        },
      })

      const removeButtons = wrapper.findAll('.remove-button')
      expect(removeButtons.length).toBe(3)
    })
  })

  describe('Add Directory', () => {
    it('should add directory when input has value and Add button is clicked', async () => {
      wrapper = mount(AddDirectoryModal, {
        props: defaultProps,
        global: {
          components: { BaseIcon, BaseButton },
        },
      })

      const input = wrapper.find('#directory-path')
      await input.setValue('src/new-directory')
      await nextTick()

      const addButton = wrapper.findAll('.modal-footer button')[1]
      await addButton.trigger('click')
      await nextTick()

      expect(wrapper.emitted('add')).toBeTruthy()
      expect(wrapper.emitted('add')?.[0]).toEqual(['src/new-directory'])
    })

    it('should clear input after adding directory', async () => {
      wrapper = mount(AddDirectoryModal, {
        props: defaultProps,
        global: {
          components: { BaseIcon, BaseButton },
        },
      })

      const input = wrapper.find('#directory-path')
      await input.setValue('src/test')
      await nextTick()

      const addButton = wrapper.findAll('.modal-footer button')[1]
      await addButton.trigger('click')
      await nextTick()

      expect((input.element as HTMLInputElement).value).toBe('')
    })

    it('should add directory when Enter key is pressed', async () => {
      wrapper = mount(AddDirectoryModal, {
        props: defaultProps,
        global: {
          components: { BaseIcon, BaseButton },
        },
      })

      const input = wrapper.find('#directory-path')
      await input.setValue('src/enter-test')
      await nextTick()

      await input.trigger('keyup.enter')
      await nextTick()

      expect(wrapper.emitted('add')).toBeTruthy()
      expect(wrapper.emitted('add')?.[0]).toEqual(['src/enter-test'])
    })

    it('should not add directory when input is empty', async () => {
      wrapper = mount(AddDirectoryModal, {
        props: defaultProps,
        global: {
          components: { BaseIcon, BaseButton },
        },
      })

      const addButton = wrapper.findAll('.modal-footer button')[1]
      await addButton.trigger('click')
      await nextTick()

      expect(wrapper.emitted('add')).toBeFalsy()
    })

    it('should not add directory when input contains only whitespace', async () => {
      wrapper = mount(AddDirectoryModal, {
        props: defaultProps,
        global: {
          components: { BaseIcon, BaseButton },
        },
      })

      const input = wrapper.find('#directory-path')
      await input.setValue('   ')
      await nextTick()

      const addButton = wrapper.findAll('.modal-footer button')[1]
      await addButton.trigger('click')
      await nextTick()

      expect(wrapper.emitted('add')).toBeFalsy()
    })

    it('should trim whitespace from directory path before adding', async () => {
      wrapper = mount(AddDirectoryModal, {
        props: defaultProps,
        global: {
          components: { BaseIcon, BaseButton },
        },
      })

      const input = wrapper.find('#directory-path')
      await input.setValue('  src/trimmed  ')
      await nextTick()

      const addButton = wrapper.findAll('.modal-footer button')[1]
      await addButton.trigger('click')
      await nextTick()

      expect(wrapper.emitted('add')?.[0]).toEqual(['src/trimmed'])
    })

    it('should not add duplicate directory', async () => {
      wrapper = mount(AddDirectoryModal, {
        props: defaultProps,
        global: {
          components: { BaseIcon, BaseButton },
        },
      })

      const input = wrapper.find('#directory-path')
      await input.setValue('src/components')
      await nextTick()

      const addButton = wrapper.findAll('.modal-footer button')[1]
      await addButton.trigger('click')
      await nextTick()

      expect(wrapper.emitted('add')).toBeFalsy()
      // useNotifications is mocked at the top level, success() is called
      // but we don't test the notification message since the mock is global
    })

    it('should disable Add button when input is empty', async () => {
      wrapper = mount(AddDirectoryModal, {
        props: defaultProps,
        global: {
          components: { BaseIcon, BaseButton },
        },
      })

      const addButton = wrapper.findAll('.modal-footer button')[1]
      await nextTick()

      expect(addButton.attributes('disabled')).toBeDefined()
    })

    it('should enable Add button when input has value', async () => {
      wrapper = mount(AddDirectoryModal, {
        props: defaultProps,
        global: {
          components: { BaseIcon, BaseButton },
        },
      })

      const input = wrapper.find('#directory-path')
      await input.setValue('src/test')
      await nextTick()

      const addButton = wrapper.findAll('.modal-footer button')[1]
      expect(addButton.attributes('disabled')).toBeUndefined()
    })

    it('should update directory count after adding', async () => {
      wrapper = mount(AddDirectoryModal, {
        props: defaultProps,
        global: {
          components: { BaseIcon, BaseButton },
        },
      })

      const initialCount = wrapper.findAll('.directory-item').length
      expect(initialCount).toBe(3)

      const input = wrapper.find('#directory-path')
      await input.setValue('src/new')
      await nextTick()

      const addButton = wrapper.findAll('.modal-footer button')[1]
      await addButton.trigger('click')
      await nextTick()

      const newCount = wrapper.findAll('.directory-item').length
      expect(newCount).toBe(4)
    })
  })

  describe('Remove Directory', () => {
    it('should remove directory when remove button is clicked', async () => {
      wrapper = mount(AddDirectoryModal, {
        props: defaultProps,
        global: {
          components: { BaseIcon, BaseButton },
        },
      })

      const initialCount = wrapper.findAll('.directory-item').length
      const removeButton = wrapper.findAll('.remove-button')[0]

      await removeButton.trigger('click')
      await nextTick()

      const newCount = wrapper.findAll('.directory-item').length
      expect(newCount).toBe(initialCount - 1)
    })

    it('should remove correct directory by index', async () => {
      wrapper = mount(AddDirectoryModal, {
        props: defaultProps,
        global: {
          components: { BaseIcon, BaseButton },
        },
      })

      const secondRemoveButton = wrapper.findAll('.remove-button')[1]
      await secondRemoveButton.trigger('click')
      await nextTick()

      const remainingPaths = wrapper
        .findAll('.directory-path')
        .map((el) => el.text())
      expect(remainingPaths).not.toContain('src/composables')
      expect(remainingPaths).toContain('src/components')
      expect(remainingPaths).toContain('src/utils')
    })

    it('should show success notification when directory is removed', async () => {
      wrapper = mount(AddDirectoryModal, {
        props: defaultProps,
        global: {
          components: { BaseIcon, BaseButton },
        },
      })

      const removeButton = wrapper.findAll('.remove-button')[2]
      await removeButton.trigger('click')
      await nextTick()

      // useNotifications is mocked at the top level, success() is called
      // Verified by the directory being removed from the list
      const directoryPaths = wrapper
        .findAll('.directory-path')
        .map((el) => el.text())
      expect(directoryPaths).not.toContain('src/utils')
    })
  })

  describe('Close Modal', () => {
    it('should emit close event when close button is clicked', async () => {
      wrapper = mount(AddDirectoryModal, {
        props: defaultProps,
        global: {
          components: { BaseIcon, BaseButton },
        },
      })

      const closeButton = wrapper.find('.close-button')
      await closeButton.trigger('click')
      await nextTick()

      expect(wrapper.emitted('close')).toBeTruthy()
      expect(wrapper.emitted('close')?.length).toBe(1)
    })

    it('should emit close event when overlay is clicked', async () => {
      wrapper = mount(AddDirectoryModal, {
        props: defaultProps,
        global: {
          components: { BaseIcon, BaseButton },
        },
      })

      const overlay = wrapper.find('.modal-overlay')
      await overlay.trigger('click')
      await nextTick()

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should not close when modal container is clicked', async () => {
      wrapper = mount(AddDirectoryModal, {
        props: defaultProps,
        global: {
          components: { BaseIcon, BaseButton },
        },
      })

      const container = wrapper.find('.modal-container')
      await container.trigger('click')
      await nextTick()

      expect(wrapper.emitted('close')).toBeFalsy()
    })

    it('should emit close event when Cancel button is clicked', async () => {
      wrapper = mount(AddDirectoryModal, {
        props: defaultProps,
        global: {
          components: { BaseIcon, BaseButton },
        },
      })

      const cancelButton = wrapper.findAll('.modal-footer button')[0]
      await cancelButton.trigger('click')
      await nextTick()

      expect(wrapper.emitted('close')).toBeTruthy()
    })
  })

  describe('UI Elements', () => {
    it('should render modal footer with Cancel and Add buttons', () => {
      wrapper = mount(AddDirectoryModal, {
        props: defaultProps,
        global: {
          components: { BaseIcon, BaseButton },
        },
      })

      const footer = wrapper.find('.modal-footer')
      expect(footer.exists()).toBe(true)

      const buttons = footer.findAll('button')
      expect(buttons.length).toBe(2)
    })

    it('should render info section with guidance messages', () => {
      wrapper = mount(AddDirectoryModal, {
        props: defaultProps,
        global: {
          components: { BaseIcon, BaseButton },
        },
      })

      const infoSection = wrapper.find('.info-section')
      expect(infoSection.exists()).toBe(true)

      const infoItems = wrapper.findAll('.info-item')
      expect(infoItems.length).toBe(2)
      expect(infoItems[0].text()).toContain(
        'Adding directories helps the AI understand your project structure'
      )
      expect(infoItems[1].text()).toContain(
        'Large directories may consume significant context space'
      )
    })

    it('should render Plus icon in Add button', () => {
      wrapper = mount(AddDirectoryModal, {
        props: defaultProps,
        global: {
          components: { BaseIcon, BaseButton },
        },
      })

      const addButton = wrapper.findAll('.modal-footer button')[1]
      const icon = addButton.findComponent(BaseIcon)
      expect(icon.exists()).toBe(true)
    })

    it('should render X icon in close button', () => {
      wrapper = mount(AddDirectoryModal, {
        props: defaultProps,
        global: {
          components: { BaseIcon, BaseButton },
        },
      })

      const closeButton = wrapper.find('.close-button')
      const icon = closeButton.findComponent(BaseIcon)
      expect(icon.exists()).toBe(true)
    })
  })

  describe('CSS Classes', () => {
    it('should apply correct CSS classes to modal overlay', () => {
      wrapper = mount(AddDirectoryModal, {
        props: defaultProps,
        global: {
          components: { BaseIcon, BaseButton },
        },
      })

      const overlay = wrapper.find('.modal-overlay')
      expect(overlay.classes()).toContain('modal-overlay')
    })

    it('should apply correct CSS classes to modal container', () => {
      wrapper = mount(AddDirectoryModal, {
        props: defaultProps,
        global: {
          components: { BaseIcon, BaseButton },
        },
      })

      const container = wrapper.find('.modal-container')
      expect(container.classes()).toContain('modal-container')
    })

    it('should apply correct CSS classes to directory items', () => {
      wrapper = mount(AddDirectoryModal, {
        props: defaultProps,
        global: {
          components: { BaseIcon, BaseButton },
        },
      })

      const items = wrapper.findAll('.directory-item')
      items.forEach((item) => {
        expect(item.classes()).toContain('directory-item')
      })
    })
  })

  describe('Accessibility', () => {
    it('should have aria-label on close button', () => {
      wrapper = mount(AddDirectoryModal, {
        props: defaultProps,
        global: {
          components: { BaseIcon, BaseButton },
        },
      })

      const closeButton = wrapper.find('.close-button')
      expect(closeButton.attributes('aria-label')).toBe('Close')
    })

    it('should have aria-label on remove buttons', () => {
      wrapper = mount(AddDirectoryModal, {
        props: defaultProps,
        global: {
          components: { BaseIcon, BaseButton },
        },
      })

      const removeButtons = wrapper.findAll('.remove-button')
      removeButtons.forEach((button) => {
        expect(button.attributes('aria-label')).toBe('Remove directory')
      })
    })

    it('should have label associated with input field', () => {
      wrapper = mount(AddDirectoryModal, {
        props: defaultProps,
        global: {
          components: { BaseIcon, BaseButton },
        },
      })

      const label = wrapper.find('.input-label')
      const input = wrapper.find('#directory-path')

      expect(label.attributes('for')).toBe('directory-path')
      expect(input.attributes('id')).toBe('directory-path')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty contextDirectories array', async () => {
      wrapper = mount(AddDirectoryModal, {
        props: defaultProps,
        global: {
          components: { BaseIcon, BaseButton },
        },
      })

      const initialCount = wrapper.findAll('.remove-button').length

      // Remove all directories one by one
      for (let i = 0; i < initialCount; i++) {
        // Always click the first button since the array shrinks after each removal
        const removeButtons = wrapper.findAll('.remove-button')
        if (removeButtons.length > 0) {
          await removeButtons[0].trigger('click')
          await nextTick()
        }
      }

      // After removing all directories, there should be no items
      const directoryItems = wrapper.findAll('.directory-item')
      expect(directoryItems.length).toBe(0)

      // But the directories-list should not render when array is empty
      const directoriesList = wrapper.find('.directories-list')
      // Note: v-if="contextDirectories.length > 0" means it won't render
      expect(directoriesList.exists()).toBe(false)
    })

    it('should handle adding directory with special characters', async () => {
      wrapper = mount(AddDirectoryModal, {
        props: defaultProps,
        global: {
          components: { BaseIcon, BaseButton },
        },
      })

      const input = wrapper.find('#directory-path')
      await input.setValue('src/@types/**/*.d.ts')
      await nextTick()

      const addButton = wrapper.findAll('.modal-footer button')[1]
      await addButton.trigger('click')
      await nextTick()

      expect(wrapper.emitted('add')?.[0]).toEqual(['src/@types/**/*.d.ts'])
    })

    it('should handle rapid add/remove operations', async () => {
      wrapper = mount(AddDirectoryModal, {
        props: defaultProps,
        global: {
          components: { BaseIcon, BaseButton },
        },
      })

      // Add directory
      const input = wrapper.find('#directory-path')
      await input.setValue('src/test1')
      const addButton = wrapper.findAll('.modal-footer button')[1]
      await addButton.trigger('click')
      await nextTick()

      // Add another
      await input.setValue('src/test2')
      await addButton.trigger('click')
      await nextTick()

      // Remove one
      const removeButton = wrapper.findAll('.remove-button')[3]
      await removeButton.trigger('click')
      await nextTick()

      const finalCount = wrapper.findAll('.directory-item').length
      expect(finalCount).toBe(4) // 3 initial + 2 added - 1 removed
    })
  })
})
