#!/usr/bin/env node

/**
 * Vitest Worker Timeout Diagnostic and Fix Script
 *
 * Implements robust solutions for "[vitest-worker]: Timeout calling 'onTaskUpdate'" errors
 * based on official Vitest documentation and best practices.
 *
 * @fileoverview Worker timeout diagnostic and mitigation script
 * @since 1.0.0
 * @public
 */

import { spawn } from 'child_process'
import { existsSync } from 'fs'
import { resolve } from 'path'

/**
 * Configuration strategies for worker timeout mitigation.
 *
 * @remarks
 * Based on Vitest documentation patterns for resolving worker communication issues.
 * Each strategy progressively increases isolation and reduces parallelism.
 */
interface TimeoutMitigationStrategy {
  /** Strategy name for logging */
  name: string
  /** Vitest configuration file to use */
  configFile: string
  /** CLI arguments for this strategy */
  args: string[]
  /** Description of what this strategy does */
  description: string
}

/**
 * Progressive mitigation strategies ordered from least to most conservative.
 *
 * @remarks
 * These strategies implement solutions from the Vitest documentation:
 * - Pool switching (forks -> vmForks)
 * - Memory limit configuration
 * - Worker count reduction
 * - Complete isolation
 */
const strategies: TimeoutMitigationStrategy[] = [
  {
    name: 'default-optimized',
    configFile: 'vitest.config.ts',
    args: ['--pool=forks', '--maxWorkers=4'],
    description: 'Enhanced default configuration with optimized pool settings',
  },
  {
    name: 'reduced-workers',
    configFile: 'vitest.config.ts',
    args: ['--pool=forks', '--maxWorkers=2', '--minWorkers=1'],
    description: 'Reduced worker count to minimize communication overhead',
  },
  {
    name: 'vmforks-pool',
    configFile: 'vitest.config.ts',
    args: ['--pool=vmForks', '--maxWorkers=2'],
    description: 'Switch to VM forks pool for enhanced isolation',
  },
  {
    name: 'single-worker',
    configFile: 'vitest.config.ts',
    args: ['--pool=vmForks', '--maxWorkers=1', '--fileParallelism=false'],
    description: 'Single worker execution to eliminate worker communication',
  },
  {
    name: 'full-isolation',
    configFile: 'vitest.worker-timeout.config.ts',
    args: [],
    description:
      'Maximum isolation configuration with specialized timeout handling',
  },
]

/**
 * Executes a test run with the specified strategy.
 *
 * @param strategy - The mitigation strategy to execute
 * @returns Promise that resolves to true if tests pass, false otherwise
 *
 * @example
 * ```typescript
 * const success = await executeStrategy(strategies[0])
 * if (success) {
 *   console.log('Strategy worked!')
 * }
 * ```
 */
async function executeStrategy(
  strategy: TimeoutMitigationStrategy
): Promise<boolean> {
  console.log(`\n🔧 Trying strategy: ${strategy.name}`)
  console.log(`📝 Description: ${strategy.description}`)

  // Verify config file exists
  if (!existsSync(resolve(process.cwd(), strategy.configFile))) {
    console.log(`❌ Config file not found: ${strategy.configFile}`)
    return false
  }

  const args = [
    'vitest',
    'run',
    `--config=${strategy.configFile}`,
    ...strategy.args,
    '--reporter=basic',
    '--silent=false',
  ]

  console.log(`🚀 Executing: pnpm ${args.join(' ')}`)

  return new Promise((resolve) => {
    const child = spawn('pnpm', args, {
      stdio: ['inherit', 'pipe', 'pipe'],
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: 'test',
        CI: 'true', // Force CI mode for consistent behavior
        FORCE_COLOR: '0', // Disable colors for cleaner output
      },
    })

    let stdout = ''
    let stderr = ''
    let hasWorkerTimeout = false

    child.stdout?.on('data', (data) => {
      const output = data.toString()
      stdout += output

      // Real-time monitoring for worker timeout
      if (output.includes('[vitest-worker]: Timeout calling')) {
        hasWorkerTimeout = true
        console.log('⚠️  Worker timeout detected during execution')
      }

      // Show test progress
      if (
        output.includes('✓') ||
        output.includes('✗') ||
        output.includes('PASS') ||
        output.includes('FAIL')
      ) {
        process.stdout.write(output)
      }
    })

    child.stderr?.on('data', (data) => {
      const output = data.toString()
      stderr += output

      // Monitor for timeout errors in stderr
      if (output.includes('[vitest-worker]: Timeout calling')) {
        hasWorkerTimeout = true
        console.log('⚠️  Worker timeout detected in stderr')
      }
    })

    child.on('close', (code) => {
      console.log(`\n📊 Process exited with code: ${code}`)

      if (hasWorkerTimeout) {
        console.log('❌ Worker timeout occurred with this strategy')
        resolve(false)
      } else if (code === 0) {
        console.log('✅ Tests completed successfully without worker timeouts')
        resolve(true)
      } else {
        console.log('⚠️  Tests failed, but no worker timeout detected')
        // Consider this a partial success if no timeout occurred
        resolve(!hasWorkerTimeout)
      }
    })

    child.on('error', (error) => {
      console.log(`❌ Failed to start process: ${error.message}`)
      resolve(false)
    })

    // Kill process after 10 minutes to prevent infinite hangs
    setTimeout(
      () => {
        console.log('⏰ Killing process after 10 minute timeout')
        child.kill('SIGKILL')
        resolve(false)
      },
      10 * 60 * 1000
    )
  })
}

/**
 * Main diagnostic and fix routine.
 *
 * @remarks
 * Progressively tries each mitigation strategy until one succeeds
 * or all strategies are exhausted.
 */
async function main() {
  console.log('🔍 Vitest Worker Timeout Diagnostic Tool')
  console.log('='.repeat(50))
  console.log(
    'This script will try progressive strategies to resolve worker timeout issues.'
  )
  console.log(
    'Based on official Vitest documentation for timeout mitigation.\n'
  )

  for (let i = 0; i < strategies.length; i++) {
    const strategy = strategies[i]
    console.log(`\n📋 Strategy ${i + 1}/${strategies.length}: ${strategy.name}`)

    const success = await executeStrategy(strategy)

    if (success) {
      console.log(
        `\n🎉 SUCCESS! Strategy "${strategy.name}" resolved the worker timeout issue.`
      )
      console.log(`\n📝 Recommended solution:`)
      console.log(`   - Use config: ${strategy.configFile}`)
      console.log(`   - Use args: ${strategy.args.join(' ')}`)
      console.log(`   - Description: ${strategy.description}`)

      console.log(
        `\n💡 To apply this solution permanently, update your package.json scripts:`
      )
      console.log(
        `   "test": "vitest --config=${strategy.configFile} ${strategy.args.join(' ')}"`
      )

      process.exit(0)
    } else {
      console.log(
        `❌ Strategy "${strategy.name}" did not resolve the issue. Trying next...`
      )
    }
  }

  console.log('\n❌ All strategies exhausted. Worker timeout issue persists.')
  console.log('\n🔧 Additional debugging steps:')
  console.log('   1. Check Node.js version compatibility with Vitest')
  console.log('   2. Verify system memory and CPU resources')
  console.log('   3. Review test code for infinite loops or heavy computations')
  console.log('   4. Consider running tests in smaller batches')
  console.log(
    '   5. Check for conflicting dependencies or global installations'
  )

  process.exit(1)
}

// Execute main function
main().catch((error) => {
  console.error('💥 Diagnostic script failed:', error)
  process.exit(1)
})
