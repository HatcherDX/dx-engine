/**
 * @fileoverview Unit tests for useAIMetrics composable.
 *
 * @description
 * Tests the AI metrics tracking functionality including token usage,
 * cost calculation, and persistence to localStorage.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @internal
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'

describe('useAIMetrics', () => {
  let mockLocalStorage: Record<string, string>
  let getItemSpy: ReturnType<typeof vi.fn>
  let setItemSpy: ReturnType<typeof vi.fn>
  let consoleErrorSpy: ReturnType<typeof vi.fn>
  let consoleLogSpy: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    // Clear all storage
    mockLocalStorage = {}

    // Mock localStorage
    getItemSpy = vi.fn((key: string) => mockLocalStorage[key] || null)
    setItemSpy = vi.fn((key: string, value: string) => {
      mockLocalStorage[key] = value
    })

    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: getItemSpy,
        setItem: setItemSpy,
        removeItem: vi.fn((key: string) => {
          delete mockLocalStorage[key]
        }),
        clear: vi.fn(() => {
          mockLocalStorage = {}
        }),
      },
      writable: true,
      configurable: true,
    })

    // Mock console methods
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    // Reset module to get fresh state
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    mockLocalStorage = {}
    vi.resetModules()
  })

  describe('loadMetrics', () => {
    it('should return default metrics when localStorage is empty', async () => {
      const { useAIMetrics } = await import('./useAIMetrics')
      const { metrics } = useAIMetrics()

      expect(metrics.value).toEqual({
        totalCalls: 0,
        inputTokens: 0,
        outputTokens: 0,
        estimatedCost: 0,
        lastReset: expect.any(String),
        byModel: {},
      })
    })

    it('should load metrics from localStorage when available', async () => {
      const storedMetrics = {
        totalCalls: 5,
        inputTokens: 1000,
        outputTokens: 2000,
        estimatedCost: 0.045,
        lastReset: '2024-01-01T00:00:00.000Z',
        byModel: {
          'Claude Code': {
            calls: 5,
            inputTokens: 1000,
            outputTokens: 2000,
            cost: 0.045,
          },
        },
      }

      mockLocalStorage['hatcher-ai-metrics'] = JSON.stringify(storedMetrics)

      const { useAIMetrics } = await import('./useAIMetrics')
      const { metrics } = useAIMetrics()

      expect(metrics.value).toEqual(storedMetrics)
    })

    it('should return default metrics when localStorage has corrupted data', async () => {
      mockLocalStorage['hatcher-ai-metrics'] = 'invalid-json-{corrupt'

      const { useAIMetrics } = await import('./useAIMetrics')
      const { metrics } = useAIMetrics()

      expect(metrics.value.totalCalls).toBe(0)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[AIMetrics] Error loading metrics:',
        expect.any(Error)
      )
    })
  })

  describe('saveMetrics', () => {
    it('should save metrics to localStorage', async () => {
      const { useAIMetrics } = await import('./useAIMetrics')
      const { trackMessage } = useAIMetrics()

      trackMessage({
        inputTokens: 100,
        outputTokens: 200,
        model: 'Claude Code',
      })

      // Wait for watch to trigger
      await nextTick()

      expect(setItemSpy).toHaveBeenCalledWith(
        'hatcher-ai-metrics',
        expect.stringContaining('"totalCalls":1')
      )
    })

    it('should handle save errors gracefully', async () => {
      setItemSpy.mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })

      const { useAIMetrics } = await import('./useAIMetrics')
      const { trackMessage } = useAIMetrics()

      trackMessage({
        inputTokens: 100,
        outputTokens: 200,
        model: 'Claude Code',
      })

      // Wait for watch to trigger
      await nextTick()

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[AIMetrics] Error saving metrics:',
        expect.any(Error)
      )
    })
  })

  describe('calculateCost', () => {
    it('should calculate cost for Claude Code model', async () => {
      const { useAIMetrics } = await import('./useAIMetrics')
      const { trackMessage, metrics } = useAIMetrics()

      trackMessage({
        inputTokens: 1000000, // 1M tokens
        outputTokens: 1000000, // 1M tokens
        model: 'Claude Code',
      })

      // $3 per 1M input + $15 per 1M output = $18
      expect(metrics.value.estimatedCost).toBeCloseTo(18, 1)
    })

    it('should use default pricing for unknown models', async () => {
      const { useAIMetrics } = await import('./useAIMetrics')
      const { trackMessage, metrics } = useAIMetrics()

      trackMessage({
        inputTokens: 1000000, // 1M tokens
        outputTokens: 1000000, // 1M tokens
        model: 'Unknown Model',
      })

      // Default: $3 per 1M input + $15 per 1M output = $18
      expect(metrics.value.estimatedCost).toBeCloseTo(18, 1)
    })

    it('should calculate fractional costs correctly', async () => {
      const { useAIMetrics } = await import('./useAIMetrics')
      const { trackMessage, metrics } = useAIMetrics()

      trackMessage({
        inputTokens: 500000, // 0.5M tokens
        outputTokens: 250000, // 0.25M tokens
        model: 'Claude Code',
      })

      // $3 * 0.5 + $15 * 0.25 = $1.5 + $3.75 = $5.25
      expect(metrics.value.estimatedCost).toBeCloseTo(5.25, 1)
    })
  })

  describe('trackMessage', () => {
    it('should track first message and create model entry', async () => {
      const { useAIMetrics } = await import('./useAIMetrics')
      const { trackMessage, metrics } = useAIMetrics()

      trackMessage({
        inputTokens: 150,
        outputTokens: 300,
        model: 'Claude Code',
      })

      expect(metrics.value.totalCalls).toBe(1)
      expect(metrics.value.inputTokens).toBe(150)
      expect(metrics.value.outputTokens).toBe(300)
      expect(metrics.value.byModel['Claude Code']).toEqual({
        calls: 1,
        inputTokens: 150,
        outputTokens: 300,
        cost: expect.any(Number),
      })
    })

    it('should accumulate metrics for multiple messages from same model', async () => {
      const { useAIMetrics } = await import('./useAIMetrics')
      const { trackMessage, metrics } = useAIMetrics()

      trackMessage({
        inputTokens: 100,
        outputTokens: 200,
        model: 'Claude Code',
      })

      trackMessage({
        inputTokens: 50,
        outputTokens: 100,
        model: 'Claude Code',
      })

      expect(metrics.value.totalCalls).toBe(2)
      expect(metrics.value.inputTokens).toBe(150)
      expect(metrics.value.outputTokens).toBe(300)
      expect(metrics.value.byModel['Claude Code'].calls).toBe(2)
      expect(metrics.value.byModel['Claude Code'].inputTokens).toBe(150)
      expect(metrics.value.byModel['Claude Code'].outputTokens).toBe(300)
    })

    it('should track messages from different models separately', async () => {
      const { useAIMetrics } = await import('./useAIMetrics')
      const { trackMessage, metrics } = useAIMetrics()

      trackMessage({
        inputTokens: 100,
        outputTokens: 200,
        model: 'Claude Code',
      })

      trackMessage({
        inputTokens: 50,
        outputTokens: 100,
        model: 'GPT-5',
      })

      expect(metrics.value.totalCalls).toBe(2)
      expect(metrics.value.byModel['Claude Code']).toBeDefined()
      expect(metrics.value.byModel['GPT-5']).toBeDefined()
      expect(metrics.value.byModel['Claude Code'].calls).toBe(1)
      expect(metrics.value.byModel['GPT-5'].calls).toBe(1)
    })

    it('should log tracking information', async () => {
      const { useAIMetrics } = await import('./useAIMetrics')
      const { trackMessage } = useAIMetrics()

      trackMessage({
        inputTokens: 100,
        outputTokens: 200,
        model: 'Claude Code',
      })

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[AIMetrics] Tracked message:',
        expect.objectContaining({
          model: 'Claude Code',
          tokens: 300,
          cost: expect.any(String),
        })
      )
    })
  })

  describe('resetMetrics', () => {
    it('should reset all metrics to defaults', async () => {
      const { useAIMetrics } = await import('./useAIMetrics')
      const { trackMessage, resetMetrics, metrics } = useAIMetrics()

      // Add some data
      trackMessage({
        inputTokens: 100,
        outputTokens: 200,
        model: 'Claude Code',
      })

      expect(metrics.value.totalCalls).toBe(1)

      // Reset
      resetMetrics()

      expect(metrics.value.totalCalls).toBe(0)
      expect(metrics.value.inputTokens).toBe(0)
      expect(metrics.value.outputTokens).toBe(0)
      expect(metrics.value.estimatedCost).toBe(0)
      expect(metrics.value.byModel).toEqual({})
      expect(metrics.value.lastReset).toBeDefined()
    })

    it('should log reset action', async () => {
      const { useAIMetrics } = await import('./useAIMetrics')
      const { resetMetrics } = useAIMetrics()

      resetMetrics()

      expect(consoleLogSpy).toHaveBeenCalledWith('[AIMetrics] Metrics reset')
    })
  })

  describe('computed properties', () => {
    describe('totalTokens', () => {
      it('should return sum of input and output tokens', async () => {
        const { useAIMetrics } = await import('./useAIMetrics')
        const { trackMessage, totalTokens } = useAIMetrics()

        trackMessage({
          inputTokens: 150,
          outputTokens: 300,
          model: 'Claude Code',
        })

        expect(totalTokens.value).toBe(450)
      })

      it('should update when new messages are tracked', async () => {
        const { useAIMetrics } = await import('./useAIMetrics')
        const { trackMessage, totalTokens } = useAIMetrics()

        expect(totalTokens.value).toBe(0)

        trackMessage({
          inputTokens: 100,
          outputTokens: 200,
          model: 'Claude Code',
        })

        expect(totalTokens.value).toBe(300)

        trackMessage({
          inputTokens: 50,
          outputTokens: 100,
          model: 'Claude Code',
        })

        expect(totalTokens.value).toBe(450)
      })
    })

    describe('averageTokensPerCall', () => {
      it('should return 0 when no calls have been made', async () => {
        const { useAIMetrics } = await import('./useAIMetrics')
        const { averageTokensPerCall } = useAIMetrics()

        expect(averageTokensPerCall.value).toBe(0)
      })

      it('should calculate average correctly', async () => {
        const { useAIMetrics } = await import('./useAIMetrics')
        const { trackMessage, averageTokensPerCall } = useAIMetrics()

        trackMessage({
          inputTokens: 100,
          outputTokens: 200,
          model: 'Claude Code',
        })

        expect(averageTokensPerCall.value).toBe(300)

        trackMessage({
          inputTokens: 200,
          outputTokens: 400,
          model: 'Claude Code',
        })

        // Total: 900 tokens, 2 calls = 450 average
        expect(averageTokensPerCall.value).toBe(450)
      })

      it('should round to nearest integer', async () => {
        const { useAIMetrics } = await import('./useAIMetrics')
        const { trackMessage, averageTokensPerCall } = useAIMetrics()

        trackMessage({
          inputTokens: 100,
          outputTokens: 200,
          model: 'Claude Code',
        })

        trackMessage({
          inputTokens: 150,
          outputTokens: 250,
          model: 'Claude Code',
        })

        // Total: 700 tokens, 2 calls = 350 average
        expect(averageTokensPerCall.value).toBe(350)
      })
    })
  })

  describe('watch and auto-save', () => {
    it('should automatically save metrics when they change', async () => {
      const { useAIMetrics } = await import('./useAIMetrics')
      const { trackMessage } = useAIMetrics()

      trackMessage({
        inputTokens: 100,
        outputTokens: 200,
        model: 'Claude Code',
      })

      // Wait for watch to trigger
      await nextTick()

      expect(setItemSpy).toHaveBeenCalled()
      const savedData = JSON.parse(setItemSpy.mock.calls[0][1])
      expect(savedData.totalCalls).toBe(1)
    })

    it('should save after reset', async () => {
      const { useAIMetrics } = await import('./useAIMetrics')
      const { trackMessage, resetMetrics } = useAIMetrics()

      trackMessage({
        inputTokens: 100,
        outputTokens: 200,
        model: 'Claude Code',
      })

      await nextTick()
      setItemSpy.mockClear()

      resetMetrics()
      await nextTick()

      expect(setItemSpy).toHaveBeenCalled()
      const savedData = JSON.parse(setItemSpy.mock.calls[0][1])
      expect(savedData.totalCalls).toBe(0)
    })
  })

  describe('edge cases', () => {
    it('should handle zero tokens', async () => {
      const { useAIMetrics } = await import('./useAIMetrics')
      const { trackMessage, metrics } = useAIMetrics()

      trackMessage({
        inputTokens: 0,
        outputTokens: 0,
        model: 'Claude Code',
      })

      expect(metrics.value.estimatedCost).toBe(0)
      expect(metrics.value.totalCalls).toBe(1)
    })

    it('should handle very large token counts', async () => {
      const { useAIMetrics } = await import('./useAIMetrics')
      const { trackMessage, metrics } = useAIMetrics()

      trackMessage({
        inputTokens: 10000000, // 10M tokens
        outputTokens: 20000000, // 20M tokens
        model: 'Claude Code',
      })

      // $3 * 10 + $15 * 20 = $30 + $300 = $330
      expect(metrics.value.estimatedCost).toBeCloseTo(330, 0)
    })

    it('should maintain precision for small costs', async () => {
      const { useAIMetrics } = await import('./useAIMetrics')
      const { trackMessage, metrics } = useAIMetrics()

      trackMessage({
        inputTokens: 10, // Very small amount
        outputTokens: 20,
        model: 'Claude Code',
      })

      expect(metrics.value.estimatedCost).toBeGreaterThan(0)
      expect(metrics.value.estimatedCost).toBeLessThan(0.01)
    })
  })
})
