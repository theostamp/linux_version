# 🔧 Stripe Setup Guide - Φάση 2

## 📋 Βήματα Διαμόρφωσης Stripe

### 1. 🔑 Λήψη API Keys από Stripe Dashboard

1. **Σύνδεση στο Stripe Dashboard:**
   - Πήγαινε στο [dashboard.stripe.com](https://dashboard.stripe.com)
   - Βεβαιώσου ότι είσαι σε **Test Mode** (διακόπτης πάνω δεξιά)

2. **Λήψη API Keys:**
   - Πήγαινε στο **Developers > API keys**
   - Αντιγράψε το **Publishable key** (ξεκινάει με `pk_test_`)
   - Κάνε κλικ στο **"Reveal test key"** και αντιγράψε το **Secret key** (ξεκινάει με `sk_test_`)

### 2. ⚙️ Ενημέρωση Environment Variables

Τρέξε το script που δημιουργήσαμε:

```bash
cd /home/theo/project/linux_version
./update_stripe_env.sh
```

Εισάγετε τα API keys που αντιγράψατε από το Stripe Dashboard.

### 3. 📦 Δημιουργία Προϊόντων στο Stripe

Στο Stripe Dashboard, πήγαινε στο **Products** και δημιούργησε 3 προϊόντα:

#### 🥉 Starter Plan
- **Name:** Starter
- **Description:** Βασικό πλάνο για μικρές πολυκατοικίες
- **Pricing:** €19.99/μήνα (recurring)

#### 🥈 Professional Plan  
- **Name:** Professional
- **Description:** Επαγγελματικό πλάνο με προηγμένες λειτουργίες
- **Pricing:** €49.99/μήνα (recurring)

#### 🥇 Enterprise Plan
- **Name:** Enterprise
- **Description:** Επιχειρηματικό πλάνο με πλήρη υποστήριξη
- **Pricing:** €99.99/μήνα (recurring)

**Σημαντικό:** Αφού δημιουργήσεις κάθε τιμή, αντιγράψε το **Price ID** (ξεκινάει με `price_`). Θα το χρειαστούμε για να συνδέσουμε τα πλάνα με το Django admin.

### 4. 🔗 Webhook Setup

#### Εγκατάσταση Stripe CLI:
```bash
# Ubuntu/Debian
sudo apt-get install stripe/stripe-cli

# ή με curl
curl -s https://packages.stripe.dev/api/security/keypair/stripe-cli-gpg/public | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg
echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.dev/stripe-cli-debian-local stable main" | sudo tee -a /etc/apt/sources.list.d/stripe.list
sudo apt update
sudo apt install stripe
```

#### Σύνδεση με Stripe:
```bash
stripe login
```

#### Εκκίνηση Webhook Listener:
```bash
stripe listen --forward-to http://localhost:8000/api/billing/webhooks/stripe/
```

Αυτό θα σου δώσει ένα **webhook signing secret** (ξεκινάει με `whsec_`). Αντιγράψε το και ενημέρωσε το `.env` αρχείο.

### 5. 🧪 Test της Ροής

Μετά την ολοκλήρωση:

1. **Restart το σύστημα:**
   ```bash
   ./reset_and_start.sh
   ```

2. **Test API endpoints:**
   - Login ως `admin@demo.localhost`
   - Πήγαινε στο billing section
   - Δοκίμασε να δημιουργήσεις συνδρομή

3. **Test Webhooks:**
   - Χρησιμοποίησε test card numbers από το Stripe
   - Ελέγξε αν το tenant status ενημερώνεται αυτόματα

## 🎯 Αναμενόμενα Αποτελέσματα

Μετά την ολοκλήρωση αυτής της φάσης:

- ✅ Stripe API integration λειτουργικό
- ✅ Προϊόντα δημιουργημένα και διαθέσιμα
- ✅ Webhooks ενημερώνουν το tenant status
- ✅ Πλήρης ροή εγγραφής → συνδρομή → πρόσβαση
- ✅ Test environment έτοιμο για production

## 🆘 Troubleshooting

### Πρόβλημα: "Invalid API Key"
- Ελέγξε αν τα API keys είναι σωστά στο `.env`
- Βεβαιώσου ότι είσαι σε Test Mode στο Stripe

### Πρόβλημα: "Webhook signature verification failed"
- Ελέγξε αν το `STRIPE_WEBHOOK_SECRET` είναι σωστό
- Βεβαιώσου ότι το webhook endpoint είναι accessible

### Πρόβλημα: "Product not found"
- Ελέγξε αν τα προϊόντα δημιουργήθηκαν στο Stripe Dashboard
- Βεβαιώσου ότι τα Price IDs είναι σωστά στο Django admin

