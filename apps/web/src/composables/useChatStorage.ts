/**
 * @fileoverview Chat storage composable for conversation persistence without Pinia.
 *
 * @description
 * Direct storage API integration for chat sessions and messages using project+branch keys.
 * Provides reactive state management using Vue refs without intermediate state stores.
 *
 * @example
 * ```typescript
 * const {
 *   currentSession,
 *   messages,
 *   loadOrCreateSession,
 *   addMessage,
 *   clearSession
 * } = useChatStorage()
 *
 * await loadOrCreateSession('project-id', 'main')
 * await addMessage('user', 'Hello!')
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { ref, computed, type Ref, type ComputedRef } from 'vue'
import type {
  ConversationSession,
  AIMessage,
} from '@hatcherdx/dx-engine-preload/storage'

/**
 * Chat metrics interface for session statistics.
 *
 * @public
 * @since 1.0.0
 */
export interface ChatMetrics {
  /** Total input tokens consumed */
  totalInputTokens: number
  /** Total output tokens generated */
  totalOutputTokens: number
  /** Total cost in USD */
  totalCost: number
  /** Average response latency in ms */
  averageLatency: number
  /** Total message count */
  messageCount: number
  /** Current context window usage percentage */
  contextUsage: number
}

/**
 * Chat storage composable for direct storage API access.
 *
 * @remarks
 * Provides reactive state management for chat sessions without Pinia.
 * Uses project+branch as composite key for session management.
 * All data persists through SecureStorageService via IPC.
 *
 * @returns Chat storage utilities and reactive state
 *
 * @example
 * ```typescript
 * const {
 *   currentSession,
 *   messages,
 *   metrics,
 *   isLoading,
 *   error,
 *   loadOrCreateSession,
 *   loadSessionByProject,
 *   addMessage,
 *   clearSession,
 *   deleteSession
 * } = useChatStorage()
 * ```
 *
 * @public
 * @since 1.0.0
 */
export function useChatStorage() {
  // Reactive state
  const currentSession: Ref<ConversationSession | null> = ref(null)
  const messages: Ref<AIMessage[]> = ref([])
  const isLoading = ref(false)
  const error: Ref<string | null> = ref(null)

  // Computed metrics from current session
  const metrics: ComputedRef<ChatMetrics> = computed(() => {
    if (!currentSession.value) {
      return {
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCost: 0,
        averageLatency: 0,
        messageCount: 0,
        contextUsage: 0,
      }
    }

    // Calculate metrics from messages
    let totalLatency = 0
    let latencyCount = 0
    let inputTokens = 0
    let outputTokens = 0
    let totalCost = 0

    messages.value.forEach((msg, index) => {
      // Extract detailed token counts from metadata if available
      if (msg.metadata && typeof msg.metadata === 'object') {
        const metadata = msg.metadata as Record<string, unknown>

        // Use metadata tokens if available (more accurate)
        const metaInputTokens = metadata.inputTokens
        const metaOutputTokens = metadata.outputTokens
        const metaCost = metadata.cost
        const latency = metadata.latency

        if (typeof metaInputTokens === 'number') {
          inputTokens += metaInputTokens
        }
        if (typeof metaOutputTokens === 'number') {
          outputTokens += metaOutputTokens
        }
        if (typeof metaCost === 'number') {
          totalCost += metaCost
        }
        if (typeof latency === 'number') {
          totalLatency += latency
          latencyCount++
        }

        console.log(
          `[useChatStorage] Message ${index + 1} (${msg.type}): input=${metaInputTokens}, output=${metaOutputTokens}, cost=${metaCost}`
        )
      } else if (msg.tokenCount) {
        // Fallback: use tokenCount (less accurate, treats all as input/output based on type)
        if (msg.type === 'user') {
          inputTokens += msg.tokenCount
        } else if (msg.type === 'assistant') {
          outputTokens += msg.tokenCount
        }
        console.log(
          `[useChatStorage] Message ${index + 1} (${msg.type}): tokenCount=${msg.tokenCount} (no metadata)`
        )
      }
    })

    console.log(
      '[useChatStorage] Totals:',
      `input=${inputTokens}, output=${outputTokens}, cost=${totalCost.toFixed(4)}`
    )

    return {
      totalInputTokens: inputTokens,
      totalOutputTokens: outputTokens,
      totalCost: totalCost || currentSession.value.totalCost,
      averageLatency: latencyCount > 0 ? totalLatency / latencyCount : 0,
      messageCount: currentSession.value.messageCount,
      contextUsage: Math.min(
        100,
        ((inputTokens + outputTokens) / 200000) * 100 // Assuming 200k context window
      ),
    }
  })

  /**
   * Load or create a session for project+branch.
   *
   * @param projectPath - Project path
   * @param branch - Git branch name
   * @param model - AI model (default: claude-sonnet-4-5 base version)
   * @param provider - AI provider (default: anthropic)
   * @returns Promise resolving when session is loaded/created
   *
   * @remarks
   * Model comparison uses base version (without build date) to handle
   * version bumps gracefully. Full model string (with build date) is
   * preserved in storage for tracking purposes.
   *
   * @example
   * ```typescript
   * await loadOrCreateSession('/home/user/project', 'main')
   * ```
   *
   * @public
   */
  async function loadOrCreateSession(
    projectPath: string,
    branch: string,
    model = 'claude-sonnet-4-5', // Base version without build date
    provider = 'anthropic'
  ): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      // Create project ID from path+branch
      const projectId = `${projectPath}:${branch}`

      // Try to get existing sessions for this project+branch
      console.log(
        '[useChatStorage] Querying sessions for projectId:',
        projectId
      )
      const sessions = await window.storageAPI.getConversationSessions(
        projectId,
        1
      )
      console.log('[useChatStorage] Found', sessions.length, 'sessions')

      if (sessions.length > 0) {
        // Use most recent session
        currentSession.value = sessions[0]
        console.log('[useChatStorage] Loaded existing session:', {
          id: sessions[0].id,
          model: sessions[0].model,
          provider: sessions[0].provider,
          messageCount: sessions[0].messageCount,
        })

        // Auto-migrate: update session model if base version changed
        // Compare base version (without build date) to handle version bumps
        const sessionModelBase = sessions[0].model.replace(/-\d{8}$/, '') // Remove YYYYMMDD
        const currentModelBase = model.replace(/-\d{8}$/, '') // Remove YYYYMMDD

        if (sessionModelBase !== currentModelBase) {
          console.warn(
            `[useChatStorage] ⚠️ Session has outdated model base: ${sessions[0].model} (base: ${sessionModelBase}), updating to: ${model} (base: ${currentModelBase})`
          )
          await window.storageAPI.updateConversationSession(sessions[0].id, {
            model,
            provider,
          })
          // Update local reference
          currentSession.value.model = model
          currentSession.value.provider = provider
          console.log(
            '[useChatStorage] ✅ Session model updated to:',
            model,
            'provider:',
            provider
          )
        } else if (sessions[0].model !== model) {
          // Same base version but different build date - update silently
          console.log(
            `[useChatStorage] 🔄 Updating model build date: ${sessions[0].model} → ${model}`
          )
          await window.storageAPI.updateConversationSession(sessions[0].id, {
            model,
            provider,
          })
          currentSession.value.model = model
          currentSession.value.provider = provider
        }

        // Load messages for this session
        const sessionMessages = await window.storageAPI.getMessages(
          sessions[0].id
        )
        console.log(
          '[useChatStorage] Loaded',
          sessionMessages.length,
          'messages from session'
        )
        messages.value = sessionMessages
      } else {
        // Create new session
        console.log(
          '[useChatStorage] Creating new session with model:',
          model,
          'provider:',
          provider
        )
        const newSession = await window.storageAPI.createConversationSession(
          projectId,
          provider,
          model
        )
        console.log('[useChatStorage] New session created:', newSession)
        console.log(
          '[useChatStorage] New session projectId:',
          newSession.projectId
        )
        console.log(
          '[useChatStorage] New session model:',
          newSession.model,
          'provider:',
          newSession.provider
        )
        currentSession.value = newSession
        messages.value = []
      }
    } catch (err) {
      console.error('[useChatStorage] Failed to load/create session:', err)
      error.value = err instanceof Error ? err.message : 'Unknown error'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Load all sessions for a project (across all branches).
   *
   * @param projectPath - Project path
   * @returns Promise resolving to array of sessions
   *
   * @example
   * ```typescript
   * const sessions = await loadSessionsByProject('/home/user/project')
   * console.log(`Found ${sessions.length} sessions across all branches`)
   * ```
   *
   * @public
   */
  async function loadSessionsByProject(
    projectPath: string
  ): Promise<ConversationSession[]> {
    isLoading.value = true
    error.value = null

    try {
      // Get all sessions that start with this project path
      // This is a simplified approach - in production, we'd need to
      // implement proper prefix matching in the storage service
      const allSessions: ConversationSession[] = []

      // For now, we'll need to check common branches
      const commonBranches = [
        'main',
        'master',
        'develop',
        'staging',
        'production',
      ]

      for (const branch of commonBranches) {
        const projectId = `${projectPath}:${branch}`
        try {
          const sessions =
            await window.storageAPI.getConversationSessions(projectId)
          allSessions.push(...sessions)
        } catch {
          // Branch might not have sessions
        }
      }

      return allSessions
    } catch (err) {
      console.error('[useChatStorage] Failed to load project sessions:', err)
      error.value = err instanceof Error ? err.message : 'Unknown error'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Add a message to the current session.
   *
   * @param type - Message type (user/assistant/system)
   * @param content - Message content
   * @param tokenCount - Optional token count
   * @param metadata - Optional metadata
   * @returns Promise resolving to the created message
   *
   * @example
   * ```typescript
   * const message = await addMessage('user', 'Hello AI!')
   * console.log('Message saved:', message.id)
   * ```
   *
   * @public
   */
  async function addMessage(
    type: 'user' | 'assistant' | 'system',
    content: string,
    tokenCount?: number,
    metadata?: Record<string, unknown>
  ): Promise<AIMessage> {
    if (!currentSession.value) {
      throw new Error('No active session. Load or create a session first.')
    }

    isLoading.value = true
    error.value = null

    try {
      // Use branchId directly from session
      const branchId = currentSession.value.branchId

      console.log(
        '[useChatStorage] Adding message with session model:',
        currentSession.value.model,
        'provider:',
        currentSession.value.provider,
        'branchId:',
        branchId,
        'projectId:',
        currentSession.value.projectId
      )

      const message = await window.storageAPI.addMessage({
        sessionId: currentSession.value.id,
        branchId,
        type,
        content,
        timestamp: new Date(),
        provider: currentSession.value.provider,
        model: currentSession.value.model,
        tokenCount,
        metadata,
      })

      console.log(
        '[useChatStorage] Message saved with model:',
        message.model,
        'provider:',
        message.provider,
        'branchId:',
        message.branchId
      )

      // Add to local messages array
      messages.value.push(message)

      // Update session counters locally
      currentSession.value.messageCount++
      currentSession.value.lastMessageAt = new Date()
      if (tokenCount) {
        currentSession.value.totalTokens += tokenCount
      }

      // Persist session counter updates to database
      await window.storageAPI.updateConversationSession(
        currentSession.value.id,
        {
          messageCount: currentSession.value.messageCount,
          lastMessageAt: currentSession.value.lastMessageAt,
          totalTokens: currentSession.value.totalTokens,
        }
      )

      return message
    } catch (err) {
      console.error('[useChatStorage] Failed to add message:', err)
      error.value = err instanceof Error ? err.message : 'Unknown error'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Clear the current session (keeps in history).
   *
   * @returns Promise resolving when session is cleared
   *
   * @example
   * ```typescript
   * await clearSession()
   * console.log('Session cleared, ready for new conversation')
   * ```
   *
   * @public
   */
  async function clearSession(): Promise<void> {
    currentSession.value = null
    messages.value = []
    error.value = null
  }

  /**
   * Delete a session permanently.
   *
   * @param sessionId - Session ID to delete (defaults to current)
   * @returns Promise resolving when session is deleted
   *
   * @example
   * ```typescript
   * await deleteSession() // Delete current session
   * await deleteSession('session-123') // Delete specific session
   * ```
   *
   * @public
   */
  async function deleteSession(sessionId?: string): Promise<void> {
    const idToDelete = sessionId || currentSession.value?.id
    if (!idToDelete) {
      throw new Error('No session to delete')
    }

    isLoading.value = true
    error.value = null

    try {
      await window.storageAPI.deleteConversationSession(idToDelete)

      // Clear current session if it was deleted
      if (currentSession.value?.id === idToDelete) {
        currentSession.value = null
        messages.value = []
      }
    } catch (err) {
      console.error('[useChatStorage] Failed to delete session:', err)
      error.value = err instanceof Error ? err.message : 'Unknown error'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Export current session as JSON.
   *
   * @returns Promise resolving to JSON string
   *
   * @example
   * ```typescript
   * const json = await exportSession()
   * const blob = new Blob([json], { type: 'application/json' })
   * // Download blob...
   * ```
   *
   * @public
   */
  async function exportSession(): Promise<string> {
    if (!currentSession.value || messages.value.length === 0) {
      return JSON.stringify({ session: null, messages: [] })
    }

    return JSON.stringify(
      {
        session: currentSession.value,
        messages: messages.value,
      },
      null,
      2
    )
  }

  return {
    // State
    currentSession,
    messages,
    metrics,
    isLoading,
    error,

    // Actions
    loadOrCreateSession,
    loadSessionsByProject,
    addMessage,
    clearSession,
    deleteSession,
    exportSession,
  }
}
