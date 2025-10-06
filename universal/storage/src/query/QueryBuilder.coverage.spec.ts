/**
 * @fileoverview Coverage tests for QueryBuilder to achieve 100% coverage
 *
 * @description
 * Comprehensive test suite targeting uncovered lines and branches in QueryBuilder.ts
 * including joins mapping, offset handling, and cache key generation edge cases.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @internal
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { UniversalQueryBuilder } from './QueryBuilder'
import { MemoryAdapter } from '../adapters/MemoryAdapter'
import type { IStorageAdapter } from '../types/storage'

// Import test utilities
import '../test-setup'

// Declare global test utilities
declare global {
  const createTestConfig: (
    overrides?: Partial<Record<string, unknown>>
  ) => Record<string, unknown>
}

describe('QueryBuilder Coverage', () => {
  let adapter: IStorageAdapter
  let queryBuilder: UniversalQueryBuilder

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

    await adapter.set('departments:1', {
      id: 1,
      name: 'engineering',
      budget: 1000000,
      headCount: 50,
    })

    await adapter.set('departments:2', {
      id: 2,
      name: 'marketing',
      budget: 500000,
      headCount: 25,
    })

    queryBuilder = new UniversalQueryBuilder(adapter, 'users')
  })

  describe('joins mapping in build() method', () => {
    it('should map joins correctly when building query (line 1222)', () => {
      // Add joins to test the mapping
      queryBuilder
        .join('departments', 'users.department', '=', 'departments.name')
        .join('projects', 'users.id', '=', 'projects.userId', 'left')
        .join('teams', 'users.teamId', '=', 'teams.id', 'right')

      const built = queryBuilder.build()

      // This tests line 1222 - the joins mapping
      expect(built.joins).toEqual([
        {
          table: 'departments',
          on: 'users.department = departments.name',
        },
        {
          table: 'projects',
          on: 'users.id = projects.userId',
        },
        {
          table: 'teams',
          on: 'users.teamId = teams.id',
        },
      ])
    })

    it('should handle empty joins array', () => {
      const built = queryBuilder.build()
      expect(built.joins).toEqual([])
    })

    it('should handle joins with different operators', () => {
      queryBuilder
        .join('departments', 'users.deptId', '>', 'departments.minId')
        .join('roles', 'users.roleLevel', '<=', 'roles.maxLevel')
        .join('locations', 'users.location', '!=', 'locations.restricted')

      const built = queryBuilder.build()

      expect(built.joins).toHaveLength(3)
      expect(built.joins[0].on).toBe('users.deptId > departments.minId')
      expect(built.joins[1].on).toBe('users.roleLevel <= roles.maxLevel')
      expect(built.joins[2].on).toBe('users.location != locations.restricted')
    })
  })

  describe('offset handling in build() method', () => {
    it('should include offset when defined (line 1238)', () => {
      queryBuilder.limit(10).offset(20)

      const built = queryBuilder.build()

      // This tests line 1237-1238 - offset inclusion
      expect(built.offset).toBe(20)
      expect(built.limit).toBe(10)
    })

    it('should not include offset when undefined', () => {
      queryBuilder.limit(10) // No offset

      const built = queryBuilder.build()

      expect(built.offset).toBeUndefined()
      expect(built.limit).toBe(10)
    })

    it('should handle offset of 0', () => {
      queryBuilder.offset(0)

      const built = queryBuilder.build()

      expect(built.offset).toBe(0)
    })
  })

  describe('generateCacheKey error handling', () => {
    it('should fallback to timestamp-based key for non-serializable queries (line 1266)', () => {
      const queryBuilderWithCircular = new UniversalQueryBuilder(
        adapter,
        'users'
      )

      // Create a circular reference that will fail JSON.stringify
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing edge case with circular reference that causes JSON.stringify to fail
      const circularQuery: any = { a: {} }
      circularQuery.a.b = circularQuery.a

      // Access the private method using bracket notation for testing internal cache key generation
      const generateKey =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private method for testing internal cache behavior
        (queryBuilderWithCircular as any).generateCacheKey.bind(
          queryBuilderWithCircular
        )

      // Mock Date.now and Math.random for predictable output
      const originalDateNow = Date.now
      const originalMathRandom = Math.random
      Date.now = vi.fn(() => 1234567890)
      Math.random = vi.fn(() => 0.123456789)

      const key = generateKey(circularQuery)

      // This tests line 1266 - fallback for non-serializable queries
      expect(key).toMatch(/^query:\d+-[a-z0-9]+$/)

      // Restore originals
      Date.now = originalDateNow
      Math.random = originalMathRandom
    })

    it('should generate deterministic keys for serializable queries', () => {
      const queryBuilderWithCache = new UniversalQueryBuilder(adapter, 'users')

      const query = {
        collection: 'users',
        conditions: [{ field: 'age', operator: '>', value: 18 }],
        orderBy: [{ field: 'name', direction: 'asc' }],
      }

      // Access the private method for testing internal cache key generation
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private method for coverage testing
      const generateKey = (queryBuilderWithCache as any).generateCacheKey.bind(
        queryBuilderWithCache
      )

      const key1 = generateKey(query)
      const key2 = generateKey(query)

      // Keys should be identical for the same query
      expect(key1).toBe(key2)
      expect(key1).toMatch(/^query:[a-z0-9-]+$/)
    })

    it('should handle BigInt in query objects', () => {
      const queryBuilderWithBigInt = new UniversalQueryBuilder(adapter, 'users')

      // Create a query with BigInt that will fail JSON.stringify
      const queryWithBigInt = {
        collection: 'users',
        conditions: [{ field: 'id', operator: '=', value: BigInt(123) }],
      }

      // Access the private method for testing internal cache key generation
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private method for coverage testing
      const generateKey = (queryBuilderWithBigInt as any).generateCacheKey.bind(
        queryBuilderWithBigInt
      )

      // Mock Date.now and Math.random for predictable output
      const originalDateNow = Date.now
      const originalMathRandom = Math.random
      Date.now = vi.fn(() => 9876543210)
      Math.random = vi.fn(() => 0.987654321)

      const key = generateKey(queryWithBigInt)

      // Should use fallback due to BigInt not being serializable
      expect(key).toMatch(/^query:\d+-[a-z0-9]+$/)

      Date.now = originalDateNow
      Math.random = originalMathRandom
    })
  })

  describe('complex join scenarios', () => {
    it('should handle all join types with complex field names', () => {
      queryBuilder
        .join('table1', 'users.field_1', '=', 'table1.field_a')
        .join('table2', 'users.field-2', '!=', 'table2.field-b', 'left')
        .join('table3', 'users.field.3', '>', 'table3.field.c', 'right')
        .join('table4', 'users.field[4]', '>=', 'table4.field[d]')
        .join('table5', 'users.field$5', '<', 'table5.field$e', 'left')

      const built = queryBuilder.build()

      expect(built.joins).toHaveLength(5)
      expect(built.joins[0]).toEqual({
        table: 'table1',
        on: 'users.field_1 = table1.field_a',
      })
      expect(built.joins[1]).toEqual({
        table: 'table2',
        on: 'users.field-2 != table2.field-b',
      })
      expect(built.joins[2]).toEqual({
        table: 'table3',
        on: 'users.field.3 > table3.field.c',
      })
      expect(built.joins[3]).toEqual({
        table: 'table4',
        on: 'users.field[4] >= table4.field[d]',
      })
      expect(built.joins[4]).toEqual({
        table: 'table5',
        on: 'users.field$5 < table5.field$e',
      })
    })

    it('should preserve join order when building', () => {
      queryBuilder
        .join('a', 'x', '=', 'y', 'left')
        .join('b', 'x', '=', 'y')
        .join('c', 'x', '=', 'y', 'right')
        .join('d', 'x', '=', 'y')

      const built = queryBuilder.build()

      expect(built.joins.map((j) => j.table)).toEqual(['a', 'b', 'c', 'd'])
    })
  })

  describe('edge cases for limit and offset', () => {
    it('should handle very large offset values', () => {
      queryBuilder.offset(Number.MAX_SAFE_INTEGER)

      const built = queryBuilder.build()

      expect(built.offset).toBe(Number.MAX_SAFE_INTEGER)
    })

    it('should handle negative offset values', () => {
      queryBuilder.offset(-100)

      const built = queryBuilder.build()

      expect(built.offset).toBe(-100)
    })

    it('should update offset when called multiple times', () => {
      queryBuilder.offset(10).offset(20).offset(30)

      const built = queryBuilder.build()

      expect(built.offset).toBe(30)
    })

    it('should handle limit without offset', () => {
      queryBuilder.limit(50)

      const built = queryBuilder.build()

      expect(built.limit).toBe(50)
      expect(built.offset).toBeUndefined()
    })

    it('should handle offset without limit', () => {
      queryBuilder.offset(100)

      const built = queryBuilder.build()

      expect(built.offset).toBe(100)
      expect(built.limit).toBeUndefined()
    })
  })

  describe('cache key generation with various query types', () => {
    it('should generate unique keys for different queries', () => {
      const qb1 = new UniversalQueryBuilder(adapter, 'users')
      const qb2 = new UniversalQueryBuilder(adapter, 'users')

      const query1 = { collection: 'users', conditions: [] }
      const query2 = { collection: 'posts', conditions: [] }

      // Access private methods for testing internal cache key generation
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private method for coverage testing
      const generateKey1 = (qb1 as any).generateCacheKey.bind(qb1)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private method for coverage testing
      const generateKey2 = (qb2 as any).generateCacheKey.bind(qb2)

      const key1 = generateKey1(query1)
      const key2 = generateKey2(query2)

      expect(key1).not.toBe(key2)
    })

    it('should handle queries with undefined values', () => {
      const qb = new UniversalQueryBuilder(adapter, 'users')

      const query = {
        collection: 'users',
        conditions: undefined,
        orderBy: undefined,
        limit: undefined,
      }

      // Access private method for testing internal cache key generation
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private method for coverage testing
      const generateKey = (qb as any).generateCacheKey.bind(qb)
      const key = generateKey(query)

      expect(key).toMatch(/^query:[a-z0-9-]+$/)
    })

    it('should handle queries with null values', () => {
      const qb = new UniversalQueryBuilder(adapter, 'users')

      const query = {
        collection: 'users',
        conditions: [{ field: 'status', operator: '=', value: null }],
      }

      // Access private method for testing internal cache key generation
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private method for coverage testing
      const generateKey = (qb as any).generateCacheKey.bind(qb)
      const key = generateKey(query)

      expect(key).toMatch(/^query:[a-z0-9-]+$/)
    })

    it('should handle queries with symbols', () => {
      const qb = new UniversalQueryBuilder(adapter, 'users')

      const sym = Symbol('test')
      const query = {
        collection: 'users',
        [sym]: 'value', // Symbol properties are not serializable
      }

      // Access private method for testing internal cache key generation
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private method for coverage testing
      const generateKey = (qb as any).generateCacheKey.bind(qb)

      // Mock Date.now and Math.random
      Date.now = vi.fn(() => 1111111111)
      Math.random = vi.fn(() => 0.5)

      const key = generateKey(query)

      // Should handle the query even with symbol
      expect(key).toMatch(/^query:[a-z0-9-]+$/)
    })

    it('should handle queries with functions', () => {
      const qb = new UniversalQueryBuilder(adapter, 'users')

      const query = {
        collection: 'users',
        filter: () => true, // Functions are not serializable
      }

      // Access private method for testing internal cache key generation
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private method for coverage testing
      const generateKey = (qb as any).generateCacheKey.bind(qb)

      // Mock Date.now and Math.random
      Date.now = vi.fn(() => 2222222222)
      Math.random = vi.fn(() => 0.75)

      const key = generateKey(query)

      // Functions are stripped out during JSON.stringify, so it actually succeeds
      // The resulting object just won't have the function property
      expect(key).toMatch(/^query:[a-z0-9-]+$/)
    })
  })

  describe('clone method coverage', () => {
    it('should clone query with originalCollection (line 1174)', () => {
      const original = new UniversalQueryBuilder(adapter)
      original.collection('users')

      // Set originalCollection by accessing private property for testing internal state
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private property for coverage testing
      ;(original as any)._originalCollection = 'original_users'

      const cloned = original.clone()

      // Verify internal state after cloning
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private property for coverage testing
      expect((cloned as any)._collection).toBe('users')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private property for coverage testing
      expect((cloned as any)._originalCollection).toBe('original_users')
    })

    it('should clone query with offsetValue (line 1187)', () => {
      queryBuilder.where('age', '>', 25).orderBy('name').limit(10).offset(20)

      const cloned = queryBuilder.clone()

      // Verify internal state after cloning
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private property for coverage testing
      expect((cloned as any)._offsetValue).toBe(20)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private property for coverage testing
      expect((cloned as any)._limitValue).toBe(10)
    })

    it('should clone query with nextLogicalOperator (line 1192)', () => {
      // The or() call sets _nextLogicalOperator but the second where() deletes it
      // So we need to test mid-chain
      const qb = new UniversalQueryBuilder(adapter, 'users')
      qb.where('age', '>', 25).or()

      const cloned = qb.clone()
      // Verify internal state after cloning
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private property for coverage testing
      expect((cloned as any)._nextLogicalOperator).toBe('OR')
    })

    it('should clone query with suggestedIndexes (line 1197)', () => {
      const qb = new UniversalQueryBuilder(adapter, 'users')

      // Set suggestedIndexes by accessing private property for testing internal state
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private property for coverage testing
      ;(qb as any)._suggestedIndexes = ['age', 'name', 'email']

      const cloned = qb.clone()

      // Verify internal state after cloning
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private property for coverage testing
      expect((cloned as any)._suggestedIndexes).toEqual([
        'age',
        'name',
        'email',
      ])
      // Verify it's a new array
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private property for coverage testing
      expect((cloned as any)._suggestedIndexes).not.toBe(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private property for coverage testing
        (qb as any)._suggestedIndexes
      )
    })

    it('should clone all query properties correctly', () => {
      queryBuilder
        .select('id', 'name', 'age')
        .where('age', '>', 18)
        .whereIn('status', ['active', 'pending'])
        .join('departments', 'users.department', '=', 'departments.name')
        .groupBy('department')
        .having('count(*)', '>', 5)
        .orderBy('age', 'desc')
        .limit(10)
        .offset(20)
        .aggregate('count', '*', 'total')
        .cache()

      const cloned = queryBuilder.clone()

      // Verify all properties are cloned by accessing internal state
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private property for coverage testing
      expect((cloned as any)._collection).toBe('users')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private property for coverage testing
      expect((cloned as any)._conditions).toEqual(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private property for coverage testing
        (queryBuilder as any)._conditions
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private property for coverage testing
      expect((cloned as any)._joins).toEqual((queryBuilder as any)._joins)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private property for coverage testing
      expect((cloned as any)._orderBy).toEqual((queryBuilder as any)._orderBy)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private property for coverage testing
      expect((cloned as any)._groupBy).toEqual((queryBuilder as any)._groupBy)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private property for coverage testing
      expect((cloned as any)._having).toEqual((queryBuilder as any)._having)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private property for coverage testing
      expect((cloned as any)._limitValue).toBe(10)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private property for coverage testing
      expect((cloned as any)._offsetValue).toBe(20)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private property for coverage testing
      expect((cloned as any)._selectFields).toEqual(['id', 'name', 'age'])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private property for coverage testing
      expect((cloned as any)._aggregates).toHaveLength(1)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private property for coverage testing
      expect((cloned as any)._cacheEnabled).toBe(true)
    })

    it('should create independent clones', () => {
      queryBuilder.where('age', '>', 25)

      const cloned = queryBuilder.clone()
      cloned.where('name', '=', 'Alice')

      // Original should not be affected - verify internal state
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private property for coverage testing
      expect((queryBuilder as any)._conditions).toHaveLength(1)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private property for coverage testing
      expect((cloned as any)._conditions).toHaveLength(2)
    })
  })

  describe('logical operators and edge cases', () => {
    it('should handle and() method (lines 991, 996, 999)', () => {
      queryBuilder
        .where('age', '>', 25)
        .and() // This sets _nextLogicalOperator to 'AND'
        .where('role', '=', 'admin')

      const built = queryBuilder.build()

      expect(built.conditions).toHaveLength(2)
      expect(built.conditions[1].logicalOperator).toBe('AND')
    })

    it('should handle first() when limit is already set (line 1033)', async () => {
      // Set up query with existing limit
      queryBuilder.where('age', '>', 25).limit(5) // Pre-existing limit

      // Mock the execute method
      const mockData = { id: 1, name: 'Alice', age: 30 }
      vi.spyOn(queryBuilder, 'execute').mockResolvedValue({
        data: [mockData],
        total: 1,
        metadata: {},
      })

      const result = await queryBuilder.first()

      expect(result).toEqual(mockData)
      // Verify limit was restored by accessing internal state
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private property for coverage testing
      expect((queryBuilder as any)._limitValue).toBe(5)
    })

    it('should handle high complexity score (line 1133)', () => {
      // Create a very complex query
      // Score calculation:
      // - 5 conditions = 5 points
      // - 4 joins × 3 = 12 points
      // - 2 group by × 2 = 4 points
      // Total = 21 points (> 10, so 'high')
      queryBuilder
        .select('id', 'name', 'age', 'email', 'phone')
        .where('age', '>', 25)
        .where('status', '=', 'active')
        .where('role', '!=', 'guest')
        .whereIn('department', ['sales', 'marketing', 'engineering'])
        .whereBetween('salary', 50000, 150000)
        .join('departments', 'users.dept_id', '=', 'departments.id')
        .join('roles', 'users.role_id', '=', 'roles.id')
        .join('teams', 'users.team_id', '=', 'teams.id')
        .join('projects', 'users.project_id', '=', 'projects.id')
        .groupBy('department')
        .groupBy('role')
        .having('count(*)', '>', 10)
        .orderBy('created_at', 'desc')
        .orderBy('name', 'asc')
        .limit(100)
        .offset(500)

      const result = queryBuilder.getComplexity()

      // Should be high complexity
      expect(result.level).toBe('high')
      expect(result.score).toBeGreaterThan(10)
      expect(result.factors).toContain('5 conditions')
      expect(result.factors).toContain('4 joins')
      expect(result.factors).toContain('2 group by fields')
    })

    it('should handle reset() without originalCollection (line 1147)', () => {
      // Create builder without collection
      const qb = new UniversalQueryBuilder(adapter)
      qb.collection('temporary')
      qb.where('test', '=', true)

      // Reset should delete collection since no originalCollection
      qb.reset()

      // Verify internal state after reset
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private property for coverage testing
      expect((qb as any)._collection).toBeUndefined()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private property for coverage testing
      expect((qb as any)._conditions).toEqual([])
    })
  })

  describe('build method completeness', () => {
    it('should include all query components in build output', () => {
      queryBuilder
        .select('id', 'name', 'age')
        .where('age', '>', 18)
        .whereIn('role', ['admin', 'moderator'])
        .join('departments', 'users.department', '=', 'departments.name')
        .groupBy('department')
        .having('count(*)', '>', 5)
        .orderBy('age', 'desc')
        .limit(10)
        .offset(20)

      const built = queryBuilder.build()

      expect(built.collection).toBe('users')
      expect(built.select).toEqual(['id', 'name', 'age'])
      expect(built.conditions).toHaveLength(2)
      expect(built.joins).toHaveLength(1)
      expect(built.groupBy).toEqual(['department'])
      expect(built.having).toHaveLength(1)
      expect(built.orderBy).toEqual([{ field: 'age', direction: 'desc' }])
      expect(built.limit).toBe(10)
      expect(built.offset).toBe(20)
    })

    it('should handle empty joins array correctly', () => {
      queryBuilder.where('age', '>', 18)

      const built = queryBuilder.build()

      expect(built.joins).toEqual([])
      expect(built.joins.length).toBe(0)
    })

    it('should map multiple joins with different types', () => {
      queryBuilder
        .join('t1', 'f1', '=', 'f2')
        .join('t2', 'f3', '!=', 'f4', 'left')
        .join('t3', 'f5', '>', 'f6', 'right')

      const built = queryBuilder.build()

      expect(built.joins).toHaveLength(3)
      expect(built.joins[0].table).toBe('t1')
      expect(built.joins[1].table).toBe('t2')
      expect(built.joins[2].table).toBe('t3')
    })
  })
})
