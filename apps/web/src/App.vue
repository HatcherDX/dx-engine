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
import AIModelSelector from './components/molecules/AIModelSelector.vue'
import PlayButton from './components/atoms/PlayButton.vue'
import ProjectBreadcrumb from './components/atoms/ProjectBreadcrumb.vue'
import DeckSidebar from './components/organisms/DeckSidebar.vue'
import VisualSidebar from './components/organisms/VisualSidebar.vue'
import CodeSidebar from './components/organisms/CodeSidebar.vue'
import TimelineSidebar from './components/organisms/TimelineSidebar.vue'
import GitTimelineView from './views/GitTimelineView.vue'
import SettingsView from './views/SettingsView.vue'
import CodeView from './views/CodeView.vue'
import VisualView from './views/VisualView.vue'
import ChatPanel from './components/organisms/ChatPanel.vue'
import TerminalPanel from './components/organisms/TerminalPanel.vue'
import GlobalTerminalFooter from './components/organisms/GlobalTerminalFooter.vue'
import TerminalTabBar from './components/molecules/TerminalTabBar.vue'
import NotificationContainer from './components/organisms/NotificationContainer.vue'
import LoadingScreen from './components/organisms/LoadingScreen.vue'
import CommandPalette from './components/molecules/CommandPalette.vue'
import ModelSelectorModal from './components/molecules/ModelSelectorModal.vue'
import CostPanelModal from './components/molecules/CostPanelModal.vue'
import ContextPanelModal from './components/molecules/ContextPanelModal.vue'
import UsagePanelModal from './components/molecules/UsagePanelModal.vue'
import AddDirectoryModal from './components/molecules/AddDirectoryModal.vue'
import MemorySettingsModal from './components/molecules/MemorySettingsModal.vue'
import CompactModal from './components/molecules/CompactModal.vue'
import ConfigModal from './components/molecules/ConfigModal.vue'
import DoctorModal from './components/molecules/DoctorModal.vue'
import StatusModal from './components/molecules/StatusModal.vue'
import PermissionsModal from './components/molecules/PermissionsModal.vue'
import McpModal from './components/molecules/McpModal.vue'
import AgentsModal from './components/molecules/AgentsModal.vue'
import ReviewModal from './components/molecules/ReviewModal.vue'
import PrCommentsModal from './components/molecules/PrCommentsModal.vue'
import InitModal from './components/molecules/InitModal.vue'
import LoginModal from './components/molecules/LoginModal.vue'
import LogoutModal from './components/molecules/LogoutModal.vue'
import BugReportModal from './components/molecules/BugReportModal.vue'
import TerminalSetupModal from './components/molecules/TerminalSetupModal.vue'
import HelpModal from './components/molecules/HelpModal.vue'
import { useTaskManager } from './composables/useTaskManager'
import { useNotifications } from './composables/useNotifications'
import type { ModeType } from './components/molecules/ModeSelector.vue'
import type { Command } from '@hatcherdx/ai-cli'

// Initialize theme system
const { platform } = useTheme()

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
  resetOnboarding,
} = useOnboarding()

// Initialize project context
const {
  loadProject,
  isLoading: isProjectLoading,
  projectRoot,
} = useProjectContext()

// Initialize task manager for close workspace
const { closeWorkspace } = useTaskManager()

// Initialize notifications system
const { success, error, info } = useNotifications()

// Application state
const currentMode = ref<ModeType>('generative')
const addressValue = ref('')
const showSettings = ref(false)
const showModelSelector = ref(false)
const showCostPanel = ref(false)
const showContextPanel = ref(false)
const showUsagePanel = ref(false)
const showAddDirectory = ref(false)
const showMemorySettings = ref(false)
const showCompact = ref(false)
const showConfig = ref(false)
const showDoctor = ref(false)
const showStatus = ref(false)
const showPermissions = ref(false)
const showMcp = ref(false)
const showAgents = ref(false)
const showReview = ref(false)
const showPrComments = ref(false)
const showInit = ref(false)
const showLogin = ref(false)
const showLogout = ref(false)
const showBugReport = ref(false)
const showTerminalSetup = ref(false)
const showHelp = ref(false)

// Command palette state
const showCommandPalette = ref(false)
const availableCommands = ref<Command[]>([])

// Terminal state for GlobalTerminalFooter
const terminalCount = ref(0)
const terminalStatus = ref('')
const terminalPanelRef = ref<InstanceType<typeof TerminalPanel> | null>(null)
const globalTerminalFooterRef = ref<InstanceType<
  typeof GlobalTerminalFooter
> | null>(null)

// Chat panel ref for command access
const chatPanelRef = ref<InstanceType<typeof ChatPanel> | null>(null)

// App version
const appVersion =
  (window as typeof window & { __APP_VERSION__?: string }).__APP_VERSION__ ||
  '0.0.0'

// Listen for settings menu command from Electron and setup keyboard shortcuts
onMounted(() => {
  if (window.electronAPI?.on) {
    window.electronAPI.on('open-settings', (() => {
      showSettings.value = true
    }) as (...args: unknown[]) => void)
  }

  // Setup Cmd+K keyboard shortcut for command palette
  const handleKeyDown = (event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault()
      showCommandPalette.value = !showCommandPalette.value
    }
  }
  window.addEventListener('keydown', handleKeyDown)

  // Load available commands from Electron
  loadCommands()

  // Cleanup on unmount
  return () => {
    window.removeEventListener('keydown', handleKeyDown)
  }
})

// Handle closing settings
const closeSettings = () => {
  showSettings.value = false
}

// Handle model selection from modal
const handleModelSelect = (provider: string) => {
  void provider
  // Modal already handles switching via IPC and shows notification
}

// Handle clear conversation from context panel
const handleClearConversation = () => {
  if (chatPanelRef.value) {
    chatPanelRef.value.clearMessages()
    success('Conversation cleared')
  }
}

/**
 * Handle directory addition to context.
 *
 * @param directory - Directory path to add
 *
 * @private
 */
const handleAddDirectory = (directory: string) => {
  success(`Added ${directory} to context`)
}

/**
 * Handle conversation compaction.
 *
 * @param data - Compaction options
 *
 * @private
 */
const handleCompact = (data: { instructions?: string; strategy: string }) => {
  success(`Compacting conversation with ${data.strategy} strategy`)
}

/**
 * Handle configuration save.
 *
 * @param config - Configuration settings
 *
 * @private
 */
const handleSaveConfig = (config: {
  permissionMode: 'ask' | 'acceptEdits' | 'acceptAll'
  spinnerTipsEnabled: boolean
  statusLineEnabled: boolean
  notificationsEnabled: boolean
  autoSave: boolean
  statusLineFormat: string
}) => {
  void config
  success('Configuration saved successfully')
}

/**
 * Handle diagnostics run.
 *
 * @private
 */
const handleRunDiagnostics = () => {
  success('Running diagnostics...')
}

/**
 * Handle save permissions configuration.
 *
 * @param permissions - Permissions configuration
 *
 * @private
 */
const handleSavePermissions = (permissions: {
  mode: 'ask' | 'acceptEdits' | 'acceptAll'
  fileTools: unknown[]
  shellTools: unknown[]
  gitTools: unknown[]
  webTools: unknown[]
}) => {
  void permissions
  success('Permissions updated successfully')
}

/**
 * Handle save MCP servers configuration.
 *
 * @param servers - MCP servers configuration
 *
 * @private
 */
const handleSaveMcp = (servers: unknown[]) => {
  void servers
  success('MCP servers configuration saved')
}

/**
 * Handle save agents configuration.
 *
 * @param agents - Agents configuration
 *
 * @private
 */
const handleSaveAgents = (agents: unknown[]) => {
  void agents
  success('Agents configuration saved')
}

/**
 * Handle start code review.
 *
 * @param data - Review configuration
 *
 * @private
 */
const handleStartReview = (data: Record<string, unknown>) => {
  void data
  success('Code review initiated')
}

/**
 * Handle initialize project.
 *
 * @param data - Project initialization data
 *
 * @private
 */
const handleInitProject = (data: Record<string, unknown>) => {
  void data
  success('Project initialized with CLAUDE.md')
}

/**
 * Handle user login.
 *
 * @param data - Login data
 *
 * @private
 */
const handleLogin = (data: Record<string, unknown>) => {
  void data
  success('Login successful!')
}

/**
 * Handle user logout.
 *
 * @param data - Logout data
 *
 * @private
 */
const handleLogout = (data: Record<string, unknown>) => {
  void data
  success('Logged out successfully')
}

/**
 * Handle bug report submission.
 *
 * @param data - Bug report data
 *
 * @private
 */
const handleBugReport = (data: Record<string, unknown>) => {
  void data
  success('Bug report submitted!')
}

/**
 * Handle terminal settings save.
 *
 * @param data - Terminal settings data
 *
 * @private
 */
const handleSaveTerminalSettings = (data: Record<string, unknown>) => {
  void data
  success('Terminal settings saved!')
}

// Handle onboarding completion - not needed anymore as UnifiedFrame handles it internally

// Watch for project selection completion in onboarding
watch(
  selectedProject,
  async (newProject) => {
    if (newProject && newProject.path && !isProjectLoading.value) {
      try {
        await loadProject(newProject.path)
      } catch (error) {
        console.error('[App] Failed to load project from onboarding:', error)
      }
    }
  },
  { immediate: true }
)

// Initialize application
onMounted(async () => {
  // Check for saved workspace and restore project if exists
  if (window.storageAPI) {
    try {
      const workspace = await window.storageAPI.getWorkspace()

      if (workspace && workspace.project && workspace.project.path) {
        // Only load project if path is not empty
        const projectPath = workspace.project.path.trim()
        if (projectPath && projectPath !== '') {
          console.log('[App] Restoring project from workspace:', projectPath)
          await loadProject(projectPath)

          // Ensure onboarding is marked as completed
          completeOnboarding()
        } else {
          console.log(
            '[App] Invalid project path in workspace - clearing and showing onboarding'
          )
          // Clear INVALID workspace (has project but empty path)
          await window.storageAPI.clearWorkspace()
          // Reset onboarding to force user to open a project
          resetOnboarding()
        }
      } else {
        console.log('[App] No project in workspace - showing onboarding')
        // CRITICAL: DO NOT auto-load CWD - it loads the IDE's own directory during development
        // CRITICAL: DO NOT clear empty workspace - it will be populated when user opens a project
        resetOnboarding()
      }
    } catch (error) {
      console.error('[App] Failed to restore workspace:', error)
      // CRITICAL: DO NOT auto-load CWD as fallback - user must manually open project
      console.log(
        '[App] Workspace restore failed - user must manually open a project'
      )
    }
  }

  // Debug: Expose onboarding reset to window for testing
  if (window) {
    window.resetOnboarding = clearOnboardingStorage
  }

  // Listen for close-task message from Electron menu
  if (window.electronAPI && window.electronAPI.on) {
    window.electronAPI.on('close-task', async () => {
      try {
        await closeWorkspace()
      } catch (error) {
        console.error('[App] Failed to close workspace:', error)
      }
    })
  }

  // Initialize terminal mode detector
  try {
    await terminalModeDetector.detectModeWithFallback()
  } catch (error) {
    console.error('[App] Failed to initialize terminal mode detector:', error)
  }
})

// Mode handling
const handleModeChange = async (mode: ModeType) => {
  currentMode.value = mode

  // Update chat sidebar mode
  setChatMode(mode)
  // Clear address bar when switching modes
  addressValue.value = ''

  // Initialize terminals when switching to code mode
  if (mode === 'code') {
    try {
      // Re-run terminal mode detector to ensure connection
      await terminalModeDetector.detectModeWithFallback()
    } catch (error) {
      console.error('[App] Failed to refresh terminal mode detector:', error)
    }
  }

  // Simulate context change for demo
  simulateFileChange(mode)
}

// Terminal panel initialization handler
const handleTerminalPanelInitialized = () => {
  // Terminal panel initialized
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

// Mode-specific command handlers
const executeGenerativeCommand = (command: string) => {
  // Handle command actions from CommandRegistry
  switch (command) {
    case 'show-model-selector':
      showModelSelector.value = true
      break

    case 'show-cost-panel':
      showCostPanel.value = true
      break

    case 'show-context-panel':
      showContextPanel.value = true
      break

    case 'show-usage-panel':
      showUsagePanel.value = true
      break

    case 'add-directory-to-context':
      showAddDirectory.value = true
      break

    case 'show-memory-settings':
      showMemorySettings.value = true
      break

    case 'compact-conversation':
      showCompact.value = true
      break

    case 'show-config-settings':
      showConfig.value = true
      break

    case 'show-system-diagnostics':
      showDoctor.value = true
      break

    case 'show-system-status':
      showStatus.value = true
      break

    case 'show-permissions-manager':
      showPermissions.value = true
      break

    case 'show-mcp-manager':
      showMcp.value = true
      break

    case 'show-agents-manager':
      showAgents.value = true
      break

    case 'show-code-review':
      showReview.value = true
      break

    case 'show-pr-comments':
      showPrComments.value = true
      break

    case 'show-project-init':
      showInit.value = true
      break

    case 'show-login':
      showLogin.value = true
      break

    case 'show-logout':
      showLogout.value = true
      break

    case 'show-bug-report':
      showBugReport.value = true
      break

    case 'show-terminal-setup':
      showTerminalSetup.value = true
      break

    case 'show-help':
      showHelp.value = true
      break

    case 'clear-conversation':
      if (chatPanelRef.value) {
        chatPanelRef.value.clearMessages()
        success('Conversation cleared')
      } else {
        error('Chat panel not available')
      }
      break

    case 'rewind-conversation':
      if (chatPanelRef.value) {
        const removed = chatPanelRef.value.rewindMessages(1)
        if (removed > 0) {
          success(`Removed ${removed} message${removed > 1 ? 's' : ''}`)
        } else {
          info('No messages to remove')
        }
      } else {
        error('Chat panel not available')
      }
      break

    default:
      // Regular generative AI command processing
      // TODO: Send to AI for processing
      break
  }
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

// Load available commands from Electron
const loadCommands = async () => {
  if (!window.electronAPI?.commands) {
    return
  }

  try {
    const commands = await window.electronAPI.commands.list()
    availableCommands.value = commands
  } catch (error) {
    console.error('[App] Failed to load commands:', error)
  }
}

// Handle command execution from palette
const handleCommandExecute = async (commandName: string) => {
  if (!window.electronAPI?.commands) {
    return
  }

  try {
    const result = await window.electronAPI.commands.execute(commandName)

    if (!result.success) {
      console.error('[App] Command execution failed:', result.message)
      return
    }

    // Handle command actions based on result data
    if (result.data?.action) {
      handleCommandAction(result.data.action as string, result.data)
    }
  } catch (error) {
    console.error('[App] Failed to execute command:', error)
  }
}

// Handle command actions
const handleCommandAction = (action: string, data: Record<string, unknown>) => {
  void data

  switch (action) {
    case 'show-model-selector':
      showModelSelector.value = true
      break

    case 'show-cost-panel':
      showCostPanel.value = true
      break

    case 'show-context-panel':
      showContextPanel.value = true
      break

    case 'clear-conversation':
      // TODO: Clear AI conversation history via ChatPanel component or shared store
      console.warn(
        '[App] clear-conversation not yet implemented - needs ChatPanel integration'
      )
      break

    case 'rewind-conversation':
      // TODO: Rewind conversation via ChatPanel component or shared store
      console.warn(
        '[App] rewind-conversation not yet implemented - needs ChatPanel integration'
      )
      break

    default:
      console.warn('[App] Unknown command action:', action)
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
      :project-path="projectRoot"
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
        <DeckSidebar v-show="currentMode === 'generative'" />
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

      <!-- Main content area -->
      <template v-if="!isOnboardingActive" #default>
        <div
          class="main-content"
          :class="{
            'content-centered': currentMode !== 'timeline',
            'content-timeline': currentMode === 'timeline',
          }"
        >
          <!-- Deck HAT Content -->
          <div
            v-show="currentMode === 'generative'"
            class="mode-content-container"
          >
            <div class="mode-content">
              <h1 class="mode-title">Deck HAT</h1>
              <p class="mode-subtitle">
                Command Center with Immutable Audit Trail
              </p>

              <div class="mode-description">
                <p>
                  Welcome to the <strong>Deck HAT</strong> - Hatcher's command
                  and control center. This is your strategic orchestration
                  interface where AI executes your commands with complete
                  transparency and auditability through the Decklog system.
                </p>

                <p>
                  Issue natural language commands to AI fleets, watch execution
                  in real-time, and maintain an immutable audit trail of every
                  decision. From code generation to complex deployments, command
                  your development environment with military precision while
                  Constitutional Engineering ensures all actions comply with
                  your standards.
                </p>
              </div>

              <div class="mode-cta">
                <p class="cta-text">Ready to take command of your AI fleet?</p>
                <p class="cta-hint">
                  Try commanding:
                  <em
                    >"Refactor authentication to use OAuth2 with backward
                    compatibility"</em
                  >
                </p>
              </div>
            </div>
          </div>

          <!-- Visual Mode Content -->
          <VisualView v-show="currentMode === 'visual'">
            <template #address-bar>
              <AddressBar
                v-model:value="addressValue"
                :current-mode="currentMode"
                :breadcrumb-context="getContextForMode(currentMode)"
                @execute="handleExecuteCommand"
              />
            </template>
          </VisualView>

          <!-- Code Mode Content -->
          <CodeView v-show="currentMode === 'code'">
            <template #address-bar>
              <AddressBar
                v-model:value="addressValue"
                :current-mode="currentMode"
                :breadcrumb-context="getContextForMode(currentMode)"
                @execute="handleExecuteCommand"
              />
            </template>
          </CodeView>

          <!-- Timeline Mode Content -->
          <GitTimelineView v-show="currentMode === 'timeline'">
            <template #address-bar>
              <AddressBar
                v-model:value="addressValue"
                :current-mode="currentMode"
                :breadcrumb-context="getContextForMode(currentMode)"
                @execute="handleExecuteCommand"
              />
            </template>
          </GitTimelineView>
        </div>
      </template>

      <!-- Terminal Panel removed - now in GlobalTerminalFooter -->

      <!-- Chat Panel - Persistent across all modes -->
      <template v-if="!isOnboardingActive" #chat-panel>
        <ChatPanel
          ref="chatPanelRef"
          :current-mode="currentMode"
          :effective-width="`${chatWidth}px`"
          :should-show-resize-handle="shouldShowResizeHandle"
          :is-generative-mode="isGenerativeMode"
          :is-resizing="isResizing"
          :start-resize="startResize"
        >
          <!-- AI Model Selector for generative mode -->
          <template #ai-model-selector>
            <AIModelSelector />
          </template>

          <!-- Address Bar for generative mode -->
          <template #address-bar>
            <AddressBar
              v-model:value="addressValue"
              :current-mode="currentMode"
              :breadcrumb-context="getContextForMode(currentMode)"
              @execute="handleExecuteCommand"
            />
          </template>
        </ChatPanel>
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

  <!-- Command Palette -->
  <CommandPalette
    :visible="showCommandPalette"
    :commands="availableCommands"
    @close="showCommandPalette = false"
    @execute="handleCommandExecute"
  />

  <!-- Model Selector Modal -->
  <ModelSelectorModal
    :visible="showModelSelector"
    @close="showModelSelector = false"
    @select="handleModelSelect"
  />

  <!-- Cost Panel Modal -->
  <CostPanelModal :visible="showCostPanel" @close="showCostPanel = false" />

  <!-- Context Panel Modal -->
  <ContextPanelModal
    :visible="showContextPanel"
    @close="showContextPanel = false"
    @clear="handleClearConversation"
  />

  <!-- Usage Panel Modal -->
  <UsagePanelModal :visible="showUsagePanel" @close="showUsagePanel = false" />

  <!-- Add Directory Modal -->
  <AddDirectoryModal
    :visible="showAddDirectory"
    @close="showAddDirectory = false"
    @add="handleAddDirectory"
  />

  <!-- Memory Settings Modal -->
  <MemorySettingsModal
    :visible="showMemorySettings"
    @close="showMemorySettings = false"
  />

  <!-- Compact Modal -->
  <CompactModal
    :visible="showCompact"
    @close="showCompact = false"
    @compact="handleCompact"
  />

  <!-- Config Modal -->
  <ConfigModal
    :visible="showConfig"
    @close="showConfig = false"
    @save="handleSaveConfig"
  />

  <!-- Doctor Modal -->
  <DoctorModal
    :visible="showDoctor"
    @close="showDoctor = false"
    @run-diagnostics="handleRunDiagnostics"
  />

  <!-- Status Modal -->
  <StatusModal :visible="showStatus" @close="showStatus = false" />

  <!-- Permissions Modal -->
  <PermissionsModal
    :visible="showPermissions"
    @close="showPermissions = false"
    @save="handleSavePermissions"
  />

  <!-- MCP Modal -->
  <McpModal :visible="showMcp" @close="showMcp = false" @save="handleSaveMcp" />

  <!-- Agents Modal -->
  <AgentsModal
    :visible="showAgents"
    @close="showAgents = false"
    @save="handleSaveAgents"
  />

  <!-- Review Modal -->
  <ReviewModal
    :visible="showReview"
    @close="showReview = false"
    @review="handleStartReview"
  />

  <!-- PR Comments Modal -->
  <PrCommentsModal :visible="showPrComments" @close="showPrComments = false" />

  <!-- Init Modal -->
  <InitModal
    :visible="showInit"
    @close="showInit = false"
    @init="handleInitProject"
  />

  <!-- Login Modal -->
  <LoginModal
    :visible="showLogin"
    @close="showLogin = false"
    @login="handleLogin"
  />

  <!-- Logout Modal -->
  <LogoutModal
    :visible="showLogout"
    @close="showLogout = false"
    @logout="handleLogout"
  />

  <!-- Bug Report Modal -->
  <BugReportModal
    :visible="showBugReport"
    @close="showBugReport = false"
    @submit="handleBugReport"
  />

  <!-- Terminal Setup Modal -->
  <TerminalSetupModal
    :visible="showTerminalSetup"
    @close="showTerminalSetup = false"
    @save="handleSaveTerminalSettings"
  />

  <!-- Help Modal -->
  <HelpModal :visible="showHelp" @close="showHelp = false" />
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
  top: var(--header-height);
  right: 0;
  bottom: 40px; /* Space for footer */
  width: 320px;
  z-index: 1000;
  pointer-events: auto;
  display: flex;
  justify-content: flex-end; /* Align pipeline to the right */
}
</style>
