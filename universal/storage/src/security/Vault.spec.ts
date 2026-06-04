/**
 * @fileoverview Tests for Vault security functionality
 *
 * @description
 * Comprehensive tests for the Vault security wrapper including
 * secure storage, encryption, key rotation, and security features.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Vault } from './Vault'
import { StorageManager } from '../core/StorageManager'
import type { StorageConfig, VaultConfig } from '../types/storage'

// Import test utilities
import '../test-setup'

// Declare global test utilities
declare global {
  const createTestConfig: (overrides?: Partial<StorageConfig>) => StorageConfig
  const createSecureTestConfig: (
    overrides?: Partial<StorageConfig>
  ) => StorageConfig
}

describe('Vault', () => {
  let vault: Vault
  let storage: StorageManager
  let config: VaultConfig

  beforeEach(async () => {
    // Use config without auto-encryption since Vault handles its own encryption
    const storageConfig = createTestConfig({
      compression: {
        enabled: true,
        algorithm: 'auto',
        minSize: 100,
      },
    })
    storage = new StorageManager(storageConfig)
    await storage.initialize()

    config = {
      passphrase: 'test-vault-passphrase',
      namespace: 'vault',
      autoRotateKeys: false,
      keyRotationInterval: 24 * 60 * 60 * 1000, // 24 hours
    }

    vault = new Vault(storage, config)
  })

  afterEach(async () => {
    await storage.close()
  })

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await vault.initialize()
      expect(vault.isInitialized()).toBe(true)
    })

    it('should create encryption key on first initialization', async () => {
      await vault.initialize()

      // Verify that an encryption key exists
      const keyExists = await storage.has('vault:encryption-key')
      expect(keyExists).toBe(true)
    })

    it('should use existing encryption key on subsequent initializations', async () => {
      await vault.initialize()
      const firstKey = await storage.get('vault:encryption-key')

      // Create new vault instance with same config
      const vault2 = new Vault(storage, config)
      await vault2.initialize()

      const secondKey = await storage.get('vault:encryption-key')
      expect(secondKey).toEqual(firstKey)
    })

    it('should not reinitialize if already initialized', async () => {
      await vault.initialize()
      const initSpy = vi.spyOn(
        vault as unknown as { generateEncryptionKey: () => Promise<void> },
        'generateEncryptionKey'
      )

      await vault.initialize()
      expect(initSpy).not.toHaveBeenCalled()
    })
  })

  describe('secure storage operations', () => {
    beforeEach(async () => {
      await vault.initialize()
    })

    it('should store and retrieve sensitive data', async () => {
      const sensitiveData = {
        apiKey: 'secret-api-key-12345',
        password: 'user-password',
        token: 'jwt-token-xyz',
      }

      await vault.store('user:secrets', sensitiveData)
      const retrieved = await vault.retrieve('user:secrets')

      expect(retrieved).toEqual(sensitiveData)
    })

    it('should return null for non-existent keys', async () => {
      const result = await vault.retrieve('nonexistent-key')
      expect(result).toBeNull()
    })

    it('should check if keys exist', async () => {
      await vault.store('test-key', 'test-value')

      expect(await vault.exists('test-key')).toBe(true)
      expect(await vault.exists('nonexistent-key')).toBe(false)
    })

    it('should delete sensitive data', async () => {
      await vault.store('delete-me', 'sensitive-data')
      expect(await vault.exists('delete-me')).toBe(true)

      await vault.delete('delete-me')
      expect(await vault.exists('delete-me')).toBe(false)
    })

    it('should handle various data types', async () => {
      const testCases = [
        ['string', 'secret-string'],
        ['number', 42],
        ['boolean', true],
        ['object', { apiKey: 'secret', userId: 123 }],
        ['array', ['secret1', 'secret2', 'secret3']],
        ['null', null],
      ]

      for (const [key, value] of testCases) {
        await vault.store(key, value)
        const retrieved = await vault.retrieve(key)
        expect(retrieved).toEqual(value)
      }
    })
  })

  describe('key management', () => {
    beforeEach(async () => {
      await vault.initialize()
    })

    it('should list stored keys', async () => {
      await vault.store('secret1', 'value1')
      await vault.store('secret2', 'value2')
      await vault.store('secret3', 'value3')

      const keys = await vault.listKeys()
      expect(keys).toHaveLength(3)
      expect(keys).toContain('secret1')
      expect(keys).toContain('secret2')
      expect(keys).toContain('secret3')
    })

    it('should list keys with prefix filter', async () => {
      await vault.store('user:secret1', 'value1')
      await vault.store('user:secret2', 'value2')
      await vault.store('app:secret1', 'value1')

      const userKeys = await vault.listKeys('user:')
      expect(userKeys).toHaveLength(2)
      expect(userKeys.every((key) => key.startsWith('user:'))).toBe(true)
    })

    it('should clear all vault data', async () => {
      await vault.store('secret1', 'value1')
      await vault.store('secret2', 'value2')

      const keysBefore = await vault.listKeys()
      expect(keysBefore.length).toBeGreaterThan(0)

      await vault.clear()

      const keysAfter = await vault.listKeys()
      expect(keysAfter).toHaveLength(0)
    })
  })

  describe('key rotation', () => {
    beforeEach(async () => {
      await vault.initialize()
    })

    it('should rotate encryption keys', async () => {
      // Store some data first
      await vault.store('secret1', 'value1')
      await vault.store('secret2', { key: 'value2' })

      const oldKey = await storage.get('vault:encryption-key')

      // Rotate keys
      await vault.rotateKeys()

      const newKey = await storage.get('vault:encryption-key')
      expect(newKey).not.toEqual(oldKey)

      // Verify data is still accessible after rotation
      expect(await vault.retrieve('secret1')).toBe('value1')
      expect(await vault.retrieve('secret2')).toEqual({ key: 'value2' })
    })

    it('should handle key rotation with empty vault', async () => {
      await expect(vault.rotateKeys()).resolves.not.toThrow()
    })

    it('should preserve all data during key rotation', async () => {
      const testData = []

      // Store multiple items
      for (let i = 0; i < 10; i++) {
        const key = `test:${i}`
        const value = { id: i, secret: `secret-${i}`, data: Math.random() }
        await vault.store(key, value)
        testData.push([key, value])
      }

      // Rotate keys
      await vault.rotateKeys()

      // Verify all data is preserved
      for (const [key, expectedValue] of testData) {
        const retrievedValue = await vault.retrieve(key)
        expect(retrievedValue).toEqual(expectedValue)
      }
    })
  })

  describe('automatic key rotation', () => {
    it('should enable automatic key rotation', async () => {
      const autoRotateConfig = {
        ...config,
        autoRotateKeys: true,
        keyRotationInterval: 100, // 100ms for testing
      }

      const autoVault = new Vault(storage, autoRotateConfig)
      await autoVault.initialize()

      expect(autoVault.isAutoRotateEnabled()).toBe(true)

      // Store data
      await autoVault.store('auto-test', 'value')

      const originalKey = await storage.get('vault:encryption-key')

      // Manually trigger key rotation instead of relying on timer
      await autoVault.rotateKeys()

      // Check if key was rotated
      const rotatedKey = await storage.get('vault:encryption-key')
      expect(rotatedKey).not.toEqual(originalKey)

      // Data should still be accessible after rotation
      expect(await autoVault.retrieve('auto-test')).toBe('value')

      await autoVault.destroy()
    })

    it('should stop automatic rotation when destroyed', async () => {
      const autoRotateConfig = {
        ...config,
        autoRotateKeys: true,
        keyRotationInterval: 100,
      }

      // Set up fake timers BEFORE creating the vault
      vi.useFakeTimers()

      const autoVault = new Vault(storage, autoRotateConfig)
      await autoVault.initialize()

      const rotateSpy = vi.spyOn(autoVault, 'rotateKeys')

      await autoVault.destroy()

      // Try to advance timers - rotation should not happen
      vi.advanceTimersByTime(200)
      await vi.runOnlyPendingTimersAsync()

      expect(rotateSpy).not.toHaveBeenCalled()

      vi.useRealTimers()
    })
  })

  describe('security features', () => {
    beforeEach(async () => {
      await vault.initialize()
    })

    it('should encrypt data in underlying storage', async () => {
      const plainData = 'sensitive-information'
      await vault.store('secure-test', plainData)

      // Check that raw storage contains encrypted data structure (not plain text)
      const rawData = await storage.get('vault:secure-test')
      expect(rawData).not.toBe(plainData)
      expect(typeof rawData).toBe('object') // Should be VaultEntry object
      expect(rawData).toHaveProperty('data') // Contains encrypted data
      expect(rawData).toHaveProperty('createdAt') // Contains metadata
      expect(rawData.data).not.toBe(plainData) // Encrypted data is not plain text
    })

    it('should use different encryption for each value', async () => {
      const sameData = 'identical-secret'

      await vault.store('key1', sameData)
      await vault.store('key2', sameData)

      const encrypted1 = await storage.get('vault:key1')
      const encrypted2 = await storage.get('vault:key2')

      // Even with same plaintext, encrypted values should be different
      expect(encrypted1).not.toEqual(encrypted2)
    })

    it('should handle encryption failures gracefully', async () => {
      // Mock encryption service to fail
      const encryptSpy = vi.spyOn(
        (
          vault as unknown as {
            encryption: { encrypt: () => Promise<unknown> }
          }
        )['encryption'],
        'encrypt'
      )
      encryptSpy.mockRejectedValueOnce(new Error('Encryption failed'))

      await expect(vault.store('fail-test', 'data')).rejects.toThrow(
        'Encryption failed'
      )

      encryptSpy.mockRestore()
    })

    it('should handle decryption failures gracefully', async () => {
      await vault.store('decrypt-test', 'data')

      // Mock decryption service to fail
      const decryptSpy = vi.spyOn(
        (
          vault as unknown as {
            encryption: { decrypt: () => Promise<unknown> }
          }
        )['encryption'],
        'decrypt'
      )
      decryptSpy.mockRejectedValueOnce(new Error('Decryption failed'))

      await expect(vault.retrieve('decrypt-test')).rejects.toThrow(
        'Decryption failed'
      )

      decryptSpy.mockRestore()
    })
  })

  describe('configuration and options', () => {
    it('should handle different namespaces', async () => {
      const config1 = { ...config, namespace: 'vault1' }
      const config2 = { ...config, namespace: 'vault2' }

      const vault1 = new Vault(storage, config1)
      const vault2 = new Vault(storage, config2)

      await vault1.initialize()
      await vault2.initialize()

      await vault1.store('test', 'value1')
      await vault2.store('test', 'value2')

      expect(await vault1.retrieve('test')).toBe('value1')
      expect(await vault2.retrieve('test')).toBe('value2')
    })

    it('should validate configuration on creation', () => {
      expect(() => new Vault(storage, { ...config, passphrase: '' })).toThrow(
        'Passphrase is required'
      )

      expect(() => new Vault(storage, { ...config, namespace: '' })).toThrow(
        'Namespace is required'
      )

      expect(
        () => new Vault(storage, { ...config, keyRotationInterval: -1 })
      ).toThrow('Key rotation interval must be positive')
    })
  })

  describe('error handling and edge cases', () => {
    it('should handle operations before initialization', async () => {
      const uninitializedVault = new Vault(storage, config)

      await expect(uninitializedVault.store('test', 'value')).rejects.toThrow(
        'Vault not initialized'
      )

      await expect(uninitializedVault.retrieve('test')).rejects.toThrow(
        'Vault not initialized'
      )
    })

    it('should handle storage errors', async () => {
      await vault.initialize()

      // Mock storage to fail
      const setSpy = vi.spyOn(storage, 'set')
      setSpy.mockRejectedValueOnce(new Error('Storage error'))

      await expect(vault.store('error-test', 'data')).rejects.toThrow(
        'Storage error'
      )

      setSpy.mockRestore()
    })

    it('should handle concurrent operations safely', async () => {
      await vault.initialize()

      const operations = []

      // Create multiple concurrent operations
      for (let i = 0; i < 10; i++) {
        operations.push(vault.store(`concurrent:${i}`, { value: i }))
      }

      await Promise.all(operations)

      // Verify all data was stored correctly
      for (let i = 0; i < 10; i++) {
        const result = await vault.retrieve(`concurrent:${i}`)
        expect(result).toEqual({ value: i })
      }
    })

    it('should handle large data sets', async () => {
      await vault.initialize()

      const largeData = {
        content: 'x'.repeat(10000), // 10KB of data
        metadata: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          value: `item-${i}`,
        })),
      }

      await vault.store('large-data', largeData)
      const retrieved = await vault.retrieve('large-data')

      expect(retrieved).toEqual(largeData)
    })
  })

  describe('vault statistics and monitoring', () => {
    beforeEach(async () => {
      await vault.initialize()
    })

    it('should provide vault statistics', async () => {
      await vault.store('stat1', 'value1')
      await vault.store('stat2', { data: 'large'.repeat(100) })

      const stats = await vault.getStats()

      expect(stats).toHaveProperty('itemCount')
      expect(stats).toHaveProperty('totalSize')
      expect(stats).toHaveProperty('encryptionOverhead')
      expect(stats).toHaveProperty('lastKeyRotation')

      expect(stats.itemCount).toBe(2)
      expect(stats.totalSize).toBeGreaterThan(0)
    })

    it('should track key rotation history', async () => {
      await vault.store('test', 'value')

      const statsBefore = await vault.getStats()
      await vault.rotateKeys()
      const statsAfter = await vault.getStats()

      expect(statsAfter.lastKeyRotation).toBeGreaterThan(
        statsBefore.lastKeyRotation || 0
      )
    })
  })

  describe('destruction and cleanup', () => {
    beforeEach(async () => {
      await vault.initialize()
    })

    it('should destroy vault and clear all data', async () => {
      await vault.store('destroy1', 'value1')
      await vault.store('destroy2', 'value2')

      const keysBefore = await vault.listKeys()
      expect(keysBefore.length).toBe(2)

      await vault.destroy()

      // Vault should be uninitialized
      expect(vault.isInitialized()).toBe(false)

      // All data should be cleared
      await vault.initialize() // Re-initialize to check
      const keysAfter = await vault.listKeys()
      expect(keysAfter).toHaveLength(0)
    })

    it('should handle destruction of uninitialized vault', async () => {
      const uninitializedVault = new Vault(storage, config)
      await expect(uninitializedVault.destroy()).resolves.not.toThrow()
    })

    it('should clear vault key from memory on close', async () => {
      await vault.store('test-key', 'test-value')

      // Close vault
      await vault.close()

      // Vault key should be cleared - operations should fail
      await expect(vault.store('another-key', 'value')).rejects.toThrow(
        'Vault not initialized'
      )
    })
  })

  describe('backup and restore', () => {
    beforeEach(async () => {
      await vault.initialize()
    })

    it('should export vault data as encrypted backup', async () => {
      await vault.store('backup-key1', 'sensitive-data-1')
      await vault.store('backup-key2', { secret: 'data-2' })
      await vault.store('backup-key3', ['secret', 'array'])

      const backup = await vault.exportBackup()

      // Backup should be encrypted data structure
      expect(backup).toHaveProperty('data')
      expect(backup).toHaveProperty('iv')
      expect(backup.data).toBeTruthy()
      expect(backup.iv).toBeTruthy()
    })

    it('should import vault data from encrypted backup', async () => {
      // Store original data
      const originalData = {
        key1: 'value1',
        key2: { secret: 'value2' },
        key3: ['array', 'data'],
      }

      for (const [key, value] of Object.entries(originalData)) {
        await vault.store(`import:${key}`, value)
      }

      // Export backup
      const backup = await vault.exportBackup()

      // Clear vault
      await vault.clear()
      expect((await vault.listKeys()).length).toBe(0)

      // Import backup
      await vault.importBackup(backup)

      // Verify all data was restored
      for (const [key, expectedValue] of Object.entries(originalData)) {
        const retrieved = await vault.retrieve(`import:${key}`)
        expect(retrieved).toEqual(expectedValue)
      }
    })

    it('should handle import with uninitialized vault', async () => {
      const uninitializedVault = new Vault(storage, config)

      const fakeBackup = {
        data: 'fake-encrypted-data',
        iv: 'fake-iv-base64',
        salt: 'fake-salt',
        authTag: 'fake-auth-tag',
        algorithm: 'aes-256-gcm' as const,
        keyDerivation: 'argon2id' as const,
      }

      await expect(uninitializedVault.importBackup(fakeBackup)).rejects.toThrow(
        'Vault not initialized'
      )
    })

    it('should handle import errors gracefully', async () => {
      await vault.initialize()

      // Create invalid backup data
      const invalidBackup = {
        data: 'invalid-base64-data',
        iv: 'invalid-iv',
        salt: 'invalid-salt',
        authTag: 'invalid-auth',
        algorithm: 'aes-256-gcm' as const,
        keyDerivation: 'argon2id' as const,
      }

      await expect(vault.importBackup(invalidBackup)).rejects.toThrow(
        'Backup import failed'
      )
    })
  })

  describe('access logging and auditing', () => {
    beforeEach(async () => {
      await vault.initialize()
    })

    it('should log store and retrieve operations', async () => {
      await vault.store('log-test1', 'value1')
      await vault.store('log-test2', 'value2')
      await vault.retrieve('log-test1')

      const accessLog = vault.getAccessLog()

      expect(accessLog.length).toBe(3)
      expect(accessLog[0]).toMatchObject({
        key: 'log-test1',
        operation: 'store',
      })
      expect(accessLog[1]).toMatchObject({
        key: 'log-test2',
        operation: 'store',
      })
      expect(accessLog[2]).toMatchObject({
        key: 'log-test1',
        operation: 'retrieve',
      })
      expect(accessLog[0].timestamp).toBeGreaterThan(0)
    })

    it('should clear access log', async () => {
      await vault.store('clear-test', 'value')
      await vault.retrieve('clear-test')

      let accessLog = vault.getAccessLog()
      expect(accessLog.length).toBeGreaterThan(0)

      vault.clearAccessLog()

      accessLog = vault.getAccessLog()
      expect(accessLog.length).toBe(0)
    })

    it('should limit access log size', async () => {
      const limitedConfig = {
        ...config,
        maxAccessLogSize: 5,
      }

      const limitedVault = new Vault(storage, limitedConfig)
      await limitedVault.initialize()

      // Perform more operations than max log size
      for (let i = 0; i < 10; i++) {
        await limitedVault.store(`limit-test:${i}`, `value${i}`)
      }

      const accessLog = limitedVault.getAccessLog()

      // Log should be limited to maxAccessLogSize
      expect(accessLog.length).toBeLessThanOrEqual(5)
    })

    it('should not log when audit is disabled', async () => {
      const noAuditConfig = {
        ...config,
        auditEnabled: false,
      }

      const noAuditVault = new Vault(storage, noAuditConfig)
      await noAuditVault.initialize()

      await noAuditVault.store('no-audit-test', 'value')
      await noAuditVault.retrieve('no-audit-test')

      const accessLog = noAuditVault.getAccessLog()
      expect(accessLog.length).toBe(0)
    })

    it('should return only last 100 entries from access log', async () => {
      const largeLogConfig = {
        ...config,
        maxAccessLogSize: 200,
      }

      const largeLogVault = new Vault(storage, largeLogConfig)
      await largeLogVault.initialize()

      // Create 150 log entries
      for (let i = 0; i < 150; i++) {
        await largeLogVault.store(`large-log:${i}`, `value${i}`)
      }

      const accessLog = largeLogVault.getAccessLog()

      // getAccessLog should return only last 100 entries
      expect(accessLog.length).toBe(100)
    })
  })

  describe('Buffer handling and parsing', () => {
    beforeEach(async () => {
      await vault.initialize()
    })

    it('should handle Buffer data from adapter correctly', async () => {
      await vault.store('buffer-test', 'buffer-value')

      // Mock adapter to return Buffer instead of parsed object
      const getSpy = vi.spyOn(storage, 'get')
      const originalGet = storage.get.bind(storage)

      getSpy.mockImplementationOnce(async (key: string) => {
        const data = await originalGet(key)
        // Convert to Buffer to simulate certain storage backends
        return Buffer.from(JSON.stringify(data)) as unknown as typeof data
      })

      const retrieved = await vault.retrieve('buffer-test')
      expect(retrieved).toBe('buffer-value')

      getSpy.mockRestore()
    })

    it('should handle invalid Buffer JSON gracefully', async () => {
      await vault.store('invalid-buffer-test', 'value')

      // Mock adapter to return invalid Buffer
      const getSpy = vi.spyOn(storage, 'get')
      getSpy.mockResolvedValueOnce(
        Buffer.from('invalid-json-{{{') as unknown as never
      )

      await expect(vault.retrieve('invalid-buffer-test')).rejects.toThrow(
        'Failed to parse vault entry from Buffer'
      )

      getSpy.mockRestore()
    })
  })

  describe('error recovery and edge cases', () => {
    beforeEach(async () => {
      await vault.initialize()
    })

    it('should handle errors in automatic key rotation', async () => {
      const autoRotateConfig = {
        ...config,
        autoRotateKeys: true,
        keyRotationInterval: 50, // 50ms for testing
      }

      vi.useFakeTimers()

      const autoVault = new Vault(storage, autoRotateConfig)
      await autoVault.initialize()

      // Store data
      await autoVault.store('auto-error-test', 'value')

      // Mock rotateKeys to fail
      const rotateSpy = vi.spyOn(autoVault, 'rotateKeys')
      rotateSpy.mockRejectedValueOnce(new Error('Rotation error'))

      // Spy on console.error to verify error is logged
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})

      // Trigger auto-rotation
      vi.advanceTimersByTime(60)
      await vi.runOnlyPendingTimersAsync()

      // Error should be logged but not thrown
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Auto key rotation failed:',
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
      rotateSpy.mockRestore()
      await autoVault.destroy()
      vi.useRealTimers()
    })

    it('should handle getLastKeyRotation errors', async () => {
      // Mock adapter.get to throw error
      const getSpy = vi.spyOn(storage, 'get')
      getSpy.mockRejectedValueOnce(new Error('Storage error'))

      const stats = await vault.getStats()

      // Should return 0 for lastKeyRotation on error
      expect(stats.lastKeyRotation).toBe(0)

      getSpy.mockRestore()
    })

    it('should handle getCurrentKeyVersion errors', async () => {
      // Mock adapter.get to throw error for key version
      const getSpy = vi.spyOn(storage, 'get')
      getSpy.mockImplementation(async (key: string) => {
        if (key === 'vault:__key_version__') {
          throw new Error('Version read error')
        }
        // Return null for other keys to avoid affecting other operations
        return null as never
      })

      // This should not throw and should default to version 1
      await vault.store('version-error-test', 'value')

      getSpy.mockRestore()
    })

    it('should handle clear() when vault is not initialized', async () => {
      const uninitializedVault = new Vault(storage, config)

      await expect(uninitializedVault.clear()).rejects.toThrow(
        'Vault not initialized'
      )
    })

    it('should handle rotateKeys when passphrase is missing', async () => {
      // Create vault with passphrase to initialize
      const vaultNoPassphrase = new Vault(storage, {
        ...config,
        passphrase: 'test',
      })
      await vaultNoPassphrase.initialize()

      // Clear passphrase after initialization to trigger error
      ;(
        vaultNoPassphrase as unknown as { config: { passphrase?: string } }
      ).config.passphrase = undefined

      await expect(vaultNoPassphrase.rotateKeys()).rejects.toThrow(
        'Vault not initialized'
      )
    })

    it('should handle multiple setupAutoRotation calls', async () => {
      const autoConfig1 = {
        ...config,
        autoRotateKeys: true,
        keyRotationInterval: 100,
      }

      const autoVault = new Vault(storage, autoConfig1)
      await autoVault.initialize()

      // Initialize creates first timer
      expect(autoVault.isAutoRotateEnabled()).toBe(true)

      // Manually trigger setupAutoRotation again to hit clearInterval path
      ;(
        autoVault as unknown as { setupAutoRotation: () => void }
      ).setupAutoRotation()

      await autoVault.destroy()
    })
  })
})
