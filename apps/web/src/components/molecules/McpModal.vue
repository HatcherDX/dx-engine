<!--
/**
 * @fileoverview MCP server management modal.
 *
 * @description
 * Modal for managing Model Context Protocol (MCP) server connections.
 * Allows users to view, add, configure, and remove MCP servers that extend
 * Claude's capabilities with custom tools and resources.
 *
 * @example
 * <McpModal
 *   :visible="showMcp"
 *   @close="showMcp = false"
 *   @save="handleSaveMcp"
 * />
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */
-->

<template>
  <div v-if="visible" class="modal-overlay" @click="handleOverlayClick">
    <div class="modal-container" @click.stop>
      <!-- Header -->
      <div class="modal-header">
        <div class="header-content">
          <BaseIcon name="Cpu" size="md" class="header-icon" />
          <h2 class="modal-title">MCP Servers</h2>
        </div>
        <button class="close-button" aria-label="Close" @click="$emit('close')">
          <BaseIcon name="X" size="sm" />
        </button>
      </div>

      <!-- Content -->
      <div class="modal-content">
        <!-- Server List -->
        <div class="servers-section">
          <div class="section-header">
            <h3 class="section-title">Connected Servers</h3>
            <BaseButton
              variant="primary"
              size="sm"
              @click="showAddServer = true"
            >
              <BaseIcon name="Plus" size="xs" />
              Add Server
            </BaseButton>
          </div>

          <div v-if="servers.length === 0" class="empty-state">
            <BaseIcon name="ServerOff" size="lg" />
            <p>No MCP servers configured</p>
            <span>Add a server to extend Claude's capabilities</span>
          </div>

          <div v-else class="server-list">
            <div v-for="server in servers" :key="server.id" class="server-card">
              <div class="server-header">
                <div class="server-info">
                  <div class="server-name-row">
                    <h4 class="server-name">{{ server.name }}</h4>
                    <span
                      class="status-badge"
                      :class="getStatusClass(server.status)"
                    >
                      {{ server.status }}
                    </span>
                  </div>
                  <p class="server-description">{{ server.description }}</p>
                </div>
                <div class="server-actions">
                  <button
                    class="action-button"
                    :title="server.enabled ? 'Disable' : 'Enable'"
                    @click="toggleServer(server.id)"
                  >
                    <BaseIcon
                      :name="server.enabled ? 'Power' : 'PowerOff'"
                      size="sm"
                    />
                  </button>
                  <button
                    class="action-button"
                    title="Configure"
                    @click="editServer(server)"
                  >
                    <BaseIcon name="Settings" size="sm" />
                  </button>
                  <button
                    class="action-button danger"
                    title="Remove"
                    @click="removeServer(server.id)"
                  >
                    <BaseIcon name="Trash2" size="sm" />
                  </button>
                </div>
              </div>

              <div class="server-stats">
                <div class="stat-item">
                  <BaseIcon name="Package" size="xs" />
                  <span>{{ server.tools }} tools</span>
                </div>
                <div class="stat-item">
                  <BaseIcon name="Database" size="xs" />
                  <span>{{ server.resources }} resources</span>
                </div>
                <div class="stat-item">
                  <BaseIcon name="Activity" size="xs" />
                  <span>{{ server.requests }} requests</span>
                </div>
              </div>

              <div v-if="server.endpoint" class="server-endpoint">
                <code>{{ server.endpoint }}</code>
              </div>
            </div>
          </div>
        </div>

        <!-- Add Server Form -->
        <div v-if="showAddServer" class="add-server-section">
          <h3 class="section-title">Add MCP Server</h3>
          <div class="form-group">
            <label for="server-name" class="input-label">Server Name</label>
            <input
              id="server-name"
              v-model="newServer.name"
              type="text"
              class="text-input"
              placeholder="e.g., GitHub MCP"
            />
          </div>

          <div class="form-group">
            <label for="server-description" class="input-label">
              Description
            </label>
            <input
              id="server-description"
              v-model="newServer.description"
              type="text"
              class="text-input"
              placeholder="Brief description of server functionality"
            />
          </div>

          <div class="form-group">
            <label for="server-endpoint" class="input-label">
              Endpoint URL
            </label>
            <input
              id="server-endpoint"
              v-model="newServer.endpoint"
              type="text"
              class="text-input"
              placeholder="http://localhost:3000/mcp"
            />
          </div>

          <div class="form-actions">
            <BaseButton variant="ghost" size="sm" @click="cancelAddServer">
              Cancel
            </BaseButton>
            <BaseButton
              variant="primary"
              size="sm"
              :disabled="!isNewServerValid"
              @click="addServer"
            >
              <BaseIcon name="Plus" size="xs" />
              Add Server
            </BaseButton>
          </div>
        </div>

        <!-- Info Section -->
        <div class="info-section">
          <div class="info-item">
            <BaseIcon name="Info" size="xs" />
            <span>
              MCP servers extend Claude with custom tools, prompts, and
              resources
            </span>
          </div>
          <div class="info-item">
            <BaseIcon name="Book" size="xs" />
            <span>
              Learn more about MCP at
              <a
                href="https://modelcontextprotocol.io"
                target="_blank"
                rel="noopener"
              >
                modelcontextprotocol.io
              </a>
            </span>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <BaseButton variant="ghost" @click="$emit('close')"> Close </BaseButton>
        <BaseButton variant="primary" @click="handleSave">
          <BaseIcon name="Check" size="xs" />
          Save Changes
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import BaseIcon from '../atoms/BaseIcon.vue'
import BaseButton from '../atoms/BaseButton.vue'
import { useNotifications } from '../../composables/useNotifications'

/**
 * Component props.
 *
 * @public
 */
interface Props {
  /** Controls visibility of the modal */
  visible: boolean
}

/**
 * Component emits.
 *
 * @public
 */
interface Emits {
  /** Emitted when modal should close */
  (event: 'close'): void
  /** Emitted when save action is triggered */
  (event: 'save', servers: McpServer[]): void
}

/**
 * MCP server configuration.
 *
 * @public
 */
interface McpServer {
  id: string
  name: string
  description: string
  endpoint: string
  status: 'connected' | 'disconnected' | 'error'
  enabled: boolean
  tools: number
  resources: number
  requests: number
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const { success, error: showError } = useNotifications()

const showAddServer = ref(false)

/**
 * List of configured MCP servers.
 *
 * @private
 */
const servers = ref<McpServer[]>([
  {
    id: '1',
    name: 'GitHub MCP',
    description: 'GitHub repository access and operations',
    endpoint: 'http://localhost:3001/mcp',
    status: 'connected',
    enabled: true,
    tools: 12,
    resources: 5,
    requests: 234,
  },
  {
    id: '2',
    name: 'Database MCP',
    description: 'PostgreSQL database queries and management',
    endpoint: 'http://localhost:3002/mcp',
    status: 'connected',
    enabled: true,
    tools: 8,
    resources: 3,
    requests: 156,
  },
  {
    id: '3',
    name: 'Custom Tools',
    description: 'Project-specific custom tools and utilities',
    endpoint: 'http://localhost:3003/mcp',
    status: 'disconnected',
    enabled: false,
    tools: 5,
    resources: 2,
    requests: 0,
  },
])

/**
 * New server form state.
 *
 * @private
 */
const newServer = ref({
  name: '',
  description: '',
  endpoint: '',
})

/**
 * Check if new server form is valid.
 *
 * @private
 */
const isNewServerValid = computed(() => {
  return (
    newServer.value.name.trim() !== '' && newServer.value.endpoint.trim() !== ''
  )
})

/**
 * Get CSS class for server status.
 *
 * @param status - Server status
 * @returns CSS class name
 *
 * @private
 */
const getStatusClass = (
  status: 'connected' | 'disconnected' | 'error'
): string => {
  return status
}

/**
 * Toggle server enabled state.
 *
 * @param serverId - Server ID to toggle
 *
 * @private
 */
const toggleServer = (serverId: string): void => {
  const server = servers.value.find((s) => s.id === serverId)
  if (server) {
    server.enabled = !server.enabled
    server.status = server.enabled ? 'connected' : 'disconnected'
    success(`Server ${server.enabled ? 'enabled' : 'disabled'}: ${server.name}`)
  }
}

/**
 * Edit server configuration.
 *
 * @param server - Server to edit
 *
 * @private
 */
const editServer = (server: McpServer): void => {
  console.log('[MCP] Editing server:', server.name)
  // TODO: Implement edit functionality
}

/**
 * Remove server from configuration.
 *
 * @param serverId - Server ID to remove
 *
 * @private
 */
const removeServer = (serverId: string): void => {
  const index = servers.value.findIndex((s) => s.id === serverId)
  if (index !== -1) {
    const serverName = servers.value[index].name
    servers.value.splice(index, 1)
    success(`Server removed: ${serverName}`)
  }
}

/**
 * Add new MCP server.
 *
 * @private
 */
const addServer = (): void => {
  if (!isNewServerValid.value) {
    showError('Please fill in all required fields')
    return
  }

  const newServerData: McpServer = {
    id: Date.now().toString(),
    name: newServer.value.name,
    description: newServer.value.description,
    endpoint: newServer.value.endpoint,
    status: 'disconnected',
    enabled: false,
    tools: 0,
    resources: 0,
    requests: 0,
  }

  servers.value.push(newServerData)
  success(`Server added: ${newServerData.name}`)
  cancelAddServer()
}

/**
 * Cancel add server form.
 *
 * @private
 */
const cancelAddServer = (): void => {
  showAddServer.value = false
  newServer.value = {
    name: '',
    description: '',
    endpoint: '',
  }
}

/**
 * Save MCP servers configuration.
 *
 * @private
 */
const handleSave = (): void => {
  // Save to localStorage
  window.localStorage.setItem(
    'hatcher-mcp-servers',
    JSON.stringify(servers.value)
  )

  emit('save', servers.value)
  success('MCP servers configuration saved')
  emit('close')
}

/**
 * Handle clicks on modal overlay.
 *
 * @private
 */
const handleOverlayClick = (): void => {
  emit('close')
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(4px);
}

.modal-container {
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  width: 700px;
  max-width: 90vw;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  color: var(--accent-primary);
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.close-button {
  background: transparent;
  border: none;
  padding: 8px;
  cursor: pointer;
  color: var(--text-secondary);
  border-radius: 6px;
  transition: all var(--transition-fast);
}

.close-button:hover {
  background-color: var(--hover-bg-light);
  color: var(--text-primary);
}

.dark .close-button:hover {
  background-color: var(--hover-bg-dark);
}

.modal-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.servers-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
  color: var(--text-secondary);
}

.empty-state p {
  font-size: 14px;
  font-weight: 500;
  margin: 12px 0 4px 0;
}

.empty-state span {
  font-size: 12px;
}

.server-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.server-card {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: all var(--transition-fast);
}

.server-card:hover {
  border-color: var(--accent-primary);
}

.server-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.server-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.server-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.server-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.status-badge {
  font-size: 10px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 12px;
  text-transform: uppercase;
}

.status-badge.connected {
  background-color: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.status-badge.disconnected {
  background-color: rgba(156, 163, 175, 0.1);
  color: #9ca3af;
}

.status-badge.error {
  background-color: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.server-description {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0;
}

.server-actions {
  display: flex;
  gap: 4px;
}

.action-button {
  padding: 6px;
  background-color: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 4px;
  transition: all var(--transition-fast);
}

.action-button:hover {
  background-color: var(--hover-bg-light);
  color: var(--text-primary);
}

.action-button.danger:hover {
  background-color: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.dark .action-button:hover {
  background-color: var(--hover-bg-dark);
}

.server-stats {
  display: flex;
  gap: 16px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
}

.server-endpoint {
  padding: 8px 12px;
  background-color: var(--bg-secondary);
  border-radius: 4px;
}

.server-endpoint code {
  font-size: 11px;
  color: var(--text-primary);
  font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
}

.add-server-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.text-input {
  padding: 10px 12px;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 13px;
  color: var(--text-primary);
  transition: all var(--transition-fast);
}

.text-input:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.form-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.info-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  background-color: rgba(14, 165, 233, 0.05);
  border: 1px solid rgba(14, 165, 233, 0.2);
  border-radius: 8px;
}

.info-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.info-item a {
  color: var(--accent-primary);
  text-decoration: none;
}

.info-item a:hover {
  text-decoration: underline;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
  gap: 12px;
}
</style>
