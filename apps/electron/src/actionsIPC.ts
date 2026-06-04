/**
 * @fileoverview IPC handlers for Hatcher Actions execution.
 *
 * @description
 * Provides IPC communication between renderer and main process for:
 * - Executing shell commands for actions
 * - Loading/saving .hatcher/actions.yaml configuration
 * - Logging action executions to storage
 *
 * Security model:
 * - Every handler validates the sender against the shared trusted-WebContents
 *   registry ({@link validateTrustedSender}), so only the app's own renderer —
 *   never an injected frame or rogue WebContents — can reach these privileged
 *   channels.
 * - The child process receives a curated environment allow-list, never the full
 *   `process.env`, so provider API keys / tokens are not leaked to action commands.
 * - Config paths are confined to `<projectRoot>/.hatcher/actions.yaml` under an
 *   absolute, normalized project root.
 *
 * SECURITY NOTE — Workspace Trust is still required before this feature is wired
 * to production. `actions:execute` is, by design, a task runner: it runs commands
 * authored in the opened project's `actions.yaml`. Sender validation and an env
 * allow-list close the "any frame can invoke" and "secret leak" holes, but they do
 * NOT make running an untrusted project's commands safe — an explicit
 * program/args list cannot be sanitized either (a `node`/`bash`/`python` program
 * runs arbitrary code with zero shell metacharacters). The real boundary is
 * Workspace Trust: the user must explicitly trust a project AND explicitly trigger
 * (or consent to) execution, and project-sourced commands must never auto-run
 * (see the smart-pipeline auto-trigger in apps/web useSmartPipeline). That consent
 * gate MUST be added before `loadActionsFromConfig` is wired to a production caller.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { ipcMain } from 'electron'
import type { IpcMainInvokeEvent } from 'electron'
import { spawn } from 'child_process'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { join, dirname, resolve } from 'path'
import { existsSync } from 'fs'
import { validateTrustedSender } from './ipc/storageHandlers'

/**
 * Environment variable names that are safe to forward to action child processes.
 *
 * @remarks
 * Restricting the child environment to this allow-list prevents secrets present
 * in the main process environment (AI provider API keys, OAuth tokens, cloud
 * credentials) from leaking into commands defined by an opened project. Only
 * variables required for executables to resolve and run correctly are included.
 *
 * @public
 * @since 1.0.0
 */
const ACTION_ENV_ALLOWLIST: readonly string[] = [
  // POSIX essentials
  'PATH',
  'HOME',
  'SHELL',
  'USER',
  'LOGNAME',
  'LANG',
  'LC_ALL',
  'LC_CTYPE',
  'TZ',
  'TERM',
  'TMPDIR',
  'PWD',
  // Windows essentials
  'SystemRoot',
  'SystemDrive',
  'windir',
  'COMSPEC',
  'PATHEXT',
  'USERPROFILE',
  'HOMEDRIVE',
  'HOMEPATH',
  'TEMP',
  'TMP',
  'APPDATA',
  'LOCALAPPDATA',
  'ProgramData',
  'ProgramFiles',
  'NUMBER_OF_PROCESSORS',
  'PROCESSOR_ARCHITECTURE',
]

/**
 * Builds a curated environment for spawned action commands.
 *
 * @returns An environment object containing only the allow-listed variables that
 * are present in the current process environment.
 *
 * @remarks
 * Used instead of `process.env` so action commands cannot read secrets held by
 * the main process. See {@link ACTION_ENV_ALLOWLIST}.
 *
 * @example
 * ```typescript
 * const child = spawn(command, { env: buildActionEnv() })
 * ```
 *
 * @public
 * @since 1.0.0
 */
function buildActionEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {}

  for (const key of ACTION_ENV_ALLOWLIST) {
    const value = process.env[key]
    if (value !== undefined) {
      env[key] = value
    }
  }

  return env
}

/**
 * Validates a renderer-supplied project path and returns its absolute form.
 *
 * @param projectPath - The project root supplied by the renderer
 * @returns The normalized, absolute project root
 *
 * @throws {@link Error}
 * Thrown when `projectPath` is not a non-empty string.
 *
 * @remarks
 * Combined with {@link validateTrustedSender}, this confines configuration reads
 * and writes to `<projectRoot>/.hatcher/actions.yaml` under a canonical absolute
 * root rather than accepting arbitrary or relative paths verbatim.
 *
 * @public
 * @since 1.0.0
 */
function assertSafeProjectPath(projectPath: unknown): string {
  if (typeof projectPath !== 'string' || projectPath.trim() === '') {
    throw new Error('Invalid project path: a non-empty string is required')
  }

  return resolve(projectPath)
}

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
   * Runs command in project directory with a curated environment. Captures
   * stdout, stderr, and exit code. The sender is validated and the environment
   * is restricted; see the file-level SECURITY NOTE for the Workspace Trust
   * gate that must precede production wiring.
   */
  ipcMain.handle(
    'actions:execute',
    async (
      event: IpcMainInvokeEvent,
      { command, cwd }: { command: string; cwd?: string }
    ) => {
      validateTrustedSender(event)

      if (typeof command !== 'string' || command.trim() === '') {
        throw new Error('actions:execute requires a non-empty command string')
      }

      const resolvedCwd =
        typeof cwd === 'string' && cwd.trim() !== '' ? resolve(cwd) : undefined

      console.log(`[ActionsIPC] Executing command: ${command}`)
      console.log(
        `[ActionsIPC] Working directory: ${resolvedCwd ?? '(default)'}`
      )

      return new Promise((resolveResult) => {
        // `shell: true` is intentional: actions are a task runner whose commands
        // are author-written shell strings (pipes, &&, env expansion). The
        // security boundary is sender validation + Workspace Trust + a curated
        // env (NOT shell escaping); see the file-level SECURITY NOTE.
        const child = spawn(command, {
          cwd: resolvedCwd,
          shell: true,
          env: buildActionEnv(),
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

          resolveResult({
            exitCode: code ?? 1,
            stdout,
            stderr,
          })
        })

        child.on('error', (error) => {
          console.error('[ActionsIPC] Command execution error:', error)

          resolveResult({
            exitCode: 1,
            stdout,
            stderr: stderr + '\n' + error.message,
          })
        })
      })
    }
  )

  /**
   * Load actions configuration from .hatcher/actions.yaml
   */
  ipcMain.handle(
    'actions:load-config',
    async (event: IpcMainInvokeEvent, projectPath: string) => {
      validateTrustedSender(event)

      const root = assertSafeProjectPath(projectPath)
      const configPath = join(root, '.hatcher', 'actions.yaml')

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
    }
  )

  /**
   * Save actions configuration (from graphical editor)
   */
  ipcMain.handle(
    'actions:save-config',
    async (
      event: IpcMainInvokeEvent,
      { projectPath, config }: { projectPath: string; config: string }
    ) => {
      validateTrustedSender(event)

      if (typeof config !== 'string') {
        throw new Error('actions:save-config requires a string config payload')
      }

      const root = assertSafeProjectPath(projectPath)
      const configPath = join(root, '.hatcher', 'actions.yaml')

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
    async (event: IpcMainInvokeEvent, yamlContent: string) => {
      validateTrustedSender(event)

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
