<template>
  <div class="generative-sidebar">
    <!-- Tab Navigation - 4 Panels -->
    <div class="tab-navigation icon-nav">
      <button
        v-luxury-tooltip="{
          content: 'Autopilots',
          placement: 'bottom-start',
          delay: [500, 0],
        }"
        class="tab-button icon-only"
        :class="{ active: activeTab === 'autopilots' }"
        :aria-label="'Autopilots'"
        @click="setActiveTab('autopilots')"
      >
        <BaseIcon name="Chevrons" size="sm" />
      </button>
      <button
        v-luxury-tooltip="{
          content: 'Playbooks',
          placement: 'bottom-start',
          delay: [500, 0],
        }"
        class="tab-button icon-only"
        :class="{ active: activeTab === 'playbooks' }"
        :aria-label="'Playbooks'"
        @click="setActiveTab('playbooks')"
      >
        <BaseIcon name="BookOpen" size="sm" />
      </button>
      <button
        v-luxury-tooltip="{
          content: 'Missions',
          placement: 'bottom-start',
          delay: [500, 0],
        }"
        class="tab-button icon-only"
        :class="{ active: activeTab === 'missions' }"
        :aria-label="'Missions'"
        @click="setActiveTab('missions')"
      >
        <BaseIcon name="Target" size="sm" />
      </button>
      <button
        v-luxury-tooltip="{
          content: 'History',
          placement: 'bottom-start',
          delay: [500, 0],
        }"
        class="tab-button icon-only"
        :class="{ active: activeTab === 'history' }"
        :aria-label="'History'"
        @click="setActiveTab('history')"
      >
        <BaseIcon name="Clock" size="sm" />
      </button>
    </div>

    <!-- Tab Content -->
    <div class="tab-content">
      <!-- History Tab -->
      <div v-if="activeTab === 'history'" class="history-section">
        <div class="section-header">
          <h3 class="section-title">Prompt History</h3>
          <button
            v-luxury-tooltip="{
              content: 'Clear history',
              placement: 'left',
              delay: [500, 0],
            }"
            class="clear-button"
            @click="clearHistory"
          >
            <BaseIcon name="X" size="xs" />
          </button>
        </div>

        <div class="history-list">
          <div
            v-for="prompt in promptHistory"
            :key="prompt.id"
            class="history-item"
            @click="selectPrompt(prompt)"
          >
            <div class="history-content">
              <div class="history-text">{{ prompt.text }}</div>
              <div class="history-meta">
                <span class="history-time">{{
                  formatTime(prompt.timestamp)
                }}</span>
                <span v-if="prompt.mode" class="history-mode">{{
                  prompt.mode
                }}</span>
              </div>
            </div>
          </div>

          <div v-if="promptHistory.length === 0" class="empty-state">
            <BaseIcon name="Clock" size="sm" />
            <p>No prompts in history yet</p>
            <span>Your recent prompts will appear here</span>
          </div>
        </div>
      </div>

      <!-- Autopilots Tab -->
      <div v-if="activeTab === 'autopilots'" class="panel-section">
        <div class="search-container">
          <BaseIcon name="Search" size="xs" class="search-icon" />
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="`Search ${filteredScripts.length} autopilots...`"
            class="search-input"
          />
        </div>
        <div class="resource-list">
          <div
            v-for="script in filteredScripts"
            :key="script.id"
            class="resource-item"
            @click="selectResource(script)"
          >
            <div class="resource-content">
              <div class="resource-name">{{ script.name }}</div>
              <div class="resource-description">
                {{ script.description }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Playbooks Tab -->
      <div v-if="activeTab === 'playbooks'" class="panel-section">
        <div class="search-container">
          <BaseIcon name="Search" size="xs" class="search-icon" />
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="`Search ${filteredPlaybooks.length} playbooks...`"
            class="search-input"
          />
        </div>
        <div class="resource-list">
          <div
            v-for="playbook in filteredPlaybooks"
            :key="playbook.id"
            class="resource-item"
            @click="selectResource(playbook)"
          >
            <div class="resource-content">
              <div class="resource-name">{{ playbook.name }}</div>
              <div class="resource-description">
                {{ playbook.description }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Missions Tab -->
      <div v-if="activeTab === 'missions'" class="panel-section">
        <div class="search-container">
          <BaseIcon name="Search" size="xs" class="search-icon" />
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="`Search ${filteredSavedPrompts.length} missions...`"
            class="search-input"
          />
        </div>
        <div class="resource-list">
          <div
            v-for="prompt in filteredSavedPrompts"
            :key="prompt.id"
            class="resource-item"
            @click="selectResource(prompt)"
          >
            <div class="resource-content">
              <div class="resource-name">{{ prompt.name }}</div>
              <div class="resource-description">
                {{
                  prompt.text
                    ? prompt.text.substring(0, 80) + '...'
                    : prompt.description
                }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import BaseIcon from '../atoms/BaseIcon.vue'
import { vLuxuryTooltip } from '../../composables/useLuxuryTooltip'

// Tab state
const activeTab = ref<'autopilots' | 'playbooks' | 'missions' | 'history'>(
  'autopilots'
)

// Search state
const searchQuery = ref('')

// Interfaces
interface PromptHistoryItem {
  id: string
  text: string
  timestamp: Date
  mode?: string
}

interface Resource {
  id: string
  name: string
  description: string
  type: 'playbook' | 'script' | 'prompt'
  content?: string
  text?: string // For saved prompts
}

// Mock data - will be replaced with real data later
const promptHistory = ref<PromptHistoryItem[]>([
  {
    id: '1',
    text: 'Create a new React component for user authentication',
    timestamp: new Date(Date.now() - 300000), // 5 minutes ago
    mode: 'generative',
  },
  {
    id: '2',
    text: 'Explain the difference between map and forEach in JavaScript',
    timestamp: new Date(Date.now() - 900000), // 15 minutes ago
    mode: 'generative',
  },
  {
    id: '3',
    text: 'Generate a TypeScript interface for user data',
    timestamp: new Date(Date.now() - 1800000), // 30 minutes ago
    mode: 'generative',
  },
])

const playbooks = ref<Resource[]>([
  {
    id: 'pb1',
    name: 'Modern Patterns v2',
    description: 'Architectural patterns for refactoring legacy codebases',
    type: 'playbook',
  },
  {
    id: 'pb2',
    name: 'Zero-Downtime Deploy',
    description: 'Blue-green deployment with automatic rollback',
    type: 'playbook',
  },
  {
    id: 'pb3',
    name: 'Microservices Split',
    description: 'Breaking monoliths into distributed services',
    type: 'playbook',
  },
  {
    id: 'pb4',
    name: 'Performance Optimization',
    description: 'Database indexing and query optimization patterns',
    type: 'playbook',
  },
])

const scripts = ref<Resource[]>([
  {
    id: 's1',
    name: 'Coverage Autopilot',
    description: 'Achieves 100% test coverage while you sleep',
    type: 'script',
  },
  {
    id: 's2',
    name: 'Refactor Autopilot',
    description: 'Modernizes legacy code following your exact patterns',
    type: 'script',
  },
  {
    id: 's3',
    name: 'Migration Autopilot',
    description: 'Executes complex migrations with zero downtime',
    type: 'script',
  },
  {
    id: 's4',
    name: 'Documentation Autopilot',
    description: 'Generates exhaustive API documentation with examples',
    type: 'script',
  },
  {
    id: 's5',
    name: 'Security Autopilot',
    description: 'Audits and patches vulnerabilities before they matter',
    type: 'script',
  },
])

const savedPrompts = ref<Resource[]>([
  {
    id: 'sp1',
    name: 'Mission: Full Coverage',
    text: 'Deploy Coverage Autopilot to achieve 100% test coverage on src/legacy module. Constraints: maintain backward compatibility, max runtime 6 hours',
    description: 'Overnight test generation mission',
    type: 'prompt',
  },
  {
    id: 'sp2',
    name: 'Mission: API Modernization',
    text: 'Execute Refactor Autopilot on REST endpoints. Apply modern-patterns-v2 playbook. Preserve public API, require all tests passing',
    description: 'Legacy API refactoring mission',
    type: 'prompt',
  },
  {
    id: 'sp3',
    name: 'Mission: Security Audit',
    text: 'Launch Security Autopilot for full vulnerability scan. Auto-patch critical issues, generate report for manual review on medium-risk items',
    description: 'Automated security hardening',
    type: 'prompt',
  },
])

// Computed properties for filtering
const filteredPlaybooks = computed(() =>
  playbooks.value.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
)

const filteredScripts = computed(() =>
  scripts.value.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
)

const filteredSavedPrompts = computed(() =>
  savedPrompts.value.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      (item.text &&
        item.text.toLowerCase().includes(searchQuery.value.toLowerCase()))
  )
)

// Methods
const setActiveTab = (
  tab: 'autopilots' | 'playbooks' | 'missions' | 'history'
) => {
  activeTab.value = tab
}

const clearHistory = () => {
  promptHistory.value = []
}

const selectPrompt = (prompt: PromptHistoryItem) => {
  console.log('Selected prompt:', prompt.text)
  // TODO: Emit event to parent to fill chat input
}

const selectResource = (resource: Resource) => {
  console.log('Selected resource:', resource.name)
  // TODO: Emit event to parent or handle resource selection
}

const formatTime = (timestamp: Date) => {
  const now = new Date()
  const diff = now.getTime() - timestamp.getTime()

  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}
</script>

<style scoped>
.generative-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* Tab Navigation */
.tab-navigation {
  display: flex;
  height: var(--header-height);
  border-bottom: none;
  /* Subtle darker background for natural separation */
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--bg-sidebar) 98%, black) 0%,
    color-mix(in srgb, var(--bg-sidebar) 95%, black) 100%
  );
  /* Enhanced shadow for 3D depth effect */
  box-shadow:
    0 1px 0 0 rgba(0, 0, 0, 0.12),
    inset 0 1px 0 0 rgba(255, 255, 255, 0.015);
}

.dark .tab-navigation {
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0.1) 0%,
    rgba(0, 0, 0, 0.15) 100%
  );
}

.tab-navigation.icon-nav {
  justify-content: flex-start;
  align-items: stretch;
  padding: 0;
  gap: 0; /* No gap - buttons sit flush together */
}

.tab-button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 100%; /* Fill parent height */
  padding: 0 8px; /* Only horizontal padding since height is controlled by parent */
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  -webkit-app-region: no-drag;
}

.tab-button.icon-only {
  flex: 0 0 auto;
  width: 40px; /* Square buttons */
  padding: 0;
  border-radius: 0; /* No border radius - rectangular/square */
  position: relative;
  opacity: 0.7; /* Reduced opacity for inactive buttons */
  transition: all var(--transition-fast);
}

.tab-button.icon-only:hover {
  color: var(--text-primary);
  background: var(--hover-bg-light);
  opacity: 1; /* Full opacity on hover */
}

.dark .tab-button.icon-only:hover {
  background: var(--hover-bg-dark);
}

.tab-button.icon-only.active {
  color: var(--text-on-accent);
  background: var(--accent-primary);
  opacity: 1; /* Active button always has full opacity */
  border-bottom: none;
  box-shadow: none;
  font-weight: 600;
  position: relative;
}

.tab-button.icon-only.active svg {
  color: var(--text-on-accent);
}

.tab-button.icon-only.active:hover {
  background: var(--accent-primary-hover);
}

.dark .tab-button.icon-only.active {
  background: var(--accent-primary);
  color: var(--text-on-accent);
}

.dark .tab-button.icon-only.active:hover {
  background: var(--accent-primary-hover);
}

.dark .tab-button.icon-only.active svg {
  color: var(--text-on-accent);
}

.tab-button:hover {
  color: var(--text-secondary);
  background: var(--hover-bg-light);
}

.dark .tab-button:hover {
  background: var(--hover-bg-dark);
}

.tab-button.active {
  color: var(--accent-primary);
  background: var(--bg-sidebar);
  border-bottom: 2px solid var(--accent-primary);
  /* Subtle inset shadow for active state depth */
  box-shadow: inset 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

/* Tab Content */
.tab-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* History Section */
.history-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 12px;
  border-bottom: 1px solid var(--border-sidebar);
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0;
}

.clear-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  border-radius: 4px;
  transition: all var(--transition-fast);
  -webkit-app-region: no-drag;
}

.clear-button:hover {
  background: var(--hover-bg-light);
  color: var(--text-secondary);
}

.dark .clear-button:hover {
  background: var(--hover-bg-dark);
}

.history-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.history-item {
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color var(--transition-fast);
  -webkit-app-region: no-drag;
}

.history-item:hover {
  background: var(--hover-bg-light);
}

.dark .history-item:hover {
  background: var(--hover-bg-dark);
}

.history-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.history-text {
  font-size: 13px;
  color: var(--text-primary);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.history-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.history-time {
  font-size: 11px;
  color: var(--text-tertiary);
}

.history-mode {
  font-size: 10px;
  color: var(--accent-primary);
  background: var(--accent-primary-alpha);
  padding: 2px 6px;
  border-radius: 8px;
  text-transform: uppercase;
  font-weight: 600;
}

/* Panel Sections (Autopilots, Playbooks, Missions) */
.panel-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.search-container {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 36px;
  border-bottom: 1px solid var(--border-sidebar);
  background: var(--bg-sidebar);
  transition: all var(--transition-fast);
  cursor: text;
  padding: 0 0.75rem;
}

.search-container:hover {
  background: var(--hover-bg-light);
}

.dark .search-container:hover {
  background: var(--hover-bg-dark);
}

.search-container:focus-within {
  background: var(--bg-primary);
  border-bottom-color: var(--accent-primary);
}

.dark .search-container:focus-within {
  background: rgba(30, 30, 35, 0.6);
}

.search-icon {
  position: absolute;
  left: 12px;
  color: var(--text-tertiary);
  pointer-events: none;
  transition: color var(--transition-fast);
  width: 14px;
  height: 14px;
}

.search-container:focus-within .search-icon {
  color: var(--accent-primary);
}

.search-input {
  width: 100%;
  height: 100%;
  padding: 8px 8px 8px 28px;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 400;
  transition: all var(--transition-fast);
}

.search-input:focus {
  outline: none;
}

.search-input::placeholder {
  color: var(--text-tertiary);
  font-weight: 400;
}

/* Resource Categories */
.resource-categories {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.category-section {
  margin-bottom: 16px;
}

.category-title {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0;
}

.resource-list {
  display: flex;
  flex-direction: column;
}

.resource-item {
  padding: 10px 16px;
  cursor: pointer;
  transition: background-color var(--transition-fast);
  -webkit-app-region: no-drag;
}

.resource-item:hover {
  background: var(--hover-bg-light);
}

.dark .resource-item:hover {
  background: var(--hover-bg-dark);
}

.resource-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.resource-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
}

.resource-description {
  font-size: 11px;
  color: var(--text-tertiary);
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  text-align: center;
  color: var(--text-tertiary);
}

.empty-state p {
  margin: 8px 0 4px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}

.empty-state span {
  font-size: 11px;
  color: var(--text-tertiary);
}

/* Scrollbars */
.history-list::-webkit-scrollbar,
.resource-categories::-webkit-scrollbar {
  width: 4px;
}

.history-list::-webkit-scrollbar-track,
.resource-categories::-webkit-scrollbar-track {
  background: transparent;
}

.history-list::-webkit-scrollbar-thumb,
.resource-categories::-webkit-scrollbar-thumb {
  background: var(--border-sidebar);
  border-radius: 2px;
}
</style>
