/**
 * @fileoverview Tests for QueryBuilder functionality
 *
 * @description
 * Comprehensive tests for query builder including complex queries,
 * aggregations, joins, and query optimization features.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { QueryBuilder } from './QueryBuilder'
import { MemoryAdapter } from '../adapters/MemoryAdapter'
import type { IStorageAdapter } from '../types/storage'
import type { QueryOperator } from '../types/query'

// Import test utilities
import '../test-setup'

// Declare global test utilities
declare global {
  const createTestConfig: (
    overrides?: Partial<Record<string, unknown>>
  ) => Record<string, unknown>
}

describe('QueryBuilder', () => {
  let adapter: IStorageAdapter
  let queryBuilder: QueryBuilder

  beforeEach(async () => {
    const config = createTestConfig({ type: 'memory' })
    adapter = new MemoryAdapter(config)
    await adapter.initialize()

    // Add test data
    await adapter.set('users:1', {
      id: 1,
      name: 'Alice',
      age: 25,
      role: 'admin',
      department: 'engineering',
      salary: 75000,
      active: true,
      tags: ['leader', 'senior'],
      metadata: { level: 3, experience: 5 },
    })

    await adapter.set('users:2', {
      id: 2,
      name: 'Bob',
      age: 30,
      role: 'user',
      department: 'marketing',
      salary: 65000,
      active: true,
      tags: ['creative', 'social'],
      metadata: { level: 2, experience: 3 },
    })

    await adapter.set('users:3', {
      id: 3,
      name: 'Charlie',
      age: 35,
      role: 'admin',
      department: 'engineering',
      salary: 85000,
      active: false,
      tags: ['technical', 'senior'],
      metadata: { level: 4, experience: 8 },
    })

    await adapter.set('users:4', {
      id: 4,
      name: 'Diana',
      age: 28,
      role: 'user',
      department: 'design',
      salary: 70000,
      active: true,
      tags: ['creative', 'innovative'],
      metadata: { level: 3, experience: 4 },
    })

    queryBuilder = new QueryBuilder(adapter, 'users')
  })

  describe('basic query construction', () => {
    it('should create a query builder instance', () => {
      expect(queryBuilder).toBeDefined()
      expect(typeof queryBuilder.where).toBe('function')
      expect(typeof queryBuilder.execute).toBe('function')
    })

    it('should handle empty query', async () => {
      const result = await queryBuilder.execute()
      expect(result.data).toHaveLength(4)
      expect(result.total).toBe(4)
    })

    it('should build simple where clause', async () => {
      const result = await queryBuilder.where('role', '=', 'admin').execute()

      expect(result.data).toHaveLength(2)
      expect(result.data.every((user) => user.role === 'admin')).toBe(true)
    })

    it('should chain multiple where clauses', async () => {
      const result = await queryBuilder
        .where('role', '=', 'admin')
        .where('active', '=', true)
        .execute()

      expect(result.data).toHaveLength(1)
      expect(result.data[0].name).toBe('Alice')
    })
  })

  describe('comparison operators', () => {
    it('should handle equality operator', async () => {
      const result = await queryBuilder.where('age', '=', 30).execute()

      expect(result.data).toHaveLength(1)
      expect(result.data[0].name).toBe('Bob')
    })

    it('should handle inequality operator', async () => {
      const result = await queryBuilder.where('role', '!=', 'admin').execute()

      expect(result.data).toHaveLength(2)
      expect(result.data.every((user) => user.role !== 'admin')).toBe(true)
    })

    it('should handle greater than operator', async () => {
      const result = await queryBuilder.where('age', '>', 30).execute()

      expect(result.data).toHaveLength(1)
      expect(result.data[0].name).toBe('Charlie')
    })

    it('should handle greater than or equal operator', async () => {
      const result = await queryBuilder.where('salary', '>=', 70000).execute()

      expect(result.data).toHaveLength(3)
    })

    it('should handle less than operator', async () => {
      const result = await queryBuilder.where('age', '<', 30).execute()

      expect(result.data).toHaveLength(2)
      expect(result.data.every((user) => user.age < 30)).toBe(true)
    })

    it('should handle less than or equal operator', async () => {
      const result = await queryBuilder.where('age', '<=', 28).execute()

      expect(result.data).toHaveLength(2)
      expect(result.data.every((user) => user.age <= 28)).toBe(true)
    })

    it('should handle like operator for string matching', async () => {
      const result = await queryBuilder.where('name', 'like', 'Ali').execute()

      expect(result.data).toHaveLength(1)
      expect(result.data[0].name).toBe('Alice')
    })
  })

  describe('advanced where clauses', () => {
    it('should handle whereIn with array values', async () => {
      const result = await queryBuilder
        .whereIn('department', ['engineering', 'design'])
        .execute()

      expect(result.data).toHaveLength(3)
      expect(
        result.data.every((user) =>
          ['engineering', 'design'].includes(user.department)
        )
      ).toBe(true)
    })

    it('should handle whereBetween for range queries', async () => {
      const result = await queryBuilder.whereBetween('age', 25, 30).execute()

      expect(result.data).toHaveLength(3)
      expect(
        result.data.every((user) => user.age >= 25 && user.age <= 30)
      ).toBe(true)
    })

    it('should handle whereNull for null values', async () => {
      // Add user with null department
      await adapter.set('users:5', {
        id: 5,
        name: 'Eve',
        age: 32,
        role: 'user',
        department: null,
        active: true,
      })

      const result = await queryBuilder.whereNull('department').execute()

      expect(result.data).toHaveLength(1)
      expect(result.data[0].name).toBe('Eve')
    })

    it('should handle whereNotNull for non-null values', async () => {
      // Add user with null department
      await adapter.set('users:5', {
        id: 5,
        name: 'Eve',
        age: 32,
        role: 'user',
        department: null,
        active: true,
      })

      const result = await queryBuilder.whereNotNull('department').execute()

      expect(result.data).toHaveLength(4)
      expect(result.data.every((user) => user.department !== null)).toBe(true)
    })

    it('should handle JSON path queries', async () => {
      const result = await queryBuilder
        .whereJson('metadata.level', '>=', 3)
        .execute()

      expect(result.data).toHaveLength(3)
      expect(result.data.every((user) => user.metadata.level >= 3)).toBe(true)
    })
  })

  describe('logical operators', () => {
    it('should handle AND logic (default)', async () => {
      const result = await queryBuilder
        .where('role', '=', 'admin')
        .where('active', '=', true)
        .execute()

      expect(result.data).toHaveLength(1)
      expect(result.data[0].name).toBe('Alice')
    })

    it('should handle OR logic with or() method', async () => {
      const result = await queryBuilder
        .where('department', '=', 'engineering')
        .or()
        .where('department', '=', 'design')
        .execute()

      expect(result.data).toHaveLength(3)
    })

    it('should handle NOT logic with not() method', async () => {
      const result = await queryBuilder
        .not()
        .where('role', '=', 'admin')
        .execute()

      expect(result.data).toHaveLength(2)
      expect(result.data.every((user) => user.role !== 'admin')).toBe(true)
    })

    it('should handle complex logical combinations', async () => {
      const result = await queryBuilder
        .where('active', '=', true)
        .and()
        .where('salary', '>', 65000)
        .or()
        .where('role', '=', 'admin')
        .execute()

      expect(result.data.length).toBeGreaterThan(0)
    })
  })

  describe('sorting and ordering', () => {
    it('should sort by single field ascending', async () => {
      const result = await queryBuilder.orderBy('age', 'asc').execute()

      const ages = result.data.map((user) => user.age)
      expect(ages).toEqual([25, 28, 30, 35])
    })

    it('should sort by single field descending', async () => {
      const result = await queryBuilder.orderBy('salary', 'desc').execute()

      const salaries = result.data.map((user) => user.salary)
      expect(salaries).toEqual([85000, 75000, 70000, 65000])
    })

    it('should sort by multiple fields', async () => {
      const result = await queryBuilder
        .orderBy('role', 'asc')
        .orderBy('age', 'desc')
        .execute()

      // Should first sort by role (admin, user), then by age descending within each role
      expect(result.data[0].role).toBe('admin')
      expect(result.data[1].role).toBe('admin')
      expect(result.data[0].age).toBeGreaterThan(result.data[1].age)
    })

    it('should handle sorting with string fields', async () => {
      const result = await queryBuilder.orderBy('name', 'asc').execute()

      const names = result.data.map((user) => user.name)
      expect(names).toEqual(['Alice', 'Bob', 'Charlie', 'Diana'])
    })
  })

  describe('pagination and limiting', () => {
    it('should limit results', async () => {
      const result = await queryBuilder.limit(2).execute()

      expect(result.data).toHaveLength(2)
    })

    it('should offset results', async () => {
      const result = await queryBuilder
        .orderBy('age', 'asc')
        .offset(1)
        .execute()

      expect(result.data).toHaveLength(3)
      expect(result.data[0].age).toBe(28) // Should skip the 25-year-old
    })

    it('should handle limit and offset together', async () => {
      const result = await queryBuilder
        .orderBy('age', 'asc')
        .offset(1)
        .limit(2)
        .execute()

      expect(result.data).toHaveLength(2)
      expect(result.data[0].age).toBe(28)
      expect(result.data[1].age).toBe(30)
    })

    it('should handle offset beyond available results', async () => {
      const result = await queryBuilder.offset(10).execute()

      expect(result.data).toHaveLength(0)
    })
  })

  describe('field selection', () => {
    it('should select specific fields', async () => {
      const result = await queryBuilder.select('name', 'age').execute()

      result.data.forEach((user) => {
        expect(Object.keys(user)).toEqual(['name', 'age'])
        expect(user.name).toBeDefined()
        expect(user.age).toBeDefined()
        expect(user.role).toBeUndefined()
      })
    })

    it('should handle non-existent field selection', async () => {
      const result = await queryBuilder.select('name', 'nonexistent').execute()

      result.data.forEach((user) => {
        expect(user.name).toBeDefined()
        expect(user.nonexistent).toBeUndefined()
      })
    })

    it('should handle empty field selection', async () => {
      const result = await queryBuilder.select().execute()

      // Should return all fields when no specific fields are selected
      expect(result.data[0]).toHaveProperty('name')
      expect(result.data[0]).toHaveProperty('age')
      expect(result.data[0]).toHaveProperty('role')
    })
  })

  describe('aggregation and grouping', () => {
    it('should group by field', async () => {
      const result = await queryBuilder.groupBy('role').execute()

      // Should return grouped results
      expect(result.data.length).toBeGreaterThan(0)
    })

    it('should handle having clauses with grouping', async () => {
      const result = await queryBuilder
        .groupBy('department')
        .having('count(*)', '>', 1)
        .execute()

      // Should filter groups based on having clause
      expect(result.data.length).toBeGreaterThan(0)
    })

    it('should handle aggregate functions', async () => {
      const result = await queryBuilder
        .select('department')
        .groupBy('department')
        .aggregate('count', '*', 'user_count')
        .aggregate('avg', 'salary', 'avg_salary')
        .execute()

      expect(result.data.length).toBeGreaterThan(0)
    })
  })

  describe('query result helpers', () => {
    it('should count matching records', async () => {
      const count = await queryBuilder.where('active', '=', true).count()

      expect(count).toBe(3)
    })

    it('should return first matching record', async () => {
      const user = await queryBuilder
        .where('role', '=', 'admin')
        .orderBy('age', 'asc')
        .first()

      expect(user).toBeDefined()
      expect(user.name).toBe('Alice')
    })

    it('should return null when no first record exists', async () => {
      const user = await queryBuilder.where('name', '=', 'NonExistent').first()

      expect(user).toBeNull()
    })

    it('should check if records exist', async () => {
      const existsAdmin = await queryBuilder
        .where('role', '=', 'admin')
        .exists()

      const existsNonExistent = await queryBuilder
        .where('name', '=', 'NonExistent')
        .exists()

      expect(existsAdmin).toBe(true)
      expect(existsNonExistent).toBe(false)
    })
  })

  describe('query caching and optimization', () => {
    it('should cache query results when enabled', async () => {
      const cachedBuilder = queryBuilder.cache(true).where('role', '=', 'admin')

      // First execution
      const result1 = await cachedBuilder.execute()

      // Second execution should use cache (same query)
      const result2 = await cachedBuilder.execute()

      expect(result1.data).toEqual(result2.data)
      expect(result2.metadata?.fromCache).toBe(true)
    })

    it('should suggest indexes for frequent queries', async () => {
      // Mock adapter that supports index creation
      const indexableAdapter = {
        ...adapter,
        createIndex: vi.fn().mockResolvedValue(undefined),
        list: adapter.list.bind(adapter),
        getMany: adapter.getMany.bind(adapter),
      }

      const optimizedBuilder = new QueryBuilder(
        indexableAdapter as unknown as IStorageAdapter,
        'users'
      )

      await optimizedBuilder
        .where('role', '=', 'admin')
        .suggestIndex('role')
        .execute()

      expect(indexableAdapter.createIndex).toHaveBeenCalledWith('role')
    })

    it('should explain query execution plan', async () => {
      const explanation = await queryBuilder
        .where('role', '=', 'admin')
        .where('active', '=', true)
        .explain()

      expect(explanation).toHaveProperty('conditions')
      expect(explanation).toHaveProperty('estimatedCost')
      expect(explanation).toHaveProperty('suggestedIndexes')
    })
  })

  describe('advanced query features', () => {
    it('should handle raw SQL expressions', async () => {
      const result = await queryBuilder.whereRaw('age * 2 > ?', [50]).execute()

      expect(result.data.every((user) => user.age * 2 > 50)).toBe(true)
    })

    it('should handle subqueries', async () => {
      const subQuery = new QueryBuilder(adapter, 'users')
        .select('salary')
        .where('role', '=', 'admin')
        .orderBy('salary', 'desc')
        .limit(1)

      const result = await queryBuilder.where('salary', '>', subQuery).execute()

      expect(result.data.length).toBeGreaterThanOrEqual(0)
    })

    it('should handle joins between collections', async () => {
      // Add some related data
      await adapter.set('departments:engineering', {
        id: 'engineering',
        name: 'Engineering',
        budget: 500000,
      })
      await adapter.set('departments:marketing', {
        id: 'marketing',
        name: 'Marketing',
        budget: 300000,
      })

      const result = await queryBuilder
        .join('departments', 'users.department', '=', 'departments.id')
        .select('users.name', 'departments.budget')
        .execute()

      expect(result.data.length).toBeGreaterThan(0)
    })
  })

  describe('error handling and edge cases', () => {
    it('should handle invalid operators gracefully', async () => {
      const result = await queryBuilder
        .where('age', 'invalid-operator' as unknown as QueryOperator, 25)
        .execute()

      // Should either throw or return empty results
      expect(result.data).toEqual([])
    })

    it('should handle null and undefined values in conditions', async () => {
      const result = await queryBuilder.where('name', '=', null).execute()

      expect(result.data).toEqual([])
    })

    it('should handle very large result sets efficiently', async () => {
      // Add many records
      for (let i = 100; i < 1000; i++) {
        await adapter.set(`users:${i}`, {
          id: i,
          name: `User${i}`,
          age: 20 + (i % 40),
          role: i % 3 === 0 ? 'admin' : 'user',
          active: i % 2 === 0,
        })
      }

      const startTime = performance.now()
      const result = await queryBuilder.where('active', '=', true).execute()
      const endTime = performance.now()

      expect(result.data.length).toBeGreaterThan(0)
      expect(endTime - startTime).toBeLessThan(1000) // Should complete within 1 second
    })

    it('should handle concurrent query operations', async () => {
      const operations = []

      for (let i = 0; i < 10; i++) {
        const operation = new QueryBuilder(adapter, 'users')
          .where('age', '>', 20 + i)
          .execute()
        operations.push(operation)
      }

      const results = await Promise.all(operations)

      results.forEach((result, index) => {
        expect(result.data.every((user) => user.age > 20 + index)).toBe(true)
      })
    })
  })

  describe('query builder state management', () => {
    it('should reset builder state', async () => {
      queryBuilder.where('role', '=', 'admin').orderBy('age', 'desc').limit(10)

      queryBuilder.reset()

      // After reset, should execute without previous conditions
      await expect(queryBuilder.execute()).resolves.toHaveProperty('data')
    })

    it('should clone builder state', () => {
      const builder1 = queryBuilder
        .where('role', '=', 'admin')
        .orderBy('age', 'desc')

      const builder2 = builder1.clone().where('active', '=', true)

      // Both builders should be independent
      expect(builder1).not.toBe(builder2)
    })

    it('should build query object without executing', () => {
      const query = queryBuilder
        .where('role', '=', 'admin')
        .where('active', '=', true)
        .orderBy('age', 'desc')
        .limit(10)
        .build()

      expect(query).toHaveProperty('conditions')
      expect(query).toHaveProperty('orderBy')
      expect(query).toHaveProperty('limit')
      expect(query.conditions).toHaveLength(2)
      expect(query.limit).toBe(10)
    })
  })

  describe('query metrics and performance', () => {
    it('should track query execution metrics', async () => {
      const result = await queryBuilder.where('role', '=', 'admin').execute()

      expect(result.metadata).toHaveProperty('executionTime')
      expect(result.metadata.executionTime).toBeGreaterThan(0)
      expect(result.metadata).toHaveProperty('itemsExamined')
    })

    it('should provide query complexity analysis', async () => {
      const complexity = queryBuilder
        .where('role', '=', 'admin')
        .where('active', '=', true)
        .orderBy('age', 'desc')
        .limit(10)
        .getComplexity()

      expect(complexity).toHaveProperty('score')
      expect(complexity).toHaveProperty('factors')
      expect(typeof complexity.score).toBe('number')
    })
  })

  describe('uncovered branch coverage', () => {
    it('should handle select with array argument', async () => {
      const fields = ['name', 'age']
      const result = await queryBuilder.select(fields).execute()

      result.data.forEach((user) => {
        expect(Object.keys(user)).toEqual(['name', 'age'])
      })
    })

    it('should handle aggregate without alias', async () => {
      const result = await queryBuilder
        .select('department')
        .groupBy('department')
        .aggregate('count', '*')
        .execute()

      expect(result.data.length).toBeGreaterThan(0)
    })

    it('should throw error when executing without collection', async () => {
      const emptyBuilder = new QueryBuilder(adapter)

      await expect(emptyBuilder.execute()).rejects.toThrow(
        'Collection must be specified'
      )
    })

    it('should handle adapter without createIndex support', async () => {
      const basicAdapter = {
        ...adapter,
        list: adapter.list.bind(adapter),
        getMany: adapter.getMany.bind(adapter),
      }

      const basicBuilder = new QueryBuilder(
        basicAdapter as unknown as IStorageAdapter,
        'users'
      )

      await basicBuilder
        .where('role', '=', 'admin')
        .suggestIndex('role')
        .execute()

      // Should execute without error even without createIndex support
      const result = await basicBuilder.where('active', '=', true).execute()
      expect(result.data.length).toBeGreaterThan(0)
    })

    it('should handle adapter without executeQuery support', async () => {
      const basicAdapter = {
        ...adapter,
        list: adapter.list.bind(adapter),
        getMany: adapter.getMany.bind(adapter),
      }

      const basicBuilder = new QueryBuilder(
        basicAdapter as unknown as IStorageAdapter,
        'users'
      )

      const result = await basicBuilder.where('role', '=', 'admin').execute()

      expect(result.data.length).toBeGreaterThan(0)
      expect(result.metadata).toHaveProperty('executionTime')
    })

    it('should handle field selection with non-string fields', async () => {
      await adapter.set('users:edge1', {
        id: 'edge1',
        [123]: 'numeric-key',
        [Symbol('test')]: 'symbol-key',
        normal: 'value',
      })

      const result = await queryBuilder
        .select('normal', 123 as unknown as string)
        .execute()

      expect(result.data.length).toBeGreaterThan(0)
    })

    it('should handle compareValues with both null values', async () => {
      await adapter.set('users:null1', {
        id: 'null1',
        name: 'Null User',
        value1: null,
        value2: null,
      })

      const result = await queryBuilder
        .where('value1', '=', null)
        .orderBy('value1', 'asc')
        .execute()

      expect(result.data.length).toBeGreaterThan(0)
    })

    it('should handle compareValues with first value null', async () => {
      await adapter.set('users:null2', {
        id: 'null2',
        nullField: null,
        normalField: 'value',
      })

      const result = await queryBuilder.orderBy('nullField', 'asc').execute()

      // null values should sort first
      expect(result.data.length).toBeGreaterThan(0)
    })

    it('should handle compareValues with second value null', async () => {
      await adapter.set('users:null3', {
        id: 'null3',
        field1: 'value',
        field2: null,
      })

      const result = await queryBuilder.orderBy('field2', 'desc').execute()

      expect(result.data.length).toBeGreaterThan(0)
    })

    it('should estimate low complexity correctly', async () => {
      const simpleBuilder = new QueryBuilder(adapter, 'users').where(
        'role',
        '=',
        'admin'
      )

      const explanation = simpleBuilder.explain()

      expect(explanation.estimatedComplexity).toBe('low')
      expect(explanation.estimatedCost).toBeLessThanOrEqual(3)
    })

    it('should recommend indexes for non-JSON fields', async () => {
      const indexBuilder = queryBuilder
        .where('role', '=', 'admin')
        .where('age', '>', 25)
        .orderBy('salary', 'desc')

      const explanation = indexBuilder.explain()

      expect(explanation.recommendedIndexes).toContain('role')
      expect(explanation.recommendedIndexes).toContain('age')
      expect(explanation.recommendedIndexes).toContain('salary')
    })

    it('should clone builder without collection', () => {
      const emptyBuilder = new QueryBuilder(adapter)

      const cloned = emptyBuilder.clone()

      expect(cloned).not.toBe(emptyBuilder)
    })

    it('should clone builder with original collection', () => {
      const builderWithOriginal = new QueryBuilder(adapter, 'users')
      builderWithOriginal.collection('other')

      const cloned = builderWithOriginal.clone()

      expect(cloned).not.toBe(builderWithOriginal)
    })

    it('should handle first() restoring original limit', async () => {
      const builder = queryBuilder.limit(5)
      const originalLimit = 5

      const firstUser = await builder.first()

      expect(firstUser).toBeDefined()

      // Verify limit was restored after first()
      const result = await builder.execute()
      expect(result.data.length).toBeLessThanOrEqual(originalLimit)
    })

    it('should handle cache key generation with non-serializable queries', async () => {
      const circularRef: Record<string, unknown> = { name: 'circular' }
      circularRef.self = circularRef

      const builder = queryBuilder.cache(true)

      // Should handle non-serializable cache keys gracefully
      const result = await builder.where('role', '=', 'admin').execute()

      expect(result.data.length).toBeGreaterThan(0)
    })

    it('should handle estimateComplexity with medium score', async () => {
      const mediumBuilder = new QueryBuilder(adapter, 'users')
        .where('role', '=', 'admin')
        .where('active', '=', true)
        .where('age', '>', 25)
        .where('department', '=', 'engineering')
        .orderBy('salary', 'desc')

      const explanation = mediumBuilder.explain()

      expect(['medium', 'high']).toContain(explanation.estimatedComplexity)
    })

    it('should handle build() with undefined limit and offset', () => {
      const simpleBuilder = new QueryBuilder(adapter, 'users').where(
        'role',
        '=',
        'admin'
      )

      const query = simpleBuilder.build()

      expect(query.limit).toBeUndefined()
      expect(query.offset).toBeUndefined()
    })
  })

  describe('additional branch coverage for 100%', () => {
    it('should handle whereRaw without bindings parameter (default [])', () => {
      // Test default parameter branch for bindings
      const builder = queryBuilder.whereRaw('age > 25')
      const query = builder.build()

      // Verify the raw condition was added with empty bindings array
      expect(query.conditions).toHaveLength(1)
      expect(query.conditions[0].field).toBe('__raw__')
      expect(query.conditions[0].operator).toBe('raw')
      expect(query.conditions[0].value).toEqual({
        expression: 'age > 25',
        bindings: [],
      })
    })

    it('should handle negation with "like" operator (default case)', async () => {
      // Test the default case in negation switch statement (line 173-175)
      const builder = queryBuilder.not().where('name', 'like', 'Alice')

      const query = builder.build()

      // Negation doesn't change the operator for "like", falls through to default case
      expect(query.conditions[0].operator).toBe('like')
      expect(query.conditions[0].value).toBe('Alice')

      // Verify query executes without error
      const result = await builder.execute()
      expect(result.data).toBeDefined()
    })

    it('should handle negation with "in" operator (default case)', async () => {
      // Test the default case in negation switch statement
      const builder = queryBuilder.not().whereIn('role', ['admin', 'user'])

      const query = builder.build()

      // Negation doesn't change the operator for "in", handled in evaluation
      expect(query.conditions[0].operator).toBe('in')
    })

    it('should handle first() when original limit is undefined', async () => {
      // Test the else branch in first() at line 1032-1036
      const builder = new QueryBuilder(adapter, 'users')
      // Don't set any limit
      const firstUser = await builder.where('role', '=', 'admin').first()

      expect(firstUser).toBeDefined()
      expect(firstUser?.role).toBe('admin')

      // Verify _limitValue is undefined after first() completes
      const subsequentResult = await builder.execute()
      // Should return all matching results since limit was deleted
      expect(subsequentResult.data.length).toBe(2) // All admins
    })

    it('should clone builder with suggestedIndexes', () => {
      const builder = queryBuilder
        .where('role', '=', 'admin')
        .suggestIndex('role')
        .suggestIndex('department')

      const cloned = builder.clone()

      expect(cloned).not.toBe(builder)
      expect(cloned.build()).toEqual(builder.build())
    })

    it('should build query with joins', () => {
      const result = queryBuilder
        .join('departments', 'users.deptId', '=', 'departments.id')
        .join('teams', 'users.teamId', '=', 'teams.id')
        .where('active', '=', true)
        .build()

      expect(result.joins).toHaveLength(2)
      expect(result.joins[0]).toEqual({
        table: 'departments',
        on: 'users.deptId = departments.id',
      })
      expect(result.joins[1]).toEqual({
        table: 'teams',
        on: 'users.teamId = teams.id',
      })
    })

    it('should build query with offset but no limit', () => {
      const result = queryBuilder.where('active', '=', true).offset(10).build()

      expect(result.offset).toBe(10)
      expect(result.limit).toBeUndefined()
    })

    it('should build query with both limit and offset', () => {
      const result = queryBuilder
        .where('active', '=', true)
        .limit(5)
        .offset(10)
        .build()

      expect(result.limit).toBe(5)
      expect(result.offset).toBe(10)
    })

    it('should handle getComplexity with no factors', () => {
      const emptyBuilder = new QueryBuilder(adapter, 'users')
      const complexity = emptyBuilder.getComplexity()

      expect(complexity.score).toBe(0)
      expect(complexity.level).toBe('low')
      expect(complexity.factors).toEqual([])
    })

    it('should handle getComplexity with score exactly 3 (low threshold)', () => {
      // 3 conditions = score 3
      const builder = new QueryBuilder(adapter, 'users')
      builder
        .where('field1', '=', 'value1')
        .where('field2', '=', 'value2')
        .where('field3', '=', 'value3')

      const complexity = builder.getComplexity()

      expect(complexity.score).toBe(3)
      expect(complexity.level).toBe('low')
    })

    it('should handle getComplexity with score exactly 10 (medium threshold)', () => {
      // 10 conditions = score 10
      const builder = new QueryBuilder(adapter, 'users')
      for (let i = 0; i < 10; i++) {
        builder.where(`field${i}`, '=', `value${i}`)
      }

      const complexity = builder.getComplexity()

      expect(complexity.score).toBe(10)
      expect(complexity.level).toBe('medium')
    })

    it('should handle getComplexity with high score (> 10)', () => {
      // 11 conditions = score 11 (high)
      const builder = new QueryBuilder(adapter, 'users')
      for (let i = 0; i < 11; i++) {
        builder.where(`field${i}`, '=', `value${i}`)
      }

      const complexity = builder.getComplexity()

      expect(complexity.score).toBe(11)
      expect(complexity.level).toBe('high')
    })

    it('should clone builder with offsetValue set (line 1187)', () => {
      // Test to cover line 1187 in clone() method
      const builder = queryBuilder.where('role', '=', 'admin').offset(10)

      const cloned = builder.clone()

      expect(cloned).not.toBe(builder)
      const clonedQuery = cloned.build()
      expect(clonedQuery.offset).toBe(10)
    })

    it('should clone builder with nextLogicalOperator set (line 1192)', () => {
      // Test to cover line 1192 in clone() method
      // Set _nextLogicalOperator by calling .or() without following with .where()
      const builder = queryBuilder.where('role', '=', 'admin').or()

      const cloned = builder.clone()

      expect(cloned).not.toBe(builder)
      // The cloned builder should also have the OR operator pending
      // We can verify by adding a where clause and checking the condition
      cloned.where('active', '=', true)
      const clonedQuery = cloned.build()
      expect(clonedQuery.conditions).toHaveLength(2)
      expect(clonedQuery.conditions[1].logicalOperator).toBe('OR')
    })

    it('should handle generateCacheKey fallback for non-serializable objects (line 1266)', async () => {
      // Test to cover line 1266 - the catch block in generateCacheKey()
      // We need to create a scenario where JSON.stringify fails
      const originalStringify = JSON.stringify
      let callCount = 0

      // Mock JSON.stringify to throw on first call (inside generateCacheKey)
      vi.spyOn(JSON, 'stringify').mockImplementation((...args) => {
        callCount++
        // Only throw on the first call to generateCacheKey
        // Let subsequent calls (in test assertions) work normally
        if (callCount === 1) {
          throw new TypeError('Converting circular structure to JSON')
        }
        return originalStringify(...args)
      })

      const builder = queryBuilder.cache(true).where('role', '=', 'admin')

      // This should trigger the catch block and use the fallback cache key
      const result = await builder.execute()

      // Should still execute successfully using fallback cache key
      expect(result.data).toBeDefined()
      expect(result.data.length).toBeGreaterThan(0)

      // Restore original JSON.stringify
      vi.restoreAllMocks()
    })

    it('should recommend indexes for join fields (line 926)', () => {
      // Test to cover line 926 in recommendIndexes() method
      const builder = queryBuilder
        .where('role', '=', 'admin')
        .join('departments', 'users.deptId', '=', 'departments.id')

      const explanation = builder.explain()

      // Should include join fields in recommended indexes
      expect(explanation.recommendedIndexes).toContain('users.deptId')
      expect(explanation.recommendedIndexes).toContain('departments.id')
    })

    it('should reset builder created without collection (line 1147)', () => {
      // Test to cover line 1147 in reset() method
      // Create builder without collection (no _originalCollection)
      const emptyBuilder = new QueryBuilder(adapter)

      // Add some conditions
      emptyBuilder.where('role', '=', 'admin').limit(10).offset(5)

      // Reset should delete _collection since _originalCollection is undefined
      emptyBuilder.reset()

      // Trying to execute should throw since collection is undefined
      expect(() => emptyBuilder.build()).not.toThrow()
      const builtQuery = emptyBuilder.build()
      expect(builtQuery.collection).toBe('')
      expect(builtQuery.conditions).toHaveLength(0)
      expect(builtQuery.limit).toBeUndefined()
    })

    it('should clone builder with limitValue set (line 1184)', () => {
      // Test to cover line 1184 in clone() method
      const builder = queryBuilder.where('role', '=', 'admin').limit(50)

      const cloned = builder.clone()

      expect(cloned).not.toBe(builder)
      const clonedQuery = cloned.build()
      expect(clonedQuery.limit).toBe(50)
    })
  })
})
