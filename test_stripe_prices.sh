#!/bin/bash

# Test Stripe Prices Creation
# Run this after Railway redeploys with correct Stripe keys

echo "🧪 Testing Stripe Prices Creation..."
echo ""

# 1. Get admin token
echo "1️⃣ Getting admin token..."
ADMIN_TOKEN=$(curl -s -X POST "https://linuxversion-production.up.railway.app/api/users/login/" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.localhost","password":"admin123456"}' | python3 -c "import sys, json; print(json.load(sys.stdin)['access'])" 2>/dev/null)

if [ -z "$ADMIN_TOKEN" ]; then
    echo "❌ Failed to get admin token"
    exit 1
fi

echo "✅ Got admin token"
echo ""

# 2. Call initialize-stripe-prices
echo "2️⃣ Calling /api/billing/initialize-stripe-prices..."
RESPONSE=$(curl -s -X POST "https://linuxversion-production.up.railway.app/api/billing/initialize-stripe-prices" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

echo "$RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('output', data))" 2>/dev/null || echo "$RESPONSE"
echo ""

# 3. Verify prices were created
echo "3️⃣ Verifying Stripe prices..."
curl -s "https://linuxversion-production.up.railway.app/api/billing/plans/" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print('📊 Plans Status:')
print()
for plan in data['results']:
    print(f\"  {plan['name']}:\")
    print(f\"    Product ID: {plan.get('stripe_product_id', 'MISSING')}\")
    print(f\"    Monthly Price: {plan.get('stripe_price_id_monthly', 'MISSING')}\")
    print(f\"    Yearly Price: {plan.get('stripe_price_id_yearly', 'MISSING')}\")
    print()
    
# Check if all have prices
all_have_prices = all(
    plan.get('stripe_product_id') and plan.get('stripe_price_id_monthly')
    for plan in data['results']
)

if all_have_prices:
    print('✅ All plans have Stripe prices!')
    print('🎉 Ready to test checkout flow!')
else:
    print('❌ Some plans are missing Stripe prices')
    print('⚠️  Check the initialization output above for errors')
" 2>/dev/null

echo ""
echo "Done!"

