# Terminal System Integration Guide

## ⚠️ IMPORTANT: Use This System, Don't Create New Terminal Packages

The `@hatcherdx/terminal-system` is a complete, production-ready terminal implementation. There is no need to create separate terminal packages.

## Why Use terminal-system?

### Already Implemented Features:

- ✅ **Automatic backend detection** (node-pty, ConPTY, WinPTY, subprocess)
- ✅ **VSCode-style UI** with tabs and split panes
- ✅ **WebGL rendering** for performance
- ✅ **IPC Bridge** for Electron communication
- ✅ **Command runners** for Git and tasks
- ✅ **Read-only terminals** for system logs
- ✅ **Full xterm.js integration** with addons
- ✅ **Cross-platform support** (Windows, macOS, Linux)

## Quick Start Integration

### 1. In Electron Main Process

```typescript
import {
  EnhancedTerminalFactory,
  BackendDetector,
  IPCBridge,
} from '@hatcherdx/terminal-system'

// Initialize components
const backendDetector = new BackendDetector()
const terminalFactory = new EnhancedTerminalFactory()
const ipcBridge = new IPCBridge(ipcMain, mainWindow.webContents)

// Detect capabilities
const capabilities = await backendDetector.detectCapabilities()
console.log(`Using backend: ${capabilities.backend}`)

// Create terminal with best available backend
const terminal = await terminalFactory.createTerminal({
  id: 'terminal-1',
  shell: '/bin/zsh',
  cwd: process.env.HOME,
})
```

### 2. In Vue Components

```vue
<template>
  <div ref="terminalContainer"></div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import {
  TerminalUI,
  TabManager,
  TerminalInstance,
} from '@hatcherdx/terminal-system'

const terminalContainer = ref(null)

onMounted(() => {
  // Create UI components
  const tabManager = new TabManager()
  const terminalUI = new TerminalUI(tabManager)

  // Mount to DOM
  terminalUI.mount(terminalContainer.value)

  // Create terminal instance
  const terminal = new TerminalInstance('terminal-1', {
    shell: '/bin/zsh',
  })

  // Add to UI
  terminalUI.addTerminal(terminal)
})
</script>
```

### 3. For System/Timeline Terminals (Read-only)

```typescript
import { useSystemTerminals } from '@/composables/useSystemTerminals'

const { systemTerminal, timelineTerminal, initializeTerminals } =
  useSystemTerminals()

// Initialize read-only terminals
await initializeTerminals()
```

## Architecture Overview

```
@hatcherdx/terminal-system/
├── core/                    # Core terminal backend
│   ├── BackendDetector      # Auto-detects best PTY
│   ├── NodePtyBackend       # node-pty implementation
│   ├── SubprocessBackend    # Fallback implementation
│   ├── TerminalManager      # Manages terminal lifecycle
│   └── IPCBridge           # Electron IPC handling
├── terminal/               # UI Components
│   ├── TerminalUI          # Main UI controller
│   ├── TabManager          # Tab management
│   └── TerminalInstance    # Individual terminals
├── rendering/              # Performance optimization
│   └── WebGLTerminalAdapter # WebGL rendering
└── commands/               # Command execution
    ├── GitRunner           # Git operations
    └── TaskRunner          # Task execution
```

## Common Mistakes to Avoid

### ❌ DON'T: Create new terminal packages

```javascript
// WRONG - Don't create /client/terminal
import { Terminal } from '@xterm/xterm'
const term = new Terminal() // Direct xterm usage
```

### ✅ DO: Use terminal-system

```javascript
// CORRECT - Use existing system
import { TerminalInstance } from '@hatcherdx/terminal-system'
const term = new TerminalInstance('id', options)
```

### ❌ DON'T: Manually detect PTY backend

```javascript
// WRONG - Manual detection
if (process.platform === 'win32') {
  // Use ConPTY...
} else {
  // Use node-pty...
}
```

### ✅ DO: Use BackendDetector

```javascript
// CORRECT - Automatic detection
const detector = new BackendDetector()
const capabilities = await detector.detectCapabilities()
// Automatically uses best backend
```

### ❌ DON'T: Implement custom IPC

```javascript
// WRONG - Custom IPC
ipcMain.on('terminal-data', (event, data) => {
  // Manual handling...
})
```

### ✅ DO: Use IPCBridge

```javascript
// CORRECT - Use built-in bridge
const ipcBridge = new IPCBridge(ipcMain, webContents)
// Handles all IPC automatically
```

## Testing the System

The demo in `/universal/terminal-system/demo` shows proper usage:

```bash
cd universal/terminal-system/demo
pnpm install
pnpm electron:dev  # Run with Electron
pnpm dev          # Run in browser (mock mode)
```

## Key Benefits

1. **No Duplication**: One system, used everywhere
2. **Battle-tested**: Already working in production
3. **Cross-platform**: Handles Windows, macOS, Linux automatically
4. **Performance**: WebGL rendering, efficient IPC
5. **Feature-complete**: Tabs, splits, themes, all included
6. **Maintainable**: Single source of truth for terminal functionality

## Migration from Custom Terminal

If you've created a custom terminal package:

1. Remove the custom package directory
2. Update imports to use `@hatcherdx/terminal-system`
3. Replace direct xterm.js usage with `TerminalInstance`
4. Use `BackendDetector` instead of manual PTY detection
5. Use `IPCBridge` for Electron communication

## Support

The terminal-system is actively maintained and used throughout the Hatcher DX application. For issues or questions, check the existing implementation in:

- `apps/electron/src/terminalStrategy.ts` - Backend integration
- `apps/web/src/composables/useSystemTerminals.ts` - Vue integration
- `apps/web/src/components/organisms/TerminalView.vue` - UI component
