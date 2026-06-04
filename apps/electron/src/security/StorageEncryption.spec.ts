/**
 * @fileoverview Unit tests for StorageEncryption utility class.
 *
 * @description
 * Tests for encryption and decryption operations using Electron's safeStorage API.
 * Validates type safety, error handling, and defensive programming practices.
 *
 * @author Hatcher DX Team
 * @since 1.1.0
 */

import { describe, it, expect, beforeAll, vi } from 'vitest'
import { safeStorage } from 'electron'
import { StorageEncryption } from './StorageEncryption'

// Mock safeStorage for testing
vi.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: vi.fn(() => true),
    encryptString: vi.fn((plainText: string) => {
      // Simple mock: Base64 encode for testing
      return Buffer.from(`encrypted:${plainText}`, 'utf-8')
    }),
    decryptString: vi.fn((buffer: Buffer) => {
      // Simple mock: Extract original text
      const str = buffer.toString('utf-8')
      return str.replace('encrypted:', '')
    }),
  },
}))

describe('StorageEncryption', () => {
  beforeAll(() => {
    // Ensure encryption is available for all tests
    vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(true)
  })

  describe('isAvailable()', () => {
    it('should return true when encryption is available', () => {
      expect(StorageEncryption.isAvailable()).toBe(true)
    })

    it('should return false when encryption is not available', () => {
      vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValueOnce(false)
      expect(StorageEncryption.isAvailable()).toBe(false)
    })
  })

  describe('encrypt()', () => {
    it('should encrypt plain text to base64 string', () => {
      const plainText = 'Hello World'
      const encrypted = StorageEncryption.encrypt(plainText)

      expect(typeof encrypted).toBe('string')
      expect(encrypted).not.toBe(plainText)
      expect(encrypted.length).toBeGreaterThan(0)
    })

    it('should throw error when encryption is not available', () => {
      vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValueOnce(false)

      expect(() => {
        StorageEncryption.encrypt('test')
      }).toThrow('Encryption not available')
    })

    it('should handle empty strings', () => {
      const encrypted = StorageEncryption.encrypt('')
      expect(typeof encrypted).toBe('string')
    })

    it('should handle special characters and emojis', () => {
      const plainText = '¡Hola! 你好 🦄'
      const encrypted = StorageEncryption.encrypt(plainText)

      expect(typeof encrypted).toBe('string')
      expect(encrypted).not.toBe(plainText)
    })

    it('should throw error when encryptString operation fails', () => {
      // Mock encryptString to throw error
      vi.mocked(safeStorage.encryptString).mockImplementationOnce(() => {
        throw new Error('Encryption operation failed')
      })

      expect(() => {
        StorageEncryption.encrypt('test')
      }).toThrow('Failed to encrypt data: Encryption operation failed')
    })

    it('should handle unknown errors during encryption', () => {
      // Mock encryptString to throw non-Error object
      vi.mocked(safeStorage.encryptString).mockImplementationOnce(() => {
        throw 'Unknown encryption error'
      })

      expect(() => {
        StorageEncryption.encrypt('test')
      }).toThrow('Failed to encrypt data: Unknown error')
    })
  })

  describe('decrypt()', () => {
    it('should decrypt base64 encrypted string to plain text', () => {
      const plainText = 'Hello World'
      const encrypted = StorageEncryption.encrypt(plainText)
      const decrypted = StorageEncryption.decrypt(encrypted)

      expect(decrypted).toBe(plainText)
    })

    it('should throw error when decryption is not available', () => {
      vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValueOnce(true)
      const encrypted = StorageEncryption.encrypt('test')

      vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValueOnce(false)

      expect(() => {
        StorageEncryption.decrypt(encrypted)
      }).toThrow('Decryption not available')
    })

    it('should handle round-trip encryption/decryption', () => {
      const testCases = [
        'Simple text',
        '¡Español!',
        '你好世界',
        '🦄 Emoji test',
        'Numbers: 123456',
        'Special: !@#$%^&*()',
        '',
      ]

      testCases.forEach((testCase) => {
        const encrypted = StorageEncryption.encrypt(testCase)
        const decrypted = StorageEncryption.decrypt(encrypted)
        expect(decrypted).toBe(testCase)
      })
    })

    it('should throw error when decryptString operation fails', () => {
      const encrypted = StorageEncryption.encrypt('test')

      // Mock decryptString to throw error
      vi.mocked(safeStorage.decryptString).mockImplementationOnce(() => {
        throw new Error('Decryption operation failed')
      })

      expect(() => {
        StorageEncryption.decrypt(encrypted)
      }).toThrow('Failed to decrypt data: Decryption operation failed')
    })

    it('should handle unknown errors during decryption', () => {
      const encrypted = StorageEncryption.encrypt('test')

      // Mock decryptString to throw non-Error object
      vi.mocked(safeStorage.decryptString).mockImplementationOnce(() => {
        throw 'Unknown decryption error'
      })

      expect(() => {
        StorageEncryption.decrypt(encrypted)
      }).toThrow('Failed to decrypt data: Unknown error')
    })
  })

  describe('encryptMessage()', () => {
    it('should encrypt message content field', () => {
      const message = {
        id: '123',
        content: 'Secret message',
        timestamp: new Date(),
      }

      const encrypted = StorageEncryption.encryptMessage(message)

      expect(encrypted.id).toBe(message.id)
      expect(encrypted.timestamp).toBe(message.timestamp)
      expect(encrypted.content).not.toBe(message.content)
      expect(typeof encrypted.content).toBe('string')
    })

    it('should preserve all other message fields', () => {
      const message = {
        id: '123',
        content: 'Hello',
        type: 'user' as const,
        metadata: { foo: 'bar' },
        tokenCount: 10,
      }

      const encrypted = StorageEncryption.encryptMessage(message)

      expect(encrypted.id).toBe(message.id)
      expect(encrypted.type).toBe(message.type)
      expect(encrypted.metadata).toEqual(message.metadata)
      expect(encrypted.tokenCount).toBe(message.tokenCount)
    })

    it('should handle empty content', () => {
      const message = { id: '1', content: '' }
      const encrypted = StorageEncryption.encryptMessage(message)

      expect(typeof encrypted.content).toBe('string')
    })
  })

  describe('decryptMessage()', () => {
    it('should decrypt message content field', () => {
      const originalMessage = {
        id: '123',
        content: 'Secret message',
        timestamp: new Date(),
      }

      const encrypted = StorageEncryption.encryptMessage(originalMessage)
      const decrypted = StorageEncryption.decryptMessage(encrypted)

      expect(decrypted.id).toBe(originalMessage.id)
      expect(decrypted.content).toBe(originalMessage.content)
      expect(decrypted.timestamp).toBe(originalMessage.timestamp)
    })

    it('should handle decryption errors defensively', () => {
      const message = {
        id: '123',
        content: 'invalid-encrypted-data',
      }

      // Mock decrypt to throw error
      vi.mocked(safeStorage.decryptString).mockImplementationOnce(() => {
        throw new Error('Decryption failed')
      })

      // Should return message as-is instead of crashing
      const result = StorageEncryption.decryptMessage(message)
      expect(result).toEqual(message)
    })

    it('should preserve all fields during decryption', () => {
      const original = {
        id: '456',
        content: 'Test',
        type: 'assistant' as const,
        metadata: { ai: true },
      }

      const encrypted = StorageEncryption.encryptMessage(original)
      const decrypted = StorageEncryption.decryptMessage(encrypted)

      expect(decrypted.id).toBe(original.id)
      expect(decrypted.content).toBe(original.content)
      expect(decrypted.type).toBe(original.type)
      expect(decrypted.metadata).toEqual(original.metadata)
    })
  })

  describe('decryptMessages()', () => {
    it('should decrypt array of messages', () => {
      const messages = [
        { id: '1', content: 'Message 1' },
        { id: '2', content: 'Message 2' },
        { id: '3', content: 'Message 3' },
      ]

      const encrypted = messages.map((msg) =>
        StorageEncryption.encryptMessage(msg)
      )
      const decrypted = StorageEncryption.decryptMessages(encrypted)

      expect(decrypted).toHaveLength(messages.length)
      decrypted.forEach((msg, index) => {
        expect(msg.id).toBe(messages[index].id)
        expect(msg.content).toBe(messages[index].content)
      })
    })

    it('should handle empty array', () => {
      const result = StorageEncryption.decryptMessages([])
      expect(result).toEqual([])
    })

    it('should handle individual message decryption failures gracefully', () => {
      const invalidMessage = { id: '2', content: 'invalid-encrypted' }

      // Mock decrypt to fail for invalid message
      vi.mocked(safeStorage.decryptString).mockImplementationOnce(() => {
        throw new Error('Decryption failed')
      })

      // Should return message as-is when decryption fails
      const decrypted = StorageEncryption.decryptMessages([invalidMessage])

      expect(decrypted).toHaveLength(1)
      expect(decrypted[0].content).toBe('invalid-encrypted') // Unchanged
    })
  })

  describe('Integration: Round-trip encryption/decryption', () => {
    it('should maintain data integrity through encrypt/decrypt cycle', () => {
      const testMessage = {
        id: crypto.randomUUID(),
        sessionId: crypto.randomUUID(),
        type: 'user' as const,
        content: 'This is a test message with special chars: 你好 🦄 ñ',
        timestamp: new Date(),
        provider: 'anthropic',
        model: 'claude-sonnet-4',
        tokenCount: 42,
        metadata: {
          contextUsage: 15,
        },
      }

      // Encrypt
      const encrypted = StorageEncryption.encryptMessage(testMessage)

      // Verify encryption changed content
      expect(encrypted.content).not.toBe(testMessage.content)

      // Verify all other fields preserved
      expect(encrypted.id).toBe(testMessage.id)
      expect(encrypted.sessionId).toBe(testMessage.sessionId)
      expect(encrypted.type).toBe(testMessage.type)
      expect(encrypted.metadata).toEqual(testMessage.metadata)

      // Decrypt
      const decrypted = StorageEncryption.decryptMessage(encrypted)

      // Verify complete round-trip
      expect(decrypted.id).toBe(testMessage.id)
      expect(decrypted.content).toBe(testMessage.content)
      expect(decrypted.sessionId).toBe(testMessage.sessionId)
      expect(decrypted.type).toBe(testMessage.type)
      expect(decrypted.provider).toBe(testMessage.provider)
      expect(decrypted.model).toBe(testMessage.model)
      expect(decrypted.tokenCount).toBe(testMessage.tokenCount)
      expect(decrypted.metadata).toEqual(testMessage.metadata)
      expect(decrypted.timestamp).toBe(testMessage.timestamp)
    })
  })
})
