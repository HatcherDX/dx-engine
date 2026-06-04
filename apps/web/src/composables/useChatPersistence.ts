/**
 * @fileoverview Vue composable for chat persistence with project+branch key.
 *
 * @description
 * Provides reactive hooks for managing chat session persistence.
 * Automatically loads and saves chat history based on project and branch context.
 * Uses direct storage API without Pinia for secure storage.
 *
 * @example
 * ```typescript
 * const { loadSession, saveMessage, messages } = useChatPersistence()
 * await loadSession()
 * await saveMessage(message)
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { computed, onMounted, watch } from 'vue'
import { useChatStorage } from './useChatStorage'
import { useWorkspace } from './useWorkspace'
import { useProjectContext } from './useProjectContext'

/**
 * Chat persistence composable with automatic project+branch scoping.
 *
 * @remarks
 * Automatically manages chat session loading and persistence based on
 * the current project path and git branch. Restores history on mount.
 *
 * @returns Chat persistence utilities and reactive state
 *
 * @example
 * ```typescript
 * // In ChatPanel.vue
 * const {
 *   messages,
 *   metrics,
 *   isLoading,
 *   saveMessage,
 *   clearHistory
 * } = useChatPersistence()
 *
 * // Messages are automatically loaded on mount
 * // and saved when added
 * ```
 *
 * @public
 */
export function useChatPersistence() {
  const {
    currentSession,
    messages,
    metrics,
    isLoading,
    error,
    loadOrCreateSession,
    addMessage,
    clearSession,
    exportSession,
  } = useChatStorage()

  const { currentProjectPath, currentBranch } = useWorkspace()

  const { openedProject } = useProjectContext()

  // Reactive state
  const hasSession = computed(() => currentSession.value !== null)

  // Track if initial load is complete to prevent duplicate loads
  let initialLoadComplete = false

  /**
   * Load or create session for current project+branch.
   *
   * @param model - AI model to use (default: latest Sonnet from system)
   * @param provider - AI provider (default: 'anthropic')
   * @returns Promise resolving when session is loaded
   *
   * @remarks
   * The default model will use whatever version is currently available
   * in the system. The build date suffix will be preserved in storage
   * but comparisons only check the base version (e.g., 'claude-sonnet-4-5').
   *
   * @public
   */
  async function loadSession(
    model = 'claude-sonnet-4-5', // Base version without build date
    provider = 'anthropic'
  ): Promise<void> {
    // Prevent concurrent loads
    if (isLoading.value) {
      console.log(
        '[useChatPersistence] Load already in progress, skipping duplicate'
      )
      return
    }

    // Get current project from openedProject context or workspace
    const projectPath =
      openedProject.value?.rootPath || currentProjectPath.value

    // Get current branch from workspace
    const branch = currentBranch.value || 'main'

    if (!projectPath) {
      console.warn('[useChatPersistence] No project path available')
      return
    }

    console.log('[useChatPersistence] Loading session for', projectPath, branch)

    // Load or create session
    await loadOrCreateSession(projectPath, branch, model, provider)

    initialLoadComplete = true
  }

  /**
   * Save a message to the current session.
   *
   * @param role - Message role (user/assistant/system)
   * @param content - Message content
   * @param metrics - Optional message metrics
   * @returns Promise resolving when message is saved
   *
   * @example
   * ```typescript
   * await saveMessage('user', 'Hello!', {
   *   inputTokens: 10,
   *   outputTokens: 0,
   *   cost: 0.0001,
   *   latency: 100
   * })
   * ```
   *
   * @public
   */
  async function saveMessage(
    role: 'user' | 'assistant' | 'system',
    content: string,
    metrics?: {
      inputTokens?: number
      outputTokens?: number
      cost?: number
      latency?: number
      contextUsage?: number
    }
  ): Promise<void> {
    // Ensure session is loaded first
    if (!currentSession.value) {
      console.warn('[useChatPersistence] No session active, loading session...')
      await loadSession()
    }

    // Convert metrics to token count and metadata
    const tokenCount =
      (metrics?.inputTokens || 0) + (metrics?.outputTokens || 0)
    const metadata = metrics ? { ...metrics } : undefined

    await addMessage(role, content, tokenCount, metadata)
  }

  /**
   * Save a user message.
   *
   * @param content - Message content
   * @returns Promise resolving when message is saved
   *
   * @public
   */
  async function saveUserMessage(content: string): Promise<void> {
    await saveMessage('user', content)
  }

  /**
   * Save an assistant message with metrics.
   *
   * @param content - Message content
   * @param inputTokens - Input tokens used
   * @param outputTokens - Output tokens generated
   * @param cost - Cost in USD
   * @param latency - Response latency in ms
   * @param contextUsage - Context usage percentage
   * @returns Promise resolving when message is saved
   *
   * @public
   */
  async function saveAssistantMessage(
    content: string,
    inputTokens?: number,
    outputTokens?: number,
    cost?: number,
    latency?: number,
    contextUsage?: number
  ): Promise<void> {
    await saveMessage('assistant', content, {
      inputTokens,
      outputTokens,
      cost,
      latency,
      contextUsage,
    })
  }

  /**
   * Clear the current session history.
   *
   * @returns Promise resolving when history is cleared
   *
   * @public
   */
  async function clearHistory(): Promise<void> {
    await clearSession()
  }

  // Auto-load session on mount
  onMounted(async () => {
    await loadSession()
  })

  // Watch for project/branch changes (but not on initial mount)
  watch(
    [
      () => openedProject.value?.rootPath,
      () => currentProjectPath.value,
      () => currentBranch.value,
    ],
    async (
      [newOpenedProject, newProject, newBranch],
      [oldOpenedProject, oldProject, oldBranch]
    ) => {
      // Skip if initial load hasn't completed yet (onMounted handles it)
      if (!initialLoadComplete) {
        console.log(
          '[useChatPersistence] Skipping watch trigger during initial mount'
        )
        return
      }

      // Get the actual project path
      const actualProjectPath = newOpenedProject || newProject
      const previousProjectPath = oldOpenedProject || oldProject

      // Only reload if actually changed
      if (
        actualProjectPath !== previousProjectPath ||
        newBranch !== oldBranch
      ) {
        console.log(
          '[useChatPersistence] Project/branch changed, reloading session'
        )
        if (actualProjectPath) {
          await loadSession()
        }
      }
    }
  )

  return {
    // State
    messages,
    metrics,
    isLoading,
    error,
    hasSession,

    // Actions
    loadSession,
    saveMessage,
    saveUserMessage,
    saveAssistantMessage,
    clearHistory,
    exportSession,
  }
}
