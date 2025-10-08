<template>
  <aside class="sidebar" :style="{ width: `${width}px` }">
    <!-- Header del sidebar -->
    <div
      class="sidebar-header"
      :class="`platform-${platform}`"
      @dblclick="handleHeaderDoubleClick"
    >
      <slot name="sidebar-header">
        <div class="sidebar-title">Navigation</div>
      </slot>
    </div>

    <!-- Contenido del sidebar -->
    <div class="sidebar-content">
      <slot name="sidebar-content">
        <div class="sidebar-placeholder">
          <p>Sidebar content goes here</p>
        </div>
      </slot>
    </div>

    <!-- Resize handle -->
    <div
      class="resize-handle"
      :class="{ 'is-resizing': isResizing }"
      :style="{ cursor: resizeCursor || 'col-resize' }"
      title="Drag to resize sidebar"
      @mousedown="startResize"
    />
  </aside>
</template>

<script setup lang="ts">
/**
 * @fileoverview Sidebar component for application navigation and content organization.
 *
 * @description
 * A resizable sidebar component that supports platform-specific styling and behavior.
 * Provides slots for header and content sections with built-in resize functionality.
 *
 * @example
 * ```vue
 * <template>
 *   <Sidebar
 *     :width="250"
 *     :is-resizing="false"
 *     platform="macos"
 *     @start-resize="handleResize"
 *     @header-double-click="toggleCollapse"
 *   >
 *     <template #sidebar-header>
 *       <h2>Navigation</h2>
 *     </template>
 *     <template #sidebar-content>
 *       <nav><!-- Navigation items --></nav>
 *     </template>
 *   </Sidebar>
 * </template>
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

defineOptions({
  name: 'BaseSidebar',
})

/**
 * Props interface for the Sidebar component.
 *
 * @public
 * @since 1.0.0
 */
interface Props {
  /** Current width of the sidebar in pixels */
  width: number
  /** Whether the sidebar is currently being resized */
  isResizing: boolean
  /**
   * CSS cursor style for the resize handle
   * @defaultValue "col-resize"
   */
  resizeCursor?: string
  /**
   * Target platform for platform-specific styling
   * @defaultValue "linux"
   */
  platform?: 'macos' | 'windows' | 'linux'
}

/**
 * Events emitted by the Sidebar component.
 *
 * @public
 * @since 1.0.0
 */
interface Emits {
  /** Emitted when user starts resizing the sidebar */
  startResize: [event: MouseEvent]
  /** Emitted when user double-clicks the sidebar header */
  headerDoubleClick: []
}

withDefaults(defineProps<Props>(), {
  resizeCursor: 'col-resize',
  platform: 'linux',
})
const emit = defineEmits<Emits>()

/**
 * Initiates sidebar resize operation when user clicks the resize handle.
 *
 * @param event - The mouse event from the resize handle click
 *
 * @remarks
 * This function captures the mouse event and forwards it to parent components
 * to handle the actual resize logic. The sidebar itself is stateless.
 *
 * @example
 * ```vue
 * <Sidebar @start-resize="handleSidebarResize" />
 * ```
 *
 * @public
 * @since 1.0.0
 */
const startResize = (event: MouseEvent) => {
  emit('startResize', event)
}

/**
 * Handles double-click events on the sidebar header.
 *
 * @remarks
 * Typically used for toggling sidebar visibility or switching between
 * collapsed/expanded states. The actual behavior is handled by parent components.
 *
 * @example
 * ```vue
 * <Sidebar @header-double-click="toggleSidebarCollapse" />
 * ```
 *
 * @public
 * @since 1.0.0
 */
const handleHeaderDoubleClick = () => {
  emit('headerDoubleClick')
}
</script>

<style scoped>
.sidebar {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--bg-sidebar);
  border-right: 1px solid var(--border-sidebar);
  /* No transition for natural drag feel */
  min-width: var(--sidebar-min-width);
  max-width: var(--sidebar-max-width);
}

.sidebar-header {
  flex-shrink: 0;
  height: var(--header-height);
  background-color: var(--bg-sidebar-header);
  border-bottom: none;
  display: flex;
  align-items: center;
  padding: 0 16px;
  font-weight: 600;
  font-size: 13px;
  color: var(--text-primary);
  /* Enable window dragging */
  -webkit-app-region: drag;
  user-select: none;
  /* Enhanced shadow for better depth */
  box-shadow:
    0 1px 0 0 rgba(0, 0, 0, 0.08),
    inset 0 1px 0 0 rgba(255, 255, 255, 0.02);
  /* Subtle gradient for depth */
  background: linear-gradient(
    180deg,
    var(--bg-sidebar-header) 0%,
    color-mix(in srgb, var(--bg-sidebar-header) 97%, black) 100%
  );
  letter-spacing: -0.01em;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0;
  /* Subtle inner shadow for depth */
  box-shadow: inset 0 4px 8px -4px rgba(0, 0, 0, 0.1);
  /* Smooth scrolling */
  scroll-behavior: smooth;
}

.sidebar-placeholder {
  color: var(--text-secondary);
  font-size: 14px;
  text-align: center;
  padding: 32px 16px;
}

.sidebar-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

/* Resize handle - replicates terminal-resize-handle behavior */
.resize-handle {
  position: absolute;
  top: 0;
  right: 0;
  width: 8px;
  height: 100%;
  background: transparent;
  cursor: col-resize;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.15s ease;
}

.resize-handle:hover {
  background: color-mix(in srgb, var(--resize-handle-hover) 25%, transparent);
}

.resize-handle.is-resizing {
  background: color-mix(in srgb, var(--resize-handle-hover) 35%, transparent);
}

/* Enhanced resize handle line indicator */
.resize-handle::after {
  content: '';
  position: absolute;
  top: calc(50% + var(--header-height) / 2);
  right: 3px;
  transform: translateY(-50%);
  width: 2px;
  height: 32px;
  background: var(--resize-handle-color);
  border-radius: 1px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 0.8;
}

.resize-handle:hover::after {
  background: var(--resize-handle-hover);
  width: 2px;
  height: 48px;
  opacity: 1;
  box-shadow: 0 0 6px
    color-mix(in srgb, var(--resize-handle-hover) 20%, transparent);
}

.resize-handle.is-resizing::after {
  background: var(--resize-handle-hover);
  width: 2px;
  height: 48px;
  opacity: 1;
  box-shadow: 0 0 8px
    color-mix(in srgb, var(--resize-handle-hover) 30%, transparent);
}

/* Enhanced scrollbar styling for sidebar content */
.sidebar-content::-webkit-scrollbar {
  width: 8px;
}

.sidebar-content::-webkit-scrollbar-track {
  background: transparent;
  border-radius: 4px;
}

.sidebar-content::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--border-sidebar) 70%, transparent);
  border-radius: 4px;
  border: 1px solid color-mix(in srgb, var(--bg-sidebar) 90%, transparent);
  transition: background-color 0.2s ease;
}

.sidebar-content::-webkit-scrollbar-thumb:hover {
  background: color-mix(in srgb, var(--border-sidebar) 90%, transparent);
}

.sidebar-content::-webkit-scrollbar-thumb:active {
  background: var(--border-sidebar);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .sidebar {
    min-width: 250px;
  }

  .sidebar-content {
    padding: 12px;
  }

  .sidebar-header {
    padding: 0 12px;
  }
}
</style>
