/**
 * @fileoverview AES-256-GCM encryption service with Argon2 key derivation
 *
 * @description
 * High-security encryption service using AES-256-GCM for data encryption
 * and Argon2 for password-based key derivation. Provides protection against
 * modern attack vectors including GPU-based attacks.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import * as argon2 from 'argon2'
import type {
  IEncryptionService,
  EncryptedData,
  DerivedKey,
} from '../types/encryption'
import type { EncryptionConfig } from '../types/storage'
import { EncryptionError, EncryptionErrorCode } from '../types/encryption'

/**
 * High-security encryption service implementation
 *
 * @remarks
 * Uses AES-256-GCM for authenticated encryption and Argon2id for key derivation.
 * Provides protection against timing attacks, GPU attacks, and data tampering.
 *
 * @example
 * ```typescript
 * const encryption = new EncryptionService({
 *   enabled: true,
 *   passphrase: 'user-strong-passphrase',
 *   algorithm: 'aes-256-gcm'
 * })
 *
 * const encrypted = await encryption.encrypt({ secret: 'data' })
 * const decrypted = await encryption.decrypt(encrypted)
 * ```
 *
 * @public
 */
export class EncryptionService implements IEncryptionService {
  private masterKey?: Buffer
  private derivedKeyCache = new Map<string, DerivedKey>()

  /**
   * Create encryption service instance
   *
   * @param config - Encryption configuration
   */
  constructor(private config: EncryptionConfig) {}

  /**
   * Derive encryption key from passphrase using Argon2
   *
   * @param passphrase - User-provided passphrase
   * @param salt - Optional salt (generates random if not provided)
   * @returns Promise that resolves to derived key with metadata
   *
   * @throws {@link EncryptionError}
   * Thrown when key derivation fails
   */
  async deriveKey(passphrase: string, salt?: Buffer): Promise<DerivedKey> {
    try {
      const actualSalt = salt || randomBytes(32)
      const cacheKey = `${passphrase}:${actualSalt.toString('hex')}`

      // Check cache first
      if (this.derivedKeyCache.has(cacheKey)) {
        return this.derivedKeyCache.get(cacheKey)!
      }

      // Argon2id parameters optimized for security vs performance
      const keyBuffer = await argon2.hash(passphrase, {
        type: argon2.argon2id,
        memoryCost: 65536, // 64MB memory usage
        timeCost: 3, // 3 iterations
        parallelism: 4, // 4 parallel threads
        hashLength: 32, // 256-bit key
        salt: actualSalt,
        raw: true, // Return raw buffer, not encoded string
      })

      const derivedKey: DerivedKey = {
        key: Buffer.from(keyBuffer as Buffer),
        salt: actualSalt,
        params: {
          salt: actualSalt.toString('base64'),
          algorithm: 'argon2id',
          memoryCost: 65536,
          iterations: 3,
          parallelism: 4,
        },
      }

      // Cache for performance (cleared on process exit)
      this.derivedKeyCache.set(cacheKey, derivedKey)

      // Set as master key if none exists
      if (!this.masterKey) {
        this.masterKey = derivedKey.key
      }

      return derivedKey
    } catch (error) {
      throw new EncryptionError(
        `Key derivation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        EncryptionErrorCode.KEY_DERIVATION_FAILED,
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * Encrypt data using AES-256-GCM
   *
   * @param data - Data to encrypt (any serializable type)
   * @param key - Optional key (uses master key if not provided)
   * @returns Promise that resolves to encrypted data container
   *
   * @throws {@link EncryptionError}
   * Thrown when encryption fails
   */
  async encrypt(data: unknown, key?: Buffer): Promise<EncryptedData> {
    try {
      const encryptionKey = key || this.masterKey
      if (!encryptionKey) {
        throw new EncryptionError(
          'No encryption key available. Derive key from passphrase first.',
          EncryptionErrorCode.INVALID_KEY
        )
      }

      const algorithm = this.config.algorithm || 'aes-256-gcm'
      const iv = randomBytes(16) // 128-bit IV for AES-GCM
      const cipher = createCipheriv(algorithm, encryptionKey, iv)

      // Serialize data
      const serialized = JSON.stringify(data)
      const dataBuffer = Buffer.from(serialized, 'utf8')

      // Encrypt
      const encrypted = Buffer.concat([
        cipher.update(dataBuffer),
        cipher.final(),
      ])

      // Get authentication tag
      const authTag =
        'getAuthTag' in cipher && typeof cipher.getAuthTag === 'function'
          ? cipher.getAuthTag()
          : Buffer.alloc(16) // Fallback for missing getAuthTag

      return {
        data: encrypted.toString('base64'),
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        algorithm,
        compressed: false, // Compression handled separately
        originalSize: dataBuffer.length,
      }
    } catch (error) {
      // Check if it's actually an EncryptionError and re-throw it
      if (error instanceof EncryptionError) {
        throw error
      }
      throw new EncryptionError(
        `Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        EncryptionErrorCode.ENCRYPTION_FAILED,
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * Decrypt data using AES-256-GCM
   *
   * @param encrypted - Encrypted data container
   * @param key - Optional key (uses master key if not provided)
   * @returns Promise that resolves to decrypted data
   *
   * @throws {@link EncryptionError}
   * Thrown when decryption or authentication fails
   */
  async decrypt(encrypted: EncryptedData, key?: Buffer): Promise<unknown> {
    try {
      if (!encrypted) {
        throw new EncryptionError(
          'Cannot decrypt: encrypted data is null or undefined',
          EncryptionErrorCode.DECRYPTION_FAILED
        )
      }

      const decryptionKey = key || this.masterKey
      if (!decryptionKey) {
        throw new EncryptionError(
          'No decryption key available. Derive key from passphrase first.',
          EncryptionErrorCode.INVALID_KEY
        )
      }

      const { algorithm, data, iv, authTag } = encrypted
      const decipher = createDecipheriv(
        algorithm,
        decryptionKey,
        Buffer.from(iv, 'base64')
      )

      // Set authentication tag for verification
      if (
        'setAuthTag' in decipher &&
        typeof decipher.setAuthTag === 'function'
      ) {
        decipher.setAuthTag(Buffer.from(authTag, 'base64'))
      }

      // Decrypt
      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(data, 'base64')),
        decipher.final(),
      ])

      // Parse JSON
      return JSON.parse(decrypted.toString('utf8'))
    } catch (error) {
      throw new EncryptionError(
        `Decryption failed: ${error instanceof Error ? error.message : 'Authentication failed or corrupted data'}`,
        EncryptionErrorCode.AUTHENTICATION_FAILED,
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * Encrypt specific fields in an object
   *
   * @param data - Object containing fields to encrypt
   * @param fields - Array of field names to encrypt
   * @returns Promise that resolves to object with encrypted fields
   */
  async encryptFields(
    data: Record<string, unknown>,
    fields: string[]
  ): Promise<Record<string, unknown>> {
    if (!data || typeof data !== 'object') {
      return data
    }

    const result = { ...data }

    for (const field of fields) {
      if (this.hasNestedField(data, field)) {
        const value = this.getNestedField(data, field)
        if (value !== undefined) {
          const encrypted = await this.encrypt(value)
          this.setNestedField(result, field, encrypted)
        }
      }
    }

    return result
  }

  /**
   * Decrypt specific fields in an object
   *
   * @param data - Object containing encrypted fields
   * @param fields - Array of field names to decrypt
   * @returns Promise that resolves to object with decrypted fields
   */
  async decryptFields(
    data: Record<string, unknown>,
    fields: string[]
  ): Promise<Record<string, unknown>> {
    if (!data || typeof data !== 'object') {
      return data
    }

    const result = { ...data }

    for (const field of fields) {
      if (this.hasNestedField(data, field)) {
        const value = this.getNestedField(data, field)
        if (value && this.isEncrypted(value)) {
          const decrypted = await this.decrypt(value as EncryptedData)
          this.setNestedField(result, field, decrypted)
        }
      }
    }

    return result
  }

  /**
   * Rotate encryption keys (re-encrypt all data with new key)
   *
   * @param newPassphrase - New passphrase for key derivation
   * @returns Promise that resolves when rotation completes
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async rotateKeys(_newPassphrase: string): Promise<void> {
    // This would need to be implemented with the storage adapter
    // to re-encrypt all existing data
    throw new EncryptionError(
      'Key rotation not implemented yet',
      EncryptionErrorCode.KEY_DERIVATION_FAILED
    )
  }

  /**
   * Check if data appears to be encrypted
   *
   * @param data - Data to check
   * @returns True if data looks like encrypted data
   */
  isEncrypted(data: unknown): boolean {
    if (!data || typeof data !== 'object' || data === null) {
      return false
    }

    // Type guard to check if data has the required properties
    const encryptedData = data as Record<string, unknown>

    return !!(
      encryptedData.data &&
      encryptedData.iv &&
      encryptedData.authTag &&
      encryptedData.algorithm &&
      typeof encryptedData.data === 'string' &&
      typeof encryptedData.iv === 'string' &&
      typeof encryptedData.authTag === 'string' &&
      typeof encryptedData.algorithm === 'string'
    )
  }

  /**
   * Generate random encryption key for testing
   *
   * @returns Random 256-bit key
   */
  static generateRandomKey(): Buffer {
    return randomBytes(32) // 256-bit key
  }

  /**
   * Verify passphrase strength
   *
   * @param passphrase - Passphrase to verify
   * @returns Strength score (0-100) and recommendations
   */
  static analyzePassphraseStrength(passphrase: string): {
    score: number
    issues: string[]
    recommendations: string[]
  } {
    const issues: string[] = []
    const recommendations: string[] = []
    let score = 0

    // Length check
    if (passphrase.length < 12) {
      issues.push('Too short')
      recommendations.push('Use at least 12 characters')
    } else if (passphrase.length >= 20) {
      score += 30
    } else {
      score += 20
    }

    // Character diversity
    if (/[a-z]/.test(passphrase)) score += 10
    if (/[A-Z]/.test(passphrase)) score += 10
    if (/[0-9]/.test(passphrase)) score += 10
    if (/[^a-zA-Z0-9]/.test(passphrase)) score += 15

    // Common patterns
    if (/(.)\1{2,}/.test(passphrase)) {
      issues.push('Contains repeated characters')
      score -= 10
    }

    if (/^[a-zA-Z]+$/.test(passphrase)) {
      issues.push('Only letters')
      recommendations.push('Add numbers and symbols')
    }

    // Entropy estimation
    const entropy = this.estimateEntropy(passphrase)
    if (entropy < 40) {
      issues.push('Low entropy')
      recommendations.push('Use more diverse characters')
    } else if (entropy >= 80) {
      score += 25
    } else {
      score += 15
    }

    return { score: Math.min(100, score), issues, recommendations }
  }

  /**
   * Estimate passphrase entropy
   *
   * @param passphrase - Passphrase to analyze
   * @returns Estimated entropy in bits
   */
  private static estimateEntropy(passphrase: string): number {
    const charsets = [
      /[a-z]/g, // lowercase: 26 chars
      /[A-Z]/g, // uppercase: 26 chars
      /[0-9]/g, // digits: 10 chars
      /[^a-zA-Z0-9]/g, // symbols: ~32 chars
    ]

    const charsetSizes = [26, 26, 10, 32]
    let totalCharsetSize = 0

    for (let i = 0; i < charsets.length; i++) {
      if (charsets[i].test(passphrase)) {
        totalCharsetSize += charsetSizes[i]
      }
    }

    return Math.log2(totalCharsetSize) * passphrase.length
  }

  // Helper methods for nested field access

  /**
   * Check if object has nested field
   */
  private hasNestedField(obj: Record<string, unknown>, field: string): boolean {
    const parts = field.split('.')
    let current: unknown = obj

    for (const part of parts) {
      if (
        !current ||
        typeof current !== 'object' ||
        current === null ||
        !(part in current)
      ) {
        return false
      }
      current = (current as Record<string, unknown>)[part]
    }

    return true
  }

  /**
   * Get nested field value
   */
  private getNestedField(obj: Record<string, unknown>, field: string): unknown {
    const parts = field.split('.')
    let current: unknown = obj

    for (const part of parts) {
      if (!current || typeof current !== 'object' || current === null) {
        return undefined
      }
      current = (current as Record<string, unknown>)[part]
    }

    return current
  }

  /**
   * Set nested field value
   */
  private setNestedField(
    obj: Record<string, unknown>,
    field: string,
    value: unknown
  ): void {
    const parts = field.split('.')
    let current: Record<string, unknown> = obj

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]
      if (
        !current[part] ||
        typeof current[part] !== 'object' ||
        current[part] === null
      ) {
        current[part] = {}
      }
      current = current[part] as Record<string, unknown>
    }

    current[parts[parts.length - 1]] = value
  }
}
