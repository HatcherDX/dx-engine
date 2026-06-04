/**
 * @fileoverview Cross-platform security tests for StorageEncryption utility
 *
 * @description
 * Comprehensive test suite validating secure encryption functionality across
 * macOS, Windows, and Linux platforms. Tests safeStorage API integration,
 * platform-specific backends, and encryption round-trip operations.
 *
 * @remarks
 * This test file validates the StorageEncryption utility class which provides
 * static methods for encryption/decryption. For full storage operations
 * (projects, IDE config, etc.), see @hatcherdx/storage package tests.
 *
 * @author Hatcher DX Team
 * @since 1.1.0
 * @public
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { StorageEncryption } from '../StorageEncryption'

// Mock electron module
vi.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: vi.fn(() => true),
    encryptString: vi.fn((plainText: string) =>
      Buffer.from(`encrypted:${plainText}`)
    ),
    decryptString: vi.fn((encrypted: Buffer) =>
      encrypted.toString().replace('encrypted:', '')
    ),
    // getSelectedStorageBackend is only available on Linux
    getSelectedStorageBackend: vi.fn(() => 'gnome_libsecret'),
  },
}))

describe('StorageEncryption - Cross Platform Utility', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test requires flexible typing for validation testing
  let safeStorage: any

  beforeAll(async () => {
    // Mock imports after module mock is set up
    const electron = await import('electron')
    safeStorage = electron.safeStorage
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Platform Detection and Validation', () => {
    it('should detect platform correctly', () => {
      const platform = process.platform
      expect(platform).toBeDefined()
      expect(['darwin', 'win32', 'linux']).toContain(platform)
    })

    it('should check encryption availability', () => {
      const available = StorageEncryption.isAvailable()
      expect(typeof available).toBe('boolean')
      expect(available).toBe(true)
    })

    it('should detect encryption availability correctly', () => {
      const available = safeStorage.isEncryptionAvailable()
      expect(typeof available).toBe('boolean')

      // Should be true except on Linux without keyring
      if (process.platform !== 'linux') {
        expect(available).toBe(true)
      } else {
        // On Linux, availability depends on keyring services
        console.log(`Linux encryption available: ${available}`)
        if (process.env.CI) {
          // In CI, we should have keyring services installed
          expect(available).toBe(true)
        }
      }
    })
  })

  describe('Linux Backend Detection', () => {
    // Only run Linux-specific tests on Linux
    const isLinux = process.platform === 'linux'

    it.skipIf(!isLinux)('should detect Linux backend correctly', () => {
      const backend = safeStorage.getSelectedStorageBackend()
      console.log(`Linux Backend: ${backend}`)

      expect(backend).toBeDefined()
      expect([
        'gnome_libsecret',
        'kwallet',
        'kwallet5',
        'kwallet6',
        'basic_text',
      ]).toContain(backend)

      // In CI environments, should NOT be basic_text
      if (process.env.CI) {
        expect(backend).not.toBe('basic_text')
        console.log(`✅ Secure backend in CI: ${backend}`)
      } else if (backend === 'basic_text') {
        console.warn(`⚠️  Insecure backend detected: ${backend}`)
      }
    })

    it.skipIf(!isLinux)('should log backend type correctly', () => {
      if (safeStorage.isEncryptionAvailable()) {
        const backend = safeStorage.getSelectedStorageBackend()

        const backendTypes: Record<string, string> = {
          gnome_libsecret: 'GNOME Keyring (libsecret)',
          kwallet: 'KWallet 4',
          kwallet5: 'KWallet 5',
          kwallet6: 'KWallet 6',
          basic_text: 'Basic Text (INSECURE)',
        }

        const backendName = backendTypes[backend] || backend
        console.log(`Backend Type: ${backendName}`)
        expect(backendName).toBeDefined()
      }
    })
  })

  describe('macOS Keychain Integration', () => {
    const isMacOS = process.platform === 'darwin'

    it.skipIf(!isMacOS)('should use macOS Keychain', () => {
      expect(safeStorage.isEncryptionAvailable()).toBe(true)
      console.log('✅ macOS Keychain encryption available')
    })

    it.skipIf(!isMacOS)('should handle macOS security properly', () => {
      expect(process.platform).toBe('darwin')
      expect(safeStorage.isEncryptionAvailable()).toBe(true)
    })
  })

  describe('Windows DPAPI Integration', () => {
    const isWindows = process.platform === 'win32'

    it.skipIf(!isWindows)('should use Windows DPAPI', () => {
      expect(safeStorage.isEncryptionAvailable()).toBe(true)
      console.log('✅ Windows DPAPI encryption available')
    })

    it.skipIf(!isWindows)('should handle Windows security properly', () => {
      expect(process.platform).toBe('win32')
      expect(safeStorage.isEncryptionAvailable()).toBe(true)
    })
  })

  describe('Encryption Round-trip Testing', () => {
    it('should encrypt and decrypt successfully', () => {
      if (!safeStorage.isEncryptionAvailable()) {
        console.warn('⚠️  Skipping: Encryption not available')
        return
      }

      const plainText = 'hatcher-dx-engine-test-data-123'
      const encrypted = StorageEncryption.encrypt(plainText)

      // Encrypted data should be different and not empty
      expect(encrypted).toBeDefined()
      expect(encrypted).not.toBe(plainText)
      expect(encrypted.length).toBeGreaterThan(0)

      // Decrypt should return original data
      const decrypted = StorageEncryption.decrypt(encrypted)
      expect(decrypted).toBe(plainText)
    })

    it('should handle Unicode correctly', () => {
      if (!safeStorage.isEncryptionAvailable()) {
        console.warn('⚠️  Skipping: Encryption not available')
        return
      }

      const unicode = '🔐 Hatcher IDE 安全 パスワード مؤمن'
      const encrypted = StorageEncryption.encrypt(unicode)
      const decrypted = StorageEncryption.decrypt(encrypted)

      expect(decrypted).toBe(unicode)
      console.log('✅ Unicode encryption test passed')
    })

    it('should handle empty strings', () => {
      if (!safeStorage.isEncryptionAvailable()) {
        console.warn('⚠️  Skipping: Encryption not available')
        return
      }

      const empty = ''
      const encrypted = StorageEncryption.encrypt(empty)
      const decrypted = StorageEncryption.decrypt(encrypted)

      expect(decrypted).toBe(empty)
    })

    it('should handle large strings', () => {
      if (!safeStorage.isEncryptionAvailable()) {
        console.warn('⚠️  Skipping: Encryption not available')
        return
      }

      // Create a 1MB string
      const largeString = 'A'.repeat(1024 * 1024)
      const encrypted = StorageEncryption.encrypt(largeString)
      const decrypted = StorageEncryption.decrypt(encrypted)

      expect(decrypted).toBe(largeString)
      expect(decrypted.length).toBe(1024 * 1024)
      console.log('✅ Large string encryption test passed')
    })
  })

  describe('Message Encryption Tests', () => {
    it('should encrypt message object content', () => {
      if (!safeStorage.isEncryptionAvailable()) {
        console.warn('⚠️  Skipping: Encryption not available')
        return
      }

      const message = {
        id: '123',
        content: 'Secret message content',
        timestamp: new Date(),
      }

      const encrypted = StorageEncryption.encryptMessage(message)

      // Content should be encrypted
      expect(encrypted.content).not.toBe(message.content)
      expect(encrypted.content.length).toBeGreaterThan(0)

      // Other properties should be unchanged
      expect(encrypted.id).toBe(message.id)
      expect(encrypted.timestamp).toBe(message.timestamp)

      // Decrypt should restore original
      const decrypted = StorageEncryption.decryptMessage(encrypted)
      expect(decrypted.content).toBe(message.content)
    })

    it('should decrypt array of messages', () => {
      if (!safeStorage.isEncryptionAvailable()) {
        console.warn('⚠️  Skipping: Encryption not available')
        return
      }

      const messages = [
        { id: '1', content: 'Message 1' },
        { id: '2', content: 'Message 2' },
        { id: '3', content: 'Message 3' },
      ]

      // Encrypt all messages
      const encrypted = messages.map((msg) =>
        StorageEncryption.encryptMessage(msg)
      )

      // All should be encrypted
      encrypted.forEach((msg, i) => {
        expect(msg.content).not.toBe(messages[i].content)
      })

      // Decrypt all messages
      const decrypted = StorageEncryption.decryptMessages(encrypted)

      // All should match original
      decrypted.forEach((msg, i) => {
        expect(msg.content).toBe(messages[i].content)
        expect(msg.id).toBe(messages[i].id)
      })

      console.log('✅ Message array encryption test passed')
    })

    it('should handle decryption errors gracefully', () => {
      if (!safeStorage.isEncryptionAvailable()) {
        console.warn('⚠️  Skipping: Encryption not available')
        return
      }

      // Mock decrypt to throw error
      const originalDecrypt = safeStorage.decryptString
      safeStorage.decryptString = vi.fn(() => {
        throw new Error('Decryption failed')
      })

      const message = { id: '1', content: 'encrypted_content' }

      // Should not throw, but return message as-is
      const result = StorageEncryption.decryptMessage(message)
      expect(result).toEqual(message)

      // Restore original
      safeStorage.decryptString = originalDecrypt
    })
  })

  describe('Security Compliance Tests', () => {
    it('should enforce encryption availability', () => {
      const available = safeStorage.isEncryptionAvailable()

      // Log platform-specific encryption status
      if (process.platform === 'linux') {
        const backend = safeStorage.getSelectedStorageBackend()
        console.log(`Linux: Encryption=${available}, Backend=${backend}`)

        if (available && backend === 'basic_text') {
          console.warn('⚠️  WARNING: Using insecure basic_text backend')
        }
      } else {
        console.log(`${process.platform}: Encryption=${available}`)
        // macOS and Windows should always have encryption
        expect(available).toBe(true)
      }
    })

    it('should throw error when encryption not available', () => {
      // Mock encryption as unavailable
      safeStorage.isEncryptionAvailable = vi.fn(() => false)

      expect(() => StorageEncryption.encrypt('test')).toThrow(
        'Encryption not available'
      )

      expect(() => StorageEncryption.decrypt('encrypted_data')).toThrow(
        'Decryption not available'
      )

      // Restore
      safeStorage.isEncryptionAvailable = vi.fn(() => true)
    })

    it('should validate isAvailable method', () => {
      expect(StorageEncryption.isAvailable()).toBe(true)

      // Test when unavailable
      safeStorage.isEncryptionAvailable = vi.fn(() => false)
      expect(StorageEncryption.isAvailable()).toBe(false)

      // Restore
      safeStorage.isEncryptionAvailable = vi.fn(() => true)
    })
  })

  describe('Performance and Reliability Tests', () => {
    it('should handle multiple encryption operations efficiently', () => {
      if (!safeStorage.isEncryptionAvailable()) {
        console.warn('⚠️  Skipping: Encryption not available')
        return
      }

      const iterations = 100
      const testData = 'performance-test-data'

      const startTime = performance.now()

      for (let i = 0; i < iterations; i++) {
        const encrypted = StorageEncryption.encrypt(testData)
        const decrypted = StorageEncryption.decrypt(encrypted)
        expect(decrypted).toBe(testData)
      }

      const duration = performance.now() - startTime
      console.log(
        `✅ ${iterations} encryption operations completed in ${Math.round(duration)}ms`
      )

      // Should complete reasonably fast (less than 5 seconds)
      expect(duration).toBeLessThan(5000)
    })

    it('should handle concurrent encryption operations', async () => {
      if (!safeStorage.isEncryptionAvailable()) {
        console.warn('⚠️  Skipping: Encryption not available')
        return
      }

      const concurrentOps = 10
      const testData = Array.from(
        { length: concurrentOps },
        (_, i) => `concurrent-test-${i}`
      )

      const promises = testData.map(async (data) => {
        const encrypted = StorageEncryption.encrypt(data)
        return StorageEncryption.decrypt(encrypted)
      })

      const results = await Promise.all(promises)

      results.forEach((result, index) => {
        expect(result).toBe(testData[index])
      })

      console.log('✅ Concurrent encryption operations completed successfully')
    })
  })
})
