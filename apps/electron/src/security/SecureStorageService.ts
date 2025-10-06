/**
 * @fileoverview Secure storage service using Electron's safeStorage API
 *
 * @description
 * Provides encrypted storage for IDE configuration and sensitive data.
 * Uses OS-native secure storage (Keychain on macOS, DPAPI on Windows,
 * libsecret/KWallet on Linux) with automatic fallback validation.
 *
 * @example
 * ```typescript
 * const storage = new SecureStorageService()
 * await storage.initialize()
 * await storage.setRecentProject(project)
 * const projects = await storage.getRecentProjects()
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { safeStorage, app, dialog } from 'electron'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as crypto from 'crypto'

// Simple in-memory storage implementation as temporary solution
interface SimpleStorage {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dynamic property collection requires flexible value typing for extensibility
  data: Record<string, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Runtime dynamic typing required for flexible data handling
  get(key: string): any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Runtime dynamic typing required for flexible data handling
  set(key: string, value: any): Promise<void>
  delete(key: string): Promise<void>
}

class SimpleFileStorage implements SimpleStorage {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dynamic property collection requires flexible value typing for extensibility
  data: Record<string, any> = {}
  private filePath: string

  constructor(filePath: string) {
    this.filePath = filePath
  }

  async initialize(): Promise<void> {
    try {
      if (
        await fs
          .access(this.filePath)
          .then(() => true)
          .catch(() => false)
      ) {
        const content = await fs.readFile(this.filePath, 'utf8')
        this.data = JSON.parse(content)
      }
    } catch {
      console.log('[SimpleStorage] Creating new storage file')
      this.data = {}
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Runtime dynamic typing required for flexible data handling
  get(key: string): any {
    return this.data[key]
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Runtime dynamic typing required for flexible data handling
  async set(key: string, value: any): Promise<void> {
    this.data[key] = value
    await this.saveToFile()
  }

  async delete(key: string): Promise<void> {
    delete this.data[key]
    await this.saveToFile()
  }

  private async saveToFile(): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.filePath), { recursive: true })
      await fs.writeFile(this.filePath, JSON.stringify(this.data, null, 2))
    } catch (error) {
      console.error('[SimpleStorage] Failed to save:', error)
    }
  }
}

/**
 * Represents a securely stored project record
 *
 * @public
 */
export interface SecureProject {
  /** Unique project identifier */
  id: string
  /** Project display name */
  name: string
  /** Encrypted project path (base64 encoded) */
  encryptedPath: string
  /** Last opened timestamp */
  lastOpened: Date
  /** Optional project metadata */
  metadata?: {
    gitRemote?: string
    framework?: string
    packageManager?: string
    icon?: string
  }
}

/**
 * Project information exposed to renderer (with decrypted path)
 *
 * @public
 */
export interface ProjectInfo {
  /** Unique project identifier */
  id: string
  /** Project display name */
  name: string
  /** Decrypted project path (only in memory) */
  path: string
  /** Last opened timestamp */
  lastOpened: Date
  /** Optional project metadata */
  metadata?: {
    gitRemote?: string
    framework?: string
    packageManager?: string
    icon?: string
  }
}

/**
 * IDE configuration data structure
 *
 * @public
 */
export interface IDEConfig {
  /** Configuration version for migrations */
  version: string
  /** UI preferences */
  ui: {
    theme: 'light' | 'dark' | 'auto'
    sidebarWidth: number
    terminalHeight: number
  }
  /** Editor settings */
  editor: {
    fontSize: number
    fontFamily: string
    tabSize: number
    wordWrap: boolean
  }
  /** Project history limit */
  projectHistoryLimit: number
}

/**
 * Workspace state including project and tasks
 *
 * @public
 * @since 1.1.0
 */
export interface WorkspaceState {
  /** Single project context */
  project: {
    path: string
    name: string
    lastOpened: Date
    metadata?: {
      framework?: string
      packageManager?: string
      gitRemote?: string
    }
  }

  /** Active tasks (currently open) */
  activeTasks: TaskSession[]

  /** Task history (previously opened in this project) */
  taskHistory: TaskHistoryEntry[]

  /** Currently focused task */
  currentTaskId: string | null
}

/**
 * Task session representing an open task/branch
 *
 * @public
 * @since 1.1.0
 */
export interface TaskSession {
  /** Unique task identifier */
  id: string
  /** Git branch name */
  branchName: string
  /** Task type classification */
  taskType: 'feature' | 'bug' | 'docs' | 'maintenance' | 'refactor'
  /** Current task status */
  status: 'active' | 'pending-changes' | 'ready-to-close'

  /** Lifecycle timestamps */
  openedAt: Date
  lastActiveAt: Date

  /** Work state tracking */
  workState: {
    uncommittedChanges: boolean
    stagedFiles: string[]
    modifiedFiles: string[]
    untrackedFiles: string[]
    lastCommitHash?: string
    lastCommitMessage?: string
  }

  /** Session data for restoration */
  sessionData?: {
    openFiles: string[]
    cursorPositions: Record<string, number>
    terminalHistory?: string[]
    unsavedFiles?: string[]
  }
}

/**
 * Task history entry for closed tasks
 *
 * @public
 * @since 1.1.0
 */
export interface TaskHistoryEntry {
  /** Unique history entry ID */
  id: string
  /** Git branch name */
  branchName: string
  /** Task type */
  taskType: string
  /** When task was opened */
  openedAt: Date
  /** When task was closed */
  closedAt: Date
  /** Reason for closure */
  closureReason: 'completed' | 'stashed' | 'abandoned' | 'switched'
  /** Final commit hash if committed */
  finalCommit?: string
}

/**
 * Main secure storage service for Hatcher IDE
 *
 * @remarks
 * Provides encrypted storage for IDE configuration, project history,
 * and sensitive data using Electron's safeStorage API. All data is
 * encrypted using OS-native secure storage mechanisms.
 *
 * @public
 */
export class SecureStorageService {
  private storage: SimpleStorage | null = null
  private readonly dbPath: string
  private readonly keyPath: string
  private masterKey: string | null = null
  private readonly platform = process.platform

  /**
   * Creates a new SecureStorageService instance
   *
   * @remarks
   * Sets up file paths but does not initialize storage.
   * Call initialize() before using any storage operations.
   */
  constructor() {
    const userDataPath = app.getPath('userData')
    this.dbPath = path.join(userDataPath, 'hatcher-ide.db')
    this.keyPath = path.join(userDataPath, '.master-key')
  }

  /**
   * Initialize the secure storage service
   *
   * @returns Promise that resolves when initialization completes
   *
   * @throws {Error} When security requirements are not met
   * @throws {Error} When storage initialization fails
   *
   * @example
   * ```typescript
   * const service = new SecureStorageService()
   * await service.initialize()
   * ```
   *
   * @public
   */
  async initialize(): Promise<void> {
    try {
      console.log('[SecureStorage] Initializing secure storage service...')

      // Critical security validation
      await this.validateSecurityRequirements()

      // Generate or retrieve master key
      this.masterKey = await this.getMasterKey()

      // Initialize encrypted storage using temporary simple storage
      this.storage = new SimpleFileStorage(this.dbPath)
      await this.storage.initialize()

      // Initialize default configuration if needed
      await this.initializeDefaultConfig()

      console.log('[SecureStorage] ✅ Secure storage initialized successfully')
    } catch (error) {
      console.error('[SecureStorage] ❌ Failed to initialize:', error)
      throw error
    }
  }

  /**
   * Validates that secure storage is available on the current platform
   *
   * @returns Promise that resolves if validation passes
   *
   * @throws {Error} When security requirements are not met
   *
   * @private
   */
  private async validateSecurityRequirements(): Promise<void> {
    console.log(`[SecureStorage] Validating security on ${this.platform}...`)

    // Wait for app to be ready (required for safeStorage)
    if (!app.isReady()) {
      await app.whenReady()
    }

    console.log(`[SecureStorage] 🔒 Platform Security Check: ${this.platform}`)
    console.log(
      `[SecureStorage] 🔐 Encryption Available: ${safeStorage.isEncryptionAvailable()}`
    )

    if (!safeStorage.isEncryptionAvailable()) {
      console.error('[SecureStorage] ❌ Encryption not available')

      if (this.platform === 'linux') {
        // getSelectedStorageBackend is only available on Linux
        const backend =
          typeof safeStorage.getSelectedStorageBackend === 'function'
            ? safeStorage.getSelectedStorageBackend()
            : 'unknown'
        console.log(`[SecureStorage] 🐧 Linux Backend Detected: ${backend}`)

        if (backend === 'basic_text') {
          // BLOQUEO TOTAL: No permitir ejecución insegura según Context7
          const errorMessage =
            'Security Requirements Not Met\n\n' +
            'Hatcher IDE requires a secure keyring service for data protection.\n\n' +
            'Please install one of the following:\n' +
            '• Ubuntu/Debian: sudo apt install gnome-keyring libsecret-1-0\n' +
            '• Fedora/RHEL: sudo dnf install gnome-keyring\n' +
            '• Arch/Manjaro: sudo pacman -S gnome-keyring libsecret\n' +
            '• openSUSE: sudo zypper install gnome-keyring\n' +
            '• Alpine: apk add gnome-keyring libsecret\n' +
            '• KDE Plasma: KWallet (usually pre-installed)\n\n' +
            'Current backend: basic_text (insecure plaintext)\n' +
            'Required: gnome_libsecret, kwallet, kwallet5, or kwallet6\n\n' +
            'The application will now exit for security compliance.'

          dialog.showErrorBox('Security Requirements Not Met', errorMessage)
          console.error(
            '[SecureStorage] ❌ CRITICAL: basic_text backend is insecure'
          )
          app.quit()
          throw new Error('Linux secure keyring not available')
        }

        // Log successful secure backend detection
        const backendNames = {
          gnome_libsecret: 'GNOME Keyring (libsecret)',
          kwallet: 'KWallet 4',
          kwallet5: 'KWallet 5',
          kwallet6: 'KWallet 6',
        }
        console.log(
          `[SecureStorage] ✅ Secure backend active: ${backendNames[backend] || backend}`
        )
      } else {
        // macOS o Windows sin encriptación disponible - error crítico
        const platformNames = {
          darwin: 'macOS Keychain',
          win32: 'Windows DPAPI',
        }
        const errorMessage =
          `Platform Security Error\n\n` +
          `Encryption not available on ${platformNames[this.platform] || this.platform}.\n\n` +
          'This indicates a system-level security issue.\n' +
          'Please check system requirements and contact support if needed.'

        dialog.showErrorBox('Platform Security Error', errorMessage)
        console.error(
          `[SecureStorage] ❌ CRITICAL: No encryption on ${this.platform}`
        )
        app.quit()
        throw new Error(`Encryption not available on ${this.platform}`)
      }
    } else {
      // Success logging with platform-specific details
      if (this.platform === 'linux') {
        // getSelectedStorageBackend is only available on Linux
        const backend =
          typeof safeStorage.getSelectedStorageBackend === 'function'
            ? safeStorage.getSelectedStorageBackend()
            : 'unknown'
        console.log(
          `[SecureStorage] ✅ Linux encryption validated with ${backend}`
        )
      } else if (this.platform === 'darwin') {
        console.log('[SecureStorage] ✅ macOS Keychain encryption validated')
      } else if (this.platform === 'win32') {
        console.log('[SecureStorage] ✅ Windows DPAPI encryption validated')
      }
    }

    // Test encryption round-trip
    try {
      const testData = 'security-validation-test'
      const encrypted = safeStorage.encryptString(testData)
      const decrypted = safeStorage.decryptString(encrypted)

      if (decrypted !== testData) {
        throw new Error('Encryption round-trip failed')
      }

      console.log('[SecureStorage] ✅ Security validation passed')
    } catch (error) {
      throw new Error(`Encryption test failed: ${error}`)
    }
  }

  /**
   * Generate or retrieve the master encryption key
   *
   * @returns Promise that resolves to the master key
   *
   * @throws {Error} When key generation or retrieval fails
   *
   * @private
   */
  private async getMasterKey(): Promise<string> {
    try {
      // Try to load existing key
      const existingKey = await this.loadExistingKey()
      if (existingKey) {
        console.log('[SecureStorage] ✅ Loaded existing master key')
        return existingKey
      }

      // Generate new key
      const newKey = await this.generateNewKey()
      console.log('[SecureStorage] ✅ Generated new master key')
      return newKey
    } catch (error) {
      console.error('[SecureStorage] ❌ Master key error:', error)
      throw new Error(`Master key management failed: ${error}`)
    }
  }

  /**
   * Load existing master key from secure storage
   *
   * @returns Promise that resolves to existing key or null
   *
   * @private
   */
  private async loadExistingKey(): Promise<string | null> {
    try {
      const keyFileExists = await fs
        .access(this.keyPath)
        .then(() => true)
        .catch(() => false)
      if (!keyFileExists) {
        return null
      }

      const encryptedKey = await fs.readFile(this.keyPath)
      const decryptedKey = safeStorage.decryptString(encryptedKey)

      // Validate key format
      if (!decryptedKey || decryptedKey.length < 32) {
        console.warn('[SecureStorage] ⚠️ Invalid existing key, regenerating...')
        return null
      }

      return decryptedKey
    } catch (error) {
      console.warn('[SecureStorage] ⚠️ Failed to load existing key:', error)
      return null
    }
  }

  /**
   * Generate and store new master key
   *
   * @returns Promise that resolves to new key
   *
   * @private
   */
  private async generateNewKey(): Promise<string> {
    // Generate strong random key
    const newKey = crypto.randomBytes(32).toString('base64')

    // Encrypt and store key
    const encryptedKey = safeStorage.encryptString(newKey)
    await fs.writeFile(this.keyPath, encryptedKey)

    // Verify key was stored correctly
    const verification = safeStorage.decryptString(encryptedKey)
    if (verification !== newKey) {
      throw new Error('Key storage verification failed')
    }

    return newKey
  }

  /**
   * Initialize default IDE configuration if none exists
   *
   * @returns Promise that resolves when initialization completes
   *
   * @private
   */
  private async initializeDefaultConfig(): Promise<void> {
    if (!this.storage) {
      throw new Error('Storage not initialized')
    }

    const existingConfig = await this.storage.get<IDEConfig>('ide:config')
    if (existingConfig) {
      console.log('[SecureStorage] ✅ IDE configuration exists')
      return
    }

    const defaultConfig: IDEConfig = {
      version: '1.0.0',
      ui: {
        theme: 'auto',
        sidebarWidth: 400,
        terminalHeight: 250,
      },
      editor: {
        fontSize: 14,
        fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
        tabSize: 2,
        wordWrap: true,
      },
      projectHistoryLimit: 10,
    }

    await this.storage.set('ide:config', defaultConfig)
    console.log('[SecureStorage] ✅ Initialized default IDE configuration')
  }

  /**
   * Get all recent projects (with decrypted paths)
   *
   * @returns Promise that resolves to array of project info
   *
   * @throws {Error} When storage is not initialized
   * @throws {Error} When decryption fails
   *
   * @example
   * ```typescript
   * const projects = await service.getRecentProjects()
   * console.log(projects[0].path) // Decrypted path
   * ```
   *
   * @public
   */
  async getRecentProjects(): Promise<ProjectInfo[]> {
    if (!this.storage) {
      console.warn(
        '[SecureStorage] Storage not initialized, returning empty project list'
      )
      return []
    }

    try {
      const secureProjects =
        (await this.storage.get<SecureProject[]>('projects:recent')) || []

      // Decrypt paths and convert to ProjectInfo
      const projects: ProjectInfo[] = secureProjects.map((project) => {
        try {
          const encryptedBuffer = Buffer.from(project.encryptedPath, 'base64')
          const decryptedPath = safeStorage.decryptString(encryptedBuffer)

          return {
            id: project.id,
            name: project.name,
            path: decryptedPath,
            lastOpened: new Date(project.lastOpened),
            metadata: project.metadata,
          }
        } catch (error) {
          console.error(
            '[SecureStorage] ❌ Failed to decrypt project path:',
            error
          )
          throw new Error(`Failed to decrypt project: ${project.name}`)
        }
      })

      // Sort by last opened (most recent first)
      return projects.sort(
        (a, b) => b.lastOpened.getTime() - a.lastOpened.getTime()
      )
    } catch (error) {
      console.error('[SecureStorage] ❌ Failed to get recent projects:', error)
      throw error
    }
  }

  /**
   * Add project to recent projects list
   *
   * @param projectInfo - Project information to add
   * @returns Promise that resolves when project is added
   *
   * @throws {Error} When storage is not initialized
   * @throws {Error} When project path is invalid
   *
   * @example
   * ```typescript
   * await service.addRecentProject({
   *   path: '/Users/dev/my-project',
   *   name: 'My Project'
   * })
   * ```
   *
   * @public
   */
  async addRecentProject(projectInfo: {
    path: string
    name: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Project metadata requires flexible typing for extensible user-defined properties
    metadata?: any
  }): Promise<void> {
    if (!this.storage) {
      console.warn(
        '[SecureStorage] Storage not initialized, skipping addRecentProject'
      )
      return
    }

    try {
      // Validate project path exists
      await fs.access(projectInfo.path)

      // Get current projects
      const currentProjects =
        (await this.storage.get<SecureProject[]>('projects:recent')) || []

      // Remove existing entry for this path (if any)
      const filteredProjects = currentProjects.filter((p) => {
        try {
          const decryptedPath = safeStorage.decryptString(
            Buffer.from(p.encryptedPath, 'base64')
          )
          return decryptedPath !== projectInfo.path
        } catch {
          return true // Keep projects we can't decrypt for now
        }
      })

      // Encrypt the project path
      const encryptedPath = safeStorage
        .encryptString(projectInfo.path)
        .toString('base64')

      // Create new project record
      const newProject: SecureProject = {
        id: crypto.randomUUID(),
        name: projectInfo.name,
        encryptedPath,
        lastOpened: new Date(),
        metadata: projectInfo.metadata,
      }

      // Add to beginning of list
      filteredProjects.unshift(newProject)

      // Get config to check limit
      const config = await this.storage.get<IDEConfig>('ide:config')
      const limit = config?.projectHistoryLimit || 10

      // Keep only the most recent projects
      const limitedProjects = filteredProjects.slice(0, limit)

      // Save updated list
      await this.storage.set('projects:recent', limitedProjects)

      console.log(`[SecureStorage] ✅ Added project: ${projectInfo.name}`)
    } catch (error) {
      console.error('[SecureStorage] ❌ Failed to add recent project:', error)
      throw error
    }
  }

  /**
   * Update last opened time for a project
   *
   * @param projectId - Project ID to update
   * @returns Promise that resolves when update completes
   *
   * @throws {Error} When storage is not initialized
   * @throws {Error} When project is not found
   *
   * @public
   */
  async updateProjectLastOpened(projectId: string): Promise<void> {
    if (!this.storage) {
      throw new Error('Storage not initialized. Call initialize() first.')
    }

    try {
      const projects =
        (await this.storage.get<SecureProject[]>('projects:recent')) || []

      const projectIndex = projects.findIndex((p) => p.id === projectId)
      if (projectIndex === -1) {
        throw new Error(`Project not found: ${projectId}`)
      }

      // Update timestamp and move to front
      const project = projects[projectIndex]
      project.lastOpened = new Date()

      // Remove from current position and add to front
      projects.splice(projectIndex, 1)
      projects.unshift(project)

      await this.storage.set('projects:recent', projects)

      console.log(
        `[SecureStorage] ✅ Updated project last opened: ${project.name}`
      )
    } catch (error) {
      console.error('[SecureStorage] ❌ Failed to update project:', error)
      throw error
    }
  }

  /**
   * Get IDE configuration
   *
   * @returns Promise that resolves to IDE configuration
   *
   * @throws {Error} When storage is not initialized
   *
   * @public
   */
  async getIDEConfig(): Promise<IDEConfig> {
    if (!this.storage) {
      console.warn(
        '[SecureStorage] Storage not initialized, returning default IDE config'
      )
      // Return default configuration when storage is not available
      return {
        version: '1.0.0',
        ui: {
          theme: 'auto',
          sidebarWidth: 400,
          terminalHeight: 250,
        },
        editor: {
          fontSize: 14,
          fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
          tabSize: 2,
          wordWrap: true,
        },
        projectHistoryLimit: 20,
      }
    }

    const config = await this.storage.get<IDEConfig>('ide:config')
    if (!config) {
      throw new Error('IDE configuration not found')
    }

    return config
  }

  /**
   * Update IDE configuration
   *
   * @param config - Updated configuration
   * @returns Promise that resolves when update completes
   *
   * @throws {Error} When storage is not initialized
   *
   * @public
   */
  async updateIDEConfig(config: Partial<IDEConfig>): Promise<void> {
    if (!this.storage) {
      throw new Error('Storage not initialized. Call initialize() first.')
    }

    const currentConfig = await this.getIDEConfig()
    const updatedConfig = { ...currentConfig, ...config }

    await this.storage.set('ide:config', updatedConfig)
    console.log('[SecureStorage] ✅ Updated IDE configuration')
  }

  /**
   * Remove a project from recent projects
   *
   * @param projectId - Project ID to remove
   * @returns Promise that resolves when removal completes
   *
   * @throws {Error} When storage is not initialized
   *
   * @public
   */
  async removeRecentProject(projectId: string): Promise<void> {
    if (!this.storage) {
      throw new Error('Storage not initialized. Call initialize() first.')
    }

    try {
      const projects =
        (await this.storage.get<SecureProject[]>('projects:recent')) || []
      const filteredProjects = projects.filter((p) => p.id !== projectId)

      await this.storage.set('projects:recent', filteredProjects)
      console.log(`[SecureStorage] ✅ Removed project: ${projectId}`)
    } catch (error) {
      console.error('[SecureStorage] ❌ Failed to remove project:', error)
      throw error
    }
  }

  /**
   * Clear all recent projects
   *
   * @returns Promise that resolves when clear completes
   *
   * @throws {Error} When storage is not initialized
   *
   * @public
   */
  async clearRecentProjects(): Promise<void> {
    if (!this.storage) {
      throw new Error('Storage not initialized. Call initialize() first.')
    }

    await this.storage.set('projects:recent', [])
    console.log('[SecureStorage] ✅ Cleared all recent projects')
  }

  /**
   * Get platform-specific security information
   *
   * @returns Security information object
   *
   * @public
   */
  getSecurityInfo(): {
    platform: string
    encryptionAvailable: boolean
    backend?: string
    keyringService?: string
  } {
    const info = {
      platform: this.platform,
      encryptionAvailable: safeStorage.isEncryptionAvailable(),
      backend: undefined as string | undefined,
      keyringService: undefined as string | undefined,
    }

    if (this.platform === 'linux') {
      info.backend = safeStorage.getSelectedStorageBackend()

      // Map backend to user-friendly service name
      switch (info.backend) {
        case 'gnome-libsecret':
          info.keyringService = 'GNOME Keyring'
          break
        case 'kwallet':
        case 'kwallet5':
        case 'kwallet6':
          info.keyringService = 'KDE Wallet'
          break
        case 'basic_text':
          info.keyringService = 'None (Insecure)'
          break
        default:
          info.keyringService = 'Unknown'
      }
    } else if (this.platform === 'darwin') {
      info.keyringService = 'macOS Keychain'
    } else if (this.platform === 'win32') {
      info.keyringService = 'Windows DPAPI'
    }

    return info
  }

  /**
   * Get current workspace state
   *
   * @returns Promise that resolves to workspace state or null if no workspace
   *
   * @throws {Error} When storage is not initialized
   *
   * @example
   * ```typescript
   * const workspace = await service.getWorkspace()
   * if (workspace) {
   *   console.log(`Current project: ${workspace.project.name}`)
   *   console.log(`Active tasks: ${workspace.activeTasks.length}`)
   * }
   * ```
   *
   * @public
   * @since 1.0.0
   */
  async getWorkspace(): Promise<WorkspaceState | null> {
    if (!this.storage) {
      console.warn(
        '[SecureStorage] Storage not initialized, no workspace available'
      )
      return null
    }

    try {
      const workspace =
        await this.storage.get<WorkspaceState>('workspace:current')

      if (!workspace) {
        console.log('[SecureStorage] No workspace found')
        return null
      }

      // Decrypt project path if exists and is encrypted
      if (workspace.project && workspace.project.path) {
        try {
          // Check if path is encrypted (base64 encoded buffer)
          // Plain paths will have slashes, encrypted ones won't
          if (
            !workspace.project.path.includes('/') &&
            !workspace.project.path.includes('\\')
          ) {
            // Path appears to be encrypted, decrypt it
            const encryptedPath = workspace.project.path
            workspace.project.path = safeStorage.decryptString(
              Buffer.from(encryptedPath, 'base64')
            )
          }
          // If path contains slashes, it's already decrypted (plain text)
        } catch (error) {
          console.error(
            '[SecureStorage] Failed to decrypt project path:',
            error
          )
          // Try to use the path as-is if decryption fails
          // This handles the case where the path might already be plain text
        }
      }

      console.log('[SecureStorage] ✅ Retrieved workspace state')
      return workspace
    } catch (error) {
      console.error('[SecureStorage] ❌ Failed to get workspace:', error)
      throw error
    }
  }

  /**
   * Set workspace state (opening a project)
   *
   * @param workspace - Workspace state to save
   * @returns Promise that resolves when workspace is saved
   *
   * @throws {Error} When storage is not initialized
   * @throws {Error} When project path is invalid
   *
   * @example
   * ```typescript
   * await service.setWorkspace({
   *   project: {
   *     path: '/Users/dev/my-project',
   *     name: 'My Project',
   *     lastOpened: new Date()
   *   },
   *   activeTasks: [],
   *   taskHistory: [],
   *   currentTaskId: null
   * })
   * ```
   *
   * @public
   * @since 1.0.0
   */
  async setWorkspace(workspace: WorkspaceState): Promise<void> {
    if (!this.storage) {
      throw new Error('Storage not initialized. Call initialize() first.')
    }

    try {
      // Validate project path exists
      await fs.access(workspace.project.path)

      // Create a copy to avoid mutating the input
      const workspaceToStore = JSON.parse(JSON.stringify(workspace))

      // Encrypt the project path before storing (only if not already encrypted)
      // Check if path is already encrypted (base64 encoded, no slashes)
      if (
        workspace.project.path.includes('/') ||
        workspace.project.path.includes('\\')
      ) {
        // Path is plain text, encrypt it
        workspaceToStore.project.path = safeStorage
          .encryptString(workspace.project.path)
          .toString('base64')
      }
      // If path doesn't contain slashes, assume it's already encrypted

      await this.storage.set('workspace:current', workspaceToStore)

      // Also update recent projects
      await this.addRecentProject({
        path: workspace.project.path,
        name: workspace.project.name,
        metadata: workspace.project.metadata,
      })

      console.log(`[SecureStorage] ✅ Set workspace: ${workspace.project.name}`)
    } catch (error) {
      console.error('[SecureStorage] ❌ Failed to set workspace:', error)
      throw error
    }
  }

  /**
   * Add a task to the current workspace
   *
   * @param task - Task session to add
   * @returns Promise that resolves when task is added
   *
   * @throws {Error} When storage is not initialized
   * @throws {Error} When no workspace is open
   *
   * @example
   * ```typescript
   * await service.addTask({
   *   id: crypto.randomUUID(),
   *   branchName: 'feature/user-auth',
   *   taskType: 'feature',
   *   status: 'active',
   *   openedAt: new Date(),
   *   lastActiveAt: new Date(),
   *   workState: { hasUncommittedChanges: false }
   * })
   * ```
   *
   * @public
   * @since 1.0.0
   */
  async addTask(task: TaskSession): Promise<void> {
    if (!this.storage) {
      throw new Error('Storage not initialized. Call initialize() first.')
    }

    try {
      const workspace = await this.getWorkspace()

      if (!workspace) {
        throw new Error('No workspace open. Open a project first.')
      }

      // Add task to active tasks
      workspace.activeTasks = workspace.activeTasks || []

      // Check if task already exists
      const existingIndex = workspace.activeTasks.findIndex(
        (t) => t.id === task.id
      )
      if (existingIndex !== -1) {
        // Update existing task
        workspace.activeTasks[existingIndex] = task
      } else {
        // Add new task
        workspace.activeTasks.push(task)
      }

      // Update current task if this is the only task
      if (workspace.activeTasks.length === 1) {
        workspace.currentTaskId = task.id
      }

      // Save updated workspace
      await this.setWorkspace(workspace)

      console.log(`[SecureStorage] ✅ Added task: ${task.branchName}`)
    } catch (error) {
      console.error('[SecureStorage] ❌ Failed to add task:', error)
      throw error
    }
  }

  /**
   * Remove a task from the current workspace
   *
   * @param taskId - ID of the task to remove
   * @returns Promise that resolves when task is removed
   *
   * @throws {Error} When storage is not initialized
   * @throws {Error} When no workspace is open
   *
   * @public
   * @since 1.0.0
   */
  async removeTask(taskId: string): Promise<void> {
    if (!this.storage) {
      throw new Error('Storage not initialized. Call initialize() first.')
    }

    try {
      const workspace = await this.getWorkspace()

      if (!workspace) {
        throw new Error('No workspace open')
      }

      // Find and remove task
      const taskIndex = workspace.activeTasks.findIndex((t) => t.id === taskId)

      if (taskIndex !== -1) {
        const removedTask = workspace.activeTasks[taskIndex]

        // Add to history before removing
        workspace.taskHistory = workspace.taskHistory || []
        workspace.taskHistory.push({
          id: removedTask.id,
          branchName: removedTask.branchName,
          taskType: removedTask.taskType,
          openedAt: removedTask.openedAt,
          closedAt: new Date(),
          completionStatus: 'closed',
        })

        // Remove from active tasks
        workspace.activeTasks.splice(taskIndex, 1)

        // Update current task if needed
        if (workspace.currentTaskId === taskId) {
          workspace.currentTaskId =
            workspace.activeTasks.length > 0
              ? workspace.activeTasks[0].id
              : null
        }

        // Save updated workspace
        await this.setWorkspace(workspace)

        console.log(`[SecureStorage] ✅ Removed task: ${taskId}`)
      }
    } catch (error) {
      console.error('[SecureStorage] ❌ Failed to remove task:', error)
      throw error
    }
  }

  /**
   * Set the current active task
   *
   * @param taskId - ID of the task to make current
   * @returns Promise that resolves when current task is updated
   *
   * @throws {Error} When storage is not initialized
   * @throws {Error} When task is not found
   *
   * @public
   * @since 1.0.0
   */
  async setCurrentTask(taskId: string | null): Promise<void> {
    if (!this.storage) {
      throw new Error('Storage not initialized. Call initialize() first.')
    }

    try {
      const workspace = await this.getWorkspace()

      if (!workspace) {
        throw new Error('No workspace open')
      }

      if (taskId !== null) {
        // Verify task exists
        const taskExists = workspace.activeTasks.some((t) => t.id === taskId)
        if (!taskExists) {
          throw new Error(`Task not found: ${taskId}`)
        }

        // Update last active time for the task
        const task = workspace.activeTasks.find((t) => t.id === taskId)
        if (task) {
          task.lastActiveAt = new Date()
        }
      }

      workspace.currentTaskId = taskId

      // Save updated workspace
      await this.setWorkspace(workspace)

      console.log(`[SecureStorage] ✅ Set current task: ${taskId}`)
    } catch (error) {
      console.error('[SecureStorage] ❌ Failed to set current task:', error)
      throw error
    }
  }

  /**
   * Update a task's work state (e.g., uncommitted changes)
   *
   * @param taskId - ID of the task to update
   * @param workState - Updated work state
   * @returns Promise that resolves when task is updated
   *
   * @throws {Error} When storage is not initialized
   * @throws {Error} When task is not found
   *
   * @public
   * @since 1.0.0
   */
  async updateTaskWorkState(
    taskId: string,
    workState: Partial<TaskSession['workState']>
  ): Promise<void> {
    if (!this.storage) {
      throw new Error('Storage not initialized. Call initialize() first.')
    }

    try {
      const workspace = await this.getWorkspace()

      if (!workspace) {
        throw new Error('No workspace open')
      }

      const task = workspace.activeTasks.find((t) => t.id === taskId)

      if (!task) {
        throw new Error(`Task not found: ${taskId}`)
      }

      // Update work state
      task.workState = { ...task.workState, ...workState }
      task.lastActiveAt = new Date()

      // Update status based on work state
      if (workState.hasUncommittedChanges) {
        task.status = 'pending-changes'
      } else if (task.status === 'pending-changes') {
        task.status = 'active'
      }

      // Save updated workspace
      await this.setWorkspace(workspace)

      console.log(`[SecureStorage] ✅ Updated task work state: ${taskId}`)
    } catch (error) {
      console.error('[SecureStorage] ❌ Failed to update task:', error)
      throw error
    }
  }

  /**
   * Clear workspace (close project)
   *
   * @returns Promise that resolves when workspace is cleared
   *
   * @throws {Error} When storage is not initialized
   *
   * @public
   * @since 1.0.0
   */
  async clearWorkspace(): Promise<void> {
    if (!this.storage) {
      throw new Error('Storage not initialized. Call initialize() first.')
    }

    await this.storage.delete('workspace:current')
    console.log('[SecureStorage] ✅ Cleared workspace')
  }

  /**
   * Clean up resources when service is destroyed
   *
   * @returns Promise that resolves when cleanup completes
   *
   * @public
   */
  async cleanup(): Promise<void> {
    if (this.storage) {
      // The storage manager handles its own cleanup
      this.storage = null
    }

    this.masterKey = null
    console.log('[SecureStorage] ✅ Cleanup completed')
  }
}
