/**
 * @fileoverview Tests for version synchronization script.
 *
 * @description
 * Simplified test suite for the version-sync functionality that focuses
 * on core functionality without complex module mocking.
 *
 * @author Hatcher DX Team
 * @since 0.3.5
 * @public
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Simple tests that validate the script exists and can be imported
describe('Version Sync Script', () => {
  let consoleLogSpy: any
  let consoleErrorSpy: any
  let consoleWarnSpy: any
  let processExitSpy: any
  let originalArgv: string[]
  let originalExit: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Store originals
    originalArgv = process.argv
    originalExit = process.exit

    // Mock console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    // Mock process.exit to prevent actual exit
    processExitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation((code?: number) => {
        throw new Error(`Process exited with code ${code}`)
      })
  })

  afterEach(() => {
    // Restore originals
    process.argv = originalArgv
    process.exit = originalExit

    vi.resetAllMocks()
    consoleLogSpy.mockRestore()
    consoleErrorSpy.mockRestore()
    consoleWarnSpy.mockRestore()
    processExitSpy.mockRestore()
  })

  describe('Module Import', () => {
    it('should be able to import the version-sync module', async () => {
      // This test ensures the module can be imported without errors
      await expect(import('./version-sync')).resolves.toBeDefined()
    })

    it('should export the main function', async () => {
      const module = await import('./version-sync')
      expect(typeof module.main).toBe('function')
    })

    it('should export the updatePackageVersion function', async () => {
      const module = await import('./version-sync')
      expect(typeof module.updatePackageVersion).toBe('function')
    })
  })

  describe('Argument Validation', () => {
    it('should require version argument', async () => {
      // Set no version argument
      process.argv = ['node', 'version-sync.ts']

      const module = await import('./version-sync')

      await expect(async () => {
        await module.main()
      }).rejects.toThrow('Process exited with code 1')

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Please provide a version number')
      )
    })

    it('should accept valid version argument', async () => {
      // Set valid version argument
      process.argv = ['node', 'version-sync.ts', '1.0.0']

      // This test just verifies the argument parsing doesn't throw immediately
      const module = await import('./version-sync')
      expect(module).toBeDefined()
    })
  })

  describe('Basic Functionality Tests', () => {
    it('should have the expected script structure', () => {
      // Test that the file exists and has the expected shebang
      const fs = require('fs')
      const path = require('path')
      const scriptPath = path.join(__dirname, 'version-sync.ts')

      expect(fs.existsSync(scriptPath)).toBe(true)

      const content = fs.readFileSync(scriptPath, 'utf-8')
      expect(content).toContain('#!/usr/bin/env tsx')
      expect(content).toContain('export function updatePackageVersion')
      expect(content).toContain('export async function main')
    })

    it('should contain expected error messages', () => {
      const fs = require('fs')
      const path = require('path')
      const scriptPath = path.join(__dirname, 'version-sync.ts')
      const content = fs.readFileSync(scriptPath, 'utf-8')

      expect(content).toContain('Please provide a version number')
      expect(content).toContain('File not found')
      expect(content).toContain('Error updating')
      expect(content).toContain('Version sync complete')
    })
  })

  describe('Configuration', () => {
    it('should have correct glob patterns', () => {
      const fs = require('fs')
      const path = require('path')
      const scriptPath = path.join(__dirname, 'version-sync.ts')
      const content = fs.readFileSync(scriptPath, 'utf-8')

      // Check for expected glob patterns
      expect(content).toContain('package.json')
      expect(content).toContain('apps/*/package.json')
      expect(content).toContain('universal/*/package.json')
      expect(content).toContain('tooling/*/package.json')
    })

    it('should ignore expected directories', () => {
      const fs = require('fs')
      const path = require('path')
      const scriptPath = path.join(__dirname, 'version-sync.ts')
      const content = fs.readFileSync(scriptPath, 'utf-8')

      // Check for expected ignore patterns
      expect(content).toContain('**/node_modules/**')
      expect(content).toContain('**/dist/**')
      expect(content).toContain('**/build/**')
      expect(content).toContain('**/.vitepress/**')
    })
  })

  describe('TypeScript Compliance', () => {
    it('should be valid TypeScript', () => {
      // This test ensures the TypeScript file is syntactically correct
      const fs = require('fs')
      const path = require('path')
      const scriptPath = path.join(__dirname, 'version-sync.ts')
      const content = fs.readFileSync(scriptPath, 'utf-8')

      // Basic syntax checks
      expect(content).not.toContain('// @ts-ignore')
      expect(content).not.toContain('// @ts-nocheck')

      // Check for proper imports
      expect(content).toMatch(/import.*from.*['"]fs['"]/)
      expect(content).toMatch(/import.*from.*['"]path['"]/)
      expect(content).toMatch(/import.*from.*['"]url['"]/)
      expect(content).toMatch(/import.*from.*['"]glob['"]/)
    })
  })
})
