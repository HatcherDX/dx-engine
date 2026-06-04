/**
 * @fileoverview IPC handlers for Hatcher Actions execution.
 *
 * @description
 * Provides IPC communication between renderer and main process for:
 * - Executing shell commands for actions
 * - Loading/saving .hatcher/actions.yaml configuration
 * - Logging action executions to storage
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { ipcMain } from 'electron'
import { spawn } from 'child_process'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import { existsSync } from 'fs'

/**
 * Initialize Actions IPC handlers
 *
 * @remarks
 * Registers all IPC handlers for the Actions system.
 * Should be called during app initialization after storage is ready.
 *
 * @public
 * @since 1.0.0
 */
export function setupActionsIPC(): void {
  console.log('🎬 [ActionsIPC] Setting up Actions IPC handlers...')

  /**
   * Execute shell command for action
   *
   * @remarks
   * Runs command in project directory with proper environment.
   * Captures stdout, stderr, and exit code.
   */
  ipcMain.handle('actions:execute', async (event, { command, cwd }) => {
    console.log(`[ActionsIPC] Executing command: ${command}`)
    console.log(`[ActionsIPC] Working directory: ${cwd}`)

    return new Promise((resolve) => {
      const child = spawn(command, {
        cwd,
        shell: true,
        env: process.env,
      })

      let stdout = ''
      let stderr = ''

      child.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      child.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      child.on('close', (code) => {
        console.log(`[ActionsIPC] Command completed with exit code: ${code}`)

        resolve({
          exitCode: code ?? 1,
          stdout,
          stderr,
        })
      })

      child.on('error', (error) => {
        console.error('[ActionsIPC] Command execution error:', error)

        resolve({
          exitCode: 1,
          stdout,
          stderr: stderr + '\n' + error.message,
        })
      })
    })
  })

  /**
   * Load actions configuration from .hatcher/actions.yaml
   */
  ipcMain.handle('actions:load-config', async (event, projectPath: string) => {
    const configPath = join(projectPath, '.hatcher', 'actions.yaml')

    console.log(`[ActionsIPC] Loading config from: ${configPath}`)

    if (!existsSync(configPath)) {
      console.log('[ActionsIPC] Config file not found, returning null')
      return null
    }

    try {
      const yaml = await readFile(configPath, 'utf-8')
      console.log('[ActionsIPC] ✅ Config loaded successfully')
      return yaml
    } catch (error) {
      console.error('[ActionsIPC] Failed to load config:', error)
      throw new Error(
        `Failed to load actions config: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  })

  /**
   * Save actions configuration (from graphical editor)
   */
  ipcMain.handle(
    'actions:save-config',
    async (
      event,
      { projectPath, config }: { projectPath: string; config: string }
    ) => {
      const configPath = join(projectPath, '.hatcher', 'actions.yaml')

      console.log(`[ActionsIPC] Saving config to: ${configPath}`)

      try {
        // Ensure .hatcher directory exists
        const configDir = dirname(configPath)
        if (!existsSync(configDir)) {
          await mkdir(configDir, { recursive: true })
        }

        await writeFile(configPath, config, 'utf-8')
        console.log('[ActionsIPC] ✅ Config saved successfully')
      } catch (error) {
        console.error('[ActionsIPC] Failed to save config:', error)
        throw new Error(
          `Failed to save actions config: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }
  )

  /**
   * Validate actions configuration
   *
   * @remarks
   * Performs syntax and dependency validation without executing.
   */
  ipcMain.handle(
    'actions:validate-config',
    async (event, yamlContent: string) => {
      try {
        // Import ActionLoader dynamically to avoid bundling issues
        const { ActionLoader } = await import('@hatcherdx/hatcher-actions')

        const loader = new ActionLoader()
        loader.parseConfig(yamlContent)

        // Validation happens during parseConfig
        return {
          valid: true,
          errors: [],
        }
      } catch (error) {
        return {
          valid: false,
          errors: [
            error instanceof Error ? error.message : 'Validation failed',
          ],
        }
      }
    }
  )

  console.log('✅ [ActionsIPC] Actions IPC handlers registered')
}

/**
 * Cleanup Actions IPC handlers
 *
 * @remarks
 * Removes all IPC handlers when app is shutting down.
 *
 * @public
 * @since 1.0.0
 */
export function destroyActionsIPC(): void {
  console.log('🧹 [ActionsIPC] Cleaning up Actions IPC handlers...')

  ipcMain.removeHandler('actions:execute')
  ipcMain.removeHandler('actions:load-config')
  ipcMain.removeHandler('actions:save-config')
  ipcMain.removeHandler('actions:validate-config')

  console.log('✅ [ActionsIPC] Actions IPC handlers removed')
}
