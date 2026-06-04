/**
 * @fileoverview Electron storage manager with multi-project/branch isolation
 *
 * @description
 * Enterprise-grade storage system using @hatcherdx/storage with SQLite backend.
 * Implements 3-level isolation: Project → Branch → Session.
 * Actions are branch-scoped and can be triggered from DeckLog or Timegraph.
 *
 * Context7 patterns applied:
 * - Composite keys for tenant isolation (Prisma)
 * - Foreign key constraints with CASCADE (Prisma)
 * - On-demand aggregation queries (Prisma + better-sqlite3)
 * - WAL mode for concurrency (better-sqlite3)
 * - Graceful shutdown with checkpoint (Node.js best practices)
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { StorageManager } from '@hatcherdx/storage'
import { app } from 'electron'
import { join } from 'path'
import type Database from 'better-sqlite3'

/**
 * Project entity (database representation)
 *
 * @public
 */
export interface Project {
  id: string
  name: string
  path: string
  created_at: number
  last_opened_at: number
}

/**
 * Project input data for saveProject()
 *
 * @remarks
 * Frontend representation with Date objects instead of timestamps
 *
 * @public
 */
export interface ProjectInput {
  id: string
  name: string
  path: string
  createdAt: Date
  lastOpenedAt: Date
}

/**
 * Workspace entity for session persistence
 *
 * @remarks
 * Workspace contains the currently opened project and its active tasks.
 * Used to restore project state between application sessions.
 *
 * @public
 */
export interface Workspace {
  project: {
    id: string
    name: string
    path: string
    rootPath: string
    createdAt: Date
    lastOpenedAt: Date
  } | null
  activeTasks: Task[]
  currentTaskId: string | null
}

/**
 * Task entity for workspace task management
 *
 * @public
 */
export interface Task {
  id: string
  name: string
  description?: string
  workState?: Record<string, unknown>
  lastUpdated?: number
  createdAt?: number
}

/**
 * IDE configuration
 *
 * @public
 */
export interface IDEConfig {
  version: string
  ui: {
    theme: 'dark' | 'light' | 'auto'
    sidebarWidth: number
    terminalHeight: number
  }
  editor: {
    fontSize: number
    fontFamily: string
    tabSize: number
    wordWrap: boolean
  }
  projectHistoryLimit: number
}

/**
 * Storage adapter with raw database access
 *
 * @remarks
 * Internal type for accessing the raw database handle from StorageManager
 *
 * @internal
 */
interface StorageManagerWithAdapter {
  adapter?: {
    db?: Database.Database
  }
}

/**
 * Branch entity
 *
 * @public
 */
export interface Branch {
  id: string
  project_id: string
  branch_name: string
  is_active: number
  created_at: number
  last_active_at: number
}

/**
 * Conversation session entity
 *
 * @public
 */
export interface ConversationSession {
  id: string
  project_id: string
  branch_id: string
  session_title: string
  provider: string
  model: string
  created_at: number
  last_message_at: number
  message_count: number
  total_tokens: number
  total_cost: number
}

/**
 * AI message entity
 *
 * @public
 */
export interface AIMessage {
  id: string
  session_id: string
  branch_id: string
  type: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  provider: string
  model: string
  token_count?: number
  metadata_json?: string
}

/**
 * AI message input (accepts both camelCase and snake_case)
 *
 * @remarks
 * Frontend may send either camelCase or snake_case field names
 *
 * @public
 */
export interface AIMessageInput {
  sessionId?: string
  session_id?: string
  branchId?: string
  branch_id?: string
  type: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: number | Date
  provider: string
  model: string
  tokenCount?: number
  token_count?: number
  metadata?: Record<string, unknown> | string
  metadata_json?: Record<string, unknown> | string
}

/**
 * Action execution entity (branch-scoped)
 *
 * @remarks
 * Actions are tied to branches, not sessions, allowing triggers from:
 * - DeckLog AI conversations
 * - Timegraph rollback operations
 * - Manual user actions
 *
 * @public
 */
export interface ActionExecution {
  id: string
  branch_id: string
  trigger_source: 'decklog' | 'timegraph' | 'manual'
  trigger_ref_id?: string
  action_type: 'file_edit' | 'bash_command' | 'git_operation' | 'rollback'
  action_name: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  started_at: number
  completed_at?: number
  result_json?: string
}

/**
 * Action log entry
 *
 * @public
 */
export interface ActionLog {
  action_id: string
  timestamp: number
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  data_json?: string
}

/**
 * Branch metrics (computed on-demand)
 *
 * @public
 */
export interface BranchMetrics {
  total_sessions: number
  total_messages: number
  total_tokens: number
  total_cost: number
  total_actions: number
}

/**
 * Provider metrics (computed on-demand)
 *
 * @public
 */
export interface ProviderMetrics {
  provider: string
  session_count: number
  message_count: number
  total_tokens: number
}

/**
 * Global statistics (computed on-demand)
 *
 * @public
 */
export interface GlobalStats {
  total_projects: number
  total_branches: number
  total_sessions: number
  total_tokens: number
  total_cost: number
}

/**
 * Electron storage manager with multi-project/branch isolation
 *
 * @remarks
 * This class wraps @hatcherdx/storage with Electron-specific configuration
 * and implements the complete schema for Hatcher's data model.
 *
 * Database location: `~/Library/Application Support/Hatcher/hatcher.db` (macOS)
 *
 * @example
 * ```typescript
 * const storage = await ElectronStorageManager.create()
 * await storage.initialize()
 *
 * // Create project and branch
 * await storage.createProject({
 *   id: uuid(),
 *   name: 'dx-engine',
 *   path: '/Users/dev/dx-engine',
 *   created_at: Date.now(),
 *   last_opened_at: Date.now()
 * })
 *
 * const branchId = await storage.createBranch(projectId, 'main')
 * await storage.switchBranch(branchId)
 * ```
 *
 * @public
 * @since 1.0.0
 */
export class ElectronStorageManager {
  private storage: StorageManager
  private db?: Database.Database

  private constructor(storage: StorageManager) {
    this.storage = storage
  }

  /**
   * Create storage manager instance
   *
   * @returns Promise resolving to ElectronStorageManager instance
   *
   * @throws {@link StorageError}
   * Thrown when initialization fails
   *
   * @remarks
   * **CRITICAL CONFIGURATION NOTES:**
   *
   * 1. **Compression is DISABLED** to avoid lz4@0.6.5 C++20 incompatibility with Electron 35.1.4
   *    - DO NOT enable compression without upgrading lz4 to a C++20-compatible version
   *    - Electron 35.1.4 requires NODE_MODULE_VERSION 133 (Node.js v23.x with C++20)
   *    - lz4@0.6.5 cannot compile against Electron's embedded Node.js v23.x headers
   *
   * 2. **Native Module Rebuild Requirements:**
   *    - After any Electron version upgrade, rebuild native modules using:
   *      `cd apps/electron && npx @electron/rebuild -f -o better-sqlite3`
   *    - Use `-o` flag (only) to exclude incompatible modules like lz4
   *    - NEVER use `pnpm rebuild` alone - it targets system Node.js, not Electron's embedded Node.js
   *
   * 3. **Encryption:** Disabled here because electron.safeStorage handles sensitive fields
   *
   * @example
   * ```typescript
   * const storage = await ElectronStorageManager.create()
   * ```
   *
   * @see {@link https://github.com/electron/rebuild} - Electron rebuild documentation
   * @see {@link apps/electron/DATABASE.md} - Database schema and architecture
   *
   * @public
   */
  static async create(): Promise<ElectronStorageManager> {
    const userDataPath = app.getPath('userData')
    const dbPath = join(userDataPath, 'hatcher.db')

    const storage = new StorageManager({
      type: 'sqlite',
      path: dbPath,
      encryption: { enabled: false }, // We'll use electron.safeStorage for specific fields
      compression: { enabled: false }, // CRITICAL: Disabled due to lz4@0.6.5 C++20 incompatibility with Electron 35.1.4
      cache: {
        maxItems: 1000,
        maxSize: 50 * 1024 * 1024, // 50MB
        ttl: 300000, // 5 minutes
      },
    })

    return new ElectronStorageManager(storage)
  }

  /**
   * Initialize storage and create schema
   *
   * @returns Promise that resolves when initialization completes
   *
   * @throws {@link StorageError}
   * Thrown when schema creation fails
   *
   * @public
   */
  async initialize(): Promise<void> {
    await this.storage.initialize()

    // Get raw database handle for schema creation
    const storageWithAdapter = this
      .storage as unknown as StorageManagerWithAdapter
    const adapter = storageWithAdapter.adapter
    this.db = adapter?.db

    if (!this.db) {
      throw new Error('Failed to get database handle')
    }

    // Context7: Enable WAL mode for concurrency (better-sqlite3)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('synchronous = NORMAL')
    this.db.pragma('cache_size = 10000')
    this.db.pragma('temp_store = memory')
    this.db.pragma('foreign_keys = ON')
    this.db.pragma('busy_timeout = 30000')

    // Create schema
    await this.createSchema()

    console.log('✅ ElectronStorageManager initialized with WAL mode')
  }

  /**
   * Create database schema with all tables and indexes
   *
   * @private
   */
  private async createSchema(): Promise<void> {
    if (!this.db) return

    // Projects table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        path TEXT NOT NULL UNIQUE,
        created_at INTEGER NOT NULL,
        last_opened_at INTEGER NOT NULL
      );
    `)

    // Branches table with composite unique constraint (Context7: Prisma pattern)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS branches (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        branch_name TEXT NOT NULL,
        is_active INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        last_active_at INTEGER NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        UNIQUE(project_id, branch_name)
      );
      CREATE INDEX IF NOT EXISTS idx_branches_project ON branches(project_id);
      CREATE INDEX IF NOT EXISTS idx_branches_active ON branches(is_active);
    `)

    // Conversation sessions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS conversation_sessions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        branch_id TEXT NOT NULL,
        session_title TEXT NOT NULL,
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        last_message_at INTEGER NOT NULL,
        message_count INTEGER DEFAULT 0,
        total_tokens INTEGER DEFAULT 0,
        total_cost REAL DEFAULT 0.0,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_branch ON conversation_sessions(branch_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_project ON conversation_sessions(project_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_last_message ON conversation_sessions(last_message_at);
    `)

    // AI messages table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ai_messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        branch_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('user', 'assistant', 'system')),
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        token_count INTEGER,
        metadata_json TEXT,
        FOREIGN KEY (session_id) REFERENCES conversation_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_messages_session ON ai_messages(session_id);
      CREATE INDEX IF NOT EXISTS idx_messages_branch ON ai_messages(branch_id);
      CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON ai_messages(timestamp);
    `)

    // Action executions table (branch-scoped)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS action_executions (
        id TEXT PRIMARY KEY,
        branch_id TEXT NOT NULL,
        trigger_source TEXT NOT NULL,
        trigger_ref_id TEXT,
        action_type TEXT NOT NULL,
        action_name TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('pending', 'running', 'completed', 'failed')),
        started_at INTEGER NOT NULL,
        completed_at INTEGER,
        result_json TEXT,
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_actions_branch ON action_executions(branch_id);
      CREATE INDEX IF NOT EXISTS idx_actions_trigger ON action_executions(trigger_source);
      CREATE INDEX IF NOT EXISTS idx_actions_status ON action_executions(status);
    `)

    // Action logs table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS action_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action_id TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        level TEXT NOT NULL CHECK(level IN ('info', 'warn', 'error', 'debug')),
        message TEXT NOT NULL,
        data_json TEXT,
        FOREIGN KEY (action_id) REFERENCES action_executions(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_logs_action ON action_logs(action_id);
      CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON action_logs(timestamp);
    `)

    console.log('✅ Database schema created successfully')
  }

  /**
   * Create a new project
   *
   * @param project - Project data
   * @returns Promise that resolves when project is created
   *
   * @public
   */
  async createProject(project: Project): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    const stmt = this.db.prepare(`
      INSERT INTO projects (id, name, path, created_at, last_opened_at)
      VALUES (?, ?, ?, ?, ?)
    `)

    stmt.run(
      project.id,
      project.name,
      project.path,
      project.created_at,
      project.last_opened_at
    )
  }

  /**
   * Switch to a different branch (marks as active)
   *
   * @param branchId - Branch ID to switch to
   * @returns Promise that resolves when switch completes
   *
   * @public
   */
  async switchBranch(branchId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    // Get project_id for this branch
    const branch = this.db
      .prepare('SELECT project_id FROM branches WHERE id = ?')
      .get(branchId) as { project_id: string } | undefined

    if (!branch) {
      throw new Error(`Branch ${branchId} not found`)
    }

    // Deactivate all branches in this project
    this.db
      .prepare('UPDATE branches SET is_active = 0 WHERE project_id = ?')
      .run(branch.project_id)

    // Activate selected branch
    this.db
      .prepare(
        'UPDATE branches SET is_active = 1, last_active_at = ? WHERE id = ?'
      )
      .run(Date.now(), branchId)
  }

  /**
   * Get active branch for a project
   *
   * @param projectId - Project ID
   * @returns Promise resolving to active branch or null
   *
   * @public
   */
  async getActiveBranch(projectId: string): Promise<Branch | null> {
    if (!this.db) throw new Error('Database not initialized')

    const branch = this.db
      .prepare('SELECT * FROM branches WHERE project_id = ? AND is_active = 1')
      .get(projectId) as Branch | undefined

    return branch || null
  }

  /**
   * Save conversation session
   *
   * @param session - Conversation session data
   * @returns Promise that resolves when session is saved
   *
   * @public
   */
  async saveConversation(session: ConversationSession): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO conversation_sessions
      (id, project_id, branch_id, session_title, provider, model, created_at, last_message_at, message_count, total_tokens, total_cost)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      session.id,
      session.project_id,
      session.branch_id,
      session.session_title,
      session.provider,
      session.model,
      session.created_at,
      session.last_message_at,
      session.message_count,
      session.total_tokens,
      session.total_cost
    )
  }

  /**
   * Get conversations for a branch
   *
   * @param branchId - Branch ID
   * @returns Promise resolving to array of conversation sessions
   *
   * @public
   */
  async getConversationsForBranch(
    branchId: string
  ): Promise<ConversationSession[]> {
    if (!this.db) throw new Error('Database not initialized')

    const sessions = this.db
      .prepare(
        'SELECT * FROM conversation_sessions WHERE branch_id = ? ORDER BY last_message_at DESC'
      )
      .all(branchId) as ConversationSession[]

    return sessions
  }

  /**
   * Save AI message
   *
   * @param message - AI message data
   * @returns Promise that resolves when message is saved
   *
   * @public
   */
  async saveMessage(message: AIMessage): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    const stmt = this.db.prepare(`
      INSERT INTO ai_messages
      (id, session_id, branch_id, type, content, timestamp, provider, model, token_count, metadata_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    // Ensure timestamp is a number (convert Date to timestamp if needed)
    const timestamp =
      typeof message.timestamp === 'number'
        ? message.timestamp
        : message.timestamp instanceof Date
          ? message.timestamp.getTime()
          : Date.now()

    // Ensure metadata_json is properly serialized
    const metadataJson = message.metadata_json
      ? typeof message.metadata_json === 'string'
        ? message.metadata_json
        : JSON.stringify(message.metadata_json)
      : null

    console.log('[ElectronStorageManager] Saving message with parameters:', {
      id: message.id,
      session_id: message.session_id,
      branch_id: message.branch_id,
      type: message.type,
      contentLength: message.content?.length || 0,
      timestamp,
      provider: message.provider,
      model: message.model,
      token_count: message.token_count || null,
      metadata_json: metadataJson,
    })

    stmt.run(
      message.id,
      message.session_id,
      message.branch_id,
      message.type,
      message.content,
      timestamp,
      message.provider,
      message.model,
      message.token_count || null,
      metadataJson
    )
  }

  /**
   * Get messages for a session
   *
   * @param sessionId - Session ID
   * @returns Promise resolving to array of messages
   *
   * @public
   */
  async getMessagesForSession(sessionId: string): Promise<AIMessage[]> {
    if (!this.db) throw new Error('Database not initialized')

    const rawMessages = this.db
      .prepare(
        'SELECT * FROM ai_messages WHERE session_id = ? ORDER BY timestamp ASC'
      )
      .all(sessionId) as Array<
      Omit<AIMessage, 'metadata'> & { metadata_json: string | null }
    >

    // Parse metadata_json from string to object
    const messages: AIMessage[] = rawMessages.map((msg) => {
      let metadata: Record<string, unknown> | undefined = undefined

      if (msg.metadata_json) {
        try {
          metadata = JSON.parse(msg.metadata_json) as Record<string, unknown>
          console.log(
            `[ElectronStorageManager] Parsed metadata for message ${msg.id}:`,
            metadata
          )
        } catch (error) {
          console.error(
            `[ElectronStorageManager] Failed to parse metadata_json for message ${msg.id}:`,
            error
          )
        }
      }

      // Return message with parsed metadata (exclude metadata_json, include metadata)
      const { metadata_json: _metadata_json, ...rest } =
        msg as unknown as AIMessage & {
          metadata_json: string | null
        }
      return {
        ...rest,
        metadata,
      }
    })

    return messages
  }

  /**
   * Save action execution
   *
   * @param action - Action execution data
   * @returns Promise that resolves when action is saved
   *
   * @public
   */
  async saveAction(action: ActionExecution): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    const stmt = this.db.prepare(`
      INSERT INTO action_executions
      (id, branch_id, trigger_source, trigger_ref_id, action_type, action_name, status, started_at, completed_at, result_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      action.id,
      action.branch_id,
      action.trigger_source,
      action.trigger_ref_id || null,
      action.action_type,
      action.action_name,
      action.status,
      action.started_at,
      action.completed_at || null,
      action.result_json || null
    )
  }

  /**
   * Update action status
   *
   * @param actionId - Action ID
   * @param status - New status
   * @param result - Optional result data
   * @returns Promise that resolves when status is updated
   *
   * @public
   */
  async updateActionStatus(
    actionId: string,
    status: ActionExecution['status'],
    result?: { success: boolean; output?: string; error?: string }
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    const now = Date.now()
    const resultJson = result ? JSON.stringify(result) : null

    const stmt = this.db.prepare(`
      UPDATE action_executions
      SET status = ?, completed_at = ?, result_json = ?
      WHERE id = ?
    `)

    stmt.run(status, now, resultJson, actionId)
  }

  /**
   * Get branch metrics (Context7: Prisma aggregation pattern)
   *
   * @param branchId - Branch ID
   * @returns Promise resolving to branch metrics
   *
   * @public
   */
  async getBranchMetrics(branchId: string): Promise<BranchMetrics> {
    if (!this.db) throw new Error('Database not initialized')

    const query = `
      SELECT
        COUNT(DISTINCT cs.id) as total_sessions,
        COUNT(DISTINCT am.id) as total_messages,
        SUM(cs.total_tokens) as total_tokens,
        SUM(cs.total_cost) as total_cost,
        COUNT(DISTINCT ae.id) as total_actions
      FROM branches b
      LEFT JOIN conversation_sessions cs ON cs.branch_id = b.id
      LEFT JOIN ai_messages am ON am.branch_id = b.id
      LEFT JOIN action_executions ae ON ae.branch_id = b.id
      WHERE b.id = ?
    `

    const metrics = this.db.prepare(query).get(branchId) as BranchMetrics

    return {
      total_sessions: metrics.total_sessions || 0,
      total_messages: metrics.total_messages || 0,
      total_tokens: metrics.total_tokens || 0,
      total_cost: metrics.total_cost || 0,
      total_actions: metrics.total_actions || 0,
    }
  }

  /**
   * Get provider metrics for a branch (Context7: Prisma GROUP BY pattern)
   *
   * @param branchId - Branch ID
   * @returns Promise resolving to provider metrics array
   *
   * @public
   */
  async getProviderStats(branchId: string): Promise<ProviderMetrics[]> {
    if (!this.db) throw new Error('Database not initialized')

    const query = `
      SELECT
        provider,
        COUNT(DISTINCT session_id) as session_count,
        COUNT(*) as message_count,
        SUM(COALESCE(token_count, 0)) as total_tokens
      FROM ai_messages
      WHERE branch_id = ?
      GROUP BY provider
      ORDER BY message_count DESC
    `

    const stats = this.db.prepare(query).all(branchId) as ProviderMetrics[]

    return stats
  }

  /**
   * Get global statistics (Context7: Custom aggregate)
   *
   * @returns Promise resolving to global stats
   *
   * @public
   */
  async getGlobalStats(): Promise<GlobalStats> {
    if (!this.db) throw new Error('Database not initialized')

    const query = `
      SELECT
        COUNT(DISTINCT p.id) as total_projects,
        COUNT(DISTINCT b.id) as total_branches,
        COUNT(DISTINCT cs.id) as total_sessions,
        SUM(cs.total_tokens) as total_tokens,
        SUM(cs.total_cost) as total_cost
      FROM projects p
      LEFT JOIN branches b ON b.project_id = p.id
      LEFT JOIN conversation_sessions cs ON cs.branch_id = b.id
    `

    const stats = this.db.prepare(query).get() as GlobalStats

    return {
      total_projects: stats.total_projects || 0,
      total_branches: stats.total_branches || 0,
      total_sessions: stats.total_sessions || 0,
      total_tokens: stats.total_tokens || 0,
      total_cost: stats.total_cost || 0,
    }
  }

  /**
   * Get all projects
   *
   * @returns Promise resolving to array of projects
   *
   * @public
   */
  async getProjects(): Promise<Project[]> {
    if (!this.db) throw new Error('Database not initialized')

    const query = `
      SELECT * FROM projects
      ORDER BY last_opened_at DESC
    `

    return this.db.prepare(query).all() as Project[]
  }

  /**
   * Get project by ID
   *
   * @param projectId - Project ID
   * @returns Promise resolving to project or null
   *
   * @public
   */
  async getProjectById(projectId: string): Promise<Project | null> {
    if (!this.db) throw new Error('Database not initialized')

    const query = `
      SELECT * FROM projects WHERE id = ?
    `

    const project = this.db.prepare(query).get(projectId) as Project | undefined

    return project || null
  }

  /**
   * Get project by path
   *
   * @param path - Project path
   * @returns Promise resolving to project or null
   *
   * @public
   */
  async getProjectByPath(path: string): Promise<Project | null> {
    if (!this.db) throw new Error('Database not initialized')

    const query = `
      SELECT * FROM projects WHERE path = ?
    `

    const project = this.db.prepare(query).get(path) as Project | undefined

    return project || null
  }

  /**
   * Update project's last opened timestamp
   *
   * @param projectId - Project ID
   * @returns Promise that resolves when updated
   *
   * @public
   */
  async updateProjectLastOpened(projectId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    const query = `
      UPDATE projects
      SET last_opened_at = ?
      WHERE id = ?
    `

    this.db.prepare(query).run(Date.now(), projectId)
  }

  /**
   * Delete project and all associated data
   *
   * @param projectId - Project ID
   * @returns Promise that resolves when deleted
   *
   * @remarks
   * Uses CASCADE to automatically delete branches, sessions, messages, and actions
   *
   * @public
   */
  async deleteProject(projectId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    const query = `
      DELETE FROM projects WHERE id = ?
    `

    this.db.prepare(query).run(projectId)
  }

  /**
   * Delete all projects and associated data
   *
   * @returns Promise that resolves when all projects are deleted
   *
   * @remarks
   * Uses CASCADE to automatically delete all branches, sessions, messages, and actions
   *
   * @public
   */
  async clearAllProjects(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    const query = `
      DELETE FROM projects
    `

    this.db.prepare(query).run()
  }

  /**
   * Save a project
   *
   * @param project - Project to save
   * @returns Promise that resolves when saved
   *
   * @public
   */
  async saveProject(project: ProjectInput): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    const query = `
      INSERT OR REPLACE INTO projects (id, name, path, created_at, last_opened_at)
      VALUES (?, ?, ?, ?, ?)
    `

    this.db
      .prepare(query)
      .run(
        project.id,
        project.name,
        project.path,
        project.createdAt.getTime(),
        project.lastOpenedAt.getTime()
      )
  }

  /**
   * Create a branch for a project
   *
   * @param projectId - Project ID
   * @param branchName - Branch name
   * @returns Promise resolving to branch ID
   *
   * @public
   */
  async createBranch(projectId: string, branchName: string): Promise<string> {
    if (!this.db) throw new Error('Database not initialized')

    // Check if branch already exists
    const existing = this.db
      .prepare(
        `
      SELECT id FROM branches
      WHERE project_id = ? AND branch_name = ?
    `
      )
      .get(projectId, branchName) as { id: string } | undefined

    if (existing) {
      return existing.id
    }

    // Create new branch
    const branchId = `branch_${Date.now()}_${Math.random().toString(36).substring(7)}`
    const now = Date.now()

    this.db
      .prepare(
        `
      INSERT INTO branches (id, project_id, branch_name, is_active, created_at, last_active_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `
      )
      .run(branchId, projectId, branchName, 1, now, now)

    return branchId
  }

  /**
   * Get workspace state for session persistence
   *
   * @returns Promise resolving to workspace or null
   *
   * @remarks
   * Workspace contains the currently opened project and its active tasks.
   * Used to restore project state between application sessions.
   *
   * @example
   * ```typescript
   * const workspace = await storage.getWorkspace()
   * if (workspace) {
   *   console.log('Restoring project:', workspace.project.name)
   * }
   * ```
   *
   * @public
   * @since 2.0.0
   */
  async getWorkspace(): Promise<Workspace | null> {
    return this.storage.get<Workspace>('__workspace__')
  }

  /**
   * Set workspace state for session persistence
   *
   * @param workspace - Workspace data to persist
   * @returns Promise that resolves when workspace is saved
   *
   * @remarks
   * Persists the current workspace state (project + tasks) to storage.
   * This data is loaded on application startup to restore the last session.
   *
   * @example
   * ```typescript
   * await storage.setWorkspace({
   *   project: {
   *     path: '/path/to/project',
   *     name: 'My Project',
   *     lastOpened: new Date()
   *   },
   *   activeTasks: [],
   *   currentTaskId: null
   * })
   * ```
   *
   * @throws {@link StorageError}
   * Thrown when workspace persistence fails
   *
   * @public
   * @since 2.0.0
   */
  async setWorkspace(workspace: Workspace): Promise<void> {
    return this.storage.set('__workspace__', workspace)
  }

  /**
   * Clear workspace state (close project)
   *
   * @returns Promise that resolves when workspace is cleared
   *
   * @remarks
   * Removes the persisted workspace from storage. Used when the user
   * explicitly closes a project or returns to the onboarding screen.
   *
   * @example
   * ```typescript
   * await storage.clearWorkspace()
   * console.log('Workspace cleared')
   * ```
   *
   * @public
   * @since 2.0.0
   */
  async clearWorkspace(): Promise<void> {
    return this.storage.delete('__workspace__')
  }

  /**
   * Save action execution for forensics tracking
   *
   * @param execution - Action execution data
   * @returns Promise that resolves when execution is saved
   *
   * @remarks
   * Tracks action executions per branch for forensic analysis.
   * Used by Hatcher Actions to log all command executions.
   *
   * @example
   * ```typescript
   * await storage.saveActionExecution({
   *   id: 'exec-123',
   *   branch_id: 'branch-456',
   *   trigger_source: 'manual',
   *   action_type: 'bash_command',
   *   action_name: 'lint:check',
   *   status: 'completed',
   *   started_at: Date.now(),
   *   completed_at: Date.now() + 3000,
   *   result_json: JSON.stringify({ exitCode: 0, output: '...' })
   * })
   * ```
   *
   * @public
   * @since 2.0.0
   */
  async saveActionExecution(execution: {
    id: string
    branch_id: string
    trigger_source: 'decklog' | 'timegraph' | 'manual'
    trigger_ref_id?: string
    action_type: string
    action_name: string
    status: 'pending' | 'running' | 'completed' | 'failed'
    started_at: number
    completed_at?: number
    result_json?: string
  }): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO action_executions (
        id, branch_id, trigger_source, trigger_ref_id, action_type,
        action_name, status, started_at, completed_at, result_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      execution.id,
      execution.branch_id,
      execution.trigger_source,
      execution.trigger_ref_id || null,
      execution.action_type,
      execution.action_name,
      execution.status,
      execution.started_at,
      execution.completed_at || null,
      execution.result_json || null
    )
  }

  /**
   * Get action execution history for a branch
   *
   * @param branchId - Branch ID to query
   * @param options - Query options (limit, status filter)
   * @returns Promise resolving to array of executions
   *
   * @remarks
   * Retrieves action execution history for forensic analysis.
   * Supports filtering by status and limiting results.
   *
   * @example
   * ```typescript
   * const history = await storage.getActionHistory('branch-123', {
   *   limit: 50,
   *   status: 'completed'
   * })
   * console.log(`Found ${history.length} executions`)
   * ```
   *
   * @public
   * @since 2.0.0
   */
  async getActionHistory(
    branchId: string,
    options?: {
      limit?: number
      status?: 'pending' | 'running' | 'completed' | 'failed'
    }
  ): Promise<
    Array<{
      id: string
      branch_id: string
      trigger_source: string
      trigger_ref_id: string | null
      action_type: string
      action_name: string
      status: string
      started_at: number
      completed_at: number | null
      result_json: string | null
    }>
  > {
    let query = `
      SELECT * FROM action_executions
      WHERE branch_id = ?
    `

    const params: Array<string | number> = [branchId]

    if (options?.status) {
      query += ` AND status = ?`
      params.push(options.status)
    }

    query += ` ORDER BY started_at DESC`

    if (options?.limit) {
      query += ` LIMIT ?`
      params.push(options.limit)
    }

    const stmt = this.db.prepare(query)
    return stmt.all(...params) as Array<{
      id: string
      branch_id: string
      trigger_source: string
      trigger_ref_id: string | null
      action_type: string
      action_name: string
      status: string
      started_at: number
      completed_at: number | null
      result_json: string | null
    }>
  }

  /**
   * Get aggregated action metrics for a branch
   *
   * @param branchId - Branch ID to query
   * @returns Promise resolving to metrics object
   *
   * @remarks
   * Computes aggregated metrics for forensic analysis:
   * - Total executions
   * - Success/failure counts
   * - Average duration
   * - Most common actions
   *
   * @example
   * ```typescript
   * const metrics = await storage.getBranchActionMetrics('branch-123')
   * console.log(`Success rate: ${metrics.successRate}%`)
   * console.log(`Avg duration: ${metrics.avgDuration}ms`)
   * ```
   *
   * @public
   * @since 2.0.0
   */
  async getBranchActionMetrics(branchId: string): Promise<{
    totalExecutions: number
    completedCount: number
    failedCount: number
    avgDuration: number
    successRate: number
    mostCommonActions: Array<{ action_name: string; count: number }>
  }> {
    // Get totals
    const totalsStmt = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        AVG(CASE WHEN completed_at IS NOT NULL
          THEN completed_at - started_at
          ELSE NULL
        END) as avg_duration
      FROM action_executions
      WHERE branch_id = ?
    `)

    const totals = totalsStmt.get(branchId) as {
      total: number
      completed: number
      failed: number
      avg_duration: number | null
    }

    // Get most common actions
    const actionsStmt = this.db.prepare(`
      SELECT action_name, COUNT(*) as count
      FROM action_executions
      WHERE branch_id = ?
      GROUP BY action_name
      ORDER BY count DESC
      LIMIT 5
    `)

    const commonActions = actionsStmt.all(branchId) as Array<{
      action_name: string
      count: number
    }>

    const totalExecutions = totals.total || 0
    const completedCount = totals.completed || 0
    const failedCount = totals.failed || 0
    const successRate =
      totalExecutions > 0 ? (completedCount / totalExecutions) * 100 : 0

    return {
      totalExecutions,
      completedCount,
      failedCount,
      avgDuration: totals.avg_duration || 0,
      successRate: Math.round(successRate * 100) / 100, // Round to 2 decimals
      mostCommonActions: commonActions,
    }
  }

  /**
   * Graceful shutdown with WAL checkpoint (Context7: Node.js best practices)
   *
   * @returns Promise that resolves when shutdown completes
   *
   * @public
   */
  async shutdown(): Promise<void> {
    if (this.db) {
      // Context7: Checkpoint WAL before closing (better-sqlite3)
      this.db.pragma('wal_checkpoint(RESTART)')
      this.db.close()
    }

    await this.storage.close()
    console.log('✅ ElectronStorageManager shutdown complete')
  }
}
