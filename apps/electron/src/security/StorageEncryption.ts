/**
 * @fileoverview Reusable encryption utilities for secure storage operations.
 *
 * @description
 * Provides type-safe encryption and decryption utilities for sensitive data
 * using Electron's safeStorage API. Designed for reusability across all
 * storage operations that require encryption (messages, workspace paths, etc.).
 *
 * @example
 * ```typescript
 * // Encrypt a single message
 * const encrypted = StorageEncryption.encryptMessage(message)
 *
 * // Decrypt messages from storage
 * const decrypted = StorageEncryption.decryptMessages(messages)
 *
 * // Encrypt/decrypt raw strings
 * const ciphertext = StorageEncryption.encrypt('sensitive data')
 * const plaintext = StorageEncryption.decrypt(ciphertext)
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.1.0
 * @public
 */

import { safeStorage } from 'electron'

/**
 * Reusable encryption utility class for secure storage operations.
 *
 * @remarks
 * This class provides static methods for encrypting and decrypting data
 * using Electron's safeStorage API (OS-native encryption). All encrypted
 * data is encoded as base64 strings for storage compatibility.
 *
 * Encryption backends by platform:
 * - macOS: Keychain
 * - Windows: DPAPI (Data Protection API)
 * - Linux: libsecret/KWallet
 *
 * @example
 * ```typescript
 * // Basic string encryption
 * const encrypted = StorageEncryption.encrypt('Hello World')
 * const decrypted = StorageEncryption.decrypt(encrypted)
 *
 * // Message object encryption
 * const message = { id: '1', content: 'Secret message' }
 * const encryptedMsg = StorageEncryption.encryptMessage(message)
 * const decryptedMsg = StorageEncryption.decryptMessage(encryptedMsg)
 * ```
 *
 * @public
 * @since 1.1.0
 */
export class StorageEncryption {
  /**
   * Encrypts a plain text string for secure storage.
   *
   * @param plainText - Plain text string to encrypt
   * @returns Base64 encoded encrypted string
   *
   * @throws {Error} When safeStorage encryption is not available
   * @throws {Error} When encryption operation fails
   *
   * @example
   * ```typescript
   * const encrypted = StorageEncryption.encrypt('sensitive data')
   * // Returns: "YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXo=" (example)
   * ```
   *
   * @public
   * @since 1.1.0
   */
  static encrypt(plainText: string): string {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error(
        'Encryption not available. Ensure Electron safeStorage is initialized.'
      )
    }

    try {
      const encryptedBuffer = safeStorage.encryptString(plainText)
      return encryptedBuffer.toString('base64')
    } catch (error) {
      console.error('[StorageEncryption] ❌ Encryption failed:', error)
      throw new Error(
        `Failed to encrypt data: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Decrypts a base64 encoded encrypted string.
   *
   * @param encryptedBase64 - Base64 encoded encrypted string
   * @returns Decrypted plain text string
   *
   * @throws {Error} When safeStorage decryption is not available
   * @throws {Error} When decryption operation fails
   * @throws {Error} When input is not valid base64
   *
   * @example
   * ```typescript
   * const encrypted = "YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXo="
   * const decrypted = StorageEncryption.decrypt(encrypted)
   * // Returns: "sensitive data"
   * ```
   *
   * @public
   * @since 1.1.0
   */
  static decrypt(encryptedBase64: string): string {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error(
        'Decryption not available. Ensure Electron safeStorage is initialized.'
      )
    }

    try {
      const encryptedBuffer = Buffer.from(encryptedBase64, 'base64')
      return safeStorage.decryptString(encryptedBuffer)
    } catch (error) {
      console.error('[StorageEncryption] ❌ Decryption failed:', error)
      throw new Error(
        `Failed to decrypt data: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Encrypts the content field of a message object for storage.
   *
   * @template T - Object type that extends { content: string }
   * @param message - Message object with plain text content
   * @returns Message object with encrypted content
   *
   * @throws {Error} When encryption fails
   *
   * @example
   * ```typescript
   * const message = { id: '123', content: 'Hello', timestamp: new Date() }
   * const encrypted = StorageEncryption.encryptMessage(message)
   * // encrypted.content is now base64 encrypted
   * ```
   *
   * @public
   * @since 1.1.0
   */
  static encryptMessage<T extends { content: string }>(message: T): T {
    return {
      ...message,
      content: this.encrypt(message.content),
    }
  }

  /**
   * Decrypts the content field of a message object from storage.
   *
   * @template T - Object type that extends { content: string }
   * @param message - Message object with encrypted content
   * @returns Message object with plain text content
   *
   * @remarks
   * This method includes defensive error handling. If decryption fails,
   * it returns the message as-is and logs the error, preventing crashes.
   *
   * @example
   * ```typescript
   * const encrypted = { id: '123', content: 'YWJj...', timestamp: new Date() }
   * const decrypted = StorageEncryption.decryptMessage(encrypted)
   * // decrypted.content is now plain text
   * ```
   *
   * @public
   * @since 1.1.0
   */
  static decryptMessage<T extends { content: string }>(message: T): T {
    try {
      return {
        ...message,
        content: this.decrypt(message.content),
      }
    } catch (error) {
      console.error(
        '[StorageEncryption] ❌ Failed to decrypt message content:',
        error
      )
      // Defensive: return message as-is if decryption fails
      // This prevents crashes but logs the error for debugging
      return message
    }
  }

  /**
   * Decrypts an array of message objects from storage.
   *
   * @template T - Object type that extends { content: string }
   * @param messages - Array of message objects with encrypted content
   * @returns Array of message objects with plain text content
   *
   * @remarks
   * Uses defensive decryption for each message individually.
   * If one message fails to decrypt, others will still be processed.
   *
   * @example
   * ```typescript
   * const encryptedMessages = [
   *   { id: '1', content: 'YWJj...' },
   *   { id: '2', content: 'ZGVm...' }
   * ]
   * const decrypted = StorageEncryption.decryptMessages(encryptedMessages)
   * // All messages now have plain text content
   * ```
   *
   * @public
   * @since 1.1.0
   */
  static decryptMessages<T extends { content: string }>(messages: T[]): T[] {
    return messages.map((msg) => this.decryptMessage(msg))
  }

  /**
   * Checks if encryption is available in the current environment.
   *
   * @returns True if safeStorage encryption is available
   *
   * @remarks
   * This is useful for conditional logic or validation before
   * attempting encryption operations.
   *
   * @example
   * ```typescript
   * if (StorageEncryption.isAvailable()) {
   *   const encrypted = StorageEncryption.encrypt('data')
   * } else {
   *   console.warn('Encryption not available')
   * }
   * ```
   *
   * @public
   * @since 1.1.0
   */
  static isAvailable(): boolean {
    return safeStorage.isEncryptionAvailable()
  }
}
