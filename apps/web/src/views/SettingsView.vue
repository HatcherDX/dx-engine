<template>
  <div class="settings-view">
    <div class="settings-container">
      <!-- Header -->
      <div class="settings-header">
        <button
          class="close-button"
          aria-label="Close settings"
          @click="$emit('close')"
        >
          <BaseIcon name="X" size="md" />
        </button>
        <h1 class="settings-title">Settings</h1>
      </div>

      <!-- Settings Content -->
      <div class="settings-content">
        <!-- Theme Section -->
        <section class="settings-section">
          <h2 class="section-title">Appearance</h2>
          <div class="section-description">
            Choose how Hatcher DX Engine looks to you. Select a theme or use
            system settings.
          </div>

          <div class="theme-options">
            <button
              class="theme-option"
              :class="{ active: themeMode === 'auto' }"
              @click="setTheme('auto')"
            >
              <div class="option-icon">
                <BaseIcon name="Settings" size="lg" />
              </div>
              <div class="option-content">
                <div class="option-title">Auto</div>
                <div class="option-description">Use system settings</div>
              </div>
              <div v-if="themeMode === 'auto'" class="option-indicator">
                <BaseIcon name="Check" size="sm" />
              </div>
            </button>

            <button
              class="theme-option"
              :class="{ active: themeMode === 'light' }"
              @click="setTheme('light')"
            >
              <div class="option-icon">
                <BaseIcon name="Sun" size="lg" />
              </div>
              <div class="option-content">
                <div class="option-title">Light</div>
                <div class="option-description">Light theme</div>
              </div>
              <div v-if="themeMode === 'light'" class="option-indicator">
                <BaseIcon name="Check" size="sm" />
              </div>
            </button>

            <button
              class="theme-option"
              :class="{ active: themeMode === 'dark' }"
              @click="setTheme('dark')"
            >
              <div class="option-icon">
                <BaseIcon name="Moon" size="lg" />
              </div>
              <div class="option-content">
                <div class="option-title">Dark</div>
                <div class="option-description">Dark theme</div>
              </div>
              <div v-if="themeMode === 'dark'" class="option-indicator">
                <BaseIcon name="Check" size="sm" />
              </div>
            </button>
          </div>
        </section>

        <!-- Preview Section -->
        <section class="settings-section">
          <div class="preview-label">Preview</div>
          <div class="theme-preview">
            <div class="preview-window">
              <div class="preview-header">
                <div class="preview-controls">
                  <span class="preview-dot" style="background: #ff5f57"></span>
                  <span class="preview-dot" style="background: #ffbd2e"></span>
                  <span class="preview-dot" style="background: #28ca42"></span>
                </div>
                <span class="preview-title">Hatcher DX Engine</span>
              </div>
              <div class="preview-content">
                <div class="preview-sidebar"></div>
                <div class="preview-main">
                  <div class="preview-line"></div>
                  <div class="preview-line short"></div>
                  <div class="preview-line"></div>
                  <div class="preview-line medium"></div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTheme } from '../composables/useTheme'
import BaseIcon from '../components/atoms/BaseIcon.vue'

// Define emits
defineEmits<{
  close: []
}>()

// Theme management
const { themeMode, setTheme } = useTheme()
</script>

<style scoped>
.settings-view {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  height: 100vh;
  overflow-y: auto;
  background: var(--bg-primary);
  display: flex;
  justify-content: center;
  padding: 40px 20px;
  z-index: 9999;
}

.settings-container {
  width: 100%;
  max-width: 800px;
}

/* Header */
.settings-header {
  position: relative;
  margin-bottom: 40px;
  text-align: center;
}

.close-button {
  position: absolute;
  top: 0;
  right: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.close-button:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.settings-title {
  font-size: 32px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: -0.5px;
}

/* Content */
.settings-content {
  display: flex;
  flex-direction: column;
  gap: 48px;
}

/* Sections */
.settings-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.section-description {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.5;
}

/* Theme Options */
.theme-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.theme-option {
  position: relative;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: var(--bg-secondary);
  border: 2px solid var(--border-primary);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.theme-option:hover {
  background: var(--bg-tertiary);
  border-color: var(--border-secondary);
  transform: translateY(-1px);
}

.theme-option.active {
  background: var(--bg-tertiary);
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 1px var(--accent-primary);
}

.option-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
  border-radius: 8px;
  color: var(--text-secondary);
}

.theme-option.active .option-icon {
  background: var(--accent-primary);
  color: white;
}

.option-content {
  flex: 1;
  min-width: 0;
}

.option-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.option-description {
  font-size: 12px;
  color: var(--text-secondary);
}

.option-indicator {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-primary);
  color: white;
  border-radius: 50%;
}

/* Preview */
.preview-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: -8px;
}

.theme-preview {
  padding: 20px;
  background: var(--bg-secondary);
  border-radius: 12px;
  border: 1px solid var(--border-primary);
}

.preview-window {
  background: var(--bg-primary);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.preview-header {
  height: 32px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-primary);
  display: flex;
  align-items: center;
  padding: 0 12px;
  gap: 8px;
}

.preview-controls {
  display: flex;
  gap: 8px;
}

.preview-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.preview-title {
  flex: 1;
  text-align: center;
  font-size: 12px;
  color: var(--text-secondary);
  margin-right: 60px; /* Balance the controls */
}

.preview-content {
  display: flex;
  height: 200px;
}

.preview-sidebar {
  width: 80px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-primary);
}

.preview-main {
  flex: 1;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.preview-line {
  height: 12px;
  background: var(--bg-tertiary);
  border-radius: 4px;
  width: 100%;
}

.preview-line.short {
  width: 60%;
}

.preview-line.medium {
  width: 80%;
}

/* Dark mode adjustments */
.dark .preview-window {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
}

/* Responsive */
@media (max-width: 640px) {
  .settings-view {
    padding: 20px;
  }

  .settings-title {
    font-size: 24px;
  }

  .theme-options {
    grid-template-columns: 1fr;
  }
}
</style>
