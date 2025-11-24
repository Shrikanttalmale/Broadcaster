#!/bin/bash

# Broadcaster Development Server Startup Script

echo "🚀 Starting Broadcaster Development Environment..."

# Check Node.js
echo "✓ Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+"
    exit 1
fi

echo "  Node version: $(node --version)"
echo "  NPM version: $(npm --version)"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing root dependencies..."
    npm install
fi

# Install workspace dependencies
for workspace in main api ui; do
    if [ ! -d "$workspace/node_modules" ]; then
        echo "📦 Installing $workspace dependencies..."
        npm install -w $workspace
    fi
done

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

# Start development
echo ""
echo "✅ All systems ready!"
echo ""
echo "Starting services..."
echo "  • API Server: http://localhost:3001"
echo "  • React UI: http://localhost:3000"
echo "  • Electron: Starting..."
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

npm run dev
