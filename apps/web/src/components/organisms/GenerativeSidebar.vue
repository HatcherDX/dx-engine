<template>
  <div class="generative-sidebar">
    <!-- Background Tasks Section -->
    <div class="tasks-section">
      <h3 class="section-title">Background Tasks</h3>
      <div class="tasks-list">
        <div
          v-for="task in backgroundTasks"
          :key="task.id"
          class="task-row"
          @click="handleTaskClick(task)"
        >
          <div class="task-status">
            <div
              class="status-indicator"
              :class="getStatusClass(task.status)"
            ></div>
          </div>
          <div class="task-content">
            <div class="task-title">{{ task.title }}</div>
            <div class="task-command">{{ task.command }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface BackgroundTask {
  id: string
  title: string
  command: string
  status: 'success' | 'running' | 'error' | 'inactive'
}

const backgroundTasks = ref<BackgroundTask[]>([
  {
    id: 'lint',
    title: 'Code Quality',
    command: 'pnpm lint',
    status: 'success',
  },
  {
    id: 'test',
    title: 'Unit Tests',
    command: 'pnpm test',
    status: 'running',
  },
  {
    id: 'typecheck',
    title: 'Type Check',
    command: 'pnpm typecheck',
    status: 'success',
  },
  {
    id: 'build',
    title: 'Build Process',
    command: 'pnpm build',
    status: 'inactive',
  },
])

const handleTaskClick = (task: BackgroundTask) => {
  console.log('Task clicked:', task.id)
}

const getStatusClass = (status: BackgroundTask['status']) => {
  switch (status) {
    case 'success':
      return 'status-success'
    case 'running':
      return 'status-running'
    case 'error':
      return 'status-error'
    case 'inactive':
      return 'status-inactive'
    default:
      return 'status-inactive'
  }
}
</script>

<style scoped>
.generative-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* Tasks Section */
.tasks-section {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  margin: 0 -16px;
  padding-left: 16px;
  padding-right: 16px;
  width: calc(100% + 32px);
  border-radius: 0;
  cursor: pointer;
  transition: background-color var(--transition-fast);
  -webkit-app-region: no-drag;
}

.task-row:hover {
  background-color: var(--hover-bg-light);
}

.dark .task-row:hover {
  background-color: var(--hover-bg-dark);
}

.task-status {
  flex-shrink: 0;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-success {
  background-color: #10b981;
}

.status-running {
  background-color: #f59e0b;
  animation: pulse 2s infinite;
}

.status-error {
  background-color: #ef4444;
}

.status-inactive {
  background-color: var(--text-tertiary);
}

.task-content {
  flex: 1;
  min-width: 0;
}

.task-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.task-command {
  font-size: 11px;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  color: var(--text-tertiary);
}

/* Animations */
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* Scrollbar for tasks */
.tasks-section::-webkit-scrollbar {
  width: 4px;
}

.tasks-section::-webkit-scrollbar-track {
  background: transparent;
}

.tasks-section::-webkit-scrollbar-thumb {
  background: var(--border-sidebar);
  border-radius: 2px;
}
</style>
