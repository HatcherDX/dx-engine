<template>
  <div
    class="global-terminal-footer"
    :class="{
      expanded: isExpanded,
      collapsed: !isExpanded,
      resizing: isResizing,
    }"
    :style="{ height: footerHeight + 'px' }"
  >
    <!-- Resize Handle at the top when expanded -->
    <div
      v-if="isExpanded"
      class="terminal-resize-handle"
      @mousedown="startResize"
      @touchstart="startResize"
    >
      <div class="resize-handle-line"></div>
    </div>

    <!-- Terminal Content (Expanded) - grows upward -->
    <div v-show="isExpanded" class="terminal-content">
      <slot name="terminal">
        <!-- Terminal panel will be inserted here -->
      </slot>
    </div>

    <!-- Footer Bar with Terminal Tabs (Always at bottom) -->
    <div class="footer-bar" @click="handleFooterClick">
      <div class="footer-left">
        <button
          class="terminal-toggle-btn"
          :title="
            isExpanded
              ? 'Collapse Terminal (Ctrl/Cmd+`)'
              : 'Expand Terminal (Ctrl/Cmd+`)'
          "
          @click.stop="toggleExpanded"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="currentColor"
            :style="{
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            }"
          >
            <path d="M8 4.5L12 8.5L11.3 9.2L8 5.9L4.7 9.2L4 8.5Z" />
          </svg>
        </button>
        <span class="audit-text">hatcher::consoles</span>
      </div>
      <div class="footer-tabs">
        <slot name="terminal-tabs">
          <!-- Terminal tabs will be inserted here -->
        </slot>
      </div>
      <div class="footer-right">
        <span class="version-text">Hatcher v{{ appVersion }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/* eslint-env browser */
/* eslint-disable no-undef */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useStorage } from '@vueuse/core'

interface Props {
  appVersion?: string
  terminalCount?: number
  currentStatus?: string
}

withDefaults(defineProps<Props>(), {
  appVersion: '0.0.0',
  terminalCount: 0,
  currentStatus: '',
})

// State - Default to collapsed (false) for better initial UX
// The terminal will expand when user clicks on tabs or uses keyboard shortcut
const isExpanded = useStorage('terminal-expanded', false, localStorage, {
  // Ensure collapsed state on first load for cleaner interface
  initOnMounted: true,
})
const footerHeight = ref(40) // Collapsed height
const isResizing = ref(false)
const initialMouseY = ref(0)
const initialHeight = ref(0)

// Constants
const COLLAPSED_HEIGHT = 40
const DEFAULT_EXPANDED_HEIGHT = 300
const MIN_EXPANDED_HEIGHT = 150
const MAX_EXPANDED_HEIGHT_VH = 60

// Computed
const maxExpandedHeight = computed(() => {
  return window.innerHeight * (MAX_EXPANDED_HEIGHT_VH / 100)
})

// Methods
const toggleExpanded = () => {
  if (isExpanded.value) {
    // Collapsing
    footerHeight.value = COLLAPSED_HEIGHT
    isExpanded.value = false
  } else {
    // Expanding
    const savedHeight = parseInt(
      window.localStorage.getItem('terminal-height') ||
        String(DEFAULT_EXPANDED_HEIGHT)
    )
    footerHeight.value = Math.min(savedHeight, maxExpandedHeight.value)
    isExpanded.value = true
  }
}

// Expose method for parent to expand terminal
const expandTerminal = () => {
  if (!isExpanded.value) {
    const savedHeight = parseInt(
      window.localStorage.getItem('terminal-height') ||
        String(DEFAULT_EXPANDED_HEIGHT)
    )
    footerHeight.value = Math.min(savedHeight, maxExpandedHeight.value)
    isExpanded.value = true
  }
}

// Handle click on footer bar to expand if collapsed
const handleFooterClick = (event: MouseEvent) => {
  // Only expand if clicked on the footer bar itself (not tabs or buttons)
  const target = event.target as HTMLElement
  if (!isExpanded.value && target.classList.contains('footer-bar')) {
    toggleExpanded()
  }
}

// Expose for parent component
defineExpose({ expandTerminal, toggleExpanded })

const startResize = (event: MouseEvent | TouchEvent) => {
  if (!isExpanded.value) return

  event.preventDefault()
  isResizing.value = true
  initialHeight.value = footerHeight.value

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

let resizeRafId: number | null = null

const handleResize = (event: MouseEvent | TouchEvent) => {
  if (!isResizing.value) return

  // Cancel any pending RAF to avoid multiple updates
  if (resizeRafId) {
    cancelAnimationFrame(resizeRafId)
  }

  // Use requestAnimationFrame for smooth 60fps updates
  resizeRafId = requestAnimationFrame(() => {
    let currentMouseY: number
    if (event instanceof MouseEvent) {
      currentMouseY = event.clientY
    } else {
      currentMouseY = event.touches[0].clientY
    }

    const deltaY = initialMouseY.value - currentMouseY
    const newHeight = initialHeight.value + deltaY

    footerHeight.value = Math.max(
      MIN_EXPANDED_HEIGHT,
      Math.min(newHeight, maxExpandedHeight.value)
    )
  })
}

const stopResize = () => {
  isResizing.value = false
  document.body.style.cursor = ''
  document.body.style.userSelect = ''

  // Cancel any pending RAF
  if (resizeRafId) {
    cancelAnimationFrame(resizeRafId)
    resizeRafId = null
  }

  // Save the height for next time
  if (isExpanded.value) {
    window.localStorage.setItem('terminal-height', String(footerHeight.value))
  }

  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
  document.removeEventListener('touchmove', handleResize)
  document.removeEventListener('touchend', stopResize)
}

// Keyboard shortcut
const handleKeydown = (event: KeyboardEvent) => {
  // Ctrl/Cmd + ` to toggle terminal
  if ((event.ctrlKey || event.metaKey) && event.key === '`') {
    event.preventDefault()
    toggleExpanded()
  }
}

// Responsive handling
const updateMaxHeight = () => {
  if (isExpanded.value && footerHeight.value > maxExpandedHeight.value) {
    footerHeight.value = maxExpandedHeight.value
  }
}

// Lifecycle
onMounted(() => {
  // Restore previous state
  if (isExpanded.value) {
    const savedHeight = parseInt(
      window.localStorage.getItem('terminal-height') ||
        String(DEFAULT_EXPANDED_HEIGHT)
    )
    footerHeight.value = Math.min(savedHeight, maxExpandedHeight.value)
  } else {
    footerHeight.value = COLLAPSED_HEIGHT
  }

  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('resize', updateMaxHeight)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('resize', updateMaxHeight)
  stopResize()
})
</script>

<style scoped>
.global-terminal-footer {
  position: relative;
  width: 100%;
  background: var(--terminal-bg);
  border-top: 1px solid var(--border-primary);
  z-index: 2000; /* Higher than QuantumPipeline (1000) */
  display: flex;
  flex-direction: column;
  transition: height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0; /* Prevent shrinking when content pushes */
}

.global-terminal-footer.resizing {
  transition: none;
}

/* Resize Handle */
.terminal-resize-handle {
  position: absolute;
  top: -5px;
  left: 0;
  right: 0;
  height: 10px;
  cursor: ns-resize;
  z-index: 10;
  opacity: 0;
  transition: opacity 0.2s;
}

.global-terminal-footer.expanded .terminal-resize-handle {
  opacity: 1;
}

.terminal-resize-handle:hover {
  background: rgba(223, 169, 39, 0.05); /* Subtle golden glow */
}

.resize-handle-line {
  position: absolute;
  top: 4px;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 2px;
  background: var(--border-secondary);
  border-radius: 1px;
  transition: all 0.2s;
  opacity: 0.5;
}

.terminal-resize-handle:hover .resize-handle-line {
  background: var(--accent-primary);
  width: 60px;
  opacity: 1;
}

/* Footer Bar */
.footer-bar {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0;
  flex-shrink: 0;
  user-select: none;
  -webkit-app-region: no-drag;
  background: var(--terminal-bg);
  border-top: 1px solid var(--terminal-border);
  cursor: pointer;
  position: relative;
}

/* Visual feedback when hovering footer bar in collapsed state */
.global-terminal-footer.collapsed .footer-bar:hover {
  background: var(--bg-tertiary);
  opacity: 0.95;
}

.footer-tabs {
  flex: 1;
  display: flex;
  align-items: stretch;
  height: 100%;
  overflow-x: auto;
  overflow-y: hidden;
}

/* Style overrides for terminal tabs when in footer */
.footer-tabs :deep(.terminal-tab-bar) {
  background-color: transparent;
  height: 100%;
  display: flex;
  width: 100%;
}

.footer-tabs :deep(.terminal-tab-bar__tabs) {
  height: 100%;
  align-items: stretch;
}

.footer-tabs :deep(.terminal-tab) {
  height: 100%;
  border-bottom: none;
  display: flex;
  align-items: center;
  cursor: pointer;
  color: var(--terminal-text);
  transition: all 0.2s ease;
  position: relative;
  font-size: 12px;
  padding: 0 12px;
  font-weight: 400;
}

/* Adjust terminal tab name for better balance */
.footer-tabs :deep(.terminal-tab__name) {
  font-size: 12px;
  max-width: 100px;
}

/* Make icons smaller in footer tabs */
.footer-tabs :deep(.terminal-tab__icon) {
  width: 14px;
  height: 14px;
  margin-right: 6px;
}

/* Adjust close button size in footer tabs */
.footer-tabs :deep(.terminal-tab__close) {
  width: 14px;
  height: 14px;
  margin-left: 4px;
}

.footer-tabs :deep(.terminal-tab__close svg) {
  width: 12px;
  height: 12px;
}

/* When collapsed, no tab should appear active */
.global-terminal-footer.collapsed .footer-tabs :deep(.terminal-tab--active) {
  background-color: transparent;
  color: var(--terminal-text);
  animation: none;
}

/* Collapsed state - tabs are clickable hints to expand */
.global-terminal-footer.collapsed .footer-tabs :deep(.terminal-tab) {
  opacity: 0.7;
  cursor: pointer;
}

/* Enhanced hover state for collapsed mode - show expand hint */
.global-terminal-footer.collapsed .footer-tabs :deep(.terminal-tab:hover) {
  background-color: var(--terminal-hover-bg);
  color: var(--terminal-text-hover);
  opacity: 1;
}

.footer-tabs :deep(.terminal-tab:hover) {
  background-color: var(--terminal-hover-bg);
  color: var(--terminal-text-hover);
}

/* Active tab styles - only when expanded */
.global-terminal-footer.expanded .footer-tabs :deep(.terminal-tab--active) {
  background-color: var(--terminal-active-bg);
  color: var(--terminal-text-active);
}

.footer-tabs :deep(.terminal-tab-bar__actions) {
  padding: 0 8px;
  height: 100%;
  display: flex;
  align-items: center;
}

.footer-tabs :deep(.terminal-tab-bar__separator) {
  margin: 8px 4px;
  height: auto;
  background-color: var(--terminal-border);
}

.footer-left {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  position: relative;
}

/* Separator between left section and tabs - matches tab separators */
.footer-left::after {
  content: '';
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 1px;
  height: 1.5rem;
  background-color: var(--border-primary);
}

.terminal-toggle-btn {
  background: transparent;
  border: none;
  color: var(--terminal-text);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.terminal-toggle-btn:hover {
  background: var(--terminal-hover-bg);
  color: var(--terminal-text-hover);
}

.terminal-toggle-btn:active {
  background: var(--terminal-hover-bg);
  opacity: 0.7;
}

.terminal-toggle-btn svg {
  transition: transform 0.2s ease;
}

.footer-right {
  display: flex;
  align-items: center;
  padding: 0 16px;
  position: relative;
}

/* Separator before right section - matches tab separators */
.footer-right::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 1px;
  height: 1.5rem;
  background-color: var(--border-primary);
}

.audit-text {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.3px;
  font-family: var(--font-mono);
  opacity: 0.4;
}

.version-text {
  font-size: 11px;
  color: var(--terminal-text);
  font-family: var(--font-mono);
  opacity: 0.8;
}

/* Terminal Content */
.terminal-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  user-select: text; /* Allow text selection in terminal content */
  background: var(--terminal-bg);
}

/* Dark mode adjustments already handled above */

/* Animations */
@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

/* Platform-specific adjustments */
.platform-macos .global-terminal-footer {
  /* Account for macOS traffic lights if needed */
}

.platform-windows .global-terminal-footer {
  /* Windows-specific adjustments */
}

/* Responsive */
@media (max-width: 480px) {
  .version-text {
    display: none;
  }
}
</style>
