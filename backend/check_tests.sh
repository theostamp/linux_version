#!/bin/bash
# Script to check for potential test failures
# Run this locally to identify issues before CI

set -e

echo "🔍 Checking for syntax errors in Python files..."
find backend -name "*.py" -not -path "*/venv/*" -not -path "*/migrations/*" -exec python3 -m py_compile {} \; 2>&1 | head -20 || echo "✅ No syntax errors found"

echo ""
echo "🔍 Checking for import errors in test files..."
for test_file in backend/test_*.py; do
    if [ -f "$test_file" ]; then
        echo "Checking $test_file..."
        python3 -c "import sys; sys.path.insert(0, 'backend'); exec(open('$test_file').read())" 2>&1 | head -5 || echo "  ⚠️  Import check failed for $test_file"
    fi
done

echo ""
echo "✅ Basic checks complete"

