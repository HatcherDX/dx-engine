/**
 * @fileoverview Comprehensive test suite for InitModal component.
 *
 * @description
 * Tests all functionality including modal visibility, template selection,
 * project configuration, options management, and initialization flow.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick, type ComponentPublicInstance } from 'vue'
import InitModal from './InitModal.vue'
import BaseIcon from '../atoms/BaseIcon.vue'
import BaseButton from '../atoms/BaseButton.vue'

/**
 * Type definition for Init Modal VM instance.
 */
interface InitModalVM {
  selectedTemplate: string
  projectName: string
  projectPath: string
  currentStep: number
  options: Record<string, unknown>
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

describe('InitModal.vue', () => {
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
    return mount(InitModal, {
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

    it('should render modal title "Initialize Project"', () => {
      wrapper = createWrapper()
      expect(wrapper.find('.modal-title').text()).toBe('Initialize Project')
    })

    it('should render close button with aria-label', () => {
      wrapper = createWrapper()
      const closeButton = wrapper.find('.close-button')
      expect(closeButton.exists()).toBe(true)
      expect(closeButton.attributes('aria-label')).toBe('Close')
    })

    it('should render all 4 template cards', () => {
      wrapper = createWrapper()
      const templateCards = wrapper.findAll('.template-card')
      expect(templateCards).toHaveLength(4)
    })

    it('should render General template card', () => {
      wrapper = createWrapper()
      const templateNames = wrapper.findAll('.template-name')
      expect(templateNames[0].text()).toBe('General')
    })

    it('should render Web App template card', () => {
      wrapper = createWrapper()
      const templateNames = wrapper.findAll('.template-name')
      expect(templateNames[1].text()).toBe('Web App')
    })

    it('should render API/Backend template card', () => {
      wrapper = createWrapper()
      const templateNames = wrapper.findAll('.template-name')
      expect(templateNames[2].text()).toBe('API/Backend')
    })

    it('should render Library template card', () => {
      wrapper = createWrapper()
      const templateNames = wrapper.findAll('.template-name')
      expect(templateNames[3].text()).toBe('Library')
    })

    it('should render template descriptions', () => {
      wrapper = createWrapper()
      const descriptions = wrapper.findAll('.template-desc')
      expect(descriptions[0].text()).toBe('Basic template for any project')
      expect(descriptions[1].text()).toBe('Frontend/fullstack web application')
      expect(descriptions[2].text()).toBe('REST API or backend service')
      expect(descriptions[3].text()).toBe('Reusable library or package')
    })

    it('should render project name input', () => {
      wrapper = createWrapper()
      const projectNameInput = wrapper.find('#project-name')
      expect(projectNameInput.exists()).toBe(true)
      expect(projectNameInput.attributes('placeholder')).toBe(
        'my-awesome-project'
      )
    })

    it('should render project description textarea', () => {
      wrapper = createWrapper()
      const projectDescTextarea = wrapper.find('#project-desc')
      expect(projectDescTextarea.exists()).toBe(true)
      expect(projectDescTextarea.attributes('placeholder')).toContain(
        'A brief description of your project'
      )
    })

    it('should render custom instructions textarea', () => {
      wrapper = createWrapper()
      const textareas = wrapper.findAll('.textarea')
      expect(textareas.length).toBeGreaterThanOrEqual(2)
    })

    it('should render hint for custom instructions', () => {
      wrapper = createWrapper()
      const hint = wrapper.find('.hint')
      expect(hint.text()).toContain(
        'These instructions will be added to CLAUDE.md'
      )
    })

    it('should render includeGitignore checkbox', () => {
      wrapper = createWrapper()
      const checkboxes = wrapper.findAll('input[type="checkbox"]')
      expect(checkboxes.length).toBeGreaterThanOrEqual(2)
    })

    it('should render createBackup checkbox', () => {
      wrapper = createWrapper()
      const checkboxes = wrapper.findAll('input[type="checkbox"]')
      expect(checkboxes).toHaveLength(2)
    })

    it('should render checkbox labels', () => {
      wrapper = createWrapper()
      const checkboxLabels = wrapper.findAll('.checkbox span')
      expect(checkboxLabels[0].text()).toBe('Add CLAUDE.md to .gitignore')
      expect(checkboxLabels[1].text()).toBe('Create backup if CLAUDE.md exists')
    })

    it('should render Cancel button', () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      const buttons = wrapper.findAll('button')
      const cancelButton = buttons.find((btn) => btn.text().includes('Cancel'))
      expect(cancelButton).toBeTruthy()
    })

    it('should render Initialize Project button', () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      const buttons = wrapper.findAll('button')
      const initButton = buttons.find((btn) =>
        btn.text().includes('Initialize Project')
      )
      expect(initButton).toBeTruthy()
    })
  })

  describe('Template Selection', () => {
    it('should have General template selected by default', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as InitModalVM
      expect(vm.selectedTemplate).toBe('general')
    })

    it('should mark General template card as active by default', () => {
      wrapper = createWrapper()
      const templateCards = wrapper.findAll('.template-card')
      expect(templateCards[0].classes()).toContain('active')
    })

    it('should change selected template when clicking Web App card', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as InitModalVM
      const templateCards = wrapper.findAll('.template-card')

      await templateCards[1].trigger('click')
      expect(vm.selectedTemplate).toBe('web')
    })

    it('should change selected template when clicking API/Backend card', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as InitModalVM
      const templateCards = wrapper.findAll('.template-card')

      await templateCards[2].trigger('click')
      expect(vm.selectedTemplate).toBe('api')
    })

    it('should change selected template when clicking Library card', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as InitModalVM
      const templateCards = wrapper.findAll('.template-card')

      await templateCards[3].trigger('click')
      expect(vm.selectedTemplate).toBe('library')
    })

    it('should update active class when template changes', async () => {
      wrapper = createWrapper()
      const templateCards = wrapper.findAll('.template-card')

      await templateCards[1].trigger('click')
      await nextTick()

      expect(templateCards[0].classes()).not.toContain('active')
      expect(templateCards[1].classes()).toContain('active')
    })

    it('should allow switching between templates multiple times', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as InitModalVM
      const templateCards = wrapper.findAll('.template-card')

      await templateCards[1].trigger('click')
      expect(vm.selectedTemplate).toBe('web')

      await templateCards[2].trigger('click')
      expect(vm.selectedTemplate).toBe('api')

      await templateCards[0].trigger('click')
      expect(vm.selectedTemplate).toBe('general')
    })
  })

  describe('Form Inputs', () => {
    it('should initialize with empty project name', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as InitModalVM
      expect(vm.projectName).toBe('')
    })

    it('should initialize with empty project description', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as InitModalVM
      expect(vm.projectDesc).toBe('')
    })

    it('should initialize with empty custom instructions', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as InitModalVM
      expect(vm.customInstructions).toBe('')
    })

    it('should bind project name input with v-model', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as InitModalVM
      const input = wrapper.find('#project-name')

      await input.setValue('my-project')
      expect(vm.projectName).toBe('my-project')
    })

    it('should bind project description textarea with v-model', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as InitModalVM
      const textarea = wrapper.find('#project-desc')

      await textarea.setValue('My project description')
      expect(vm.projectDesc).toBe('My project description')
    })

    it('should bind custom instructions textarea with v-model', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as InitModalVM
      const textareas = wrapper.findAll('.textarea')

      await textareas[1].setValue('Use TypeScript strict mode')
      expect(vm.customInstructions).toBe('Use TypeScript strict mode')
    })
  })

  describe('Checkbox Options', () => {
    it('should have includeGitignore checked by default', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as InitModalVM
      expect(vm.includeGitignore).toBe(true)
    })

    it('should have createBackup checked by default', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as InitModalVM
      expect(vm.createBackup).toBe(true)
    })

    it('should toggle includeGitignore checkbox', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as InitModalVM
      const checkboxes = wrapper.findAll('input[type="checkbox"]')

      await checkboxes[0].setValue(false)
      expect(vm.includeGitignore).toBe(false)

      await checkboxes[0].setValue(true)
      expect(vm.includeGitignore).toBe(true)
    })

    it('should toggle createBackup checkbox', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as InitModalVM
      const checkboxes = wrapper.findAll('input[type="checkbox"]')

      await checkboxes[1].setValue(false)
      expect(vm.createBackup).toBe(false)

      await checkboxes[1].setValue(true)
      expect(vm.createBackup).toBe(true)
    })
  })

  describe('Button Disabled State', () => {
    it('should have Initialize button disabled when project name is empty', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      const vm = wrapper.vm as unknown as InitModalVM

      vm.projectName = ''
      await nextTick()

      const buttons = wrapper.findAll('button')
      const initButton = buttons.find((btn) =>
        btn.text().includes('Initialize Project')
      )
      expect(initButton?.attributes('disabled')).toBeDefined()
    })

    it('should enable Initialize button when project name is provided', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      const vm = wrapper.vm as unknown as InitModalVM

      vm.projectName = 'my-project'
      await nextTick()

      const buttons = wrapper.findAll('button')
      const initButton = buttons.find((btn) =>
        btn.text().includes('Initialize Project')
      )
      expect(initButton?.attributes('disabled')).toBeUndefined()
    })
  })

  describe('Initialization Functionality', () => {
    it('should emit init event when handleInit is called', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as InitModalVM

      vm.projectName = 'test-project'
      vm.handleInit()

      expect(wrapper.emitted('init')).toBeTruthy()
    })

    it('should emit init with all required data', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as InitModalVM

      vm.selectedTemplate = 'web'
      vm.projectName = 'my-web-app'
      vm.projectDesc = 'A cool web app'
      vm.customInstructions = 'Use React hooks'
      vm.includeGitignore = false
      vm.createBackup = false

      vm.handleInit()
      await nextTick()

      expect(wrapper.emitted('init')![0]).toEqual([
        {
          template: 'web',
          projectName: 'my-web-app',
          projectDesc: 'A cool web app',
          customInstructions: 'Use React hooks',
          includeGitignore: false,
          createBackup: false,
        },
      ])
    })

    it('should emit init with customInstructions as undefined when empty', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as InitModalVM

      vm.projectName = 'test-project'
      vm.customInstructions = ''

      vm.handleInit()
      await nextTick()

      const emittedData = wrapper.emitted('init')![0][0] as Record<
        string,
        unknown
      >
      expect(emittedData.customInstructions).toBeUndefined()
    })

    it('should emit close event after init', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as InitModalVM

      vm.projectName = 'test-project'
      vm.handleInit()
      await nextTick()

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should call handleInit when Initialize button is clicked', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      const vm = wrapper.vm as unknown as InitModalVM

      vm.projectName = 'test-project'
      await nextTick()

      const buttons = wrapper.findAll('button')
      const initButton = buttons.find((btn) =>
        btn.text().includes('Initialize Project')
      )
      await initButton!.trigger('click')
      await nextTick()

      expect(wrapper.emitted('init')).toBeTruthy()
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
      const vm = wrapper.vm as unknown as InitModalVM

      vm.handleOverlayClick()

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should emit close when Cancel button is clicked', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      await nextTick()

      const buttons = wrapper.findAll('button')
      const cancelButton = buttons.find((btn) => btn.text().includes('Cancel'))
      await cancelButton!.trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
    })
  })

  describe('Component Lifecycle', () => {
    it('should initialize with correct default values', () => {
      wrapper = createWrapper({ visible: false })
      const vm = wrapper.vm as unknown as InitModalVM

      expect(vm.selectedTemplate).toBe('general')
      expect(vm.projectName).toBe('')
      expect(vm.projectDesc).toBe('')
      expect(vm.customInstructions).toBe('')
      expect(vm.includeGitignore).toBe(true)
      expect(vm.createBackup).toBe(true)
    })

    it('should have templates array with 4 items', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as InitModalVM

      expect(vm.templates).toHaveLength(4)
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

    it('should have proper label for project name input', () => {
      wrapper = createWrapper()
      const labels = wrapper.findAll('.label')
      expect(labels[0].text()).toBe('Project Name')
    })

    it('should have proper label for project description', () => {
      wrapper = createWrapper()
      const labels = wrapper.findAll('.label')
      expect(labels[1].text()).toBe('Description')
    })

    it('should have proper id on project name input', () => {
      wrapper = createWrapper()
      const input = wrapper.find('#project-name')
      expect(input.attributes('id')).toBe('project-name')
    })

    it('should have proper id on project description textarea', () => {
      wrapper = createWrapper()
      const textarea = wrapper.find('#project-desc')
      expect(textarea.attributes('id')).toBe('project-desc')
    })

    it('should have checkboxes wrapped in labels', () => {
      wrapper = createWrapper()
      const checkboxLabels = wrapper.findAll('.checkbox')
      expect(checkboxLabels).toHaveLength(2)
      expect(checkboxLabels[0].find('input[type="checkbox"]').exists()).toBe(
        true
      )
      expect(checkboxLabels[1].find('input[type="checkbox"]').exists()).toBe(
        true
      )
    })
  })

  describe('Integration Tests', () => {
    it('should complete full workflow: select template, fill form, and initialize', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      await nextTick()

      // Select Web App template
      const templateCards = wrapper.findAll('.template-card')
      await templateCards[1].trigger('click')

      // Fill project info
      const projectNameInput = wrapper.find('#project-name')
      const projectDescTextarea = wrapper.find('#project-desc')
      await projectNameInput.setValue('my-web-app')
      await projectDescTextarea.setValue('A modern web application')

      // Fill custom instructions
      const textareas = wrapper.findAll('.textarea')
      await textareas[1].setValue('Use TypeScript strict mode')

      // Toggle checkboxes
      const checkboxes = wrapper.findAll('input[type="checkbox"]')
      await checkboxes[0].setValue(false)

      // Click Initialize
      const buttons = wrapper.findAll('button')
      const initButton = buttons.find((btn) =>
        btn.text().includes('Initialize Project')
      )
      await initButton!.trigger('click')
      await nextTick()

      // Verify emissions
      expect(wrapper.emitted('init')).toBeTruthy()
      expect(wrapper.emitted('init')![0]).toEqual([
        {
          template: 'web',
          projectName: 'my-web-app',
          projectDesc: 'A modern web application',
          customInstructions: 'Use TypeScript strict mode',
          includeGitignore: false,
          createBackup: true,
        },
      ])
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should complete workflow with minimal data', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      await nextTick()

      // Only fill project name (minimum required)
      const projectNameInput = wrapper.find('#project-name')
      await projectNameInput.setValue('minimal-project')

      // Click Initialize
      const buttons = wrapper.findAll('button')
      const initButton = buttons.find((btn) =>
        btn.text().includes('Initialize Project')
      )
      await initButton!.trigger('click')
      await nextTick()

      // Verify emissions
      expect(wrapper.emitted('init')).toBeTruthy()
      const emittedData = wrapper.emitted('init')![0][0] as Record<
        string,
        unknown
      >
      expect(emittedData.projectName).toBe('minimal-project')
      expect(emittedData.customInstructions).toBeUndefined()
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should allow cancel without initialization', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      await nextTick()

      // Fill some data
      const projectNameInput = wrapper.find('#project-name')
      await projectNameInput.setValue('test-project')

      // Click Cancel
      const buttons = wrapper.findAll('button')
      const cancelButton = buttons.find((btn) => btn.text().includes('Cancel'))
      await cancelButton!.trigger('click')

      // Verify only close was emitted
      expect(wrapper.emitted('init')).toBeFalsy()
      expect(wrapper.emitted('close')).toBeTruthy()
    })
  })

  describe('Edge Cases', () => {
    it('should handle rapid template switches', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as InitModalVM
      const templateCards = wrapper.findAll('.template-card')

      await templateCards[0].trigger('click')
      await templateCards[1].trigger('click')
      await templateCards[2].trigger('click')
      await templateCards[3].trigger('click')

      expect(vm.selectedTemplate).toBe('library')
    })

    it('should handle checkbox rapid toggles', async () => {
      wrapper = createWrapper()
      const checkboxes = wrapper.findAll('input[type="checkbox"]')

      await checkboxes[0].setValue(false)
      await checkboxes[0].setValue(true)
      await checkboxes[0].setValue(false)

      expect((checkboxes[0].element as HTMLInputElement).checked).toBe(false)
    })

    it('should handle empty custom instructions correctly', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as InitModalVM

      vm.projectName = 'test-project'
      vm.customInstructions = ''

      vm.handleInit()

      const emittedData = wrapper.emitted('init')![0][0] as Record<
        string,
        unknown
      >
      expect(emittedData.customInstructions).toBeUndefined()
    })

    it('should handle whitespace-only custom instructions', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as InitModalVM

      vm.projectName = 'test-project'
      vm.customInstructions = '   '

      vm.handleInit()

      const emittedData = wrapper.emitted('init')![0][0] as Record<
        string,
        unknown
      >
      expect(emittedData.customInstructions).toBe('   ') // Not undefined because it has content
    })

    it('should handle very long project names', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as InitModalVM
      const longName = 'a'.repeat(200)

      vm.projectName = longName
      vm.handleInit()

      const emittedData = wrapper.emitted('init')![0][0] as Record<
        string,
        unknown
      >
      expect(emittedData.projectName).toBe(longName)
    })

    it('should handle special characters in project name', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as InitModalVM

      vm.projectName = 'my-project_v2.0'
      vm.handleInit()

      const emittedData = wrapper.emitted('init')![0][0] as Record<
        string,
        unknown
      >
      expect(emittedData.projectName).toBe('my-project_v2.0')
    })

    it('should handle multiple initialization attempts', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as InitModalVM

      vm.projectName = 'test-project'

      vm.handleInit()
      vm.handleInit()
      vm.handleInit()

      expect(wrapper.emitted('init')).toHaveLength(3)
      expect(wrapper.emitted('close')).toHaveLength(3)
    })
  })

  describe('Templates Array', () => {
    it('should have correct template IDs', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as InitModalVM

      expect(vm.templates[0].id).toBe('general')
      expect(vm.templates[1].id).toBe('web')
      expect(vm.templates[2].id).toBe('api')
      expect(vm.templates[3].id).toBe('library')
    })

    it('should have correct template icons', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as InitModalVM

      expect(vm.templates[0].icon).toBe('FileText')
      expect(vm.templates[1].icon).toBe('Globe')
      expect(vm.templates[2].icon).toBe('Server')
      expect(vm.templates[3].icon).toBe('Package')
    })
  })
})
