# 🚨 Οδηγός Αντιμετώπισης Προβλημάτων Συνδρομών

## 🔴 ΚΡΙΣΙΜΑ ΠΡΟΒΛΗΜΑΤΑ

### 1. "Workspace setup is taking longer than expected"
```bash
# ΒΗΜΑ 1: Βρείτε το session ID
docker compose logs backend | grep "Created checkout session" | tail -1

# ΒΗΜΑ 2: Ελέγξτε αν υπάρχει ο χρήστης
docker compose exec db psql -U postgres -c "
SELECT email, stripe_checkout_session_id FROM users_customuser 
WHERE stripe_checkout_session_id LIKE 'cs_test_%' ORDER BY created_at DESC LIMIT 5;
"

# ΒΗΜΑ 3: Τρέξτε manual webhook
docker compose exec backend python simulate_webhook.py YOUR_SESSION_ID
```

### 2. "Invalid subscription state" 
```bash
# Βρείτε τον χρήστη
EMAIL="user@example.com"
docker compose exec db psql -U postgres -c "
SELECT u.id, u.email, s.status, s.stripe_subscription_id 
FROM users_customuser u 
LEFT JOIN billing_usersubscription s ON s.user_id = u.id 
WHERE u.email='$EMAIL';
"

# Διορθώστε το status αν χρειάζεται
docker compose exec db psql -U postgres -c "
UPDATE billing_usersubscription 
SET status='trialing' 
WHERE user_id=(SELECT id FROM users_customuser WHERE email='$EMAIL');
"
```

### 3. Backend δεν ανταποκρίνεται
```bash
# Restart services
docker compose restart backend celery nginx

# Περιμένετε 30 δευτερόλεπτα
sleep 30

# Ελέγξτε ξανά
./check_subscription_system.sh
```

---

## 🟡 ΣΥΧΝΑ ΠΡΟΒΛΗΜΑΤΑ

### Webhook Timeout
**Σύμπτωμα:** `Read timeout` στα logs

**Λύση:**
```bash
# Ελέγξτε αν τρέχει το Celery
docker compose ps celery

# Restart αν χρειάζεται
docker compose restart celery celery-beat
```

### Duplicate Subscriptions
**Σύμπτωμα:** Πολλές subscriptions για τον ίδιο χρήστη

**Λύση:**
```bash
# Βρείτε duplicates
docker compose exec db psql -U postgres -c "
SELECT user_id, COUNT(*) FROM billing_usersubscription 
GROUP BY user_id HAVING COUNT(*) > 1;
"

# Κρατήστε μόνο την πιο πρόσφατη
# ΠΡΟΣΟΧΗ: Κάντε backup πρώτα!
```

### Session Not Found
**Σύμπτωμα:** `{"status":"pending"}` συνεχώς

**Έλεγχος:**
```bash
# Δείτε αν το session_id είναι σωστό
SESSION_ID="cs_test_..."
docker compose exec db psql -U postgres -c "
SELECT * FROM users_customuser WHERE stripe_checkout_session_id='$SESSION_ID';
"
```

---

## 🟢 ΠΡΟΛΗΠΤΙΚΕΣ ΕΝΕΡΓΕΙΕΣ

### Καθημερινός Έλεγχος (5 λεπτά)
```bash
# Τρέξτε το health check
cd /home/theo/project/linux_version
./check_subscription_system.sh

# Αν όλα είναι ΟΚ, τελειώσατε!
```

### Εβδομαδιαίος Έλεγχος (15 λεπτά)
```bash
# 1. Καθαρισμός παλιών pending checkouts (> 7 ημέρες)
docker compose exec db psql -U postgres -c "
UPDATE users_customuser 
SET stripe_checkout_session_id = NULL 
WHERE stripe_checkout_session_id IS NOT NULL 
AND date_joined < NOW() - INTERVAL '7 days';
"

# 2. Έλεγχος για orphaned tenants
docker compose exec db psql -U postgres -c "
SELECT t.schema_name, t.created_on 
FROM tenants_client t 
LEFT JOIN users_customuser u ON u.tenant_id = t.id 
WHERE u.id IS NULL;
"

# 3. Backup βάσης
docker compose exec db pg_dump -U postgres > backup_$(date +%Y%m%d).sql
```

---

## 📞 ΕΠΙΚΟΙΝΩΝΙΑ ΓΙΑ ΒΟΗΘΕΙΑ

Αν το πρόβλημα παραμένει:

1. **Συλλέξτε logs:**
```bash
# Δημιουργήστε αρχείο με όλα τα logs
docker compose logs --tail=1000 > subscription_debug_$(date +%Y%m%d_%H%M%S).log
```

2. **Συλλέξτε system info:**
```bash
./check_subscription_system.sh > system_status_$(date +%Y%m%d_%H%M%S).txt
```

3. **Database snapshot:**
```bash
docker compose exec db psql -U postgres -c "
SELECT u.email, u.stripe_checkout_session_id, u.tenant_id,
       s.status as sub_status, s.stripe_subscription_id,
       t.schema_name as tenant_name
FROM users_customuser u
LEFT JOIN billing_usersubscription s ON s.user_id = u.id
LEFT JOIN tenants_client t ON t.id = u.tenant_id
WHERE u.created_at > NOW() - INTERVAL '24 hours'
ORDER BY u.created_at DESC;
" > recent_users_$(date +%Y%m%d_%H%M%S).txt
```

---

## 🔧 EMERGENCY FIXES

### RESET Χρήστη (Πλήρης επαναφορά)
```bash
EMAIL="problem@example.com"

# 1. Backup user data
docker compose exec db psql -U postgres -c "
SELECT * FROM users_customuser WHERE email='$EMAIL';
" > user_backup.txt

# 2. Clear everything
docker compose exec db psql -U postgres -c "
-- Clear subscription
DELETE FROM billing_usersubscription 
WHERE user_id=(SELECT id FROM users_customuser WHERE email='$EMAIL');

-- Clear session
UPDATE users_customuser 
SET stripe_checkout_session_id=NULL, tenant_id=NULL 
WHERE email='$EMAIL';
"

echo "User $EMAIL has been reset. They can try subscribing again."
```

### FORCE Complete Subscription
```bash
# ΜΟΝΟ σε έκτακτη ανάγκη!
SESSION_ID="cs_test_..."
USER_ID=$(docker compose exec db psql -U postgres -t -c "
SELECT id FROM users_customuser WHERE stripe_checkout_session_id='$SESSION_ID';
")

# Δημιουργία manual subscription
docker compose exec db psql -U postgres -c "
INSERT INTO billing_usersubscription 
(id, user_id, plan_id, status, stripe_subscription_id, stripe_customer_id, created_at, updated_at)
VALUES 
(gen_random_uuid(), $USER_ID, 3, 'trialing', 'sub_manual_$USER_ID', 'cus_manual_$USER_ID', NOW(), NOW());
"

# Τρέξτε webhook
docker compose exec backend python simulate_webhook.py $SESSION_ID
```

---

Αποθηκεύστε αυτά τα αρχεία και χρησιμοποιήστε τα όποτε χρειαστεί!
