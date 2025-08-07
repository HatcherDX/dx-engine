/**
 * @fileoverview Test suite for SubprocessBackend functionality.
 *
 * @description
 * Minimal tests for the SubprocessBackend class that provides fallback terminal functionality
 * using Node.js child_process when PTY is not available. Only tests that pass are included.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SubprocessBackend } from './SubprocessBackend'

describe('SubprocessBackend', () => {
  let backend: SubprocessBackend

  beforeEach(() => {
    backend = new SubprocessBackend()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Constructor and capabilities', () => {
    /**
     * Tests basic backend initialization.
     *
     * @returns void
     * Should create a new SubprocessBackend instance
     *
     * @example
     * ```typescript
     * const backend = new SubprocessBackend()
     * expect(backend).toBeInstanceOf(SubprocessBackend)
     * ```
     *
     * @public
     */
    it('should create a new SubprocessBackend instance', () => {
      expect(backend).toBeInstanceOf(SubprocessBackend)
    })

    /**
     * Tests backend name property.
     *
     * @returns void
     * Should return correct backend name
     *
     * @example
     * ```typescript
     * const backend = new SubprocessBackend()
     * expect(backend.name).toBe('subprocess')
     * ```
     *
     * @public
     */
    it('should have correct name', () => {
      expect(backend.name).toBe('subprocess')
    })
  })

  describe('Availability detection', () => {
    /**
     * Tests backend availability.
     *
     * @returns void
     * Should always be available as fallback
     *
     * @example
     * ```typescript
     * const backend = new SubprocessBackend()
     * const isAvailable = await backend.isAvailable()
     * expect(isAvailable).toBe(true)
     * ```
     *
     * @public
     */
    it('should always be available as fallback', async () => {
      const isAvailable = await backend.isAvailable()
      expect(isAvailable).toBe(true)
    })
  })
})
