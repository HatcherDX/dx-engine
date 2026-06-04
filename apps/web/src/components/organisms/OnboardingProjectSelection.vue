<template>
  <div class="onboarding-project-selection">
    <div class="project-container">
      <div class="project-content">
        <!-- Grid Layout -->
        <div class="content-grid">
          <!-- Top Row: Logo + Start a Project | Recent Projects -->
          <div class="top-row">
            <!-- Left: Logo + Start a Project -->
            <div class="left-column">
              <!-- Logo Section -->
              <div class="logo-section">
                <div class="logo-with-back">
                  <BaseLogo size="xl" variant="word-mark" />
                </div>
              </div>

              <!-- Start a Project Section -->
              <div class="actions-section">
                <h2 class="section-title">Start a Project</h2>
                <div class="action-buttons">
                  <!-- Open Project button -->
                  <CtaButton
                    v-disable-terminal
                    :class="{ 'press-active': isOpenButtonActive }"
                    :disabled="isOpeningProject"
                    @click="handleOpenProject"
                  >
                    <BaseIcon
                      :name="isOpeningProject ? 'Loader' : 'FolderOpen'"
                      size="sm"
                      class="button-icon"
                    />
                    {{ isOpeningProject ? 'Opening...' : 'Open Project...' }}
                  </CtaButton>

                  <!-- Disabled buttons with tooltips -->
                  <div class="disabled-button-wrapper" title="Coming soon">
                    <BaseButton
                      v-disable-terminal
                      variant="outline"
                      size="lg"
                      class="action-button disabled-action"
                      disabled
                    >
                      <span class="button-content">
                        <BaseIcon name="Plus" size="sm" class="button-icon" />
                        New Project
                      </span>
                    </BaseButton>
                  </div>

                  <div class="disabled-button-wrapper" title="Coming soon">
                    <BaseButton
                      v-disable-terminal
                      variant="outline"
                      size="lg"
                      class="action-button disabled-action"
                      disabled
                    >
                      <span class="button-content">
                        <BaseIcon
                          name="GitBranch"
                          size="sm"
                          class="button-icon"
                        />
                        Clone from Git...
                      </span>
                    </BaseButton>
                  </div>
                </div>
              </div>
            </div>

            <!-- Right: Recent Projects -->
            <div class="right-column">
              <div class="recent-section">
                <div class="section-header">
                  <div class="icon-wrapper-inline">
                    <BaseIcon name="Folder" size="md" class="header-icon" />
                  </div>
                  <h2 class="section-title">Recent Projects</h2>
                </div>
                <div class="recent-projects">
                  <!-- Loading state -->
                  <div v-if="isLoadingProjects" class="projects-loading">
                    <div class="loading-item">
                      <BaseIcon name="Loader" size="sm" class="loading-icon" />
                      <span>Loading recent projects...</span>
                    </div>
                  </div>

                  <!-- Error state -->
                  <div v-else-if="storageError" class="projects-error">
                    <div class="error-message">
                      <BaseIcon name="Bug" size="sm" class="error-icon" />
                      <span>{{ storageError }}</span>
                    </div>
                  </div>

                  <!-- Empty state -->
                  <div
                    v-else-if="recentProjects.length === 0"
                    class="projects-empty"
                  >
                    <div class="empty-message">
                      <BaseIcon name="Folder" size="md" class="empty-icon" />
                      <span>No recent projects</span>
                      <p class="empty-subtitle">
                        Open your first project to get started
                      </p>
                    </div>
                  </div>

                  <!-- Project list -->
                  <div
                    v-for="(project, index) in recentProjects"
                    v-else
                    :key="project.id"
                    v-disable-terminal
                    class="project-item"
                    :class="{ 'press-active': activeProjectIndex === index }"
                    @click="handleRecentProjectSelect(project)"
                  >
                    <div class="project-left">
                      <div class="project-icon">
                        <BaseIcon name="Folder" size="md" />
                      </div>
                      <div class="project-info">
                        <h3 class="project-name">{{ project.name }}</h3>
                        <p class="project-path">
                          {{ truncatePath(project.path, 250) }}
                        </p>
                        <div
                          v-if="project.metadata?.framework"
                          class="project-metadata"
                        >
                          <span class="project-framework">{{
                            project.metadata.framework
                          }}</span>
                          <span
                            v-if="project.metadata.packageManager"
                            class="project-separator"
                            >•</span
                          >
                          <span
                            v-if="project.metadata.packageManager"
                            class="project-package-manager"
                          >
                            {{ project.metadata.packageManager }}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div class="project-right">
                      <div class="project-date">
                        {{ formatRelativeTime(project.lastOpened) }}
                      </div>
                      <BaseIcon
                        name="ArrowRight"
                        size="sm"
                        class="project-arrow"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom Row: Learn & Discover (full width) -->
          <div class="bottom-row">
            <div class="learn-section">
              <h2 class="section-title">Learn & Discover</h2>
              <div class="learn-cards">
                <div
                  v-disable-terminal
                  class="learn-card disabled-card"
                  title="Coming soon"
                >
                  <div class="card-icon">
                    <BaseIcon name="BookOpen" size="md" />
                  </div>
                  <h3 class="card-title">Getting Started Guide</h3>
                  <p class="card-description">
                    Learn the basics of Controlled Amplification
                  </p>
                </div>
                <div
                  v-disable-terminal
                  class="learn-card disabled-card"
                  title="Coming soon"
                >
                  <div class="card-icon">
                    <BaseIcon name="PlayCircle" size="md" />
                  </div>
                  <h3 class="card-title">Video Tutorials</h3>
                  <p class="card-description">
                    Watch how to use Visual-to-Code bridge
                  </p>
                </div>
                <div
                  v-disable-terminal
                  class="learn-card disabled-card"
                  title="Coming soon"
                >
                  <div class="card-icon">
                    <BaseIcon name="Settings" size="md" />
                  </div>
                  <h3 class="card-title">Best Practices</h3>
                  <p class="card-description">Master advanced IDE features</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useOnboarding } from '../../composables/useOnboarding'
import { useSmartTruncation } from '../../composables/useSmartTruncation'
import { useNotifications } from '../../composables/useNotifications'
import type { ProjectInfo } from '../../composables/useOnboarding'
import BaseButton from '../atoms/BaseButton.vue'
import BaseIcon from '../atoms/BaseIcon.vue'
import BaseLogo from '../atoms/BaseLogo.vue'
import CtaButton from '../atoms/CtaButton.vue'
import { disableTerminalDirective as vDisableTerminal } from '../../directives/disableTerminal'

// Storage API types (matching preload storage API)
interface StorageProjectInfo {
  id: string
  name: string
  path: string
  lastOpened: Date
  metadata?: {
    gitRemote?: string
    framework?: string
    packageManager?: string
    icon?: string
  }
}

const { nextStep, selectProject } = useOnboarding()
const { truncatePath } = useSmartTruncation()
const { error: showError } = useNotifications()

// Loading state for project opening
const isOpeningProject = ref(false)
const isLoadingProjects = ref(true)
const recentProjects = ref<StorageProjectInfo[]>([])
const storageError = ref<string | null>(null)

// Guard against duplicate executions
const isSelectingProject = ref(false)

// Visual feedback for terminal commands
const isOpenButtonActive = ref(false)
const activeProjectIndex = ref<number | null>(null)

/**
 * Format error messages to be more user-friendly
 *
 * @param error - The error object or message to format
 * @returns Formatted error message for display
 */
const formatErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    const message = error.message

    // Handle specific IPC errors
    if (message.includes('Please select a package.json file')) {
      return 'Please select a valid package.json file for your project'
    }

    if (message.includes('Invalid package.json')) {
      return 'The selected file is not a valid package.json file'
    }

    if (message.includes('No focused window')) {
      return 'Unable to open file dialog. Please try again'
    }

    if (message.includes('Failed to read package.json')) {
      return 'Could not read the package.json file. Please check file permissions'
    }

    // Return the original message if no specific handling
    return message
  }

  return 'An unexpected error occurred while opening the project'
}

/**
 * Show error message using floating notifications
 */
const showErrorMessage = (message: string): void => {
  showError(message, { duration: 8000 })
}

/**
 * Load recent projects from secure storage
 */
const loadRecentProjects = async (): Promise<void> => {
  console.log('[ProjectSelection] 🔄 Loading recent projects...')

  if (!window.storageAPI?.getRecentProjects) {
    console.warn('[ProjectSelection] ⚠️ Storage API not available')
    isLoadingProjects.value = false
    return
  }

  try {
    storageError.value = null
    console.log(
      '[ProjectSelection] 📞 Calling window.storageAPI.getRecentProjects()'
    )
    const projects = await window.storageAPI.getRecentProjects()
    // Limit to 4 recent projects for display
    recentProjects.value = projects.slice(0, 4)
    console.log(
      `[ProjectSelection] ✅ Loaded ${projects.length} recent projects, showing ${recentProjects.value.length}:`,
      recentProjects.value.map((p) => ({ name: p.name, path: p.path }))
    )
  } catch (error) {
    console.error(
      '[ProjectSelection] ❌ Failed to load recent projects:',
      error
    )
    storageError.value = formatErrorMessage(error)
    showErrorMessage(
      `Failed to load recent projects: ${formatErrorMessage(error)}`
    )
  } finally {
    isLoadingProjects.value = false
  }
}

/**
 * Format relative time for display
 */
const formatRelativeTime = (date: Date): string => {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`

  // For older dates, show formatted date
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

/**
 * Handle recent project selection
 */
const handleRecentProjectSelect = async (
  project: StorageProjectInfo
): Promise<void> => {
  // Prevent duplicate executions
  if (isSelectingProject.value) {
    console.log(
      '[ProjectSelection] Already selecting a project, ignoring duplicate call'
    )
    return
  }

  console.log('[ProjectSelection] Selected recent project:', project.name)
  isSelectingProject.value = true

  try {
    // Update the project's last opened timestamp
    if (window.storageAPI?.updateProjectLastOpened) {
      await window.storageAPI.updateProjectLastOpened(project.id)
    }

    // Convert StorageProjectInfo to ProjectInfo format for useOnboarding
    // Note: Some fields are not available from storage, so we use placeholder values
    const projectInfo: ProjectInfo = {
      name: project.name,
      path: project.path,
      packageJson: '', // Will be read when project is actually opened
      version: '',
      description: '',
      scripts: {},
      dependencies: {},
      devDependencies: {},
      framework: project.metadata?.framework,
      packageManager: project.metadata?.packageManager,
    }

    selectProject(projectInfo)
    console.log(
      '[ProjectSelection] Navigating to next step (should be task-selector)'
    )
    nextStep()
  } catch (error) {
    console.error('Failed to select recent project:', error)
    showErrorMessage(`Failed to open project: ${formatErrorMessage(error)}`)
  } finally {
    // Reset the guard after a delay to allow for the transition
    setTimeout(() => {
      isSelectingProject.value = false
    }, 500)
  }
}

const handleOpenProject = async (): Promise<void> => {
  if (!window.electronAPI?.openProjectDialog) {
    // Fallback for web mode - just proceed to next step
    console.warn('Project dialog not available in web mode')
    nextStep()
    return
  }

  isOpeningProject.value = true

  try {
    const projectInfo =
      (await window.electronAPI.openProjectDialog()) as ProjectInfo | null

    if (projectInfo) {
      // Add the project to recent projects storage
      if (window.storageAPI?.addRecentProject) {
        try {
          console.log('[ProjectSelection] Adding project to recent projects:', {
            path: projectInfo.path,
            name: projectInfo.name,
            framework: projectInfo.framework,
            packageManager: projectInfo.packageManager,
          })

          await window.storageAPI.addRecentProject({
            path: projectInfo.path,
            name: projectInfo.name,
            metadata: {
              framework: projectInfo.framework,
              packageManager: projectInfo.packageManager,
            },
          })

          console.log(
            '[ProjectSelection] ✅ Project added to storage successfully'
          )

          // Reload the projects list to show the newly added project
          console.log('[ProjectSelection] Reloading recent projects list...')
          await loadRecentProjects()

          console.log(
            '[ProjectSelection] ✅ Recent projects list reloaded, count:',
            recentProjects.value.length
          )
        } catch (storageError) {
          console.error(
            '[ProjectSelection] ❌ Failed to add project to storage:',
            storageError
          )
          // Continue even if storage fails - the main flow shouldn't be blocked
        }
      } else {
        console.warn('[ProjectSelection] ⚠️ Storage API not available')
      }

      // Project selected successfully
      selectProject(projectInfo)
      nextStep()
    }
    // If projectInfo is null, user canceled the dialog - do nothing
  } catch (error) {
    console.error('Failed to open project:', error)
    showErrorMessage(formatErrorMessage(error))
  } finally {
    isOpeningProject.value = false
  }
}

/**
 * Handle terminal command effects
 */
const handleOpenProjectEffect = (): void => {
  console.log(
    '[ProjectSelection] Activating press effect for Open Project button'
  )
  isOpenButtonActive.value = true
  setTimeout(() => {
    isOpenButtonActive.value = false
    console.log(
      '[ProjectSelection] Removing press effect from Open Project button'
    )
  }, 400)
}

const handleProjectEffect = (index: number): void => {
  console.log(
    `[ProjectSelection] Activating press effect for project ${index + 1}`
  )
  activeProjectIndex.value = index
  setTimeout(() => {
    activeProjectIndex.value = null
    console.log(
      `[ProjectSelection] Removing press effect from project ${index + 1}`
    )
  }, 400)
}

// Event handlers defined at component level for proper cleanup
const handleTerminalOpenProject = () => {
  if (!isOpeningProject.value) {
    handleOpenProjectEffect()
    handleOpenProject()
  }
}

const handleTerminalSelectProject = (event: CustomEvent<{ index: number }>) => {
  // Prevent duplicate executions
  if (isSelectingProject.value) {
    console.log(
      '[ProjectSelection] Already selecting a project via terminal, ignoring duplicate'
    )
    return
  }

  const index = event.detail.index
  if (index < recentProjects.value.length) {
    console.log(
      `[ProjectSelection] Terminal command: selecting project ${index + 1}`
    )
    handleProjectEffect(index)
    handleRecentProjectSelect(recentProjects.value[index])
  }
}

// Load projects when component mounts
onMounted(() => {
  console.log(
    '[ProjectSelection] Component mounted - current step should be project-selection'
  )
  console.log('[ProjectSelection] Starting to load recent projects...')
  loadRecentProjects()

  // Terminal input events are now handled by the terminal context system
  // The commands 'o' and '1-5' are processed through terminalStrategies.ts
  // This prevents duplicate execution of commands

  // Listen for terminal command events
  window.addEventListener('terminal-open-project', handleTerminalOpenProject)
  window.addEventListener(
    'terminal-select-project',
    handleTerminalSelectProject as EventListener
  )
})

// Clean up event listeners on unmount
onUnmounted(() => {
  console.log(
    '[ProjectSelection] Component unmounting - cleaning up event listeners'
  )
  window.removeEventListener('terminal-open-project', handleTerminalOpenProject)
  window.removeEventListener(
    'terminal-select-project',
    handleTerminalSelectProject as EventListener
  )
})
</script>

<style scoped>
.onboarding-project-selection {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0px 280px;
  background: linear-gradient(
    to bottom,
    var(--bg-primary) 0%,
    rgba(var(--bg-secondary-rgb), 0.4) 100%
  );
}

.project-container {
  width: 100%;
  max-width: 800px;
  animation: fade-in-up 0.5s cubic-bezier(0.22, 1, 0.36, 1);
  transform-origin: center;
}

.project-content {
  background-color: transparent;
  padding: 0;
}

.project-header {
  text-align: center;
  margin-bottom: 40px;
}

.project-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 12px;
  letter-spacing: -0.02em;
}

.project-subtitle {
  font-size: 16px;
  color: var(--text-secondary);
  max-width: 500px;
  margin: 0 auto;
  line-height: 1.5;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 10px;
  letter-spacing: -0.02em;
  text-transform: uppercase;
  opacity: 0.9;
}

/* Grid Layout - Ultra Compact */
.content-grid {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.top-row {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 32px;
  align-items: start;
}

.bottom-row {
  width: 100%;
}

.onboarding-project-selection .left-column {
  display: flex;
  flex-direction: column;
  gap: 20px;
  justify-content: flex-start;
}

.header-icon {
  color: var(--accent-primary);
}

/* Logo Section */
.logo-section {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin-bottom: 0px;
}

.logo-section img {
  width: 160px;
  height: auto;
  opacity: 0.95;
}

.logo-with-back {
  display: flex;
  align-items: flex-start;
}

.right-column {
  display: flex;
  flex-direction: column;
}

/* Recent Projects */
.recent-section {
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.icon-wrapper-inline {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: linear-gradient(
    135deg,
    var(--accent-primary-alpha) 0%,
    rgba(var(--accent-primary-rgb), 0.1) 100%
  );
  border-radius: 6px;
  flex-shrink: 0;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.section-header .section-title {
  margin: 0;
  line-height: 1;
}

.recent-projects {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  min-height: 180px;
  padding-top: 12px;
}

/* Loading, Error, Empty states */
.projects-loading,
.projects-error,
.projects-empty {
  padding: 24px 16px;
  text-align: center;
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.projects-empty {
  flex: 1;
}

.loading-item,
.error-message,
.empty-message {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-secondary);
}

.loading-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.error-icon {
  color: var(--error-color, #ef4444);
}

.empty-message {
  flex-direction: column;
  gap: 8px;
}

.empty-icon {
  opacity: 0.5;
  margin-bottom: 4px;
}

.empty-subtitle {
  font-size: 14px;
  color: var(--text-tertiary);
  margin: 0;
}

.project-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background-color: var(--bg-tertiary);
  border: 1px solid var(--border-secondary);
  border-radius: 8px;
  transition: all var(--transition-fast);
  cursor: pointer;
}

.project-item:hover {
  background-color: var(--hover-bg-light);
  border-color: var(--accent-primary);
}

.project-item:hover .project-arrow {
  opacity: 1;
  color: var(--accent-primary);
}

.dark .project-item:hover {
  background-color: var(--hover-bg-dark);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.project-left {
  display: flex;
  align-items: center;
  flex: 1;
}

.project-icon {
  margin-right: 12px;
  display: flex;
  align-items: center;
  color: var(--text-secondary);
  opacity: 0.8;
}

.project-info {
  flex: 1;
}

.project-arrow {
  color: var(--text-tertiary);
  opacity: 0.6;
  transition: opacity var(--transition-fast);
}

.project-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.project-path {
  font-size: 14px;
  color: var(--text-tertiary);
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  margin-bottom: 4px;
}

.project-metadata {
  font-size: 11px;
  color: var(--text-quaternary);
  display: flex;
  align-items: center;
  gap: 4px;
  opacity: 0.7;
}

.project-framework,
.project-package-manager {
  background-color: var(--bg-quaternary);
  padding: 2px 5px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.project-separator {
  opacity: 0.5;
}

.project-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}

.project-date {
  font-size: 10px;
  color: var(--text-tertiary);
  white-space: nowrap;
  opacity: 0.6;
  font-weight: 500;
  letter-spacing: -0.01em;
}

/* Action Buttons */
.actions-section {
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.action-button {
  width: 100%;
  justify-content: center;
  padding: 16px 24px;
  font-size: 16px;
  font-weight: 600;
  transition: all var(--transition-fast);
  cursor: pointer;
  display: flex;
  align-items: center;
}

.button-content {
  display: flex;
  align-items: center;
  gap: 6px;
}

.button-icon {
  flex-shrink: 0;
  font-size: 14px;
}

.action-button:hover:not(.disabled-action) {
  background-color: var(--hover-bg-light);
  border-color: var(--accent-primary);
}

.dark .action-button:hover:not(.disabled-action) {
  background-color: var(--hover-bg-dark);
}

.disabled-button-wrapper {
  position: relative;
  cursor: default;
  opacity: 0.5;
}

.disabled-action {
  opacity: 0.6;
  cursor: default;
  filter: grayscale(0.3);
}

.disabled-action:hover {
  transform: none;
  box-shadow: none;
}

/* Learn & Discover */
.learn-section {
  opacity: 0.7;
}

.learn-section .section-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.learn-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.learn-card {
  padding: 16px;
  background-color: transparent;
  border: 1px solid var(--border-secondary);
  border-radius: 6px;
  transition: all var(--transition-fast);
  text-align: center;
}

.disabled-card {
  opacity: 0.6;
  cursor: default;
}

.disabled-card:hover {
  transform: none;
  box-shadow: none;
  background-color: transparent;
  opacity: 0.6;
  cursor: default;
}

.card-icon {
  margin-bottom: 8px;
  opacity: 0.7;
  display: flex;
  justify-content: center;
  color: var(--text-secondary);
}

.card-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.card-description {
  font-size: 12px;
  color: var(--text-tertiary);
  line-height: 1.3;
}

/* Press effects for terminal commands */
:deep(.cta-button.press-active:not(:disabled)) {
  background: var(--accent-primary-hover) !important;
  border-color: var(--accent-primary-hover) !important;
  transform: scale(1.01);
  box-shadow: 0 2px 6px rgba(223, 169, 39, 0.2);
  transition: all 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.project-item.press-active {
  background-color: var(--accent-primary-alpha) !important;
  border-color: var(--accent-primary) !important;
  transform: translateX(3px);
  box-shadow: 0 1px 4px rgba(223, 169, 39, 0.15);
  transition: all 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

/* Animations */
@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive Design */
@media (max-width: 768px) {
  .onboarding-project-selection {
    padding: 16px;
  }

  .project-content {
    padding: 32px 24px;
  }

  .project-title {
    font-size: 24px;
  }

  .project-subtitle {
    font-size: 15px;
  }

  .top-row {
    grid-template-columns: 1fr;
    gap: 32px;
  }

  .left-column {
    gap: 32px;
  }

  .learn-cards {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .project-content {
    padding: 24px 20px;
  }

  .project-title {
    font-size: 22px;
  }

  .project-item {
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
  }
}
</style>
