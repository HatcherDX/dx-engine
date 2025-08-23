/**
 * @fileoverview CI-specific test setup
 *
 * @description
 * Setup file that ensures native dependency mocks are properly applied
 * in CI environments before any other imports occur.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

// Force CI environment to ensure mocks are applied
process.env.CI = 'true'
process.env.VITEST_MOCK_SQLITE = 'true'

console.log('🛡️ CI Setup: Forcing mock environment for native dependencies')

// Import storage mocks FIRST before any module that might use them
import './universal/storage/src/test-mocks'

// Then import regular setup
import './vitest.setup'

console.log('✅ CI Setup: Mocks applied successfully')
