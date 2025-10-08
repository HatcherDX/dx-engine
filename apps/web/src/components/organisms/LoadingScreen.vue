<template>
  <div class="loading-screen">
    <!-- Simulated Generative Mode Layout -->
    <div class="generative-skeleton">
      <!-- Header Bar -->
      <div class="skeleton-header">
        <div class="skeleton-header-left">
          <div class="skeleton-item skeleton-breadcrumb"></div>
        </div>
        <div class="skeleton-header-center">
          <div class="skeleton-item skeleton-mode-selector"></div>
        </div>
        <div class="skeleton-header-right">
          <div class="skeleton-item skeleton-controls"></div>
        </div>
      </div>

      <!-- Main Content Area -->
      <div class="skeleton-body">
        <!-- Left Sidebar (GenerativeSidebar - standard width) -->
        <div class="skeleton-sidebar">
          <div class="skeleton-sidebar-header">
            <div class="skeleton-item skeleton-play-button"></div>
          </div>
          <div class="skeleton-sidebar-tabs">
            <div class="skeleton-item skeleton-tab-button"></div>
            <div class="skeleton-item skeleton-tab-button"></div>
          </div>
          <div class="skeleton-sidebar-content">
            <div class="skeleton-item skeleton-search-bar"></div>
            <div class="skeleton-item skeleton-list-item"></div>
            <div class="skeleton-item skeleton-list-item"></div>
            <div class="skeleton-item skeleton-list-item"></div>
          </div>
        </div>

        <!-- Main Content (Generative Mode welcome) -->
        <div class="skeleton-main-content">
          <div class="skeleton-content-wrapper">
            <div class="skeleton-item skeleton-title"></div>
            <div class="skeleton-item skeleton-subtitle"></div>
            <div class="skeleton-content-blocks">
              <div class="skeleton-item skeleton-paragraph"></div>
              <div class="skeleton-item skeleton-paragraph"></div>
            </div>
            <div class="skeleton-cta-box">
              <div class="skeleton-item skeleton-cta-text"></div>
              <div class="skeleton-item skeleton-cta-hint"></div>
            </div>
          </div>
        </div>

        <!-- Right Chat Panel -->
        <div class="skeleton-chat-panel">
          <!-- Chat content centered -->
          <div class="skeleton-chat-content">
            <div class="skeleton-chat-centered">
              <div class="skeleton-greeting">
                <span class="skeleton-item skeleton-hello-text"></span>
                <span class="skeleton-item skeleton-hatcher-text"></span>
              </div>
            </div>
          </div>

          <!-- Chat input at bottom -->
          <div class="skeleton-chat-input">
            <div class="skeleton-input-wrapper">
              <div class="skeleton-item skeleton-input-icon"></div>
              <div class="skeleton-item skeleton-input-field"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * LoadingScreen component that displays while the app determines initial state
 *
 * @remarks
 * Shows a skeleton layout that mimics the IDE structure to provide
 * a smooth transition when the actual content loads
 *
 * @public
 * @since 1.0.0
 */
</script>

<style scoped>
.loading-screen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--bg-primary);
  z-index: 9999;
  overflow: hidden;
}

.generative-skeleton {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* Header */
.skeleton-header {
  height: 48px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-primary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
}

.skeleton-header-left,
.skeleton-header-center,
.skeleton-header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.skeleton-header-center {
  flex: 1;
  justify-content: center;
}

/* Body Layout - Generative Mode Style */
.skeleton-body {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
}

/* Left Sidebar - Standard GenerativeSidebar */
.skeleton-sidebar {
  width: 280px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-primary);
  display: flex;
  flex-direction: column;
}

.skeleton-sidebar-header {
  height: 48px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-primary);
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.skeleton-play-button {
  width: 32px;
  height: 32px;
  border-radius: 6px;
}

.skeleton-sidebar-tabs {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-primary);
}

.skeleton-tab-button {
  flex: 1;
  height: 32px;
  border-radius: 6px;
}

.skeleton-sidebar-content {
  flex: 1;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skeleton-search-bar {
  width: 100%;
  height: 36px;
  border-radius: 8px;
}

.skeleton-list-item {
  width: 100%;
  height: 60px;
  border-radius: 8px;
}

/* Main Content Area */
.skeleton-main-content {
  flex: 1;
  background: var(--bg-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 32px;
}

.skeleton-content-wrapper {
  max-width: 800px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 24px;
  align-items: center;
}

.skeleton-title {
  width: 280px;
  height: 48px;
  border-radius: 8px;
  opacity: 0.8;
}

.skeleton-subtitle {
  width: 380px;
  height: 24px;
  border-radius: 6px;
  opacity: 0.6;
}

.skeleton-content-blocks {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 24px;
}

.skeleton-paragraph {
  width: 100%;
  height: 80px;
  border-radius: 8px;
  opacity: 0.4;
}

.skeleton-cta-box {
  width: 100%;
  padding: 24px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 12px;
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}

.skeleton-cta-text {
  width: 300px;
  height: 20px;
  border-radius: 4px;
  opacity: 0.6;
}

.skeleton-cta-hint {
  width: 420px;
  height: 16px;
  border-radius: 4px;
  opacity: 0.4;
}

/* Right Chat Panel */
.skeleton-chat-panel {
  width: 400px;
  background: var(--bg-primary);
  border-left: 1px solid var(--border-primary);
  display: flex;
  flex-direction: column;
  padding-left: 48px;
}

.skeleton-chat-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 32px;
}

.skeleton-chat-centered {
  text-align: center;
}

.skeleton-greeting {
  display: flex;
  gap: 12px;
  align-items: baseline;
  justify-content: center;
}

.skeleton-hello-text {
  display: inline-block;
  width: 80px;
  height: 32px;
  border-radius: 6px;
  opacity: 0.5;
}

.skeleton-hatcher-text {
  display: inline-block;
  width: 100px;
  height: 32px;
  border-radius: 6px;
  opacity: 0.7;
  background: var(--accent-primary-alpha-10);
}

/* Chat Input Area */
.skeleton-chat-input {
  flex-shrink: 0;
  padding: 24px 32px;
}

.skeleton-input-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background: var(--bg-primary);
  border: 2px solid var(--border-primary);
  border-radius: 24px;
  max-width: 336px;
}

.skeleton-input-icon {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  opacity: 0.5;
}

.skeleton-input-field {
  flex: 1;
  height: 20px;
  border-radius: 4px;
  opacity: 0.3;
}

/* Skeleton Items */
.skeleton-item {
  background: var(--bg-tertiary);
  border-radius: 4px;
  position: relative;
  overflow: hidden;
  animation: skeleton-shimmer 2s ease-in-out infinite;
}

.skeleton-item::after {
  content: '';
  position: absolute;
  top: 0;
  left: -200%;
  width: 200%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.03),
    transparent
  );
  animation: skeleton-wave 2s ease-in-out infinite;
}

/* Specific skeleton item sizes */
.skeleton-breadcrumb {
  width: 180px;
  height: 24px;
  opacity: 0.4;
}

.skeleton-mode-selector {
  width: 240px;
  height: 32px;
  opacity: 0.5;
}

.skeleton-controls {
  width: 120px;
  height: 24px;
  opacity: 0.4;
}

/* Animations */
@keyframes skeleton-shimmer {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}

@keyframes skeleton-wave {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(200%);
  }
}

/* Fade out animation for when loading completes */
.loading-screen-fade-leave-active {
  transition: opacity 0.4s ease-out;
}

.loading-screen-fade-leave-to {
  opacity: 0;
}

/* Responsive adjustments */
@media (max-width: 1200px) {
  .skeleton-sidebar {
    width: 250px;
  }

  .skeleton-chat-panel {
    width: 350px;
  }
}

@media (max-width: 768px) {
  .skeleton-sidebar {
    width: 200px;
  }

  .skeleton-chat-panel {
    width: 300px;
  }

  .skeleton-main-content {
    padding: 24px 16px;
  }
}
</style>
