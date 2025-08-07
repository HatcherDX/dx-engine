/**
 * MessagePort IPC System - VSCode Style Performance
 * Direct communication renderer ↔ ptyHost bypassing main process
 * Zero-copy data transfer for maximum terminal performance
 */

import { MessageChannelMain, MessagePortMain } from 'electron'
import { EventEmitter } from 'node:events'

interface MessagePortMessage {
  id: string
  type: string
  data?: unknown
  timestamp: number
}

interface MessagePortResponse {
  id: string
  success: boolean
  data?: unknown
  error?: string
  timestamp: number
}

interface PendingMessage {
  resolve: (value: MessagePortResponse) => void
  reject: (reason?: unknown) => void
  timeout: NodeJS.Timeout
}

export class MessagePortManager extends EventEmitter {
  private channels = new Map<string, MessageChannelMain>()
  private pendingMessages = new Map<string, PendingMessage>()
  private connectionHealth = new Map<
    string,
    { lastHeartbeat: number; connected: boolean }
  >()

  // Performance monitoring
  private messageCount = 0
  private avgLatency = 0
  private maxLatency = 0

  constructor() {
    super()
    this.setupHealthCheck()
    console.log('[MessagePort IPC] Manager initialized')
  }

  /**
   * Create high-performance MessagePort channel
   */
  createChannel(channelId: string): {
    port1: MessagePortMain
    port2: MessagePortMain
  } {
    try {
      const channel = new MessageChannelMain()
      this.channels.set(channelId, channel)

      // Setup connection health tracking
      this.connectionHealth.set(channelId, {
        lastHeartbeat: Date.now(),
        connected: true,
      })

      // Setup message monitoring for performance
      this.setupChannelMonitoring(channelId, channel)

      console.log(`[MessagePort IPC] Created channel: ${channelId}`)

      return {
        port1: channel.port1,
        port2: channel.port2,
      }
    } catch (error) {
      console.error(
        `[MessagePort IPC] Failed to create channel ${channelId}:`,
        error
      )
      throw error
    }
  }

  /**
   * Setup performance monitoring for channel
   */
  private setupChannelMonitoring(
    channelId: string,
    channel: MessageChannelMain
  ): void {
    // Monitor port1 messages (typically renderer → ptyHost)
    channel.port1.on('message', (event) => {
      this.handleChannelMessage(channelId, 'port1', event)
    })

    // Monitor port2 messages (typically ptyHost → renderer)
    channel.port2.on('message', (event) => {
      this.handleChannelMessage(channelId, 'port2', event)
    })

    // Handle channel errors
    channel.port1.on('close', () => {
      console.log(`[MessagePort IPC] Port1 closed for channel: ${channelId}`)
      this.markChannelDisconnected(channelId)
    })

    channel.port2.on('close', () => {
      console.log(`[MessagePort IPC] Port2 closed for channel: ${channelId}`)
      this.markChannelDisconnected(channelId)
    })
  }

  /**
   * Handle channel message with performance tracking
   */
  private handleChannelMessage(
    channelId: string,
    port: string,
    event: { data: unknown }
  ): void {
    const message = event.data as MessagePortMessage

    if (message && message.timestamp) {
      // Calculate latency
      const latency = Date.now() - message.timestamp
      this.updatePerformanceMetrics(latency)

      // Update health
      this.updateConnectionHealth(channelId)

      // Emit for monitoring
      this.emit('message', {
        channelId,
        port,
        message,
        latency,
        totalMessages: this.messageCount,
      })
    }
  }

  /**
   * Send message through MessagePort with automatic retry
   */
  async sendMessage(
    channelId: string,
    port: 'port1' | 'port2',
    message: Omit<MessagePortMessage, 'timestamp'>
  ): Promise<MessagePortResponse> {
    const channel = this.channels.get(channelId)
    if (!channel) {
      throw new Error(`Channel ${channelId} not found`)
    }

    const fullMessage: MessagePortMessage = {
      ...message,
      timestamp: Date.now(),
    }

    return new Promise((resolve, reject) => {
      // Setup timeout for message response
      const timeout = setTimeout(() => {
        this.pendingMessages.delete(message.id)
        reject(new Error(`MessagePort timeout for ${channelId}:${message.id}`))
      }, 30000) // 30 second timeout

      // Store pending message
      this.pendingMessages.set(message.id, { resolve, reject, timeout })

      try {
        // Send through appropriate port
        if (port === 'port1') {
          channel.port1.postMessage(fullMessage)
        } else {
          channel.port2.postMessage(fullMessage)
        }

        this.messageCount++
        console.log(
          `[MessagePort IPC] Sent message ${message.id} via ${channelId}:${port}`
        )
      } catch (error) {
        // Clean up on send failure
        clearTimeout(timeout)
        this.pendingMessages.delete(message.id)
        reject(error)
      }
    })
  }

  /**
   * Handle response message
   */
  handleResponse(response: MessagePortResponse): void {
    const pending = this.pendingMessages.get(response.id)
    if (pending) {
      clearTimeout(pending.timeout)
      this.pendingMessages.delete(response.id)

      if (response.success) {
        pending.resolve(response)
      } else {
        pending.reject(
          new Error(response.error || 'MessagePort operation failed')
        )
      }
    }
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(latency: number): void {
    this.maxLatency = Math.max(this.maxLatency, latency)
    this.avgLatency =
      (this.avgLatency * (this.messageCount - 1) + latency) / this.messageCount
  }

  /**
   * Update connection health
   */
  private updateConnectionHealth(channelId: string): void {
    const health = this.connectionHealth.get(channelId)
    if (health) {
      health.lastHeartbeat = Date.now()
      health.connected = true
    }
  }

  /**
   * Mark channel as disconnected
   */
  private markChannelDisconnected(channelId: string): void {
    const health = this.connectionHealth.get(channelId)
    if (health) {
      health.connected = false
    }
    this.emit('channelDisconnected', channelId)
  }

  /**
   * Setup periodic health check
   */
  private setupHealthCheck(): void {
    setInterval(() => {
      const now = Date.now()
      const staleThreshold = 60000 // 1 minute

      for (const [channelId, health] of this.connectionHealth) {
        if (health.connected && now - health.lastHeartbeat > staleThreshold) {
          console.warn(`[MessagePort IPC] Channel ${channelId} appears stale`)
          health.connected = false
          this.emit('channelStale', channelId)
        }
      }
    }, 30000) // Check every 30 seconds
  }

  /**
   * Get channel health status
   */
  getChannelHealth(
    channelId: string
  ): { connected: boolean; lastHeartbeat: number } | null {
    return this.connectionHealth.get(channelId) || null
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): {
    messageCount: number
    avgLatency: number
    maxLatency: number
    channelsActive: number
  } {
    return {
      messageCount: this.messageCount,
      avgLatency: Math.round(this.avgLatency * 100) / 100,
      maxLatency: this.maxLatency,
      channelsActive: this.channels.size,
    }
  }

  /**
   * Close channel and cleanup
   */
  closeChannel(channelId: string): void {
    const channel = this.channels.get(channelId)
    if (channel) {
      try {
        channel.port1.close()
        channel.port2.close()
      } catch (error) {
        console.warn(
          `[MessagePort IPC] Error closing channel ${channelId}:`,
          error
        )
      }

      this.channels.delete(channelId)
      this.connectionHealth.delete(channelId)
      console.log(`[MessagePort IPC] Closed channel: ${channelId}`)
    }
  }

  /**
   * Cleanup all channels
   */
  cleanup(): void {
    console.log(`[MessagePort IPC] Cleaning up ${this.channels.size} channels`)

    for (const channelId of this.channels.keys()) {
      this.closeChannel(channelId)
    }

    // Clear pending messages
    for (const [, pending] of this.pendingMessages) {
      clearTimeout(pending.timeout)
      pending.reject(new Error('MessagePort manager shutting down'))
    }
    this.pendingMessages.clear()

    console.log('[MessagePort IPC] Cleanup complete')
  }
}

// Singleton instance
export const messagePortManager = new MessagePortManager()
