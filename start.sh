#!/bin/bash

# Start SubManager - Subscription Management Application

echo "🚀 Starting SubManager..."
echo ""

# Start backend in background
echo "📡 Starting backend server..."
cd backend && node server.js &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 2

# Start frontend
echo "🎨 Starting frontend..."
cd ../frontend && npm run dev

# Cleanup function
cleanup() {
    echo ""
    echo "🛑 Shutting down servers..."
    kill $BACKEND_PID
    exit 0
}

# Trap Ctrl+C
trap cleanup INT

# Keep script running
wait
