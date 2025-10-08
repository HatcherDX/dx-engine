#!/bin/bash

# Clean Terminal Demo Runner
echo "🚀 Starting Terminal System Demo..."
echo "📝 Logs will be saved to demo.log"
echo "⌨️  Press Ctrl+C to stop"
echo ""

# Kill any existing demo processes
pkill -f "terminal-system/demo" 2>/dev/null

# Create log file
touch demo.log

# Run the demo with output redirected to log file
# But keep errors visible for debugging
pnpm dev 2>&1 | tee demo.log | grep -E "(VITE|ERROR|Creating terminal|✅)" &

# Store the process ID
DEMO_PID=$!

# Wait a moment for startup
sleep 2

echo "✅ Demo is running!"
echo "📂 Check demo.log for full output"
echo ""

# Keep the script running
wait $DEMO_PID