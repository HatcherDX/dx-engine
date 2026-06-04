<!--
/**
 * @fileoverview CodeView component for the Code HAT mode.
 *
 * @description
 * Provides the main view for Code mode with integrated AddressBar, file explorer,
 * and editor workspace. This view is dedicated to code editing workflows.
 *
 * @example
 * ```vue
 * <template>
 *   <CodeView
 *     :address-value="addressValue"
 *     :breadcrumb-context="breadcrumbContext"
 *     :current-mode="'code'"
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
  <div class="code-view">
    <!-- Address Bar -->
    <div class="code-addressbar-container">
      <slot name="address-bar" />
    </div>

    <!-- Code Content Area -->
    <div class="code-content">
      <div class="code-placeholder">
        <h1 class="mode-title">Code Mode</h1>
        <p class="mode-subtitle">Professional Code Editor</p>

        <div class="mode-description">
          <p>
            Welcome to <strong>Code Mode</strong> - your dedicated workspace for
            traditional code editing. This mode provides a familiar file-based
            development experience enhanced with Hatcher's intelligent features.
          </p>

          <p>
            Navigate your project structure, edit files with syntax highlighting
            and autocomplete, and leverage integrated Git workflows—all within a
            seamless development environment.
          </p>
        </div>

        <div class="mode-cta">
          <p>
            <strong>Coming Soon:</strong> Full-featured Monaco editor
            integration
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * CodeView does not require any props or state currently.
 * AddressBar is passed via slot from parent component.
 */
</script>

<style scoped>
.code-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--bg-primary);
}

/* Address Bar Container */
.code-addressbar-container {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-primary);
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0.02),
    transparent
  );
}

/* Code Content Area */
.code-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: auto;
}

/* Placeholder Content */
.code-placeholder {
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
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  color: var(--text-secondary);
}

.mode-cta strong {
  color: var(--text-primary);
}
</style>
