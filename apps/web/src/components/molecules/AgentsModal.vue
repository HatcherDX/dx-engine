<!--
/**
 * @fileoverview AI agents management modal.
 *
 * @description
 * Modal for managing custom AI subagents. Allows users to create, configure,
 * and manage specialized AI agents with custom prompts, tools, and behaviors
 * for specific tasks like code review, testing, documentation, etc.
 *
 * @example
 * <AgentsModal
 *   :visible="showAgents"
 *   @close="showAgents = false"
 *   @save="handleSaveAgents"
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
          <BaseIcon name="Users" size="md" class="header-icon" />
          <h2 class="modal-title">AI Agents</h2>
        </div>
        <button class="close-button" aria-label="Close" @click="$emit('close')">
          <BaseIcon name="X" size="sm" />
        </button>
      </div>

      <!-- Content -->
      <div class="modal-content">
        <!-- Agents List -->
        <div class="agents-section">
          <div class="section-header">
            <h3 class="section-title">Custom Agents</h3>
            <BaseButton
              variant="primary"
              size="sm"
              @click="showCreateAgent = true"
            >
              <BaseIcon name="Plus" size="xs" />
              Create Agent
            </BaseButton>
          </div>

          <div v-if="agents.length === 0" class="empty-state">
            <BaseIcon name="Bot" size="lg" />
            <p>No custom agents created</p>
            <span>Create specialized agents for specific tasks</span>
          </div>

          <div v-else class="agents-grid">
            <div
              v-for="agent in agents"
              :key="agent.id"
              class="agent-card"
              :class="{ active: agent.active }"
            >
              <div class="agent-header">
                <div
                  class="agent-icon-wrapper"
                  :style="{ background: agent.color }"
                >
                  <BaseIcon :name="agent.icon" size="md" />
                </div>
                <div class="agent-actions">
                  <button
                    class="action-button"
                    :title="agent.active ? 'Deactivate' : 'Activate'"
                    @click="toggleAgent(agent.id)"
                  >
                    <BaseIcon
                      :name="agent.active ? 'CheckCircle' : 'Circle'"
                      size="sm"
                    />
                  </button>
                  <button
                    class="action-button"
                    title="Edit"
                    @click="editAgent(agent)"
                  >
                    <BaseIcon name="Edit" size="sm" />
                  </button>
                  <button
                    class="action-button danger"
                    title="Delete"
                    @click="deleteAgent(agent.id)"
                  >
                    <BaseIcon name="Trash2" size="sm" />
                  </button>
                </div>
              </div>

              <div class="agent-info">
                <h4 class="agent-name">{{ agent.name }}</h4>
                <p class="agent-description">{{ agent.description }}</p>
              </div>

              <div class="agent-meta">
                <div class="meta-item">
                  <BaseIcon name="Zap" size="xs" />
                  <span>{{ agent.model }}</span>
                </div>
                <div class="meta-item">
                  <BaseIcon name="Tool" size="xs" />
                  <span>{{ agent.tools.length }} tools</span>
                </div>
                <div class="meta-item">
                  <BaseIcon name="Activity" size="xs" />
                  <span>{{ agent.executions }} runs</span>
                </div>
              </div>

              <div v-if="agent.systemPrompt" class="agent-prompt">
                <span class="prompt-label">System Prompt:</span>
                <code>{{ truncateText(agent.systemPrompt, 100) }}</code>
              </div>
            </div>
          </div>
        </div>

        <!-- Create Agent Form -->
        <div v-if="showCreateAgent" class="create-agent-section">
          <h3 class="section-title">Create Custom Agent</h3>

          <div class="form-group">
            <label for="agent-name" class="input-label">Agent Name</label>
            <input
              id="agent-name"
              v-model="newAgent.name"
              type="text"
              class="text-input"
              placeholder="e.g., Code Reviewer"
            />
          </div>

          <div class="form-group">
            <label for="agent-description" class="input-label">
              Description
            </label>
            <input
              id="agent-description"
              v-model="newAgent.description"
              type="text"
              class="text-input"
              placeholder="What this agent does"
            />
          </div>

          <div class="form-group">
            <label for="agent-model" class="input-label">Model</label>
            <select
              id="agent-model"
              v-model="newAgent.model"
              class="select-input"
            >
              <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
              <option value="claude-3-opus">Claude 3 Opus</option>
              <option value="claude-3-haiku">Claude 3 Haiku</option>
            </select>
          </div>

          <div class="form-group">
            <label for="agent-icon" class="input-label">Icon</label>
            <div class="icon-selector">
              <button
                v-for="iconOption in iconOptions"
                :key="iconOption"
                class="icon-option"
                :class="{ selected: newAgent.icon === iconOption }"
                @click="newAgent.icon = iconOption"
              >
                <BaseIcon :name="iconOption" size="sm" />
              </button>
            </div>
          </div>

          <div class="form-group">
            <label for="agent-color" class="input-label">Color</label>
            <div class="color-selector">
              <button
                v-for="colorOption in colorOptions"
                :key="colorOption"
                class="color-option"
                :class="{ selected: newAgent.color === colorOption }"
                :style="{ background: colorOption }"
                @click="newAgent.color = colorOption"
              ></button>
            </div>
          </div>

          <div class="form-group">
            <label for="agent-prompt" class="input-label">
              System Prompt
            </label>
            <textarea
              id="agent-prompt"
              v-model="newAgent.systemPrompt"
              class="textarea-input"
              rows="6"
              placeholder="Detailed instructions for the agent's behavior and expertise..."
            ></textarea>
          </div>

          <div class="form-actions">
            <BaseButton variant="ghost" size="sm" @click="cancelCreateAgent">
              Cancel
            </BaseButton>
            <BaseButton
              variant="primary"
              size="sm"
              :disabled="!isNewAgentValid"
              @click="createAgent"
            >
              <BaseIcon name="Plus" size="xs" />
              Create Agent
            </BaseButton>
          </div>
        </div>

        <!-- Info Section -->
        <div class="info-section">
          <div class="info-item">
            <BaseIcon name="Info" size="xs" />
            <span>
              Custom agents can specialize in specific tasks like code review,
              testing, or documentation
            </span>
          </div>
          <div class="info-item">
            <BaseIcon name="Sparkles" size="xs" />
            <span>
              Agents can be invoked with /agent &lt;name&gt; in conversations
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
  (event: 'save', agents: Agent[]): void
}

/**
 * AI agent configuration.
 *
 * @public
 */
interface Agent {
  id: string
  name: string
  description: string
  model: string
  icon: string
  color: string
  systemPrompt: string
  tools: string[]
  active: boolean
  executions: number
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const { success, error: showError } = useNotifications()

const showCreateAgent = ref(false)

/**
 * Available icon options.
 *
 * @private
 */
const iconOptions = [
  'Bot',
  'Code',
  'FileText',
  'TestTube',
  'Shield',
  'Wrench',
  'Sparkles',
  'Brain',
]

/**
 * Available color options.
 *
 * @private
 */
const colorOptions = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
]

/**
 * List of custom agents.
 *
 * @private
 */
const agents = ref<Agent[]>([
  {
    id: '1',
    name: 'Code Reviewer',
    description: 'Reviews code for quality, patterns, and best practices',
    model: 'claude-3-5-sonnet',
    icon: 'Shield',
    color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    systemPrompt:
      'You are an expert code reviewer. Focus on code quality, design patterns, security issues, and best practices.',
    tools: ['Read', 'Grep', 'Glob'],
    active: true,
    executions: 45,
  },
  {
    id: '2',
    name: 'Test Writer',
    description: 'Generates comprehensive test suites',
    model: 'claude-3-opus',
    icon: 'TestTube',
    color: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    systemPrompt:
      'You are an expert in writing tests. Create comprehensive test suites with good coverage and edge cases.',
    tools: ['Read', 'Write', 'Bash'],
    active: true,
    executions: 23,
  },
  {
    id: '3',
    name: 'Documentation Writer',
    description: 'Creates clear and comprehensive documentation',
    model: 'claude-3-haiku',
    icon: 'FileText',
    color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    systemPrompt:
      'You are a technical writer. Create clear, concise, and comprehensive documentation.',
    tools: ['Read', 'Write'],
    active: false,
    executions: 12,
  },
])

/**
 * New agent form state.
 *
 * @private
 */
const newAgent = ref({
  name: '',
  description: '',
  model: 'claude-3-5-sonnet',
  icon: 'Bot',
  color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  systemPrompt: '',
})

/**
 * Check if new agent form is valid.
 *
 * @private
 */
const isNewAgentValid = computed(() => {
  return (
    newAgent.value.name.trim() !== '' &&
    newAgent.value.description.trim() !== '' &&
    newAgent.value.systemPrompt.trim() !== ''
  )
})

/**
 * Truncate text to specified length.
 *
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @returns Truncated text
 *
 * @private
 */
const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text
  return `${text.substring(0, maxLength)}...`
}

/**
 * Toggle agent active state.
 *
 * @param agentId - Agent ID to toggle
 *
 * @private
 */
const toggleAgent = (agentId: string): void => {
  const agent = agents.value.find((a) => a.id === agentId)
  if (agent) {
    agent.active = !agent.active
    success(
      `Agent ${agent.active ? 'activated' : 'deactivated'}: ${agent.name}`
    )
  }
}

/**
 * Edit agent configuration.
 *
 * @param agent - Agent to edit
 *
 * @private
 */
const editAgent = (agent: Agent): void => {
  console.log('[Agents] Editing agent:', agent.name)
  // TODO: Implement edit functionality
}

/**
 * Delete agent.
 *
 * @param agentId - Agent ID to delete
 *
 * @private
 */
const deleteAgent = (agentId: string): void => {
  const index = agents.value.findIndex((a) => a.id === agentId)
  if (index !== -1) {
    const agentName = agents.value[index].name
    agents.value.splice(index, 1)
    success(`Agent deleted: ${agentName}`)
  }
}

/**
 * Create new agent.
 *
 * @private
 */
const createAgent = (): void => {
  if (!isNewAgentValid.value) {
    showError('Please fill in all required fields')
    return
  }

  const newAgentData: Agent = {
    id: Date.now().toString(),
    name: newAgent.value.name,
    description: newAgent.value.description,
    model: newAgent.value.model,
    icon: newAgent.value.icon,
    color: newAgent.value.color,
    systemPrompt: newAgent.value.systemPrompt,
    tools: [],
    active: true,
    executions: 0,
  }

  agents.value.push(newAgentData)
  success(`Agent created: ${newAgentData.name}`)
  cancelCreateAgent()
}

/**
 * Cancel create agent form.
 *
 * @private
 */
const cancelCreateAgent = (): void => {
  showCreateAgent.value = false
  newAgent.value = {
    name: '',
    description: '',
    model: 'claude-3-5-sonnet',
    icon: 'Bot',
    color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    systemPrompt: '',
  }
}

/**
 * Save agents configuration.
 *
 * @private
 */
const handleSave = (): void => {
  // Save to localStorage
  window.localStorage.setItem('hatcher-agents', JSON.stringify(agents.value))

  emit('save', agents.value)
  success('Agents configuration saved')
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
  width: 750px;
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

.agents-section {
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

.agents-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.agent-card {
  border: 2px solid var(--border-color);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: all var(--transition-fast);
  opacity: 0.7;
}

.agent-card.active {
  opacity: 1;
  border-color: var(--accent-primary);
}

.agent-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.agent-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.agent-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.agent-actions {
  display: flex;
  gap: 4px;
}

.action-button {
  padding: 4px;
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

.agent-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.agent-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.agent-description {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.4;
}

.agent-meta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--text-secondary);
}

.agent-prompt {
  padding: 8px;
  background-color: var(--bg-secondary);
  border-radius: 6px;
  font-size: 11px;
}

.prompt-label {
  display: block;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.agent-prompt code {
  color: var(--text-primary);
  font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
}

.create-agent-section {
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

.text-input,
.select-input {
  padding: 10px 12px;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 13px;
  color: var(--text-primary);
  transition: all var(--transition-fast);
}

.text-input:focus,
.select-input:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.textarea-input {
  padding: 10px 12px;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 13px;
  color: var(--text-primary);
  font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
  resize: vertical;
  transition: all var(--transition-fast);
}

.textarea-input:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.icon-selector {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.icon-option {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-primary);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.icon-option:hover {
  border-color: var(--accent-primary);
}

.icon-option.selected {
  background-color: var(--accent-primary);
  border-color: var(--accent-primary);
  color: white;
}

.color-selector {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.color-option {
  width: 40px;
  height: 40px;
  border: 3px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.color-option:hover {
  transform: scale(1.1);
}

.color-option.selected {
  border-color: var(--text-primary);
  box-shadow: 0 0 0 2px var(--bg-primary);
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

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
  gap: 12px;
}
</style>
