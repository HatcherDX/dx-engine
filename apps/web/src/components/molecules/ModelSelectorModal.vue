<!--
/**
 * @fileoverview Model selector modal for switching AI providers.
 *
 * @description
 * Modal dialog that allows users to switch between available AI providers
 * like Claude Code. Displays available providers and their capabilities.
 *
 * @example
 * <ModelSelectorModal
 *   :visible="showModal"
 *   @close="showModal = false"
 *   @select="handleModelSelect"
 * />
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */
-->

<template>
  <div v-if="visible" class="modal-overlay" @click="handleOverlayClick">
    <div class="modal-container" @click.stop>
      <!-- Header -->
      <div class="modal-header">
        <h2 class="modal-title">Select AI Model</h2>
        <button class="close-button" aria-label="Close" @click="$emit('close')">
          <BaseIcon name="X" size="sm" />
        </button>
      </div>

      <!-- Content -->
      <div class="modal-content">
        <!-- Loading state -->
        <div v-if="isLoading" class="loading-state">
          <div class="spinner"></div>
          <p>Loading available models...</p>
        </div>

        <!-- Error state -->
        <div v-else-if="error" class="error-state">
          <BaseIcon name="AlertCircle" size="lg" />
          <p>{{ error }}</p>
        </div>

        <!-- Models list -->
        <div v-else class="models-list">
          <div
            v-for="provider in availableProviders"
            :key="provider"
            :class="['model-item', { selected: provider === currentProvider }]"
            @click="selectProvider(provider)"
          >
            <div class="model-info">
              <BaseIcon
                :name="getProviderIcon(provider)"
                size="md"
                class="model-icon"
              />
              <div class="model-details">
                <h3 class="model-name">{{ formatProviderName(provider) }}</h3>
                <p class="model-description">
                  {{ getProviderDescription(provider) }}
                </p>
              </div>
            </div>
            <div v-if="provider === currentProvider" class="selected-badge">
              <BaseIcon name="Check" size="sm" />
            </div>
          </div>

          <!-- Empty state -->
          <div v-if="availableProviders.length === 0" class="empty-state">
            <BaseIcon name="AlertCircle" size="lg" />
            <p>No AI providers available</p>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <BaseButton variant="ghost" @click="$emit('close')">
          Cancel
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import BaseIcon from '../atoms/BaseIcon.vue'
import BaseButton from '../atoms/BaseButton.vue'
import { useNotifications } from '../../composables/useNotifications'

/**
 * Component props.
 *
 * @public
 */
interface Props {
  /** Controls visibility of the modal */
  visible: boolean
}

/**
 * Component emits.
 *
 * @public
 */
interface Emits {
  /** Emitted when modal should close */
  (event: 'close'): void
  /** Emitted when a provider is selected */
  (event: 'select', provider: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { success, error: showError } = useNotifications()

// State
const isLoading = ref(false)
const error = ref<string | null>(null)
const availableProviders = ref<string[]>([])
const currentProvider = ref<string | null>(null)

/**
 * Load available AI providers from Electron.
 *
 * @remarks
 * Fetches list of available providers and detects current provider.
 *
 * @internal
 */
const loadProviders = async (): Promise<void> => {
  if (!window.electronAPI?.aiChat) {
    error.value = 'AI Chat API not available'
    return
  }

  isLoading.value = true
  error.value = null

  try {
    // Get available providers
    const providers = await window.electronAPI.aiChat.getAvailableProviders()
    availableProviders.value = providers

    // Set first provider as current (in real app, get from storage)
    if (providers.length > 0) {
      currentProvider.value = providers[0]
    }

    console.log('[ModelSelector] Loaded providers:', providers)
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : 'Failed to load providers'
    console.error('[ModelSelector] Error loading providers:', err)
  } finally {
    isLoading.value = false
  }
}

/**
 * Select an AI provider.
 *
 * @param provider - Provider name to select
 *
 * @remarks
 * Updates the default provider via IPC and notifies parent.
 *
 * @public
 */
const selectProvider = async (provider: string): Promise<void> => {
  if (!window.electronAPI?.aiChat) {
    showError('AI Chat API not available')
    return
  }

  try {
    console.log('[ModelSelector] Selecting provider:', provider)
    await window.electronAPI.aiChat.setDefaultProvider(provider)

    currentProvider.value = provider
    success(`Switched to ${formatProviderName(provider)}`)

    emit('select', provider)
    emit('close')
  } catch (err) {
    showError(err instanceof Error ? err.message : 'Failed to switch provider')
    console.error('[ModelSelector] Error selecting provider:', err)
  }
}

/**
 * Get icon name for provider.
 *
 * @param provider - Provider name
 * @returns Icon name for BaseIcon component
 *
 * @private
 */
const getProviderIcon = (provider: string): string => {
  const iconMap: Record<string, string> = {
    'Claude Code': 'Bot',
    Gemini: 'Sparkles',
    'GPT-5': 'Zap',
  }
  return iconMap[provider] || 'Bot'
}

/**
 * Format provider name for display.
 *
 * @param provider - Provider name
 * @returns Formatted display name
 *
 * @private
 */
const formatProviderName = (provider: string): string => {
  return provider.replace(/\s+(CLI|Api|API)$/i, '')
}

/**
 * Get provider description.
 *
 * @param provider - Provider name
 * @returns Description text
 *
 * @private
 */
const getProviderDescription = (provider: string): string => {
  const descriptions: Record<string, string> = {
    'Claude Code': 'Anthropic Claude - Advanced reasoning and coding',
    Gemini: 'Google Gemini - Multimodal AI assistant',
    'GPT-5': 'OpenAI GPT-5 - Next generation language model',
  }
  return descriptions[provider] || 'AI language model'
}

/**
 * Handle clicks on modal overlay.
 *
 * @remarks
 * Closes the modal when clicking outside the container.
 *
 * @private
 */
const handleOverlayClick = (): void => {
  emit('close')
}

/**
 * Watch visibility changes to load providers.
 *
 * @remarks
 * Loads providers when modal becomes visible.
 *
 * @private
 */
watch(
  () => props.visible,
  (newVisible) => {
    if (newVisible) {
      loadProviders()
    }
  }
)

// Load providers on mount if visible
onMounted(() => {
  if (props.visible) {
    loadProviders()
  }
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(4px);
}

.modal-container {
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  width: 500px;
  max-width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.close-button {
  background: transparent;
  border: none;
  padding: 8px;
  cursor: pointer;
  color: var(--text-secondary);
  border-radius: 6px;
  transition: all var(--transition-fast);
}

.close-button:hover {
  background-color: var(--hover-bg-light);
  color: var(--text-primary);
}

.dark .close-button:hover {
  background-color: var(--hover-bg-dark);
}

.modal-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  color: var(--text-secondary);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border-color);
  border-top-color: var(--accent-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-state,
.empty-state {
  gap: 12px;
}

.models-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.model-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all var(--transition-fast);
  background-color: var(--bg-secondary);
}

.model-item:hover {
  border-color: var(--accent-primary);
  background-color: var(--hover-bg-light);
}

.dark .model-item:hover {
  background-color: var(--hover-bg-dark);
}

.model-item.selected {
  border-color: var(--accent-primary);
  background-color: rgba(14, 165, 233, 0.1);
}

.model-info {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
}

.model-icon {
  color: var(--accent-primary);
  flex-shrink: 0;
}

.model-details {
  flex: 1;
}

.model-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 4px 0;
}

.model-description {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.4;
}

.selected-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: var(--accent-primary);
  color: white;
  flex-shrink: 0;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
  gap: 12px;
}
</style>
