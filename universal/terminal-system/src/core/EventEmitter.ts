type EventMap = Record<string, unknown[]>
type EventListener<T extends unknown[]> = (...args: T) => void

/**
 * Simple event emitter for terminal system events
 */
export class EventEmitter<T extends EventMap = EventMap> {
  private listeners = new Map<keyof T, Set<(...args: unknown[]) => void>>()

  /**
   * Add an event listener
   */
  on<K extends keyof T>(event: K, listener: EventListener<T[K]>): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(listener as (...args: unknown[]) => void)
    return this
  }

  /**
   * Add a one-time event listener
   */
  once<K extends keyof T>(event: K, listener: EventListener<T[K]>): this {
    const onceListener: EventListener<T[K]> = (...args: T[K]) => {
      this.off(event, onceListener)
      listener(...args)
    }
    this.on(event, onceListener)
    return this
  }

  /**
   * Remove an event listener
   */
  off<K extends keyof T>(event: K, listener: EventListener<T[K]>): this {
    const eventListeners = this.listeners.get(event)
    if (eventListeners) {
      eventListeners.delete(listener as (...args: unknown[]) => void)
    }
    return this
  }

  /**
   * Emit an event
   */
  emit<K extends keyof T>(event: K, ...args: T[K]): boolean {
    const eventListeners = this.listeners.get(event)
    if (!eventListeners || eventListeners.size === 0) {
      return false
    }

    for (const listener of eventListeners) {
      try {
        listener(...args)
      } catch (error) {
        console.error(`Error in event listener for ${String(event)}:`, error)
      }
    }

    return true
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners<K extends keyof T>(event?: K): this {
    if (event) {
      this.listeners.delete(event)
    } else {
      this.listeners.clear()
    }
    return this
  }

  /**
   * Get the number of listeners for an event
   */
  listenerCount<K extends keyof T>(event: K): number {
    const eventListeners = this.listeners.get(event)
    return eventListeners ? eventListeners.size : 0
  }
}
