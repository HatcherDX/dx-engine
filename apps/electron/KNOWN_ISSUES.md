# Known Issues - Electron App

## ptyManager.spec.ts Test Timeout in CI

### Issue

The ptyManager.spec.ts test file experiences timeouts when running all tests together in CI, but tests pass individually.

**Error:**

- Tests timeout after default 5s in CI environment
- Individual test suites pass when run separately
- Issue appears related to vitest's hoisted mock functionality and module state

### Root Cause

Complex interaction between:

- vitest's `vi.hoisted()` function for mock setup
- Dynamic module imports in beforeEach hooks
- Module state not being properly reset between tests
- Default timeout too short for complex mock setup

### Current Solution

1. Added `vi.resetModules()` in beforeEach to clear module cache
2. Increased test timeout to 60s using `vi.setConfig()`
3. Ensured proper mock cleanup with `mockUuid.mockClear()`

### Implementation

```typescript
// At top of test file
vi.setConfig({
  testTimeout: 60000, // 60 seconds
  hookTimeout: 60000, // 60 seconds
})

// In beforeEach
beforeEach(async () => {
  vi.resetModules() // Clear module cache
  vi.clearAllMocks()
  mockUuid.mockClear() // Reset UUID counter
  // ... rest of setup
})
```

### TODO

- [ ] Monitor if timeouts still occur with increased limits
- [ ] Consider refactoring to avoid vi.hoisted if issues persist
- [ ] Optimize test setup for better performance

---

## node-pty Windows ARM64 Compilation Error

### Issue

node-pty version 1.0.0 has a compilation error on Windows ARM64 with modern Visual Studio compilers.

**Error message:**

```
error C2664: 'HMODULE GetModuleHandleW(LPCWSTR)': cannot convert argument 1 from 'const char [12]' to 'LPCWSTR'
```

### Root Cause

The error occurs in `winpty.cc` where `GetModuleHandleW` expects a wide string (`LPCWSTR`) but receives a narrow string literal. This is a known bug in node-pty 1.0.0.

### Tracking

- GitHub Issue: https://github.com/microsoft/node-pty/issues/683
- Beta versions 1.1.0-beta34 may have the fix but are not stable for production use

### Current Workaround

In CI/CD pipeline (`.github/workflows/ci.yml`):

- Skip node-pty compilation using `pnpm install --ignore-scripts`
- Only rebuild compatible native modules (better-sqlite3, argon2, lz4, lzma-native)
- This is acceptable for cross-compilation testing since node-pty is not critical for ARM64 builds

### TODO

- [ ] Update node-pty to a stable version > 1.0.0 when released with Windows ARM64 fix
- [ ] Remove the `--ignore-scripts` workaround from CI/CD pipeline
- [ ] Test full functionality on Windows ARM64 after update
