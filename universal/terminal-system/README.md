# @hatcherdx/terminal-system

Robust terminal system based on VSCode architecture for DX Engine with enhanced backend detection and automatic fallbacks.

## Features

- **🎯 Smart Backend Detection**: Automatically detects the best available terminal backend
- **🔄 VS Code-style Fallbacks**: Implements the same fallback strategy as VS Code
- **⚡ High Performance**: Optimized for speed with intelligent caching
- **🛠️ Multiple Backends**: Supports node-pty, ConPTY, winpty, and subprocess backends
- **🔧 Cross-platform**: Works on Windows, macOS, and Linux
- **📊 Capability Awareness**: Each backend reports its supported features
- **🎨 Rich Features**: Colors, resize, interactivity, and command history support

## Backend Priorities

The system automatically selects the best available backend in this order:

1. **node-pty** (Highest priority) - Full PTY support, cross-platform
2. **ConPTY** (Windows 10+) - Native Windows console API
3. **winpty** (Older Windows) - Legacy Windows PTY support
4. **subprocess** (Fallback) - Basic process spawning

## Installation

```bash
pnpm add @hatcherdx/terminal-system
```

## Development Scripts

This package includes several utility scripts for development and debugging:

```bash
# Setup Node.js 22 and rebuild node-pty
pnpm setup-node

# Test node-pty functionality
pnpm test-pty

# Verify node-pty installation
pnpm verify-pty

# Get Electron debug console script
pnpm debug-console
```

## Usage

### Basic Terminal Creation

```typescript
import { TerminalManager } from '@hatcherdx/terminal-system'

const terminalManager = new TerminalManager()

// Create a terminal with automatic backend detection
const terminal = await terminalManager.createTerminal({
  name: 'My Terminal',
  shell: '/bin/zsh', // Optional: defaults to system shell
  cwd: '/path/to/working/dir', // Optional: defaults to home directory
  env: { CUSTOM_VAR: 'value' }, // Optional: additional environment variables
})

// Send commands to the terminal
terminalManager.sendData(terminal.id, 'ls -la\\n')

// Listen for terminal output
terminalManager.on('terminalData', (event) => {
  console.log(`Terminal ${event.id}: ${event.data}`)
})
```

### Direct Backend Usage

```typescript
import {
  EnhancedTerminalFactory,
  BackendDetector,
} from '@hatcherdx/terminal-system'

// Get current system capabilities
const capabilities = await BackendDetector.detectBestBackend()
console.log(`Using ${capabilities.backend} backend`)
console.log(`Capabilities:`, capabilities)

// Create a terminal process directly
const { process, capabilities } = await EnhancedTerminalFactory.createTerminal({
  shell: '/bin/bash',
  cwd: process.cwd(),
  cols: 80,
  rows: 24,
})

// Handle terminal events
process.on('data', (data) => console.log(data))
process.on('exit', ({ exitCode }) => console.log(`Exited: ${exitCode}`))

// Write to terminal
process.write('echo "Hello World"\\n')
```

### Backend Testing

```typescript
import { EnhancedTerminalFactory } from '@hatcherdx/terminal-system'

// Test all available backends
const results = await EnhancedTerminalFactory.testAllBackends()

for (const [backend, result] of Object.entries(results)) {
  console.log(`${backend}: ${result.available ? 'Available' : 'Not available'}`)
  if (result.error) {
    console.log(`  Error: ${result.error}`)
  }
}
```

## Backend Capabilities

| Backend    | Resize | Colors | Interactive | History | Reliability |
| ---------- | ------ | ------ | ----------- | ------- | ----------- |
| node-pty   | ✅     | ✅     | ✅          | ✅      | High        |
| ConPTY     | ✅     | ✅     | ✅          | ✅      | High        |
| winpty     | ✅     | ✅     | ✅          | ❌      | Medium      |
| subprocess | ❌     | ✅     | ✅          | ✅      | Medium      |

## Architecture

The terminal system follows VS Code's architecture with these key components:

- **BackendDetector**: Automatically detects available terminal backends
- **TerminalBackend**: Abstract base class for all backend implementations
- **EnhancedTerminalFactory**: Factory for creating terminals with automatic backend selection
- **ProcessManager**: Manages terminal processes with the enhanced backend system
- **TerminalManager**: High-level API for terminal management

## Development

### Building

```bash
pnpm build
```

### Testing

```bash
pnpm test
```

### Linting

```bash
pnpm lint
```

## Migration from Previous Version

If you were using the old terminal system, the new enhanced version is backward compatible. However, you can now take advantage of automatic backend detection:

```typescript
// Old way (still works)
const terminal = await terminalManager.createTerminal({ name: 'Terminal' })

// New way (recommended) - automatically selects best backend
const terminal = await terminalManager.createTerminal({
  name: 'Terminal',
  // Additional options are automatically optimized based on detected backend
})
```

## License

MIT © [Chriss Mejia](mailto:chriss@hatche.rs)
