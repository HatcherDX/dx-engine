#!/bin/bash

# Terminal System Demo Launcher
echo "🚀 Starting Terminal System Demo with Zoom..."
echo ""
echo "📝 Instructions:"
echo "  - The demo will open in a new Electron window"
echo "  - Use +/- buttons or Ctrl+Plus/Minus/0 for zoom"
echo "  - Press Ctrl+C here to stop the demo"
echo ""

# Kill any existing processes
pkill -f "terminal-system/demo" 2>/dev/null

# Start the demo
pnpm dev