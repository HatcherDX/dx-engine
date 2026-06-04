/**
 * @fileoverview Composable for tracking AI API usage metrics and costs.
 *
 * @description
 * Provides reactive state for tracking API calls, token usage, and estimated costs
 * for AI interactions. Persists metrics to localStorage for session continuity.
 *
 * @example
 * ```typescript
 * const { metrics, trackMessage, resetMetrics } = useAIMetrics()
 *
 * // Track a message
 * trackMessage({
 *   inputTokens: 150,
 *   outputTokens: 300,
 *   model: 'Claude Code'
 * })
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { ref, computed, watch } from 'vue'

/**
 * Interface for AI usage metrics.
 *
 * @public
 */
export interface AIMetrics {
  /** Total API calls made */
  totalCalls: number
  /** Total input tokens used */
  inputTokens: number
  /** Total output tokens used */
  outputTokens: number
  /** Estimated cost in USD */
  estimatedCost: number
  /** Last reset timestamp */
  lastReset: string
  /** Metrics by model */
  byModel: Record<
    string,
    {
      calls: number
      inputTokens: number
      outputTokens: number
      cost: number
    }
  >
}

/**
 * Interface for message tracking.
 *
 * @public
 */
export interface MessageMetrics {
  /** Number of input tokens */
  inputTokens: number
  /** Number of output tokens */
  outputTokens: number
  /** Model name */
  model: string
}

// Storage key for metrics persistence
const STORAGE_KEY = 'hatcher-ai-metrics'

// Pricing per 1M tokens (approximate Claude Sonnet 4 pricing)
const PRICING = {
  'Claude Code': {
    input: 3.0, // $3 per 1M input tokens
    output: 15.0, // $15 per 1M output tokens
  },
  default: {
    input: 3.0,
    output: 15.0,
  },
}

/**
 * Load metrics from localStorage.
 *
 * @returns Stored metrics or default empty metrics
 *
 * @internal
 */
function loadMetrics(): AIMetrics {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error('[AIMetrics] Error loading metrics:', error)
  }

  return {
    totalCalls: 0,
    inputTokens: 0,
    outputTokens: 0,
    estimatedCost: 0,
    lastReset: new Date().toISOString(),
    byModel: {},
  }
}

/**
 * Save metrics to localStorage.
 *
 * @param metrics - Metrics to save
 *
 * @internal
 */
function saveMetrics(metrics: AIMetrics): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(metrics))
  } catch (error) {
    console.error('[AIMetrics] Error saving metrics:', error)
  }
}

/**
 * Calculate cost for token usage.
 *
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @param model - Model name
 * @returns Estimated cost in USD
 *
 * @internal
 */
function calculateCost(
  inputTokens: number,
  outputTokens: number,
  model: string
): number {
  const pricing = PRICING[model as keyof typeof PRICING] || PRICING.default
  const inputCost = (inputTokens / 1_000_000) * pricing.input
  const outputCost = (outputTokens / 1_000_000) * pricing.output
  return inputCost + outputCost
}

// Reactive state
const metrics = ref<AIMetrics>(loadMetrics())

/**
 * Composable for tracking AI API usage and costs.
 *
 * @returns Object with metrics state and tracking functions
 *
 * @public
 */
export function useAIMetrics() {
  /**
   * Total tokens used (input + output).
   *
   * @public
   */
  const totalTokens = computed(
    () => metrics.value.inputTokens + metrics.value.outputTokens
  )

  /**
   * Average tokens per call.
   *
   * @public
   */
  const averageTokensPerCall = computed(() => {
    if (metrics.value.totalCalls === 0) return 0
    return Math.round(totalTokens.value / metrics.value.totalCalls)
  })

  /**
   * Track a new message.
   *
   * @param message - Message metrics to track
   *
   * @remarks
   * Updates total metrics and per-model breakdown.
   *
   * @public
   */
  const trackMessage = (message: MessageMetrics): void => {
    const cost = calculateCost(
      message.inputTokens,
      message.outputTokens,
      message.model
    )

    // Update totals
    metrics.value.totalCalls++
    metrics.value.inputTokens += message.inputTokens
    metrics.value.outputTokens += message.outputTokens
    metrics.value.estimatedCost += cost

    // Update per-model stats
    if (!metrics.value.byModel[message.model]) {
      metrics.value.byModel[message.model] = {
        calls: 0,
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
      }
    }

    metrics.value.byModel[message.model].calls++
    metrics.value.byModel[message.model].inputTokens += message.inputTokens
    metrics.value.byModel[message.model].outputTokens += message.outputTokens
    metrics.value.byModel[message.model].cost += cost

    console.log('[AIMetrics] Tracked message:', {
      model: message.model,
      tokens: message.inputTokens + message.outputTokens,
      cost: cost.toFixed(4),
    })
  }

  /**
   * Reset all metrics.
   *
   * @remarks
   * Clears all tracked data and updates last reset timestamp.
   *
   * @public
   */
  const resetMetrics = (): void => {
    metrics.value = {
      totalCalls: 0,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCost: 0,
      lastReset: new Date().toISOString(),
      byModel: {},
    }
    console.log('[AIMetrics] Metrics reset')
  }

  // Auto-save metrics on changes
  watch(
    metrics,
    (newMetrics) => {
      saveMetrics(newMetrics)
    },
    { deep: true }
  )

  return {
    metrics,
    totalTokens,
    averageTokensPerCall,
    trackMessage,
    resetMetrics,
  }
}
