#!/bin/bash
# Direct API test για expense_breakdown

echo "================================"
echo "TEST: Direct API Call"
echo "================================"
echo ""

docker exec linux_version-backend-1 bash -c '
curl -s "http://localhost:8000/api/financial/dashboard/summary/?building_id=1&month=2025-10" \
  -H "Content-Type: application/json" \
  | python3 -m json.tool \
  | grep -A 20 "expense_breakdown"
'

echo ""
echo "================================"

