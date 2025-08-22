/**
 * @fileoverview High-performance SQLite storage adapter
 *
 * @description
 * SQLite-based storage adapter with advanced features including JSON queries,
 * full-text search, batch operations, and comprehensive indexing for maximum performance.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { dirname } from 'path'
import { existsSync, mkdirSync } from 'fs'
import type Database from 'better-sqlite3'
import { BaseStorageAdapter } from '../core/StorageAdapter'
import type { StorageConfig, StorageMetadata } from '../types/storage'
import { StorageError, StorageErrorCode } from '../types/storage'
import type { EncryptedData } from '../types/encryption'
import type {
  IQueryBuilder,
  QueryResult,
  QueryOperator,
  SortDirection,
} from '../types/query'

/**
 * Type representing the various forms of data that can be stored
 * - string: Raw unprocessed data
 * - EncryptedData: Encrypted data object
 */
type StoredValue = string | EncryptedData

/**
 * High-performance SQLite storage adapter
 *
 * @remarks
 * Production-ready SQLite adapter with advanced features:
 * - JSON column support for complex queries
 * - Full-text search capabilities
 * - Optimized batch operations
 * - Comprehensive indexing
 * - WAL mode for better concurrency
 * - Prepared statements for performance
 *
 * @example
 * ```typescript
 * const adapter = new SQLiteAdapter({
 *   type: 'sqlite',
 *   path: './data/storage.db',
 *   encryption: { enabled: true, passphrase: 'strong-passphrase' },
 *   compression: { enabled: true, algorithm: 'auto' }
 * })
 *
 * await adapter.initialize()
 * await adapter.set('user:123', { name: 'John', role: 'admin' })
 * const user = await adapter.get('user:123')
 * ```
 *
 * @public
 */
export class SQLiteAdapter extends BaseStorageAdapter {
  private db?: Database.Database | undefined
  private dbPath: string

  // Prepared statements for performance
  private preparedStatements?:
    | {
        get: Database.Statement<[string, string]>
        set: Database.Statement<
          [string, string, string, string, number, number, number, number]
        >
        delete: Database.Statement<[string, string]>
        list: Database.Statement<[string]>
        count: Database.Statement<[string]>
        has: Database.Statement<[string, string]>
        getMany: Database.Statement<string> | null
        clear: Database.Statement<[]>
        getSize: Database.Statement<[]>
        updateAccess: Database.Statement<[number, string, string]>
      }
    | undefined

  /**
   * Storage adapter type identifier
   */
  public readonly type = 'sqlite'

  constructor(config: StorageConfig) {
    super(config)
    this.dbPath = config.path || './storage.db'
  }

  /**
   * Initialize SQLite database with optimized configuration
   *
   * @returns Promise that resolves when initialization completes
   *
   * @throws {@link StorageError}
   * Thrown when database initialization fails
   */
  protected async initializeAdapter(): Promise<void> {
    try {
      // Dynamically import better-sqlite3 with fallback handling
      let Database: typeof import('better-sqlite3').default
      try {
        const sqliteModule = await import('better-sqlite3')
        Database = sqliteModule.default
      } catch (error) {
        throw new StorageError(
          `Failed to initialize SQLite database: ${error instanceof Error ? error.message : 'better-sqlite3 not available'}`,
          StorageErrorCode.INITIALIZATION_ERROR,
          error instanceof Error ? error : undefined
        )
      }

      // Ensure directory exists
      const dir = dirname(this.dbPath)
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }

      // Open database with optimized settings
      this.db = new Database(this.dbPath, {
        verbose:
          process.env.NODE_ENV === 'development' ? console.log : undefined,
      })

      // Configure SQLite for performance and reliability
      this.configureDatabase()

      // Create tables and indexes
      await this.createSchema()

      // Prepare statements for better performance
      this.prepareStatements()

      console.log(`🗄️ SQLite storage initialized: ${this.dbPath}`)
    } catch (error) {
      throw new StorageError(
        `Failed to initialize SQLite database: ${error instanceof Error ? error.message : 'Unknown error'}`,
        StorageErrorCode.DATABASE_ERROR,
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * Configure SQLite for optimal performance and reliability
   */
  private configureDatabase(): void {
    if (!this.db) return

    // Enable WAL mode for better concurrency
    this.db.pragma('journal_mode = WAL')

    // Optimize for performance
    this.db.pragma('synchronous = NORMAL')
    this.db.pragma('cache_size = 10000')
    this.db.pragma('temp_store = memory')
    this.db.pragma('mmap_size = 268435456') // 256MB mmap

    // Enable foreign key constraints
    this.db.pragma('foreign_keys = ON')

    // Set timeout for busy database
    this.db.pragma('busy_timeout = 30000') // 30 seconds

    // Optimize for JSON operations (SQLite 3.38+)
    try {
      this.db.pragma('optimize')
    } catch {
      // Ignore if not supported
    }
  }

  /**
   * Create database schema with optimized indexes
   */
  private async createSchema(): Promise<void> {
    if (!this.db) return

    // Main storage table with JSON support
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS storage (
        id TEXT PRIMARY KEY,
        namespace TEXT NOT NULL DEFAULT 'default',
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        metadata TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        accessed_at INTEGER DEFAULT 0,
        access_count INTEGER DEFAULT 0,
        UNIQUE(namespace, key)
      );
    `)

    // Indexes for performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_namespace_key ON storage(namespace, key);
      CREATE INDEX IF NOT EXISTS idx_namespace ON storage(namespace);
      CREATE INDEX IF NOT EXISTS idx_updated_at ON storage(updated_at);
      CREATE INDEX IF NOT EXISTS idx_accessed_at ON storage(accessed_at);
      CREATE INDEX IF NOT EXISTS idx_created_at ON storage(created_at);
    `)

    // Full-text search table (for searchable content)
    // Only create FTS if encryption is not enabled (encrypted content can't be searched)
    if (!this.config.encryption?.enabled) {
      this.db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS storage_fts USING fts5(
          id,
          namespace,
          key,
          content
        );
      `)

      // Triggers to keep FTS table updated
      this.db.exec(`
        CREATE TRIGGER IF NOT EXISTS storage_fts_insert 
        AFTER INSERT ON storage 
        BEGIN
          INSERT INTO storage_fts(id, namespace, key, content)
          VALUES (new.id, new.namespace, new.key, new.value);
        END;
        
        CREATE TRIGGER IF NOT EXISTS storage_fts_update 
        AFTER UPDATE ON storage 
        BEGIN
          UPDATE storage_fts 
          SET namespace = new.namespace, key = new.key, content = new.value
          WHERE id = new.id;
        END;
        
        CREATE TRIGGER IF NOT EXISTS storage_fts_delete 
        AFTER DELETE ON storage 
        BEGIN
          DELETE FROM storage_fts WHERE id = old.id;
        END;
      `)
    }

    // Migrations table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        version INTEGER PRIMARY KEY,
        description TEXT,
        applied_at INTEGER NOT NULL
      );
    `)

    // Stats table for monitoring
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS storage_stats (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `)
  }

  /**
   * Prepare frequently used SQL statements for performance
   */
  private prepareStatements(): void {
    if (!this.db) return

    this.preparedStatements = {
      get: this.db.prepare(`
        SELECT value, metadata 
        FROM storage 
        WHERE namespace = ? AND key = ?
      `),

      set: this.db.prepare(`
        INSERT OR REPLACE INTO storage 
        (id, namespace, key, value, metadata, created_at, updated_at, access_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `),

      delete: this.db.prepare(`
        DELETE FROM storage 
        WHERE namespace = ? AND key = ?
      `),

      list: this.db.prepare(`
        SELECT key 
        FROM storage 
        WHERE namespace LIKE ? 
        ORDER BY key
      `),

      count: this.db.prepare(`
        SELECT COUNT(*) as count 
        FROM storage 
        WHERE namespace LIKE ?
      `),

      has: this.db.prepare(`
        SELECT 1 
        FROM storage 
        WHERE namespace = ? AND key = ? 
        LIMIT 1
      `),

      getMany: null, // Will be set dynamically

      clear: this.db.prepare(`DELETE FROM storage`),

      getSize: this.db.prepare(`
        SELECT 
          COUNT(*) as count,
          SUM(length(value)) as total_size,
          SUM(length(metadata)) as metadata_size
        FROM storage
      `),

      updateAccess: this.db.prepare(`
        UPDATE storage 
        SET accessed_at = ?, access_count = access_count + 1 
        WHERE namespace = ? AND key = ?
      `),
    }
  }

  /**
   * Raw get operation from SQLite
   *
   * @param key - Storage key (format: "namespace:key")
   * @returns Storage item or null if not found
   */
  protected async getRaw(
    key: string
  ): Promise<{ value: StoredValue; metadata?: StorageMetadata } | null> {
    if (!this.db || !this.preparedStatements) return null

    const [namespace, actualKey] = this.parseKey(key)
    const row = this.preparedStatements.get.get(namespace, actualKey) as
      | {
          value: string
          metadata?: string
        }
      | undefined

    if (!row) {
      return null
    }

    const metadata = row.metadata ? JSON.parse(row.metadata) : undefined

    return {
      value: metadata?.encrypted ? JSON.parse(row.value) : row.value,
      metadata,
    }
  }

  /**
   * Raw set operation to SQLite
   *
   * @param key - Storage key (format: "namespace:key")
   * @param value - Value to store
   * @param metadata - Storage metadata
   * @returns Promise that resolves when operation completes
   */
  protected async setRaw(
    key: string,
    value: StoredValue,
    metadata: StorageMetadata
  ): Promise<void> {
    if (!this.db || !this.preparedStatements) return

    this.validateKey(key)
    const [namespace, actualKey] = this.parseKey(key)
    const id = `${namespace}:${actualKey}`

    const stmt = this.preparedStatements.set
    ;(stmt.run as (...args: unknown[]) => unknown)(
      id,
      namespace,
      actualKey,
      typeof value === 'string' ? value : JSON.stringify(value),
      JSON.stringify(metadata),
      metadata.createdAt,
      metadata.updatedAt,
      1
    )
  }

  /**
   * Raw delete operation from SQLite
   *
   * @param key - Storage key to delete
   * @returns Promise that resolves when operation completes
   */
  protected async deleteRaw(key: string): Promise<void> {
    if (!this.db || !this.preparedStatements) return

    const [namespace, actualKey] = this.parseKey(key)
    this.preparedStatements.delete.run(namespace, actualKey)
  }

  /**
   * Raw clear operation for SQLite
   *
   * @returns Promise that resolves when operation completes
   */
  protected async clearRaw(): Promise<void> {
    if (!this.db || !this.preparedStatements) return

    this.preparedStatements.clear.run()
  }

  /**
   * List all keys with optional prefix
   *
   * @param prefix - Optional prefix to filter keys
   * @returns Promise that resolves to array of matching keys
   */
  async list(prefix?: string): Promise<string[]> {
    if (!this.db || !this.preparedStatements) return []

    const searchPattern = prefix ? `${prefix}%` : '%'
    const rows = this.preparedStatements.list.all(searchPattern) as Array<{
      key: string
    }>

    return rows.map((row) => row.key)
  }

  /**
   * Count total stored items
   *
   * @param prefix - Optional prefix to filter keys
   * @returns Promise that resolves to count of items
   */
  async count(prefix?: string): Promise<number> {
    if (!this.db || !this.preparedStatements) return 0

    const searchPattern = prefix ? `${prefix}%` : '%'
    const row = this.preparedStatements.count.get(searchPattern) as
      | {
          count: number
        }
      | undefined

    return row?.count || 0
  }

  /**
   * Check if key exists in SQLite
   *
   * @param key - Storage key to check
   * @returns Promise that resolves to true if key exists
   */
  async has(key: string): Promise<boolean> {
    if (!this.db || !this.preparedStatements) return false

    const [namespace, actualKey] = this.parseKey(key)
    const row = this.preparedStatements.has.get(namespace, actualKey)

    return !!row
  }

  /**
   * Get storage size in bytes
   *
   * @returns Promise that resolves to storage size
   */
  async getSize(): Promise<number> {
    if (!this.db || !this.preparedStatements) return 0

    const row = this.preparedStatements.getSize.get() as
      | {
          count: number
          total_size: number
          metadata_size: number
        }
      | undefined
    return (row?.total_size || 0) + (row?.metadata_size || 0)
  }

  /**
   * Close SQLite database connection
   *
   * @returns Promise that resolves when cleanup completes
   */
  async close(): Promise<void> {
    if (this.db) {
      this.db.close()
      this.db = undefined as Database.Database | undefined
      this.preparedStatements = undefined as typeof this.preparedStatements
      console.log('🗄️ SQLite storage closed')
    }
  }

  /**
   * Optimized batch get operation for SQLite
   *
   * @param keys - Array of storage keys
   * @returns Promise that resolves to map of raw storage items
   */
  protected async getManyRaw(
    keys: string[]
  ): Promise<
    Map<string, { value: StoredValue; metadata?: StorageMetadata } | null>
  > {
    if (!this.db || keys.length === 0) {
      return new Map()
    }

    const result = new Map<
      string,
      { value: StoredValue; metadata?: StorageMetadata } | null
    >()

    // Build parameterized query for batch get
    const placeholders = keys.map(() => '(?, ?)').join(', ')
    const sql = `
      SELECT namespace, key, value, metadata 
      FROM storage 
      WHERE (namespace, key) IN (VALUES ${placeholders})
    `

    const params: string[] = []
    for (const key of keys) {
      const [namespace, actualKey] = this.parseKey(key)
      params.push(namespace, actualKey)
    }

    const stmt = this.db.prepare(sql)
    const rows = stmt.all(...params) as Array<{
      namespace: string
      key: string
      value: string
      metadata: string
    }>

    // Map results back to original keys
    const resultMap = new Map<
      string,
      { value: StoredValue; metadata?: StorageMetadata }
    >()
    for (const row of rows) {
      const originalKey = `${row.namespace}:${row.key}`
      resultMap.set(originalKey, {
        value: row.value,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      })
    }

    // Ensure all requested keys are in result (with null for missing)
    for (const key of keys) {
      result.set(key, resultMap.get(key) || null)
    }

    return result
  }

  /**
   * Optimized batch set operation for SQLite
   *
   * @param items - Map of key to processed value and metadata
   * @returns Promise that resolves when operation completes
   */
  protected async setManyRaw(
    items: Map<string, { value: StoredValue; metadata: StorageMetadata }>
  ): Promise<void> {
    if (!this.db || !this.preparedStatements || items.size === 0) return

    // Use transaction for batch insert
    const transaction = this.db.transaction(
      (
        itemsArray: Array<
          [string, { value: StoredValue; metadata: StorageMetadata }]
        >
      ) => {
        for (const [key, item] of itemsArray) {
          const [namespace, actualKey] = this.parseKey(key)
          const id = `${namespace}:${actualKey}`

          const stmt = this.preparedStatements!.set
          ;(stmt.run as (...args: unknown[]) => unknown)(
            id,
            namespace,
            actualKey,
            typeof item.value === 'string'
              ? item.value
              : JSON.stringify(item.value),
            JSON.stringify(item.metadata),
            item.metadata.createdAt,
            item.metadata.updatedAt,
            1
          )
        }
      }
    )

    transaction(Array.from(items.entries()))
  }

  /**
   * Create query builder for complex queries
   *
   * @param namespace - Optional namespace to restrict query
   * @returns Query builder instance
   *
   * @example
   * ```typescript
   * const results = await adapter
   *   .query<User>()
   *   .where('role', '=', 'admin')
   *   .where('active', '=', true)
   *   .orderBy('lastLogin', 'desc')
   *   .limit(10)
   *   .execute()
   * ```
   */
  query<T>(namespace?: string): IQueryBuilder<T> {
    return new SQLiteQueryBuilder<T>(this.db!, namespace)
  }

  /**
   * Full-text search across stored content
   *
   * @param searchTerm - Search term
   * @param namespace - Optional namespace to restrict search
   * @param limit - Maximum number of results
   * @returns Promise that resolves to search results
   */
  async search<T>(
    searchTerm: string,
    namespace?: string,
    limit = 50
  ): Promise<T[]> {
    if (!this.db) return []

    // If encryption is enabled, FTS is not available
    if (this.config.encryption?.enabled) {
      console.warn(
        'Full-text search is not available when encryption is enabled'
      )
      return []
    }

    let sql = `
      SELECT s.value, s.metadata
      FROM storage_fts sf
      JOIN storage s ON s.id = sf.id
      WHERE storage_fts MATCH ?
    `
    const params: Array<string | number> = [searchTerm]

    if (namespace) {
      sql += ` AND s.namespace = ?`
      params.push(namespace)
    }

    sql += ` ORDER BY rank LIMIT ?`
    params.push(limit)

    const stmt = this.db.prepare(sql)
    const rows = stmt.all(...params) as Array<{
      value: string
      metadata: string
    }>

    return rows.map((row) => {
      // const metadata = JSON.parse(row.metadata) as StorageMetadata // TODO: Handle metadata if needed
      const value = row.value

      // Note: Decryption/decompression would need to be handled here
      // For now, assume processed data
      return JSON.parse(value) as T
    })
  }

  /**
   * Get database statistics for monitoring
   *
   * @returns Database statistics
   */
  async getStats(): Promise<{
    totalItems: number
    totalSize: number
    largestItem: number
    oldestItem: number
    namespaces: string[]
    indexes: string[]
  }> {
    if (!this.db) {
      return {
        totalItems: 0,
        totalSize: 0,
        largestItem: 0,
        oldestItem: 0,
        namespaces: [],
        indexes: [],
      }
    }

    // Get basic stats
    const sizeInfo = this.preparedStatements!.getSize.get() as
      | {
          count: number
          total_size: number
          metadata_size: number
        }
      | undefined

    // Get largest item
    const largestRow = this.db
      .prepare(
        `
      SELECT MAX(length(value)) as max_size 
      FROM storage
    `
      )
      .get() as { max_size: number } | undefined

    // Get oldest item
    const oldestRow = this.db
      .prepare(
        `
      SELECT MIN(created_at) as oldest 
      FROM storage
    `
      )
      .get() as { oldest: number } | undefined

    // Get namespaces
    const namespaceRows = this.db
      .prepare(
        `
      SELECT DISTINCT namespace 
      FROM storage 
      ORDER BY namespace
    `
      )
      .all() as Array<{ namespace: string }>

    // Get indexes
    const indexRows = this.db
      .prepare(
        `
      SELECT name 
      FROM sqlite_master 
      WHERE type = 'index' AND tbl_name = 'storage'
    `
      )
      .all() as Array<{ name: string }>

    return {
      totalItems: sizeInfo?.count || 0,
      totalSize: (sizeInfo?.total_size || 0) + (sizeInfo?.metadata_size || 0),
      largestItem: largestRow?.max_size || 0,
      oldestItem: oldestRow?.oldest || 0,
      namespaces: namespaceRows.map((row) => row.namespace),
      indexes: indexRows.map((row) => row.name),
    }
  }

  /**
   * Vacuum database to reclaim space
   *
   * @returns Promise that resolves when vacuum completes
   */
  async vacuum(): Promise<void> {
    if (!this.db) return

    console.log('🗄️ Vacuuming SQLite database...')
    this.db.exec('VACUUM')
    console.log('✅ Database vacuum completed')
  }

  /**
   * Analyze database for query optimization
   *
   * @returns Promise that resolves when analysis completes
   */
  async analyze(): Promise<void> {
    if (!this.db) return

    this.db.exec('ANALYZE')
  }

  // Helper methods

  /**
   * Parse storage key into namespace and actual key
   *
   * @param key - Storage key (format: "namespace:key" or just "key")
   * @returns Tuple of [namespace, actualKey]
   */
  private parseKey(key: string): [string, string] {
    const colonIndex = key.indexOf(':')
    if (colonIndex === -1) {
      return ['default', key]
    }

    return [key.substring(0, colonIndex), key.substring(colonIndex + 1)]
  }

  /**
   * Update access metadata for LRU tracking
   *
   * @param key - Storage key
   */
  protected async updateAccessMetadata(key: string): Promise<void> {
    if (!this.db || !this.preparedStatements) return

    const [namespace, actualKey] = this.parseKey(key)
    this.preparedStatements.updateAccess.run(Date.now(), namespace, actualKey)
  }
}

/**
 * SQLite query builder implementation
 *
 * @internal
 */
class SQLiteQueryBuilder<T> implements IQueryBuilder<T> {
  private conditions: string[] = []
  private parameters: Array<string | number | boolean | null> = []
  private orderClauses: string[] = []
  private limitClause = ''
  private offsetClause = ''
  private selectFields: string[] = []

  constructor(
    private db: Database.Database,
    private namespace?: string
  ) {}

  where(
    field: string,
    operator: QueryOperator,
    value: string | number | boolean | null
  ): this {
    // Use JSON_EXTRACT for querying JSON fields
    const condition = `json_extract(value, '$.${field}') ${operator} ?`
    this.conditions.push(condition)
    this.parameters.push(value)
    return this
  }

  whereIn(
    field: string,
    values: Array<string | number | boolean | null>
  ): this {
    const placeholders = values.map(() => '?').join(', ')
    const condition = `json_extract(value, '$.${field}') IN (${placeholders})`
    this.conditions.push(condition)
    this.parameters.push(...values)
    return this
  }

  whereBetween(
    field: string,
    min: string | number,
    max: string | number
  ): this {
    const condition = `json_extract(value, '$.${field}') BETWEEN ? AND ?`
    this.conditions.push(condition)
    this.parameters.push(min, max)
    return this
  }

  whereNull(field: string): this {
    const condition = `json_extract(value, '$.${field}') IS NULL`
    this.conditions.push(condition)
    return this
  }

  whereNotNull(field: string): this {
    const condition = `json_extract(value, '$.${field}') IS NOT NULL`
    this.conditions.push(condition)
    return this
  }

  and(): this {
    if (this.conditions.length > 0) {
      this.conditions[this.conditions.length - 1] += ' AND'
    }
    return this
  }

  or(): this {
    if (this.conditions.length > 0) {
      this.conditions[this.conditions.length - 1] += ' OR'
    }
    return this
  }

  not(): this {
    if (this.conditions.length > 0) {
      this.conditions[this.conditions.length - 1] =
        'NOT (' + this.conditions[this.conditions.length - 1] + ')'
    }
    return this
  }

  orderBy(field: string, direction: SortDirection = 'asc'): this {
    this.orderClauses.push(
      `json_extract(value, '$.${field}') ${direction.toUpperCase()}`
    )
    return this
  }

  limit(count: number): this {
    this.limitClause = `LIMIT ${count}`
    return this
  }

  offset(skip: number): this {
    this.offsetClause = `OFFSET ${skip}`
    return this
  }

  select(...fields: string[]): this {
    this.selectFields = fields
    return this
  }

  async execute(): Promise<QueryResult<T>> {
    const startTime = Date.now()

    // Build WHERE clause
    let whereClause = ''
    if (this.namespace) {
      whereClause = 'WHERE namespace = ?'
      this.parameters.unshift(this.namespace)
    }

    if (this.conditions.length > 0) {
      const conditionsStr = this.conditions.join(' AND ')
      whereClause = whereClause
        ? `${whereClause} AND (${conditionsStr})`
        : `WHERE ${conditionsStr}`
    }

    // Build complete query
    const orderClause =
      this.orderClauses.length > 0
        ? `ORDER BY ${this.orderClauses.join(', ')}`
        : ''

    const sql = `
      SELECT value, metadata
      FROM storage
      ${whereClause}
      ${orderClause}
      ${this.limitClause}
      ${this.offsetClause}
    `.trim()

    // Execute query
    const stmt = this.db.prepare(sql)
    const rows = stmt.all(...this.parameters) as Array<{
      value: string
      metadata: string
    }>

    // Process results
    const data: T[] = rows.map((row) => {
      let value = JSON.parse(row.value)

      // Apply field selection if specified
      if (this.selectFields.length > 0) {
        const filtered: Record<string, unknown> = {}
        for (const field of this.selectFields) {
          if (field in value) {
            filtered[field] = value[field]
          }
        }
        value = filtered
      }

      return value as T
    })

    return {
      data,
      metadata: {
        executionTime: Date.now() - startTime,
        fromCache: false,
        itemsExamined: rows.length,
        itemsReturned: data.length,
      },
    }
  }

  async count(): Promise<number> {
    let whereClause = ''
    const params = [...this.parameters]

    if (this.namespace) {
      whereClause = 'WHERE namespace = ?'
      params.unshift(this.namespace)
    }

    if (this.conditions.length > 0) {
      const conditionsStr = this.conditions.join(' AND ')
      whereClause = whereClause
        ? `${whereClause} AND (${conditionsStr})`
        : `WHERE ${conditionsStr}`
    }

    const sql = `SELECT COUNT(*) as count FROM storage ${whereClause}`
    const stmt = this.db.prepare(sql)
    const row = stmt.get(...params) as { count: number } | undefined

    return row?.count || 0
  }

  async first(): Promise<T | null> {
    this.limit(1)
    const result = await this.execute()
    return result.data[0] || null
  }

  async exists(): Promise<boolean> {
    const count = await this.count()
    return count > 0
  }
}
