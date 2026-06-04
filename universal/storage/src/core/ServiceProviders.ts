/**
 * @fileoverview Service provider implementations for storage adapter dependencies
 *
 * @description
 * Implements the Strategy pattern for creating and providing services to storage adapters.
 * This allows for better testability and flexibility by enabling dependency injection
 * and mock implementations.
 *
 * @example
 * ```typescript
 * const encryptionProvider = new EncryptionServiceProvider()
 * const service = await encryptionProvider.create(config)
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import type { IEncryptionService } from '../types/encryption'
import type { CompressionService } from '../performance/CompressionService'
import type { CacheLayer } from '../performance/CacheLayer'
import type { StorageConfig } from '../types/storage'

/**
 * Generic service provider interface
 *
 * @remarks
 * Defines the contract for creating service instances based on configuration.
 * Implementations should handle service initialization and configuration.
 *
 * @typeParam T - The type of service this provider creates
 *
 * @public
 */
export interface ServiceProvider<T> {
  /**
   * Creates and initializes a service instance
   *
   * @param config - Configuration for the service
   * @returns Promise that resolves to the initialized service
   *
   * @throws {Error} If service creation or initialization fails
   */
  create(config: unknown): Promise<T>

  /**
   * Unique identifier for this provider type
   */
  readonly type: string
}

/**
 * Provider for encryption services
 *
 * @remarks
 * Creates and initializes encryption service instances with proper key derivation.
 *
 * @example
 * ```typescript
 * const provider = new EncryptionServiceProvider()
 * const encryptionService = await provider.create({
 *   enabled: true,
 *   passphrase: 'secret-key',
 *   algorithm: 'aes-256-gcm'
 * })
 * ```
 *
 * @public
 */
export class EncryptionServiceProvider
  implements ServiceProvider<IEncryptionService>
{
  /**
   * Provider type identifier
   */
  readonly type = 'encryption'

  /**
   * Creates an encryption service instance
   *
   * @param config - Encryption configuration
   * @returns Promise that resolves to initialized encryption service
   *
   * @throws {Error} If encryption service creation fails
   */
  async create(
    config: StorageConfig['encryption']
  ): Promise<IEncryptionService> {
    if (!config?.enabled) {
      throw new Error('Encryption configuration required')
    }

    const { EncryptionService } = await import('../security/EncryptionService')
    const service = new EncryptionService(config)
    await service.deriveKey(config.passphrase || 'default-key')
    return service
  }
}

/**
 * Provider for compression services
 *
 * @remarks
 * Creates compression service instances with specified algorithm configuration.
 *
 * @example
 * ```typescript
 * const provider = new CompressionServiceProvider()
 * const compressionService = await provider.create({
 *   enabled: true,
 *   algorithm: 'auto',
 *   minSize: 1024
 * })
 * ```
 *
 * @public
 */
export class CompressionServiceProvider
  implements ServiceProvider<CompressionService>
{
  /**
   * Provider type identifier
   */
  readonly type = 'compression'

  /**
   * Creates a compression service instance
   *
   * @param config - Compression configuration
   * @returns Promise that resolves to compression service
   *
   * @throws {Error} If compression service creation fails
   */
  async create(
    config: StorageConfig['compression']
  ): Promise<CompressionService> {
    if (!config?.enabled) {
      throw new Error('Compression configuration required')
    }

    const { CompressionService } = await import(
      '../performance/CompressionService'
    )
    return new CompressionService(config)
  }
}

/**
 * Provider for cache layer services
 *
 * @remarks
 * Creates cache layer instances with size and TTL configuration.
 *
 * @example
 * ```typescript
 * const provider = new CacheServiceProvider()
 * const cacheLayer = await provider.create({
 *   maxSize: 100,
 *   ttl: 60000
 * })
 * ```
 *
 * @public
 */
export class CacheServiceProvider implements ServiceProvider<CacheLayer> {
  /**
   * Provider type identifier
   */
  readonly type = 'cache'

  /**
   * Creates a cache layer instance
   *
   * @param config - Cache configuration
   * @returns Promise that resolves to cache layer
   *
   * @throws {Error} If cache layer creation fails
   */
  async create(config: StorageConfig['cache']): Promise<CacheLayer> {
    if (!config) {
      throw new Error('Cache configuration required')
    }

    const { CacheLayer } = await import('../performance/CacheLayer')
    return new CacheLayer(config)
  }
}

/**
 * Mock service provider for testing
 *
 * @remarks
 * Provides pre-configured mock services for testing purposes.
 *
 * @typeParam T - The type of service being mocked
 *
 * @example
 * ```typescript
 * const mockEncryption = { encrypt: jest.fn() }
 * const provider = new MockServiceProvider('encryption', mockEncryption)
 * const service = await provider.create({})
 * ```
 *
 * @public
 */
export class MockServiceProvider<T> implements ServiceProvider<T> {
  /**
   * Creates a mock service provider
   *
   * @param type - Provider type identifier
   * @param mockService - The mock service instance to provide
   */
  constructor(
    public readonly type: string,
    private mockService: T
  ) {}

  /**
   * Returns the mock service instance
   *
   * @param _ - Configuration (ignored for mocks)
   * @returns Promise that resolves to the mock service
   */
  async create(_?: unknown): Promise<T> {
    return this.mockService
  }
}

/**
 * Service provider options for storage adapters
 *
 * @remarks
 * Optional providers that can be injected into storage adapters
 * for dependency injection and testing.
 *
 * @public
 */
export interface ServiceProviderOptions {
  /**
   * Optional encryption service provider
   */
  encryptionProvider?: ServiceProvider<IEncryptionService>

  /**
   * Optional compression service provider
   */
  compressionProvider?: ServiceProvider<CompressionService>

  /**
   * Optional cache service provider
   */
  cacheProvider?: ServiceProvider<CacheLayer>
}
