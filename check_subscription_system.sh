#!/bin/bash
echo "=== SUBSCRIPTION SYSTEM STATUS ==="
echo ""

echo "1. Docker Services:"
docker compose ps | grep -E "(backend|celery|db|redis)"
echo ""

echo "2. Recent Webhooks (last 10):"
docker compose logs backend | grep -i "webhook" | tail -10
echo ""

echo "3. Pending Checkouts:"
docker compose exec db psql -U postgres -t -c "
SELECT COUNT(*) FROM users_customuser WHERE stripe_checkout_session_id IS NOT NULL;
"

echo "4. Active Subscriptions:"
docker compose exec db psql -U postgres -t -c "
SELECT status, COUNT(*) FROM billing_usersubscription GROUP BY status;
"

echo "5. Recent Errors:"
docker compose logs backend | grep -i "error" | tail -5