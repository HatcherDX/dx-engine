/**
 * @fileoverview Encryption types and interfaces
 *
 * @description
 * Defines types for encryption services, key management, and secure storage.
 * Supports AES-256-GCM encryption with Argon2 key derivation.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import type { EncryptionConfig } from './storage'

/**
 * Encrypted data container
 *
 * @public
 */
export interface EncryptedData {
  /**
   * Base64-encoded encrypted data
   */
  data: string

  /**
   * Base64-encoded initialization vector
   */
  iv: string

  /**
   * Base64-encoded authentication tag (for AEAD ciphers)
   */
  authTag: string

  /**
   * Encryption algorithm used
   */
  algorithm: string

  /**
   * Whether data was compressed before encryption
   */
  compressed: boolean

  /**
   * Original data size (before compression/encryption)
   */
  originalSize?: number

  /**
   * Key derivation parameters (if applicable)
   */
  keyParams?: KeyDerivationParams
}

/**
 * Key derivation parameters
 *
 * @public
 */
export interface KeyDerivationParams {
  /**
   * Salt used for key derivation
   */
  salt: string

  /**
   * Algorithm used for key derivation
   */
  algorithm: 'argon2id' | 'pbkdf2'

  /**
   * Iteration count or memory cost
   */
  iterations?: number

  /**
   * Memory cost (for Argon2)
   */
  memoryCost?: number

  /**
   * Parallelism factor (for Argon2)
   */
  parallelism?: number
}

/**
 * Derived encryption key
 *
 * @public
 */
export interface DerivedKey {
  /**
   * The derived key buffer
   */
  key: Buffer

  /**
   * Salt used for derivation
   */
  salt: Buffer

  /**
   * Derivation parameters
   */
  params: KeyDerivationParams
}

/**
 * Encryption service interface
 *
 * @remarks
 * Provides encryption and decryption services for storage data.
 * Supports both full data encryption and field-level encryption.
 *
 * @public
 */
export interface IEncryptionService {
  /**
   * Encrypt data with master key or provided key
   *
   * @param data - Data to encrypt (any serializable type)
   * @param key - Optional key to use (uses master key if not provided)
   * @returns Promise that resolves to encrypted data container
   *
   * @throws {@link EncryptionError}
   * Thrown when encryption fails
   */
  encrypt(data: unknown, key?: Buffer): Promise<EncryptedData>

  /**
   * Decrypt data with master key or provided key
   *
   * @param encrypted - Encrypted data container
   * @param key - Optional key to use (uses master key if not provided)
   * @returns Promise that resolves to decrypted data
   *
   * @throws {@link EncryptionError}
   * Thrown when decryption fails or authentication fails
   */
  decrypt(encrypted: EncryptedData, key?: Buffer): Promise<unknown>

  /**
   * Encrypt specific fields in an object
   *
   * @param data - Object containing data to encrypt
   * @param fields - Array of field names to encrypt
   * @returns Promise that resolves to object with encrypted fields
   */
  encryptFields(
    data: Record<string, unknown>,
    fields: string[]
  ): Promise<Record<string, unknown>>

  /**
   * Decrypt specific fields in an object
   *
   * @param data - Object containing encrypted fields
   * @param fields - Array of field names to decrypt
   * @returns Promise that resolves to object with decrypted fields
   */
  decryptFields(
    data: Record<string, unknown>,
    fields: string[]
  ): Promise<Record<string, unknown>>

  /**
   * Derive encryption key from passphrase
   *
   * @param passphrase - User-provided passphrase
   * @param salt - Optional salt (generates new if not provided)
   * @returns Promise that resolves to derived key with metadata
   */
  deriveKey(passphrase: string, salt?: Buffer): Promise<DerivedKey>

  /**
   * Rotate encryption keys (re-encrypt all data with new key)
   *
   * @param newPassphrase - New passphrase for key derivation
   * @returns Promise that resolves when rotation completes
   */
  rotateKeys(newPassphrase: string): Promise<void>

  /**
   * Verify if data is encrypted
   *
   * @param data - Data to check
   * @returns True if data appears to be encrypted
   */
  isEncrypted(data: unknown): boolean
}

/**
 * Vault interface for ultra-sensitive data storage
 *
 * @public
 */
export interface IVault {
  /**
   * Store sensitive data with double encryption
   *
   * @param key - Unique identifier
   * @param value - Sensitive data to store
   * @param metadata - Optional metadata
   * @returns Promise that resolves when data is stored
   */
  store(
    key: string,
    value: unknown,
    metadata?: Record<string, unknown>
  ): Promise<void>

  /**
   * Retrieve and decrypt sensitive data
   *
   * @param key - Unique identifier
   * @returns Promise that resolves to decrypted data or null
   */
  retrieve<T>(key: string): Promise<T | null>

  /**
   * Remove sensitive data
   *
   * @param key - Unique identifier
   * @returns Promise that resolves to true if data was removed
   */
  remove(key: string): Promise<boolean>

  /**
   * List all vault keys (without decrypting values)
   *
   * @returns Promise that resolves to array of vault keys
   */
  listKeys(): Promise<string[]>
}

/**
 * Vault-specific entry metadata
 *
 * @public
 */
export interface VaultEntry {
  /**
   * Double-encrypted data
   */
  data: EncryptedData

  /**
   * Entry creation timestamp
   */
  createdAt: number

  /**
   * Last access timestamp
   */
  lastAccessed: number

  /**
   * Number of times accessed
   */
  accessCount: number

  /**
   * Key version used for encryption
   */
  keyVersion: number

  /**
   * Additional metadata
   */
  metadata: Record<string, unknown>
}

/**
 * Vault configuration options
 *
 * @public
 */
export interface VaultConfig extends EncryptionConfig {
  /**
   * Key rotation interval in milliseconds
   * @defaultValue 30 days
   */
  keyRotationInterval?: number

  /**
   * Maximum access log entries to keep
   * @defaultValue 1000
   */
  maxAccessLogSize?: number

  /**
   * Whether to enable access auditing
   * @defaultValue true
   */
  auditEnabled?: boolean

  /**
   * Vault namespace for key isolation
   * @defaultValue 'vault'
   */
  namespace?: string

  /**
   * Enable automatic key rotation
   * @defaultValue false
   */
  autoRotateKeys?: boolean
}

/**
 * Encryption errors
 *
 * @public
 */
export class EncryptionError extends Error {
  constructor(
    message: string,
    public readonly code: EncryptionErrorCode,
    public readonly cause?: Error
  ) {
    super(message)
    this.name = 'EncryptionError'
  }
}

/**
 * Encryption error codes
 *
 * @public
 */
export enum EncryptionErrorCode {
  INVALID_KEY = 'INVALID_KEY',
  INVALID_ALGORITHM = 'INVALID_ALGORITHM',
  ENCRYPTION_FAILED = 'ENCRYPTION_FAILED',
  DECRYPTION_FAILED = 'DECRYPTION_FAILED',
  KEY_DERIVATION_FAILED = 'KEY_DERIVATION_FAILED',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  VAULT_ERROR = 'VAULT_ERROR',
}

/**
 * Vault errors
 *
 * @public
 */
export class VaultError extends Error {
  constructor(
    message: string,
    public readonly code: VaultErrorCode,
    public readonly cause?: Error
  ) {
    super(message)
    this.name = 'VaultError'
  }
}

/**
 * Vault error codes
 *
 * @public
 */
export enum VaultErrorCode {
  SECRET_NOT_FOUND = 'SECRET_NOT_FOUND',
  INVALID_PASSPHRASE = 'INVALID_PASSPHRASE',
  DOUBLE_ENCRYPTION_FAILED = 'DOUBLE_ENCRYPTION_FAILED',
}
