<template>
  <div class="ai-model-selector">
    <!-- Project Name (Static) -->
    <div class="selector-segment project-segment">
      <span class="segment-text">{{ project }}</span>
    </div>

    <span class="separator">→</span>

    <!-- Agent Selector (Dropdown) -->
    <Menu as="div" class="selector-dropdown">
      <MenuButton class="selector-segment dropdown-segment">
        <span class="segment-text">{{ selectedAgent }}</span>
        <BaseIcon name="ChevronDown" size="2xs" class="dropdown-icon" />
      </MenuButton>

      <transition
        enter-active-class="transition duration-100 ease-out"
        enter-from-class="transform scale-95 opacity-0"
        enter-to-class="transform scale-100 opacity-100"
        leave-active-class="transition duration-75 ease-out"
        leave-from-class="transform scale-100 opacity-100"
        leave-to-class="transform scale-95 opacity-0"
      >
        <MenuItems class="dropdown-menu">
          <MenuItem
            v-for="agent in availableAgents"
            :key="agent"
            v-slot="{ active }"
            @click="handleAgentChange(agent)"
          >
            <div :class="['dropdown-item', { active }]">
              {{ agent }}
            </div>
          </MenuItem>
        </MenuItems>
      </transition>
    </Menu>

    <span class="separator">→</span>

    <!-- Model Selector (Dropdown) -->
    <Menu as="div" class="selector-dropdown">
      <MenuButton class="selector-segment dropdown-segment">
        <span class="segment-text">{{ selectedModel }}</span>
        <BaseIcon name="ChevronDown" size="2xs" class="dropdown-icon" />
      </MenuButton>

      <transition
        enter-active-class="transition duration-100 ease-out"
        enter-from-class="transform scale-95 opacity-0"
        enter-to-class="transform scale-100 opacity-100"
        leave-active-class="transition duration-75 ease-out"
        leave-from-class="transform scale-100 opacity-100"
        leave-to-class="transform scale-95 opacity-0"
      >
        <MenuItems class="dropdown-menu">
          <MenuItem
            v-for="model in availableModels"
            :key="model"
            v-slot="{ active }"
            @click="handleModelChange(model)"
          >
            <div :class="['dropdown-item', { active }]">
              {{ model }}
            </div>
          </MenuItem>
        </MenuItems>
      </transition>
    </Menu>
  </div>
</template>

<script setup lang="ts">
/**
 * @fileoverview AI Model Selector component for choosing AI agents and models.
 *
 * @description
 * A luxury glassmorphism selector that displays the current project,
 * selected AI agent, and model. Provides dropdown menus for changing
 * the agent and model. Designed for the generative mode in AddressBar.
 *
 * @example
 * ```vue
 * <template>
 *   <AIModelSelector
 *     project="hatcher::decklog"
 *     :selected-agent="currentAgent"
 *     :selected-model="currentModel"
 *     @update:agent="handleAgentChange"
 *     @update:model="handleModelChange"
 *   />
 * </template>
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/vue'
import BaseIcon from '../atoms/BaseIcon.vue'

interface Props {
  /**
   * Project identifier displayed on the left.
   * @defaultValue "hatcher::decklog"
   */
  project?: string

  /**
   * Currently selected AI agent.
   * @defaultValue "Claude Code"
   */
  selectedAgent?: string

  /**
   * Currently selected AI model.
   * @defaultValue "Sonnet 4.5"
   */
  selectedModel?: string

  /**
   * Available AI agents for selection.
   * @defaultValue ["Claude Code", "GPT-5", "Gemini"]
   */
  availableAgents?: string[]

  /**
   * Available AI models for selection.
   * @defaultValue ["Sonnet 4.5", "Sonnet 3.5", "Opus"]
   */
  availableModels?: string[]
}

interface Emits {
  /**
   * Emitted when the AI agent is changed.
   * @param agent - The newly selected agent name
   */
  'update:agent': [agent: string]

  /**
   * Emitted when the AI model is changed.
   * @param model - The newly selected model name
   */
  'update:model': [model: string]
}

withDefaults(defineProps<Props>(), {
  project: 'hatcher::decklog',
  selectedAgent: 'Claude Code',
  selectedModel: 'Sonnet 4.5',
  availableAgents: () => ['Claude Code', 'GPT-5', 'Gemini'],
  availableModels: () => ['Sonnet 4.5', 'Sonnet 3.5', 'Opus'],
})

const emit = defineEmits<Emits>()

/**
 * Handles agent selection change.
 *
 * @param agent - The newly selected agent
 */
const handleAgentChange = (agent: string) => {
  emit('update:agent', agent)
}

/**
 * Handles model selection change.
 *
 * @param model - The newly selected model
 */
const handleModelChange = (model: string) => {
  emit('update:model', model)
}
</script>

<style scoped>
.ai-model-selector {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  flex-shrink: 0;
  -webkit-app-region: no-drag;
}

/* Segment base styles */
.selector-segment {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.15s ease;
  white-space: nowrap;
}

/* Project segment (static, non-interactive) - matching hatcher::actions style */
.project-segment {
  padding-left: 0;
}

.project-segment .segment-text {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.3px;
  font-family: var(--font-mono);
  opacity: 0.4;
}

/* Dropdown segment (interactive) */
.dropdown-segment {
  background: transparent;
  border: none;
  cursor: pointer;
  position: relative;
}

.dropdown-segment:hover {
  background: var(--bg-secondary);
}

.dark .dropdown-segment:hover {
  background: rgba(255, 255, 255, 0.05);
}

.segment-text {
  line-height: 1;
}

/* Dropdown icon */
.dropdown-icon {
  opacity: 0.6;
  transition: opacity 0.15s ease;
}

.dropdown-segment:hover .dropdown-icon {
  opacity: 1;
}

/* Separator */
.separator {
  color: var(--text-tertiary);
  opacity: 0.5;
  font-size: 11px;
}

/* Dropdown container */
.selector-dropdown {
  position: relative;
}

/* Dropdown menu - luxury glassmorphism */
.dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  min-width: 160px;
  padding: 4px;
  border-radius: 8px;
  z-index: 1000;
  outline: none;

  /* Light mode glassmorphism */
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px) saturate(180%);
  -webkit-backdrop-filter: blur(12px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.08),
    0 0 0 0.5px rgba(0, 0, 0, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

/* Dark mode dropdown menu */
.dark .dropdown-menu {
  background: rgba(30, 30, 35, 0.85);
  backdrop-filter: blur(16px) saturate(150%);
  -webkit-backdrop-filter: blur(16px) saturate(150%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.4),
    0 0 0 0.5px rgba(255, 255, 255, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.03);
}

/* Dropdown item */
.dropdown-item {
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  color: var(--text-primary);
  transition: all 0.15s ease;
}

.dropdown-item.active {
  background: var(--accent-primary);
  color: white;
}

.dropdown-item:not(.active):hover {
  background: var(--bg-tertiary);
}

.dark .dropdown-item:not(.active):hover {
  background: rgba(255, 255, 255, 0.08);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .ai-model-selector {
    font-size: 11px;
    gap: 4px;
  }

  .selector-segment {
    padding: 3px 6px;
  }
}
</style>
