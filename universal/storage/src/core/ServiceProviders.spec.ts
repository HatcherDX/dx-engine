/**
 * @fileoverview Tests for service provider implementations
 *
 * @description
 * Comprehensive test suite for all service providers including
 * encryption, compression, cache, and mock providers.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  EncryptionServiceProvider,
  CompressionServiceProvider,
  CacheServiceProvider,
  MockServiceProvider,
} from './ServiceProviders'
import type { IEncryptionService } from '../types/encryption'
import type { CompressionService } from '../performance/CompressionService'
import type { CacheLayer } from '../performance/CacheLayer'
import type { StorageConfig } from '../types/storage'

// Mock the imports
vi.mock('../security/EncryptionService', () => ({
  EncryptionService: vi.fn().mockImplementation((config) => ({
    config,
    deriveKey: vi.fn().mockResolvedValue(undefined),
    encrypt: vi.fn().mockResolvedValue({
      data: 'encrypted',
      iv: 'iv',
      tag: 'tag',
      algorithm: 'aes-256-gcm',
    }),
    decrypt: vi.fn().mockResolvedValue('decrypted'),
    generateSalt: vi.fn().mockReturnValue('salt'),
  })),
}))

vi.mock('../performance/CompressionService', () => ({
  CompressionService: vi.fn().mockImplementation((config) => ({
    config,
    compress: vi.fn().mockResolvedValue({
      compressed: true,
      data: 'compressed',
      algorithm: 'gzip',
    }),
    decompress: vi.fn().mockResolvedValue('decompressed'),
    selectAlgorithm: vi.fn().mockReturnValue('gzip'),
  })),
}))

vi.mock('../performance/CacheLayer', () => ({
  CacheLayer: vi.fn().mockImplementation((config) => ({
    config,
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn(),
    has: vi.fn().mockReturnValue(false),
    size: vi.fn().mockReturnValue(0),
  })),
}))

describe('ServiceProviders', () => {
  describe('EncryptionServiceProvider', () => {
    let provider: EncryptionServiceProvider

    beforeEach(() => {
      provider = new EncryptionServiceProvider()
    })

    it('should have correct type identifier', () => {
      expect(provider.type).toBe('encryption')
    })

    it('should create encryption service with valid config', async () => {
      const config = {
        enabled: true,
        passphrase: 'test-passphrase',
        algorithm: 'aes-256-gcm' as const,
      }

      const service = await provider.create(config)

      expect(service).toBeDefined()
      expect(service.deriveKey).toBeDefined()
      expect(service.encrypt).toBeDefined()
      expect(service.decrypt).toBeDefined()
      expect(service.deriveKey).toHaveBeenCalledWith('test-passphrase')
    })

    it('should use default passphrase when not provided', async () => {
      const config = {
        enabled: true,
      }

      const service = await provider.create(config)

      expect(service).toBeDefined()
      expect(service.deriveKey).toHaveBeenCalledWith('default-key')
    })

    it('should throw error when config is not enabled', async () => {
      const config = {
        enabled: false,
      }

      await expect(provider.create(config)).rejects.toThrow(
        'Encryption configuration required'
      )
    })

    it('should throw error when config is undefined', async () => {
      await expect(provider.create(undefined)).rejects.toThrow(
        'Encryption configuration required'
      )
    })

    it('should throw error when config is null', async () => {
      await expect(provider.create(null)).rejects.toThrow(
        'Encryption configuration required'
      )
    })

    it('should handle encryption service operations', async () => {
      const config = {
        enabled: true,
        passphrase: 'secret',
      }

      const service = await provider.create(config)

      // Test encrypt
      const encrypted = await service.encrypt('test-data')
      expect(encrypted).toEqual({
        data: 'encrypted',
        iv: 'iv',
        tag: 'tag',
        algorithm: 'aes-256-gcm',
      })

      // Test decrypt
      const decrypted = await service.decrypt(encrypted)
      expect(decrypted).toBe('decrypted')

      // Test generateSalt
      const salt = service.generateSalt()
      expect(salt).toBe('salt')
    })
  })

  describe('CompressionServiceProvider', () => {
    let provider: CompressionServiceProvider

    beforeEach(() => {
      provider = new CompressionServiceProvider()
    })

    it('should have correct type identifier', () => {
      expect(provider.type).toBe('compression')
    })

    it('should create compression service with valid config', async () => {
      const config = {
        enabled: true,
        algorithm: 'auto' as const,
        minSize: 1024,
      }

      const service = await provider.create(config)

      expect(service).toBeDefined()
      expect(service.compress).toBeDefined()
      expect(service.decompress).toBeDefined()
      expect(service.selectAlgorithm).toBeDefined()
    })

    it('should throw error when config is not enabled', async () => {
      const config = {
        enabled: false,
      }

      await expect(provider.create(config)).rejects.toThrow(
        'Compression configuration required'
      )
    })

    it('should throw error when config is undefined', async () => {
      await expect(provider.create(undefined)).rejects.toThrow(
        'Compression configuration required'
      )
    })

    it('should throw error when config is null', async () => {
      await expect(provider.create(null)).rejects.toThrow(
        'Compression configuration required'
      )
    })

    it('should handle compression service operations', async () => {
      const config = {
        enabled: true,
        algorithm: 'gzip' as const,
        minSize: 100,
      }

      const service = await provider.create(config)

      // Test compress
      const compressed = await service.compress('large-data')
      expect(compressed).toEqual({
        compressed: true,
        data: 'compressed',
        algorithm: 'gzip',
      })

      // Test decompress
      const decompressed = await service.decompress(compressed)
      expect(decompressed).toBe('decompressed')

      // Test selectAlgorithm
      const algorithm = service.selectAlgorithm('test-data')
      expect(algorithm).toBe('gzip')
    })

    it('should create service with minimal config', async () => {
      const config = {
        enabled: true,
      }

      const service = await provider.create(config)
      expect(service).toBeDefined()
    })
  })

  describe('CacheServiceProvider', () => {
    let provider: CacheServiceProvider

    beforeEach(() => {
      provider = new CacheServiceProvider()
    })

    it('should have correct type identifier', () => {
      expect(provider.type).toBe('cache')
    })

    it('should create cache layer with valid config', async () => {
      const config = {
        maxSize: 100,
        ttl: 60000,
      }

      const cache = await provider.create(config)

      expect(cache).toBeDefined()
      expect(cache.get).toBeDefined()
      expect(cache.set).toBeDefined()
      expect(cache.delete).toBeDefined()
      expect(cache.clear).toBeDefined()
      expect(cache.has).toBeDefined()
      expect(cache.size).toBeDefined()
    })

    it('should throw error when config is undefined', async () => {
      await expect(provider.create(undefined)).rejects.toThrow(
        'Cache configuration required'
      )
    })

    it('should throw error when config is null', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing null config scenario requires any type
      await expect(provider.create(null as any)).rejects.toThrow(
        'Cache configuration required'
      )
    })

    it('should handle cache operations', async () => {
      const config = {
        maxSize: 10,
        ttl: 5000,
      }

      const cache = await provider.create(config)

      // Test cache operations
      cache.set('key', 'value')
      expect(cache.has('key')).toBe(false) // Mocked to return false
      expect(cache.size()).toBe(0) // Mocked to return 0

      cache.delete('key')
      cache.clear()

      // These are mocked, so they don't actually store/retrieve
      const value = cache.get('key')
      expect(value).toBeUndefined()
    })

    it('should create cache with minimal config', async () => {
      const config = {
        maxSize: 1,
      }

      const cache = await provider.create(config)
      expect(cache).toBeDefined()
    })

    it('should create cache with all options', async () => {
      const config = {
        maxSize: 100,
        ttl: 60000,
        updateOnGet: true,
      }

      const cache = await provider.create(config)
      expect(cache).toBeDefined()
      expect(cache.config).toEqual(config)
    })
  })

  describe('MockServiceProvider', () => {
    it('should create provider with correct type', () => {
      const mockService = { test: 'value' }
      const provider = new MockServiceProvider('test-type', mockService)

      expect(provider.type).toBe('test-type')
    })

    it('should return mock service', async () => {
      const mockService = {
        encrypt: vi.fn(),
        decrypt: vi.fn(),
        deriveKey: vi.fn(),
        generateSalt: vi.fn(),
      } as IEncryptionService

      const provider = new MockServiceProvider('encryption', mockService)
      const service = await provider.create({ enabled: true })

      expect(service).toBe(mockService)
    })

    it('should ignore config parameter', async () => {
      const mockService = { data: 'mock' }
      const provider = new MockServiceProvider('custom', mockService)

      const service1 = await provider.create({ option: 'a' })
      const service2 = await provider.create({ option: 'b' })
      const service3 = await provider.create()

      expect(service1).toBe(mockService)
      expect(service2).toBe(mockService)
      expect(service3).toBe(mockService)
    })

    it('should work with different service types', async () => {
      // Mock encryption service
      const mockEncryption = {
        encrypt: vi.fn().mockResolvedValue({ data: 'encrypted' }),
        decrypt: vi.fn().mockResolvedValue('decrypted'),
        deriveKey: vi.fn(),
        generateSalt: vi.fn().mockReturnValue('salt'),
      } as IEncryptionService

      const encProvider = new MockServiceProvider('encryption', mockEncryption)
      const encService = await encProvider.create()
      expect(encService).toBe(mockEncryption)

      // Mock compression service
      const mockCompression = {
        compress: vi.fn().mockResolvedValue({ data: 'compressed' }),
        decompress: vi.fn().mockResolvedValue('decompressed'),
        selectAlgorithm: vi.fn().mockReturnValue('gzip'),
      } as CompressionService

      const compProvider = new MockServiceProvider(
        'compression',
        mockCompression
      )
      const compService = await compProvider.create()
      expect(compService).toBe(mockCompression)

      // Mock cache layer
      const mockCache = {
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
        clear: vi.fn(),
        has: vi.fn().mockReturnValue(true),
        size: vi.fn().mockReturnValue(5),
      } as CacheLayer

      const cacheProvider = new MockServiceProvider('cache', mockCache)
      const cacheService = await cacheProvider.create()
      expect(cacheService).toBe(mockCache)
    })

    it('should maintain reference to same mock instance', async () => {
      const mockService = { id: Math.random() }
      const provider = new MockServiceProvider('test', mockService)

      const instance1 = await provider.create()
      const instance2 = await provider.create()

      expect(instance1).toBe(instance2)
      expect(instance1.id).toBe(instance2.id)
    })

    it('should work with complex mock objects', async () => {
      const complexMock = {
        method1: vi.fn().mockReturnValue('result1'),
        method2: vi.fn().mockResolvedValue('result2'),
        property: 'value',
        nested: {
          deep: {
            value: 42,
          },
        },
      }

      const provider = new MockServiceProvider('complex', complexMock)
      const service = await provider.create()

      expect(service.property).toBe('value')
      expect(service.nested.deep.value).toBe(42)
      expect(service.method1()).toBe('result1')
      expect(await service.method2()).toBe('result2')
    })

    it('should allow different mock providers with same type', () => {
      const mock1 = { id: 1 }
      const mock2 = { id: 2 }

      const provider1 = new MockServiceProvider('same-type', mock1)
      const provider2 = new MockServiceProvider('same-type', mock2)

      expect(provider1.type).toBe('same-type')
      expect(provider2.type).toBe('same-type')
      expect(provider1).not.toBe(provider2)
    })
  })

  describe('ServiceProvider interface compliance', () => {
    it('should ensure all providers implement ServiceProvider interface', async () => {
      const providers = [
        new EncryptionServiceProvider(),
        new CompressionServiceProvider(),
        new CacheServiceProvider(),
        new MockServiceProvider('test', {}),
      ]

      for (const provider of providers) {
        expect(provider).toHaveProperty('type')
        expect(provider).toHaveProperty('create')
        expect(typeof provider.type).toBe('string')
        expect(typeof provider.create).toBe('function')
      }
    })
  })

  describe('Integration scenarios', () => {
    it('should work with multiple providers together', async () => {
      const encProvider = new EncryptionServiceProvider()
      const compProvider = new CompressionServiceProvider()
      const cacheProvider = new CacheServiceProvider()

      const config: StorageConfig = {
        type: 'memory',
        encryption: {
          enabled: true,
          passphrase: 'secret',
        },
        compression: {
          enabled: true,
          minSize: 100,
        },
        cache: {
          maxSize: 50,
          ttl: 30000,
        },
      }

      // Create all services
      const [encService, compService, cacheService] = await Promise.all([
        encProvider.create(config.encryption),
        compProvider.create(config.compression),
        cacheProvider.create(config.cache),
      ])

      expect(encService).toBeDefined()
      expect(compService).toBeDefined()
      expect(cacheService).toBeDefined()
    })

    it('should handle provider errors gracefully', async () => {
      const providers = [
        new EncryptionServiceProvider(),
        new CompressionServiceProvider(),
        new CacheServiceProvider(),
      ]

      const errors = await Promise.allSettled([
        providers[0].create(null),
        providers[1].create(undefined),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing null config scenario requires any type
        providers[2].create(null as any),
      ])

      errors.forEach((result) => {
        expect(result.status).toBe('rejected')
        if (result.status === 'rejected') {
          expect(result.reason).toBeInstanceOf(Error)
          expect(result.reason.message).toContain('configuration required')
        }
      })
    })

    it('should allow mixing real and mock providers', async () => {
      const mockEncryption = {
        encrypt: vi.fn().mockResolvedValue({ data: 'mocked' }),
        decrypt: vi.fn().mockResolvedValue('mocked'),
        deriveKey: vi.fn(),
        generateSalt: vi.fn(),
      } as IEncryptionService

      const mockProvider = new MockServiceProvider('encryption', mockEncryption)
      const realProvider = new CompressionServiceProvider()

      const [mockService, realService] = await Promise.all([
        mockProvider.create({}),
        realProvider.create({ enabled: true }),
      ])

      expect(mockService).toBe(mockEncryption)
      expect(realService).toBeDefined()
      expect(realService.compress).toBeDefined()
    })
  })
})
