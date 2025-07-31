import type { ElectronAPI } from '@hatcherdx/dx-engine-preload'

declare global {
  // eslint-disable-next-line no-var
  var electronAPI: ElectronAPI

  // DOM types for linting
  interface Window {
    electronAPI?: {
      send: (channel: string, ...args: unknown[]) => Promise<unknown>
      on: (channel: string, callback: (...args: unknown[]) => void) => void
      setTheme: (theme: string) => void
    }
    navigator: Navigator
  }

  // Ensure DOM types are available
  interface MouseEvent extends UIEvent {}
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
}
