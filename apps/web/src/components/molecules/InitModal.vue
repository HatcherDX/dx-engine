<!--
/**
 * @fileoverview Project initialization modal with CLAUDE.md setup.
 *
 * @description
 * Modal for initializing a new project with CLAUDE.md configuration file.
 * Guides users through setting up project instructions for Claude Code.
 *
 * @example
 * <InitModal
 *   :visible="showInit"
 *   @close="showInit = false"
 *   @init="handleInitProject"
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
          <BaseIcon name="Rocket" size="md" class="header-icon" />
          <h2 class="modal-title">Initialize Project</h2>
        </div>
        <button class="close-button" aria-label="Close" @click="$emit('close')">
          <BaseIcon name="X" size="sm" />
        </button>
      </div>

      <!-- Content -->
      <div class="modal-content">
        <!-- Template Selection -->
        <div class="section">
          <h3 class="section-title">Select Template</h3>
          <div class="template-grid">
            <button
              v-for="template in templates"
              :key="template.id"
              class="template-card"
              :class="{ active: selectedTemplate === template.id }"
              @click="selectedTemplate = template.id"
            >
              <BaseIcon :name="template.icon" size="md" />
              <span class="template-name">{{ template.name }}</span>
              <span class="template-desc">{{ template.description }}</span>
            </button>
          </div>
        </div>

        <!-- Project Info -->
        <div class="section">
          <h3 class="section-title">Project Information</h3>
          <div class="form-group">
            <label for="project-name" class="label">Project Name</label>
            <input
              id="project-name"
              v-model="projectName"
              type="text"
              class="input"
              placeholder="my-awesome-project"
            />
          </div>
          <div class="form-group">
            <label for="project-desc" class="label">Description</label>
            <textarea
              id="project-desc"
              v-model="projectDesc"
              class="textarea"
              rows="3"
              placeholder="A brief description of your project..."
            ></textarea>
          </div>
        </div>

        <!-- Custom Instructions -->
        <div class="section">
          <h3 class="section-title">Custom Instructions (Optional)</h3>
          <textarea
            v-model="customInstructions"
            class="textarea"
            rows="6"
            placeholder="Add specific coding standards, architectural patterns, or team conventions..."
          ></textarea>
          <p class="hint">
            These instructions will be added to CLAUDE.md for AI context
          </p>
        </div>

        <!-- Options -->
        <div class="section">
          <h3 class="section-title">Options</h3>
          <label class="checkbox">
            <input v-model="includeGitignore" type="checkbox" />
            <span>Add CLAUDE.md to .gitignore</span>
          </label>
          <label class="checkbox">
            <input v-model="createBackup" type="checkbox" />
            <span>Create backup if CLAUDE.md exists</span>
          </label>
        </div>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <BaseButton variant="ghost" @click="$emit('close')">
          Cancel
        </BaseButton>
        <BaseButton
          variant="primary"
          :disabled="!projectName"
          @click="handleInit"
        >
          <BaseIcon name="Check" size="xs" />
          Initialize Project
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
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
  /** Emitted when initialization is requested */
  (
    event: 'init',
    data: {
      template: string
      projectName: string
      projectDesc: string
      customInstructions?: string
      includeGitignore: boolean
      createBackup: boolean
    }
  ): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const { success } = useNotifications()

const selectedTemplate = ref('general')
const projectName = ref('')
const projectDesc = ref('')
const customInstructions = ref('')
const includeGitignore = ref(true)
const createBackup = ref(true)

const templates = [
  {
    id: 'general',
    name: 'General',
    description: 'Basic template for any project',
    icon: 'FileText',
  },
  {
    id: 'web',
    name: 'Web App',
    description: 'Frontend/fullstack web application',
    icon: 'Globe',
  },
  {
    id: 'api',
    name: 'API/Backend',
    description: 'REST API or backend service',
    icon: 'Server',
  },
  {
    id: 'library',
    name: 'Library',
    description: 'Reusable library or package',
    icon: 'Package',
  },
]

/**
 * Handle project initialization.
 *
 * @private
 */
const handleInit = (): void => {
  emit('init', {
    template: selectedTemplate.value,
    projectName: projectName.value,
    projectDesc: projectDesc.value,
    customInstructions: customInstructions.value || undefined,
    includeGitignore: includeGitignore.value,
    createBackup: createBackup.value,
  })

  success('Initializing project with CLAUDE.md...')
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
  width: 650px;
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
  gap: 20px;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.template-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  background-color: var(--bg-secondary);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.template-card:hover {
  border-color: var(--accent-primary);
}

.template-card.active {
  background-color: rgba(14, 165, 233, 0.1);
  border-color: var(--accent-primary);
}

.template-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.template-desc {
  font-size: 12px;
  color: var(--text-secondary);
  text-align: center;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.input,
.textarea {
  padding: 10px 12px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 14px;
  color: var(--text-primary);
  transition: all var(--transition-fast);
}

.textarea {
  font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
  resize: vertical;
}

.input:focus,
.textarea:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.hint {
  font-size: 12px;
  color: var(--text-secondary);
  margin: -4px 0 0 0;
}

.checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-primary);
  cursor: pointer;
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
