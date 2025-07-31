// Common types for test mocks across the project

export interface MockProcess {
  platform: NodeJS.Platform
  argv: string[]
  cwd: () => string
  exit: (code?: number) => never
  env: Record<string, string | undefined>
}

export interface MockElectronApp {
  requestSingleInstanceLock: () => boolean
  quit: () => void
  on: (event: string, callback: (...args: unknown[]) => void) => void
  whenReady: () => Promise<void>
  exit: (code: number) => void
  dock?: {
    setIcon: (path: string) => void
  }
}

export interface MockBrowserWindow {
  loadURL: (url: string) => Promise<void>
  loadFile: (path: string) => Promise<void>
  webContents: {
    openDevTools: () => void
    on: (event: string, callback: (...args: unknown[]) => void) => void
  }
  on: (event: string, callback: (...args: unknown[]) => void) => void
  show: () => void
  focus: () => void
  isMinimized: () => boolean
  restore: () => void
  minimize: () => void
  maximize: () => void
  close: () => void
}

export interface ProgressInfo {
  phase: string
  overallProgress: number
  currentFile?: string
  currentLanguage?: string
  message?: string
  filesCompleted?: number
  totalFiles?: number
  languagesCompleted?: number
  totalLanguages?: number
  timeElapsed?: number
}

export type ProgressCallback = (progress: ProgressInfo) => void

export interface MockCall {
  [index: number]: unknown
  0: string // First argument is usually the event name
}

export interface ConsoleSpy {
  log: ReturnType<typeof vi.spyOn>
  error: ReturnType<typeof vi.spyOn>
  warn: ReturnType<typeof vi.spyOn>
}

export interface MockDocument {
  body: {
    style: Record<string, string>
  }
  createElement?: (tagName: string) => HTMLElement
  addEventListener: (event: string, callback: EventListener) => void
  removeEventListener: (event: string, callback: EventListener) => void
}

// Type for Vitest mock functions
export type MockFunction<
  T extends (...args: unknown[]) => unknown = (...args: unknown[]) => unknown,
> = ReturnType<typeof vi.fn<T>>

export interface MenuTemplate {
  [key: string]: unknown
}

export interface MockElement {
  tagName: string
  [key: string]: unknown
}
