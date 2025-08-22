# CI/CD Compatibility Guide

## Better-SQLite3 Native Bindings Issue

This module uses `better-sqlite3` which requires native C++ bindings. In CI/CD environments (especially GitHub Actions), these bindings might not be available or fail to compile.

## Solution Implemented

### 1. **Optional Dependency**

`better-sqlite3` is marked as an `optionalDependency` in `package.json` to prevent installation failures.

### 2. **Dynamic Import with Fallback**

The `SQLiteAdapter` uses dynamic imports to gracefully handle missing bindings:

```typescript
// Dynamically import better-sqlite3 with fallback handling
let Database: typeof import('better-sqlite3').default
try {
  const sqliteModule = await import('better-sqlite3')
  Database = sqliteModule.default
} catch (error) {
  throw new StorageError(
    `Failed to initialize SQLite database: ${error.message}`,
    StorageErrorCode.INITIALIZATION_ERROR,
    error
  )
}
```

### 3. **Comprehensive Test Mocking**

In `test-setup.ts`, we provide a comprehensive mock for CI environments:

```typescript
const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true'
const forceUseMock = process.env.VITEST_MOCK_SQLITE === 'true'

if (isCI || forceUseMock) {
  vi.mock('better-sqlite3', () => {
    // Comprehensive mock implementation
  })
}
```

## Usage in CI/CD

### GitHub Actions

Use the CI-specific test commands:

```yaml
- name: Run tests
  run: pnpm test:ci

- name: Run tests with coverage
  run: pnpm test:coverage:ci
```

### Local Testing with Mock

Force mock usage locally for testing:

```bash
VITEST_MOCK_SQLITE=true pnpm test
```

## Script Commands

- `pnpm test` - Normal tests (uses real SQLite when available)
- `pnpm test:ci` - CI tests (forces SQLite mock)
- `pnpm test:coverage:ci` - CI coverage tests (forces SQLite mock)

## Mock Behavior

The mock provides:

- Basic SQL operation simulation
- In-memory storage for test data
- Migration table support
- Prepared statement mocking
- Transaction simulation

## Production Deployment

In production, `better-sqlite3` should be properly installed with native bindings. The mocking is only used for testing environments where native compilation fails.
