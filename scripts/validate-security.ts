#!/usr/bin/env tsx

/**
 * @fileoverview Cross-platform security validation script for Hatcher DX Engine
 *
 * @description
 * Validates that the secure storage system meets security requirements across
 * all supported platforms. This script is designed to run in CI/CD pipelines
 * and local development environments.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { spawn } from 'node:child_process'
import { platform } from 'node:os'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { performance } from 'node:perf_hooks'

interface SecurityValidationResult {
  platform: string
  encryptionAvailable: boolean
  backend?: string
  testsPassed: number
  testsFailed: number
  duration: number
  errors: string[]
}

/**
 * Main security validation orchestrator
 */
async function main(): Promise<void> {
  console.log('🔒 Hatcher DX Engine - Security Validation')
  console.log('==========================================\n')

  const startTime = performance.now()

  try {
    const result = await validatePlatformSecurity()

    const duration = Math.round(performance.now() - startTime)
    console.log(`\n✅ Security validation completed in ${duration}ms`)

    printSummary(result)

    if (result.testsFailed > 0) {
      console.error('\n❌ Security validation failed')
      process.exit(1)
    }

    console.log('\n🚀 All security requirements validated successfully!')
    process.exit(0)
  } catch (error) {
    const duration = Math.round(performance.now() - startTime)
    console.error(`\n❌ Security validation failed after ${duration}ms`)
    console.error('Error:', error.message)
    process.exit(1)
  }
}

/**
 * Validate security requirements for the current platform
 */
async function validatePlatformSecurity(): Promise<SecurityValidationResult> {
  const currentPlatform = platform()
  console.log(`🔍 Platform: ${currentPlatform}`)

  const result: SecurityValidationResult = {
    platform: currentPlatform,
    encryptionAvailable: false,
    testsPassed: 0,
    testsFailed: 0,
    duration: 0,
    errors: [],
  }

  const startTime = performance.now()

  // Test 1: Electron availability
  console.log('\n📦 Test 1: Electron Installation')
  try {
    await validateElectronInstallation()
    result.testsPassed++
    console.log('   ✅ Electron is available')
  } catch (error) {
    result.testsFailed++
    result.errors.push(`Electron not available: ${error.message}`)
    console.error(`   ❌ ${error.message}`)
  }

  // Test 2: safeStorage API validation
  console.log('\n🔐 Test 2: safeStorage API Validation')
  try {
    const safeStorageResult = await validateSafeStorage()
    result.encryptionAvailable = safeStorageResult.encryptionAvailable
    result.backend = safeStorageResult.backend
    result.testsPassed++

    console.log(`   ✅ Encryption available: ${result.encryptionAvailable}`)
    if (result.backend) {
      console.log(`   ✅ Backend: ${result.backend}`)
    }
  } catch (error) {
    result.testsFailed++
    result.errors.push(`safeStorage validation failed: ${error.message}`)
    console.error(`   ❌ ${error.message}`)
  }

  // Test 3: Platform-specific validations
  console.log('\n🖥️  Test 3: Platform-specific Security')
  try {
    await validatePlatformSpecific(currentPlatform)
    result.testsPassed++
    console.log('   ✅ Platform-specific security validated')
  } catch (error) {
    result.testsFailed++
    result.errors.push(`Platform security failed: ${error.message}`)
    console.error(`   ❌ ${error.message}`)
  }

  // Test 4: Encryption round-trip
  console.log('\n🔄 Test 4: Encryption Round-trip')
  try {
    await validateEncryptionRoundTrip()
    result.testsPassed++
    console.log('   ✅ Encryption round-trip successful')
  } catch (error) {
    result.testsFailed++
    result.errors.push(`Encryption round-trip failed: ${error.message}`)
    console.error(`   ❌ ${error.message}`)
  }

  result.duration = Math.round(performance.now() - startTime)
  return result
}

/**
 * Validate that Electron is properly installed
 */
async function validateElectronInstallation(): Promise<void> {
  const electronPath = join(process.cwd(), 'node_modules', '.bin', 'electron')

  if (!existsSync(electronPath) && !existsSync(`${electronPath}.cmd`)) {
    throw new Error('Electron binary not found in node_modules')
  }

  return new Promise((resolve, reject) => {
    const proc = spawn('npx', ['electron', '--version'], {
      stdio: 'pipe',
      timeout: 10000,
    })

    let output = ''
    proc.stdout.on('data', (data) => {
      output += data.toString()
    })

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error('Electron version check failed'))
      } else {
        const version = output.trim()
        console.log(`   📦 Version: ${version}`)
        resolve()
      }
    })

    proc.on('error', (error) => {
      reject(new Error(`Failed to run Electron: ${error.message}`))
    })
  })
}

/**
 * Validate safeStorage API availability and configuration
 */
async function validateSafeStorage(): Promise<{
  encryptionAvailable: boolean
  backend?: string
}> {
  const testScript = `
    const { app, safeStorage } = require('electron')
    
    app.whenReady().then(() => {
      const result = {
        encryptionAvailable: safeStorage.isEncryptionAvailable(),
        platform: process.platform
      }
      
      if (process.platform === 'linux') {
        result.backend = safeStorage.getSelectedStorageBackend()
      }
      
      console.log(JSON.stringify(result))
      app.quit()
    })
  `

  return new Promise((resolve, reject) => {
    const proc = spawn('npx', ['electron', '-e', testScript], {
      stdio: 'pipe',
      timeout: 15000,
      env: { ...process.env, DISPLAY: process.env.DISPLAY || ':99' },
    })

    let output = ''
    let errorOutput = ''

    proc.stdout.on('data', (data) => {
      output += data.toString()
    })

    proc.stderr.on('data', (data) => {
      errorOutput += data.toString()
    })

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`safeStorage test failed: ${errorOutput}`))
      } else {
        try {
          const result = JSON.parse(output.trim().split('\n').pop() || '{}')
          resolve({
            encryptionAvailable: result.encryptionAvailable || false,
            backend: result.backend,
          })
        } catch (error) {
          reject(
            new Error(`Failed to parse safeStorage result: ${error.message}`)
          )
        }
      }
    })

    proc.on('error', (error) => {
      reject(new Error(`Failed to test safeStorage: ${error.message}`))
    })
  })
}

/**
 * Validate platform-specific security requirements
 */
async function validatePlatformSpecific(
  currentPlatform: string
): Promise<void> {
  switch (currentPlatform) {
    case 'darwin':
      return validateMacOSSecurity()
    case 'win32':
      return validateWindowsSecurity()
    case 'linux':
      return validateLinuxSecurity()
    default:
      throw new Error(`Unsupported platform: ${currentPlatform}`)
  }
}

/**
 * Validate macOS Keychain availability
 */
async function validateMacOSSecurity(): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('security', ['list-keychains'], {
      stdio: 'pipe',
      timeout: 5000,
    })

    proc.on('close', (code) => {
      if (code === 0) {
        console.log('   🍎 macOS Keychain accessible')
        resolve()
      } else {
        reject(new Error('macOS Keychain not accessible'))
      }
    })

    proc.on('error', (error) => {
      reject(new Error(`Keychain validation failed: ${error.message}`))
    })
  })
}

/**
 * Validate Windows DPAPI availability
 */
async function validateWindowsSecurity(): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      'powershell',
      [
        '-Command',
        'Get-WmiObject -Class Win32_OperatingSystem | Select-Object Caption',
      ],
      {
        stdio: 'pipe',
        timeout: 10000,
      }
    )

    proc.on('close', (code) => {
      if (code === 0) {
        console.log('   🪟 Windows DPAPI available')
        resolve()
      } else {
        reject(new Error('Windows DPAPI validation failed'))
      }
    })

    proc.on('error', (error) => {
      reject(new Error(`Windows security validation failed: ${error.message}`))
    })
  })
}

/**
 * Validate Linux keyring services
 */
async function validateLinuxSecurity(): Promise<void> {
  // Check for keyring services
  const services = ['gnome-keyring-daemon', 'kwalletd5', 'kwalletd6']

  for (const service of services) {
    try {
      await checkLinuxService(service)
      console.log(`   🐧 Found ${service}`)
      return // At least one service is available
    } catch {
      // Continue checking other services
    }
  }

  // Check for libsecret
  try {
    await checkLinuxLibrary('libsecret-1.so.0')
    console.log('   🐧 libsecret library available')
    return
  } catch {
    // Continue to error
  }

  throw new Error(
    'No secure keyring service found (gnome-keyring, kwallet, or libsecret)'
  )
}

/**
 * Check if a Linux service is available
 */
async function checkLinuxService(serviceName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('which', [serviceName], {
      stdio: 'pipe',
      timeout: 3000,
    })

    proc.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`Service ${serviceName} not found`))
      }
    })

    proc.on('error', reject)
  })
}

/**
 * Check if a Linux library is available
 */
async function checkLinuxLibrary(libraryName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ldconfig', ['-p'], {
      stdio: 'pipe',
      timeout: 5000,
    })

    let output = ''
    proc.stdout.on('data', (data) => {
      output += data.toString()
    })

    proc.on('close', (code) => {
      if (code === 0 && output.includes(libraryName)) {
        resolve()
      } else {
        reject(new Error(`Library ${libraryName} not found`))
      }
    })

    proc.on('error', reject)
  })
}

/**
 * Test encryption round-trip functionality
 */
async function validateEncryptionRoundTrip(): Promise<void> {
  const testScript = `
    const { app, safeStorage } = require('electron')
    
    app.whenReady().then(() => {
      try {
        if (!safeStorage.isEncryptionAvailable()) {
          console.log('ENCRYPTION_NOT_AVAILABLE')
          app.quit()
          return
        }
        
        const testData = 'hatcher-security-test-🔐'
        const encrypted = safeStorage.encryptString(testData)
        const decrypted = safeStorage.decryptString(encrypted)
        
        if (decrypted === testData) {
          console.log('ENCRYPTION_SUCCESS')
        } else {
          console.log('ENCRYPTION_FAILED')
        }
      } catch (error) {
        console.log('ENCRYPTION_ERROR:' + error.message)
      }
      
      app.quit()
    })
  `

  return new Promise((resolve, reject) => {
    const proc = spawn('npx', ['electron', '-e', testScript], {
      stdio: 'pipe',
      timeout: 15000,
      env: { ...process.env, DISPLAY: process.env.DISPLAY || ':99' },
    })

    let output = ''

    proc.stdout.on('data', (data) => {
      output += data.toString()
    })

    proc.on('close', (code) => {
      const result = output.trim().split('\n').pop()

      if (result === 'ENCRYPTION_SUCCESS') {
        resolve()
      } else if (result === 'ENCRYPTION_NOT_AVAILABLE') {
        reject(new Error('Encryption not available for round-trip test'))
      } else if (result?.startsWith('ENCRYPTION_ERROR:')) {
        reject(new Error(result.replace('ENCRYPTION_ERROR:', '')))
      } else {
        reject(new Error('Encryption round-trip validation failed'))
      }
    })

    proc.on('error', (error) => {
      reject(new Error(`Round-trip test failed: ${error.message}`))
    })
  })
}

/**
 * Print validation summary
 */
function printSummary(result: SecurityValidationResult): void {
  console.log('\n📊 Security Validation Summary')
  console.log('==============================')
  console.log(`Platform: ${result.platform}`)
  console.log(
    `Encryption Available: ${result.encryptionAvailable ? '✅' : '❌'}`
  )
  if (result.backend) {
    console.log(`Backend: ${result.backend}`)
  }
  console.log(`Tests Passed: ${result.testsPassed}`)
  console.log(`Tests Failed: ${result.testsFailed}`)
  console.log(`Duration: ${result.duration}ms`)

  if (result.errors.length > 0) {
    console.log('\n🚨 Errors:')
    result.errors.forEach((error) => console.log(`   - ${error}`))
  }
}

// Run the validation if this script is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Validation script error:', error)
    process.exit(1)
  })
}

export {
  main as validateSecurity,
  validatePlatformSecurity,
  validateElectronInstallation,
  validateSafeStorage,
  validatePlatformSpecific,
  validateMacOSSecurity,
  validateWindowsSecurity,
  validateLinuxSecurity,
  checkLinuxService,
  checkLinuxLibrary,
  validateEncryptionRoundTrip,
  printSummary,
}
