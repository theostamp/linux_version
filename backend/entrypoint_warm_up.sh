#!/bin/bash
# Frontend Warm-up Script for Docker Entrypoint
# ==============================================
# This script runs after the backend is fully initialized
# to warm up the frontend pages for fast loading

echo "🔥 Starting frontend warm-up process..."

# Wait for backend to be fully ready
sleep 10

# Check if frontend is available
if curl -s http://frontend:3000 > /dev/null 2>&1; then
    echo "✅ Frontend is reachable, starting warm-up..."

    # Run the Python warm-up script
    # Use internal Docker network hostname
    python /app/scripts/warm_up_frontend.py frontend 3000 &

    echo "🔥 Frontend warm-up running in background..."
else
    echo "⚠️ Frontend not reachable yet, skipping warm-up"
fi