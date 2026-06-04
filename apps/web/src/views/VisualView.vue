<!--
/**
 * @fileoverview VisualView component for the Visual HAT mode.
 *
 * @description
 * Provides the main view for Visual mode with integrated AddressBar and
 * visual design tools. This view is dedicated to UI/UX design workflows.
 *
 * @example
 * ```vue
 * <template>
 *   <VisualView
 *     :address-value="addressValue"
 *     :breadcrumb-context="breadcrumbContext"
 *     :current-mode="'visual'"
 *     @execute="handleExecute"
 *     @update:address-value="handleAddressUpdate"
 *   />
 * </template>
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */
-->
<template>
  <div class="visual-view">
    <!-- Address Bar -->
    <div class="visual-addressbar-container">
      <slot name="address-bar" />
    </div>

    <!-- Visual Content Area -->
    <div class="visual-content">
      <div class="visual-placeholder">
        <h1 class="mode-title">Visual Mode</h1>
        <p class="mode-subtitle">Visual-to-Code Bridge</p>

        <div class="mode-description">
          <p>
            Welcome to <strong>Visual Mode</strong> - Hatcher's innovative
            visual design workspace. This mode bridges the gap between design
            and development, allowing you to create interfaces visually and
            generate clean, production-ready code.
          </p>

          <p>
            Design components, layouts, and entire interfaces with intuitive
            visual tools, then seamlessly integrate them into your codebase. No
            more manual translation from design to code.
          </p>
        </div>

        <div class="mode-cta">
          <p>
            <strong>Coming Soon:</strong> Visual component editor and
            design-to-code generation
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * VisualView does not require any props or state currently.
 * AddressBar is passed via slot from parent component.
 */
</script>

<style scoped>
.visual-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--bg-primary);
}

/* Address Bar Container */
.visual-addressbar-container {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-primary);
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0.02),
    transparent
  );
}

/* Visual Content Area */
.visual-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: auto;
}

/* Placeholder Content */
.visual-placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
}

.mode-title {
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 8px 0;
  color: var(--text-primary);
}

.mode-subtitle {
  font-size: 16px;
  font-weight: 500;
  margin: 0 0 32px 0;
  color: var(--text-secondary);
}

.mode-description {
  max-width: 600px;
  margin: 0 auto 32px auto;
  color: var(--text-secondary);
  line-height: 1.6;
}

.mode-description p {
  margin: 0 0 16px 0;
}

.mode-description strong {
  color: var(--text-primary);
}

.mode-cta {
  padding: 16px 24px;
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 8px;
  color: var(--text-secondary);
}

.mode-cta strong {
  color: var(--text-primary);
}
</style>
