<template>
  <div class="visual-sidebar">
    <!-- Layer Inspector Section -->
    <div class="inspector-section">
      <h3 class="section-title">Layers</h3>
      <div class="layers-tree">
        <div
          v-for="component in componentTree"
          :key="component.id"
          class="layer-item"
          :class="{
            'layer-selected': component.id === selectedComponentId,
          }"
          :style="{ paddingLeft: `${component.depth * 16 + 8}px` }"
          @click="selectComponent(component)"
        >
          <div class="layer-content">
            <BaseIcon
              v-if="component.children?.length"
              :name="component.expanded ? 'ArrowRight' : 'ArrowRight'"
              size="xs"
              class="expand-icon"
              :class="{ expanded: component.expanded }"
              @click.stop="toggleExpanded(component)"
            />
            <BaseIcon
              :name="getComponentIcon(component.type)"
              size="xs"
              class="component-icon"
            />
            <span class="component-name">{{ component.name }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Logo Section -->
    <div class="logo-section">
      <BaseLogo size="lg" variant="inline" class="sidebar-content-logo" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import BaseIcon from '../atoms/BaseIcon.vue'
import BaseLogo from '../atoms/BaseLogo.vue'

interface ComponentNode {
  id: string
  name: string
  type: 'container' | 'text' | 'button' | 'input' | 'image'
  depth: number
  expanded: boolean
  children?: ComponentNode[]
}

const selectedComponentId = ref<string>('app')

const componentTree = ref<ComponentNode[]>([
  {
    id: 'app',
    name: 'App',
    type: 'container',
    depth: 0,
    expanded: true,
    children: [
      {
        id: 'header',
        name: 'Header',
        type: 'container',
        depth: 1,
        expanded: true,
        children: [
          {
            id: 'logo',
            name: 'Logo',
            type: 'image',
            depth: 2,
            expanded: false,
          },
          {
            id: 'nav',
            name: 'Navigation',
            type: 'container',
            depth: 2,
            expanded: false,
          },
        ],
      },
      {
        id: 'main',
        name: 'Main Content',
        type: 'container',
        depth: 1,
        expanded: true,
        children: [
          {
            id: 'sidebar',
            name: 'Sidebar',
            type: 'container',
            depth: 2,
            expanded: false,
          },
          {
            id: 'content',
            name: 'Content Area',
            type: 'container',
            depth: 2,
            expanded: false,
          },
        ],
      },
      {
        id: 'footer',
        name: 'Footer',
        type: 'container',
        depth: 1,
        expanded: false,
      },
    ],
  },
])

const selectComponent = (component: ComponentNode) => {
  selectedComponentId.value = component.id
  // Emit event to update properties panel
  console.log('Selected component:', component.name)
}

const toggleExpanded = (component: ComponentNode) => {
  component.expanded = !component.expanded
}

const getComponentIcon = (type: ComponentNode['type']) => {
  switch (type) {
    case 'container':
      return 'Menu'
    case 'text':
      return 'Terminal'
    case 'button':
      return 'Eye'
    case 'input':
      return 'Code'
    case 'image':
      return 'GitBranch'
    default:
      return 'Menu'
  }
}
</script>

<style scoped>
.visual-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-x: hidden;
}

/* Inspector Section */
.inspector-section {
  flex: 1;
  padding: 16px 0;
  overflow-y: auto;
  overflow-x: hidden;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 0 16px;
}

.layers-tree {
  display: flex;
  flex-direction: column;
}

.layer-item {
  display: flex;
  align-items: center;
  min-height: 28px;
  cursor: pointer;
  transition: background-color var(--transition-fast);
  -webkit-app-region: no-drag;
  margin: 0 -16px;
  padding-right: 16px;
  border-radius: 0;
  width: calc(100% + 32px);
  max-width: calc(100% + 32px);
  overflow: hidden;
}

.layer-item:hover {
  background-color: var(--hover-bg-light);
}

.dark .layer-item:hover {
  background-color: var(--hover-bg-dark);
}

/* Disable hover effect for selected items */
.layer-item.layer-selected:hover {
  background-color: var(--accent-primary);
}

.layer-selected {
  background-color: var(--accent-primary);
  color: white;
}

.layer-selected .component-name {
  color: white;
}

.layer-content {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
}

.expand-icon {
  color: var(--text-tertiary);
  transition: transform var(--transition-fast);
  cursor: pointer;
}

.expand-icon.expanded {
  transform: rotate(90deg);
}

.component-icon {
  color: var(--accent-primary);
  flex-shrink: 0;
}

.layer-selected .component-icon {
  color: white;
}

.component-name {
  font-size: 13px;
  font-weight: 400;
  color: var(--text-primary);
}

/* Logo Section */
.logo-section {
  padding: 16px;
  border-top: 1px solid var(--border-sidebar);
  display: flex;
  justify-content: center;
}

/* Scrollbar for layers */
.inspector-section::-webkit-scrollbar {
  width: 4px;
}

.inspector-section::-webkit-scrollbar-track {
  background: transparent;
}

.inspector-section::-webkit-scrollbar-thumb {
  background: var(--border-sidebar);
  border-radius: 2px;
}
</style>
