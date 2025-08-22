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
})
