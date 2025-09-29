#!/bin/bash

echo "🔄 WSL2 RESTART WITH NEW CONFIGURATION"
echo "======================================"

echo ""
echo "📋 Current WSL2 Configuration:"
echo "   Memory: 8GB"
echo "   Processors: 4"
echo "   Swap: 2GB"
echo "   Nested Virtualization: Enabled"
echo "   Networking: Mirrored"

echo ""
echo "⚠️  IMPORTANT: This will restart WSL2 and close all terminals"
echo "   Make sure to save any important work before proceeding"

echo ""
read -p "Do you want to restart WSL2 now? (y/N): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "🔄 Restarting WSL2..."
    echo "   This will close this terminal in a few seconds"
    
    # Give user time to read the message
    sleep 3
    
    # Restart WSL2
    wsl --shutdown
    
    echo "✅ WSL2 restart initiated"
    echo "   Please wait for WSL2 to restart and then open a new terminal"
    echo "   The new configuration will be active"
    
else
    echo ""
    echo "❌ WSL2 restart cancelled"
    echo ""
    echo "💡 To apply the new configuration later:"
    echo "   1. Close all WSL2 terminals"
    echo "   2. Run: wsl --shutdown"
    echo "   3. Open a new WSL2 terminal"
    echo "   4. Run: ./test_docker_connection.sh"
fi
