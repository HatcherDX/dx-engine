/**
 * @fileoverview Tests for encryption types
 *
 * @description
 * Comprehensive test suite for encryption types including error classes,
 * enums, and interfaces to achieve 100% code coverage.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @internal
 */

import { describe, it, expect } from 'vitest'
import {
  EncryptionError,
  EncryptionErrorCode,
  VaultError,
  VaultErrorCode,
} from './encryption'

describe('EncryptionError', () => {
  it('should create EncryptionError with message and code', () => {
    const error = new EncryptionError(
      'Encryption failed',
      EncryptionErrorCode.ENCRYPTION_FAILED
    )

    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(EncryptionError)
    expect(error.message).toBe('Encryption failed')
    expect(error.code).toBe(EncryptionErrorCode.ENCRYPTION_FAILED)
    expect(error.name).toBe('EncryptionError')
    expect(error.cause).toBeUndefined()
  })

  it('should create EncryptionError with message, code, and cause', () => {
    const cause = new Error('Original error')
    const error = new EncryptionError(
      'Decryption failed',
      EncryptionErrorCode.DECRYPTION_FAILED,
      cause
    )

    expect(error.message).toBe('Decryption failed')
    expect(error.code).toBe(EncryptionErrorCode.DECRYPTION_FAILED)
    expect(error.cause).toBe(cause)
    expect(error.name).toBe('EncryptionError')
  })

  it('should create EncryptionError with INVALID_KEY code', () => {
    const error = new EncryptionError(
      'Invalid encryption key',
      EncryptionErrorCode.INVALID_KEY
    )

    expect(error.code).toBe(EncryptionErrorCode.INVALID_KEY)
    expect(error.message).toBe('Invalid encryption key')
  })

  it('should create EncryptionError with INVALID_ALGORITHM code', () => {
    const error = new EncryptionError(
      'Invalid algorithm specified',
      EncryptionErrorCode.INVALID_ALGORITHM
    )

    expect(error.code).toBe(EncryptionErrorCode.INVALID_ALGORITHM)
    expect(error.message).toBe('Invalid algorithm specified')
  })

  it('should create EncryptionError with KEY_DERIVATION_FAILED code', () => {
    const error = new EncryptionError(
      'Failed to derive key',
      EncryptionErrorCode.KEY_DERIVATION_FAILED
    )

    expect(error.code).toBe(EncryptionErrorCode.KEY_DERIVATION_FAILED)
    expect(error.message).toBe('Failed to derive key')
  })

  it('should create EncryptionError with AUTHENTICATION_FAILED code', () => {
    const error = new EncryptionError(
      'Authentication tag verification failed',
      EncryptionErrorCode.AUTHENTICATION_FAILED
    )

    expect(error.code).toBe(EncryptionErrorCode.AUTHENTICATION_FAILED)
    expect(error.message).toBe('Authentication tag verification failed')
  })

  it('should create EncryptionError with VAULT_ERROR code', () => {
    const error = new EncryptionError(
      'Vault operation failed',
      EncryptionErrorCode.VAULT_ERROR
    )

    expect(error.code).toBe(EncryptionErrorCode.VAULT_ERROR)
    expect(error.message).toBe('Vault operation failed')
  })

  it('should properly set error stack trace', () => {
    const error = new EncryptionError(
      'Test error',
      EncryptionErrorCode.ENCRYPTION_FAILED
    )

    expect(error.stack).toBeDefined()
    expect(error.stack).toContain('EncryptionError')
  })
})

describe('VaultError', () => {
  it('should create VaultError with message and code', () => {
    const error = new VaultError(
      'Secret not found',
      VaultErrorCode.SECRET_NOT_FOUND
    )

    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(VaultError)
    expect(error.message).toBe('Secret not found')
    expect(error.code).toBe(VaultErrorCode.SECRET_NOT_FOUND)
    expect(error.name).toBe('VaultError')
    expect(error.cause).toBeUndefined()
  })

  it('should create VaultError with message, code, and cause', () => {
    const cause = new Error('Database error')
    const error = new VaultError(
      'Failed to retrieve secret',
      VaultErrorCode.SECRET_NOT_FOUND,
      cause
    )

    expect(error.message).toBe('Failed to retrieve secret')
    expect(error.code).toBe(VaultErrorCode.SECRET_NOT_FOUND)
    expect(error.cause).toBe(cause)
    expect(error.name).toBe('VaultError')
  })

  it('should create VaultError with INVALID_PASSPHRASE code', () => {
    const error = new VaultError(
      'Invalid passphrase provided',
      VaultErrorCode.INVALID_PASSPHRASE
    )

    expect(error.code).toBe(VaultErrorCode.INVALID_PASSPHRASE)
    expect(error.message).toBe('Invalid passphrase provided')
  })

  it('should create VaultError with DOUBLE_ENCRYPTION_FAILED code', () => {
    const error = new VaultError(
      'Double encryption process failed',
      VaultErrorCode.DOUBLE_ENCRYPTION_FAILED
    )

    expect(error.code).toBe(VaultErrorCode.DOUBLE_ENCRYPTION_FAILED)
    expect(error.message).toBe('Double encryption process failed')
  })

  it('should properly set error stack trace', () => {
    const error = new VaultError(
      'Test vault error',
      VaultErrorCode.SECRET_NOT_FOUND
    )

    expect(error.stack).toBeDefined()
    expect(error.stack).toContain('VaultError')
  })

  it('should handle nested causes properly', () => {
    const rootCause = new Error('Root cause')
    const intermediateCause = new EncryptionError(
      'Encryption layer failed',
      EncryptionErrorCode.ENCRYPTION_FAILED,
      rootCause
    )
    const vaultError = new VaultError(
      'Vault operation failed due to encryption',
      VaultErrorCode.DOUBLE_ENCRYPTION_FAILED,
      intermediateCause
    )

    expect(vaultError.cause).toBe(intermediateCause)
    expect((vaultError.cause as EncryptionError).cause).toBe(rootCause)
  })
})

describe('EncryptionErrorCode enum', () => {
  it('should have all expected error codes', () => {
    expect(EncryptionErrorCode.INVALID_KEY).toBe('INVALID_KEY')
    expect(EncryptionErrorCode.INVALID_ALGORITHM).toBe('INVALID_ALGORITHM')
    expect(EncryptionErrorCode.ENCRYPTION_FAILED).toBe('ENCRYPTION_FAILED')
    expect(EncryptionErrorCode.DECRYPTION_FAILED).toBe('DECRYPTION_FAILED')
    expect(EncryptionErrorCode.KEY_DERIVATION_FAILED).toBe(
      'KEY_DERIVATION_FAILED'
    )
    expect(EncryptionErrorCode.AUTHENTICATION_FAILED).toBe(
      'AUTHENTICATION_FAILED'
    )
    expect(EncryptionErrorCode.VAULT_ERROR).toBe('VAULT_ERROR')
  })

  it('should have unique values for each error code', () => {
    const codes = Object.values(EncryptionErrorCode)
    const uniqueCodes = [...new Set(codes)]
    expect(codes.length).toBe(uniqueCodes.length)
  })
})

describe('VaultErrorCode enum', () => {
  it('should have all expected error codes', () => {
    expect(VaultErrorCode.SECRET_NOT_FOUND).toBe('SECRET_NOT_FOUND')
    expect(VaultErrorCode.INVALID_PASSPHRASE).toBe('INVALID_PASSPHRASE')
    expect(VaultErrorCode.DOUBLE_ENCRYPTION_FAILED).toBe(
      'DOUBLE_ENCRYPTION_FAILED'
    )
  })

  it('should have unique values for each error code', () => {
    const codes = Object.values(VaultErrorCode)
    const uniqueCodes = [...new Set(codes)]
    expect(codes.length).toBe(uniqueCodes.length)
  })
})

describe('Type exports verification', () => {
  it('should export EncryptionError class', () => {
    expect(EncryptionError).toBeDefined()
    expect(typeof EncryptionError).toBe('function')
  })

  it('should export VaultError class', () => {
    expect(VaultError).toBeDefined()
    expect(typeof VaultError).toBe('function')
  })

  it('should export EncryptionErrorCode enum', () => {
    expect(EncryptionErrorCode).toBeDefined()
    expect(typeof EncryptionErrorCode).toBe('object')
  })

  it('should export VaultErrorCode enum', () => {
    expect(VaultErrorCode).toBeDefined()
    expect(typeof VaultErrorCode).toBe('object')
  })
})

describe('Error inheritance and instanceof checks', () => {
  it('EncryptionError should be instanceof Error', () => {
    const error = new EncryptionError(
      'Test',
      EncryptionErrorCode.ENCRYPTION_FAILED
    )
    expect(error instanceof Error).toBe(true)
  })

  it('VaultError should be instanceof Error', () => {
    const error = new VaultError('Test', VaultErrorCode.SECRET_NOT_FOUND)
    expect(error instanceof Error).toBe(true)
  })

  it('EncryptionError should not be instanceof VaultError', () => {
    const error = new EncryptionError(
      'Test',
      EncryptionErrorCode.ENCRYPTION_FAILED
    )
    expect(error instanceof VaultError).toBe(false)
  })

  it('VaultError should not be instanceof EncryptionError', () => {
    const error = new VaultError('Test', VaultErrorCode.SECRET_NOT_FOUND)
    expect(error instanceof EncryptionError).toBe(false)
  })
})

describe('Error serialization', () => {
  it('should serialize EncryptionError to JSON correctly', () => {
    const error = new EncryptionError(
      'Test error',
      EncryptionErrorCode.ENCRYPTION_FAILED
    )

    const json = JSON.stringify({
      name: error.name,
      message: error.message,
      code: error.code,
    })

    const parsed = JSON.parse(json)
    expect(parsed.name).toBe('EncryptionError')
    expect(parsed.message).toBe('Test error')
    expect(parsed.code).toBe(EncryptionErrorCode.ENCRYPTION_FAILED)
  })

  it('should serialize VaultError to JSON correctly', () => {
    const error = new VaultError(
      'Vault test error',
      VaultErrorCode.INVALID_PASSPHRASE
    )

    const json = JSON.stringify({
      name: error.name,
      message: error.message,
      code: error.code,
    })

    const parsed = JSON.parse(json)
    expect(parsed.name).toBe('VaultError')
    expect(parsed.message).toBe('Vault test error')
    expect(parsed.code).toBe(VaultErrorCode.INVALID_PASSPHRASE)
  })
})
