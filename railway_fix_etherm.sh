#!/bin/bash
# Fix etherm2021@gmail.com user on Railway production

echo "🔧 Fixing etherm2021@gmail.com user on Railway..."
railway run python backend/fix_etherm_production.py

echo ""
echo "✅ Done! Check the output above for results."
