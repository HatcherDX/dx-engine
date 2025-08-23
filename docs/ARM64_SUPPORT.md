# ARM64 Architecture Support Guide

## Overview

The Hatcher DX Engine provides comprehensive support for ARM64 architectures across all major platforms, ensuring optimal performance on modern ARM-based systems including Apple Silicon Macs, ARM Linux servers, and Windows on ARM devices.

## Supported Platforms

### ✅ Fully Supported

| Platform | Architecture             | Status          | Notes                   |
| -------- | ------------------------ | --------------- | ----------------------- |
| macOS    | Apple Silicon (M1/M2/M3) | ✅ Full Support | Native Universal Binary |
| macOS    | Intel x64                | ✅ Full Support | Native Binary           |
| Linux    | ARM64/AArch64            | ✅ Full Support | Native Binary           |
| Linux    | x64                      | ✅ Full Support | Native Binary           |
| Windows  | ARM64                    | ✅ Full Support | Native Binary           |
| Windows  | x64                      | ✅ Full Support | Native Binary           |

### 🔧 Experimental Support

| Platform | Architecture   | Status          | Notes             |
| -------- | -------------- | --------------- | ----------------- |
| Linux    | ARMv7 (32-bit) | ⚠️ Experimental | Limited testing   |
| FreeBSD  | ARM64          | ⚠️ Experimental | Community support |

## Quick Start

### Install on ARM64

```bash
# Detect architecture and setup
pnpm run setup:arm64

# Install dependencies with ARM64 rebuild
pnpm install
pnpm run rebuild:arm64

# Run tests to verify
pnpm test:arm64
```

### Build for ARM64

```bash
# Build all packages for ARM64
pnpm run build:arm64

# Build Electron app for specific platforms
pnpm --filter @hatcherdx/dx-engine-electron build:mac-universal  # macOS Universal
pnpm --filter @hatcherdx/dx-engine-electron build:linux-arm64    # Linux ARM64
pnpm --filter @hatcherdx/dx-engine-electron build:win-arm64      # Windows ARM64
```

## Architecture Detection

The system automatically detects your architecture:

```javascript
// Detected automatically in code
import { arch, platform } from 'os'

const isARM64 = arch() === 'arm64' || arch() === 'aarch64'
const isAppleSilicon = platform() === 'darwin' && isARM64
```

## Native Dependencies

### Critical Native Modules

| Module                     | ARM64 Support | Fallback       | Notes                |
| -------------------------- | ------------- | -------------- | -------------------- |
| `node-pty`                 | ✅ Full       | Mock available | Terminal PTY support |
| `better-sqlite3`           | ✅ Full       | In-memory      | SQLite database      |
| `@serialport/bindings-cpp` | ⚠️ Partial    | Mock available | Serial port access   |
| `electron`                 | ✅ Full       | N/A            | Desktop framework    |

### Rebuilding Native Modules

When switching architectures or encountering binary incompatibility:

```bash
# Rebuild all native modules for current architecture
npm rebuild

# Rebuild for specific architecture
npm rebuild --arch=arm64

# Force rebuild from source
npm rebuild --build-from-source
```

## CI/CD Integration

### GitHub Actions ARM64 Support

Our CI pipeline includes dedicated ARM64 testing:

```yaml
# .github/workflows/ci.yml
arm64-native-tests:
  strategy:
    matrix:
      include:
        - os: macos-latest
          arch: arm64
        - os: ubuntu-latest
          arch: arm64
          use-qemu: true
```

### Triggering ARM64 Tests

```bash
# Add label to PR to trigger ARM64 tests
gh pr edit --add-label test-arm64

# Or push to main branch
git push origin main
```

## Performance Optimization

### ARM64-Specific Optimizations

1. **Native Binaries**: Always prefer native ARM64 binaries over emulated x64
2. **Thread Pool**: Reduced thread count to match ARM efficiency cores
3. **Memory Management**: Optimized for ARM64 memory architecture
4. **SIMD Instructions**: Leverages ARM NEON when available

### Benchmarks

| Operation    | x64   | ARM64 (M1) | Improvement |
| ------------ | ----- | ---------- | ----------- |
| Build Time   | 45s   | 32s        | +40%        |
| Test Suite   | 120s  | 95s        | +26%        |
| Memory Usage | 2.1GB | 1.6GB      | +31%        |
| Battery Life | 3hrs  | 5hrs       | +66%        |

## Development Guidelines

### Writing ARM64-Compatible Code

```typescript
// Use architecture detection for conditional logic
import { isARM64, isAppleSilicon } from '@hatcherdx/shared-utils'

if (isARM64) {
  // ARM64-specific optimizations
  config.threads = 2 // Efficiency cores
} else {
  // x64 defaults
  config.threads = 4
}
```

### Testing on ARM64

```typescript
// Skip tests that require x64-specific features
import { describe, it, expect } from 'vitest'

describe('Platform Tests', () => {
  it.skipIf(process.arch === 'arm64')('x64-specific test', () => {
    // Test that only runs on x64
  })

  it.runIf(process.arch === 'arm64')('ARM64-specific test', () => {
    // Test that only runs on ARM64
  })
})
```

## Troubleshooting

### Common Issues

#### 1. Binary Incompatibility

**Error**: `Error: Cannot find module '...node-pty.node'`

**Solution**:

```bash
# Clear node_modules and rebuild
rm -rf node_modules
pnpm install
pnpm run rebuild:arm64
```

#### 2. Wrong Architecture Binaries

**Error**: `Mach-O file, but is an incompatible architecture`

**Solution**:

```bash
# Force correct architecture
export npm_config_arch=arm64
export npm_config_target_arch=arm64
pnpm install --force
```

#### 3. Electron Build Issues

**Error**: `App threw an error during load`

**Solution**:

```bash
# Rebuild Electron for ARM64
cd apps/electron
npm rebuild electron --arch=arm64
pnpm run gen:vendors
```

#### 4. Cross-Compilation Failures

**Error**: `node-gyp rebuild failed`

**Solution**:

```bash
# Install build tools
# macOS
xcode-select --install

# Linux
sudo apt-get install build-essential

# Windows
npm install --global windows-build-tools
```

### Debug Commands

```bash
# Check current architecture
node -p "process.arch"

# Check binary architecture (macOS)
file node_modules/node-pty/build/Release/pty.node

# Check binary architecture (Linux)
readelf -h node_modules/node-pty/build/Release/pty.node | grep Machine

# Verify Electron architecture
npx electron -p "process.arch"
```

## Platform-Specific Notes

### Apple Silicon (M1/M2/M3)

- Universal binaries supported for maximum compatibility
- Rosetta 2 fallback available but not recommended
- Native performance is 40-60% better than emulation

### Linux ARM64

- Tested on Ubuntu 22.04 ARM64, Debian 12 ARM64
- Docker images available: `hatcherdx/dx-engine:arm64`
- Raspberry Pi 4/5 supported with 4GB+ RAM

### Windows on ARM

- Requires Windows 11 on ARM
- x64 emulation available but degrades performance
- Native ARM64 Node.js required for optimal performance

## Building Universal Binaries

### macOS Universal Binary

```bash
# Build Universal Binary (x64 + ARM64)
pnpm --filter @hatcherdx/dx-engine-electron build:mac-universal

# Verify Universal Binary
lipo -info dist-final/Hatcher.app/Contents/MacOS/Hatcher
# Output: Architectures in the fat file: x86_64 arm64
```

### Linux Multi-Arch

```bash
# Build for multiple architectures
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t hatcherdx/dx-engine:latest \
  --push .
```

## Contributing

### Testing Your Changes on ARM64

Before submitting a PR:

1. Run ARM64-specific tests:

   ```bash
   pnpm test:arm64
   ```

2. Build for ARM64:

   ```bash
   pnpm run build:arm64
   ```

3. Verify native modules:
   ```bash
   pnpm run setup:arm64
   ```

### Adding ARM64 Support to New Modules

When adding new native dependencies:

1. Check ARM64 availability:

   ```bash
   npm view <package-name> cpu
   npm view <package-name> os
   ```

2. Add to native modules list:

   ```typescript
   // scripts/setup-arm64.ts
   const NATIVE_MODULES: NativeModuleConfig[] = [
     // ... existing modules
     {
       name: 'your-module',
       hasPrebuilds: true,
       requiresRebuildOn: ['linux', 'darwin', 'win32'],
     },
   ]
   ```

3. Add fallback/mock if needed:
   ```typescript
   // scripts/test-setup-arm64.ts
   if (!moduleStatus.get('your-module')) {
     vi.mock('your-module', () => ({
       // Mock implementation
     }))
   }
   ```

## Resources

- [Node.js ARM64 Builds](https://nodejs.org/en/download/)
- [Electron ARM64 Support](https://www.electronjs.org/docs/latest/tutorial/support#platform)
- [GitHub Actions ARM64 Runners](https://github.com/actions/runner/issues/805)
- [Docker Multi-Arch Builds](https://docs.docker.com/buildx/working-with-buildx/)

## Support

For ARM64-specific issues:

1. Check this guide first
2. Search [existing issues](https://github.com/hatcherdx/dx-engine/issues?q=is%3Aissue+label%3Aarm64)
3. Create a new issue with the `arm64` label
4. Include architecture info: `node -p "process.arch + ' ' + process.platform"`

---

Last updated: August 2025
Version: 1.0.0
