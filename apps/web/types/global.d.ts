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
      sendTerminalInput: (data: { id: string; data: string }) => void
      sendTerminalResize: (data: {
        id: string
        cols: number
        rows: number
      }) => void
    }
    navigator: Navigator
  }

  // Ensure DOM types are available
  interface MouseEvent extends UIEvent {}
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
