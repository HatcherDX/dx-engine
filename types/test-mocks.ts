// Common types for test mocks across the project
import type { MockedFunction } from 'vitest'

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
  log: MockedFunction<(...data: unknown[]) => void>
  error: MockedFunction<(...data: unknown[]) => void>
  warn: MockedFunction<(...data: unknown[]) => void>
}

export interface MockDocument {
  body: {
    style: Record<string, string>
  }
  documentElement: {
    style: Record<string, string>
    classList: {
      add: (className: string) => void
      remove: (className: string) => void
      contains: (className: string) => boolean
    }
  }
  querySelector: (selector: string) => HTMLElement | null
  createElement?: (tagName: string) => HTMLElement
  addEventListener: (event: string, callback: EventListener) => void
  removeEventListener: (event: string, callback: EventListener) => void
}

// Type for Vitest mock functions
export type MockFunction<
  T extends (...args: unknown[]) => unknown = (...args: unknown[]) => unknown,
> = MockedFunction<T>

export interface MenuTemplate {
  [key: string]: unknown
}

export interface MockElement {
  tagName: string
  style: Record<string, string>
  appendChild: MockedFunction<(child: Node) => Node>
  insertBefore: MockedFunction<
    (newNode: Node, referenceNode: Node | null) => Node
  >
  removeChild: MockedFunction<(child: Node) => Node>
  setAttribute: MockedFunction<(name: string, value: string) => void>
  getAttribute: MockedFunction<(name: string) => string | null>
  classList: {
    add: MockedFunction<(className: string) => void>
    remove: MockedFunction<(className: string) => void>
    contains: MockedFunction<(className: string) => boolean>
  }
  children: unknown[]
  parentNode: Node | null
  measureText?: MockedFunction<(text: string) => { width: number }>
  font?: string
  getContext?: MockedFunction<(contextId: string) => MockElement | null>
  [key: string]: unknown
}
