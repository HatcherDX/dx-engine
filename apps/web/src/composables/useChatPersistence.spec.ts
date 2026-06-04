/**
 * @fileoverview Unit tests for useChatPersistence composable.
 *
 * @description
 * Tests the chat persistence functionality with automatic session management
 * and project+branch key scoping.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @internal
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useChatPersistence } from './useChatPersistence'

// Mock the dependencies
vi.mock('./useChatStorage', () => ({
  useChatStorage: vi.fn(() => ({
    currentSession: { value: null },
    messages: { value: [] },
    metrics: { value: {} },
    isLoading: { value: false },
    error: { value: null },
    loadOrCreateSession: vi.fn(),
    addMessage: vi.fn(),
    clearSession: vi.fn(),
    exportSession: vi.fn(),
  })),
}))

vi.mock('./useWorkspace', () => ({
  useWorkspace: vi.fn(() => ({
    currentProjectPath: { value: '/test/project' },
    currentBranch: { value: 'main' },
  })),
}))

vi.mock('./useProjectContext', () => ({
  useProjectContext: vi.fn(() => ({
    openedProject: { value: { rootPath: '/test/project' } },
  })),
}))

describe('useChatPersistence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should auto-load session when saving message without active session', async () => {
    const { useChatStorage } = await import('./useChatStorage')
    const mockLoadOrCreateSession = vi.fn()
    const mockAddMessage = vi.fn()
    let sessionValue = null

    // Mock the implementation
    ;(useChatStorage as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      currentSession: {
        get value() {
          return sessionValue
        },
        set value(val) {
          sessionValue = val
        },
      },
      messages: { value: [] },
      metrics: { value: {} },
      isLoading: { value: false },
      error: { value: null },
      loadOrCreateSession: mockLoadOrCreateSession.mockImplementation(() => {
        sessionValue = { id: 'test-session', messageCount: 0 }
        return Promise.resolve()
      }),
      addMessage: mockAddMessage,
      clearSession: vi.fn(),
      exportSession: vi.fn(),
    })

    const { saveMessage } = useChatPersistence()

    // Initially no session
    expect(sessionValue).toBeNull()

    // Save a message - should auto-load session
    await saveMessage('user', 'Hello, test!')

    // Session should have been loaded with base version
    expect(mockLoadOrCreateSession).toHaveBeenCalledWith(
      '/test/project',
      'main',
      'claude-sonnet-4-5',
      'anthropic'
    )

    // Message should have been added
    expect(mockAddMessage).toHaveBeenCalledWith(
      'user',
      'Hello, test!',
      0,
      undefined
    )
  })

  it('should not reload session if already exists', async () => {
    const { useChatStorage } = await import('./useChatStorage')
    const mockLoadOrCreateSession = vi.fn()
    const mockAddMessage = vi.fn()

    // Mock with existing session
    ;(useChatStorage as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      currentSession: {
        value: { id: 'existing-session', messageCount: 5 },
      },
      messages: { value: [] },
      metrics: { value: {} },
      isLoading: { value: false },
      error: { value: null },
      loadOrCreateSession: mockLoadOrCreateSession,
      addMessage: mockAddMessage,
      clearSession: vi.fn(),
      exportSession: vi.fn(),
    })

    const { saveMessage } = useChatPersistence()

    // Save a message with existing session
    await saveMessage('assistant', 'Response text', {
      inputTokens: 10,
      outputTokens: 20,
      cost: 0.001,
      latency: 500,
      contextUsage: 15,
    })

    // Should NOT reload session
    expect(mockLoadOrCreateSession).not.toHaveBeenCalled()

    // Should add message with metrics
    expect(mockAddMessage).toHaveBeenCalledWith(
      'assistant',
      'Response text',
      30, // inputTokens + outputTokens
      {
        inputTokens: 10,
        outputTokens: 20,
        cost: 0.001,
        latency: 500,
        contextUsage: 15,
      }
    )
  })

  it('should handle saveUserMessage convenience method', async () => {
    const { useChatStorage } = await import('./useChatStorage')
    const mockAddMessage = vi.fn()

    ;(useChatStorage as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      currentSession: {
        value: { id: 'test-session', messageCount: 0 },
      },
      messages: { value: [] },
      metrics: { value: {} },
      isLoading: { value: false },
      error: { value: null },
      loadOrCreateSession: vi.fn(),
      addMessage: mockAddMessage,
      clearSession: vi.fn(),
      exportSession: vi.fn(),
    })

    const { saveUserMessage } = useChatPersistence()

    await saveUserMessage('User message test')

    expect(mockAddMessage).toHaveBeenCalledWith(
      'user',
      'User message test',
      0,
      undefined
    )
  })

  it('should handle saveAssistantMessage with metrics', async () => {
    const { useChatStorage } = await import('./useChatStorage')
    const mockAddMessage = vi.fn()

    ;(useChatStorage as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      currentSession: {
        value: { id: 'test-session', messageCount: 0 },
      },
      messages: { value: [] },
      metrics: { value: {} },
      isLoading: { value: false },
      error: { value: null },
      loadOrCreateSession: vi.fn(),
      addMessage: mockAddMessage,
      clearSession: vi.fn(),
      exportSession: vi.fn(),
    })

    const { saveAssistantMessage } = useChatPersistence()

    await saveAssistantMessage(
      'Assistant response',
      100, // inputTokens
      200, // outputTokens
      0.005, // cost
      1500, // latency
      25 // contextUsage
    )

    expect(mockAddMessage).toHaveBeenCalledWith(
      'assistant',
      'Assistant response',
      300, // total tokens
      {
        inputTokens: 100,
        outputTokens: 200,
        cost: 0.005,
        latency: 1500,
        contextUsage: 25,
      }
    )
  })

  it('should clear session history', async () => {
    const { useChatStorage } = await import('./useChatStorage')
    const mockClearSession = vi.fn()

    ;(useChatStorage as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      currentSession: { value: null },
      messages: { value: [] },
      metrics: { value: {} },
      isLoading: { value: false },
      error: { value: null },
      loadOrCreateSession: vi.fn(),
      addMessage: vi.fn(),
      clearSession: mockClearSession,
      exportSession: vi.fn(),
    })

    const { clearHistory } = useChatPersistence()

    await clearHistory()

    expect(mockClearSession).toHaveBeenCalled()
  })

  it('should load session with default model and provider', async () => {
    const { useChatStorage } = await import('./useChatStorage')
    const mockLoadOrCreateSession = vi.fn()

    ;(useChatStorage as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      currentSession: { value: null },
      messages: { value: [] },
      metrics: { value: {} },
      isLoading: { value: false },
      error: { value: null },
      loadOrCreateSession: mockLoadOrCreateSession,
      addMessage: vi.fn(),
      clearSession: vi.fn(),
      exportSession: vi.fn(),
    })

    const { loadSession } = useChatPersistence()

    await loadSession()

    expect(mockLoadOrCreateSession).toHaveBeenCalledWith(
      '/test/project',
      'main',
      'claude-sonnet-4-5',
      'anthropic'
    )
  })

  it('should handle missing project path gracefully', async () => {
    const { useProjectContext } = await import('./useProjectContext')
    const { useWorkspace } = await import('./useWorkspace')

    // Mock with no project
    ;(useProjectContext as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      {
        openedProject: { value: null },
      }
    )
    ;(useWorkspace as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      currentProjectPath: { value: null },
      currentBranch: { value: 'main' },
    })

    const { useChatStorage } = await import('./useChatStorage')
    const mockLoadOrCreateSession = vi.fn()

    ;(useChatStorage as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      currentSession: { value: null },
      messages: { value: [] },
      metrics: { value: {} },
      isLoading: { value: false },
      error: { value: null },
      loadOrCreateSession: mockLoadOrCreateSession,
      addMessage: vi.fn(),
      clearSession: vi.fn(),
      exportSession: vi.fn(),
    })

    const { loadSession } = useChatPersistence()

    // Should warn and return without loading
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation()
    await loadSession()

    expect(consoleSpy).toHaveBeenCalledWith(
      '[useChatPersistence] No project path available'
    )
    expect(mockLoadOrCreateSession).not.toHaveBeenCalled()

    consoleSpy.mockRestore()
  })

  it('should prevent concurrent loads when isLoading is true', async () => {
    const { useChatStorage } = await import('./useChatStorage')
    const mockLoadOrCreateSession = vi.fn()

    ;(useChatStorage as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      currentSession: { value: null },
      messages: { value: [] },
      metrics: { value: {} },
      isLoading: { value: true }, // Already loading
      error: { value: null },
      loadOrCreateSession: mockLoadOrCreateSession,
      addMessage: vi.fn(),
      clearSession: vi.fn(),
      exportSession: vi.fn(),
    })

    const { loadSession } = useChatPersistence()

    // Should skip duplicate load
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation()
    await loadSession()

    expect(consoleSpy).toHaveBeenCalledWith(
      '[useChatPersistence] Load already in progress, skipping duplicate'
    )
    expect(mockLoadOrCreateSession).not.toHaveBeenCalled()

    consoleSpy.mockRestore()
  })

  it('should expose hasSession computed property', async () => {
    const { useChatStorage } = await import('./useChatStorage')

    ;(useChatStorage as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      currentSession: {
        value: { id: 'test-session', messageCount: 0 },
      },
      messages: { value: [] },
      metrics: { value: {} },
      isLoading: { value: false },
      error: { value: null },
      loadOrCreateSession: vi.fn(),
      addMessage: vi.fn(),
      clearSession: vi.fn(),
      exportSession: vi.fn(),
    })

    const { hasSession } = useChatPersistence()

    expect(hasSession.value).toBe(true)
  })

  it('should expose exportSession function', async () => {
    const { useChatStorage } = await import('./useChatStorage')
    const mockExportSession = vi.fn().mockResolvedValue({
      session: {},
      messages: [],
    })

    ;(useChatStorage as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      currentSession: { value: null },
      messages: { value: [] },
      metrics: { value: {} },
      isLoading: { value: false },
      error: { value: null },
      loadOrCreateSession: vi.fn(),
      addMessage: vi.fn(),
      clearSession: vi.fn(),
      exportSession: mockExportSession,
    })

    const { exportSession } = useChatPersistence()

    const result = await exportSession()

    expect(mockExportSession).toHaveBeenCalled()
    expect(result).toEqual({ session: {}, messages: [] })
  })

  it('should load session with custom model and provider', async () => {
    const { useProjectContext } = await import('./useProjectContext')
    const { useWorkspace } = await import('./useWorkspace')

    // Restore default mocks for this test
    ;(useProjectContext as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      {
        openedProject: { value: { rootPath: '/test/project' } },
      }
    )
    ;(useWorkspace as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      currentProjectPath: { value: '/test/project' },
      currentBranch: { value: 'main' },
    })

    const { useChatStorage } = await import('./useChatStorage')
    const mockLoadOrCreateSession = vi.fn()

    ;(useChatStorage as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      currentSession: { value: null },
      messages: { value: [] },
      metrics: { value: {} },
      isLoading: { value: false },
      error: { value: null },
      loadOrCreateSession: mockLoadOrCreateSession,
      addMessage: vi.fn(),
      clearSession: vi.fn(),
      exportSession: vi.fn(),
    })

    const { loadSession } = useChatPersistence()

    await loadSession('gpt-4', 'openai')

    expect(mockLoadOrCreateSession).toHaveBeenCalledWith(
      '/test/project',
      'main',
      'gpt-4',
      'openai'
    )
  })

  it('should use workspace fallback when openedProject is null', async () => {
    const { useProjectContext } = await import('./useProjectContext')
    const { useWorkspace } = await import('./useWorkspace')

    // Mock with workspace but no openedProject
    ;(useProjectContext as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      {
        openedProject: { value: null },
      }
    )
    ;(useWorkspace as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      currentProjectPath: { value: '/workspace/project' },
      currentBranch: { value: 'develop' },
    })

    const { useChatStorage } = await import('./useChatStorage')
    const mockLoadOrCreateSession = vi.fn()

    ;(useChatStorage as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      currentSession: { value: null },
      messages: { value: [] },
      metrics: { value: {} },
      isLoading: { value: false },
      error: { value: null },
      loadOrCreateSession: mockLoadOrCreateSession,
      addMessage: vi.fn(),
      clearSession: vi.fn(),
      exportSession: vi.fn(),
    })

    const { loadSession } = useChatPersistence()

    await loadSession()

    expect(mockLoadOrCreateSession).toHaveBeenCalledWith(
      '/workspace/project',
      'develop',
      'claude-sonnet-4-5',
      'anthropic'
    )
  })

  it('should use main branch as default when currentBranch is null', async () => {
    const { useWorkspace } = await import('./useWorkspace')

    // Mock with null branch
    ;(useWorkspace as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      currentProjectPath: { value: '/test/project' },
      currentBranch: { value: null },
    })

    const { useChatStorage } = await import('./useChatStorage')
    const mockLoadOrCreateSession = vi.fn()

    ;(useChatStorage as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      currentSession: { value: null },
      messages: { value: [] },
      metrics: { value: {} },
      isLoading: { value: false },
      error: { value: null },
      loadOrCreateSession: mockLoadOrCreateSession,
      addMessage: vi.fn(),
      clearSession: vi.fn(),
      exportSession: vi.fn(),
    })

    const { loadSession } = useChatPersistence()

    await loadSession()

    expect(mockLoadOrCreateSession).toHaveBeenCalledWith(
      '/test/project',
      'main', // Should default to 'main'
      'claude-sonnet-4-5',
      'anthropic'
    )
  })
})
