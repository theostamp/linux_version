#!/bin/bash
# Script to remove trailing whitespace from source files

echo "Cleaning trailing whitespace from source files..."

# Find all TypeScript/JavaScript files and remove trailing whitespace
find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -exec sed -i 's/[[:space:]]*$//' {} \;

echo "Done! Trailing whitespace removed."

