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

## lzma-native Windows ARM64 Compilation Error

### Issue

lzma-native version 8.0.6 fails to compile on Windows ARM64 with unresolved external symbol errors.

**Error message:**

```
error LNK2001: unresolved external symbol __imp_lzma_filters_update
error LNK2001: unresolved external symbol __imp_lzma_stream_encoder_mt
... (46 unresolved externals)
fatal error LNK1120: 46 unresolved externals
```

### Root Cause

The lzma-native package doesn't have pre-built binaries for Windows ARM64 architecture. When it falls back to source compilation, the LZMA library symbols cannot be resolved because:

1. The LZMA libraries are not compiled for ARM64
2. The binding.gyp doesn't properly configure ARM64 linking

### Tracking

- No official GitHub issue yet for Windows ARM64 support
- Package only provides pre-built binaries for x64 architectures

### Current Workaround

In CI/CD pipeline (`.github/workflows/ci.yml`):

- Skip lzma-native compilation using `pnpm install --ignore-scripts`
- Exclude lzma-native from rebuild command
- This is acceptable as lzma-native is not critical for our application

### TODO

- [ ] Monitor lzma-native for official Windows ARM64 support
- [ ] Consider using pure JavaScript LZMA implementation if needed
- [ ] File issue with lzma-native for Windows ARM64 support

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

- [ ] **PRIORITY**: Monitor node-pty releases for Windows ARM64 support
  - Current version: 1.0.0 (has compilation errors on Windows ARM64)
  - Issue tracking: https://github.com/microsoft/node-pty/issues/683
  - Beta versions 1.1.0-beta34+ may have fixes but are unstable
  - **Action Required**: When stable version > 1.0.0 is released with Windows fix:
    1. Update node-pty dependency in package.json
    2. Remove all `--ignore-scripts` workarounds from CI/CD
    3. Re-enable PTY tests on Windows in CI
    4. Remove this entire KNOWN_ISSUES section
    5. Test full functionality on Windows ARM64
- [ ] Remove the `--ignore-scripts` workaround from CI/CD pipeline (blocked by above)
- [ ] Test full functionality on Windows ARM64 after update (blocked by above)

### CI/CD Workaround

Due to the node-pty compilation issues on Windows, the following CI jobs skip PTY-specific tests on Windows:

- `terminal-pty-tests`: Skipped entirely on Windows
- Tests fall back to subprocess backend instead of node-pty on Windows CI

This is acceptable as:

1. The subprocess backend provides similar functionality for basic terminal operations
2. node-pty tests still run on Linux and macOS in CI
3. Windows developers can still test locally with a properly compiled node-pty

---

## pnpm rebuild Command Syntax Issue

### Issue

The `pnpm rebuild` command doesn't support the `--ignore-scripts` flag, which causes CI/CD failures.

**Error message:**

```
Unknown option: 'ignore-scripts'
```

### Root Cause

The `--ignore-scripts` flag is only valid for `pnpm install` and not for `pnpm rebuild`. This was incorrectly used in the arm64-native-tests job.

### Solution

Remove `--ignore-scripts` from all `pnpm rebuild` commands in CI/CD workflow. The flag is unnecessary as rebuild only rebuilds native modules and doesn't run install scripts.

### Implementation

```yaml
# ✅ CORRECT
pnpm rebuild --filter '@hatcherdx/*' --config.arch=${{ matrix.arch }}

# ❌ INCORRECT
pnpm rebuild --filter '@hatcherdx/*' --config.arch=${{ matrix.arch }} --ignore-scripts
```

### TODO

- [x] Fix pnpm rebuild commands in CI/CD workflow
- [ ] Monitor for any script execution issues during rebuild

---

## Workspace Package Build Issue on Windows

### Issue

When `pnpm install --ignore-scripts` is used on Windows to avoid node-pty compilation errors, workspace packages like `@hatcherdx/puppeteer-google-translate` are not built, causing TypeScript compilation failures.

**Error message:**

```
error TS2307: Cannot find module '@hatcherdx/puppeteer-google-translate' or its corresponding type declarations.
```

### Root Cause

The `--ignore-scripts` flag prevents all postinstall scripts from running, including the build scripts for workspace packages. This causes TypeScript to fail when importing these packages as their dist folders are not created.

### Solution

Explicitly build workspace packages after installation on Windows:

```yaml
# Build the puppeteer-google-translate package that was skipped during install
pnpm --filter @hatcherdx/puppeteer-google-translate build
```

### TODO

- [x] Add explicit build step for workspace packages on Windows
- [ ] Consider alternative solutions for handling node-pty without --ignore-scripts

---

## Electron Integration Test Timeouts in CI

### Issue

Electron integration tests experience timeouts and assertion errors in CI, particularly on Linux with xvfb.

**Error messages:**

```
Error: Test timed out in 60000ms.
AssertionError: promise resolved instead of rejecting
```

### Root Cause

Multiple issues contribute to test failures:

1. Test setup conflicts with timeout configurations
2. Race conditions in async test logic
3. Worker pool communication issues in CI environment
4. Module state not properly reset between tests

### Solution

1. Use `forks` pool instead of default `threads` to avoid worker timeouts
2. Ensure `vi.resetModules()` is called in beforeEach to clear module state
3. Fix test logic to avoid race conditions in async operations
4. Configure appropriate timeouts for CI environment

### Implementation

```typescript
// vitest.integration.config.ts
export default defineConfig({
  test: {
    pool: 'forks',
    poolOptions: {
      forks: {
        maxForks: 2,
        minForks: 1,
      },
    },
    testTimeout: 60000,
    hookTimeout: 60000,
  },
})
```

### TODO

- [x] Configure forks pool for integration tests
- [x] Fix race conditions in ptyManager tests
- [x] Add vi.resetModules() to test setup
- [ ] Monitor CI stability after fixes
