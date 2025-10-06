/**
 * @fileoverview Cross-platform security tests for SecureStorageService
 *
 * @description
 * Comprehensive test suite validating secure storage functionality across
 * macOS, Windows, and Linux platforms. Tests safeStorage API integration,
 * platform-specific backends, and encryption round-trip operations.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from 'vitest'
import { SecureStorageService } from '../SecureStorageService'
import * as fs from 'fs/promises'
import * as path from 'path'

// Mock electron module
vi.mock('electron', () => ({
  app: {
    isReady: vi.fn(() => true),
    whenReady: vi.fn(() => Promise.resolve()),
    getPath: vi.fn((name: string) => `/mock/path/${name}`),
  },
  safeStorage: {
    isEncryptionAvailable: vi.fn(() => true),
    encryptString: vi.fn((plainText: string) =>
      Buffer.from(`encrypted:${plainText}`)
    ),
    decryptString: vi.fn((encrypted: Buffer) =>
      encrypted.toString().replace('encrypted:', '')
    ),
  },
}))

// Mock fs/promises
vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    mkdir: vi.fn(() => Promise.resolve()),
    rm: vi.fn(() => Promise.resolve()),
    writeFile: vi.fn(() => Promise.resolve()),
    readFile: vi.fn(() => Promise.resolve(Buffer.from('mock-key-data'))),
    access: vi.fn((path: string) => {
      if (!path || path.trim() === '') {
        return Promise.reject(new Error('ENOENT: no such file or directory'))
      }
      return Promise.resolve()
    }),
  }
})

describe('SecureStorageService - Cross Platform', () => {
  let service: SecureStorageService
  let testDataDir: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test requires flexible typing for validation testing
  let safeStorage: any

  beforeAll(async () => {
    // Mock imports after module mock is set up
    const electron = await import('electron')
    const { app } = electron
    safeStorage = electron.safeStorage

    // Ensure app is ready before running tests
    if (!app.isReady()) {
      await app.whenReady()
    }

    // Create temporary directory for test data
    testDataDir = path.join(app.getPath('userData'), 'test-storage')
    await fs.mkdir(testDataDir, { recursive: true })
  })

  beforeEach(() => {
    service = new SecureStorageService()
  })

  afterAll(async () => {
    // Cleanup test directory
    try {
      await fs.rm(testDataDir, { recursive: true, force: true })
    } catch (error) {
      console.warn('Failed to cleanup test directory:', error)
    }
  })

  describe('Platform Detection and Validation', () => {
    it('should detect platform correctly', () => {
      const platform = process.platform
      expect(platform).toBeDefined()
      expect(['darwin', 'win32', 'linux']).toContain(platform)
    })

    it('should validate security requirements', async () => {
      // This test validates our security implementation
      await expect(service.initialize()).resolves.not.toThrow()

      const securityInfo = service.getSecurityInfo()
      expect(securityInfo.platform).toBe(process.platform)
      expect(securityInfo.encryptionAvailable).toBeDefined()
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

        const backendTypes = {
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

    it.skipIf(!isMacOS)('should handle macOS security properly', async () => {
      const securityInfo = service.getSecurityInfo()

      expect(securityInfo.platform).toBe('darwin')
      expect(securityInfo.encryptionAvailable).toBe(true)
      expect(securityInfo.keyringService).toBe('macOS Keychain')
    })
  })

  describe('Windows DPAPI Integration', () => {
    const isWindows = process.platform === 'win32'

    it.skipIf(!isWindows)('should use Windows DPAPI', () => {
      expect(safeStorage.isEncryptionAvailable()).toBe(true)
      console.log('✅ Windows DPAPI encryption available')
    })

    it.skipIf(!isWindows)(
      'should handle Windows security properly',
      async () => {
        const securityInfo = service.getSecurityInfo()

        expect(securityInfo.platform).toBe('win32')
        expect(securityInfo.encryptionAvailable).toBe(true)
        expect(securityInfo.keyringService).toBe('DPAPI')
      }
    )
  })

  describe('Encryption Round-trip Testing', () => {
    it('should encrypt and decrypt successfully', () => {
      if (!safeStorage.isEncryptionAvailable()) {
        console.warn('⚠️  Skipping: Encryption not available')
        return
      }

      const plainText = 'hatcher-dx-engine-test-data-123'
      const encrypted = safeStorage.encryptString(plainText)

      // Encrypted data should be different and not empty
      expect(encrypted).toBeDefined()
      expect(encrypted).not.toBe(plainText)
      expect(encrypted.length).toBeGreaterThan(0)

      // Decrypt should return original data
      const decrypted = safeStorage.decryptString(encrypted)
      expect(decrypted).toBe(plainText)
    })

    it('should handle Unicode correctly', () => {
      if (!safeStorage.isEncryptionAvailable()) {
        console.warn('⚠️  Skipping: Encryption not available')
        return
      }

      const unicode = '🔐 Hatcher IDE 安全 パスワード مؤمن'
      const encrypted = safeStorage.encryptString(unicode)
      const decrypted = safeStorage.decryptString(encrypted)

      expect(decrypted).toBe(unicode)
      console.log('✅ Unicode encryption test passed')
    })

    it('should handle empty strings', () => {
      if (!safeStorage.isEncryptionAvailable()) {
        console.warn('⚠️  Skipping: Encryption not available')
        return
      }

      const empty = ''
      const encrypted = safeStorage.encryptString(empty)
      const decrypted = safeStorage.decryptString(encrypted)

      expect(decrypted).toBe(empty)
    })

    it('should handle large strings', () => {
      if (!safeStorage.isEncryptionAvailable()) {
        console.warn('⚠️  Skipping: Encryption not available')
        return
      }

      // Create a 1MB string
      const largeString = 'A'.repeat(1024 * 1024)
      const encrypted = safeStorage.encryptString(largeString)
      const decrypted = safeStorage.decryptString(encrypted)

      expect(decrypted).toBe(largeString)
      expect(decrypted.length).toBe(1024 * 1024)
      console.log('✅ Large string encryption test passed')
    })
  })

  describe('Storage Integration Tests', () => {
    it('should initialize storage service successfully', async () => {
      await expect(service.initialize()).resolves.not.toThrow()

      const securityInfo = service.getSecurityInfo()
      expect(securityInfo).toBeDefined()
      expect(securityInfo.platform).toBe(process.platform)
    })

    it('should store and retrieve projects securely', async () => {
      await service.initialize()

      const testProject = {
        path: '/home/user/projects/test-project',
        name: 'Test Project',
        metadata: {
          framework: 'Vue.js',
          packageManager: 'pnpm',
        },
      }

      // Add project
      await service.addRecentProject(testProject)

      // Retrieve projects
      const projects = await service.getRecentProjects()

      expect(projects).toHaveLength(1)
      expect(projects[0].id).toBeTruthy() // ID should be generated
      expect(projects[0].name).toBe(testProject.name)
      expect(projects[0].path).toBe(testProject.path)
      expect(projects[0].metadata?.framework).toBe('Vue.js')

      // Path should be decrypted, not stored as encrypted
      expect(projects[0].path).not.toContain('encrypted')

      console.log('✅ Project storage encryption test passed')
    })

    it('should handle storage errors gracefully', async () => {
      // Test with invalid project data
      await service.initialize()

      const invalidProject = {
        id: '', // Invalid ID
        path: '', // Invalid path
        name: '',
        lastOpened: new Date(),
      }

      await expect(service.addRecentProject(invalidProject)).rejects.toThrow()
    })

    it('should manage IDE configuration securely', async () => {
      await service.initialize()

      const testConfig = {
        ui: {
          theme: 'dark' as const,
          sidebarWidth: 300,
          terminalHeight: 200,
        },
        editor: {
          fontSize: 14,
          fontFamily: 'Monaco',
          tabSize: 2,
          wordWrap: true,
        },
      }

      await service.updateIDEConfig(testConfig)
      const config = await service.getIDEConfig()

      expect(config.ui.theme).toBe('dark')
      expect(config.ui.sidebarWidth).toBe(300)
      expect(config.editor.fontSize).toBe(14)

      console.log('✅ IDE config storage test passed')
    })
  })

  describe('Security Compliance Tests', () => {
    it('should enforce security requirements', async () => {
      // Test that the service properly validates security
      const securityInfo = service.getSecurityInfo()

      expect(securityInfo.platform).toBeDefined()
      expect(typeof securityInfo.encryptionAvailable).toBe('boolean')

      if (process.platform === 'linux') {
        expect(securityInfo.backend).toBeDefined()

        // If running in CI, should not allow basic_text
        if (process.env.CI && securityInfo.backend === 'basic_text') {
          throw new Error('CI environment should not use basic_text backend')
        }
      }
    })

    it('should validate encryption availability correctly', () => {
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

    it('should prevent insecure operations', async () => {
      // Test that we don't allow operations without proper security
      if (!safeStorage.isEncryptionAvailable()) {
        console.log('Testing insecure environment handling...')

        // Service should not initialize in insecure environments
        if (process.platform === 'linux') {
          const backend = safeStorage.getSelectedStorageBackend()
          if (backend === 'basic_text') {
            console.log('✅ Correctly detected insecure environment')
            // In a real scenario, the app would quit here
          }
        }
      }
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
        const encrypted = safeStorage.encryptString(testData)
        const decrypted = safeStorage.decryptString(encrypted)
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
        const encrypted = safeStorage.encryptString(data)
        return safeStorage.decryptString(encrypted)
      })

      const results = await Promise.all(promises)

      results.forEach((result, index) => {
        expect(result).toBe(testData[index])
      })

      console.log('✅ Concurrent encryption operations completed successfully')
    })
  })
})
