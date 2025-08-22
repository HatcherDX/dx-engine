/**
 * @fileoverview Sync types and interfaces (prepared for future implementation)
 *
 * @description
 * Defines types for future cloud synchronization capabilities.
 * These interfaces are prepared but not implemented - will be used
 * when cloud sync features are added.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

/**
 * Sync status enumeration
 *
 * @public
 */
export enum SyncStatus {
  IDLE = 'idle',
  SYNCING = 'syncing',
  ERROR = 'error',
  OFFLINE = 'offline',
  PAUSED = 'paused',
}

/**
 * Sync conflict resolution strategy
 *
 * @public
 */
export enum ConflictStrategy {
  LOCAL_WINS = 'local_wins',
  REMOTE_WINS = 'remote_wins',
  MANUAL = 'manual',
  MERGE = 'merge',
  LAST_WRITE_WINS = 'last_write_wins',
}

/**
 * Sync change operation type
 *
 * @public
 */
export enum ChangeType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
}

/**
 * Sync change record
 *
 * @public
 */
export interface SyncChange {
  /**
   * Unique change identifier
   */
  id: string

  /**
   * Storage key that changed
   */
  key: string

  /**
   * Namespace of the change
   */
  namespace: string

  /**
   * Type of change operation
   */
  type: ChangeType

  /**
   * New value (null for delete)
   */
  value: unknown

  /**
   * Previous value (for conflict resolution)
   */
  previousValue?: unknown

  /**
   * Timestamp when change occurred
   */
  timestamp: number

  /**
   * Device/client that made the change
   */
  deviceId: string

  /**
   * Whether change has been synced to remote
   */
  synced: boolean

  /**
   * Retry count for failed syncs
   */
  retryCount?: number
}

/**
 * Sync conflict information
 *
 * @public
 */
export interface SyncConflict {
  /**
   * Storage key in conflict
   */
  key: string

  /**
   * Local version of data
   */
  local: unknown

  /**
   * Remote version of data
   */
  remote: unknown

  /**
   * Local timestamp
   */
  localTimestamp: number

  /**
   * Remote timestamp
   */
  remoteTimestamp: number

  /**
   * Suggested resolution strategy
   */
  suggestedStrategy: ConflictStrategy
}

/**
 * Sync result information
 *
 * @public
 */
export interface SyncResult {
  /**
   * Whether sync completed successfully
   */
  success: boolean

  /**
   * Number of changes synced to remote
   */
  uploadedChanges: number

  /**
   * Number of changes downloaded from remote
   */
  downloadedChanges: number

  /**
   * Number of conflicts encountered
   */
  conflicts: number

  /**
   * List of conflicts (if any)
   */
  conflictDetails?: SyncConflict[]

  /**
   * Sync duration in milliseconds
   */
  duration: number

  /**
   * Error message (if failed)
   */
  error?: string

  /**
   * Timestamp when sync completed
   */
  completedAt: number
}

/**
 * Sync engine interface (prepared for future implementation)
 *
 * @remarks
 * Interface for cloud synchronization engine. This is a placeholder
 * that will be implemented when cloud sync features are added.
 *
 * @public
 */
export interface ISyncEngine {
  /**
   * Start automatic sync process
   *
   * @param interval - Sync interval in milliseconds
   * @returns Promise that resolves when sync is configured
   */
  start(interval?: number): Promise<void>

  /**
   * Stop automatic sync process
   *
   * @returns Promise that resolves when sync is stopped
   */
  stop(): Promise<void>

  /**
   * Perform manual sync operation
   *
   * @param options - Sync options
   * @returns Promise that resolves to sync result
   */
  sync(options?: SyncOptions): Promise<SyncResult>

  /**
   * Resolve a conflict manually
   *
   * @param conflict - Conflict to resolve
   * @param strategy - Resolution strategy
   * @param customValue - Custom merged value (if strategy is manual)
   * @returns Promise that resolves when conflict is resolved
   */
  resolveConflict(
    conflict: SyncConflict,
    strategy: ConflictStrategy,
    customValue?: unknown
  ): Promise<void>

  /**
   * Get pending changes not yet synced
   *
   * @returns Promise that resolves to array of pending changes
   */
  getPendingChanges(): Promise<SyncChange[]>

  /**
   * Get current sync status
   *
   * @returns Current sync status
   */
  getStatus(): SyncStatus

  /**
   * Subscribe to sync status changes
   *
   * @param callback - Callback function for status updates
   * @returns Unsubscribe function
   */
  onStatusChange(callback: (status: SyncStatus) => void): () => void
}

/**
 * Sync configuration options
 *
 * @public
 */
export interface SyncOptions {
  /**
   * Force sync even if no local changes
   */
  force?: boolean

  /**
   * Sync specific namespaces only
   */
  namespaces?: string[]

  /**
   * Maximum number of changes to sync in one batch
   */
  batchSize?: number

  /**
   * Conflict resolution strategy for this sync
   */
  conflictStrategy?: ConflictStrategy

  /**
   * Timeout for sync operation in milliseconds
   */
  timeout?: number
}
