/**
 * @fileoverview Integration tests for storage module entry point
 *
 * @description
 * Tests the main module exports and factory functions to ensure
 * proper module loading and configuration.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { describe, it, expect } from 'vitest'
import {
  StorageManager,
  MemoryAdapter,
  EncryptionService,
  CompressionService,
  CacheLayer,
  createStorage,
  createSecureStorage,
  createFastStorage,
  VERSION,
} from './index'

describe('Storage Module', () => {
  describe('exports', () => {
    it('should export all main classes', () => {
      expect(StorageManager).toBeDefined()
      expect(MemoryAdapter).toBeDefined()
      expect(EncryptionService).toBeDefined()
      expect(CompressionService).toBeDefined()
      expect(CacheLayer).toBeDefined()
    })

    it('should export factory functions', () => {
      expect(createStorage).toBeDefined()
      expect(createSecureStorage).toBeDefined()
      expect(createFastStorage).toBeDefined()
    })

    it('should export version', () => {
      expect(VERSION).toBe('1.0.0')
    })
  })

  describe('factory functions', () => {
    it('should create basic storage', () => {
      const storage = createStorage({ type: 'memory' })
      expect(storage).toBeInstanceOf(StorageManager)
      expect(storage.configuration.type).toBe('memory')
    })

    it('should create secure storage', () => {
      const storage = createSecureStorage('./test.db', 'test-passphrase')
      expect(storage).toBeInstanceOf(StorageManager)
      expect(storage.configuration.type).toBe('sqlite')
      expect(storage.configuration.encryption?.enabled).toBe(true)
      expect(storage.configuration.compression?.enabled).toBe(true)
    })

    it('should create fast storage', () => {
      const storage = createFastStorage('./fast.db')
      expect(storage).toBeInstanceOf(StorageManager)
      expect(storage.configuration.type).toBe('sqlite')
      expect(storage.configuration.encryption?.enabled).toBe(false)
      expect(storage.configuration.compression?.algorithm).toBe('lz4')
    })
  })
})
