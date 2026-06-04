<!--
/**
 * @fileoverview Help and documentation modal.
 *
 * @description
 * Modal for displaying help documentation, keyboard shortcuts,
 * command reference, and quick tutorials.
 *
 * @example
 * <HelpModal
 *   :visible="showHelp"
 *   @close="showHelp = false"
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
          <BaseIcon name="BookOpen" size="md" class="header-icon" />
          <h2 class="modal-title">Help & Documentation</h2>
        </div>
        <button class="close-button" aria-label="Close" @click="$emit('close')">
          <BaseIcon name="X" size="sm" />
        </button>
      </div>

      <!-- Content -->
      <div class="modal-content">
        <!-- Search -->
        <div class="search-section">
          <div class="search-input-wrapper">
            <BaseIcon name="Search" size="sm" />
            <input
              v-model="searchQuery"
              type="text"
              class="search-input"
              placeholder="Search help topics..."
            />
          </div>
        </div>

        <!-- Topics -->
        <div class="topics-section">
          <div class="topics-header">
            <h3 class="section-title">Quick Topics</h3>
          </div>
          <div class="topics-grid">
            <button
              v-for="topic in filteredTopics"
              :key="topic.id"
              class="topic-card"
              @click="selectTopic(topic)"
            >
              <BaseIcon :name="topic.icon" size="md" />
              <div class="topic-content">
                <div class="topic-title">{{ topic.title }}</div>
                <div class="topic-desc">{{ topic.description }}</div>
              </div>
            </button>
          </div>
        </div>

        <!-- Commands Reference -->
        <div class="commands-section">
          <div class="section-header">
            <h3 class="section-title">Available Commands</h3>
            <span class="command-count">{{ commands.length }}</span>
          </div>
          <div class="commands-list">
            <div v-for="cmd in commands" :key="cmd.name" class="command-item">
              <code class="command-name">/{{ cmd.name }}</code>
              <span class="command-desc">{{ cmd.description }}</span>
            </div>
          </div>
        </div>

        <!-- Keyboard Shortcuts -->
        <div class="shortcuts-section">
          <h3 class="section-title">Keyboard Shortcuts</h3>
          <div class="shortcuts-list">
            <div
              v-for="shortcut in shortcuts"
              :key="shortcut.id"
              class="shortcut-item"
            >
              <div class="shortcut-keys">
                <kbd
                  v-for="(key, index) in shortcut.keys"
                  :key="index"
                  class="key"
                >
                  {{ key }}
                </kbd>
              </div>
              <span class="shortcut-desc">{{ shortcut.description }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <div class="footer-links">
          <button class="footer-link" @click="openDocs">
            <BaseIcon name="BookOpen" size="xs" />
            View Full Docs
          </button>
          <button class="footer-link" @click="openGitHub">
            <BaseIcon name="GitBranch" size="xs" />
            GitHub Issues
          </button>
        </div>
        <BaseButton variant="primary" @click="$emit('close')">
          Close
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
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const { success } = useNotifications()

const searchQuery = ref('')

const topics = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Learn the basics',
    icon: 'Rocket',
  },
  {
    id: 'commands',
    title: 'Commands',
    description: 'Available slash commands',
    icon: 'Terminal',
  },
  {
    id: 'git-workflow',
    title: 'Git Workflow',
    description: 'Version control guide',
    icon: 'GitBranch',
  },
  {
    id: 'shortcuts',
    title: 'Shortcuts',
    description: 'Keyboard shortcuts',
    icon: 'Target',
  },
]

const commands = [
  { name: 'model', description: 'Switch AI model' },
  { name: 'cost', description: 'View token usage and costs' },
  { name: 'context', description: 'Manage conversation context' },
  { name: 'clear', description: 'Clear current session' },
  { name: 'rewind', description: 'Rewind conversation' },
  { name: 'review', description: 'Request code review' },
  { name: 'help', description: 'Show this help' },
]

const shortcuts = [
  { id: 1, keys: ['Cmd', 'K'], description: 'Open command palette' },
  { id: 2, keys: ['Cmd', 'N'], description: 'New terminal' },
  { id: 3, keys: ['Cmd', 'W'], description: 'Close terminal' },
  { id: 4, keys: ['Cmd', ','], description: 'Open settings' },
  { id: 5, keys: ['Ctrl', 'C'], description: 'Interrupt process' },
]

/**
 * Filter topics based on search query.
 *
 * @private
 */
const filteredTopics = computed(() => {
  if (!searchQuery.value) return topics

  const query = searchQuery.value.toLowerCase()
  return topics.filter(
    (t) =>
      t.title.toLowerCase().includes(query) ||
      t.description.toLowerCase().includes(query)
  )
})

/**
 * Handle topic selection.
 *
 * @param topic - Selected topic
 * @private
 */
const selectTopic = (topic: (typeof topics)[0]): void => {
  console.log('[Help] Selected topic:', topic.id)
  success(`Opening help for: ${topic.title}`)
}

/**
 * Open full documentation.
 *
 * @private
 */
const openDocs = (): void => {
  console.log('[Help] Opening documentation')
  success('Opening documentation...')
}

/**
 * Open GitHub issues.
 *
 * @private
 */
const openGitHub = (): void => {
  console.log('[Help] Opening GitHub')
  success('Opening GitHub issues...')
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

.modal-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.search-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.search-input {
  flex: 1;
  background: transparent;
  border: none;
  font-size: 14px;
  color: var(--text-primary);
  outline: none;
}

.topics-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.topics-header {
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

.topics-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.topic-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all var(--transition-fast);
  text-align: left;
}

.topic-card:hover {
  border-color: var(--accent-primary);
  background-color: var(--hover-bg-light);
}

.topic-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.topic-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.topic-desc {
  font-size: 12px;
  color: var(--text-secondary);
}

.commands-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.command-count {
  font-size: 12px;
  padding: 2px 8px;
  background-color: var(--bg-secondary);
  border-radius: 12px;
  color: var(--text-secondary);
}

.commands-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.command-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background-color: var(--bg-secondary);
  border-radius: 6px;
}

.command-name {
  padding: 2px 8px;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 12px;
  color: var(--accent-primary);
}

.command-desc {
  font-size: 13px;
  color: var(--text-secondary);
}

.shortcuts-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.shortcuts-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.shortcut-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background-color: var(--bg-secondary);
  border-radius: 6px;
}

.shortcut-keys {
  display: flex;
  gap: 4px;
}

.key {
  padding: 4px 8px;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 11px;
  color: var(--text-primary);
}

.shortcut-desc {
  font-size: 13px;
  color: var(--text-secondary);
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
  gap: 12px;
}

.footer-links {
  display: flex;
  gap: 12px;
}

.footer-link {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.footer-link:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}
</style>
