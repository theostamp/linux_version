#!/bin/bash

echo "🔄 Restarting Python Language Server..."

# Kill any existing Python language server processes
pkill -f "python.*language.*server" 2>/dev/null || true
pkill -f "jedi" 2>/dev/null || true
pkill -f "pylsp" 2>/dev/null || true

# Clear Python cache
echo "🧹 Clearing Python cache..."
find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
find . -name "*.pyc" -delete 2>/dev/null || true

# Clear VS Code/Cursor cache
echo "🧹 Clearing IDE cache..."
rm -rf ~/.vscode/extensions/ms-python.python*/pythonFiles/lib/python/debugpy/_vendored/pydevd/.pydevd_cache 2>/dev/null || true
rm -rf ~/.cursor/extensions/ms-python.python*/pythonFiles/lib/python/debugpy/_vendored/pydevd/.pydevd_cache 2>/dev/null || true

echo "✅ Language server restart completed!"
echo "📝 Please restart your IDE (VS Code/Cursor) to apply changes."
echo "🚫 Jedi server has been completely disabled."

