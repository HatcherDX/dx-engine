/**
 * @fileoverview Universal query builder interface for storage adapters
 *
 * @description
 * Provides a fluent, type-safe query builder interface that can be implemented
 * by different storage adapters. Supports complex querying, filtering, sorting,
 * and aggregation operations while maintaining adapter independence.
 *
 * @example
 * ```typescript
 * const users = await storage.query()
 *   .collection('users')
 *   .where('age', '>', 18)
 *   .where('status', '=', 'active')
 *   .orderBy('createdAt', 'desc')
 *   .limit(10)
 *   .execute()
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import type { IStorageAdapter } from '../types/storage'
import type {
  QueryBuilder,
  QueryCondition,
  QueryOperator,
  SortDirection,
  AggregateFunction,
  QueryResult,
} from '../types/query'
import { CacheLayer } from '../performance/CacheLayer'

/**
 * Universal query builder implementation
 *
 * @remarks
 * Provides a fluent interface for building complex queries that can be
 * executed on different storage adapters. The query builder translates
 * high-level operations into adapter-specific commands (SQL, document queries, etc.).
 *
 * @example
 * ```typescript
 * // Complex query with joins and aggregation
 * const result = await queryBuilder
 *   .collection('orders')
 *   .join('users', 'orders.userId', '=', 'users.id')
 *   .where('orders.status', '=', 'completed')
 *   .where('orders.total', '>', 100)
 *   .groupBy('users.country')
 *   .having('count(*)', '>', 5)
 *   .orderBy('total_amount', 'desc')
 *   .limit(20)
 *   .execute()
 * ```
 *
 * @public
 */
export class UniversalQueryBuilder implements QueryBuilder {
  private _collection?: string
  private _originalCollection?: string
  private _conditions: QueryCondition[] = []
  private _joins: Array<{
    collection: string
    leftField: string
    operator: QueryOperator
    rightField: string
    type: 'inner' | 'left' | 'right'
  }> = []
  private _orderBy: Array<{ field: string; direction: SortDirection }> = []
  private _groupBy: string[] = []
  private _having: QueryCondition[] = []
  private _limitValue?: number
  private _offsetValue?: number
  private _selectFields: string[] = []
  private _aggregates: Array<{
    function: AggregateFunction
    field: string
    alias?: string
  }> = []
  private _nextLogicalOperator?: 'AND' | 'OR'
  private _negateNext: boolean = false
  private _cacheEnabled: boolean = false
  private _suggestedIndexes?: string[]
  private _cache: CacheLayer<QueryResult<unknown>>

  /**
   * Create query builder instance
   *
   * @param adapter - Storage adapter to execute queries on
   * @param collection - Optional collection name to query
   */
  constructor(
    private adapter: IStorageAdapter,
    collection?: string
  ) {
    if (collection) {
      this._collection = collection
      this._originalCollection = collection
    }

    // Initialize cache with 5 minute TTL and 100 item limit
    this._cache = new CacheLayer<QueryResult<unknown>>({
      maxSize: 100,
      ttl: 300000, // 5 minutes
      enableStats: true,
    })
  }

  /**
   * Set the collection/table to query
   *
   * @param name - Collection or table name
   * @returns Query builder instance for chaining
   *
   * @example
   * ```typescript
   * queryBuilder.collection('users')
   * ```
   */
  collection(name: string): this {
    this._collection = name
    return this
  }

  /**
   * Add WHERE condition
   *
   * @param field - Field name to filter on
   * @param operator - Comparison operator
   * @param value - Value to compare against
   * @returns Query builder instance for chaining
   *
   * @example
   * ```typescript
   * queryBuilder
   *   .where('age', '>', 18)
   *   .where('status', '=', 'active')
   *   .where('name', 'like', '%john%')
   * ```
   */
  where(
    field: string,
    operator: QueryOperator,
    value: string | number | boolean | null
  ): this {
    let finalOperator = operator
    const finalValue = value

    // Handle negation
    if (this._negateNext) {
      switch (operator) {
        case '=':
          finalOperator = '!='
          break
        case '!=':
          finalOperator = '='
          break
        case '>':
          finalOperator = '<='
          break
        case '>=':
          finalOperator = '<'
          break
        case '<':
          finalOperator = '>='
          break
        case '<=':
          finalOperator = '>'
          break
        default:
          // For other operators, we'll handle negation in evaluation
          break
      }
      this._negateNext = false
    }

    this._conditions.push({
      field,
      operator: finalOperator,
      value: finalValue,
      logicalOperator: this._nextLogicalOperator || 'AND',
    })

    delete this._nextLogicalOperator
    return this
  }

  /**
   * Add WHERE IN condition
   *
   * @param field - Field name to filter on
   * @param values - Array of values to match
   * @returns Query builder instance for chaining
   *
   * @example
   * ```typescript
   * queryBuilder.whereIn('status', ['active', 'pending', 'review'])
   * ```
   */
  whereIn(
    field: string,
    values: Array<string | number | boolean | null>
  ): this {
    this._conditions.push({
      field,
      operator: 'in',
      value: values,
      logicalOperator: this._nextLogicalOperator || 'AND',
    })
    delete this._nextLogicalOperator
    return this
  }

  /**
   * Add WHERE BETWEEN condition
   *
   * @param field - Field name to filter on
   * @param min - Minimum value
   * @param max - Maximum value
   * @returns Query builder instance for chaining
   *
   * @example
   * ```typescript
   * queryBuilder.whereBetween('createdAt', startDate, endDate)
   * ```
   */
  whereBetween(
    field: string,
    min: string | number,
    max: string | number
  ): this {
    this._conditions.push({
      field,
      operator: 'between',
      value: [min, max],
      logicalOperator: this._nextLogicalOperator || 'AND',
    })
    delete this._nextLogicalOperator
    return this
  }

  /**
   * Add JSON field condition
   *
   * @param path - JSON path (e.g., 'metadata.user.name')
   * @param operator - Comparison operator
   * @param value - Value to compare against
   * @returns Query builder instance for chaining
   *
   * @example
   * ```typescript
   * queryBuilder.whereJson('metadata.preferences.theme', '=', 'dark')
   * ```
   */
  whereJson(
    path: string,
    operator: QueryOperator,
    value: string | number | boolean | null
  ): this {
    this._conditions.push({
      field: `json:${path}`,
      operator,
      value,
      logicalOperator: this._nextLogicalOperator || 'AND',
    })
    delete this._nextLogicalOperator
    return this
  }

  /**
   * Add ORDER BY clause
   *
   * @param field - Field name to sort by
   * @param direction - Sort direction
   * @returns Query builder instance for chaining
   *
   * @example
   * ```typescript
   * queryBuilder
   *   .orderBy('createdAt', 'desc')
   *   .orderBy('name', 'asc')
   * ```
   */
  orderBy(field: string, direction: SortDirection = 'asc'): this {
    this._orderBy.push({ field, direction })
    return this
  }

  /**
   * Add GROUP BY clause
   *
   * @param field - Field name to group by
   * @returns Query builder instance for chaining
   *
   * @example
   * ```typescript
   * queryBuilder.groupBy('status').aggregate('count', '*', 'total')
   * ```
   */
  groupBy(field: string): this {
    this._groupBy.push(field)
    return this
  }

  /**
   * Add HAVING condition (for grouped results)
   *
   * @param field - Field name or aggregate function
   * @param operator - Comparison operator
   * @param value - Value to compare against
   * @returns Query builder instance for chaining
   *
   * @example
   * ```typescript
   * queryBuilder
   *   .groupBy('status')
   *   .having('count(*)', '>', 5)
   * ```
   */
  having(
    field: string,
    operator: QueryOperator,
    value: string | number | boolean | null
  ): this {
    this._having.push({
      field,
      operator,
      value,
      logicalOperator: 'AND',
    })
    return this
  }

  /**
   * Add JOIN clause
   *
   * @param collection - Collection to join with
   * @param leftField - Field from main collection
   * @param operator - Join operator
   * @param rightField - Field from joined collection
   * @param joinType - Type of join
   * @returns Query builder instance for chaining
   *
   * @example
   * ```typescript
   * queryBuilder
   *   .collection('orders')
   *   .join('users', 'orders.userId', '=', 'users.id')
   * ```
   */
  join(
    collection: string,
    leftField: string,
    operator: QueryOperator,
    rightField: string,
    joinType: 'inner' | 'left' | 'right' = 'inner'
  ): this {
    this._joins.push({
      collection,
      leftField,
      operator,
      rightField,
      type: joinType,
    })
    return this
  }

  /**
   * Set LIMIT clause
   *
   * @param count - Maximum number of results to return
   * @returns Query builder instance for chaining
   *
   * @example
   * ```typescript
   * queryBuilder.limit(10) // Get first 10 results
   * ```
   */
  limit(count: number): this {
    this._limitValue = count
    return this
  }

  /**
   * Set OFFSET clause
   *
   * @param count - Number of results to skip
   * @returns Query builder instance for chaining
   *
   * @example
   * ```typescript
   * queryBuilder.offset(20).limit(10) // Skip 20, take 10 (pagination)
   * ```
   */
  offset(count: number): this {
    this._offsetValue = count
    return this
  }

  /**
   * Select specific fields
   *
   * @param fields - Field names to select (can be multiple arguments or array)
   * @returns Query builder instance for chaining
   *
   * @example
   * ```typescript
   * queryBuilder.select('id', 'name', 'email')
   * // or
   * queryBuilder.select(['id', 'name', 'email'])
   * ```
   */
  select(...fields: string[]): this {
    // If first argument is an array, use it directly
    if (fields.length === 1 && Array.isArray(fields[0])) {
      this._selectFields = fields[0]
    } else {
      this._selectFields = fields
    }
    return this
  }

  /**
   * Add aggregate function
   *
   * @param func - Aggregate function to apply
   * @param field - Field to aggregate on
   * @param alias - Optional alias for the result
   * @returns Query builder instance for chaining
   *
   * @example
   * ```typescript
   * queryBuilder
   *   .aggregate('count', '*', 'total_count')
   *   .aggregate('avg', 'price', 'average_price')
   * ```
   */
  aggregate(func: AggregateFunction, field: string, alias?: string): this {
    const aggregate: {
      function: AggregateFunction
      field: string
      alias?: string
    } = {
      function: func,
      field,
    }
    if (alias !== undefined) {
      aggregate.alias = alias
    }
    this._aggregates.push(aggregate)
    return this
  }

  /**
   * Execute the query and return results
   *
   * @returns Promise that resolves to query results
   *
   * @throws Error when query execution fails
   *
   * @example
   * ```typescript
   * const results = await queryBuilder
   *   .collection('users')
   *   .where('active', '=', true)
   *   .execute()
   *
   * console.log(`Found ${results.data.length} active users`)
   * ```
   */
  async execute<T>(): Promise<QueryResult<T>> {
    if (!this._collection) {
      throw new Error('Collection must be specified before executing query')
    }

    // Build query object
    const query: Record<string, unknown> = {
      collection: this._collection,
      conditions: this._conditions,
      joins: this._joins,
      aggregates: this._aggregates,
    }

    // Only add optional properties if they have values
    if (this._orderBy.length > 0) {
      query.orderBy = this._orderBy
    }
    if (this._groupBy.length > 0) {
      query.groupBy = this._groupBy
    }
    if (this._having.length > 0) {
      query.having = this._having
    }
    if (this._limitValue !== undefined) {
      query.limit = this._limitValue
    }
    if (this._offsetValue !== undefined) {
      query.offset = this._offsetValue
    }
    if (this._selectFields.length > 0) {
      query.select = this._selectFields
    }

    // Check cache if enabled
    if (this._cacheEnabled) {
      const cacheKey = this.generateCacheKey(query)
      const cachedResult = this._cache.get(cacheKey)
      if (cachedResult) {
        return {
          ...cachedResult,
          metadata: {
            ...cachedResult.metadata,
            fromCache: true,
          },
        } as QueryResult<T>
      }
    }

    // Create suggested indexes if adapter supports it
    if (this._suggestedIndexes && this._suggestedIndexes.length > 0) {
      for (const field of this._suggestedIndexes) {
        if (
          'createIndex' in this.adapter &&
          typeof this.adapter.createIndex === 'function'
        ) {
          await (
            this.adapter as { createIndex: (field: string) => Promise<void> }
          ).createIndex(field)
        }
      }
    }

    // Execute query through adapter
    const startTime = performance.now()

    try {
      // Check if adapter supports complex queries
      if (
        'executeQuery' in this.adapter &&
        typeof this.adapter.executeQuery === 'function'
      ) {
        const result = await (
          this.adapter as {
            executeQuery: (query: unknown) => Promise<QueryResult<T>>
          }
        ).executeQuery(query)

        const finalResult = {
          data: result.data || result,
          total: result.total || (result.data ? result.data.length : 0),
          metadata: result.metadata || {
            executionTime: performance.now() - startTime,
            fromCache: false,
            itemsExamined: (result.data || result).length,
            itemsReturned: (result.data || result).length,
          },
        }

        // Cache the result if caching is enabled
        if (this._cacheEnabled) {
          const cacheKey = this.generateCacheKey(query)
          this._cache.set(cacheKey, finalResult)
        }

        return finalResult
      }

      // Fallback: Simple filtering for basic adapters
      const result = await this.executeSimpleQuery<T>(query, startTime)

      // Cache the result if caching is enabled
      if (this._cacheEnabled) {
        const cacheKey = this.generateCacheKey(query)
        this._cache.set(cacheKey, result)
      }

      return result
    } catch (error) {
      throw new Error(
        `Query execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Get the query plan without executing (for debugging)
   *
   * @returns Query execution plan
   */
  explain(): {
    collection: string
    conditions: QueryCondition[]
    estimatedCost: number
    estimatedComplexity: 'low' | 'medium' | 'high'
    supportsIndexes: boolean
    recommendedIndexes: string[]
    suggestedIndexes: string[]
  } {
    const complexity = this.estimateComplexity()
    const indexes = this.recommendIndexes()
    const complexityAnalysis = this.getComplexity()

    return {
      collection: this._collection || '',
      conditions: this._conditions,
      estimatedCost: complexityAnalysis.score,
      estimatedComplexity: complexity,
      supportsIndexes: this.adapterSupportsIndexes(),
      recommendedIndexes: indexes,
      suggestedIndexes: this._suggestedIndexes || [],
    }
  }

  /**
   * Simple query execution for basic adapters
   *
   * @param query - Built query object
   * @returns Promise that resolves to query results
   */
  private async executeSimpleQuery<T>(
    query: Record<string, unknown>,
    startTime: number
  ): Promise<QueryResult<T>> {
    // Get all items from collection
    const allKeys = await this.adapter.list(`${query.collection}:`)
    const allItems = await this.adapter.getMany<T>(allKeys)

    // Apply filtering
    let filteredItems = Array.from(allItems.values()).filter((item) => {
      return this.evaluateConditions(item, query.conditions as QueryCondition[])
    })

    // Apply field selection
    if (
      query.select &&
      Array.isArray(query.select) &&
      query.select.length > 0
    ) {
      filteredItems = filteredItems.map((item) => {
        const selectedItem: Record<string, unknown> = {}
        for (const field of query.select as string[]) {
          if (typeof field === 'string' && item && typeof item === 'object') {
            selectedItem[field] = this.getFieldValue(
              item as Record<string, unknown>,
              field
            )
          }
        }
        return selectedItem as T
      })
    }

    // Apply sorting
    if (
      query.orderBy &&
      Array.isArray(query.orderBy) &&
      query.orderBy.length > 0
    ) {
      filteredItems.sort((a, b) => {
        for (const sort of query.orderBy as Array<{
          field: string
          direction?: 'asc' | 'desc'
        }>) {
          const aVal = this.getFieldValue(a, sort.field)
          const bVal = this.getFieldValue(b, sort.field)

          let comparison = 0
          if (this.compareUnknownValues(aVal, bVal) < 0) comparison = -1
          else if (this.compareUnknownValues(aVal, bVal) > 0) comparison = 1

          if (comparison !== 0) {
            return sort.direction === 'desc' ? -comparison : comparison
          }
        }
        return 0
      })
    }

    // Apply pagination
    const total = filteredItems.length
    if (query.offset && typeof query.offset === 'number') {
      filteredItems = filteredItems.slice(query.offset)
    }
    if (query.limit && typeof query.limit === 'number') {
      filteredItems = filteredItems.slice(0, query.limit)
    }

    return {
      data: filteredItems,
      total,
      metadata: {
        executionTime: performance.now() - startTime,
        fromCache: false,
        itemsExamined: allItems.size,
        itemsReturned: filteredItems.length,
        queryComplexity: this.getComplexity().level,
      },
    }
  }

  /**
   * Evaluate all conditions with proper AND/OR logic
   *
   * @param item - Data item to evaluate
   * @param conditions - Array of query conditions
   * @returns True if all conditions match according to their logical operators
   */
  private evaluateConditions(
    item: unknown,
    conditions: QueryCondition[]
  ): boolean {
    if (conditions.length === 0) return true

    let result = this.evaluateCondition(item, conditions[0])

    for (let i = 1; i < conditions.length; i++) {
      const condition = conditions[i]
      const conditionResult = this.evaluateCondition(item, condition)

      if (condition.logicalOperator === 'OR') {
        result = result || conditionResult
      } else {
        // Default to AND
        result = result && conditionResult
      }
    }

    return result
  }

  /**
   * Evaluate query condition against data item
   *
   * @param item - Data item to evaluate
   * @param condition - Query condition to check
   * @returns True if condition matches
   */
  private evaluateCondition(item: unknown, condition: QueryCondition): boolean {
    const { field, operator, value } = condition

    // Handle JSON path queries
    if (field.startsWith('json:')) {
      const jsonPath = field.slice(5)
      const itemValue = this.getJsonFieldValue(item, jsonPath)
      return this.compareValues(itemValue, operator, value)
    }

    const itemValue = this.getFieldValue(item, field)
    return this.compareValues(itemValue, operator, value)
  }

  /**
   * Compare values using specified operator
   *
   * @param itemValue - Value from data item
   * @param operator - Comparison operator
   * @param queryValue - Value from query condition
   * @returns True if comparison matches
   */
  private compareValues(
    itemValue: unknown,
    operator: QueryOperator,
    queryValue: unknown
  ): boolean {
    switch (operator) {
      case '=':
        return itemValue === queryValue
      case '!=':
        return itemValue !== queryValue
      case '>':
        return (
          typeof itemValue === 'number' &&
          typeof queryValue === 'number' &&
          itemValue > queryValue
        )
      case '>=':
        return (
          typeof itemValue === 'number' &&
          typeof queryValue === 'number' &&
          itemValue >= queryValue
        )
      case '<':
        return (
          typeof itemValue === 'number' &&
          typeof queryValue === 'number' &&
          itemValue < queryValue
        )
      case '<=':
        return (
          typeof itemValue === 'number' &&
          typeof queryValue === 'number' &&
          itemValue <= queryValue
        )
      case 'like':
        return String(itemValue)
          .toLowerCase()
          .includes(String(queryValue).toLowerCase())
      case 'in':
        return Array.isArray(queryValue) && queryValue.includes(itemValue)
      case 'between':
        return (
          Array.isArray(queryValue) &&
          queryValue.length >= 2 &&
          typeof itemValue === 'number' &&
          typeof queryValue[0] === 'number' &&
          typeof queryValue[1] === 'number' &&
          itemValue >= queryValue[0] &&
          itemValue <= queryValue[1]
        )
      default:
        return false
    }
  }

  /**
   * Get field value from object using dot notation
   *
   * @param obj - Object to extract value from
   * @param path - Field path (supports dot notation)
   * @returns Field value
   */
  private getFieldValue(obj: unknown, path: string): unknown {
    if (!obj || typeof obj !== 'object') return undefined
    return path.split('.').reduce((current: unknown, key: string) => {
      if (current && typeof current === 'object' && key in current) {
        return (current as Record<string, unknown>)[key]
      }
      return undefined
    }, obj)
  }

  /**
   * Get JSON field value using JSON path
   *
   * @param obj - Object containing JSON data
   * @param jsonPath - JSON path expression
   * @returns Extracted value
   */
  private getJsonFieldValue(obj: unknown, jsonPath: string): unknown {
    // For simple implementations, treat as regular dot notation
    // Advanced adapters can implement proper JSON path evaluation
    return this.getFieldValue(obj, jsonPath)
  }

  /**
   * Compare two unknown values for sorting
   *
   * @param a - First value
   * @param b - Second value
   * @returns Comparison result (-1, 0, 1)
   */
  private compareUnknownValues(a: unknown, b: unknown): number {
    // Handle null/undefined
    if (a == null && b == null) return 0
    if (a == null) return -1
    if (b == null) return 1

    // Convert to comparable types
    const aStr = String(a)
    const bStr = String(b)

    // Try numeric comparison if both look like numbers
    const aNum = Number(a)
    const bNum = Number(b)
    if (!isNaN(aNum) && !isNaN(bNum)) {
      return aNum - bNum
    }

    // Fall back to string comparison
    return aStr.localeCompare(bStr)
  }

  /**
   * Estimate query complexity for optimization
   *
   * @returns Complexity level
   */
  private estimateComplexity(): 'low' | 'medium' | 'high' {
    let score = 0

    // Conditions complexity
    score += this._conditions.length

    // Joins add significant complexity
    score += this._joins.length * 3

    // Aggregates add complexity
    score += this._aggregates.length * 2

    // Group by adds complexity
    score += this._groupBy.length * 2

    if (score <= 3) return 'low'
    if (score <= 10) return 'medium'
    return 'high'
  }

  /**
   * Recommend indexes for query optimization
   *
   * @returns Array of recommended index field names
   */
  private recommendIndexes(): string[] {
    const indexes: string[] = []

    // Recommend indexes for WHERE conditions
    for (const condition of this._conditions) {
      if (
        !condition.field.startsWith('json:') &&
        ['=', '>', '>=', '<', '<='].includes(condition.operator)
      ) {
        indexes.push(condition.field)
      }
    }

    // Recommend indexes for ORDER BY
    for (const sort of this._orderBy) {
      indexes.push(sort.field)
    }

    // Recommend indexes for JOIN fields
    for (const join of this._joins) {
      indexes.push(join.leftField, join.rightField)
    }

    return [...new Set(indexes)] // Remove duplicates
  }

  /**
   * Check if adapter supports advanced indexing
   *
   * @returns True if adapter supports indexes
   */
  private adapterSupportsIndexes(): boolean {
    return (
      'createIndex' in this.adapter &&
      typeof (
        this.adapter as { createIndex?: (field: string) => Promise<void> }
      ).createIndex === 'function'
    )
  }

  /**
   * Add WHERE IS NULL condition
   *
   * @param field - Field to check for null
   * @returns Query builder instance for chaining
   */
  whereNull(field: string): this {
    this._conditions.push({
      field,
      operator: '=',
      value: null,
      logicalOperator: 'AND',
    })
    return this
  }

  /**
   * Add WHERE IS NOT NULL condition
   *
   * @param field - Field to check for non-null
   * @returns Query builder instance for chaining
   */
  whereNotNull(field: string): this {
    this._conditions.push({
      field,
      operator: '!=',
      value: null,
      logicalOperator: 'AND',
    })
    return this
  }

  /**
   * Set logical operator to OR for next condition
   *
   * @returns Query builder instance for chaining
   */
  or(): this {
    // Mark the next condition to use OR
    this._nextLogicalOperator = 'OR'
    return this
  }

  /**
   * Set logical operator to AND for next condition
   *
   * @returns Query builder instance for chaining
   */
  and(): this {
    // Mark the next condition to use AND (default)
    this._nextLogicalOperator = 'AND'
    return this
  }

  /**
   * Negate the next condition
   *
   * @returns Query builder instance for chaining
   */
  not(): this {
    this._negateNext = true
    return this
  }

  /**
   * Count matching records
   *
   * @returns Promise that resolves to count of matching records
   */
  async count(): Promise<number> {
    const result = await this.execute<Record<string, unknown>>()
    return result.total || result.data.length
  }

  /**
   * Get first matching record
   *
   * @returns Promise that resolves to first matching record or null
   */
  async first<T = Record<string, unknown>>(): Promise<T | null> {
    const originalLimit = this._limitValue
    this._limitValue = 1

    const result = await this.execute<T>()

    // Restore original limit
    if (originalLimit !== undefined) {
      this._limitValue = originalLimit
    } else {
      delete this._limitValue
    }

    return result.data.length > 0 ? result.data[0] : null
  }

  /**
   * Check if any matching records exist
   *
   * @returns Promise that resolves to true if records exist
   */
  async exists(): Promise<boolean> {
    const count = await this.count()
    return count > 0
  }

  /**
   * Enable query result caching
   *
   * @param enabled - Whether to enable caching
   * @returns Query builder instance for chaining
   */
  cache(enabled: boolean = true): this {
    this._cacheEnabled = enabled
    return this
  }

  /**
   * Add raw WHERE condition
   *
   * @param expression - Raw SQL expression
   * @param bindings - Parameter bindings for the expression
   * @returns Query builder instance for chaining
   */
  whereRaw(expression: string, bindings: unknown[] = []): this {
    this._conditions.push({
      field: '__raw__',
      operator: 'raw',
      value: { expression, bindings },
      logicalOperator: this._nextLogicalOperator || 'AND',
    })
    delete this._nextLogicalOperator
    return this
  }

  /**
   * Suggest index for optimization
   *
   * @param field - Field to suggest index for
   * @returns Query builder instance for chaining
   */
  suggestIndex(field: string): this {
    // This is mainly for documentation/hint purposes
    this._suggestedIndexes = this._suggestedIndexes || []
    this._suggestedIndexes.push(field)
    return this
  }

  /**
   * Get query complexity analysis
   *
   * @returns Complexity analysis object
   */
  getComplexity(): {
    score: number
    level: 'low' | 'medium' | 'high'
    factors: string[]
  } {
    const factors: string[] = []
    let score = 0

    // Conditions complexity
    score += this._conditions.length
    if (this._conditions.length > 0) {
      factors.push(`${this._conditions.length} conditions`)
    }

    // Joins add significant complexity
    score += this._joins.length * 3
    if (this._joins.length > 0) {
      factors.push(`${this._joins.length} joins`)
    }

    // Aggregates add complexity
    score += this._aggregates.length * 2
    if (this._aggregates.length > 0) {
      factors.push(`${this._aggregates.length} aggregates`)
    }

    // Group by adds complexity
    score += this._groupBy.length * 2
    if (this._groupBy.length > 0) {
      factors.push(`${this._groupBy.length} group by fields`)
    }

    let level: 'low' | 'medium' | 'high' = 'low'
    if (score <= 3) level = 'low'
    else if (score <= 10) level = 'medium'
    else level = 'high'

    return { score, level, factors }
  }

  /**
   * Reset query builder to initial state
   *
   * @returns Query builder instance for chaining
   */
  reset(): this {
    if (this._originalCollection !== undefined) {
      this._collection = this._originalCollection
    } else {
      delete this._collection
    }
    this._conditions = []
    this._joins = []
    this._orderBy = []
    this._groupBy = []
    this._having = []
    delete this._limitValue
    delete this._offsetValue
    this._selectFields = []
    this._aggregates = []
    delete this._nextLogicalOperator
    this._negateNext = false
    this._cacheEnabled = false
    delete this._suggestedIndexes
    return this
  }

  /**
   * Clone query builder with current state
   *
   * @returns New query builder instance with same configuration
   */
  clone(): this {
    const cloned = new UniversalQueryBuilder(this.adapter)
    if (this._collection !== undefined) {
      cloned._collection = this._collection
    }
    if (this._originalCollection !== undefined) {
      cloned._originalCollection = this._originalCollection
    }
    cloned._conditions = [...this._conditions]
    cloned._joins = [...this._joins]
    cloned._orderBy = [...this._orderBy]
    cloned._groupBy = [...this._groupBy]
    cloned._having = [...this._having]
    if (this._limitValue !== undefined) {
      cloned._limitValue = this._limitValue
    }
    if (this._offsetValue !== undefined) {
      cloned._offsetValue = this._offsetValue
    }
    cloned._selectFields = [...this._selectFields]
    cloned._aggregates = [...this._aggregates]
    if (this._nextLogicalOperator !== undefined) {
      cloned._nextLogicalOperator = this._nextLogicalOperator
    }
    cloned._negateNext = this._negateNext
    cloned._cacheEnabled = this._cacheEnabled
    if (this._suggestedIndexes !== undefined) {
      cloned._suggestedIndexes = [...this._suggestedIndexes]
    }
    return cloned as this
  }

  /**
   * Build raw query object (useful for debugging)
   *
   * @returns Raw query representation
   */
  build(): {
    collection: string
    conditions: QueryCondition[]
    joins: Array<{ table: string; on: string }>
    orderBy: Array<{ field: string; direction: SortDirection }>
    groupBy: string[]
    having: QueryCondition[]
    limit?: number
    offset?: number
    select: string[]
    aggregates: Array<{ function: string; field: string; alias?: string }>
  } {
    const result: ReturnType<typeof this.build> = {
      collection: this._collection || '',
      conditions: this._conditions,
      joins: this._joins.map((join) => ({
        table: join.collection,
        on: `${join.leftField} ${join.operator} ${join.rightField}`,
      })),
      orderBy: this._orderBy,
      groupBy: this._groupBy,
      having: this._having,
      select: this._selectFields,
      aggregates: this._aggregates,
    }

    if (this._limitValue !== undefined) {
      result.limit = this._limitValue
    }

    if (this._offsetValue !== undefined) {
      result.offset = this._offsetValue
    }

    return result
  }

  /**
   * Generate a unique cache key for the current query
   *
   * @param query - Query object to generate key for
   * @returns Unique cache key string
   */
  private generateCacheKey(query: unknown): string {
    try {
      // Create a deterministic string from query object
      const queryString = JSON.stringify(query, null, 0)

      // Create a simple hash (for cache key uniqueness)
      let hash = 0
      for (let i = 0; i < queryString.length; i++) {
        const char = queryString.charCodeAt(i)
        hash = (hash << 5) - hash + char
        hash = hash & hash // Convert to 32-bit integer
      }

      return `query:${hash.toString(36)}`
    } catch {
      // Fallback for non-serializable queries
      return `query:${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }
  }
}

/**
 * Default export alias for QueryBuilder
 * @public
 */
export { UniversalQueryBuilder as QueryBuilder }
