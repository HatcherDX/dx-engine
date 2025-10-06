# Terminal System Demo - With Zoom Feature 🔍

Demo application showcasing the @hatcherdx/terminal-system with zoom functionality for accessibility.

## Features Demonstrated

- **Terminal with zoom controls** (50% to 200% font size)
- **Keyboard shortcuts** (Ctrl+Plus/Minus/0 for zoom)
- **Multi-tab terminal interface** (VSCode-style)
- **Automatic backend detection** (subprocess fallback for simplicity)
- **WebGL rendering** for optimal performance
- **IPC communication** with Electron

## Architecture

This demo uses the existing terminal-system components:

- `TerminalUI` - Main UI component with tab management
- `TabManager` - Handles multiple terminal tabs
- `TerminalInstance` - Individual terminal instances
- `EnhancedTerminalFactory` - Creates terminals with best available backend
- `BackendDetector` - Automatically selects PTY implementation
- `IPCBridge` - Handles Electron IPC communication

## Running the Demo

### Quick Start

```bash
cd universal/terminal-system/demo
pnpm install
pnpm dev
```

The demo will:

1. Start Vite dev server on http://localhost:5175
2. Launch Electron window with terminal
3. Show zoom controls in the UI

### Alternative: Using the start script

```bash
./start.sh
```

### Alternative: Run components separately

```bash
# Terminal 1 - Start Vite
pnpm dev:vite

# Terminal 2 - Start Electron
pnpm dev:electron
```

## Key Components Used

```typescript
import {
  TerminalUI,
  TabManager,
  EnhancedTerminalFactory,
  BackendDetector,
} from '@hatcherdx/terminal-system'
```

## Zoom Feature

The zoom functionality allows users to adjust terminal font size:

- **Range**: 50% to 200%
- **Step size**: 10%
- **Base font**: 14px
- **Controls**:
  - UI buttons (+/-/Reset)
  - Keyboard shortcuts (Ctrl+Plus/Minus/0)

## Troubleshooting

### Terminal shows but no output?

- Open DevTools (F12) and check console
- Look for `[Frontend] Received data...` logs
- Try typing a command and pressing Enter

### Process stays in foreground?

- Use Ctrl+C to stop
- Run with `./start.sh` for cleaner startup

## Benefits Over Creating New Package

1. **No code duplication** - Uses existing robust implementation
2. **Battle-tested** - Already integrated in main app
3. **Zoom feature** - Accessibility enhancement for better UX
4. **Simple subprocess backend** - Easy to understand and debug
5. **VSCode-style UI** - Familiar interface patterns
