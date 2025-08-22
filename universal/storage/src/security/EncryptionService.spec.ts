/**
 * @fileoverview Tests for EncryptionService security functionality
 *
 * @description
 * Comprehensive security tests for AES-256-GCM encryption with Argon2
 * key derivation, including edge cases and attack resistance verification.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { EncryptionService } from './EncryptionService'
import type { EncryptionConfig } from '../types/encryption'

describe('EncryptionService', () => {
  let encryption: EncryptionService
  let config: EncryptionConfig

  beforeEach(() => {
    config = {
      enabled: true,
      passphrase: 'test-passphrase-for-encryption',
      algorithm: 'aes-256-gcm',
    }
    encryption = new EncryptionService(config)
  })

  describe('key derivation', () => {
    it('should derive key from passphrase using Argon2', async () => {
      const derivedKey = await encryption.deriveKey('test-passphrase')

      expect(derivedKey.key).toBeInstanceOf(Buffer)
      expect(derivedKey.key.length).toBe(32) // 256 bits
      expect(derivedKey.salt).toBeInstanceOf(Buffer)
      expect(derivedKey.params.algorithm).toBe('argon2id')
    })

    it('should use provided salt for consistent derivation', async () => {
      const salt = Buffer.from(
        'test-salt-1234567890123456789012345678901234567890',
        'utf8'
      ).slice(0, 32)

      const key1 = await encryption.deriveKey('passphrase', salt)
      const key2 = await encryption.deriveKey('passphrase', salt)

      expect(key1.key.equals(key2.key)).toBe(true)
    })

    it('should generate different keys for different passphrases', async () => {
      const key1 = await encryption.deriveKey('passphrase1')
      const key2 = await encryption.deriveKey('passphrase2')

      expect(key1.key.equals(key2.key)).toBe(false)
    })

    it('should cache derived keys for performance', async () => {
      const salt = Buffer.alloc(32, 'test')

      const start1 = performance.now()
      await encryption.deriveKey('test', salt)
      const time1 = performance.now() - start1

      const start2 = performance.now()
      await encryption.deriveKey('test', salt)
      const time2 = performance.now() - start2

      // Second call should be significantly faster (cached)
      expect(time2).toBeLessThan(time1 * 0.1)
    })
  })

  describe('encryption and decryption', () => {
    beforeEach(async () => {
      await encryption.deriveKey(config.passphrase!)
    })

    it('should encrypt and decrypt simple data', async () => {
      const testData = { message: 'secret data', number: 42 }

      const encrypted = await encryption.encrypt(testData)
      const decrypted = await encryption.decrypt(encrypted)

      expect(decrypted).toEqual(testData)
    })

    it('should encrypt and decrypt complex nested data', async () => {
      const complexData = {
        user: {
          id: 123,
          profile: {
            name: 'John Doe',
            preferences: {
              theme: 'dark',
              notifications: true,
              settings: [1, 2, 3, { nested: 'value' }],
            },
          },
        },
        metadata: {
          version: '1.0.0',
          timestamp: Date.now(),
        },
      }

      const encrypted = await encryption.encrypt(complexData)
      const decrypted = await encryption.decrypt(encrypted)

      expect(decrypted).toEqual(complexData)
    })

    it('should generate unique ciphertext for same data', async () => {
      const data = 'same data'

      const encrypted1 = await encryption.encrypt(data)
      const encrypted2 = await encryption.encrypt(data)

      // Should be different due to random IV
      expect(encrypted1.data).not.toBe(encrypted2.data)
      expect(encrypted1.iv).not.toBe(encrypted2.iv)

      // But both should decrypt to same value
      const decrypted1 = await encryption.decrypt(encrypted1)
      const decrypted2 = await encryption.decrypt(encrypted2)
      expect(decrypted1).toBe(data)
      expect(decrypted2).toBe(data)
    })

    it('should detect tampered data', async () => {
      const data = 'sensitive information'
      const encrypted = await encryption.encrypt(data)

      // Tamper with encrypted data
      encrypted.data = encrypted.data.replace(/.$/, 'X')

      await expect(encryption.decrypt(encrypted)).rejects.toThrow(
        'Decryption failed'
      )
    })

    it('should handle large data efficiently', async () => {
      const largeData = 'x'.repeat(100000) // 100KB string

      const start = performance.now()
      const encrypted = await encryption.encrypt(largeData)
      const decrypted = await encryption.decrypt(encrypted)
      const time = performance.now() - start

      expect(decrypted).toBe(largeData)
      expect(time).toBeLessThan(1000) // Should complete within 1 second
    })
  })

  describe('field-level encryption', () => {
    beforeEach(async () => {
      await encryption.deriveKey(config.passphrase!)
    })

    it('should encrypt specific fields in object', async () => {
      const userData = {
        id: 123,
        email: 'user@example.com',
        password: 'secret-password',
        profile: {
          name: 'John',
          ssn: '123-45-6789',
        },
      }

      const encrypted = await encryption.encryptFields(userData, [
        'password',
        'profile.ssn',
      ])

      // Regular fields should be unchanged
      expect(encrypted.id).toBe(123)
      expect(encrypted.email).toBe('user@example.com')
      expect(encrypted.profile.name).toBe('John')

      // Encrypted fields should be EncryptedData objects
      expect(encryption.isEncrypted(encrypted.password)).toBe(true)
      expect(encryption.isEncrypted(encrypted.profile.ssn)).toBe(true)
    })

    it('should decrypt specific fields in object', async () => {
      const originalData = {
        public: 'public info',
        secret: 'secret info',
        nested: { secret: 'nested secret' },
      }

      // Encrypt fields
      const encrypted = await encryption.encryptFields(originalData, [
        'secret',
        'nested.secret',
      ])

      // Decrypt fields
      const decrypted = await encryption.decryptFields(encrypted, [
        'secret',
        'nested.secret',
      ])

      expect(decrypted).toEqual(originalData)
    })
  })

  describe('isEncrypted detection', () => {
    it('should correctly identify encrypted data', async () => {
      await encryption.deriveKey(config.passphrase!)

      const data = 'test data'
      const encrypted = await encryption.encrypt(data)

      expect(encryption.isEncrypted(encrypted)).toBe(true)
      expect(encryption.isEncrypted(data)).toBe(false)
      expect(encryption.isEncrypted(null)).toBe(false)
      expect(encryption.isEncrypted(undefined)).toBe(false)
      expect(encryption.isEncrypted({})).toBe(false)
    })

    it('should handle malformed encrypted data', () => {
      const malformed = {
        data: 'some-data',
        iv: 'some-iv',
        // Missing authTag and algorithm
      }

      expect(encryption.isEncrypted(malformed)).toBe(false)
    })
  })

  describe('passphrase strength analysis', () => {
    it('should analyze weak passphrases', () => {
      const analysis = EncryptionService.analyzePassphraseStrength('123')

      expect(analysis.score).toBeLessThan(30)
      expect(analysis.issues).toContain('Too short')
      expect(analysis.recommendations).toContain('Use at least 12 characters')
    })

    it('should analyze strong passphrases', () => {
      const analysis = EncryptionService.analyzePassphraseStrength(
        'My$tr0ng-P@ssw0rd!2023'
      )

      expect(analysis.score).toBeGreaterThan(80)
      expect(analysis.issues).toHaveLength(0)
    })

    it('should detect repeated characters', () => {
      const analysis =
        EncryptionService.analyzePassphraseStrength('aaabbbccc123')

      expect(analysis.issues).toContain('Contains repeated characters')
      expect(analysis.score).toBeLessThan(50)
    })

    it('should recommend character diversity', () => {
      const analysis =
        EncryptionService.analyzePassphraseStrength('alllowercase')

      expect(analysis.issues).toContain('Only letters')
      expect(analysis.recommendations).toContain('Add numbers and symbols')
    })
  })

  describe('error handling', () => {
    it('should throw error when encrypting without key', async () => {
      const encryptionWithoutKey = new EncryptionService(config)

      await expect(encryptionWithoutKey.encrypt('data')).rejects.toThrow(
        'No encryption key available'
      )
    })

    it('should throw error when decrypting without key', async () => {
      const encryptionWithoutKey = new EncryptionService(config)
      const fakeEncrypted = {
        data: 'fake',
        iv: 'fake',
        authTag: 'fake',
        algorithm: 'aes-256-gcm',
        compressed: false,
      }

      await expect(encryptionWithoutKey.decrypt(fakeEncrypted)).rejects.toThrow(
        'No decryption key available'
      )
    })

    it('should handle key derivation failures gracefully', async () => {
      // Test with null passphrase which should cause argon2 to fail
      await expect(
        encryption.deriveKey(null as unknown as string)
      ).rejects.toThrow()
    })
  })

  describe('random key generation', () => {
    it('should generate random keys for testing', () => {
      const key1 = EncryptionService.generateRandomKey()
      const key2 = EncryptionService.generateRandomKey()

      expect(key1).toBeInstanceOf(Buffer)
      expect(key1.length).toBe(32)
      expect(key1.equals(key2)).toBe(false)
    })
  })

  describe('memory security', () => {
    it('should handle sensitive data cleanup', async () => {
      const sensitiveData = 'credit-card-number-1234567890123456'

      await encryption.deriveKey(config.passphrase!)
      const encrypted = await encryption.encrypt(sensitiveData)
      const decrypted = await encryption.decrypt(encrypted)

      expect(decrypted).toBe(sensitiveData)
      // Note: Actual memory clearing would need to be tested at runtime
      // with specialized tools, but we verify the operations complete correctly
    })
  })
})
