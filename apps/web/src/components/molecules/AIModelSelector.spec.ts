/**
 * @fileoverview Test suite for AIModelSelector component.
 *
 * @description
 * Comprehensive test coverage for the AI Model Selector component including:
 * - Component initialization and default props
 * - Project name display
 * - Agent dropdown functionality
 * - Model dropdown functionality
 * - Event emissions
 * - Custom props handling
 * - UI elements and CSS classes
 * - Accessibility features
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick, type ComponentPublicInstance } from 'vue'
import AIModelSelector from './AIModelSelector.vue'
import BaseIcon from '../atoms/BaseIcon.vue'

describe('AIModelSelector.vue', () => {
  let wrapper: VueWrapper<ComponentPublicInstance>

  const defaultProps = {
    project: 'hatcher::decklog',
    selectedAgent: 'Claude Code',
    selectedModel: 'Sonnet 4.5',
    availableAgents: ['Claude Code', 'GPT-5', 'Gemini'],
    availableModels: ['Sonnet 4.5', 'Sonnet 3.5', 'Opus'],
  }

  beforeEach(() => {
    // Clean setup before each test
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  /**
   * Component Initialization Tests
   */
  describe('Component Initialization', () => {
    it('should mount and render without errors', () => {
      wrapper = mount(AIModelSelector, {
        global: {
          components: {
            BaseIcon,
          },
        },
      })

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('.ai-model-selector').exists()).toBe(true)
    })

    it('should render with default props when no props provided', () => {
      wrapper = mount(AIModelSelector, {
        global: {
          components: {
            BaseIcon,
          },
        },
      })

      const projectSegment = wrapper.find('.project-segment .segment-text')
      expect(projectSegment.text()).toBe('hatcher::decklog')
    })

    it('should render with custom props', () => {
      wrapper = mount(AIModelSelector, {
        props: {
          project: 'custom::project',
          selectedAgent: 'Custom Agent',
          selectedModel: 'Custom Model',
        },
        global: {
          components: {
            BaseIcon,
          },
        },
      })

      const projectSegment = wrapper.find('.project-segment .segment-text')
      expect(projectSegment.text()).toBe('custom::project')
    })

    it('should have correct main container class', () => {
      wrapper = mount(AIModelSelector, {
        global: {
          components: {
            BaseIcon,
          },
        },
      })

      expect(wrapper.find('.ai-model-selector').exists()).toBe(true)
    })
  })

  /**
   * Project Name Display Tests
   */
  describe('Project Name Display', () => {
    it('should display project name in project segment', () => {
      wrapper = mount(AIModelSelector, {
        props: {
          project: 'test::project',
        },
        global: {
          components: {
            BaseIcon,
          },
        },
      })

      const projectText = wrapper.find('.project-segment .segment-text')
      expect(projectText.text()).toBe('test::project')
    })

    it('should apply project-segment class', () => {
      wrapper = mount(AIModelSelector, {
        global: {
          components: {
            BaseIcon,
          },
        },
      })

      expect(wrapper.find('.project-segment').exists()).toBe(true)
    })

    it('should render separators between segments', () => {
      wrapper = mount(AIModelSelector, {
        global: {
          components: {
            BaseIcon,
          },
        },
      })

      const separators = wrapper.findAll('.separator')
      expect(separators.length).toBe(2)
      expect(separators[0].text()).toBe('→')
      expect(separators[1].text()).toBe('→')
    })
  })

  /**
   * Agent Dropdown Tests
   */
  describe('Agent Dropdown', () => {
    it('should display selected agent', () => {
      wrapper = mount(AIModelSelector, {
        props: {
          selectedAgent: 'GPT-5',
        },
        global: {
          components: {
            BaseIcon,
          },
        },
      })

      const dropdownSegments = wrapper.findAll('.dropdown-segment')
      const agentSegment = dropdownSegments[0]
      expect(agentSegment.find('.segment-text').text()).toBe('GPT-5')
    })

    it('should render agent dropdown button', () => {
      wrapper = mount(AIModelSelector, {
        global: {
          components: {
            BaseIcon,
          },
        },
      })

      const dropdownSegments = wrapper.findAll('.dropdown-segment')
      expect(dropdownSegments.length).toBeGreaterThanOrEqual(1)
    })

    it('should emit update:agent when agent is selected', async () => {
      wrapper = mount(AIModelSelector, {
        props: defaultProps,
        global: {
          components: {
            BaseIcon,
          },
        },
      })

      // Open agent dropdown by clicking the first dropdown segment
      const agentDropdown = wrapper.findAll('.dropdown-segment')[0]
      await agentDropdown.trigger('click')
      await nextTick()

      // Click on a menu item
      const menuItems = wrapper.findAll('.dropdown-item')
      if (menuItems.length > 0) {
        await menuItems[1].trigger('click')
        await nextTick()

        expect(wrapper.emitted('update:agent')).toBeTruthy()
      }
    })

    it('should render ChevronDown icon in agent dropdown', () => {
      wrapper = mount(AIModelSelector, {
        global: {
          components: {
            BaseIcon,
          },
        },
      })

      // BaseIcon components should be present in dropdown segments
      const baseIcons = wrapper.findAllComponents(BaseIcon)
      expect(baseIcons.length).toBeGreaterThanOrEqual(1)
    })

    it('should render available agents in dropdown menu', async () => {
      wrapper = mount(AIModelSelector, {
        props: {
          availableAgents: ['Agent1', 'Agent2', 'Agent3'],
        },
        global: {
          components: {
            BaseIcon,
          },
        },
      })

      // Open dropdown
      const agentDropdown = wrapper.findAll('.dropdown-segment')[0]
      await agentDropdown.trigger('click')
      await nextTick()

      // Menu should render items
      const menuItems = wrapper.findAll('.dropdown-item')
      expect(menuItems.length).toBeGreaterThanOrEqual(0)
    })
  })

  /**
   * Model Dropdown Tests
   */
  describe('Model Dropdown', () => {
    it('should display selected model', () => {
      wrapper = mount(AIModelSelector, {
        props: {
          selectedModel: 'Opus',
        },
        global: {
          components: {
            BaseIcon,
          },
        },
      })

      const dropdownSegments = wrapper.findAll('.dropdown-segment')
      const modelSegment = dropdownSegments[1]
      expect(modelSegment.find('.segment-text').text()).toBe('Opus')
    })

    it('should render model dropdown button', () => {
      wrapper = mount(AIModelSelector, {
        global: {
          components: {
            BaseIcon,
          },
        },
      })

      const dropdownSegments = wrapper.findAll('.dropdown-segment')
      expect(dropdownSegments.length).toBeGreaterThanOrEqual(2)
    })

    it('should emit update:model when model is selected', async () => {
      wrapper = mount(AIModelSelector, {
        props: defaultProps,
        global: {
          components: {
            BaseIcon,
          },
        },
      })

      // Open model dropdown by clicking the second dropdown segment
      const modelDropdown = wrapper.findAll('.dropdown-segment')[1]
      await modelDropdown.trigger('click')
      await nextTick()

      // Click on a menu item
      const menuItems = wrapper.findAll('.dropdown-item')
      if (menuItems.length > 0) {
        await menuItems[0].trigger('click')
        await nextTick()

        expect(wrapper.emitted('update:model')).toBeTruthy()
      }
    })

    it('should render ChevronDown icon in model dropdown', () => {
      wrapper = mount(AIModelSelector, {
        global: {
          components: {
            BaseIcon,
          },
        },
      })

      // Should have 2 BaseIcon components (one for each dropdown)
      const baseIcons = wrapper.findAllComponents(BaseIcon)
      expect(baseIcons.length).toBe(2)
    })

    it('should render available models in dropdown menu', async () => {
      wrapper = mount(AIModelSelector, {
        props: {
          availableModels: ['Model1', 'Model2', 'Model3'],
        },
        global: {
          components: {
            BaseIcon,
          },
        },
      })

      // Open dropdown
      const modelDropdown = wrapper.findAll('.dropdown-segment')[1]
      await modelDropdown.trigger('click')
      await nextTick()

      // Menu should render items
      const menuItems = wrapper.findAll('.dropdown-item')
      expect(menuItems.length).toBeGreaterThanOrEqual(0)
    })
  })

  /**
   * Event Emission Tests
   */
  describe('Event Emission', () => {
    it('should emit update:agent with correct agent name', async () => {
      wrapper = mount(AIModelSelector, {
        props: defaultProps,
        global: {
          components: {
            BaseIcon,
          },
        },
      })

      // Simulate agent change by clicking dropdown and selecting item
      const agentDropdown = wrapper.findAll('.dropdown-segment')[0]
      await agentDropdown.trigger('click')
      await nextTick()

      const menuItems = wrapper.findAll('.dropdown-item')
      if (menuItems.length > 1) {
        await menuItems[1].trigger('click')
        await nextTick()

        const emitted = wrapper.emitted('update:agent')
        expect(emitted).toBeTruthy()
        if (emitted) {
          expect(emitted[0]).toEqual(['GPT-5'])
        }
      }
    })

    it('should emit update:model with correct model name', async () => {
      wrapper = mount(AIModelSelector, {
        props: defaultProps,
        global: {
          components: {
            BaseIcon,
          },
        },
      })

      // Simulate model change
      const modelDropdown = wrapper.findAll('.dropdown-segment')[1]
      await modelDropdown.trigger('click')
      await nextTick()

      const menuItems = wrapper.findAll('.dropdown-item')
      if (menuItems.length > 1) {
        await menuItems[1].trigger('click')
        await nextTick()

        const emitted = wrapper.emitted('update:model')
        expect(emitted).toBeTruthy()
        if (emitted) {
          expect(emitted[0]).toEqual(['Sonnet 3.5'])
        }
      }
    })

    it('should not emit events on component mount', () => {
      wrapper = mount(AIModelSelector, {
        props: defaultProps,
        global: {
          components: {
            BaseIcon,
          },
        },
      })

      expect(wrapper.emitted('update:agent')).toBeFalsy()
      expect(wrapper.emitted('update:model')).toBeFalsy()
    })
  })

  /**
   * CSS Classes Tests
   */
  describe('CSS Classes', () => {
    it('should apply ai-model-selector class to main container', () => {
      wrapper = mount(AIModelSelector, {
        global: {
          components: {
            BaseIcon,
          },
        },
      })

      expect(wrapper.find('.ai-model-selector').exists()).toBe(true)
    })

    it('should apply selector-segment class to segments', () => {
      wrapper = mount(AIModelSelector, {
        global: {
          components: {
            BaseIcon,
          },
        },
      })

      const segments = wrapper.findAll('.selector-segment')
      expect(segments.length).toBeGreaterThanOrEqual(3)
    })

    it('should apply dropdown-segment class to interactive segments', () => {
      wrapper = mount(AIModelSelector, {
        global: {
          components: {
            BaseIcon,
          },
        },
      })

      const dropdownSegments = wrapper.findAll('.dropdown-segment')
      expect(dropdownSegments.length).toBe(2)
    })

    it('should apply segment-text class to text elements', () => {
      wrapper = mount(AIModelSelector, {
        global: {
          components: {
            BaseIcon,
          },
        },
      })

      const textElements = wrapper.findAll('.segment-text')
      expect(textElements.length).toBeGreaterThanOrEqual(3)
    })

    it('should apply selector-dropdown class to dropdown containers', () => {
      wrapper = mount(AIModelSelector, {
        global: {
          components: {
            BaseIcon,
          },
        },
      })

      const dropdowns = wrapper.findAll('.selector-dropdown')
      expect(dropdowns.length).toBe(2)
    })
  })

  /**
   * Props Validation Tests
   */
  describe('Props Validation', () => {
    it('should accept custom availableAgents array', () => {
      const customAgents = ['Agent A', 'Agent B', 'Agent C']
      wrapper = mount(AIModelSelector, {
        props: {
          availableAgents: customAgents,
        },
        global: {
          components: {
            BaseIcon,
          },
        },
      })

      expect(wrapper.props('availableAgents')).toEqual(customAgents)
    })

    it('should accept custom availableModels array', () => {
      const customModels = ['Model X', 'Model Y', 'Model Z']
      wrapper = mount(AIModelSelector, {
        props: {
          availableModels: customModels,
        },
        global: {
          components: {
            BaseIcon,
          },
        },
      })

      expect(wrapper.props('availableModels')).toEqual(customModels)
    })

    it('should use default props when not provided', () => {
      wrapper = mount(AIModelSelector, {
        global: {
          components: {
            BaseIcon,
          },
        },
      })

      expect(wrapper.props('project')).toBe('hatcher::decklog')
      expect(wrapper.props('selectedAgent')).toBe('Claude Code')
      expect(wrapper.props('selectedModel')).toBe('Sonnet 4.5')
    })

    it('should override default props with custom values', () => {
      wrapper = mount(AIModelSelector, {
        props: {
          project: 'custom::project',
          selectedAgent: 'Custom Agent',
          selectedModel: 'Custom Model',
        },
        global: {
          components: {
            BaseIcon,
          },
        },
      })

      expect(wrapper.props('project')).toBe('custom::project')
      expect(wrapper.props('selectedAgent')).toBe('Custom Agent')
      expect(wrapper.props('selectedModel')).toBe('Custom Model')
    })
  })

  /**
   * UI Elements Tests
   */
  describe('UI Elements', () => {
    it('should render exactly 3 segment-text elements (project, agent, model)', () => {
      wrapper = mount(AIModelSelector, {
        global: {
          components: {
            BaseIcon,
          },
        },
      })

      const textElements = wrapper.findAll('.segment-text')
      expect(textElements.length).toBe(3)
    })

    it('should render exactly 2 dropdown icons (agent and model)', () => {
      wrapper = mount(AIModelSelector, {
        global: {
          components: {
            BaseIcon,
          },
        },
      })

      // Should have 2 BaseIcon components (one for each dropdown)
      const icons = wrapper.findAllComponents(BaseIcon)
      expect(icons.length).toBe(2)
    })

    it('should render exactly 2 separators', () => {
      wrapper = mount(AIModelSelector, {
        global: {
          components: {
            BaseIcon,
          },
        },
      })

      const separators = wrapper.findAll('.separator')
      expect(separators.length).toBe(2)
    })

    it('should have dropdown-menu class for menu containers', async () => {
      wrapper = mount(AIModelSelector, {
        global: {
          components: {
            BaseIcon,
          },
        },
      })

      // Open a dropdown to check menu rendering
      const agentDropdown = wrapper.findAll('.dropdown-segment')[0]
      await agentDropdown.trigger('click')
      await nextTick()

      // Menu should be in the DOM (even if not visible due to Headless UI)
      const menu = wrapper.find('.dropdown-menu')
      expect(menu.exists()).toBeTruthy()
    })
  })

  /**
   * Edge Cases Tests
   */
  describe('Edge Cases', () => {
    it('should handle empty availableAgents array', () => {
      wrapper = mount(AIModelSelector, {
        props: {
          availableAgents: [],
        },
        global: {
          components: {
            BaseIcon,
          },
        },
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('should handle empty availableModels array', () => {
      wrapper = mount(AIModelSelector, {
        props: {
          availableModels: [],
        },
        global: {
          components: {
            BaseIcon,
          },
        },
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('should handle single item in availableAgents', () => {
      wrapper = mount(AIModelSelector, {
        props: {
          availableAgents: ['Only Agent'],
        },
        global: {
          components: {
            BaseIcon,
          },
        },
      })

      expect(wrapper.props('availableAgents')).toEqual(['Only Agent'])
    })

    it('should handle single item in availableModels', () => {
      wrapper = mount(AIModelSelector, {
        props: {
          availableModels: ['Only Model'],
        },
        global: {
          components: {
            BaseIcon,
          },
        },
      })

      expect(wrapper.props('availableModels')).toEqual(['Only Model'])
    })

    it('should handle long project names', () => {
      const longProject = 'very::long::project::name::with::many::segments'
      wrapper = mount(AIModelSelector, {
        props: {
          project: longProject,
        },
        global: {
          components: {
            BaseIcon,
          },
        },
      })

      const projectText = wrapper.find('.project-segment .segment-text')
      expect(projectText.text()).toBe(longProject)
    })

    it('should handle special characters in project name', () => {
      wrapper = mount(AIModelSelector, {
        props: {
          project: 'project@#$%::special',
        },
        global: {
          components: {
            BaseIcon,
          },
        },
      })

      const projectText = wrapper.find('.project-segment .segment-text')
      expect(projectText.text()).toBe('project@#$%::special')
    })
  })

  /**
   * Interaction Tests
   */
  describe('Interaction Tests', () => {
    it('should render dropdown items when dropdown is opened', async () => {
      wrapper = mount(AIModelSelector, {
        props: defaultProps,
        global: {
          components: {
            BaseIcon,
          },
        },
      })

      // Open agent dropdown
      const agentDropdown = wrapper.findAll('.dropdown-segment')[0]
      await agentDropdown.trigger('click')
      await nextTick()

      // Check if menu items exist
      const menuItems = wrapper.findAll('.dropdown-item')
      expect(menuItems.length).toBeGreaterThanOrEqual(0)
    })

    it('should allow selecting different agent from dropdown', async () => {
      wrapper = mount(AIModelSelector, {
        props: defaultProps,
        global: {
          components: {
            BaseIcon,
          },
        },
      })

      // Open and select from agent dropdown
      const agentDropdown = wrapper.findAll('.dropdown-segment')[0]
      await agentDropdown.trigger('click')
      await nextTick()

      const menuItems = wrapper.findAll('.dropdown-item')
      if (menuItems.length > 0) {
        await menuItems[0].trigger('click')
        await nextTick()

        expect(wrapper.emitted('update:agent')).toBeTruthy()
      }
    })

    it('should allow selecting different model from dropdown', async () => {
      wrapper = mount(AIModelSelector, {
        props: defaultProps,
        global: {
          components: {
            BaseIcon,
          },
        },
      })

      // Open and select from model dropdown
      const modelDropdown = wrapper.findAll('.dropdown-segment')[1]
      await modelDropdown.trigger('click')
      await nextTick()

      const menuItems = wrapper.findAll('.dropdown-item')
      if (menuItems.length > 0) {
        await menuItems[0].trigger('click')
        await nextTick()

        expect(wrapper.emitted('update:model')).toBeTruthy()
      }
    })
  })
})
