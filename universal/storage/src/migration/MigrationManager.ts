/**
 * @fileoverview Database migration system for storage adapters
 *
 * @description
 * Manages database schema migrations and data transformations across
 * different versions of the storage system. Provides versioning, rollback
 * capabilities, and safe migration execution.
 *
 * @example
 * ```typescript
 * const migrationManager = new MigrationManager(adapter)
 *
 * migrationManager.addMigration({
 *   version: '1.1.0',
 *   description: 'Add user preferences table',
 *   up: async (adapter) => {
 *     await adapter.execute(`
 *       CREATE TABLE user_preferences (
 *         user_id TEXT PRIMARY KEY,
 *         preferences TEXT NOT NULL
 *       )
 *     `)
 *   }
 * })
 *
 * await migrationManager.migrate()
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import type { IStorageAdapter } from '../types/storage'

/**
 * Database migration definition
 *
 * @public
 */
export interface Migration {
  /**
   * Unique migration version identifier
   */
  version: string

  /**
   * Human-readable migration description
   */
  description: string

  /**
   * Migration function to apply changes
   *
   * @param adapter - Storage adapter to execute migration on
   * @returns Promise that resolves when migration completes
   */
  up: (adapter: IStorageAdapter) => Promise<void>

  /**
   * Optional rollback function to undo changes
   *
   * @param adapter - Storage adapter to execute rollback on
   * @returns Promise that resolves when rollback completes
   */
  down?: (adapter: IStorageAdapter) => Promise<void>

  /**
   * Dependencies on other migrations (version identifiers)
   */
  dependencies?: string[]

  /**
   * Whether this migration can be rolled back safely
   * @defaultValue true
   */
  reversible?: boolean
}

/**
 * Migration execution result
 *
 * @public
 */
export interface MigrationResult {
  /**
   * Migration version that was executed
   */
  version: string

  /**
   * Whether migration succeeded
   */
  success: boolean

  /**
   * Execution time in milliseconds
   */
  executionTime: number

  /**
   * Error message if migration failed
   */
  error?: string

  /**
   * Timestamp when migration was executed
   */
  executedAt: number
}

/**
 * Migration history tracking
 *
 * @internal
 */
interface MigrationHistory {
  /**
   * Migration version
   */
  version: string

  /**
   * When migration was applied
   */
  appliedAt: number

  /**
   * Execution time in milliseconds
   */
  executionTime: number

  /**
   * Migration description
   */
  description: string
}

/**
 * Database migration manager with versioning and rollback support
 *
 * @remarks
 * Provides a safe and structured approach to evolving database schemas
 * and data formats over time. Tracks migration history and ensures
 * migrations are applied in the correct order with proper dependency
 * resolution.
 *
 * @example
 * ```typescript
 * const manager = new MigrationManager(sqliteAdapter)
 *
 * // Add migrations
 * manager.addMigration({
 *   version: '1.0.0',
 *   description: 'Initial schema',
 *   up: async (adapter) => {
 *     // Create initial tables
 *   }
 * })
 *
 * manager.addMigration({
 *   version: '1.1.0',
 *   description: 'Add indexes',
 *   dependencies: ['1.0.0'],
 *   up: async (adapter) => {
 *     // Add performance indexes
 *   }
 * })
 *
 * // Execute all pending migrations
 * const results = await manager.migrate()
 * console.log(`Applied ${results.length} migrations`)
 * ```
 *
 * @public
 */
export class MigrationManager {
  private migrations = new Map<string, Migration>()
  private migrationHistory: MigrationHistory[] = []

  /**
   * Create migration manager instance
   *
   * @param adapter - Storage adapter to run migrations on
   */
  constructor(private adapter: IStorageAdapter) {}

  /**
   * Add migration to the manager
   *
   * @param migration - Migration definition to add
   * @throws Error when migration version already exists
   *
   * @example
   * ```typescript
   * manager.addMigration({
   *   version: '2.0.0',
   *   description: 'Add full-text search',
   *   up: async (adapter) => {
   *     await adapter.execute('CREATE VIRTUAL TABLE search USING fts5(content)')
   *   },
   *   down: async (adapter) => {
   *     await adapter.execute('DROP TABLE search')
   *   }
   * })
   * ```
   */
  addMigration(migration: Migration): void {
    if (this.migrations.has(migration.version)) {
      throw new Error(`Migration version ${migration.version} already exists`)
    }

    this.migrations.set(migration.version, {
      reversible: true,
      ...migration,
    })
  }

  /**
   * Execute all pending migrations in correct order
   *
   * @returns Promise that resolves to array of migration results
   *
   * @throws Error when migration dependency cannot be resolved
   *
   * @example
   * ```typescript
   * const results = await manager.migrate()
   * const failed = results.filter(r => !r.success)
   * if (failed.length > 0) {
   *   console.error('Some migrations failed:', failed)
   * }
   * ```
   */
  async migrate(): Promise<MigrationResult[]> {
    await this.loadMigrationHistory()

    const appliedVersions = new Set(this.migrationHistory.map((h) => h.version))
    const pendingMigrations = Array.from(this.migrations.values()).filter(
      (m) => !appliedVersions.has(m.version)
    )

    // Sort migrations by dependencies
    const sortedMigrations = this.topologicalSort(pendingMigrations)
    const results: MigrationResult[] = []

    for (const migration of sortedMigrations) {
      const result = await this.executeMigration(migration)
      results.push(result)

      if (!result.success) {
        console.error(`Migration ${migration.version} failed:`, result.error)
        break // Stop on first failure
      }
    }

    await this.saveMigrationHistory()
    return results
  }

  /**
   * Rollback to specific version
   *
   * @param targetVersion - Version to rollback to
   * @returns Promise that resolves to array of rollback results
   *
   * @throws Error when rollback is not possible
   *
   * @example
   * ```typescript
   * // Rollback to version 1.0.0
   * const results = await manager.rollback('1.0.0')
   * console.log(`Rolled back ${results.length} migrations`)
   * ```
   */
  async rollback(targetVersion: string): Promise<MigrationResult[]> {
    await this.loadMigrationHistory()

    // Find migrations to rollback (newer than target)
    const toRollback = this.migrationHistory
      .filter((h) => this.compareVersions(h.version, targetVersion) > 0)
      .reverse() // Rollback in reverse order

    const results: MigrationResult[] = []

    for (const historyEntry of toRollback) {
      const migration = this.migrations.get(historyEntry.version)
      if (!migration || !migration.down || !migration.reversible) {
        throw new Error(
          `Cannot rollback migration ${historyEntry.version}: not reversible`
        )
      }

      const result = await this.executeRollback(migration)
      results.push(result)

      if (result.success) {
        // Remove from history
        this.migrationHistory = this.migrationHistory.filter(
          (h) => h.version !== migration.version
        )
      } else {
        console.error(`Rollback ${migration.version} failed:`, result.error)
        break
      }
    }

    await this.saveMigrationHistory()
    return results
  }

  /**
   * Get list of applied migrations
   *
   * @returns Array of migration history entries
   */
  async getHistory(): Promise<MigrationHistory[]> {
    await this.loadMigrationHistory()
    return [...this.migrationHistory]
  }

  /**
   * Get list of pending migrations
   *
   * @returns Array of pending migration versions
   */
  async getPendingMigrations(): Promise<string[]> {
    await this.loadMigrationHistory()

    const appliedVersions = new Set(this.migrationHistory.map((h) => h.version))
    return Array.from(this.migrations.keys()).filter(
      (version) => !appliedVersions.has(version)
    )
  }

  /**
   * Execute single migration
   *
   * @param migration - Migration to execute
   * @returns Migration execution result
   */
  private async executeMigration(
    migration: Migration
  ): Promise<MigrationResult> {
    const startTime = Date.now()

    try {
      await migration.up(this.adapter)

      const executionTime = Date.now() - startTime

      // Record in history
      this.migrationHistory.push({
        version: migration.version,
        appliedAt: Date.now(),
        executionTime,
        description: migration.description,
      })

      return {
        version: migration.version,
        success: true,
        executionTime,
        executedAt: Date.now(),
      }
    } catch (error) {
      return {
        version: migration.version,
        success: false,
        executionTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        executedAt: Date.now(),
      }
    }
  }

  /**
   * Execute migration rollback
   *
   * @param migration - Migration to rollback
   * @returns Rollback execution result
   */
  private async executeRollback(
    migration: Migration
  ): Promise<MigrationResult> {
    const startTime = Date.now()

    try {
      if (!migration.down) {
        throw new Error('Migration has no rollback function')
      }

      await migration.down(this.adapter)

      return {
        version: migration.version,
        success: true,
        executionTime: Date.now() - startTime,
        executedAt: Date.now(),
      }
    } catch (error) {
      return {
        version: migration.version,
        success: false,
        executionTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        executedAt: Date.now(),
      }
    }
  }

  /**
   * Sort migrations by dependencies using topological sort
   *
   * @param migrations - Migrations to sort
   * @returns Sorted migrations array
   */
  private topologicalSort(migrations: Migration[]): Migration[] {
    const sorted: Migration[] = []
    const visiting = new Set<string>()
    const visited = new Set<string>()

    const visit = (migration: Migration) => {
      if (visiting.has(migration.version)) {
        throw new Error(
          `Circular dependency detected in migration ${migration.version}`
        )
      }
      if (visited.has(migration.version)) {
        return
      }

      visiting.add(migration.version)

      // Visit dependencies first
      if (migration.dependencies) {
        for (const depVersion of migration.dependencies) {
          const depMigration = migrations.find((m) => m.version === depVersion)
          if (depMigration) {
            visit(depMigration)
          }
        }
      }

      visiting.delete(migration.version)
      visited.add(migration.version)
      sorted.push(migration)
    }

    for (const migration of migrations) {
      visit(migration)
    }

    return sorted
  }

  /**
   * Compare version strings
   *
   * @param a - First version
   * @param b - Second version
   * @returns -1 if a < b, 0 if a === b, 1 if a > b
   */
  private compareVersions(a: string, b: string): number {
    const partsA = a.split('.').map(Number)
    const partsB = b.split('.').map(Number)
    const maxLength = Math.max(partsA.length, partsB.length)

    for (let i = 0; i < maxLength; i++) {
      const partA = partsA[i] || 0
      const partB = partsB[i] || 0

      if (partA < partB) return -1
      if (partA > partB) return 1
    }

    return 0
  }

  /**
   * Load migration history from storage
   *
   * @returns Promise that resolves when history is loaded
   */
  private async loadMigrationHistory(): Promise<void> {
    try {
      const history =
        await this.adapter.get<MigrationHistory[]>('__migrations__')
      if (history) {
        this.migrationHistory = history
      }
    } catch {
      // History doesn't exist yet - this is fine for first run
      this.migrationHistory = []
    }
  }

  /**
   * Save migration history to storage
   *
   * @returns Promise that resolves when history is saved
   */
  private async saveMigrationHistory(): Promise<void> {
    await this.adapter.set('__migrations__', this.migrationHistory)
  }
}
