#!/bin/bash

# Railway Fix Script for Theo User
# This script fixes the role and permissions for etherm2021@gmail.com

echo "🚀 Starting Theo User Fix on Railway..."
echo "=========================================="

# Run the fix script
python /app/fix_theo_user.py

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Fix completed successfully!"
    echo ""
    echo "📝 User should now:"
    echo "   1. Logout from the application"
    echo "   2. Login again"
    echo "   3. See 'Διαχειριστής' in header"
    echo "   4. Have access to Financial Management"
    echo ""
else
    echo ""
    echo "❌ Fix failed! Check the error messages above."
    echo ""
    exit 1
fi

