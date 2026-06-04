/**
 * @fileoverview Comprehensive test suite for McpModal component.
 *
 * @description
 * Tests all functionality including modal visibility, server list management,
 * add server form, server actions (toggle, edit, remove), save functionality,
 * and localStorage integration.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick, type ComponentPublicInstance } from 'vue'
import McpModal from './McpModal.vue'
import BaseIcon from '../atoms/BaseIcon.vue'
import BaseButton from '../atoms/BaseButton.vue'

/**
 * Type definition for MCP Modal VM instance with servers property.
 */
interface ServerItem {
  id: string
  name: string
  description: string
  endpoint: string
  status: string
  enabled: boolean
  tools: number
  resources: number
}

interface McpModalVM {
  servers: ServerItem[]
  showAddForm: boolean
  editingServerId: string | null
  saveServers: () => void
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

describe('McpModal.vue', () => {
  let wrapper: VueWrapper<ComponentPublicInstance>
  let mockLocalStorage: Record<string, string>

  /**
   * Setup before each test.
   */
  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {}

    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          mockLocalStorage[key] = value
        }),
        removeItem: vi.fn((key: string) => {
          delete mockLocalStorage[key]
        }),
        clear: vi.fn(() => {
          mockLocalStorage = {}
        }),
      },
      writable: true,
    })

    // Mock console.log
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.restoreAllMocks()
  })

  /**
   * Helper to mount component.
   */
  const createWrapper = (props = {}, options = {}) => {
    return mount(McpModal, {
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

    it('should render modal title', () => {
      wrapper = createWrapper()
      expect(wrapper.find('.modal-title').text()).toBe('MCP Servers')
    })

    it('should render close button with aria-label', () => {
      wrapper = createWrapper()
      const closeButton = wrapper.find('.close-button')
      expect(closeButton.exists()).toBe(true)
      expect(closeButton.attributes('aria-label')).toBe('Close')
    })

    it('should render section title "Connected Servers"', () => {
      wrapper = createWrapper()
      expect(wrapper.find('.section-title').text()).toBe('Connected Servers')
    })

    it('should render info section with MCP information', () => {
      wrapper = createWrapper()
      const infoSection = wrapper.find('.info-section')
      expect(infoSection.exists()).toBe(true)
      expect(infoSection.text()).toContain('MCP servers extend Claude')
      expect(infoSection.text()).toContain('modelcontextprotocol.io')
    })

    it('should render footer with Close and Save buttons', () => {
      wrapper = createWrapper()
      const footer = wrapper.find('.modal-footer')
      expect(footer.exists()).toBe(true)
    })
  })

  describe('Server List', () => {
    it('should render 3 default servers', () => {
      wrapper = createWrapper()
      const serverCards = wrapper.findAll('.server-card')
      expect(serverCards).toHaveLength(3)
    })

    it('should display server names correctly', () => {
      wrapper = createWrapper()
      const serverNames = wrapper.findAll('.server-name')
      expect(serverNames[0].text()).toBe('GitHub MCP')
      expect(serverNames[1].text()).toBe('Database MCP')
      expect(serverNames[2].text()).toBe('Custom Tools')
    })

    it('should display server descriptions', () => {
      wrapper = createWrapper()
      const descriptions = wrapper.findAll('.server-description')
      expect(descriptions[0].text()).toBe(
        'GitHub repository access and operations'
      )
      expect(descriptions[1].text()).toBe(
        'PostgreSQL database queries and management'
      )
      expect(descriptions[2].text()).toBe(
        'Project-specific custom tools and utilities'
      )
    })

    it('should display server status badges', () => {
      wrapper = createWrapper()
      const statusBadges = wrapper.findAll('.status-badge')
      expect(statusBadges).toHaveLength(3)
      expect(statusBadges[0].text()).toBe('connected')
      expect(statusBadges[1].text()).toBe('connected')
      expect(statusBadges[2].text()).toBe('disconnected')
    })

    it('should apply correct status class for connected servers', () => {
      wrapper = createWrapper()
      const statusBadges = wrapper.findAll('.status-badge')
      expect(statusBadges[0].classes()).toContain('connected')
    })

    it('should apply correct status class for disconnected servers', () => {
      wrapper = createWrapper()
      const statusBadges = wrapper.findAll('.status-badge')
      expect(statusBadges[2].classes()).toContain('disconnected')
    })

    it('should display server stats (tools, resources, requests)', () => {
      wrapper = createWrapper()
      const statItems = wrapper.findAll('.stat-item')
      expect(statItems.length).toBeGreaterThan(0)
    })

    it('should display server endpoints', () => {
      wrapper = createWrapper()
      const endpoints = wrapper.findAll('.server-endpoint code')
      expect(endpoints[0].text()).toBe('http://localhost:3001/mcp')
      expect(endpoints[1].text()).toBe('http://localhost:3002/mcp')
      expect(endpoints[2].text()).toBe('http://localhost:3003/mcp')
    })

    it('should not display endpoint section when server has no endpoint', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as McpModalVM

      // Add a server without endpoint
      vm.servers.push({
        id: '4',
        name: 'No Endpoint Server',
        description: 'Server without endpoint',
        endpoint: '',
        status: 'disconnected',
        enabled: false,
        tools: 0,
        resources: 0,
        requests: 0,
      })
      await nextTick()

      const serverCards = wrapper.findAll('.server-card')
      const lastCard = serverCards[serverCards.length - 1]
      expect(lastCard.find('.server-endpoint').exists()).toBe(false)
    })

    it('should render action buttons for each server', () => {
      wrapper = createWrapper()
      const actionButtons = wrapper.findAll('.action-button')
      expect(actionButtons.length).toBeGreaterThan(0)
    })
  })

  describe('Empty State', () => {
    it('should show empty state when no servers exist', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as McpModalVM

      // Clear all servers
      vm.servers = []
      await nextTick()

      const emptyState = wrapper.find('.empty-state')
      expect(emptyState.exists()).toBe(true)
      expect(emptyState.text()).toContain('No MCP servers configured')
      expect(emptyState.text()).toContain(
        "Add a server to extend Claude's capabilities"
      )
    })

    it('should not show server list when empty', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as McpModalVM

      vm.servers = []
      await nextTick()

      expect(wrapper.find('.server-list').exists()).toBe(false)
    })
  })

  describe('Add Server Form', () => {
    it('should not show add server form initially', () => {
      wrapper = createWrapper()
      expect(wrapper.find('.add-server-section').exists()).toBe(false)
    })

    it('should show add server form when Add Server button is clicked', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      await nextTick()

      const addButton = wrapper
        .findAll('button')
        .find((btn) => btn.text().includes('Add Server'))
      await addButton!.trigger('click')
      await nextTick()

      expect(wrapper.find('.add-server-section').exists()).toBe(true)
    })

    it('should render form inputs for name, description, and endpoint', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as McpModalVM

      vm.showAddServer = true
      await nextTick()

      expect(wrapper.find('#server-name').exists()).toBe(true)
      expect(wrapper.find('#server-description').exists()).toBe(true)
      expect(wrapper.find('#server-endpoint').exists()).toBe(true)
    })

    it('should update newServer.name when typing in name input', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as McpModalVM

      vm.showAddServer = true
      await nextTick()

      const nameInput = wrapper.find('#server-name')
      await nameInput.setValue('Test Server')

      expect(vm.newServer.name).toBe('Test Server')
    })

    it('should update newServer.description when typing in description input', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as McpModalVM

      vm.showAddServer = true
      await nextTick()

      const descInput = wrapper.find('#server-description')
      await descInput.setValue('Test description')

      expect(vm.newServer.description).toBe('Test description')
    })

    it('should update newServer.endpoint when typing in endpoint input', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as McpModalVM

      vm.showAddServer = true
      await nextTick()

      const endpointInput = wrapper.find('#server-endpoint')
      await endpointInput.setValue('http://localhost:4000/mcp')

      expect(vm.newServer.endpoint).toBe('http://localhost:4000/mcp')
    })
  })

  describe('Form Validation', () => {
    it('should validate form is invalid when name is empty', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as McpModalVM

      vm.newServer.name = ''
      vm.newServer.endpoint = 'http://localhost:4000/mcp'

      expect(vm.isNewServerValid).toBe(false)
    })

    it('should validate form is invalid when endpoint is empty', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as McpModalVM

      vm.newServer.name = 'Test Server'
      vm.newServer.endpoint = ''

      expect(vm.isNewServerValid).toBe(false)
    })

    it('should validate form is valid when both name and endpoint are filled', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as McpModalVM

      vm.newServer.name = 'Test Server'
      vm.newServer.endpoint = 'http://localhost:4000/mcp'

      expect(vm.isNewServerValid).toBe(true)
    })

    it('should validate form is invalid when name is only whitespace', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as McpModalVM

      vm.newServer.name = '   '
      vm.newServer.endpoint = 'http://localhost:4000/mcp'

      expect(vm.isNewServerValid).toBe(false)
    })

    it('should validate form is invalid when endpoint is only whitespace', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as McpModalVM

      vm.newServer.name = 'Test Server'
      vm.newServer.endpoint = '   '

      expect(vm.isNewServerValid).toBe(false)
    })
  })

  describe('Add Server Functionality', () => {
    it('should add new server when form is valid', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as McpModalVM

      const initialLength = vm.servers.length

      vm.newServer.name = 'New Server'
      vm.newServer.description = 'New server description'
      vm.newServer.endpoint = 'http://localhost:4000/mcp'

      vm.addServer()
      await nextTick()

      expect(vm.servers).toHaveLength(initialLength + 1)
    })

    it('should not add server when form is invalid', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as McpModalVM

      const initialLength = vm.servers.length

      vm.newServer.name = ''
      vm.newServer.endpoint = ''

      vm.addServer()
      await nextTick()

      expect(vm.servers).toHaveLength(initialLength)
    })

    it('should create server with correct default values', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as McpModalVM

      vm.newServer.name = 'New Server'
      vm.newServer.description = 'New server description'
      vm.newServer.endpoint = 'http://localhost:4000/mcp'

      vm.addServer()
      await nextTick()

      const newServer = vm.servers[vm.servers.length - 1]
      expect(newServer.name).toBe('New Server')
      expect(newServer.description).toBe('New server description')
      expect(newServer.endpoint).toBe('http://localhost:4000/mcp')
      expect(newServer.status).toBe('disconnected')
      expect(newServer.enabled).toBe(false)
      expect(newServer.tools).toBe(0)
      expect(newServer.resources).toBe(0)
      expect(newServer.requests).toBe(0)
    })

    it('should hide add server form after adding server', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as McpModalVM

      vm.showAddServer = true
      vm.newServer.name = 'New Server'
      vm.newServer.endpoint = 'http://localhost:4000/mcp'

      vm.addServer()
      await nextTick()

      expect(vm.showAddServer).toBe(false)
    })

    it('should reset form after adding server', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as McpModalVM

      vm.newServer.name = 'New Server'
      vm.newServer.description = 'Description'
      vm.newServer.endpoint = 'http://localhost:4000/mcp'

      vm.addServer()
      await nextTick()

      expect(vm.newServer.name).toBe('')
      expect(vm.newServer.description).toBe('')
      expect(vm.newServer.endpoint).toBe('')
    })
  })

  describe('Cancel Add Server', () => {
    it('should hide form when cancel button is clicked', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as McpModalVM

      vm.showAddServer = true
      await nextTick()

      vm.cancelAddServer()
      await nextTick()

      expect(vm.showAddServer).toBe(false)
    })

    it('should reset form when cancelled', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as McpModalVM

      vm.showAddServer = true
      vm.newServer.name = 'Test'
      vm.newServer.description = 'Test desc'
      vm.newServer.endpoint = 'http://test'

      vm.cancelAddServer()
      await nextTick()

      expect(vm.newServer.name).toBe('')
      expect(vm.newServer.description).toBe('')
      expect(vm.newServer.endpoint).toBe('')
    })
  })

  describe('Toggle Server', () => {
    it('should toggle server enabled state from true to false', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as McpModalVM

      const server = vm.servers[0]
      const initialEnabled = server.enabled

      vm.toggleServer(server.id)
      await nextTick()

      expect(server.enabled).toBe(!initialEnabled)
    })

    it('should toggle server when toggle button is clicked', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      await nextTick()

      const vm = wrapper.vm as unknown as McpModalVM
      const server = vm.servers[0]
      const initialEnabled = server.enabled

      // Find the first action button (toggle button)
      const actionButtons = wrapper.findAll('.action-button')
      await actionButtons[0].trigger('click')
      await nextTick()

      expect(server.enabled).toBe(!initialEnabled)
    })

    it('should call editServer when edit button is clicked', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      await nextTick()

      const actionButtons = wrapper.findAll('.action-button')
      await actionButtons[1].trigger('click')
      await nextTick()

      expect(console.log).toHaveBeenCalled()
    })

    it('should remove server when remove button is clicked', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      await nextTick()

      const vm = wrapper.vm as unknown as McpModalVM
      const initialLength = vm.servers.length

      const actionButtons = wrapper.findAll('.action-button')
      await actionButtons[2].trigger('click')
      await nextTick()

      expect(vm.servers).toHaveLength(initialLength - 1)
    })

    it('should update status when toggling server', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as McpModalVM

      const server = vm.servers[0]
      server.enabled = true
      server.status = 'connected'

      vm.toggleServer(server.id)
      await nextTick()

      expect(server.status).toBe('disconnected')
    })

    it('should toggle disabled server to enabled', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as McpModalVM

      const server = vm.servers[2] // Custom Tools is disabled by default
      expect(server.enabled).toBe(false)

      vm.toggleServer(server.id)
      await nextTick()

      expect(server.enabled).toBe(true)
      expect(server.status).toBe('connected')
    })

    it('should do nothing when toggling non-existent server', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as McpModalVM

      const initialServers = [...vm.servers]

      vm.toggleServer('non-existent-id')
      await nextTick()

      expect(vm.servers).toEqual(initialServers)
    })
  })

  describe('Edit Server', () => {
    it('should call editServer and log server name', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as McpModalVM

      const server = vm.servers[0]
      vm.editServer(server)

      expect(console.log).toHaveBeenCalledWith(
        '[MCP] Editing server:',
        server.name
      )
    })
  })

  describe('Remove Server', () => {
    it('should remove server from list', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as McpModalVM

      const initialLength = vm.servers.length
      const serverId = vm.servers[0].id

      vm.removeServer(serverId)
      await nextTick()

      expect(vm.servers).toHaveLength(initialLength - 1)
    })

    it('should not remove non-existent server', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as McpModalVM

      const initialLength = vm.servers.length

      vm.removeServer('non-existent-id')
      await nextTick()

      expect(vm.servers).toHaveLength(initialLength)
    })

    it('should remove correct server by id', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as McpModalVM

      const serverToRemove = vm.servers[1]

      vm.removeServer(serverToRemove.id)
      await nextTick()

      const stillExists = vm.servers.find(
        (s: ServerItem) => s.id === serverToRemove.id
      )
      expect(stillExists).toBeUndefined()
    })
  })

  describe('Status Class Helper', () => {
    it('should return "connected" for connected status', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as McpModalVM

      expect(vm.getStatusClass('connected')).toBe('connected')
    })

    it('should return "disconnected" for disconnected status', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as McpModalVM

      expect(vm.getStatusClass('disconnected')).toBe('disconnected')
    })

    it('should return "error" for error status', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as McpModalVM

      expect(vm.getStatusClass('error')).toBe('error')
    })
  })

  describe('Save Functionality', () => {
    it('should save servers to localStorage when handleSave is called', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as McpModalVM

      vm.handleSave()
      await nextTick()

      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        'hatcher-mcp-servers',
        expect.any(String)
      )
    })

    it('should emit save event with servers array', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as McpModalVM

      vm.handleSave()
      await nextTick()

      expect(wrapper.emitted('save')).toBeTruthy()
      expect(wrapper.emitted('save')![0][0]).toEqual(vm.servers)
    })

    it('should emit close event after saving', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as McpModalVM

      vm.handleSave()
      await nextTick()

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should save correct server data structure', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as McpModalVM

      vm.handleSave()
      await nextTick()

      const savedData = JSON.parse(
        (
          window.localStorage.setItem as unknown as {
            mock: { calls: Array<[string, string]> }
          }
        ).mock.calls[0][1]
      )
      expect(Array.isArray(savedData)).toBe(true)
      expect(savedData[0]).toHaveProperty('id')
      expect(savedData[0]).toHaveProperty('name')
      expect(savedData[0]).toHaveProperty('endpoint')
      expect(savedData[0]).toHaveProperty('status')
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
      const vm = wrapper.vm as unknown as McpModalVM

      vm.handleOverlayClick()

      expect(wrapper.emitted('close')).toBeTruthy()
    })
  })

  describe('Component Lifecycle', () => {
    it('should initialize with 3 default servers', () => {
      wrapper = createWrapper({ visible: false })
      const vm = wrapper.vm as unknown as McpModalVM

      expect(vm.servers).toHaveLength(3)
    })

    it('should initialize with showAddServer as false', () => {
      wrapper = createWrapper({ visible: false })
      const vm = wrapper.vm as unknown as McpModalVM

      expect(vm.showAddServer).toBe(false)
    })

    it('should initialize with empty newServer form', () => {
      wrapper = createWrapper({ visible: false })
      const vm = wrapper.vm as unknown as McpModalVM

      expect(vm.newServer).toEqual({
        name: '',
        description: '',
        endpoint: '',
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

    it('should have proper labels for form inputs', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as McpModalVM

      vm.showAddServer = true
      await nextTick()

      expect(wrapper.find('label[for="server-name"]').exists()).toBe(true)
      expect(wrapper.find('label[for="server-description"]').exists()).toBe(
        true
      )
      expect(wrapper.find('label[for="server-endpoint"]').exists()).toBe(true)
    })

    it('should have proper input ids', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as McpModalVM

      vm.showAddServer = true
      await nextTick()

      expect(wrapper.find('#server-name').exists()).toBe(true)
      expect(wrapper.find('#server-description').exists()).toBe(true)
      expect(wrapper.find('#server-endpoint').exists()).toBe(true)
    })
  })

  describe('Integration Tests', () => {
    it('should complete full workflow: add server and save', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      await nextTick()

      const vm = wrapper.vm as unknown as McpModalVM
      const initialLength = vm.servers.length

      // Open add server form
      vm.showAddServer = true
      await nextTick()

      // Fill form
      vm.newServer.name = 'Integration Test Server'
      vm.newServer.description = 'Test Description'
      vm.newServer.endpoint = 'http://localhost:5000/mcp'

      // Add server
      vm.addServer()
      await nextTick()

      expect(vm.servers).toHaveLength(initialLength + 1)

      // Save
      vm.handleSave()
      await nextTick()

      expect(window.localStorage.setItem).toHaveBeenCalled()
      expect(wrapper.emitted('save')).toBeTruthy()
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should complete full workflow: toggle and remove server', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as McpModalVM

      const server = vm.servers[0]
      const initialEnabled = server.enabled
      const initialLength = vm.servers.length

      // Toggle server
      vm.toggleServer(server.id)
      await nextTick()

      expect(server.enabled).toBe(!initialEnabled)

      // Remove server
      vm.removeServer(server.id)
      await nextTick()

      expect(vm.servers).toHaveLength(initialLength - 1)
    })
  })

  describe('Edge Cases', () => {
    it('should handle rapid server toggles', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as McpModalVM

      const server = vm.servers[0]
      const initialEnabled = server.enabled

      vm.toggleServer(server.id)
      vm.toggleServer(server.id)
      vm.toggleServer(server.id)
      await nextTick()

      expect(server.enabled).toBe(!initialEnabled)
    })

    it('should handle removing all servers', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as McpModalVM

      while (vm.servers.length > 0) {
        vm.removeServer(vm.servers[0].id)
      }
      await nextTick()

      expect(vm.servers).toHaveLength(0)
      expect(wrapper.find('.empty-state').exists()).toBe(true)
    })

    it('should handle form submission with invalid data', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as McpModalVM

      const initialLength = vm.servers.length

      vm.newServer.name = ''
      vm.newServer.endpoint = ''

      vm.addServer()
      await nextTick()

      expect(vm.servers).toHaveLength(initialLength)
    })
  })
})
