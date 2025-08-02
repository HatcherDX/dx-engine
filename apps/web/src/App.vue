<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useTheme } from './composables/useTheme'
import { useBreadcrumbContext } from './composables/useBreadcrumbContext'
import { useChatSidebar } from './composables/useChatSidebar'
import { useOnboarding } from './composables/useOnboarding'
import UnifiedFrame from './components/templates/UnifiedFrame.vue'
import ModeSelector from './components/molecules/ModeSelector.vue'
import AddressBar from './components/molecules/AddressBar.vue'
import BaseIcon from './components/atoms/BaseIcon.vue'
import BaseLogo from './components/atoms/BaseLogo.vue'
import BaseButton from './components/atoms/BaseButton.vue'
import PlayButton from './components/atoms/PlayButton.vue'
import GenerativeSidebar from './components/organisms/GenerativeSidebar.vue'
import VisualSidebar from './components/organisms/VisualSidebar.vue'
import CodeSidebar from './components/organisms/CodeSidebar.vue'
import TimelineSidebar from './components/organisms/TimelineSidebar.vue'
import ChatPanel from './components/organisms/ChatPanel.vue'
import OnboardingWelcome from './components/organisms/OnboardingWelcome.vue'
import OnboardingProjectSelection from './components/organisms/OnboardingProjectSelection.vue'
import OnboardingTaskSelection from './components/organisms/OnboardingTaskSelection.vue'
import OnboardingTaskDetail from './components/organisms/OnboardingTaskDetail.vue'
import OnboardingTransition from './components/organisms/OnboardingTransition.vue'
import type { ModeType } from './components/molecules/ModeSelector.vue'

// Initialize theme system
const { platform } = useTheme()

// Initialize breadcrumb context
const { getContextForMode, simulateFileChange } = useBreadcrumbContext()

// Initialize chat sidebar
const {
  width: chatWidth,
  resizeCursor: chatResizeCursor,
  shouldShowResizeHandle,
  isGenerativeMode,
  isResizing,
  startResize,
  setMode: setChatMode,
} = useChatSidebar()

// Initialize onboarding
const { isOnboardingActive, currentStep } = useOnboarding()

// Application state
const currentMode = ref<ModeType>('generative')
const addressValue = ref('')

// Initialize application
onMounted(async () => {
  // Application initialized silently
  // Initial AI context will be set based on onboarding completion
})

// Mode handling
const handleModeChange = (mode: ModeType) => {
  currentMode.value = mode
  // Update chat sidebar mode
  setChatMode(mode)
  // Clear address bar when switching modes
  addressValue.value = ''
  // Simulate context change for demo
  simulateFileChange(mode)
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
  // TODO: Implement play functionality for current mode
}

const handleStop = () => {
  // TODO: Implement stop functionality
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
  <!-- Onboarding Overlay -->
  <div v-if="isOnboardingActive" class="onboarding-overlay">
    <OnboardingWelcome v-if="currentStep === 'welcome'" />
    <OnboardingProjectSelection
      v-else-if="currentStep === 'project-selection'"
    />
    <OnboardingTaskSelection v-else-if="currentStep === 'task-selection'" />
    <OnboardingTaskDetail v-else-if="currentStep === 'task-detail'" />
    <OnboardingTransition v-else-if="currentStep === 'transition'" />
  </div>

  <!-- Main Application -->
  <UnifiedFrame v-show="!isOnboardingActive" :current-mode="currentMode">
    <!-- Sidebar content -->
    <template #sidebar-header>
      <div class="sidebar-header-content">
        <!-- Left section -->
        <div class="sidebar-header-left">
          <!-- Mac: empty space for traffic lights -->
          <!-- PC: Logo matching the Mac header -->
          <template v-if="platform !== 'macos'">
            <BaseLogo size="sm" variant="egg-white" />
          </template>
        </div>

        <!-- Right section -->
        <div class="sidebar-header-right">
          <PlayButton @play="handlePlay" @stop="handleStop" />
        </div>
      </div>
    </template>

    <template #sidebar-content>
      <!-- Dynamic sidebar content based on current mode -->
      <GenerativeSidebar v-show="currentMode === 'generative'" />
      <VisualSidebar v-show="currentMode === 'visual'" />
      <CodeSidebar v-show="currentMode === 'code'" />
      <TimelineSidebar v-show="currentMode === 'timeline'" />
    </template>

    <template #sidebar-footer>
      <div class="sidebar-footer-content">
        <BaseIcon name="Eye" size="xs" />
        <span>{{ currentMode }} mode</span>
      </div>
    </template>

    <!-- Navigation in header -->
    <template #navigation>
      <ModeSelector
        :current-mode="currentMode"
        @mode-change="handleModeChange"
      />
    </template>

    <!-- Address bar in header -->
    <template #address-bar>
      <AddressBar
        v-model:value="addressValue"
        :current-mode="currentMode"
        :breadcrumb-context="getContextForMode(currentMode)"
        @execute="handleExecuteCommand"
      />
    </template>

    <!-- Main content area -->
    <div class="main-content">
      <!-- Generative Mode Content -->
      <div v-show="currentMode === 'generative'" class="mode-content-container">
        <div class="mode-content">
          <h1 class="mode-title">Generative Mode</h1>
          <p class="mode-subtitle">AI-Powered Command Line Replacement</p>

          <div class="mode-description">
            <p>
              Welcome to <strong>Generative Mode</strong> - the heart of
              Hatcher's AI engine. This mode replaces traditional command-line
              interfaces with natural language interactions that understand your
              development context.
            </p>

            <p>
              Simply describe what you want to accomplish, and Hatcher will
              generate the appropriate commands, code, or configurations. From
              file operations to complex deployment tasks, communicate with your
              development environment as naturally as you would with a
              colleague.
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
          <p class="mode-subtitle">Advanced Visual Interaction (Coming Soon)</p>

          <div class="mode-description">
            <p>
              This is where <strong>'Controlled Amplification'</strong> comes to
              life. Visual Mode will transform how you move from design to code.
              You will be able to click on any component in your UI, give it
              natural language instructions like
              <em>"make this background 10% darker and add a subtle border"</em
              >, and watch as Hatcher translates your intent into clean, precise
              code.
            </p>

            <p>
              We will begin by shipping powerful responsive debugging tools,
              including a <strong>'360 View'</strong> to preview your components
              across multiple devices simultaneously, laying the groundwork for
              the revolutionary Visual-to-Code capability.
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
              <strong>Code Mode</strong> will be your environment for achieving
              an uninterrupted flow state. The AI will not only autocomplete; it
              will act as your personal co-pilot.
            </p>

            <p>
              You'll be able to ask it to refactor complex functions, explain
              code snippets, generate documentation automatically, and suggest
              performance improvements, all without leaving your editor. The
              goal is simple: to empower your expertise and eliminate repetitive
              tasks so you can focus on solving hard problems.
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

      <!-- Timeline Mode Content -->
      <div v-show="currentMode === 'timeline'" class="mode-content-container">
        <div class="mode-content">
          <h1 class="mode-title">Timeline Mode</h1>
          <p class="mode-subtitle">
            Intelligent Commits & Assisted Reviews (Coming Soon)
          </p>

          <div class="mode-description">
            <p>
              We are turning version control from a routine chore into a
              strategic act of communication. In <strong>Timeline Mode</strong>,
              Hatcher's AI will help you craft your project's history with
              impeccable clarity.
            </p>

            <p>
              You will be able to generate perfect commit messages based on your
              changes, ask the AI to explain a complex diff, and even request
              suggestions to improve code quality before it's pushed. The
              objective is to ensure every commit enriches the codebase and
              tells a clear story for your entire team.
            </p>
          </div>

          <div class="mode-cta">
            <p class="cta-text">
              Help us design the perfect version control workflow here.
            </p>
            <BaseButton
              variant="outline"
              size="sm"
              class="github-button"
              @click="openGitHub"
            >
              <BaseIcon name="GitBranch" size="xs" />
              Join the discussion
            </BaseButton>
          </div>
        </div>
      </div>
    </div>

    <!-- Chat Panel - Persistent across all modes -->
    <template #chat-panel>
      <ChatPanel
        :current-mode="currentMode"
        :effective-width="`${chatWidth}px`"
        :should-show-resize-handle="shouldShowResizeHandle"
        :is-generative-mode="isGenerativeMode"
        :is-resizing="isResizing"
        :start-resize="startResize"
        :resize-cursor="chatResizeCursor"
      />
    </template>

    <!-- Footer -->
    <template #footer>
      <span
        >Hatcher DX Engine v0.3.0 •
        {{ currentMode.charAt(0).toUpperCase() + currentMode.slice(1) }}
        Mode</span
      >
    </template>
  </UnifiedFrame>
</template>

<style scoped>
.main-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.welcome-container {
  text-align: center;
  max-width: 600px;
  animation: fade-in 0.6s ease-out;
}

.welcome-content {
  background-color: var(--bg-secondary);
  padding: 32px;
  border-radius: 12px;
  border: 1px solid var(--border-primary);
}

.welcome-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.welcome-description {
  font-size: 16px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.welcome-hint {
  font-size: 14px;
  color: var(--text-tertiary);
}

strong {
  color: var(--accent-primary);
  font-weight: 600;
}

.sidebar-hint {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 12px;
  font-style: italic;
}

/* Sidebar content styles */
.sidebar-header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 100%;
  color: var(--text-primary);
}

.sidebar-header-left {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.sidebar-header-right {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.sidebar-footer-content {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-tertiary);
}

/* Sidebar content logo styling */
.sidebar-content-logo {
  height: 48px !important; /* h-12 equivalent (3rem = 48px) */
  width: auto !important;
  margin: 16px auto;
  display: block;
}

/* Dynamic sidebar components handle their own styling */

/* Visual Mode Content */
.mode-content-container {
  text-align: center;
  max-width: 700px;
  animation: fade-in 0.6s ease-out;
}

.mode-content {
  background-color: var(--bg-secondary);
  padding: 40px;
  border-radius: 12px;
  border: 1px solid var(--border-primary);
}

.mode-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.mode-subtitle {
  font-size: 18px;
  color: var(--accent-primary);
  margin-bottom: 24px;
  font-weight: 500;
}

.mode-description {
  text-align: left;
  margin-bottom: 32px;
}

.mode-description p {
  font-size: 16px;
  line-height: 1.6;
  color: var(--text-secondary);
  margin-bottom: 16px;
}

.mode-description p:last-child {
  margin-bottom: 0;
}

.mode-description strong {
  color: var(--accent-primary);
  font-weight: 600;
}

.mode-description em {
  color: var(--text-primary);
  font-style: italic;
}

.mode-cta {
  text-align: center;
  padding-top: 24px;
  border-top: 1px solid var(--border-primary);
}

.cta-text {
  font-size: 16px;
  color: var(--text-secondary);
  margin-bottom: 16px;
}

.cta-hint {
  font-size: 14px;
  color: var(--text-tertiary);
  margin: 12px 0 0 0;
  font-style: italic;
}

.cta-hint em {
  color: var(--accent-primary);
  background: var(--bg-tertiary);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-size: 13px;
  font-style: normal;
}

.github-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  transition: all var(--transition-fast);
  color: var(--text-primary) !important;
  border-color: var(--border-secondary) !important;
}

.github-button:hover {
  transform: translateY(-1px);
  background-color: var(--hover-bg-light) !important;
  color: var(--text-primary) !important;
}

.dark .github-button:hover {
  background-color: var(--hover-bg-dark) !important;
}

/* Animations */
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Onboarding Overlay */
.onboarding-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  background-color: var(--bg-primary);
}

@media (max-width: 768px) {
  .main-content {
    padding: 16px;
  }

  .welcome-content {
    padding: 24px;
  }

  .welcome-title {
    font-size: 20px;
  }

  .mode-content {
    padding: 24px;
  }

  .mode-title {
    font-size: 24px;
  }

  .mode-subtitle {
    font-size: 16px;
  }

  .mode-description p {
    font-size: 15px;
  }
}
</style>
