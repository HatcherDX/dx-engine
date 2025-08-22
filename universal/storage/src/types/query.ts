/**
 * @fileoverview Query builder types and interfaces
 *
 * @description
 * Defines types for complex querying capabilities. Currently prepared
 * for future implementation when advanced querying is needed.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

/**
 * Query operators for filtering
 *
 * @public
 */
export type QueryOperator =
  | '='
  | '!='
  | '<>'
  | '<'
  | '<='
  | '>'
  | '>='
  | 'like'
  | 'LIKE'
  | 'NOT LIKE'
  | 'in'
  | 'IN'
  | 'NOT IN'
  | 'IS NULL'
  | 'IS NOT NULL'
  | 'between'
  | 'BETWEEN'
  | 'NOT BETWEEN'
  | 'raw'

/**
 * Sort direction
 *
 * @public
 */
export type SortDirection = 'asc' | 'desc'

/**
 * Query filter condition
 *
 * @public
 */
export interface QueryCondition {
  /**
   * Field to filter on (supports JSON path notation for nested fields)
   */
  field: string

  /**
   * Query operator
   */
  operator: QueryOperator

  /**
   * Value(s) to compare against
   */
  value: unknown

  /**
   * Logical connector to next condition
   */
  connector?: 'AND' | 'OR'

  /**
   * Logical operator for this condition
   */
  logicalOperator?: 'AND' | 'OR'
}

/**
 * Query ordering specification
 *
 * @public
 */
export interface QueryOrder {
  /**
   * Field to sort by (supports JSON path notation)
   */
  field: string

  /**
   * Sort direction
   */
  direction: SortDirection
}

/**
 * Query filter specification
 *
 * @public
 */
export interface QueryFilter {
  /**
   * Filter conditions
   */
  conditions?: QueryCondition[]

  /**
   * Ordering specification
   */
  orderBy?: QueryOrder[]

  /**
   * Maximum number of results
   */
  limit?: number

  /**
   * Number of results to skip
   */
  offset?: number

  /**
   * Fields to include in results (projection)
   */
  select?: string[]

  /**
   * Namespace to search within
   */
  namespace?: string
}

/**
 * Query result with metadata
 *
 * @public
 */
export interface QueryResult<T> {
  /**
   * Result data
   */
  data: T[]

  /**
   * Total count (if different from data.length due to limit/offset)
   */
  total?: number

  /**
   * Query execution metadata
   */
  metadata: {
    /**
     * Execution time in milliseconds
     */
    executionTime: number

    /**
     * Whether result came from cache
     */
    fromCache: boolean

    /**
     * Number of items examined
     */
    itemsExamined: number

    /**
     * Number of items returned
     */
    itemsReturned: number

    /**
     * Query complexity level
     */
    queryComplexity?: 'low' | 'medium' | 'high'
  }
}

/**
 * Query builder interface (prepared for future implementation)
 *
 * @remarks
 * Fluent interface for building complex queries. Currently a placeholder
 * interface that will be implemented when advanced querying is needed.
 *
 * @example
 * ```typescript
 * // Future usage (when implemented)
 * const results = await storage
 *   .query<Project>()
 *   .where('status', '=', 'active')
 *   .where('size', '>', 1000000)
 *   .orderBy('updatedAt', 'desc')
 *   .limit(10)
 *   .execute()
 * ```
 *
 * @public
 */
export interface IQueryBuilder<T> {
  /**
   * Add WHERE condition
   */
  where(field: string, operator: QueryOperator, value: unknown): this

  /**
   * Add WHERE IN condition
   */
  whereIn(field: string, values: unknown[]): this

  /**
   * Add WHERE BETWEEN condition
   */
  whereBetween(field: string, min: unknown, max: unknown): this

  /**
   * Add WHERE NULL condition
   */
  whereNull(field: string): this

  /**
   * Add WHERE NOT NULL condition
   */
  whereNotNull(field: string): this

  /**
   * Add AND connector
   */
  and(): this

  /**
   * Add OR connector
   */
  or(): this

  /**
   * Add NOT modifier
   */
  not(): this

  /**
   * Add ORDER BY clause
   */
  orderBy(field: string, direction?: SortDirection): this

  /**
   * Add LIMIT clause
   */
  limit(count: number): this

  /**
   * Add OFFSET clause
   */
  offset(skip: number): this

  /**
   * Select specific fields (projection)
   */
  select(...fields: string[]): this

  /**
   * Execute query and return results
   */
  execute(): Promise<QueryResult<T>>

  /**
   * Count matching records without fetching data
   */
  count(): Promise<number>

  /**
   * Get first matching record
   */
  first(): Promise<T | null>

  /**
   * Check if any records match
   */
  exists(): Promise<boolean>
}

/**
 * Aggregate functions for query builder
 *
 * @public
 */
export type AggregateFunction =
  | 'count'
  | 'sum'
  | 'avg'
  | 'min'
  | 'max'
  | 'group_concat'

/**
 * Main QueryBuilder interface (alias for IQueryBuilder)
 *
 * @public
 */
export type QueryBuilder = IQueryBuilder<unknown>
