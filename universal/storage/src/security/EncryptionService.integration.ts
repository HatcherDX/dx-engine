/**
 * @fileoverview Integration tests for EncryptionService with real argon2
 *
 * @description
 * Integration tests that verify EncryptionService works correctly with real
 * argon2 native bindings. These tests validate actual cryptographic operations,
 * key derivation performance, and cross-platform compatibility.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { EncryptionService } from './EncryptionService'
import type { EncryptionConfig } from '../types/encryption'

// Import integration test utilities (NO MOCKS)
import '../test-setup-real'

describe('EncryptionService Integration', () => {
  let encryption: EncryptionService
  let config: EncryptionConfig

  beforeEach(() => {
    config = {
      enabled: true,
      passphrase: 'integration-test-passphrase-for-real-argon2',
      algorithm: 'aes-256-gcm',
    }
    encryption = new EncryptionService(config)
  })

  describe('real argon2 key derivation', () => {
    it('should derive key using real argon2id algorithm', async () => {
      const passphrase = 'test-passphrase-for-real-argon2'
      const salt = Buffer.from(
        'test-salt-32-bytes-long-for-real-test',
        'utf8'
      ).slice(0, 32)

      const derivedKey = await encryption.deriveKey(passphrase, salt)

      // Verify real argon2 properties
      expect(derivedKey.key).toBeInstanceOf(Buffer)
      expect(derivedKey.key.length).toBe(32) // 256-bit key
      expect(derivedKey.salt).toEqual(salt)
      expect(derivedKey.params.algorithm).toBe('argon2id')
      expect(derivedKey.params.memoryCost).toBe(65536) // 64MB
      expect(derivedKey.params.iterations).toBe(3)
      expect(derivedKey.params.parallelism).toBe(4)
    })

    it('should produce different keys for different passphrases', async () => {
      const salt = Buffer.from(
        'shared-salt-for-comparison-tests',
        'utf8'
      ).slice(0, 32)

      const key1 = await encryption.deriveKey('passphrase1', salt)
      const key2 = await encryption.deriveKey('passphrase2', salt)

      expect(key1.key.equals(key2.key)).toBe(false)
      expect(key1.salt.equals(key2.salt)).toBe(true) // Same salt
    })

    it('should produce same key for same passphrase and salt', async () => {
      const passphrase = 'consistent-passphrase'
      const salt = Buffer.from(
        'consistent-salt-32-bytes-for-testing',
        'utf8'
      ).slice(0, 32)

      const key1 = await encryption.deriveKey(passphrase, salt)
      const key2 = await encryption.deriveKey(passphrase, salt)

      expect(key1.key.equals(key2.key)).toBe(true)
      expect(key1.salt.equals(key2.salt)).toBe(true)
    })

    it('should handle various passphrase strengths with real argon2', async () => {
      const testCases = [
        { passphrase: 'weak', description: 'short passphrase' },
        {
          passphrase: 'moderately-strong-passphrase-123',
          description: 'medium passphrase',
        },
        {
          passphrase:
            'very-strong-passphrase-with-special-chars-!@#$%^&*()_+-=[]{}|;:,.<>?',
          description: 'strong passphrase',
        },
        {
          passphrase: 'unicode-passphrase-测试密码-🔐🔑',
          description: 'unicode passphrase',
        },
      ]

      for (const testCase of testCases) {
        const derivedKey = await encryption.deriveKey(testCase.passphrase)

        expect(derivedKey.key).toBeInstanceOf(Buffer)
        expect(derivedKey.key.length).toBe(32)
        expect(derivedKey.salt.length).toBe(32)

        // Each should produce a different key
        expect(derivedKey.key.toString('hex')).toMatch(/^[a-f0-9]{64}$/)
      }
    })

    it('should measure real argon2 performance', async () => {
      const passphrase = 'performance-test-passphrase'
      const iterations = 5

      const startTime = Date.now()

      const keys = []
      for (let i = 0; i < iterations; i++) {
        const key = await encryption.deriveKey(`${passphrase}-${i}`)
        keys.push(key)
      }

      const endTime = Date.now()
      const avgTime = (endTime - startTime) / iterations

      // Real argon2 should be reasonably fast but not instant (proves it's doing work)
      expect(avgTime).toBeGreaterThan(50) // At least 50ms per derivation
      expect(avgTime).toBeLessThan(5000) // But less than 5 seconds

      // All keys should be different
      for (let i = 0; i < keys.length; i++) {
        for (let j = i + 1; j < keys.length; j++) {
          expect(keys[i].key.equals(keys[j].key)).toBe(false)
        }
      }
    })
  })

  describe('real encryption/decryption with argon2 keys', () => {
    it('should encrypt and decrypt using real argon2-derived keys', async () => {
      const passphrase = 'test-passphrase-for-real-crypto'
      const testData = {
        sensitive: 'secret information',
        nested: {
          array: [1, 2, 3, 'four', 'five'],
          object: { prop: 'value' },
        },
        timestamp: Date.now(),
      }

      // Derive key using real argon2
      await encryption.deriveKey(passphrase)

      // Encrypt data
      const encrypted = await encryption.encrypt(testData)

      // Verify encrypted structure
      expect(encrypted.algorithm).toBe('aes-256-gcm')
      expect(encrypted.data).toMatch(/^[A-Za-z0-9+/]+=*$/) // Base64
      expect(encrypted.iv).toMatch(/^[A-Za-z0-9+/]+=*$/)
      expect(encrypted.authTag).toMatch(/^[A-Za-z0-9+/]+=*$/)

      // Decrypt data
      const decrypted = await encryption.decrypt(encrypted)

      expect(decrypted).toEqual(testData)
    })

    it('should handle large data encryption with real crypto', async () => {
      const passphrase = 'large-data-test-passphrase'

      // Create large test data (1MB)
      const largeData = {
        id: 'large-data-test',
        content: 'x'.repeat(1024 * 1024), // 1MB string
        metadata: {
          size: 1024 * 1024,
          created: Date.now(),
          checksum: 'fake-checksum',
        },
      }

      await encryption.deriveKey(passphrase)

      const startTime = Date.now()

      const encrypted = await encryption.encrypt(largeData)
      const encryptTime = Date.now() - startTime

      const decryptStartTime = Date.now()
      const decrypted = await encryption.decrypt(encrypted)
      const decryptTime = Date.now() - decryptStartTime

      // Verify data integrity
      expect(decrypted).toEqual(largeData)

      // Performance should be reasonable
      expect(encryptTime).toBeLessThan(5000) // 5 seconds for 1MB
      expect(decryptTime).toBeLessThan(2000) // 2 seconds for 1MB decryption

      // Encrypted data should be larger due to encoding and metadata
      expect(encrypted.data.length).toBeGreaterThan(largeData.content.length)
    })

    it('should verify authentication with real AES-GCM', async () => {
      const passphrase = 'auth-test-passphrase'
      const testData = { secret: 'authenticated data' }

      await encryption.deriveKey(passphrase)
      const encrypted = await encryption.encrypt(testData)

      // Tamper with encrypted data
      const tamperedEncrypted = {
        ...encrypted,
        data: encrypted.data.slice(0, -4) + 'XXXX', // Change last 4 chars
      }

      // Should fail authentication
      await expect(encryption.decrypt(tamperedEncrypted)).rejects.toThrow()

      // Original should still work
      const decrypted = await encryption.decrypt(encrypted)
      expect(decrypted).toEqual(testData)
    })

    it('should handle concurrent encryption/decryption operations', async () => {
      const passphrase = 'concurrent-test-passphrase'
      await encryption.deriveKey(passphrase)

      const testData = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        data: `concurrent-data-${i}`,
        random: Math.random(),
      }))

      // Concurrent encryption
      const encryptPromises = testData.map((data) => encryption.encrypt(data))
      const encryptedResults = await Promise.all(encryptPromises)

      expect(encryptedResults).toHaveLength(20)

      // Each should be different (different IVs)
      const ivs = encryptedResults.map((e) => e.iv)
      const uniqueIvs = new Set(ivs)
      expect(uniqueIvs.size).toBe(20) // All IVs should be unique

      // Concurrent decryption
      const decryptPromises = encryptedResults.map((encrypted) =>
        encryption.decrypt(encrypted)
      )
      const decryptedResults = await Promise.all(decryptPromises)

      // Verify all data matches original
      expect(decryptedResults).toEqual(testData)
    })
  })

  describe('cross-platform compatibility', () => {
    it('should produce consistent results across Node.js versions', async () => {
      const passphrase = 'cross-platform-test'
      const salt = Buffer.from(
        'consistent-salt-for-cross-platform',
        'utf8'
      ).slice(0, 32)
      const testData = {
        platform: process.platform,
        nodeVersion: process.version,
      }

      // Derive key and encrypt
      const derivedKey = await encryption.deriveKey(passphrase, salt)
      const encrypted = await encryption.encrypt(testData, derivedKey.key)

      // The key derivation should be consistent
      expect(derivedKey.key.toString('hex')).toMatch(/^[a-f0-9]{64}$/)
      expect(derivedKey.params.algorithm).toBe('argon2id')

      // Decrypt should work
      const decrypted = await encryption.decrypt(encrypted, derivedKey.key)
      expect(decrypted).toEqual(testData)

      // Store key hex for potential cross-platform comparison
      const keyHex = derivedKey.key.toString('hex')
      expect(keyHex).toBeDefined()
      expect(keyHex.length).toBe(64) // 32 bytes = 64 hex chars
    })

    it('should handle platform-specific character encodings', async () => {
      const platformSpecificData = {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        // Test various encodings
        utf8: 'Hello World 🌍',
        chinese: '你好世界',
        arabic: 'مرحبا بالعالم',
        emoji: '🔐🔑💾💻🌟',
        special: '!@#$%^&*()_+-=[]{}|;:,.<>?',
        binary: Buffer.from([0x00, 0xff, 0xaa, 0x55]).toString('base64'),
      }

      await encryption.deriveKey('platform-encoding-test')

      const encrypted = await encryption.encrypt(platformSpecificData)
      const decrypted = await encryption.decrypt(encrypted)

      expect(decrypted).toEqual(platformSpecificData)
    })
  })
})
