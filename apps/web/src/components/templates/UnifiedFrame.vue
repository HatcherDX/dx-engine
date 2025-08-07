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
    <!-- Sidebar -->
    <Sidebar
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

    <!-- Header -->
    <header class="frame-header" @dblclick="handleHeaderDoubleClick">
      <div class="header-content">
        <!-- Left section: Platform-specific content -->
        <div class="header-left">
          <!-- Mac: Logo -->
          <template v-if="platform === 'macos'">
            <BaseLogo size="sm" variant="egg-white" />
          </template>

          <!-- PC: Mode Navigation -->
          <template v-else>
            <nav v-if="showModeNavigation" class="mode-navigation">
              <slot name="navigation" />
            </nav>
          </template>
        </div>

        <!-- Center section: Address Bar -->
        <div class="header-center">
          <slot name="address-bar" />
        </div>

        <!-- Right section: Platform-specific actions + Window Controls -->
        <div class="header-right">
          <!-- Mac: Mode Navigation -->
          <template v-if="platform === 'macos'">
            <nav v-if="showModeNavigation" class="mode-navigation">
              <slot name="navigation" />
            </nav>
          </template>

          <!-- PC: Window Controls -->
          <template v-else>
            <!-- Window Controls -->
            <WindowControls
              :variant="variant === 'compact' ? 'compact' : 'default'"
            />
          </template>
        </div>
      </div>
    </header>

    <!-- Main Content Area -->
    <main
      class="frame-main"
      :class="{
        'main-generative': isGenerativeMode,
        'main-with-terminal': showTerminalPanel,
      }"
    >
      <div v-if="!isGenerativeMode" class="main-content-area">
        <div class="main-content">
          <slot />
        </div>

        <!-- Terminal Panel - Inside main content area -->
        <div
          v-if="showTerminalPanel"
          class="frame-terminal"
          :style="{ height: terminalHeight + 'px' }"
        >
          <div
            class="terminal-resize-handle"
            @mousedown="(event: MouseEvent) => startTerminalResize(event)"
            @touchstart="(event: TouchEvent) => startTerminalResize(event)"
          >
            <div class="resize-handle-line"></div>
          </div>
          <slot name="terminal-panel" />
        </div>
      </div>
    </main>

    <!-- Chat Panel - Always rendered, positioned via CSS -->
    <div class="frame-chat" :class="{ 'chat-generative': isGenerativeMode }">
      <slot name="chat-panel" />
    </div>

    <!-- Optional Footer -->
    <footer v-if="$slots.footer" class="frame-footer">
      <div class="footer-content">
        <div class="footer-left">
          <slot name="footer" />
        </div>
        <div class="footer-right">
          <BaseButton
            variant="ghost"
            size="sm"
            :aria-label="`Switch to ${isDark ? 'light' : 'dark'} theme`"
            @click="toggleTheme"
          >
            <BaseIcon :name="isDark ? 'Sun' : 'Moon'" size="sm" />
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

import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useTheme } from '../../composables/useTheme'
import { useWindowControls } from '../../composables/useWindowControls'
import { useSidebarResize } from '../../composables/useSidebarResize'
import { useChatSidebar } from '../../composables/useChatSidebar'
import BaseLogo from '../atoms/BaseLogo.vue'
import BaseButton from '../atoms/BaseButton.vue'
import BaseIcon from '../atoms/BaseIcon.vue'
import WindowControls from '../molecules/WindowControls.vue'
import Sidebar from '../atoms/Sidebar.vue'
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
})

const emit = defineEmits<Emits>()

const { isDark, toggleTheme, platform } = useTheme()
const { handleDoubleClick } = useWindowControls()
const { sidebarWidth, sidebarWidthPx, isResizing, startResize, resizeCursor } =
  useSidebarResize()

// Chat sidebar - get layout properties only
const { isGenerativeMode, setMode } = useChatSidebar()

// Terminal panel visibility
const showTerminalPanel = computed(() => props.currentMode === 'code')

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

const frameClasses = computed(() => {
  const base = ['unified-frame']

  // Platform-specific classes
  base.push(`platform-${platform.value}`)

  // Variant classes
  base.push(`variant-${props.variant}`)

  // Mode-specific classes
  if (isGenerativeMode.value) {
    base.push('mode-generative')
  }

  // Add mode-specific class for terminal layout
  if (props.currentMode) {
    base.push(`mode-${props.currentMode}`)
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

// Terminal resize functionality
const terminalHeight = ref(250) // Reduced from 400 to 250px for more compact layout
const isResizingTerminal = ref(false)
const initialMouseY = ref(0)
const initialTerminalHeight = ref(0)

const MIN_TERMINAL_HEIGHT = 200 // Reduced minimum back to 200px
const MAX_TERMINAL_HEIGHT_VH = 60 // Keep at 60% of viewport height

const startTerminalResize = (event: MouseEvent | TouchEvent) => {
  event.preventDefault()

  isResizingTerminal.value = true
  initialTerminalHeight.value = terminalHeight.value

  if (event instanceof MouseEvent) {
    initialMouseY.value = event.clientY
  } else {
    initialMouseY.value = event.touches[0].clientY
  }

  document.body.style.cursor = 'ns-resize'
  document.body.style.userSelect = 'none'

  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  document.addEventListener('touchmove', handleResize)
  document.addEventListener('touchend', stopResize)
}

const handleResize = (event: MouseEvent | TouchEvent) => {
  if (!isResizingTerminal.value) return

  let currentMouseY: number
  if (event instanceof MouseEvent) {
    currentMouseY = event.clientY
  } else {
    currentMouseY = event.touches[0].clientY
  }

  const deltaY = initialMouseY.value - currentMouseY // Inverted because we want to drag up to increase height
  const newHeight = initialTerminalHeight.value + deltaY

  // Apply constraints
  const maxHeight = window.innerHeight * (MAX_TERMINAL_HEIGHT_VH / 100)
  terminalHeight.value = Math.max(
    MIN_TERMINAL_HEIGHT,
    Math.min(newHeight, maxHeight)
  )
}

const stopResize = () => {
  isResizingTerminal.value = false
  document.body.style.cursor = ''
  document.body.style.userSelect = ''

  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
  document.removeEventListener('touchmove', handleResize)
  document.removeEventListener('touchend', stopResize)
}

// Responsive terminal height
const updateTerminalConstraints = () => {
  const maxHeight = window.innerHeight * (MAX_TERMINAL_HEIGHT_VH / 100)
  if (terminalHeight.value > maxHeight) {
    terminalHeight.value = maxHeight
  }
}

onMounted(() => {
  window.addEventListener('resize', updateTerminalConstraints)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateTerminalConstraints)
  stopResize() // Clean up any ongoing resize
})
</script>

<style scoped>
.unified-frame {
  display: grid;
  grid-template-columns: auto 1fr auto;
  grid-template-rows: var(--header-height) 1fr auto;
  grid-template-areas:
    'sidebar header header'
    'sidebar main chat'
    'sidebar footer footer';
  width: 100vw;
  height: 100vh;
  background-color: var(--bg-primary);
  overflow: hidden;
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
}

.frame-header {
  grid-area: header;
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
}

/* In generative mode, remove safety zone */
.mode-generative .frame-main {
  min-width: 0;
}

.main-content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.main-content {
  flex: 1;
  overflow: hidden;
}

.main-chat-panel {
  flex: 1;
  height: 100%;
}

.frame-chat {
  grid-area: chat;
  overflow: hidden;
}

/* In generative mode, chat takes full main area */
.chat-generative {
  grid-area: main;
  width: 100%;
  height: 100%;
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
  padding: 8px 16px;
}

.footer-right {
  display: flex;
  align-items: stretch;
  height: 100%;
  /* Disable drag for footer buttons */
  -webkit-app-region: no-drag;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  padding: 0;
  gap: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
  /* Disable drag for interactive elements */
  -webkit-app-region: no-drag;
}

.header-center {
  flex: 1;
  max-width: 600px;
  margin: 0 auto;
  /* Disable drag for address bar */
  -webkit-app-region: no-drag;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* Platform-specific header right spacing */
.platform-macos .header-right {
  gap: 16px;
}

.platform-windows .header-right,
.platform-linux .header-right {
  gap: 8px;
  margin-right: 16px;
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

/* Header content styling */
.header-content {
  height: var(--header-height);
}

/* Platform-specific adjustments */
.platform-macos .header-content {
  /* No padding for macOS */
  padding: 0;
}

.platform-windows .header-content,
.platform-linux .header-content {
  /* No padding for Windows/Linux */
  padding: 0;
}

/* Variant adjustments */
.variant-compact .header-content {
  padding: 0;
  gap: 12px;
}

.variant-compact .header-left {
  gap: 12px;
}

.variant-fullscreen .frame-header {
  display: none;
}

.variant-fullscreen .frame-main {
  height: 100vh;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .header-content {
    padding: 0;
    gap: 12px;
  }

  .mode-navigation {
    display: none;
  }

  .header-center {
    max-width: none;
  }
}

@media (max-width: 480px) {
  .header-content {
    padding: 0;
    gap: 8px;
  }

  .header-right {
    gap: 4px;
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
  min-height: 32px !important;
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

/* Terminal Resize Handle */
.terminal-resize-handle {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 6px;
  cursor: ns-resize;
  background: transparent;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
}

.terminal-resize-handle:hover {
  background: rgba(59, 130, 246, 0.1);
}

.resize-handle-line {
  width: 40px;
  height: 2px;
  background: var(--border-primary);
  border-radius: 1px;
  transition: all 0.2s ease;
}

.terminal-resize-handle:hover .resize-handle-line {
  background: var(--accent-primary);
  width: 60px;
}

/* Code mode with terminal: no changes to grid, terminal is inside main */
.main-with-terminal .main-content {
  min-height: 300px;
}

/* Responsive terminal panel */
@media (max-height: 600px) {
  .frame-terminal {
    min-height: 150px;
    max-height: 40vh;
  }

  .main-with-terminal .main-content {
    min-height: 200px;
  }
}
</style>
