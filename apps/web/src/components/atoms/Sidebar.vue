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

    <!-- Footer del sidebar -->
    <div class="sidebar-footer">
      <slot name="sidebar-footer">
        <div class="sidebar-status">Ready</div>
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
 * Provides slots for header, content, and footer sections with built-in resize functionality.
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
 *     <template #sidebar-footer>
 *       <div>Status: Ready</div>
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
  border-bottom: 1px solid var(--border-sidebar);
  display: flex;
  align-items: center;
  padding: 0 16px;
  font-weight: 600;
  font-size: 14px;
  color: var(--text-primary);
  /* Enable window dragging */
  -webkit-app-region: drag;
  user-select: none;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0; /* Mode-specific components handle their own padding */
}

.sidebar-footer {
  flex-shrink: 0;
  background-color: var(--bg-sidebar-header);
  border-top: 1px solid var(--border-sidebar);
  padding: 8px 16px;
  font-size: 12px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  min-height: 32px;
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

.sidebar-status {
  font-size: 12px;
  color: var(--text-tertiary);
}

/* Resize handle */
.resize-handle {
  position: absolute;
  top: 0;
  right: 0;
  width: var(--resize-handle-width);
  height: 100%;
  background-color: transparent;
  cursor: col-resize;
  z-index: 100;
  transition: background-color var(--transition-fast);
}

.resize-handle:hover {
  background-color: var(--resize-handle-hover);
}

.resize-handle.is-resizing {
  background-color: var(--accent-primary);
}

/* Add a subtle visual hint for the resize area */
.resize-handle::before {
  content: '';
  position: absolute;
  top: 0;
  left: -2px;
  right: -2px;
  height: 100%;
  background-color: transparent;
}

.resize-handle:hover::before,
.resize-handle.is-resizing::before {
  background-color: var(--resize-handle-color);
  opacity: 0.3;
}

/* Scrollbar styling for sidebar content */
.sidebar-content::-webkit-scrollbar {
  width: 6px;
}

.sidebar-content::-webkit-scrollbar-track {
  background: var(--bg-sidebar);
}

.sidebar-content::-webkit-scrollbar-thumb {
  background: var(--border-sidebar);
  border-radius: 3px;
}

.sidebar-content::-webkit-scrollbar-thumb:hover {
  background: var(--text-tertiary);
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

  .sidebar-footer {
    padding: 6px 12px;
  }
}
</style>
