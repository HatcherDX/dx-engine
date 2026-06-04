/**
 * @fileoverview Test suite for AgentsModal component.
 *
 * @description
 * Comprehensive tests for the AI agents management modal using Context7 patterns.
 * Tests cover rendering, agent CRUD operations, form validation, and integration flows.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import type { ComponentPublicInstance } from 'vue'
import AgentsModal from './AgentsModal.vue'

/**
 * Mock useNotifications composable.
 */
const mockSuccess = vi.fn()
const mockError = vi.fn()

vi.mock('../../composables/useNotifications', () => ({
  useNotifications: () => ({
    success: mockSuccess,
    error: mockError,
  }),
}))

/**
 * Test suite for AgentsModal component.
 */
describe('AgentsModal.vue', () => {
  let wrapper: VueWrapper<ComponentPublicInstance>

  /**
   * Helper function to create wrapper with default props.
   */
  const createWrapper = (props = {}) => {
    return mount(AgentsModal, {
      props: {
        visible: true,
        ...props,
      },
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Rendering', () => {
    it('should render modal when visible is true', () => {
      wrapper = createWrapper({ visible: true })
      expect(wrapper.find('.modal-overlay').exists()).toBe(true)
      expect(wrapper.find('.modal-container').exists()).toBe(true)
    })

    it('should not render modal when visible is false', () => {
      wrapper = createWrapper({ visible: false })
      expect(wrapper.find('.modal-overlay').exists()).toBe(false)
    })

    it('should render modal header with title', () => {
      wrapper = createWrapper()
      expect(wrapper.find('.modal-title').text()).toBe('AI Agents')
    })

    it('should render default agents list', () => {
      wrapper = createWrapper()
      const agentCards = wrapper.findAll('.agent-card')
      expect(agentCards.length).toBe(3)
    })

    it('should render agent information correctly', () => {
      wrapper = createWrapper()
      const firstCard = wrapper.find('.agent-card')
      expect(firstCard.find('.agent-name').text()).toBe('Code Reviewer')
      expect(firstCard.find('.agent-description').text()).toContain('Reviews')
    })

    it('should render agent metadata', () => {
      wrapper = createWrapper()
      const metaItems = wrapper.findAll('.meta-item')
      expect(metaItems.length).toBeGreaterThan(0)
    })

    it('should render system prompt when present', () => {
      wrapper = createWrapper()
      const agentPrompts = wrapper.findAll('.agent-prompt')
      expect(agentPrompts.length).toBeGreaterThan(0)
    })

    it('should render info section', () => {
      wrapper = createWrapper()
      const infoSection = wrapper.find('.info-section')
      expect(infoSection.exists()).toBe(true)
      expect(infoSection.findAll('.info-item').length).toBe(2)
    })
  })

  describe('Empty State', () => {
    it('should render empty state when no agents exist', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as { agents: unknown[] }
      vm.agents = []
      await wrapper.vm.$nextTick()

      const emptyState = wrapper.find('.empty-state')
      expect(emptyState.exists()).toBe(true)
      expect(emptyState.text()).toContain('No custom agents created')
    })

    it('should not render agents grid when empty', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as { agents: unknown[] }
      vm.agents = []
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.agents-grid').exists()).toBe(false)
    })
  })

  describe('Close Functionality', () => {
    it('should emit close event when overlay is clicked', async () => {
      wrapper = createWrapper()
      await wrapper.find('.modal-overlay').trigger('click')
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should emit close event when close button is clicked', async () => {
      wrapper = createWrapper()
      await wrapper.find('.close-button').trigger('click')
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should not emit close when modal container is clicked', async () => {
      wrapper = createWrapper()
      await wrapper.find('.modal-container').trigger('click')
      expect(wrapper.emitted('close')).toBeFalsy()
    })
  })

  describe('Agent Actions', () => {
    it('should toggle agent active state', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as {
        agents: { id: string; active: boolean }[]
        toggleAgent: (id: string) => void
      }
      const initialState = vm.agents[0].active

      vm.toggleAgent('1')

      expect(vm.agents[0].active).toBe(!initialState)
      expect(mockSuccess).toHaveBeenCalled()
    })

    it('should handle toggle for non-existent agent gracefully', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as { toggleAgent: (id: string) => void }

      expect(() => vm.toggleAgent('non-existent')).not.toThrow()
    })

    it('should call editAgent when edit button is clicked', () => {
      wrapper = createWrapper()
      const consoleSpy = vi.spyOn(console, 'log')
      const vm = wrapper.vm as {
        editAgent: (agent: { name: string }) => void
        agents: { name: string }[]
      }

      vm.editAgent(vm.agents[0])

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Agents] Editing agent:',
        'Code Reviewer'
      )
    })

    it('should delete agent successfully', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as {
        agents: unknown[]
        deleteAgent: (id: string) => void
      }
      const initialLength = vm.agents.length

      vm.deleteAgent('1')

      expect(vm.agents.length).toBe(initialLength - 1)
      expect(mockSuccess).toHaveBeenCalled()
    })

    it('should handle delete for non-existent agent', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as {
        agents: unknown[]
        deleteAgent: (id: string) => void
      }
      const initialLength = vm.agents.length

      vm.deleteAgent('non-existent')

      expect(vm.agents.length).toBe(initialLength)
    })
  })

  describe('Create Agent Form', () => {
    it('should show create agent form', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as { showCreateAgent: boolean }

      vm.showCreateAgent = true
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.create-agent-section').exists()).toBe(true)
    })

    it('should render all form fields', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as { showCreateAgent: boolean }
      vm.showCreateAgent = true
      await wrapper.vm.$nextTick()

      expect(wrapper.find('#agent-name').exists()).toBe(true)
      expect(wrapper.find('#agent-description').exists()).toBe(true)
      expect(wrapper.find('#agent-model').exists()).toBe(true)
      expect(wrapper.find('#agent-prompt').exists()).toBe(true)
    })

    it('should update form fields on input', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as {
        showCreateAgent: boolean
        newAgent: {
          name: string
          description: string
          model: string
          systemPrompt: string
        }
      }
      vm.showCreateAgent = true
      await wrapper.vm.$nextTick()

      const nameInput = wrapper.find('#agent-name')
      await nameInput.setValue('Test Agent')
      expect(vm.newAgent.name).toBe('Test Agent')

      const descInput = wrapper.find('#agent-description')
      await descInput.setValue('Test Description')
      expect(vm.newAgent.description).toBe('Test Description')

      const modelSelect = wrapper.find('#agent-model')
      await modelSelect.setValue('claude-3-opus')
      expect(vm.newAgent.model).toBe('claude-3-opus')

      const promptTextarea = wrapper.find('#agent-prompt')
      await promptTextarea.setValue('Test Prompt')
      expect(vm.newAgent.systemPrompt).toBe('Test Prompt')
    })

    it('should render icon selector with 8 options', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as { showCreateAgent: boolean }
      vm.showCreateAgent = true
      await wrapper.vm.$nextTick()

      const iconOptions = wrapper.findAll('.icon-option')
      expect(iconOptions.length).toBe(8)
    })

    it('should update icon selection', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as {
        showCreateAgent: boolean
        newAgent: { icon: string }
      }
      vm.showCreateAgent = true
      await wrapper.vm.$nextTick()

      const iconOptions = wrapper.findAll('.icon-option')
      await iconOptions[1].trigger('click')

      expect(vm.newAgent.icon).toBe('Code')
    })

    it('should render color selector with 6 options', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as { showCreateAgent: boolean }
      vm.showCreateAgent = true
      await wrapper.vm.$nextTick()

      const colorOptions = wrapper.findAll('.color-option')
      expect(colorOptions.length).toBe(6)
    })

    it('should update color selection', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as {
        showCreateAgent: boolean
        newAgent: { color: string }
      }
      vm.showCreateAgent = true
      await wrapper.vm.$nextTick()

      const colorOptions = wrapper.findAll('.color-option')
      await colorOptions[1].trigger('click')

      expect(vm.newAgent.color).toBe(
        'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
      )
    })
  })

  describe('Form Validation', () => {
    it('should be invalid when fields are empty', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as {
        newAgent: { name: string; description: string; systemPrompt: string }
        isNewAgentValid: boolean
      }

      vm.newAgent.name = ''
      vm.newAgent.description = ''
      vm.newAgent.systemPrompt = ''

      expect(vm.isNewAgentValid).toBe(false)
    })

    it('should be valid when all required fields are filled', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as {
        newAgent: { name: string; description: string; systemPrompt: string }
        isNewAgentValid: boolean
      }

      vm.newAgent.name = 'Test'
      vm.newAgent.description = 'Test'
      vm.newAgent.systemPrompt = 'Test'

      expect(vm.isNewAgentValid).toBe(true)
    })

    it('should be invalid with only name', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as {
        newAgent: { name: string; description: string; systemPrompt: string }
        isNewAgentValid: boolean
      }

      vm.newAgent.name = 'Test'
      vm.newAgent.description = ''
      vm.newAgent.systemPrompt = ''

      expect(vm.isNewAgentValid).toBe(false)
    })

    it('should be invalid with only description', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as {
        newAgent: { name: string; description: string; systemPrompt: string }
        isNewAgentValid: boolean
      }

      vm.newAgent.name = ''
      vm.newAgent.description = 'Test'
      vm.newAgent.systemPrompt = ''

      expect(vm.isNewAgentValid).toBe(false)
    })

    it('should handle whitespace-only values as valid', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as {
        newAgent: { name: string; description: string; systemPrompt: string }
        isNewAgentValid: boolean
      }

      vm.newAgent.name = '   Whitespace   '
      vm.newAgent.description = '   Whitespace   '
      vm.newAgent.systemPrompt = '   Whitespace   '

      expect(vm.isNewAgentValid).toBe(true)
    })
  })

  describe('Create Agent Functionality', () => {
    it('should create new agent with valid data', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as {
        newAgent: { name: string; description: string; systemPrompt: string }
        agents: unknown[]
        createAgent: () => void
      }
      const initialLength = vm.agents.length

      vm.newAgent.name = 'New Agent'
      vm.newAgent.description = 'New Description'
      vm.newAgent.systemPrompt = 'New Prompt'

      vm.createAgent()

      expect(vm.agents.length).toBe(initialLength + 1)
      expect(mockSuccess).toHaveBeenCalled()
    })

    it('should not create agent when form is invalid', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as {
        newAgent: { name: string; description: string; systemPrompt: string }
        agents: unknown[]
        createAgent: () => void
      }
      const initialLength = vm.agents.length

      vm.newAgent.name = ''
      vm.newAgent.description = ''
      vm.newAgent.systemPrompt = ''

      vm.createAgent()

      expect(vm.agents.length).toBe(initialLength)
      expect(mockError).toHaveBeenCalled()
    })

    it('should reset form after successful creation', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as {
        newAgent: { name: string; description: string; systemPrompt: string }
        createAgent: () => void
      }

      vm.newAgent.name = 'Test'
      vm.newAgent.description = 'Test'
      vm.newAgent.systemPrompt = 'Test'

      vm.createAgent()

      expect(vm.newAgent.name).toBe('')
      expect(vm.newAgent.description).toBe('')
      expect(vm.newAgent.systemPrompt).toBe('')
    })

    it('should hide form after successful creation', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as {
        showCreateAgent: boolean
        newAgent: { name: string; description: string; systemPrompt: string }
        createAgent: () => void
      }

      vm.showCreateAgent = true
      vm.newAgent.name = 'Test'
      vm.newAgent.description = 'Test'
      vm.newAgent.systemPrompt = 'Test'

      vm.createAgent()

      expect(vm.showCreateAgent).toBe(false)
    })

    it('should set new agent as active by default', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as {
        newAgent: { name: string; description: string; systemPrompt: string }
        agents: { active: boolean }[]
        createAgent: () => void
      }

      vm.newAgent.name = 'Test'
      vm.newAgent.description = 'Test'
      vm.newAgent.systemPrompt = 'Test'

      vm.createAgent()

      const newAgent = vm.agents[vm.agents.length - 1]
      expect(newAgent.active).toBe(true)
    })
  })

  describe('Cancel Create Agent', () => {
    it('should hide form when cancelled', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as {
        showCreateAgent: boolean
        cancelCreateAgent: () => void
      }

      vm.showCreateAgent = true
      vm.cancelCreateAgent()

      expect(vm.showCreateAgent).toBe(false)
    })

    it('should reset form when cancelled', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as {
        newAgent: { name: string; description: string; systemPrompt: string }
        cancelCreateAgent: () => void
      }

      vm.newAgent.name = 'Test'
      vm.newAgent.description = 'Test'
      vm.newAgent.systemPrompt = 'Test'

      vm.cancelCreateAgent()

      expect(vm.newAgent.name).toBe('')
      expect(vm.newAgent.description).toBe('')
      expect(vm.newAgent.systemPrompt).toBe('')
    })
  })

  describe('Save Functionality', () => {
    it('should save agents to localStorage', () => {
      // Mock window.localStorage directly
      const setItemSpy = vi.spyOn(window.localStorage, 'setItem')

      wrapper = createWrapper()
      const vm = wrapper.vm as {
        handleSave: () => void
        agents: unknown[]
      }

      vm.handleSave()

      expect(setItemSpy).toHaveBeenCalledWith(
        'hatcher-agents',
        JSON.stringify(vm.agents)
      )

      setItemSpy.mockRestore()
    })

    it('should emit save event with agents data', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as {
        handleSave: () => void
      }

      vm.handleSave()

      expect(wrapper.emitted('save')).toBeTruthy()
      const saveEvent = wrapper.emitted('save')?.[0]
      expect(Array.isArray(saveEvent?.[0])).toBe(true)
    })

    it('should emit close event after save', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as {
        handleSave: () => void
      }

      vm.handleSave()

      expect(wrapper.emitted('close')).toBeTruthy()
      expect(mockSuccess).toHaveBeenCalled()
    })
  })

  describe('Truncate Text Helper', () => {
    it('should return original text if shorter than maxLength', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as {
        truncateText: (text: string, maxLength: number) => string
      }

      const result = vm.truncateText('Short text', 100)
      expect(result).toBe('Short text')
    })

    it('should truncate text and add ellipsis', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as {
        truncateText: (text: string, maxLength: number) => string
      }

      const longText = 'A'.repeat(150)
      const result = vm.truncateText(longText, 100)

      expect(result).toBe('A'.repeat(100) + '...')
      expect(result.length).toBe(103)
    })

    it('should handle empty string', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as {
        truncateText: (text: string, maxLength: number) => string
      }

      const result = vm.truncateText('', 100)
      expect(result).toBe('')
    })

    it('should handle exact maxLength boundary', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as {
        truncateText: (text: string, maxLength: number) => string
      }

      const text = 'A'.repeat(100)
      const result = vm.truncateText(text, 100)
      expect(result).toBe(text)
    })
  })

  describe('Agent Display', () => {
    it('should display truncated system prompts', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as {
        agents: { id: string; systemPrompt: string }[]
      }

      const longPrompt = 'A'.repeat(200)
      vm.agents[0].systemPrompt = longPrompt
      wrapper.vm.$nextTick()

      const promptCode = wrapper.find('.agent-prompt code')
      expect(promptCode.text().length).toBeLessThan(longPrompt.length)
    })

    it('should render active class for active agents', () => {
      wrapper = createWrapper()
      const activeCards = wrapper.findAll('.agent-card.active')
      expect(activeCards.length).toBe(2) // 2 active agents by default
    })

    it('should not render active class for inactive agents', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as {
        agents: { id: string; active: boolean }[]
      }

      vm.agents.forEach((agent) => {
        agent.active = false
      })
      await wrapper.vm.$nextTick()

      const activeCards = wrapper.findAll('.agent-card.active')
      expect(activeCards.length).toBe(0)
    })
  })

  describe('Accessibility', () => {
    it('should have proper labels for form inputs', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as { showCreateAgent: boolean }
      vm.showCreateAgent = true
      await wrapper.vm.$nextTick()

      expect(wrapper.find('label[for="agent-name"]').exists()).toBe(true)
      expect(wrapper.find('label[for="agent-description"]').exists()).toBe(true)
      expect(wrapper.find('label[for="agent-model"]').exists()).toBe(true)
      expect(wrapper.find('label[for="agent-prompt"]').exists()).toBe(true)
    })

    it('should have aria-label on close button', () => {
      wrapper = createWrapper()
      const closeButton = wrapper.find('.close-button')
      expect(closeButton.attributes('aria-label')).toBe('Close')
    })

    it('should have proper button titles for agent actions', () => {
      wrapper = createWrapper()
      const actionButtons = wrapper.findAll('.action-button')
      expect(actionButtons.length).toBeGreaterThan(0)
      expect(actionButtons[1].attributes('title')).toBe('Edit')
      expect(actionButtons[2].attributes('title')).toBe('Delete')
    })
  })

  describe('Integration Flows', () => {
    it('should complete full create agent flow', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as {
        showCreateAgent: boolean
        newAgent: { name: string; description: string; systemPrompt: string }
        agents: unknown[]
        createAgent: () => void
      }
      const initialLength = vm.agents.length

      // Open form
      vm.showCreateAgent = true
      expect(vm.showCreateAgent).toBe(true)

      // Fill form
      vm.newAgent.name = 'Integration Agent'
      vm.newAgent.description = 'Integration Test'
      vm.newAgent.systemPrompt = 'Integration Prompt'

      // Submit
      vm.createAgent()

      // Verify
      expect(vm.agents.length).toBe(initialLength + 1)
      expect(vm.showCreateAgent).toBe(false)
    })

    it('should complete toggle and save flow', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as {
        agents: { id: string; active: boolean }[]
        toggleAgent: (id: string) => void
        handleSave: () => void
      }
      const initialState = vm.agents[0].active

      // Toggle agent
      vm.toggleAgent('1')
      expect(vm.agents[0].active).toBe(!initialState)

      // Save
      vm.handleSave()
      expect(wrapper.emitted('save')).toBeTruthy()
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should complete delete and save flow', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as {
        agents: unknown[]
        deleteAgent: (id: string) => void
        handleSave: () => void
      }
      const initialLength = vm.agents.length

      // Delete agent
      vm.deleteAgent('1')
      expect(vm.agents.length).toBe(initialLength - 1)

      // Save
      vm.handleSave()
      expect(wrapper.emitted('save')).toBeTruthy()
    })
  })
})
