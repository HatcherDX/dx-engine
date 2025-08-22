# @hatcherdx/storage

High-performance, secure storage abstraction layer with advanced features for the Hatcher DX Engine.

## Features

- 🔒 **Strong Encryption**: AES-256-GCM with Argon2id key derivation
- 🗜️ **Smart Compression**: LZ4 for speed, Brotli for ratio, auto-selection
- 🚀 **High Performance**: SQLite with WAL mode, prepared statements, and optimized indexes
- 🔍 **Complex Queries**: Fluent query builder with JSON support and full-text search
- 📦 **Multiple Adapters**: SQLite, Memory (testing), extensible for future needs
- 🔄 **Migration System**: Version-controlled schema migrations with rollback support
- 🔐 **Secure Vault**: Ultra-secure storage for sensitive data (API keys, secrets)
- 🎯 **TypeScript**: Full type safety with comprehensive TSDoc documentation

## Quick Start

```typescript
import { createSecureStorage } from '@hatcherdx/storage'

// Create secure storage with encryption and compression
const storage = createSecureStorage('./data/app.db', 'your-strong-passphrase')
await storage.initialize()

// Store and retrieve data
await storage.set('user:123', {
  name: 'John Doe',
  email: 'john@example.com',
  preferences: { theme: 'dark' },
})

const user = await storage.get('user:123')
console.log(user.name) // "John Doe"

// Use namespaced storage
const userSettings = storage.namespace('user:settings')
await userSettings.set('theme', 'dark')

// Complex queries
const activeUsers = await storage
  .query()
  .collection('users')
  .where('status', '=', 'active')
  .where('lastLogin', '>', Date.now() - 86400000)
  .orderBy('name', 'asc')
  .limit(10)
  .execute()

// Secure vault for sensitive data
await storage.vaultStorage.store('github-token', 'ghp_xxxxxxxxxxxx')
const token = await storage.vaultStorage.retrieve('github-token')
```

## Configuration Options

### Basic Configuration

```typescript
import { StorageManager } from '@hatcherdx/storage'

const storage = new StorageManager({
  type: 'sqlite',
  path: './data/storage.db',

  encryption: {
    enabled: true,
    passphrase: 'your-secure-passphrase',
    algorithm: 'aes-256-gcm',
  },

  compression: {
    enabled: true,
    algorithm: 'auto', // 'lz4' | 'brotli' | 'auto'
    minSize: 1024, // Only compress data > 1KB
  },

  cache: {
    maxSize: 1000,
    maxMemory: 50 * 1024 * 1024, // 50MB
    ttl: 300000, // 5 minutes
  },
})
```

### Memory Storage (Testing)

```typescript
const testStorage = new StorageManager({
  type: 'memory',
  encryption: { enabled: false },
  compression: { enabled: false },
})
```

## Storage Adapters

### SQLite Adapter

Production-ready SQLite storage with advanced features:

- **WAL Mode**: Better concurrency and performance
- **JSON Queries**: Query nested JSON data with `json_extract`
- **Full-text Search**: Built-in FTS5 support for content search
- **Prepared Statements**: Optimized query performance
- **Batch Operations**: Efficient bulk data operations
- **Comprehensive Indexing**: Automatic index creation for performance

```typescript
const adapter = new SQLiteAdapter({
  type: 'sqlite',
  path: './data/production.db',
})

await adapter.initialize()

// Direct adapter usage
await adapter.set('key', { data: 'value' })
const result = await adapter.get('key')

// Advanced querying
const results = await adapter
  .query()
  .where('user.role', '=', 'admin')
  .where('user.active', '=', true)
  .orderBy('user.lastLogin', 'desc')
  .execute()

// Full-text search
const searchResults = await adapter.search('important document', 'documents')
```

### Memory Adapter

Fast in-memory storage for testing and development:

```typescript
const adapter = new MemoryAdapter({
  type: 'memory',
})

await adapter.initialize()

// All data is stored in memory (lost on process exit)
await adapter.set('test', { value: 'data' })
```

## Security Features

### Encryption Service

AES-256-GCM encryption with Argon2id key derivation:

```typescript
import { EncryptionService } from '@hatcherdx/storage'

const encryption = new EncryptionService({
  enabled: true,
  passphrase: 'strong-user-passphrase',
  algorithm: 'aes-256-gcm',
})

// Derive secure key
const derivedKey = await encryption.deriveKey('user-passphrase')

// Encrypt/decrypt data
const encrypted = await encryption.encrypt({ secret: 'data' })
const decrypted = await encryption.decrypt(encrypted)

// Field-level encryption
const user = {
  id: 123,
  email: 'user@example.com',
  password: 'secret',
  profile: { ssn: '123-45-6789' },
}

const secured = await encryption.encryptFields(user, [
  'password',
  'profile.ssn',
])
```

### Secure Vault

Ultra-secure storage for sensitive data with double encryption:

```typescript
// Store API keys and secrets
await storage.vaultStorage.store('github-token', 'ghp_xxxxxxxxxxxx')
await storage.vaultStorage.store('database-credentials', {
  host: 'db.example.com',
  username: 'admin',
  password: 'super-secret',
})

// Retrieve when needed
const githubToken = await storage.vaultStorage.retrieve('github-token')
const dbCreds = await storage.vaultStorage.retrieve('database-credentials')

// Key rotation
await storage.vaultStorage.rotateKeys('new-stronger-passphrase')

// Backup/restore
const backup = await storage.vaultStorage.exportBackup()
await storage.vaultStorage.importBackup(backup)
```

## Performance Features

### Compression Service

Smart compression with algorithm auto-selection:

```typescript
import { CompressionService } from '@hatcherdx/storage'

const compression = new CompressionService({
  enabled: true,
  algorithm: 'auto', // Selects LZ4 or Brotli based on data size
  minSize: 1024, // Skip compression for small data
})

const result = await compression.compress('large text data...')
if (result.compressed) {
  console.log(`Saved ${result.originalSize - result.data.length} bytes`)
}

// Analyze data for optimal compression
const analysis = compression.analyzeData(data)
console.log(`Recommended: ${analysis.recommendedAlgorithm}`)
```

### Cache Layer

High-performance LRU cache with TTL and memory management:

```typescript
import { CacheLayer } from '@hatcherdx/storage'

const cache = new CacheLayer({
  maxSize: 1000,
  maxMemory: 100 * 1024 * 1024, // 100MB
  ttl: 300000, // 5 minutes
})

await cache.set('user:123', userData)
const cached = await cache.get('user:123')

// Cache statistics
const stats = cache.getStats()
console.log(`Hit ratio: ${(stats.hitRatio * 100).toFixed(1)}%`)
```

## Query Builder

Fluent interface for complex data queries:

```typescript
// Simple queries
const users = await storage
  .query()
  .collection('users')
  .where('age', '>', 18)
  .where('status', '=', 'active')
  .orderBy('name', 'asc')
  .limit(50)
  .execute()

// Complex queries with JSON paths
const premiumUsers = await storage
  .query()
  .collection('users')
  .whereJson('subscription.plan', '=', 'premium')
  .whereJson('preferences.notifications', '=', true)
  .whereBetween('lastLogin', startDate, endDate)
  .execute()

// Aggregation
const userStats = await storage
  .query()
  .collection('users')
  .groupBy('status')
  .aggregate('count', '*', 'total')
  .aggregate('avg', 'age', 'average_age')
  .execute()

// Query optimization
const plan = storage
  .query()
  .collection('orders')
  .where('total', '>', 100)
  .explain()

console.log(`Complexity: ${plan.estimatedComplexity}`)
console.log(`Recommended indexes: ${plan.recommendedIndexes}`)
```

## Migration System

Version-controlled database migrations with rollback support:

```typescript
// Add migrations
storage.addMigration({
  version: '1.1.0',
  description: 'Add user preferences table',
  up: async (adapter) => {
    await adapter.execute(`
      CREATE TABLE user_preferences (
        user_id TEXT PRIMARY KEY,
        preferences TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )
    `)
  },
  down: async (adapter) => {
    await adapter.execute('DROP TABLE user_preferences')
  },
})

// Migrations run automatically during initialization
await storage.initialize()

// Manual migration management
const pending = await storage.getPendingMigrations()
const history = await storage.getMigrationHistory()

// Rollback to specific version
await storage.rollback('1.0.0')
```

## Factory Functions

Convenient factory functions for common configurations:

```typescript
// Basic storage
const storage = createStorage({ type: 'memory' })

// Secure storage with encryption and compression
const secure = createSecureStorage('./secure.db', 'strong-passphrase')

// Fast storage optimized for performance
const fast = createFastStorage('./cache.db')
```

## Error Handling

Comprehensive error handling with specific error codes:

```typescript
import { StorageError, StorageErrorCode } from '@hatcherdx/storage'

try {
  await storage.set('key', data)
} catch (error) {
  if (error instanceof StorageError) {
    switch (error.code) {
      case StorageErrorCode.ENCRYPTION_ERROR:
        console.error('Encryption failed:', error.message)
        break
      case StorageErrorCode.QUOTA_EXCEEDED:
        console.error('Storage quota exceeded')
        break
      case StorageErrorCode.DATABASE_ERROR:
        console.error('Database error:', error.cause)
        break
    }
  }
}
```

## Performance Tips

1. **Use Batch Operations**: For multiple operations, use `setMany()` and `getMany()`
2. **Enable Compression**: Reduces storage size and I/O for large data
3. **Use Namespaces**: Organize data and improve query performance
4. **Index Strategy**: Let SQLite adapter create optimized indexes automatically
5. **Cache Configuration**: Tune cache size based on your memory constraints
6. **Query Optimization**: Use the query builder's `explain()` method

## Testing

The storage module includes comprehensive test utilities:

```typescript
// Test setup in vitest.setup.ts
global.createTestConfig = (overrides = {}) => ({
  type: 'memory',
  encryption: { enabled: false },
  compression: { enabled: false },
  ...overrides,
})

// In your tests
describe('My Feature', () => {
  let storage: StorageManager

  beforeEach(async () => {
    const config = createTestConfig()
    storage = new StorageManager(config)
    await storage.initialize()
  })

  it('should store user data', async () => {
    await storage.set('user:123', userData)
    const retrieved = await storage.get('user:123')
    expect(retrieved).toEqual(userData)
  })
})
```

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Run with coverage
pnpm test:coverage

# Lint code
pnpm lint

# Type checking
pnpm tsc
```

## License

Part of the Hatcher DX Engine - Internal Development Tool

## Contributing

This is an internal module for the Hatcher DX Engine. For issues or contributions, please use the main project repository.
