<!--
/**
 * @fileoverview UnifiedFrame template component for the main application layout.
 * 
 * @description
 * A comprehensive layout template that provides the main application frame structure.
 * Supports multiple modes (generative, code), platform-specific layouts (macOS, Windows, Linux),
 * responsive design, and extensible slot architecture for maximum flexibility.
 * 
 * @example
 * ```vue
 * <template>
 *   <UnifiedFrame
 *     :show-mode-navigation="true"
 *     variant="default"
 *     current-mode="code"
 *     @chat-mode-change="handleModeChange"
 *   >
 *     <template #sidebar-header>
 *       <h2>Project Explorer</h2>
 *     </template>
 *     <template #sidebar-content>
 *       <FileTree />
 *     </template>
 *     <template #navigation>
 *       <ModeSelector />
 *     </template>
 *     <template #address-bar>
 *       <AddressBar />
 *     </template>
 *     <template #default>
 *       <CodeEditor />
 *     </template>
 *     <template #terminal-panel>
 *       <TerminalPanel />
 *     </template>
 *     <template #chat-panel>
 *       <ChatInterface />
 *     </template>
 *     <template #footer>
 *       <StatusBar />
 *     </template>
 *   </UnifiedFrame>
 * </template>
 * ```
 * 
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */
-->
<template>
  <div class="unified-frame" :class="frameClasses" :style="frameStyles">
    <!-- Sidebar with transition -->
    <Transition name="sidebar-slide" appear>
      <Sidebar
        v-if="showSidebar && !isGhostMode"
        :width="sidebarWidth"
        :is-resizing="isResizing"
        :resize-cursor="resizeCursor"
        :platform="platform"
        class="frame-sidebar"
        :style="{ width: sidebarWidthPx }"
        @start-resize="startResize"
        @header-double-click="handleHeaderDoubleClick"
      >
        <template #sidebar-header>
          <slot name="sidebar-header" />
        </template>
        <template #sidebar-content>
          <slot name="sidebar-content" />
        </template>
        <template #sidebar-footer>
          <slot name="sidebar-footer" />
        </template>
      </Sidebar>
    </Transition>

    <!-- Header with transition -->
    <Transition name="header-slide" appear>
      <header
        v-if="!isGhostMode"
        class="frame-header"
        @dblclick="handleHeaderDoubleClick"
      >
        <!-- First Line: Logo, Mode Navigation, Window Controls -->
        <div class="header-top-line">
          <div class="header-top-left">
            <!-- macOS only: Project breadcrumb in main header -->
            <ProjectBreadcrumb
              v-if="platform === 'macos'"
              :project-name="projectName"
              :branch-name="branchName"
            />

            <!-- Windows/Linux: Mode Navigation on left -->
            <nav
              v-if="platform !== 'macos' && showModeNavigation"
              class="mode-navigation mode-navigation-left"
            >
              <slot name="navigation" />
            </nav>
          </div>

          <div class="header-top-center">
            <!-- Center area stays empty for cleaner layout -->
          </div>

          <div class="header-top-right">
            <!-- Mac: Mode Navigation on right -->
            <nav
              v-if="platform === 'macos' && showModeNavigation"
              class="mode-navigation mode-navigation-right"
            >
              <slot name="navigation" />
            </nav>

            <!-- PC: Window Controls -->
            <WindowControls
              v-if="platform !== 'macos'"
              :variant="variant === 'compact' ? 'compact' : 'default'"
            />
          </div>
        </div>

        <!-- Second Line: Address Bar -->
        <div class="header-bottom-line">
          <div class="address-bar-container">
            <slot name="address-bar" />
          </div>
        </div>
      </header>
    </Transition>

    <!-- Main Content Area -->
    <main
      class="frame-main"
      :class="{
        'main-generative': isGenerativeMode && !isGhostMode,
        'main-ghost': isGhostMode,
      }"
    >
      <!-- Onboarding content when in ghost mode -->
      <Transition name="content-fade" mode="out-in">
        <OnboardingContainer
          v-if="isGhostMode"
          key="onboarding"
          @complete="handleOnboardingComplete"
        />
        <!-- Normal content area when not in ghost mode -->
        <div
          v-else
          v-show="!isGenerativeMode"
          key="content"
          class="main-content-area"
        >
          <div class="content-slot">
            <slot />
          </div>
        </div>
      </Transition>
    </main>

    <!-- Terminal Panel - Only show when not in ghost mode -->
    <Transition name="terminal-slide" appear>
      <div
        v-if="!isGhostMode"
        class="frame-terminal"
        :class="{ 'terminal-hidden': currentMode !== 'code' }"
      >
        <slot name="terminal-panel" />
      </div>
    </Transition>

    <!-- Chat Panel - Only show when not in ghost mode -->
    <Transition name="chat-slide" appear>
      <div
        v-if="!isGhostMode"
        class="frame-chat"
        :class="{ 'chat-generative': isGenerativeMode }"
      >
        <slot name="chat-panel" data-testid="chat-panel-content" />
      </div>
    </Transition>

    <!-- Optional Footer -->
    <footer v-if="$slots.footer || showThemeToggle" class="frame-footer">
      <div class="footer-content">
        <div class="footer-left">
          <slot name="footer" />
        </div>
        <div v-if="showThemeToggle" class="footer-right">
          <BaseButton
            data-testid="base-button"
            variant="ghost"
            size="sm"
            :aria-label="`Switch to ${theme.isDark.value ? 'light' : 'dark'} mode`"
            @click="handleToggleTheme"
          >
            {{ theme.isDark.value ? '☀️' : '🌙' }}
          </BaseButton>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
/**
 * @fileoverview UnifiedFrame component logic and type definitions.
 *
 * @description
 * This script provides the reactive logic for the UnifiedFrame template component.
 * Manages platform detection, theme switching, sidebar resizing, terminal panel handling,
 * and mode-specific layout switching between generative AI and code development modes.
 */

import { computed } from 'vue'
import { useWindowControls } from '../../composables/useWindowControls'
import { useSidebarResize } from '../../composables/useSidebarResize'
import { useChatSidebar } from '../../composables/useChatSidebar'
import { useOnboarding } from '../../composables/useOnboarding'
import ProjectBreadcrumb from '../atoms/ProjectBreadcrumb.vue'
import WindowControls from '../molecules/WindowControls.vue'
import Sidebar from '../atoms/Sidebar.vue'
import OnboardingContainer from './OnboardingContainer.vue'
import BaseButton from '../atoms/BaseButton.vue'
import type { ModeType } from '../molecules/ModeSelector.vue'

/**
 * Props interface for the UnifiedFrame component.
 *
 * @interface Props
 * @public
 * @since 1.0.0
 */
interface Props {
  /** Whether to display mode navigation controls in the header */
  showModeNavigation?: boolean
  /** Layout variant affecting the overall frame appearance and behavior */
  variant?: 'default' | 'compact' | 'fullscreen'
  /** Current application mode determining layout and feature availability */
  currentMode?: ModeType
  /** Whether to show the sidebar (some modes like Timeline handle their own sidebar) */
  showSidebar?: boolean
  /** Current project name for the breadcrumb display */
  projectName?: string
  /** Current Git branch name for the breadcrumb display */
  branchName?: string
  /** Platform override for testing/development */
  platform?: 'macos' | 'windows' | 'linux'
  /** Whether to show the theme toggle button in the footer */
  showThemeToggle?: boolean
}

/**
 * Events emitted by the UnifiedFrame component.
 *
 * @interface Emits
 * @public
 * @since 1.0.0
 */
interface Emits {
  /** Emitted when the chat mode changes, providing the new mode */
  chatModeChange: [mode: ModeType]
}

const props = withDefaults(defineProps<Props>(), {
  showModeNavigation: true,
  variant: 'default',
  currentMode: 'generative',
  showSidebar: true,
  projectName: 'Project',
  branchName: 'main',
  platform: undefined,
  showThemeToggle: false,
})

const emit = defineEmits<Emits>()

// Import useTheme for platform detection fallback
import { useTheme } from '../../composables/useTheme'
const theme = useTheme()

// Get platform from props or useTheme
const platform = computed(() => {
  const p = props.platform || theme.platform.value
  console.log(
    '[UnifiedFrame] Platform detected:',
    p,
    'from props:',
    props.platform,
    'from theme:',
    theme.platform.value
  )
  return p
})
const { handleDoubleClick } = useWindowControls()
const { sidebarWidth, sidebarWidthPx, isResizing, startResize, resizeCursor } =
  useSidebarResize()

// Chat sidebar - get layout properties only
const { isGenerativeMode, setMode } = useChatSidebar()

// Onboarding - ghost mode control
const { isOnboardingActive, completeOnboarding } = useOnboarding()

// Ghost mode is active when onboarding is active
const isGhostMode = computed(() => isOnboardingActive.value)

// Terminal is now in global footer, not dependent on mode

// Watch for mode changes and emit to parent
import { watch } from 'vue'
watch(
  () => props.currentMode,
  (newMode) => {
    if (newMode) {
      setMode(newMode)
      emit('chatModeChange', newMode)
    }
  },
  { immediate: true }
)

/**
 * Handles theme toggle button click.
 *
 * @description
 * Toggles between light and dark themes by calling the useTheme composable.
 *
 * @public
 * @since 1.0.0
 */
const handleToggleTheme = () => {
  theme.toggleTheme()
}

const frameClasses = computed(() => {
  const base = ['unified-frame']

  // Platform-specific classes
  base.push(`platform-${platform.value}`)

  // Variant classes
  base.push(`variant-${props.variant}`)

  // Ghost mode class
  if (isGhostMode.value) {
    base.push('ghost-mode')
  } else {
    // Mode-specific classes only when not in ghost mode
    if (isGenerativeMode.value) {
      base.push('mode-generative')
    }

    // Add mode-specific class for terminal layout
    if (props.currentMode) {
      base.push(`mode-${props.currentMode}`)
    }
  }

  return base
})

// Computed styles - no longer needed for responsive layout
const frameStyles = computed(() => {
  return {}
})

const handleHeaderDoubleClick = () => {
  handleDoubleClick()
}

const handleOnboardingComplete = () => {
  completeOnboarding()
  // The ghost mode will automatically transition out due to reactive state
}

// Terminal resize functionality moved to GlobalTerminalFooter component
</script>

<style scoped>
.unified-frame {
  display: grid;
  grid-template-columns: auto 1fr auto;
  grid-template-rows: calc(var(--header-height) * 2) 1fr auto;
  grid-template-areas:
    'sidebar header header'
    'sidebar main chat'
    'sidebar footer footer';
  width: 100%;
  height: 100%;
  flex: 1;
  overflow: hidden;
  background-color: var(--bg-primary);
  transition:
    grid-template-columns 0.4s cubic-bezier(0.165, 0.84, 0.44, 1),
    grid-template-rows 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
}

/* Ghost mode layout - simplified grid without sidebar/header space */
.ghost-mode {
  grid-template-columns: 1fr !important;
  grid-template-rows: 1fr auto !important;
  grid-template-areas:
    'main'
    'footer' !important;
}

/* Generative mode: chat overlays main area */
.mode-generative {
  grid-template-columns: auto 1fr 0 !important;
  grid-template-areas:
    'sidebar header header'
    'sidebar main chat'
    'sidebar footer footer' !important;
}

/* Grid areas */
.frame-sidebar {
  grid-area: sidebar;
  position: relative;
  /* Remove transition to prevent lag during resize */
}

/* Removed background hover to prevent interference */

/* Sidebar resize handle styles moved to Sidebar.vue component */

/* Chat resize handle styles moved to ChatPanel.vue component */

.frame-header {
  grid-area: header;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-primary);
  backdrop-filter: blur(8px);
  z-index: 50;
  /* Enable window dragging */
  -webkit-app-region: drag;
  user-select: none;
}

.frame-main {
  grid-area: main;
  display: flex;
  overflow: hidden;
  background-color: var(--bg-primary);
  min-width: 200px; /* Safety zone for content */
  /* No margin by default - let grid handle spacing */
}

/* In generative mode, remove safety zone */
.mode-generative .frame-main {
  min-width: 0;
  /* No margin needed here - chat-generative handles pipeline spacing */
}

.main-content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.content-slot {
  flex: 1;
  display: flex;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
  box-sizing: border-box;
  justify-content: center;
}

/* Timeline mode: full width without centering */
.mode-timeline .content-slot {
  justify-content: flex-start;
  width: 100% !important;
}

/* Ensure children in timeline mode take full width */
.mode-timeline .content-slot > * {
  width: 100% !important;
  max-width: 100% !important;
  flex: 1 !important;
}

.main-chat-panel {
  flex: 1;
  height: 100%;
}

.frame-chat {
  grid-area: chat;
  overflow: hidden;
  position: relative;
  transition: all 0.2s ease;
  /* Add safezone for collapsed pipeline (48px + some buffer) */
  padding-right: 60px;
}

/* Removed background hover to prevent interference */

/* Old chat hover styles removed - now using specific .chat-resize-zone */

/* In generative mode, chat takes full main area */
.chat-generative {
  grid-area: main;
  width: 100%;
  height: 100%;
  margin-right: 0; /* No margin needed */
  padding-right: 240px; /* Exact padding for expanded pipeline (240px) */
}

.frame-footer {
  grid-area: footer;
  background-color: var(--bg-secondary);
  border-top: 1px solid var(--border-primary);
  padding: 0;
  font-size: 12px;
  color: var(--text-secondary);
  height: auto;
}

.footer-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 100%;
}

.footer-left {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 6px 16px;
  min-height: 28px;
}

.footer-right {
  display: flex;
  align-items: stretch;
  height: 100%;
  /* Disable drag for footer buttons */
  -webkit-app-region: no-drag;
}

/* Header top line - Logo, Mode Selector, Window Controls */
.header-top-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--header-height);
  padding: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

/* macOS: Only left padding for traffic lights, no right padding */
.platform-macos .header-top-line {
  padding-left: 16px;
}

.header-top-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto; /* Take only needed space */
  /* Disable drag for interactive elements */
  -webkit-app-region: no-drag;
}

.header-top-center {
  flex: 1; /* Take remaining space for dragging */
  min-height: var(--header-height);
  /* Explicitly allow dragging through center area */
  -webkit-app-region: drag;
}

.header-top-right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
  flex: 0 0 auto; /* Take only needed space */
  /* Disable drag for controls */
  -webkit-app-region: no-drag;
}

.mac-spacer {
  width: 100px;
  height: 100%;
}

/* Header bottom line - Address Bar */
.header-bottom-line {
  display: flex;
  align-items: center;
  justify-content: center;
  height: var(--header-height);
  padding: 0 16px;
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0.02),
    transparent
  );
  /* Allow dragging in empty areas of address bar line */
  -webkit-app-region: drag;
}

.address-bar-container {
  width: 100%;
  max-width: 800px;
  /* Disable drag for address bar */
  -webkit-app-region: no-drag;
}

/* Platform-specific adjustments for two-line header */
.platform-macos .header-top-left {
  justify-content: flex-start;
  flex: 0 0 auto; /* Override any flex changes */
}

.platform-macos .header-top-right {
  justify-content: flex-end;
  flex: 0 0 auto; /* Override any flex changes */
}

.platform-windows .header-top-left,
.platform-linux .header-top-left {
  justify-content: flex-start;
  gap: 4px; /* Tighter spacing for Windows/Linux */
  flex: 0 0 auto; /* Override any flex changes */
}

.platform-windows .header-top-right,
.platform-linux .header-top-right {
  justify-content: flex-end;
  padding-right: 4px; /* Less padding on right */
  gap: 8px; /* Tighter gap between window controls */
  flex: 0 0 auto; /* Override any flex changes */
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  /* Disable drag for action buttons */
  -webkit-app-region: no-drag;
}

.mode-navigation {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Platform-specific mode navigation positioning */
.mode-navigation-left {
  margin-left: 0;
}

.mode-navigation-right {
  margin-right: 0;
}

/* Variant adjustments */
.variant-compact .header-top-line,
.variant-compact .header-bottom-line {
  padding: 0 12px;
}

.variant-compact .header-top-line {
  height: calc(var(--header-height) * 0.9);
}

.variant-compact .header-bottom-line {
  height: calc(var(--header-height) * 0.9);
}

.variant-fullscreen .frame-header {
  display: none;
}

.variant-fullscreen .frame-main {
  height: 100vh;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .header-top-line,
  .header-bottom-line {
    padding: 0 12px;
  }

  .address-bar-container {
    max-width: 100%;
  }
}

@media (max-width: 480px) {
  .mode-navigation {
    display: none;
  }

  .header-top-left,
  .header-top-right {
    flex: 0 0 auto; /* Keep consistent sizing in compact mode */
  }
}

/* FOURTH TIME FIX: Theme toggle button with maximum specificity - SQUARE BUTTON */
.unified-frame footer .footer-content .footer-right button,
.unified-frame footer .footer-content .footer-right button.bg-transparent,
footer .footer-content .footer-right button,
footer .footer-content .footer-right button.bg-transparent {
  outline: none !important;
  border: none !important;
  box-shadow: none !important;
  border-radius: 0 !important;
  transition: none !important;
  background-color: transparent !important;
  background: transparent !important;
  /* Make button square and full height */
  height: 100% !important;
  aspect-ratio: 1 !important;
  min-height: 28px !important;
  width: auto !important;
  padding: 0 !important;
  margin: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  cursor: pointer !important;
}

.unified-frame footer .footer-content .footer-right button:hover,
.unified-frame footer .footer-content .footer-right button.bg-transparent:hover,
footer .footer-content .footer-right button:hover,
footer .footer-content .footer-right button.bg-transparent:hover {
  background-color: var(--hover-bg-light) !important;
  background: var(--hover-bg-light) !important;
  transition: background-color var(--transition-fast) !important;
}

.dark .unified-frame footer .footer-content .footer-right button:hover,
.dark
  .unified-frame
  footer
  .footer-content
  .footer-right
  button.bg-transparent:hover,
.dark footer .footer-content .footer-right button:hover,
.dark footer .footer-content .footer-right button.bg-transparent:hover {
  background-color: var(--hover-bg-dark) !important;
  background: var(--hover-bg-dark) !important;
  transition: background-color var(--transition-fast) !important;
}

/* Remove ALL possible background states */
.unified-frame footer .footer-content .footer-right button:active,
.unified-frame footer .footer-content .footer-right button:focus,
.unified-frame footer .footer-content .footer-right button:focus-visible,
.unified-frame
  footer
  .footer-content
  .footer-right
  button.bg-transparent:active,
.unified-frame footer .footer-content .footer-right button.bg-transparent:focus,
.unified-frame
  footer
  .footer-content
  .footer-right
  button.bg-transparent:focus-visible,
footer .footer-content .footer-right button:active,
footer .footer-content .footer-right button:focus,
footer .footer-content .footer-right button:focus-visible,
footer .footer-content .footer-right button.bg-transparent:active,
footer .footer-content .footer-right button.bg-transparent:focus,
footer .footer-content .footer-right button.bg-transparent:focus-visible {
  outline: none !important;
  border: none !important;
  box-shadow: none !important;
  background-color: transparent !important;
  background: transparent !important;
}

/* Terminal Panel */
.frame-terminal {
  position: relative;
  background-color: var(--bg-primary);
  border-top: 1px solid var(--border-primary);
  flex-shrink: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Hide terminal panel when not in code mode */
.frame-terminal.terminal-hidden {
  display: none !important;
  pointer-events: none;
}

/* Hide main content area in generative mode without destroying DOM elements */
.mode-generative .main-content-area.content-hidden-generative,
.main-content-area.content-hidden-generative {
  display: none !important;
  pointer-events: none;
  visibility: hidden !important;
  opacity: 0 !important;
  height: 0 !important;
  overflow: hidden !important;
}

/* Terminal resize handle moved to GlobalTerminalFooter */

/* Responsive terminal panel */
@media (max-height: 600px) {
  .frame-terminal {
    min-height: 150px;
    max-height: 40vh;
  }
}

/* Ghost mode main area styling */
.main-ghost {
  grid-area: main;
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* Ensure OnboardingContainer takes full space in ghost mode */
.main-ghost > * {
  width: 100%;
  height: 100%;
}

/* Transition Animations */

/* Sidebar slide animation */
.sidebar-slide-enter-active,
.sidebar-slide-leave-active {
  transition: all 0.5s cubic-bezier(0.165, 0.84, 0.44, 1);
}

.sidebar-slide-enter-from {
  transform: translateX(-100%);
  opacity: 0;
}

.sidebar-slide-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}

/* Header slide animation */
.header-slide-enter-active,
.header-slide-leave-active {
  transition: all 0.5s cubic-bezier(0.165, 0.84, 0.44, 1);
  transition-delay: 0.1s; /* Slight delay after sidebar */
}

.header-slide-enter-from {
  transform: translateY(-100%);
  opacity: 0;
}

.header-slide-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}

/* Chat panel slide animation */
.chat-slide-enter-active,
.chat-slide-leave-active {
  transition: all 0.5s cubic-bezier(0.165, 0.84, 0.44, 1);
  transition-delay: 0.2s; /* Slight delay after header */
}

.chat-slide-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.chat-slide-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

/* Content fade animation for switching between onboarding and main content */
.content-fade-enter-active,
.content-fade-leave-active {
  transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
  width: 100%;
  height: 100%;
}

.content-fade-enter-from {
  opacity: 0;
  transform: scale(0.98);
}

.content-fade-leave-to {
  opacity: 0;
  transform: scale(0.98);
}
</style>
