/**
 * @fileoverview CI-specific test setup to ensure mocks are applied
 *
 * @description
 * This file ensures that native dependency mocks are properly applied
 * in CI environments where native bindings like argon2 are not available.
 * It must be imported before any modules that might use these dependencies.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

// Force CI environment for mocking
process.env.CI = 'true'
process.env.VITEST_MOCK_SQLITE = 'true'

// Import mocks before anything else
import './test-mocks'
// Import regular test setup
import './test-setup'

console.warn('[CI SETUP] Forced CI environment mocks for testing')
