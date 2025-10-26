# Database Cleanup Verification Guide

## 🎯 **Στόχος**
Βεβαιωθείτε ότι με `CLEANUP_DATABASE="true"` η βάση καθαρίζεται σωστά και δημιουργούνται μόνο τα αναγκαία δεδομένα.

## 🔍 **Τι Συμβαίνει με CLEANUP_DATABASE="true"**

### **1. Cleanup Script (entrypoint.sh γραμμή 37):**
```bash
python manage.py cleanup_all_data --force
```

### **2. Τι Διαγράφει:**
- **Όλους τους χρήστες** (εκτός superuser) - γραμμή 203-206
- Όλα τα οικονομικά δεδομένα
- Όλα τα κτίρια και διαμερίσματα
- Όλες τις ανακοινώσεις, αιτήματα, ψηφοφορίες

### **3. Auto-initialization (entrypoint.sh γραμμή 43):**
```bash
python scripts/auto_initialization.py
```

### **4. Τι Δημιουργεί:**

#### **Public Schema:**
- **Ultra-Superuser:** `theostam1966@gmail.com` (password: `theo123!@#`)
- **Subscription Plans:** Starter, Professional, Enterprise
- **Demo Tenant:** `demo` schema

#### **Demo Tenant Schema:**
- **Manager:** `manager@demo.localhost` (password: `manager123456`)
- **Resident1:** `resident1@demo.localhost` (password: `resident123456`)
- **Resident2:** `resident2@demo.localhost` (password: `resident123456`)
- **Demo Buildings, Apartments, Financial Data**

## 🧪 **Testing Locally**

### **Step 1: Run Cleanup and Auto-Init**
```bash
cd linux_version/backend
python test_cleanup_and_init.py
```

### **Step 2: Check Database Status**
```bash
python check_database_status.py
```

### **Step 3: Expected Results**

#### **Public Schema:**
```
👥 Users in Public Schema: 1
   • theostam1966@gmail.com (superuser: True, staff: True, role: admin)

🏢 Tenants: 1
   • demo - Demo Digital Concierge (active: True)

🌐 Domains: 2
   • demo.localhost -> demo (primary: True)
   • linuxversion-production.up.railway.app -> public (primary: False)

💳 Subscription Plans: 3
   • Starter - starter (€9.99/month)
   • Professional - professional (€19.99/month)
   • Enterprise - enterprise (€49.99/month)

📊 User Subscriptions: 0
```

#### **Demo Tenant Schema:**
```
👥 Users in demo: 3
   • manager@demo.localhost (staff: True, role: manager)
   • resident1@demo.localhost (staff: False, role: resident)
   • resident2@demo.localhost (staff: False, role: resident)

🏢 Buildings: 1
   • Demo Building (Demo Address 123)

🏠 Apartments: 6
   • 6 apartments with demo data

💰 Financial Data:
   • Transactions: 0
   • Payments: 0
   • Expenses: 0
```

## 🚀 **Production Deployment**

### **Railway Environment Variables:**
```bash
CLEANUP_DATABASE=true
```

### **Expected Behavior:**
1. **Deploy με CLEANUP_DATABASE="true"**
2. **Database καθαρίζεται** (όλοι οι χρήστες διαγράφονται)
3. **Auto-initialization τρέχει** (δημιουργεί demo data)
4. **Google Auth** → δημιουργεί νέο χρήστη → redirect to `/plans`
5. **Subscription flow** → Stripe Checkout → Webhook → Tenant Provisioning

## 🔍 **Verification Commands**

### **Check Public Schema Users:**
```bash
# Connect to Railway database
railway connect

# Check users
python manage.py shell
>>> from users.models import CustomUser
>>> from django_tenants.utils import schema_context, get_public_schema_name
>>> with schema_context(get_public_schema_name()):
...     users = CustomUser.objects.all()
...     for user in users:
...         print(f"{user.email} - superuser: {user.is_superuser}")
```

### **Check Demo Tenant Users:**
```bash
# Check demo tenant users
>>> with schema_context('demo'):
...     users = CustomUser.objects.all()
...     for user in users:
...         print(f"{user.email} - role: {user.role}")
```

### **Check Subscription Plans:**
```bash
# Check subscription plans
>>> from billing.models import SubscriptionPlan
>>> plans = SubscriptionPlan.objects.all()
>>> for plan in plans:
...     print(f"{plan.name} - {plan.plan_type} - €{plan.monthly_price}")
```

## 📋 **Verification Checklist**

### **After CLEANUP_DATABASE="true":**
- [ ] **Public Schema:** Only superusers (theostam1966@gmail.com)
- [ ] **Demo Tenant:** Demo users (manager@demo.localhost, resident1@demo.localhost, etc.)
- [ ] **No other users** in public schema
- [ ] **Subscription plans** available
- [ ] **No user subscriptions** (until someone subscribes)

### **After Google Auth:**
- [ ] **New user created** in public schema
- [ ] **Redirect to /plans** (not /dashboard)
- [ ] **Subscription flow** starts
- [ ] **Stripe checkout** opens
- [ ] **Webhook processing** works
- [ ] **Tenant provisioning** successful
- [ ] **Email notification** sent

## 🚨 **Troubleshooting**

### **Issue: Users still exist after cleanup**
```
Solution: Check if CLEANUP_DATABASE="true" is set correctly
```

### **Issue: No subscription plans**
```
Solution: Check auto-initialization script ran successfully
```

### **Issue: Google Auth redirects to /dashboard**
```
Solution: Check RegisterForm redirect logic
```

### **Issue: Webhook not processing**
```
Solution: Check STRIPE_WEBHOOK_SECRET and endpoint URL
```

## 🎯 **Expected Flow**

```
1. Deploy with CLEANUP_DATABASE="true"
   ↓
2. Database cleanup (all users deleted)
   ↓
3. Auto-initialization (demo data created)
   ↓
4. Google Auth (new user created)
   ↓
5. Redirect to /plans (subscription flow)
   ↓
6. Stripe Checkout (payment)
   ↓
7. Webhook (tenant provisioning)
   ↓
8. Email (welcome with access link)
   ↓
9. Access (secure token validation)
```

## ✅ **Success Criteria**

**Database State:**
- ✅ Only superusers in public schema
- ✅ Demo tenant with demo users
- ✅ Subscription plans available
- ✅ No user subscriptions (until someone subscribes)

**User Flow:**
- ✅ Google Auth → new user creation
- ✅ Redirect to /plans (not /dashboard)
- ✅ Subscription flow working
- ✅ Stripe checkout opening
- ✅ Webhook processing
- ✅ Tenant provisioning
- ✅ Email notifications
- ✅ Secure access links

**Το σύστημα είναι έτοιμο για production deployment!** 🚀
