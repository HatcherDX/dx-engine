/**
 * @fileoverview Tests for AIProviderRegistry.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AIProviderRegistry, aiProviderRegistry } from './AIProviderRegistry'
import type { AIProvider } from './AIProvider'
import type {
  SendMessageParams,
  AIResponse,
  AIChunk,
  AIMessage,
  ProviderCapabilities,
} from './types'

describe('AIProviderRegistry', () => {
  let registry: AIProviderRegistry
  let mockProvider1: AIProvider
  let mockProvider2: AIProvider
  let mockProvider3: AIProvider

  beforeEach(() => {
    registry = new AIProviderRegistry()

    // Create mock providers
    mockProvider1 = {
      name: 'provider1',
      isAvailable: vi.fn().mockResolvedValue(true),
      sendMessage: vi.fn() as unknown as (
        params: SendMessageParams
      ) => Promise<AIResponse>,
      streamMessage: vi.fn() as unknown as (
        params: SendMessageParams
      ) => AsyncGenerator<AIChunk>,
      getConversation: vi.fn() as unknown as (
        sessionId: string
      ) => Promise<AIMessage[]>,
      clearConversation: vi.fn() as unknown as (
        sessionId: string
      ) => Promise<void>,
      getCapabilities: vi.fn() as unknown as () => ProviderCapabilities,
    }

    mockProvider2 = {
      name: 'provider2',
      isAvailable: vi.fn().mockResolvedValue(true),
      sendMessage: vi.fn() as unknown as (
        params: SendMessageParams
      ) => Promise<AIResponse>,
      streamMessage: vi.fn() as unknown as (
        params: SendMessageParams
      ) => AsyncGenerator<AIChunk>,
      getConversation: vi.fn() as unknown as (
        sessionId: string
      ) => Promise<AIMessage[]>,
      clearConversation: vi.fn() as unknown as (
        sessionId: string
      ) => Promise<void>,
      getCapabilities: vi.fn() as unknown as () => ProviderCapabilities,
    }

    mockProvider3 = {
      name: 'provider3',
      isAvailable: vi.fn().mockResolvedValue(false),
      sendMessage: vi.fn() as unknown as (
        params: SendMessageParams
      ) => Promise<AIResponse>,
      streamMessage: vi.fn() as unknown as (
        params: SendMessageParams
      ) => AsyncGenerator<AIChunk>,
      getConversation: vi.fn() as unknown as (
        sessionId: string
      ) => Promise<AIMessage[]>,
      clearConversation: vi.fn() as unknown as (
        sessionId: string
      ) => Promise<void>,
      getCapabilities: vi.fn() as unknown as () => ProviderCapabilities,
    }
  })

  describe('register', () => {
    it('should register a provider', () => {
      registry.register(mockProvider1)

      const provider = registry.getProvider('provider1')
      expect(provider).toBe(mockProvider1)
    })

    it('should set first registered provider as default', () => {
      registry.register(mockProvider1)

      const defaultProvider = registry.getProvider()
      expect(defaultProvider).toBe(mockProvider1)
    })

    it('should not change default when registering second provider', () => {
      registry.register(mockProvider1)
      registry.register(mockProvider2)

      const defaultProvider = registry.getProvider()
      expect(defaultProvider).toBe(mockProvider1)
    })

    it('should allow replacing a provider with same name', () => {
      registry.register(mockProvider1)

      const replacementProvider = {
        ...mockProvider1,
        isAvailable: vi.fn().mockResolvedValue(false),
      }
      registry.register(replacementProvider)

      const provider = registry.getProvider('provider1')
      expect(provider).toBe(replacementProvider)
    })
  })

  describe('getProvider', () => {
    beforeEach(() => {
      registry.register(mockProvider1)
      registry.register(mockProvider2)
    })

    it('should return provider by name', () => {
      const provider = registry.getProvider('provider2')
      expect(provider).toBe(mockProvider2)
    })

    it('should return default provider when no name provided', () => {
      const provider = registry.getProvider()
      expect(provider).toBe(mockProvider1)
    })

    it('should return undefined for non-existent provider', () => {
      const provider = registry.getProvider('non-existent')
      expect(provider).toBeUndefined()
    })

    it('should return undefined when no providers registered', () => {
      const emptyRegistry = new AIProviderRegistry()
      const provider = emptyRegistry.getProvider()
      expect(provider).toBeUndefined()
    })

    it('should return undefined when empty string provided and no default', () => {
      const emptyRegistry = new AIProviderRegistry()
      const provider = emptyRegistry.getProvider('')
      expect(provider).toBeUndefined()
    })
  })

  describe('getAllProviders', () => {
    it('should return empty array when no providers registered', () => {
      const providers = registry.getAllProviders()
      expect(providers).toEqual([])
    })

    it('should return all registered providers', () => {
      registry.register(mockProvider1)
      registry.register(mockProvider2)
      registry.register(mockProvider3)

      const providers = registry.getAllProviders()
      expect(providers).toHaveLength(3)
      expect(providers).toContain(mockProvider1)
      expect(providers).toContain(mockProvider2)
      expect(providers).toContain(mockProvider3)
    })

    it('should return array copy, not internal map', () => {
      registry.register(mockProvider1)

      const providers1 = registry.getAllProviders()
      const providers2 = registry.getAllProviders()

      expect(providers1).not.toBe(providers2)
      expect(providers1).toEqual(providers2)
    })
  })

  describe('getAvailableProviders', () => {
    it('should return empty array when no providers registered', async () => {
      const providers = await registry.getAvailableProviders()
      expect(providers).toEqual([])
    })

    it('should return only available providers', async () => {
      registry.register(mockProvider1) // available: true
      registry.register(mockProvider2) // available: true
      registry.register(mockProvider3) // available: false

      const providers = await registry.getAvailableProviders()

      expect(providers).toHaveLength(2)
      expect(providers).toContain(mockProvider1)
      expect(providers).toContain(mockProvider2)
      expect(providers).not.toContain(mockProvider3)
    })

    it('should call isAvailable on all providers', async () => {
      registry.register(mockProvider1)
      registry.register(mockProvider2)
      registry.register(mockProvider3)

      await registry.getAvailableProviders()

      expect(mockProvider1.isAvailable).toHaveBeenCalled()
      expect(mockProvider2.isAvailable).toHaveBeenCalled()
      expect(mockProvider3.isAvailable).toHaveBeenCalled()
    })

    it('should return empty array when no providers are available', async () => {
      const unavailableProvider = {
        ...mockProvider1,
        isAvailable: vi.fn().mockResolvedValue(false),
      }
      registry.register(unavailableProvider)

      const providers = await registry.getAvailableProviders()
      expect(providers).toEqual([])
    })

    it('should handle async isAvailable calls correctly', async () => {
      const slowProvider = {
        ...mockProvider1,
        name: 'slow-provider',
        isAvailable: vi.fn().mockImplementation(
          () =>
            new Promise((resolve) => {
              setTimeout(() => resolve(true), 50)
            })
        ),
      }

      registry.register(slowProvider)
      registry.register(mockProvider2)

      const providers = await registry.getAvailableProviders()

      expect(providers).toHaveLength(2)
      expect(slowProvider.isAvailable).toHaveBeenCalled()
    })
  })

  describe('setDefault', () => {
    beforeEach(() => {
      registry.register(mockProvider1)
      registry.register(mockProvider2)
    })

    it('should set default provider', () => {
      registry.setDefault('provider2')

      const provider = registry.getProvider()
      expect(provider).toBe(mockProvider2)
    })

    it('should throw error when provider not registered', () => {
      expect(() => {
        registry.setDefault('non-existent')
      }).toThrow('Provider not registered: non-existent')
    })

    it('should allow setting same provider as default multiple times', () => {
      registry.setDefault('provider1')
      registry.setDefault('provider1')

      const provider = registry.getProvider()
      expect(provider).toBe(mockProvider1)
    })
  })

  describe('unregister', () => {
    beforeEach(() => {
      registry.register(mockProvider1)
      registry.register(mockProvider2)
      registry.register(mockProvider3)
    })

    it('should remove provider', () => {
      registry.unregister('provider2')

      const provider = registry.getProvider('provider2')
      expect(provider).toBeUndefined()
    })

    it('should not affect other providers', () => {
      registry.unregister('provider2')

      expect(registry.getProvider('provider1')).toBe(mockProvider1)
      expect(registry.getProvider('provider3')).toBe(mockProvider3)
    })

    it('should reset default when unregistering default provider', () => {
      // provider1 is default
      expect(registry.getProvider()).toBe(mockProvider1)

      registry.unregister('provider1')

      // Should fall back to next available provider
      const newDefault = registry.getProvider()
      expect(newDefault).toBeDefined()
      expect(newDefault).not.toBe(mockProvider1)
    })

    it('should set default to first remaining provider after unregistering default', () => {
      registry.unregister('provider1')

      const defaultProvider = registry.getProvider()
      // Should be provider2 (first in remaining providers)
      expect(defaultProvider?.name).toBe('provider2')
    })

    it('should set default to undefined when unregistering last provider', () => {
      registry.unregister('provider1')
      registry.unregister('provider2')
      registry.unregister('provider3')

      const provider = registry.getProvider()
      expect(provider).toBeUndefined()
    })

    it('should handle unregistering non-existent provider gracefully', () => {
      expect(() => {
        registry.unregister('non-existent')
      }).not.toThrow()
    })

    it('should not reset default when unregistering non-default provider', () => {
      registry.unregister('provider2')

      const defaultProvider = registry.getProvider()
      expect(defaultProvider).toBe(mockProvider1)
    })
  })

  describe('global singleton', () => {
    it('should export aiProviderRegistry singleton', () => {
      expect(aiProviderRegistry).toBeInstanceOf(AIProviderRegistry)
    })

    it('should be the same instance across imports', () => {
      // This test verifies that aiProviderRegistry is a singleton
      const provider = {
        ...mockProvider1,
        name: 'test-singleton',
      }

      aiProviderRegistry.register(provider)

      // Should be able to retrieve the same provider
      const retrieved = aiProviderRegistry.getProvider('test-singleton')
      expect(retrieved).toBe(provider)

      // Cleanup
      aiProviderRegistry.unregister('test-singleton')
    })
  })
})
