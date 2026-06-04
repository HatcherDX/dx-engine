import type { ElectronAPI } from '@hatcherdx/dx-engine-preload'

declare global {
  // eslint-disable-next-line no-var
  var electronAPI: ElectronAPI

  // DOM types for linting
  interface Window {
    electronAPI?: {
      send: (channel: string, ...args: unknown[]) => Promise<unknown>
      invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
      on: (channel: string, callback: (...args: unknown[]) => void) => void
      off: (channel: string, callback: (...args: unknown[]) => void) => void
      setTheme: (theme: string) => void
      openProjectDialog: () => Promise<{
        path: string
        packageJson: string
        name: string
        version: string
        description: string
        scripts: Record<string, string>
        dependencies: Record<string, string>
        devDependencies: Record<string, string>
      } | null>
      statFile: (filePath: string) => Promise<{
        isFile: boolean
        isDirectory: boolean
        size: number
        modified: Date
      }>
      readDirectory: (dirPath: string) => Promise<string[]>
      pathExists: (path: string) => Promise<boolean>
      isDirectory: (path: string) => Promise<boolean>
      readFile: (filePath: string) => Promise<string>
      scanDirectory: (
        dirPath: string,
        options?: { ignoredDirs?: string[]; configFiles?: string[] }
      ) => Promise<
        Array<{
          path: string
          name: string
          extension: string
          type: 'file' | 'directory'
          size?: number
          lastModified?: Date
          isConfig?: boolean
        }>
      >
      getGitStatus: (projectPath: string) => Promise<{
        files: Array<{
          path: string
          indexStatus: string
          worktreeStatus: string
          isStaged: boolean
          simplifiedStatus:
            | 'added'
            | 'modified'
            | 'deleted'
            | 'renamed'
            | 'untracked'
        }>
        totalFiles: number
        isRepository: boolean
      }>
      getGitDiff: (
        projectPath: string,
        filePath: string,
        options?: { staged?: boolean; commit?: string }
      ) => Promise<string>
      getGitBranches: (projectPath: string) => Promise<{
        current: string
        all: string[]
        local: string[]
        remote: string[]
      }>
      switchGitBranch: (
        projectPath: string,
        branchName: string
      ) => Promise<{
        success: boolean
        currentBranch: string
        message: string
        errorType?: 'uncommitted_changes' | 'untracked_files' | 'both' | 'other'
        affectedFiles?: string[]
        suggestions?: string[]
        canForce?: boolean
        rawError?: string
      }>
      getFileContent: (
        projectPath: string,
        filePath: string,
        options?: { commit?: string; fromWorkingTree?: boolean }
      ) => Promise<string>
      sendTerminalInput: (data: { id: string; data: string }) => void
      sendTerminalResize: (data: {
        id: string
        cols: number
        rows: number
      }) => void
      // Terminal-specific event listeners for better reliability
      onTerminalData?: (
        callback: (data: { id: string; data: string }) => void
      ) => void
      onTerminalExit?: (
        callback: (data: {
          id: string
          exitCode: number
          signal?: number
        }) => void
      ) => void
      onTerminalError?: (callback: (data: { error: string }) => void) => void
      // Debug methods (development only)
      resetOnboarding?: () => void
      // Terminal Easter Egg IPC
      terminalEasterEgg?: {
        stepChange: (step: string) => void
        visibilityChange: (isVisible: boolean) => void
        onActivate: (
          callback: (data: { step: string; hasBeenActivated: boolean }) => void
        ) => void
        onShow: (
          callback: (data: { step: string; hasBeenActivated: boolean }) => void
        ) => void
        onHide: (callback: () => void) => void
        onCommand: (
          callback: (data: { command: string; step: string }) => void
        ) => void
        onInput: (
          callback: (data: { char: string; step: string }) => void
        ) => void
        onStepChange: (callback: (data: { step: string }) => void) => void
        removeAllListeners: () => void
      }
    }
    terminalInputBridge: {
      processInput: (input: string) => void
      clearInput: () => void
      setInput: (input: string) => void
    }
    isTerminalSearchMode?: boolean
    searchModeEnteredTime?: number
    terminalAvailableBranches?: Array<{ name: string; current: boolean }>
    currentContext:
      | {
          updateMessages: (messages: string[], preserveInput: boolean) => void
          updateInput: (input: string) => void
          state?: {
            currentInput?: string
            lines?: Array<{ text: string }>
            isWaitingForInput?: boolean
            cursorPosition?: number
          }
        }
      | null
      | undefined
    __terminalDeactivatedViaUI?: boolean
    terminalBranchSearchQuery?: string
    _terminalListenersRegistered?: boolean
    _receivedMessages?: Set<string>
    storageAPI?: {
      // Project management
      getRecentProjects(): Promise<
        Array<{
          id: string
          name: string
          path: string
          lastOpened: Date
          metadata?: {
            gitRemote?: string
            framework?: string
            packageManager?: string
            icon?: string
          }
        }>
      >
      addRecentProject(project: {
        path: string
        name: string
        metadata?: any
      }): Promise<void>
      updateProjectLastOpened(projectId: string): Promise<void>
      removeRecentProject(projectId: string): Promise<void>
      clearRecentProjects(): Promise<void>

      // Configuration management
      getIDEConfig(): Promise<{
        version: string
        ui: {
          theme: 'light' | 'dark' | 'auto'
          sidebarWidth: number
          terminalHeight: number
        }
        editor: {
          fontSize: number
          fontFamily: string
          tabSize: number
          wordWrap: boolean
        }
        projectHistoryLimit: number
      }>
      updateIDEConfig(config: any): Promise<void>

      // Security information
      getSecurityInfo(): Promise<{
        platform: string
        encryptionAvailable: boolean
        backend?: string
        keyringService?: string
      }>

      // Workspace management
      getWorkspace(): Promise<{
        project: {
          path: string
          name: string
          lastOpened: Date
          metadata?: {
            framework?: string
            packageManager?: string
            gitRemote?: string
          }
        }
        activeTasks: Array<{
          id: string
          branchName: string
          taskType: 'feature' | 'bug' | 'docs' | 'maintenance' | 'refactor'
          status: 'active' | 'pending-changes' | 'ready-to-close'
          openedAt: Date
          lastActiveAt: Date
          workState: {
            hasUncommittedChanges?: boolean
            hasUnpushedCommits?: boolean
            lastCommitMessage?: string
            modifiedFiles?: string[]
          }
          sessionData?: {
            openEditors?: string[]
            selectedFile?: string
            scrollPositions?: Record<string, number>
          }
        }>
        taskHistory: Array<{
          id: string
          branchName: string
          taskType: 'feature' | 'bug' | 'docs' | 'maintenance' | 'refactor'
          openedAt: Date
          closedAt: Date
          completionStatus: 'completed' | 'abandoned' | 'merged' | 'closed'
        }>
        currentTaskId: string | null
      } | null>
      setWorkspace(workspace: any): Promise<void>
      clearWorkspace(): Promise<void>

      // Task management
      addTask(task: any): Promise<void>
      removeTask(taskId: string): Promise<void>
      setCurrentTask(taskId: string | null): Promise<void>
      updateTaskState(taskId: string, workState: any): Promise<void>

      // Utilities
      validateProjectPath(path: string): Promise<{
        valid: boolean
        error?: string
        name?: string
      }>
      checkPath(path: string): Promise<{
        exists: boolean
        isDirectory: boolean
        error?: string
      }>
    }
    chatStorageAPI?: {
      // Session management
      saveSession(session: {
        id: string
        projectPath?: string
        branch?: string
        startedAt: Date
        lastUpdatedAt: Date
        messages: Array<{
          id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          timestamp: Date
          metrics?: {
            inputTokens?: number
            outputTokens?: number
            cost?: number
            latency?: number
            contextUsage?: number
          }
        }>
        metrics: {
          totalInputTokens: number
          totalOutputTokens: number
          totalCost: number
          averageLatency: number
          messageCount: number
        }
        metadata: {
          model: string
          provider: string
          contextWindow: number
          title?: string
        }
      }): Promise<void>
      getAllSessions(): Promise<
        Array<{
          id: string
          projectPath?: string
          branch?: string
          startedAt: Date
          lastUpdatedAt: Date
          messages: Array<{
            id: string
            role: 'user' | 'assistant' | 'system'
            content: string
            timestamp: Date
            metrics?: {
              inputTokens?: number
              outputTokens?: number
              cost?: number
              latency?: number
              contextUsage?: number
            }
          }>
          metrics: {
            totalInputTokens: number
            totalOutputTokens: number
            totalCost: number
            averageLatency: number
            messageCount: number
          }
          metadata: {
            model: string
            provider: string
            contextWindow: number
            title?: string
          }
        }>
      >
      getSession(sessionId: string): Promise<{
        id: string
        projectPath?: string
        branch?: string
        startedAt: Date
        lastUpdatedAt: Date
        messages: Array<{
          id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          timestamp: Date
          metrics?: {
            inputTokens?: number
            outputTokens?: number
            cost?: number
            latency?: number
            contextUsage?: number
          }
        }>
        metrics: {
          totalInputTokens: number
          totalOutputTokens: number
          totalCost: number
          averageLatency: number
          messageCount: number
        }
        metadata: {
          model: string
          provider: string
          contextWindow: number
          title?: string
        }
      } | null>
      getSessionByProjectBranch(
        projectPath: string,
        branch: string
      ): Promise<{
        id: string
        projectPath?: string
        branch?: string
        startedAt: Date
        lastUpdatedAt: Date
        messages: Array<{
          id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          timestamp: Date
          metrics?: {
            inputTokens?: number
            outputTokens?: number
            cost?: number
            latency?: number
            contextUsage?: number
          }
        }>
        metrics: {
          totalInputTokens: number
          totalOutputTokens: number
          totalCost: number
          averageLatency: number
          messageCount: number
        }
        metadata: {
          model: string
          provider: string
          contextWindow: number
          title?: string
        }
      } | null>
      deleteSession(sessionId: string): Promise<void>
      clearAllSessions(): Promise<void>
      exportSessions(sessionIds?: string[]): Promise<string>
      importSessions(jsonData: string): Promise<void>
      getStatistics(): Promise<{
        totalSessions: number
        totalMessages: number
        totalTokensUsed: number
        totalCost: number
        averageSessionLength: number
        mostUsedModel: string
      }>
      addMessage(
        sessionId: string,
        message: {
          id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          timestamp: Date
          metrics?: {
            inputTokens?: number
            outputTokens?: number
            cost?: number
            latency?: number
            contextUsage?: number
          }
        },
        metrics?: {
          inputTokens?: number
          outputTokens?: number
          cost?: number
          latency?: number
        }
      ): Promise<void>
      createSession(metadata: {
        projectPath?: string
        branch?: string
        model: string
        provider: string
        contextWindow: number
        title?: string
      }): Promise<{
        id: string
        projectPath?: string
        branch?: string
        startedAt: Date
        lastUpdatedAt: Date
        messages: Array<{
          id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          timestamp: Date
          metrics?: {
            inputTokens?: number
            outputTokens?: number
            cost?: number
            latency?: number
            contextUsage?: number
          }
        }>
        metrics: {
          totalInputTokens: number
          totalOutputTokens: number
          totalCost: number
          averageLatency: number
          messageCount: number
        }
        metadata: {
          model: string
          provider: string
          contextWindow: number
          title?: string
        }
      }>
    }
    navigator: Navigator
  }

  // Ensure DOM types are available
  interface MouseEvent extends UIEvent {}
  interface WheelEvent extends MouseEvent {}
  interface Event {}
  interface CustomEvent<T = any> extends Event {
    readonly detail: T
  }
  interface TouchEvent extends UIEvent {
    touches: TouchList
  }
  interface TouchList {
    readonly length: number
    item(index: number): Touch | null
    [index: number]: Touch
  }
  interface Touch {
    readonly clientX: number
    readonly clientY: number
    readonly identifier: number
    readonly pageX: number
    readonly pageY: number
    readonly screenX: number
    readonly screenY: number
    readonly target: EventTarget | null
  }
  interface KeyboardEvent extends UIEvent {}
  interface HTMLElement extends Element {}
  interface HTMLCanvasElement extends HTMLElement {
    clientWidth: number
    clientHeight: number
    getContext(contextId: '2d'): CanvasRenderingContext2D | null
    getContext(contextId: 'webgl'): WebGLRenderingContext | null
    getContext(contextId: 'webgl2'): WebGL2RenderingContext | null
  }
  interface HTMLInputElement extends HTMLElement {}
  interface HTMLTextAreaElement extends HTMLElement {}
  interface Navigator {
    clipboard: {
      writeText(text: string): Promise<void>
    }
  }

  // ResizeObserver API
  class ResizeObserver {
    constructor(callback: ResizeObserverCallback)
    observe(target: Element): void
    unobserve(target: Element): void
    disconnect(): void
  }

  interface ResizeObserverCallback {
    (entries: ResizeObserverEntry[], observer: ResizeObserver): void
  }

  interface ResizeObserverEntry {
    readonly target: Element
    readonly contentRect: DOMRectReadOnly
  }

  // MutationObserver API
  class MutationObserver {
    constructor(callback: MutationCallback)
    observe(target: Node, options?: MutationObserverInit): void
    disconnect(): void
    takeRecords(): MutationRecord[]
  }

  interface MutationCallback {
    (mutations: MutationRecord[], observer: MutationObserver): void
  }

  interface MutationObserverInit {
    attributes?: boolean
    attributeFilter?: string[]
    attributeOldValue?: boolean
    characterData?: boolean
    characterDataOldValue?: boolean
    childList?: boolean
    subtree?: boolean
  }

  interface MutationRecord {
    readonly type: string
    readonly target: Node
    readonly addedNodes: NodeList
    readonly removedNodes: NodeList
    readonly previousSibling: Node | null
    readonly nextSibling: Node | null
    readonly attributeName: string | null
    readonly attributeNamespace: string | null
    readonly oldValue: string | null
  }
}
