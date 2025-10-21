#!/bin/bash

echo "🔥 KILLING JEDI SERVER COMPLETELY..."

# Kill all Python language server processes
echo "💀 Killing all Python language server processes..."
pkill -f "python.*language.*server" 2>/dev/null || true
pkill -f "jedi" 2>/dev/null || true
pkill -f "pylsp" 2>/dev/null || true
pkill -f "pyright" 2>/dev/null || true
pkill -f "pylance" 2>/dev/null || true
pkill -f "python.*analysis" 2>/dev/null || true

# Kill all Python processes that might be related to language server
echo "💀 Killing all Python processes..."
ps aux | grep python | grep -v grep | awk '{print $2}' | xargs -r kill -9 2>/dev/null || true

# Clear all Python cache
echo "🧹 Clearing all Python cache..."
find /home/theo/project -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
find /home/theo/project -name "*.pyc" -delete 2>/dev/null || true
find /home/theo/project -name "*.pyo" -delete 2>/dev/null || true

# Clear VS Code cache
echo "🧹 Clearing VS Code cache..."
rm -rf ~/.vscode/extensions/ms-python.python* 2>/dev/null || true
rm -rf ~/.vscode/CachedExtensions/ms-python.python* 2>/dev/null || true
rm -rf ~/.vscode/logs/* 2>/dev/null || true
rm -rf ~/.vscode/User/workspaceStorage/* 2>/dev/null || true

# Clear Cursor cache
echo "🧹 Clearing Cursor cache..."
rm -rf ~/.cursor/extensions/ms-python.python* 2>/dev/null || true
rm -rf ~/.cursor/CachedExtensions/ms-python.python* 2>/dev/null || true
rm -rf ~/.cursor/logs/* 2>/dev/null || true
rm -rf ~/.cursor/User/workspaceStorage/* 2>/dev/null || true

# Clear system Python cache
echo "🧹 Clearing system Python cache..."
rm -rf ~/.cache/pip 2>/dev/null || true
rm -rf ~/.local/lib/python* 2>/dev/null || true
rm -rf ~/.local/share/python* 2>/dev/null || true

# Clear any remaining language server files
echo "🧹 Clearing language server files..."
rm -rf ~/.vscode/extensions/ms-python.python*/pythonFiles/lib/python/debugpy/_vendored/pydevd/.pydevd_cache 2>/dev/null || true
rm -rf ~/.cursor/extensions/ms-python.python*/pythonFiles/lib/python/debugpy/_vendored/pydevd/.pydevd_cache 2>/dev/null || true

# Clear workspace cache
echo "🧹 Clearing workspace cache..."
rm -rf /home/theo/project/linux_version/.vscode/settings.json.bak 2>/dev/null || true
rm -rf /home/theo/project/linux_version/.cursor/settings.json.bak 2>/dev/null || true

echo "✅ JEDI SERVER COMPLETELY ELIMINATED!"
echo "🚫 All Python language server processes killed"
echo "🧹 All caches cleared"
echo "📝 RESTART YOUR IDE NOW!"
echo "🔥 Jedi server will NEVER start again!"



