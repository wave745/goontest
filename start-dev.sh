#!/bin/bash

# Start both frontend and backend development servers
echo "🚀 Starting GoonHub Development Servers..."

# Install dependencies if node_modules is missing or incomplete
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
    echo "📦 Installing dependencies..."
    npm ci
fi

# Start backend server in background
echo "📡 Starting backend server on port 5000..."
npm run dev &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 2

# Start frontend server in background
echo "🎨 Starting frontend server on port 3000..."
npx vite --port 3000 &
FRONTEND_PID=$!

# Wait a moment for frontend to start
sleep 3

echo "✅ Both servers are starting up!"
echo "📡 Backend API: http://localhost:5000"
echo "🎨 Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers"

# Function to cleanup processes on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "✅ Servers stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Wait for both processes
wait
