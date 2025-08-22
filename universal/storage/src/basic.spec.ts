/**
 * @fileoverview Basic functionality tests for storage module
 *
 * @description
 * Simple tests to verify core storage functionality works correctly
 * without complex mocking or setup requirements.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { describe, it, expect } from 'vitest'
import { MemoryAdapter } from './adapters/MemoryAdapter'
import { EncryptionService } from './security/EncryptionService'

describe('Basic Storage Functionality', () => {
  describe('MemoryAdapter', () => {
    it('should create and initialize successfully', async () => {
      const adapter = new MemoryAdapter({
        type: 'memory',
        encryption: { enabled: false },
        compression: { enabled: false },
      })

      await expect(adapter.initialize()).resolves.not.toThrow()
      expect(adapter.type).toBe('memory')
    })

    it('should store and retrieve basic data', async () => {
      const adapter = new MemoryAdapter({
        type: 'memory',
        encryption: { enabled: false },
        compression: { enabled: false },
      })

      await adapter.initialize()

      const testData = { message: 'Hello World', id: 123 }
      await adapter.set('test-key', testData)

      const retrieved = await adapter.get('test-key')
      expect(retrieved).toEqual(testData)
    })

    it('should handle non-existent keys', async () => {
      const adapter = new MemoryAdapter({
        type: 'memory',
        encryption: { enabled: false },
        compression: { enabled: false },
      })

      await adapter.initialize()

      const result = await adapter.get('non-existent-key')
      expect(result).toBeNull()
    })
  })

  describe('EncryptionService', () => {
    it('should create encryption service', () => {
      const service = new EncryptionService({
        enabled: true,
        passphrase: 'test-passphrase',
        algorithm: 'aes-256-gcm',
      })

      expect(service).toBeDefined()
    })

    it('should derive key from passphrase', async () => {
      const service = new EncryptionService({
        enabled: true,
        passphrase: 'test-passphrase',
        algorithm: 'aes-256-gcm',
      })

      const derivedKey = await service.deriveKey('test-passphrase')

      expect(derivedKey.key).toBeInstanceOf(Buffer)
      expect(derivedKey.key.length).toBe(32) // 256 bits
      expect(derivedKey.params.algorithm).toBe('argon2id')
    })

    it('should generate random keys', () => {
      const key1 = EncryptionService.generateRandomKey()
      const key2 = EncryptionService.generateRandomKey()

      expect(key1).toBeInstanceOf(Buffer)
      expect(key1.length).toBe(32)
      expect(key1.equals(key2)).toBe(false)
    })
  })
})
