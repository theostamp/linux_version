#!/bin/bash
##
# 🔥 PRE-COMMIT TEST HOOK
# 
# Τρέχει αυτόματα πριν κάνεις commit
# Setup: chmod +x run_tests_before_commit.sh
#
# Usage:
#   ./run_tests_before_commit.sh
#
# Exit Codes:
#   0 = ✅ Tests passed, safe to commit
#   1 = ❌ Tests failed, DO NOT commit!
##

echo ""
echo "🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥"
echo "       PRE-COMMIT FINANCIAL TESTS - CHECKING SYSTEM INTEGRITY"
echo "🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥"
echo ""

# Run critical tests
docker exec linux_version-backend-1 python /app/run_critical_tests.py
EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ ✅ ✅ TESTS PASSED! SAFE TO COMMIT! ✅ ✅ ✅"
    echo ""
    exit 0
else
    echo "❌ ❌ ❌ TESTS FAILED! FIX BEFORE COMMITTING! ❌ ❌ ❌"
    echo ""
    echo "💡 Tip: Review the test output above and fix the issues"
    echo "💡 Then run './run_tests_before_commit.sh' again"
    echo ""
    exit 1
fi


