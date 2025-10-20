# 🧪 Πλάνο Ελέγχου Συστήματος Συνδρομών

## 📋 Περιεχόμενα
1. [Επισκόπηση Συστήματος](#επισκόπηση-συστήματος)
2. [Προετοιμασία Περιβάλλοντος](#προετοιμασία-περιβάλλοντος)
3. [Σενάρια Δοκιμών](#σενάρια-δοκιμών)
4. [Εντολές Ελέγχου](#εντολές-ελέγχου)
5. [Αντιμετώπιση Προβλημάτων](#αντιμετώπιση-προβλημάτων)

---

## 🔍 Επισκόπηση Συστήματος

### Βασική Ροή Συνδρομής:
```
1. Χρήστης → Εγγραφή → Login με Google
2. Επιλογή πλάνου → Stripe Checkout → Πληρωμή
3. Stripe Webhook → Δημιουργία Tenant → Ενεργοποίηση
4. Redirect σε subdomain → Αυτόματο login
```

### Κρίσιμα Endpoints:
- `POST /api/billing/create-checkout-session/` - Δημιουργία Stripe session
- `GET /api/billing/subscription-status/<session_id>/` - Έλεγχος κατάστασης
- `POST /api/billing/webhook/stripe/` - Webhook handler

---

## 🛠️ Προετοιμασία Περιβάλλοντος

### 1. Έλεγχος Docker Containers
```bash
# Βεβαιωθείτε ότι τρέχουν όλα τα services
cd /home/theo/project/linux_version
docker compose ps

# Πρέπει να δείτε:
# - backend (port 18000)
# - frontend
# - nginx (port 8080)
# - db (port 15432)
# - redis
# - celery
# - celery-beat
```

### 2. Έλεγχος Logs
```bash
# Backend logs
docker compose logs -f backend

# Celery logs (για async tasks)
docker compose logs -f celery

# Database logs
docker compose logs -f db
```

### 3. Ρυθμίσεις Stripe
```bash
# Ελέγξτε ότι υπάρχουν στο .env:
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_MOCK_MODE=True  # Για development
```

---

## 🧪 Σενάρια Δοκιμών

### Τεστ 1: Νέος Χρήστης - Πλήρης Ροή
```bash
# 1. Δημιουργία νέου χρήστη
curl -X POST http://localhost:8080/api/users/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test_user_$(date +%s)@example.com",
    "password": "TestPass123!",
    "first_name": "Test",
    "last_name": "User"
  }'

# 2. Login (κρατήστε το token)
curl -X POST http://localhost:8080/api/users/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "YOUR_TEST_EMAIL",
    "password": "TestPass123!"
  }'

# 3. Δημιουργία Checkout Session
curl -X POST http://localhost:8080/api/billing/create-checkout-session/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "plan_id": 3,
    "success_url": "http://localhost:3000/payment/success",
    "cancel_url": "http://localhost:3000/payment/cancel"
  }'

# Κρατήστε το session_id από την απάντηση
```

### Τεστ 2: Προσομοίωση Webhook
```bash
# Χρήση του simulator
cd /home/theo/project/linux_version
docker compose exec backend python simulate_webhook.py YOUR_SESSION_ID

# Αναμενόμενο αποτέλεσμα:
# ✅ Webhook simulated successfully for session YOUR_SESSION_ID
```

### Τεστ 3: Έλεγχος Status Polling
```bash
# Polling για status (όπως κάνει το frontend)
while true; do
  curl -X GET http://localhost:8080/api/billing/subscription-status/YOUR_SESSION_ID/
  echo ""
  sleep 3
done

# Αναμενόμενες απαντήσεις:
# 1. {"status":"pending"} - Δεν έχει ξεκινήσει
# 2. {"status":"processing"} - Σε επεξεργασία
# 3. {"status":"completed","subdomain":"...","token":"..."} - Ολοκληρώθηκε
# 4. {"status":"failed","message":"..."} - Απέτυχε
```

### Τεστ 4: Έλεγχος Βάσης Δεδομένων
```bash
# Έλεγχος χρήστη
docker compose exec db psql -U postgres -c "
SELECT id, email, tenant_id, stripe_checkout_session_id, is_active 
FROM users_customuser 
WHERE email='YOUR_TEST_EMAIL';
"

# Έλεγχος subscription
docker compose exec db psql -U postgres -c "
SELECT status, plan_id, stripe_subscription_id, tenant_domain 
FROM billing_usersubscription 
WHERE user_id=(SELECT id FROM users_customuser WHERE email='YOUR_TEST_EMAIL');
"

# Έλεγχος tenant
docker compose exec db psql -U postgres -c "
SELECT schema_name, paid_until, on_trial 
FROM tenants_client 
WHERE id=(SELECT tenant_id FROM users_customuser WHERE email='YOUR_TEST_EMAIL');
"
```

---

## 🔧 Εντολές Ελέγχου

### Καθαρισμός Δοκιμαστικών Δεδομένων
```bash
# Διαγραφή session ID από χρήστη (για επαναδοκιμή)
docker compose exec db psql -U postgres -c "
UPDATE users_customuser 
SET stripe_checkout_session_id = NULL 
WHERE email='YOUR_TEST_EMAIL';
"

# Διαγραφή subscription για νέα δοκιμή
docker compose exec db psql -U postgres -c "
DELETE FROM billing_usersubscription 
WHERE user_id=(SELECT id FROM users_customuser WHERE email='YOUR_TEST_EMAIL');
"
```

### Έλεγχος Webhook Logs
```bash
# Αναζήτηση webhook events
docker compose logs backend | grep -i webhook

# Αναζήτηση subscription creation
docker compose logs backend | grep -i "subscription created"

# Αναζήτηση σφαλμάτων
docker compose logs backend | grep -i error | tail -20
```

### Χρήσιμες SQL Queries
```sql
-- Όλοι οι χρήστες με pending checkout
SELECT email, stripe_checkout_session_id, created_at 
FROM users_customuser 
WHERE stripe_checkout_session_id IS NOT NULL;

-- Subscriptions ανά status
SELECT status, COUNT(*) 
FROM billing_usersubscription 
GROUP BY status;

-- Tenants που δημιουργήθηκαν σήμερα
SELECT schema_name, created_on 
FROM tenants_client 
WHERE DATE(created_on) = CURRENT_DATE;
```

---

## 🚨 Αντιμετώπιση Προβλημάτων

### Πρόβλημα 1: "Workspace setup is taking longer than expected"
**Αιτίες:**
- Webhook δεν έφτασε ποτέ
- Webhook απέτυχε
- Wrong session ID

**Λύση:**
```bash
# 1. Ελέγξτε αν ο χρήστης έχει session ID
docker compose exec db psql -U postgres -c "
SELECT stripe_checkout_session_id FROM users_customuser WHERE email='USER_EMAIL';
"

# 2. Τρέξτε manual webhook
docker compose exec backend python simulate_webhook.py SESSION_ID

# 3. Ελέγξτε logs για σφάλματα
docker compose logs backend | grep -A5 -B5 "SESSION_ID"
```

### Πρόβλημα 2: "Invalid subscription state"
**Αιτία:** Ο χρήστης έχει tenant αλλά όχι active subscription

**Λύση:**
```bash
# Ελέγξτε subscription status
docker compose exec db psql -U postgres -c "
SELECT status FROM billing_usersubscription WHERE user_id=USER_ID;
"

# Αν είναι 'trial' αντί για 'trialing', διορθώστε:
docker compose exec db psql -U postgres -c "
UPDATE billing_usersubscription SET status='trialing' WHERE user_id=USER_ID;
"
```

### Πρόβλημα 3: Connection Refused στον Simulator
**Αιτία:** Wrong URL στον simulator

**Έλεγχος:**
```bash
# Δείτε το URL στον simulator
grep webhook_url /home/theo/project/linux_version/backend/simulate_webhook.py

# Πρέπει να είναι:
# webhook_url = "http://backend:8000/api/billing/webhook/stripe/"
```

### Πρόβλημα 4: Duplicate Subscription
**Αιτία:** Πολλαπλές κλήσεις webhook

**Λύση:**
```bash
# Ελέγξτε για duplicates
docker compose exec db psql -U postgres -c "
SELECT user_id, COUNT(*) as count 
FROM billing_usersubscription 
GROUP BY user_id 
HAVING COUNT(*) > 1;
"

# Διαγραφή duplicates (κρατήστε το πιο πρόσφατο)
# ΠΡΟΣΟΧΗ: Backup πρώτα!
```

---

## 📊 Monitoring Dashboard

### Quick Status Check Script
Δημιουργήστε το αρχείο `check_subscription_system.sh`:

```bash
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
```

---

## 🎯 Checklist Ημερήσιου Ελέγχου

- [ ] Έλεγχος ότι όλα τα containers τρέχουν
- [ ] Έλεγχος για pending checkouts > 1 ώρα
- [ ] Έλεγχος για failed webhooks στα logs
- [ ] Έλεγχος subscription statuses
- [ ] Backup βάσης δεδομένων
- [ ] Έλεγχος disk space

---

## 📚 Επιπλέον Πληροφορίες

### Αρχεία για Debug:
- `/home/theo/project/linux_version/backend/billing/webhooks.py` - Webhook handler
- `/home/theo/project/linux_version/backend/billing/views.py` - API endpoints
- `/home/theo/project/linux_version/backend/simulate_webhook.py` - Webhook simulator
- `/home/theo/project/linux_version/backend/tenants/services.py` - Tenant creation

### Environment Variables:
```bash
# Δείτε όλες τις ρυθμίσεις
docker compose exec backend env | grep -E "(STRIPE|BILLING|TENANT)"
```

### Logs Locations:
- Backend: `docker compose logs backend`
- Celery: `docker compose logs celery`
- Nginx: `docker compose logs nginx`
- Database: `docker compose logs db`

---

## 🆘 Emergency Procedures

### Rollback Failed Subscription:
```bash
# 1. Βρείτε τον χρήστη
USER_ID=$(docker compose exec db psql -U postgres -t -c "
SELECT id FROM users_customuser WHERE email='PROBLEM_EMAIL';
")

# 2. Διαγράψτε subscription
docker compose exec db psql -U postgres -c "
DELETE FROM billing_usersubscription WHERE user_id=$USER_ID;
"

# 3. Καθαρίστε session
docker compose exec db psql -U postgres -c "
UPDATE users_customuser SET stripe_checkout_session_id=NULL WHERE id=$USER_ID;
"

# 4. Ο χρήστης μπορεί να ξαναδοκιμάσει
```

---

Αυτό το πλάνο καλύπτει όλες τις πτυχές του συστήματος συνδρομών και είναι αρκετά αναλυτικό ώστε να μπορεί να το ακολουθήσει οποιοσδήποτε, ανεξάρτητα από το επίπεδο εμπειρίας.
