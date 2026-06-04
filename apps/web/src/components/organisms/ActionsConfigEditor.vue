<!--
  @fileoverview Actions Configuration Editor - Visual editor for .hatcher/actions.yaml

  @description
  Provides a visual interface for creating, editing, and managing Hatcher Actions:
  - List view of all actions
  - Visual DAG representation
  - CRUD operations
  - YAML import/export
  - Real-time validation
  - Drag & drop support

  @author Hatcher DX Team
  @since 1.0.0
  @public
-->

<template>
  <div class="actions-editor">
    <!-- Header -->
    <div class="actions-editor__header">
      <div class="actions-editor__title">
        <h2>Actions Configuration</h2>
        <span class="actions-editor__subtitle">
          {{ projectPath ? projectPath : 'No project selected' }}
        </span>
      </div>

      <div class="actions-editor__actions">
        <!-- View Mode Toggle -->
        <div class="actions-editor__view-toggle">
          <button
            :class="[
              'view-toggle__btn',
              { 'view-toggle__btn--active': viewMode === 'list' },
            ]"
            title="List View"
            @click="viewMode = 'list'"
          >
            <BaseIcon name="List" />
          </button>
          <button
            :class="[
              'view-toggle__btn',
              { 'view-toggle__btn--active': viewMode === 'dag' },
            ]"
            title="DAG View"
            @click="viewMode = 'dag'"
          >
            <BaseIcon name="GitBranch" />
          </button>
        </div>

        <!-- Action Buttons -->
        <button
          class="actions-editor__btn actions-editor__btn--secondary"
          title="Import YAML"
          @click="showImportModal = true"
        >
          <BaseIcon name="FileText" />
          Import
        </button>
        <button
          class="actions-editor__btn actions-editor__btn--secondary"
          title="Export YAML"
          @click="exportYAML"
        >
          <BaseIcon name="ArrowDown" />
          Export
        </button>
        <button
          class="actions-editor__btn actions-editor__btn--primary"
          title="Add Action"
          @click="openCreateModal"
        >
          <BaseIcon name="Plus" />
          Add Action
        </button>
      </div>
    </div>

    <!-- Validation Errors -->
    <div v-if="validationErrors.length > 0" class="actions-editor__errors">
      <BaseIcon name="AlertTriangle" />
      <div class="errors__list">
        <div
          v-for="(error, index) in validationErrors"
          :key="index"
          class="error__item"
        >
          {{ error }}
        </div>
      </div>
    </div>

    <!-- Content Area -->
    <div class="actions-editor__content">
      <!-- List View -->
      <div v-if="viewMode === 'list'" class="content__list-view">
        <div class="list-view__groups">
          <!-- Groups Section -->
          <div class="groups-section">
            <h3 class="section__title">Action Groups</h3>
            <div class="groups__list">
              <div
                v-for="(groupActions, groupName) in groups"
                :key="groupName"
                class="group__item"
              >
                <div class="group__header">
                  <BaseIcon name="Folder" />
                  <span class="group__name">{{ groupName }}</span>
                  <span class="group__count"
                    >{{ groupActions.length }} actions</span
                  >
                </div>
                <div class="group__actions">
                  <span
                    v-for="actionId in groupActions"
                    :key="actionId"
                    class="group__action-tag"
                  >
                    {{ actionId }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Actions Section -->
          <div class="actions-section">
            <h3 class="section__title">Actions ({{ actionsList.length }})</h3>
            <div class="actions__list">
              <div
                v-for="action in actionsList"
                :key="action.id"
                class="action__card"
                :class="{ 'action__card--selected': selectedAction === action }"
                @click="selectAction(action)"
              >
                <div class="action__header">
                  <BaseIcon :name="action.icon || 'Circle'" />
                  <div class="action__info">
                    <div class="action__name">{{ action.name }}</div>
                    <div class="action__id">{{ action.id }}</div>
                  </div>
                  <div class="action__actions">
                    <button
                      class="action__btn action__btn--edit"
                      title="Edit"
                      @click.stop="editAction(action)"
                    >
                      <BaseIcon name="Settings" />
                    </button>
                    <button
                      class="action__btn action__btn--delete"
                      title="Delete"
                      @click.stop="deleteAction(action.id)"
                    >
                      <BaseIcon name="X" />
                    </button>
                  </div>
                </div>

                <div class="action__description">
                  {{ action.description }}
                </div>

                <div class="action__meta">
                  <div class="meta__item">
                    <BaseIcon name="Terminal" />
                    <code class="meta__command">{{ action.command }}</code>
                  </div>
                  <div v-if="action.dependencies.length > 0" class="meta__item">
                    <BaseIcon name="GitBranch" />
                    <span class="meta__deps"
                      >{{ action.dependencies.length }} dependencies</span
                    >
                  </div>
                  <div class="meta__item">
                    <BaseIcon name="Clock" />
                    <span class="meta__duration"
                      >~{{ (action.estimatedDuration ?? 0) / 1000 }}s</span
                    >
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Detail Panel -->
        <div v-if="selectedAction" class="list-view__detail">
          <div class="detail__header">
            <h3>{{ selectedAction.name }}</h3>
            <button
              class="detail__close"
              title="Close"
              @click="selectedAction = null"
            >
              <BaseIcon name="X" />
            </button>
          </div>

          <div class="detail__content">
            <div class="detail__section">
              <label>ID</label>
              <code>{{ selectedAction.id }}</code>
            </div>

            <div class="detail__section">
              <label>Description</label>
              <p>{{ selectedAction.description }}</p>
            </div>

            <div class="detail__section">
              <label>Command</label>
              <code class="detail__command">{{ selectedAction.command }}</code>
            </div>

            <div class="detail__section">
              <label>Icon</label>
              <div class="detail__icon">
                <BaseIcon :name="selectedAction.icon || 'Circle'" />
                <span>{{ selectedAction.icon || 'Circle' }}</span>
              </div>
            </div>

            <div class="detail__section">
              <label
                >Dependencies ({{ selectedAction.dependencies.length }})</label
              >
              <div class="detail__dependencies">
                <span
                  v-for="dep in selectedAction.dependencies"
                  :key="dep"
                  class="dependency__tag"
                >
                  {{ dep }}
                </span>
                <span
                  v-if="selectedAction.dependencies.length === 0"
                  class="detail__empty"
                >
                  No dependencies
                </span>
              </div>
            </div>

            <div class="detail__section">
              <label>Settings</label>
              <div class="detail__settings">
                <div class="setting__item">
                  <span>Parallel:</span>
                  <strong>{{ selectedAction.parallel ? 'Yes' : 'No' }}</strong>
                </div>
                <div class="setting__item">
                  <span>Estimated Duration:</span>
                  <strong>{{ selectedAction.estimatedDuration }}ms</strong>
                </div>
              </div>
            </div>

            <div class="detail__section">
              <label>Execution Order</label>
              <div class="detail__order">
                Level {{ getActionLevel(selectedAction.id) }}
              </div>
            </div>
          </div>

          <div class="detail__actions">
            <button
              class="detail__btn detail__btn--secondary"
              @click="duplicateAction(selectedAction)"
            >
              <BaseIcon name="Copy" />
              Duplicate
            </button>
            <button
              class="detail__btn detail__btn--primary"
              @click="editAction(selectedAction)"
            >
              <BaseIcon name="Settings" />
              Edit
            </button>
          </div>
        </div>
      </div>

      <!-- DAG View -->
      <div v-else class="content__dag-view">
        <div class="dag-view__canvas">
          <svg
            ref="dagCanvas"
            class="dag-canvas"
            :viewBox="`0 0 ${canvasWidth} ${canvasHeight}`"
          >
            <!-- Render connections -->
            <g class="dag-connections">
              <path
                v-for="connection in connections"
                :key="`${connection.from}-${connection.to}`"
                :d="connection.path"
                class="connection__line"
                :class="{
                  'connection__line--selected':
                    selectedAction?.id === connection.from ||
                    selectedAction?.id === connection.to,
                  'connection__line--circular':
                    circularDependencyActions.has(connection.from) &&
                    circularDependencyActions.has(connection.to),
                }"
              />
            </g>

            <!-- Render nodes -->
            <g class="dag-nodes">
              <g
                v-for="node in dagNodes"
                :key="node.id"
                :transform="`translate(${node.x}, ${node.y})`"
                class="dag-node"
                :class="{
                  'dag-node--selected': selectedAction?.id === node.id,
                  'dag-node--circular': circularDependencyActions.has(node.id),
                }"
                @click="selectActionById(node.id)"
              >
                <rect class="node__bg" width="180" height="80" rx="8" />
                <rect
                  v-if="circularDependencyActions.has(node.id)"
                  class="node__error-border"
                  width="180"
                  height="80"
                  rx="8"
                />
                <text class="node__name" x="90" y="30" text-anchor="middle">
                  {{ node.action.name }}
                </text>
                <text class="node__id" x="90" y="50" text-anchor="middle">
                  {{ node.id }}
                </text>
                <text class="node__level" x="90" y="65" text-anchor="middle">
                  Level {{ node.level }}
                </text>
              </g>
            </g>
          </svg>
        </div>

        <div class="dag-view__legend">
          <div class="legend__item">
            <div class="legend__box legend__box--level-0"></div>
            <span>Level 0 (No dependencies)</span>
          </div>
          <div class="legend__item">
            <div class="legend__box legend__box--level-1"></div>
            <span>Level 1</span>
          </div>
          <div class="legend__item">
            <div class="legend__box legend__box--level-2"></div>
            <span>Level 2+</span>
          </div>
          <div
            v-if="circularDependencyActions.size > 0"
            class="legend__item legend__item--error"
          >
            <div class="legend__box legend__box--circular"></div>
            <span
              >Circular Dependency ({{
                circularDependencyActions.size
              }}
              actions)</span
            >
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <CompactModal
      v-if="showEditModal"
      :visible="true"
      :title="editingAction ? 'Edit Action' : 'Create Action'"
      @close="closeEditModal"
    >
      <div class="edit-modal__content">
        <div class="form__group">
          <label>Action ID *</label>
          <input
            v-model="editForm.id"
            type="text"
            placeholder="e.g. lint:check"
            :disabled="!!editingAction"
            class="form__input"
          />
        </div>

        <div class="form__group">
          <label>Name *</label>
          <input
            v-model="editForm.name"
            type="text"
            placeholder="e.g. Lint Check"
            class="form__input"
          />
        </div>

        <div class="form__group">
          <label>Description</label>
          <textarea
            v-model="editForm.description"
            placeholder="Description of what this action does"
            class="form__textarea"
            rows="3"
          ></textarea>
        </div>

        <div class="form__group">
          <label>Command *</label>
          <input
            v-model="editForm.command"
            type="text"
            placeholder="e.g. pnpm lint"
            class="form__input"
          />
        </div>

        <div class="form__group">
          <label>Icon</label>
          <input
            v-model="editForm.icon"
            type="text"
            placeholder="e.g. CheckSquare"
            class="form__input"
          />
        </div>

        <div class="form__group">
          <label>Dependencies</label>
          <div class="dependencies__input">
            <div class="dependencies__list">
              <span
                v-for="(dep, index) in editForm.dependencies"
                :key="index"
                class="dependency__tag"
              >
                {{ dep }}
                <button
                  class="dependency__remove"
                  @click="removeDependency(index)"
                >
                  <BaseIcon name="X" />
                </button>
              </span>
            </div>
            <select
              v-model="newDependency"
              class="form__select"
              @change="addDependency"
            >
              <option value="">Add dependency...</option>
              <option
                v-for="action in availableDependencies"
                :key="action.id"
                :value="action.id"
              >
                {{ action.id }} - {{ action.name }}
              </option>
            </select>
          </div>
        </div>

        <div class="form__row">
          <div class="form__group">
            <label>
              <input
                v-model="editForm.parallel"
                type="checkbox"
                class="form__checkbox"
              />
              Can run in parallel
            </label>
          </div>
        </div>

        <div class="form__group">
          <label>Estimated Duration (ms)</label>
          <input
            v-model.number="editForm.estimatedDuration"
            type="number"
            min="0"
            step="100"
            class="form__input"
          />
        </div>
      </div>

      <div class="edit-modal__actions">
        <button
          class="modal__btn modal__btn--secondary"
          @click="closeEditModal"
        >
          Cancel
        </button>
        <button
          class="modal__btn modal__btn--primary"
          :disabled="!isFormValid"
          @click="saveAction"
        >
          {{ editingAction ? 'Update' : 'Create' }}
        </button>
      </div>
    </CompactModal>

    <!-- Import Modal -->
    <CompactModal
      v-if="showImportModal"
      :visible="true"
      title="Import YAML Configuration"
      @close="showImportModal = false"
    >
      <div class="import-modal__content">
        <textarea
          v-model="importYAML"
          placeholder="Paste your YAML configuration here..."
          class="import__textarea"
          rows="20"
        ></textarea>
      </div>

      <div class="import-modal__actions">
        <button
          class="modal__btn modal__btn--secondary"
          @click="showImportModal = false"
        >
          Cancel
        </button>
        <button
          class="modal__btn modal__btn--primary"
          @click="importConfiguration"
        >
          Import
        </button>
      </div>
    </CompactModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import BaseIcon from '../atoms/BaseIcon.vue'
import CompactModal from '../molecules/CompactModal.vue'
import type { ActionDefinition } from '@hatcherdx/hatcher-actions'

/**
 * Props
 */
interface Props {
  projectPath?: string
}

const props = defineProps<Props>()

/**
 * Emits
 */
const emit = defineEmits<{
  save: [config: string]
  load: []
}>()

/**
 * State
 */
const viewMode = ref<'list' | 'dag'>('list')
const selectedAction = ref<ActionDefinition | null>(null)
const showEditModal = ref(false)
const showImportModal = ref(false)
const editingAction = ref<ActionDefinition | null>(null)
const importYAML = ref('')
const newDependency = ref('')

// Configuration state
const groups = ref<Record<string, string[]>>({})
const actions = ref<Map<string, ActionDefinition>>(new Map())
const settings = ref({
  failFast: true,
  maxParallel: 4,
  timeout: 300000,
  retries: 0,
})

// Form state
const editForm = ref({
  id: '',
  name: '',
  description: '',
  command: '',
  icon: 'Circle',
  dependencies: [] as string[],
  parallel: false,
  estimatedDuration: 2000,
})

// Validation
const validationErrors = ref<string[]>([])

// DAG Canvas
const dagCanvas = ref<SVGElement | null>(null) // eslint-disable-line no-undef
const canvasWidth = ref(1200)
const canvasHeight = ref(800)

/**
 * Computed
 */
const actionsList = computed(() => {
  return Array.from(actions.value.values()).sort((a, b) =>
    a.id.localeCompare(b.id)
  )
})

const availableDependencies = computed(() => {
  return actionsList.value.filter(
    (action) =>
      action.id !== editForm.value.id &&
      !editForm.value.dependencies.includes(action.id)
  )
})

const isFormValid = computed(() => {
  return (
    editForm.value.id.trim() !== '' &&
    editForm.value.name.trim() !== '' &&
    editForm.value.command.trim() !== ''
  )
})

const dagNodes = computed(() => {
  const nodes: Array<{
    id: string
    action: ActionDefinition
    x: number
    y: number
    level: number
  }> = []

  const levels = calculateLevels()
  const levelCounts = new Map<number, number>()

  // Calculate positions
  actionsList.value.forEach((action) => {
    const level = levels.get(action.id) || 0
    const countAtLevel = levelCounts.get(level) || 0
    levelCounts.set(level, countAtLevel + 1)

    const x = 100 + level * 250
    const y = 100 + countAtLevel * 120

    nodes.push({
      id: action.id,
      action,
      x,
      y,
      level,
    })
  })

  return nodes
})

const connections = computed(() => {
  const conns: Array<{
    from: string
    to: string
    path: string
  }> = []

  dagNodes.value.forEach((node) => {
    node.action.dependencies.forEach((depId) => {
      const depNode = dagNodes.value.find((n) => n.id === depId)
      if (depNode) {
        // Calculate path
        const startX = depNode.x + 180
        const startY = depNode.y + 40
        const endX = node.x
        const endY = node.y + 40
        const midX = (startX + endX) / 2

        const path = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`

        conns.push({
          from: depId,
          to: node.id,
          path,
        })
      }
    })
  })

  return conns
})

// Detect which actions are part of circular dependencies
const circularDependencyActions = computed(() => {
  const cyclicActions = new Set<string>()
  const visited = new Set<string>()
  const recursionStack = new Set<string>()

  const detectCycle = (actionId: string, path: string[] = []): boolean => {
    if (recursionStack.has(actionId)) {
      // Found a cycle - mark all actions in the current path
      const cycleStartIndex = path.indexOf(actionId)
      path.slice(cycleStartIndex).forEach((id) => cyclicActions.add(id))
      cyclicActions.add(actionId)
      return true
    }

    if (visited.has(actionId)) {
      return false
    }

    visited.add(actionId)
    recursionStack.add(actionId)

    const action = actions.value.get(actionId)
    if (action) {
      for (const depId of action.dependencies) {
        if (actions.value.has(depId)) {
          detectCycle(depId, [...path, actionId])
        }
      }
    }

    recursionStack.delete(actionId)
    return false
  }

  actionsList.value.forEach((action) => {
    if (!visited.has(action.id)) {
      detectCycle(action.id)
    }
  })

  return cyclicActions
})

/**
 * Methods
 */
function calculateLevels(): Map<string, number> {
  const levels = new Map<string, number>()

  const getLevel = (actionId: string): number => {
    if (levels.has(actionId)) {
      return levels.get(actionId)!
    }

    const action = actions.value.get(actionId)
    if (!action || action.dependencies.length === 0) {
      levels.set(actionId, 0)
      return 0
    }

    const depLevels = action.dependencies.map((depId) => getLevel(depId))
    const level = Math.max(...depLevels) + 1
    levels.set(actionId, level)
    return level
  }

  actionsList.value.forEach((action) => {
    getLevel(action.id)
  })

  return levels
}

function getActionLevel(actionId: string): number {
  const levels = calculateLevels()
  return levels.get(actionId) || 0
}

function selectAction(action: ActionDefinition) {
  selectedAction.value = action
}

function selectActionById(actionId: string) {
  const action = actions.value.get(actionId)
  if (action) {
    selectedAction.value = action
  }
}

function openCreateModal() {
  editingAction.value = null
  editForm.value = {
    id: '',
    name: '',
    description: '',
    command: '',
    icon: 'Circle',
    dependencies: [],
    parallel: false,
    estimatedDuration: 2000,
  }
  showEditModal.value = true
}

function editAction(action: ActionDefinition) {
  editingAction.value = action
  editForm.value = {
    id: action.id,
    name: action.name,
    description: action.description || '',
    command: action.command,
    icon: action.icon || 'Circle',
    dependencies: [...action.dependencies],
    parallel: action.parallel || false,
    estimatedDuration: action.estimatedDuration || 2000,
  }
  showEditModal.value = true
}

function closeEditModal() {
  showEditModal.value = false
  editingAction.value = null
}

function addDependency() {
  if (
    newDependency.value &&
    !editForm.value.dependencies.includes(newDependency.value)
  ) {
    editForm.value.dependencies.push(newDependency.value)
    newDependency.value = ''
  }
}

function removeDependency(index: number) {
  editForm.value.dependencies.splice(index, 1)
}

function saveAction() {
  if (!isFormValid.value) return

  const action: ActionDefinition = {
    id: editForm.value.id,
    name: editForm.value.name,
    description: editForm.value.description,
    command: editForm.value.command,
    icon: editForm.value.icon,
    dependencies: editForm.value.dependencies,
    parallel: editForm.value.parallel,
    estimatedDuration: editForm.value.estimatedDuration,
  }

  actions.value.set(action.id, action)
  closeEditModal()
  validateConfiguration()
  saveConfiguration()
}

function deleteAction(actionId: string) {
  if (window.confirm(`Are you sure you want to delete action "${actionId}"?`)) {
    actions.value.delete(actionId)
    if (selectedAction.value?.id === actionId) {
      selectedAction.value = null
    }
    validateConfiguration()
    saveConfiguration()
  }
}

function duplicateAction(action: ActionDefinition) {
  const newId = window.prompt('Enter new action ID:', `${action.id}-copy`)
  if (newId && newId.trim() !== '') {
    const newAction: ActionDefinition = {
      ...action,
      id: newId.trim(),
      name: `${action.name} (Copy)`,
    }
    actions.value.set(newAction.id, newAction)
    saveConfiguration()
  }
}

function validateConfiguration() {
  validationErrors.value = []

  // Check for circular dependencies
  const visited = new Set<string>()
  const recursionStack = new Set<string>()

  const detectCycle = (actionId: string, path: string[] = []): boolean => {
    if (recursionStack.has(actionId)) {
      const cycle = [...path, actionId].join(' -> ')
      validationErrors.value.push(`Circular dependency detected: ${cycle}`)
      return true
    }

    if (visited.has(actionId)) {
      return false
    }

    visited.add(actionId)
    recursionStack.add(actionId)

    const action = actions.value.get(actionId)
    if (action) {
      for (const depId of action.dependencies) {
        if (!actions.value.has(depId)) {
          validationErrors.value.push(
            `Action "${actionId}" depends on non-existent action "${depId}"`
          )
        } else if (detectCycle(depId, [...path, actionId])) {
          return true
        }
      }
    }

    recursionStack.delete(actionId)
    return false
  }

  actionsList.value.forEach((action) => {
    if (!visited.has(action.id)) {
      detectCycle(action.id)
    }
  })
}

function exportYAML() {
  const yaml = generateYAML()

  // Create downloadable file
  const blob = new window.Blob([yaml], { type: 'text/yaml' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'actions.yaml'
  a.click()
  window.URL.revokeObjectURL(url)
}

function generateYAML(): string {
  let yaml = '# Hatcher Actions Configuration\n'
  yaml += '# Git-committable action definitions for local CI/CD\n\n'
  yaml += 'version: 1.0\n'
  yaml += `project: ${props.projectPath?.split('/').pop() || 'dx-engine'}\n\n`

  // Groups
  if (Object.keys(groups.value).length > 0) {
    yaml += 'groups:\n'
    Object.entries(groups.value).forEach(([name, actionIds]) => {
      yaml += `  ${name}:\n`
      actionIds.forEach((id) => {
        yaml += `    - ${id}\n`
      })
    })
    yaml += '\n'
  }

  // Actions
  yaml += 'actions:\n'
  actionsList.value.forEach((action) => {
    yaml += `  ${action.id}:\n`
    yaml += `    name: '${action.name}'\n`
    if (action.description) {
      yaml += `    description: '${action.description}'\n`
    }
    yaml += `    command: '${action.command}'\n`
    if (action.icon) {
      yaml += `    icon: '${action.icon}'\n`
    }
    yaml += `    dependencies: [${action.dependencies.join(', ')}]\n`
    yaml += `    parallel: ${action.parallel || false}\n`
    yaml += `    estimatedDuration: ${action.estimatedDuration || 2000}\n\n`
  })

  // Settings
  yaml += 'settings:\n'
  yaml += `  failFast: ${settings.value.failFast}\n`
  yaml += `  maxParallel: ${settings.value.maxParallel}\n`
  yaml += `  timeout: ${settings.value.timeout}\n`
  yaml += `  retries: ${settings.value.retries}\n`

  return yaml
}

async function importConfiguration() {
  try {
    // Parse YAML (simplified - in production use a proper YAML parser)
    // For now, we'll use the IPC handler to validate
    const result = (await window.electronAPI.invoke(
      'actions:validate-config',
      importYAML.value
    )) as { valid: boolean; errors: string[] }

    if (!result.valid) {
      validationErrors.value = result.errors

      window.alert('Invalid YAML configuration:\n' + result.errors.join('\n'))
      return
    }

    // Save to file
    if (props.projectPath) {
      await window.electronAPI.invoke('actions:save-config', {
        projectPath: props.projectPath,
        config: importYAML.value,
      })
    }

    // Reload configuration
    await loadConfiguration()
    showImportModal.value = false
    importYAML.value = ''
  } catch (error) {
    console.error('Failed to import configuration:', error)

    window.alert('Failed to import configuration. See console for details.')
  }
}

async function loadConfiguration() {
  try {
    if (!props.projectPath) return

    const yaml = (await window.electronAPI.invoke(
      'actions:load-config',
      props.projectPath
    )) as string | null

    if (yaml) {
      // Parse YAML and populate state
      // This is a simplified parser - in production use js-yaml or similar
      parseYAMLToState(yaml)
    }
  } catch (error) {
    console.error('Failed to load configuration:', error)
  }
}

function parseYAMLToState(yaml: string) {
  // Simplified YAML parsing
  // In production, use js-yaml library
  const lines = yaml.split('\n')
  let currentSection = ''
  let currentAction = ''

  actions.value.clear()
  groups.value = {}

  lines.forEach((line) => {
    const trimmed = line.trim()
    if (trimmed.startsWith('#') || trimmed === '') return

    if (trimmed === 'groups:') {
      currentSection = 'groups'
    } else if (trimmed === 'actions:') {
      currentSection = 'actions'
    } else if (trimmed === 'settings:') {
      currentSection = 'settings'
    } else if (currentSection === 'actions' && !line.startsWith(' ')) {
      currentAction = trimmed.replace(':', '')
      if (!actions.value.has(currentAction)) {
        actions.value.set(currentAction, {
          id: currentAction,
          name: '',
          description: '',
          command: '',
          dependencies: [],
        })
      }
    }
  })

  validateConfiguration()
}

async function saveConfiguration() {
  try {
    const yaml = generateYAML()
    emit('save', yaml)

    if (props.projectPath) {
      await window.electronAPI.invoke('actions:save-config', {
        projectPath: props.projectPath,
        config: yaml,
      })
    }
  } catch (error) {
    console.error('Failed to save configuration:', error)
  }
}

/**
 * Lifecycle
 */
onMounted(() => {
  loadConfiguration()
  emit('load')
})

watch(
  () => props.projectPath,
  () => {
    loadConfiguration()
  }
)
</script>

<style scoped>
.actions-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-primary);
  color: var(--text-primary);
}

/* Header */
.actions-editor__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.actions-editor__title h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.actions-editor__subtitle {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.actions-editor__actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.actions-editor__view-toggle {
  display: flex;
  gap: 0.25rem;
  padding: 0.25rem;
  background: var(--bg-secondary);
  border-radius: 0.5rem;
}

.view-toggle__btn {
  padding: 0.5rem 0.75rem;
  background: transparent;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.view-toggle__btn--active {
  background: var(--bg-primary);
  color: var(--text-primary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.actions-editor__btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.actions-editor__btn--secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.actions-editor__btn--secondary:hover {
  background: var(--bg-tertiary);
}

.actions-editor__btn--primary {
  background: var(--color-primary);
  color: white;
}

.actions-editor__btn--primary:hover {
  background: var(--color-primary-dark);
}

/* Validation Errors */
.actions-editor__errors {
  display: flex;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: #fef2f2;
  border-bottom: 1px solid #fecaca;
  color: #991b1b;
}

.errors__list {
  flex: 1;
}

.error__item {
  margin-bottom: 0.25rem;
  font-size: 0.875rem;
}

/* Content */
.actions-editor__content {
  flex: 1;
  overflow: hidden;
}

/* List View */
.content__list-view {
  display: grid;
  grid-template-columns: 1fr 350px;
  height: 100%;
  overflow: hidden;
}

.list-view__groups {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding: 1.5rem;
  overflow-y: auto;
}

.section__title {
  margin: 0 0 1rem 0;
  font-size: 1.125rem;
  font-weight: 600;
}

/* Groups */
.groups__list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.group__item {
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 0.75rem;
}

.group__header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.group__name {
  flex: 1;
  font-weight: 600;
}

.group__count {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.group__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.group__action-tag {
  padding: 0.25rem 0.75rem;
  background: var(--bg-tertiary);
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-family: 'Monaco', 'Menlo', monospace;
}

/* Actions List */
.actions__list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.action__card {
  padding: 1rem;
  background: var(--bg-secondary);
  border: 2px solid transparent;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.action__card:hover {
  border-color: var(--border-hover);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.action__card--selected {
  border-color: var(--color-primary);
  background: var(--bg-primary);
}

.action__header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.action__info {
  flex: 1;
}

.action__name {
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.action__id {
  font-size: 0.875rem;
  color: var(--text-secondary);
  font-family: 'Monaco', 'Menlo', monospace;
}

.action__actions {
  display: flex;
  gap: 0.5rem;
}

.action__btn {
  padding: 0.375rem;
  background: transparent;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.action__btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.action__btn--delete:hover {
  color: #dc2626;
}

.action__description {
  margin-bottom: 0.75rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.action__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.meta__item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.meta__command {
  padding: 0.125rem 0.5rem;
  background: var(--bg-tertiary);
  border-radius: 0.25rem;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 0.8125rem;
}

/* Detail Panel */
.list-view__detail {
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
  background: var(--bg-secondary);
  border-left: 1px solid var(--border-color);
  overflow-y: auto;
}

.detail__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.detail__header h3 {
  margin: 0;
  font-size: 1.25rem;
}

.detail__close {
  padding: 0.375rem;
  background: transparent;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  color: var(--text-secondary);
}

.detail__close:hover {
  background: var(--bg-tertiary);
}

.detail__content {
  flex: 1;
}

.detail__section {
  margin-bottom: 1.5rem;
}

.detail__section label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.detail__section code {
  display: block;
  padding: 0.75rem;
  background: var(--bg-tertiary);
  border-radius: 0.5rem;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 0.875rem;
}

.detail__command {
  word-break: break-all;
}

.detail__icon {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.detail__dependencies {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.dependency__tag {
  padding: 0.375rem 0.75rem;
  background: var(--bg-tertiary);
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-family: 'Monaco', 'Menlo', monospace;
}

.detail__empty {
  color: var(--text-secondary);
  font-style: italic;
  font-size: 0.875rem;
}

.detail__settings {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.setting__item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem;
  background: var(--bg-tertiary);
  border-radius: 0.375rem;
  font-size: 0.875rem;
}

.detail__order {
  padding: 0.75rem;
  background: var(--bg-tertiary);
  border-radius: 0.5rem;
  font-weight: 600;
  text-align: center;
}

.detail__actions {
  display: flex;
  gap: 0.75rem;
  margin-top: auto;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-color);
}

.detail__btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.detail__btn--secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.detail__btn--secondary:hover {
  background: var(--bg-quaternary);
}

.detail__btn--primary {
  background: var(--color-primary);
  color: white;
}

.detail__btn--primary:hover {
  background: var(--color-primary-dark);
}

/* DAG View */
.content__dag-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 1.5rem;
  overflow: hidden;
}

.dag-view__canvas {
  flex: 1;
  overflow: auto;
  background: var(--bg-secondary);
  border-radius: 0.75rem;
}

.dag-canvas {
  width: 100%;
  height: 100%;
  min-width: 1200px;
  min-height: 800px;
}

.connection__line {
  fill: none;
  stroke: var(--border-color);
  stroke-width: 2;
  transition: all 0.2s;
}

.connection__line--selected {
  stroke: var(--color-primary);
  stroke-width: 3;
}

.connection__line--circular {
  stroke: #ef4444;
  stroke-width: 3;
  stroke-dasharray: 8 4;
  animation: dash-flow 1s linear infinite;
}

@keyframes dash-flow {
  0% {
    stroke-dashoffset: 0;
  }
  100% {
    stroke-dashoffset: 24;
  }
}

.dag-node {
  cursor: pointer;
  transition: all 0.2s;
}

.dag-node:hover .node__bg {
  stroke: var(--color-primary);
  stroke-width: 2;
}

.dag-node--selected .node__bg {
  fill: var(--color-primary);
  stroke: var(--color-primary);
}

.dag-node--selected text {
  fill: white;
}

.node__bg {
  fill: var(--bg-tertiary);
  stroke: var(--border-color);
  stroke-width: 1;
  transition: all 0.2s;
}

.node__error-border {
  fill: none;
  stroke: #ef4444;
  stroke-width: 3;
  stroke-dasharray: 6 3;
  animation: pulse-error 2s ease-in-out infinite;
  pointer-events: none;
}

@keyframes pulse-error {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.dag-node--circular .node__bg {
  fill: #fef2f2;
}

.dag-node--circular .node__name,
.dag-node--circular .node__id {
  fill: #991b1b;
}

.dag-node--circular .node__level {
  fill: #b91c1c;
}

.node__name {
  font-size: 14px;
  font-weight: 600;
  fill: var(--text-primary);
}

.node__id {
  font-size: 12px;
  fill: var(--text-secondary);
  font-family: 'Monaco', 'Menlo', monospace;
}

.node__level {
  font-size: 11px;
  fill: var(--text-tertiary);
}

.dag-view__legend {
  display: flex;
  gap: 2rem;
  margin-top: 1rem;
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 0.5rem;
}

.legend__item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.875rem;
}

.legend__box {
  width: 24px;
  height: 24px;
  border-radius: 0.375rem;
  border: 2px solid var(--border-color);
}

.legend__box--level-0 {
  background: #10b981;
}

.legend__box--level-1 {
  background: #3b82f6;
}

.legend__box--level-2 {
  background: #8b5cf6;
}

.legend__box--circular {
  background: #fef2f2;
  border-color: #ef4444;
  border-width: 3px;
  position: relative;
}

.legend__box--circular::after {
  content: '!';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #ef4444;
  font-weight: bold;
  font-size: 14px;
}

.legend__item--error {
  color: #ef4444;
  font-weight: 600;
}

/* Modal Forms */
.edit-modal__content,
.import-modal__content {
  padding: 1.5rem;
}

.form__group {
  margin-bottom: 1.5rem;
}

.form__group label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
}

.form__input,
.form__textarea,
.form__select {
  width: 100%;
  padding: 0.625rem 0.875rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-primary);
  font-family: inherit;
}

.form__input:focus,
.form__textarea:focus,
.form__select:focus {
  outline: none;
  border-color: var(--color-primary);
}

.form__textarea {
  resize: vertical;
  font-family: 'Monaco', 'Menlo', monospace;
}

.import__textarea {
  width: 100%;
  min-height: 400px;
  padding: 1rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-family: 'Monaco', 'Menlo', monospace;
  color: var(--text-primary);
  resize: vertical;
}

.form__checkbox {
  margin-right: 0.5rem;
}

.form__row {
  display: flex;
  gap: 1rem;
}

.dependencies__input {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.dependencies__list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  min-height: 2rem;
}

.dependency__tag {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  background: var(--bg-quaternary);
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-family: 'Monaco', 'Menlo', monospace;
}

.dependency__remove {
  padding: 0.125rem;
  background: transparent;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  color: var(--text-secondary);
  line-height: 1;
}

.dependency__remove:hover {
  background: var(--bg-tertiary);
  color: #dc2626;
}

.edit-modal__actions,
.import-modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.5rem;
  border-top: 1px solid var(--border-color);
}

.modal__btn {
  padding: 0.625rem 1.25rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.modal__btn--secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.modal__btn--secondary:hover {
  background: var(--bg-tertiary);
}

.modal__btn--primary {
  background: var(--color-primary);
  color: white;
}

.modal__btn--primary:hover {
  background: var(--color-primary-dark);
}

.modal__btn--primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .actions-editor__errors {
    background: #7f1d1d;
    border-color: #991b1b;
    color: #fecaca;
  }
}
</style>
