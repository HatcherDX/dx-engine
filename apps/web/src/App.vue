<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useTheme } from './composables/useTheme'
import { useBreadcrumbContext } from './composables/useBreadcrumbContext'
import { useChatSidebar } from './composables/useChatSidebar'
import { useOnboarding } from './composables/useOnboarding'
import { useTerminalModeDetector } from './composables/useTerminalModeDetector'
import { useProjectContext } from './composables/useProjectContext'
import UnifiedFrame from './components/templates/UnifiedFrame.vue'
import QuantumPipeline from './components/molecules/QuantumPipeline.vue'
import ModeSelector from './components/molecules/ModeSelector.vue'
import AddressBar from './components/molecules/AddressBar.vue'
import BaseIcon from './components/atoms/BaseIcon.vue'
import BaseButton from './components/atoms/BaseButton.vue'
import PlayButton from './components/atoms/PlayButton.vue'
import ProjectBreadcrumb from './components/atoms/ProjectBreadcrumb.vue'
import GenerativeSidebar from './components/organisms/GenerativeSidebar.vue'
import VisualSidebar from './components/organisms/VisualSidebar.vue'
import CodeSidebar from './components/organisms/CodeSidebar.vue'
import TimelineSidebar from './components/organisms/TimelineSidebar.vue'
import GitTimelineView from './views/GitTimelineView.vue'
import SettingsView from './views/SettingsView.vue'
import ChatPanel from './components/organisms/ChatPanel.vue'
import TerminalPanel from './components/organisms/TerminalPanel.vue'
import GlobalTerminalFooter from './components/organisms/GlobalTerminalFooter.vue'
import TerminalTabBar from './components/molecules/TerminalTabBar.vue'
import NotificationContainer from './components/organisms/NotificationContainer.vue'
import LoadingScreen from './components/organisms/LoadingScreen.vue'
import { useTaskManager } from './composables/useTaskManager'
import type { ModeType } from './components/molecules/ModeSelector.vue'

// Initialize theme system
const { platform } = useTheme()
console.log('[App] Platform from useTheme:', platform.value)

// Initialize terminal mode detector
const terminalModeDetector = useTerminalModeDetector()

// Initialize breadcrumb context
const { getContextForMode, simulateFileChange } = useBreadcrumbContext()

// Get current project and branch info for header breadcrumb
const currentContext = computed(() => getContextForMode(currentMode.value))
const projectName = computed(() => {
  // Use the project name from code mode context (address bar)
  const codeContext = getContextForMode('code') as Record<string, unknown>
  const codeProjectName = codeContext?.projectName as string

  if (codeProjectName && codeProjectName !== '') {
    return codeProjectName
  }

  // Fallback to current mode context
  const context = currentContext.value as Record<string, unknown>
  return (context?.projectName as string) || 'dx-engine'
})
const branchName = computed(() => {
  const context = currentContext.value as Record<string, unknown>
  return (
    (context?.gitBranch as string) ||
    (context?.currentBranch as string) ||
    'main'
  )
})

// Initialize chat sidebar
const {
  width: chatWidth,
  shouldShowResizeHandle,
  isGenerativeMode,
  isResizing,
  startResize,
  setMode: setChatMode,
} = useChatSidebar()

// Initialize onboarding
const {
  isOnboardingActive,
  isCheckingWorkspace,
  selectedProject,
  clearOnboardingStorage,
  completeOnboarding,
} = useOnboarding()

// Initialize project context
const { loadProject, isLoading: isProjectLoading } = useProjectContext()

// Initialize task manager for close workspace
const { closeWorkspace } = useTaskManager()

// Notifications system available globally via useNotifications() composable
// Components can import and use: const { success, error } = useNotifications()

// Application state
const currentMode = ref<ModeType>('generative')
const addressValue = ref('')
const showSettings = ref(false)

// Terminal state for GlobalTerminalFooter
const terminalCount = ref(0)
const terminalStatus = ref('')
const terminalPanelRef = ref<InstanceType<typeof TerminalPanel> | null>(null)
const globalTerminalFooterRef = ref<InstanceType<
  typeof GlobalTerminalFooter
> | null>(null)

// App version
const appVersion =
  (window as typeof window & { __APP_VERSION__?: string }).__APP_VERSION__ ||
  '0.0.0'

// Listen for settings menu command from Electron
onMounted(() => {
  if (window.electronAPI?.on) {
    window.electronAPI.on('open-settings', (() => {
      console.log('[App] Opening settings from menu')
      showSettings.value = true
    }) as (...args: unknown[]) => void)
  }
})

// Handle closing settings
const closeSettings = () => {
  showSettings.value = false
}

// Handle onboarding completion - not needed anymore as UnifiedFrame handles it internally

// Watch for project selection completion in onboarding
watch(
  selectedProject,
  async (newProject) => {
    if (newProject && newProject.path && !isProjectLoading.value) {
      try {
        console.log(
          '[App] Loading project from onboarding selection:',
          newProject.path
        )
        await loadProject(newProject.path)
        console.log('[App] Project loaded successfully:', newProject.name)
      } catch (error) {
        console.error('[App] Failed to load project from onboarding:', error)
      }
    } else if (isProjectLoading.value) {
      console.log(
        '[App] Skipping project load - loading already in progress:',
        newProject?.path
      )
    }
  },
  { immediate: true }
)

// Initialize application
onMounted(async () => {
  // Application initialized silently
  // Initial AI context will be set based on onboarding completion

  // Check for saved workspace and restore project if exists
  console.log('[App] onMounted - Checking for saved workspace...')
  console.log(
    '[App] onMounted - window.storageAPI exists:',
    !!window.storageAPI
  )

  if (window.storageAPI) {
    try {
      const workspace = await window.storageAPI.getWorkspace()
      console.log('[App] onMounted - Retrieved workspace:', workspace)

      if (workspace && workspace.project) {
        console.log(
          '[App] Found saved workspace, restoring project:',
          workspace.project.name
        )

        // The onboarding will already be marked as completed by useOnboarding
        // when it detects the workspace, so we just need to load the project

        // Load the saved project
        await loadProject(workspace.project.path)
        console.log('[App] Project restored successfully')

        // Ensure onboarding is marked as completed
        completeOnboarding()
        console.log('[App] Onboarding marked as completed')
      } else {
        console.log('[App] No workspace found in storage')
        console.log('[App] Onboarding state will handle the flow')
      }
    } catch (error) {
      console.error('[App] Failed to restore workspace:', error)
    }
  } else {
    console.log('[App] StorageAPI not available')
  }

  // Log final onboarding state
  console.log('[App] Final onboarding active state:', isOnboardingActive.value)

  // Debug: Expose onboarding reset to window for testing
  if (window) {
    window.resetOnboarding = clearOnboardingStorage
    console.log('[App] Debug: window.resetOnboarding() available for testing')
    console.log('[App] Current onboarding active:', isOnboardingActive.value)
  }

  // Listen for close-task message from Electron menu
  if (window.electronAPI && window.electronAPI.on) {
    window.electronAPI.on('close-task', async () => {
      console.log('[App] Received close-task message from Electron menu')
      try {
        await closeWorkspace()
        console.log('[App] Workspace closed successfully')
      } catch (error) {
        console.error('[App] Failed to close workspace:', error)
      }
    })
    console.log('[App] Registered close-task listener')
  }

  // Initialize terminal mode detector
  try {
    console.log('[App] Initializing terminal mode detector...')
    await terminalModeDetector.detectModeWithFallback()
    console.log(
      '[App] Terminal mode detector initialized:',
      terminalModeDetector.currentMode.value
    )
  } catch (error) {
    console.error('[App] Failed to initialize terminal mode detector:', error)
  }
})

// Mode handling
const handleModeChange = async (mode: ModeType) => {
  console.log(`[App] Mode change: ${currentMode.value} -> ${mode}`)
  currentMode.value = mode

  // Update chat sidebar mode
  setChatMode(mode)
  // Clear address bar when switching modes
  addressValue.value = ''

  // Initialize terminals when switching to code mode
  if (mode === 'code') {
    console.log(
      '[App] Switching to code mode - ensuring terminal initialization'
    )
    try {
      // Re-run terminal mode detector to ensure connection
      await terminalModeDetector.detectModeWithFallback()
      console.log('[App] Terminal mode detector refreshed for code mode')
    } catch (error) {
      console.error('[App] Failed to refresh terminal mode detector:', error)
    }
  }

  // Simulate context change for demo
  simulateFileChange(mode)
}

// Terminal panel initialization handler
const handleTerminalPanelInitialized = () => {
  console.log('[App] Terminal panel initialized successfully')
}

// Terminal status handlers
const handleTerminalStatusChange = (status: string) => {
  terminalStatus.value = status
}

const handleTerminalCountChange = (count: number) => {
  terminalCount.value = count
}

// Handle terminal tab clicks to expand the footer
const handleTerminalTabClick = (terminalId: string) => {
  // First, tell the terminal panel to switch to the clicked terminal
  if (terminalPanelRef.value) {
    terminalPanelRef.value.setActiveTerminal(terminalId)
  }
  // Then expand the terminal footer if it's not already expanded
  if (globalTerminalFooterRef.value) {
    globalTerminalFooterRef.value.expandTerminal()
  }
}

const handleTerminalTabClose = (terminalId: string) => {
  if (terminalPanelRef.value) {
    terminalPanelRef.value.closeTerminal(terminalId)
  }
}

const handleTerminalTabContextMenu = (
  terminalId: string,
  event: MouseEvent
) => {
  // Handle context menu if needed
  void terminalId
  void event
}

const handleNewTerminal = () => {
  if (terminalPanelRef.value) {
    terminalPanelRef.value.createTerminal()
  }
  // Expand the terminal footer when creating a new terminal
  if (globalTerminalFooterRef.value) {
    globalTerminalFooterRef.value.expandTerminal()
  }
}

// Command execution
const handleExecuteCommand = (command: string, mode: ModeType) => {
  // Command execution handlers for each mode
  switch (mode) {
    case 'generative':
      executeGenerativeCommand(command)
      break
    case 'visual':
      executeVisualCommand(command)
      break
    case 'code':
      executeCodeCommand(command)
      break
    case 'timeline':
      executeTimelineCommand(command)
      break
  }

  // Clear command after execution
  addressValue.value = ''
}

// Mode-specific command handlers (placeholders)
const executeGenerativeCommand = (command: string) => {
  // TODO: Implement generative AI command processing
  void command
}

const executeVisualCommand = (command: string) => {
  // TODO: Implement visual design command processing
  void command
}

const executeCodeCommand = (command: string) => {
  // TODO: Implement code editor command processing
  void command
}

const executeTimelineCommand = (command: string) => {
  // TODO: Implement version control command processing
  void command
}

// Play button handlers
const handlePlay = () => {
  // TODO: Implement actual play functionality
  // For now, this is a placeholder for future development
}

const handleStop = () => {
  // TODO: Implement actual stop functionality
  // For now, this is a placeholder for future development
}

// GitHub link handler
const openGitHub = () => {
  // Use Electron's shell.openExternal or window.open for web
  if (window.electronAPI) {
    // TODO: In Electron environment - implement shell.openExternal via IPC
    // Note: IPC call for external URLs will be added when implementing shell integration
  } else {
    // In web environment
    window.open('https://github.com/HatcherDX/dx-engine', '_blank')
  }
}
</script>

<template>
  <!-- Loading Screen -->
  <Transition name="fade" mode="out-in">
    <LoadingScreen v-if="isCheckingWorkspace" />
  </Transition>

  <!-- Main Application Container -->
  <div v-if="!isCheckingWorkspace" class="app-container">
    <UnifiedFrame
      :current-mode="currentMode"
      :platform="platform"
      :project-name="projectName"
      :branch-name="branchName"
      @mode-change="handleModeChange"
      @execute="handleExecuteCommand"
      @play="handlePlay"
      @stop="handleStop"
      @open-github="openGitHub"
    >
      <!-- Pass through all the necessary data as props or slots -->
      <template v-if="!isOnboardingActive" #sidebar-header>
        <div class="sidebar-header-content">
          <!-- Left section -->
          <div class="sidebar-header-left">
            <!-- Mac: empty space for traffic lights -->
            <!-- Windows/Linux: Project breadcrumb in sidebar -->
            <ProjectBreadcrumb
              v-if="platform !== 'macos'"
              :project-name="projectName"
              :branch-name="branchName"
            />
          </div>

          <!-- Right section -->
          <div class="sidebar-header-right">
            <PlayButton @play="handlePlay" @stop="handleStop" />
          </div>
        </div>
      </template>

      <template v-if="!isOnboardingActive" #sidebar-content>
        <!-- Dynamic sidebar content based on current mode -->
        <GenerativeSidebar v-show="currentMode === 'generative'" />
        <VisualSidebar v-show="currentMode === 'visual'" />
        <CodeSidebar v-show="currentMode === 'code'" />
        <TimelineSidebar v-show="currentMode === 'timeline'" />
      </template>

      <!-- Navigation in header -->
      <template v-if="!isOnboardingActive" #navigation>
        <ModeSelector
          :current-mode="currentMode"
          @mode-change="handleModeChange"
        />
      </template>

      <!-- Address bar in header -->
      <template v-if="!isOnboardingActive" #address-bar>
        <AddressBar
          v-model:value="addressValue"
          :current-mode="currentMode"
          :breadcrumb-context="getContextForMode(currentMode)"
          @execute="handleExecuteCommand"
        />
      </template>

      <!-- Main content area -->
      <template v-if="!isOnboardingActive" #default>
        <div
          class="main-content"
          :class="{
            'content-centered': currentMode !== 'timeline',
            'content-timeline': currentMode === 'timeline',
          }"
        >
          <!-- Generative Mode Content -->
          <div
            v-show="currentMode === 'generative'"
            class="mode-content-container"
          >
            <div class="mode-content">
              <h1 class="mode-title">Generative Mode</h1>
              <p class="mode-subtitle">AI-Powered Command Line Replacement</p>

              <div class="mode-description">
                <p>
                  Welcome to <strong>Generative Mode</strong> - the heart of
                  Hatcher's AI engine. This mode replaces traditional
                  command-line interfaces with natural language interactions
                  that understand your development context.
                </p>

                <p>
                  Simply describe what you want to accomplish, and Hatcher will
                  generate the appropriate commands, code, or configurations.
                  From file operations to complex deployment tasks, communicate
                  with your development environment as naturally as you would
                  with a colleague.
                </p>
              </div>

              <div class="mode-cta">
                <p class="cta-text">Ready to revolutionize your workflow?</p>
                <p class="cta-hint">
                  Try typing:
                  <em>"Create a new React component called UserProfile"</em>
                </p>
              </div>
            </div>
          </div>

          <!-- Visual Mode Content -->
          <div v-show="currentMode === 'visual'" class="mode-content-container">
            <div class="mode-content">
              <h1 class="mode-title">Visual Mode</h1>
              <p class="mode-subtitle">
                Advanced Visual Interaction (Coming Soon)
              </p>

              <div class="mode-description">
                <p>
                  This is where
                  <strong>'Controlled Amplification'</strong> comes to life.
                  Visual Mode will transform how you move from design to code.
                  You will be able to click on any component in your UI, give it
                  natural language instructions like
                  <em
                    >"make this background 10% darker and add a subtle
                    border"</em
                  >, and watch as Hatcher translates your intent into clean,
                  precise code.
                </p>

                <p>
                  We will begin by shipping powerful responsive debugging tools,
                  including a <strong>'360 View'</strong> to preview your
                  components across multiple devices simultaneously, laying the
                  groundwork for the revolutionary Visual-to-Code capability.
                </p>
              </div>

              <div class="mode-cta">
                <p class="cta-text">
                  Have ideas for the future of visual development?
                </p>
                <BaseButton
                  variant="outline"
                  size="sm"
                  class="github-button"
                  @click="openGitHub"
                >
                  <BaseIcon name="GitBranch" size="xs" />
                  Join the discussion on our GitHub
                </BaseButton>
              </div>
            </div>
          </div>

          <!-- Code Mode Content -->
          <div v-show="currentMode === 'code'" class="mode-content-container">
            <div class="mode-content">
              <h1 class="mode-title">Code Mode</h1>
              <p class="mode-subtitle">The AI-Powered Editor (Coming Soon)</p>

              <div class="mode-description">
                <p>
                  More than just a text editor. Hatcher's
                  <strong>Code Mode</strong> will be your environment for
                  achieving an uninterrupted flow state. The AI will not only
                  autocomplete; it will act as your personal co-pilot.
                </p>

                <p>
                  You'll be able to ask it to refactor complex functions,
                  explain code snippets, generate documentation automatically,
                  and suggest performance improvements, all without leaving your
                  editor. The goal is simple: to empower your expertise and
                  eliminate repetitive tasks so you can focus on solving hard
                  problems.
                </p>
              </div>

              <div class="mode-cta">
                <p class="cta-text">
                  What's a must-have feature in your ideal editor?
                </p>
                <BaseButton
                  variant="outline"
                  size="sm"
                  class="github-button"
                  @click="openGitHub"
                >
                  <BaseIcon name="GitBranch" size="xs" />
                  Tell us your ideas
                </BaseButton>
              </div>
            </div>
          </div>

          <!-- Timegraph Mode Content -->
          <GitTimelineView v-show="currentMode === 'timeline'" />
        </div>
      </template>

      <!-- Terminal Panel removed - now in GlobalTerminalFooter -->

      <!-- Chat Panel - Persistent across all modes -->
      <template v-if="!isOnboardingActive" #chat-panel>
        <ChatPanel
          :current-mode="currentMode"
          :effective-width="`${chatWidth}px`"
          :should-show-resize-handle="shouldShowResizeHandle"
          :is-generative-mode="isGenerativeMode"
          :is-resizing="isResizing"
          :start-resize="startResize"
        />
      </template>

      <!-- Footer slot removed - replaced by GlobalTerminalFooter -->
    </UnifiedFrame>

    <!-- Global Terminal Footer - Always present at bottom -->
    <GlobalTerminalFooter
      ref="globalTerminalFooterRef"
      :app-version="appVersion"
      :terminal-count="terminalCount"
      :current-status="terminalStatus"
    >
      <template #terminal-tabs>
        <TerminalTabBar
          v-if="terminalPanelRef"
          :terminals="terminalPanelRef?.terminals || []"
          :system-terminals="terminalPanelRef?.systemTerminals || []"
          :active-terminal-id="terminalPanelRef?.activeTerminalId"
          @tab-click="handleTerminalTabClick"
          @tab-close="handleTerminalTabClose"
          @tab-context-menu="handleTerminalTabContextMenu"
          @new-terminal="handleNewTerminal"
        />
      </template>
      <template #terminal>
        <KeepAlive>
          <TerminalPanel
            ref="terminalPanelRef"
            :key="'terminal-panel-global'"
            @initialized="handleTerminalPanelInitialized"
            @status-change="handleTerminalStatusChange"
            @count-change="handleTerminalCountChange"
          />
        </KeepAlive>
      </template>
    </GlobalTerminalFooter>

    <!-- Global Actions Pipeline - Always visible and floating -->
    <div v-if="!isOnboardingActive" class="global-actions-pipeline">
      <QuantumPipeline :is-expanded="currentMode === 'generative'" />
    </div>
  </div>

  <!-- Global Notification Container -->
  <NotificationContainer />

  <!-- Settings View Overlay -->
  <Teleport to="body">
    <SettingsView v-if="showSettings" @close="closeSettings" />
  </Teleport>
</template>

<style scoped>
/* Transition for loading screen fade out */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s ease-out;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Transition for content fade in */
.fade-content-enter-active {
  transition: opacity 0.5s ease-in 0.2s;
}

.fade-content-enter-from {
  opacity: 0;
}

/* Application container */
.app-container {
  position: relative;
  width: 100%;
  height: 100vh;
  background: linear-gradient(
    135deg,
    var(--bg-primary) 0%,
    var(--bg-secondary) 100%
  );
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Removed view transitions - now handled internally by UnifiedFrame */

/* Main content styles */
.main-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
}

.content-centered {
  align-items: center;
  justify-content: center;
}

.content-timeline {
  padding: 0;
}

/* Mode content container */
.mode-content-container {
  width: 100%;
  max-width: 800px;
  padding: 48px 32px;
  text-align: center;
  animation: fade-in 0.6s ease-out;
}

.mode-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.mode-title {
  font-size: 48px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.mode-subtitle {
  font-size: 20px;
  font-weight: 500;
  color: var(--text-secondary);
  margin: 0;
}

.mode-description {
  display: flex;
  flex-direction: column;
  gap: 16px;
  text-align: left;
  color: var(--text-secondary);
  line-height: 1.6;
}

.mode-description p {
  margin: 0;
}

.mode-description strong {
  color: var(--accent-primary);
  font-weight: 600;
}

.mode-description em {
  color: var(--text-tertiary);
  font-style: italic;
}

.mode-cta {
  margin-top: 24px;
  padding: 24px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 12px;
}

.cta-text {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 12px 0;
}

.cta-hint {
  font-size: 14px;
  color: var(--text-tertiary);
  margin: 0;
}

.cta-hint em {
  color: var(--accent-primary);
  font-style: normal;
  font-weight: 500;
}

.github-button {
  margin-top: 16px;
  gap: 8px;
}

/* Sidebar content styles */
.sidebar-header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 100%;
  color: var(--text-primary);
  /* Allow drag by default - specific interactive elements will override */
  -webkit-app-region: drag;
}

.sidebar-header-left {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  margin-right: 12px;
  /* Allow drag through empty left area */
  -webkit-app-region: drag;
}

.sidebar-header-right {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 6px;
  /* Disable drag for interactive buttons */
  -webkit-app-region: no-drag;
}

/* Footer styles */
.version-text {
  font-size: 12px;
  color: var(--text-tertiary);
  font-weight: 500;
  letter-spacing: 0;
}

/* Animations */
@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Global Actions Pipeline */
.global-actions-pipeline {
  position: fixed;
  top: 80px;
  right: 0;
  bottom: 40px; /* Space for footer */
  width: 320px;
  z-index: 1000;
  pointer-events: auto;
  display: flex;
  justify-content: flex-end; /* Align pipeline to the right */
}
</style>
