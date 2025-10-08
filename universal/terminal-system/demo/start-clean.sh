#!/bin/bash

# Terminal System Demo - Clean Start
clear

echo "╔════════════════════════════════════════════╗"
echo "║   🚀 Terminal System Demo with Zoom       ║"
echo "╚════════════════════════════════════════════╝"
echo ""
echo "Starting Electron app..."

# Kill any existing processes
pkill -f "terminal-system/demo" 2>/dev/null
sleep 1

# Start in background, suppress all output
(pnpm dev > demo.log 2>&1) &
DEMO_PID=$!

# Wait for app to start
sleep 3

# Check if process is running
if ps -p $DEMO_PID > /dev/null; then
    echo "✅ Demo is running (PID: $DEMO_PID)"
    echo ""
    echo "📋 Instructions:"
    echo "  • Electron window should be open"
    echo "  • Use zoom controls: +/- buttons"
    echo "  • Keyboard: Ctrl+Plus/Minus/0"
    echo ""
    echo "📂 Logs: tail -f demo.log"
    echo "🛑 Stop: kill $DEMO_PID"
    echo ""
    echo "Your terminal is free to use. The demo runs in background."
else
    echo "❌ Failed to start demo"
    echo "Check demo.log for errors"
fi