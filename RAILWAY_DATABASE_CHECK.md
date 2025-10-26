# Railway Database Check Guide

## 🎯 **Στόχος**
Ελέγχος της κατάστασης της βάσης δεδομένων στο Railway μετά από cleanup και auto-initialization.

## 🔧 **Railway CLI Commands**

### **Step 1: Connect to Railway**
```bash
# Login to Railway
railway login

# Link to project
railway link

# Check project status
railway status
```

### **Step 2: Connect to Database**
```bash
# Connect to Railway database
railway connect

# This will open a PostgreSQL connection to your Railway database
```

### **Step 3: Check Database Status**

#### **Check Public Schema Users:**
```sql
-- Connect to public schema
SET search_path TO public;

-- Check users
SELECT email, is_superuser, is_staff, role, is_active 
FROM users_customuser 
ORDER BY email;

-- Expected: Only superusers (theostam1966@gmail.com)
```

#### **Check Tenants:**
```sql
-- Check tenants
SELECT schema_name, name, is_active, paid_until 
FROM tenants_client 
ORDER BY schema_name;

-- Expected: demo tenant
```

#### **Check Domains:**
```sql
-- Check domains
SELECT domain, tenant_id, is_primary 
FROM tenants_domain 
ORDER BY domain;

-- Expected: demo.localhost and Railway domain
```

#### **Check Subscription Plans:**
```sql
-- Check subscription plans
SELECT name, plan_type, monthly_price, yearly_price 
FROM billing_subscriptionplan 
ORDER BY name;

-- Expected: Starter, Professional, Enterprise
```

#### **Check User Subscriptions:**
```sql
-- Check user subscriptions
SELECT u.email, p.name as plan_name, s.status, s.created_at
FROM billing_usersubscription s
JOIN users_customuser u ON s.user_id = u.id
JOIN billing_subscriptionplan p ON s.plan_id = p.id
ORDER BY s.created_at DESC;

-- Expected: No subscriptions (until someone subscribes)
```

### **Step 4: Check Demo Tenant**

#### **Connect to Demo Schema:**
```sql
-- Connect to demo schema
SET search_path TO demo;

-- Check users in demo tenant
SELECT email, is_staff, role, is_active 
FROM users_customuser 
ORDER BY email;

-- Expected: manager@demo.localhost, resident1@demo.localhost, resident2@demo.localhost
```

#### **Check Demo Buildings:**
```sql
-- Check buildings in demo tenant
SELECT name, address, created_at 
FROM buildings_building 
ORDER BY name;

-- Expected: Demo Building
```

#### **Check Demo Apartments:**
```sql
-- Check apartments in demo tenant
SELECT apartment_number, floor, area, participation_mills 
FROM apartments_apartment 
ORDER BY apartment_number;

-- Expected: 6 apartments with demo data
```

## 🧪 **Testing Scripts**

### **Create Test Script:**
```bash
# Create test script
cat > railway_db_test.sql << 'EOF'
-- Railway Database Test Script

-- Check Public Schema
\echo '=== PUBLIC SCHEMA USERS ==='
SET search_path TO public;
SELECT email, is_superuser, is_staff, role, is_active 
FROM users_customuser 
ORDER BY email;

\echo '=== TENANTS ==='
SELECT schema_name, name, is_active, paid_until 
FROM tenants_client 
ORDER BY schema_name;

\echo '=== DOMAINS ==='
SELECT domain, tenant_id, is_primary 
FROM tenants_domain 
ORDER BY domain;

\echo '=== SUBSCRIPTION PLANS ==='
SELECT name, plan_type, monthly_price, yearly_price 
FROM billing_subscriptionplan 
ORDER BY name;

\echo '=== USER SUBSCRIPTIONS ==='
SELECT u.email, p.name as plan_name, s.status, s.created_at
FROM billing_usersubscription s
JOIN users_customuser u ON s.user_id = u.id
JOIN billing_subscriptionplan p ON s.plan_id = p.id
ORDER BY s.created_at DESC;

-- Check Demo Tenant
\echo '=== DEMO TENANT USERS ==='
SET search_path TO demo;
SELECT email, is_staff, role, is_active 
FROM users_customuser 
ORDER BY email;

\echo '=== DEMO BUILDINGS ==='
SELECT name, address, created_at 
FROM buildings_building 
ORDER BY name;

\echo '=== DEMO APARTMENTS ==='
SELECT apartment_number, floor, area, participation_mills 
FROM apartments_apartment 
ORDER BY apartment_number;
EOF
```

### **Run Test Script:**
```bash
# Run test script
railway connect < railway_db_test.sql
```

## 🔍 **Expected Results**

### **After CLEANUP_DATABASE="true":**

#### **Public Schema:**
```
=== PUBLIC SCHEMA USERS ===
email                    | is_superuser | is_staff | role  | is_active
theostam1966@gmail.com   | t            | t        | admin | t

=== TENANTS ===
schema_name | name                    | is_active | paid_until
demo        | Demo Digital Concierge  | t         | 2026-10-26

=== DOMAINS ===
domain                                    | tenant_id | is_primary
demo.localhost                           | 1         | t
linuxversion-production.up.railway.app   | 1         | f

=== SUBSCRIPTION PLANS ===
name         | plan_type     | monthly_price | yearly_price
Starter      | starter       | 9.99          | 99.99
Professional | professional  | 19.99         | 199.99
Enterprise   | enterprise    | 49.99         | 499.99

=== USER SUBSCRIPTIONS ===
(No rows - expected)
```

#### **Demo Tenant:**
```
=== DEMO TENANT USERS ===
email                    | is_staff | role     | is_active
manager@demo.localhost   | t        | manager  | t
resident1@demo.localhost | f        | resident | t
resident2@demo.localhost | f        | resident | t

=== DEMO BUILDINGS ===
name          | address           | created_at
Demo Building | Demo Address 123  | 2025-10-26

=== DEMO APARTMENTS ===
apartment_number | floor | area | participation_mills
1                | 1     | 85   | 100
2                | 1     | 90   | 120
3                | 2     | 75   | 80
4                | 2     | 95   | 130
5                | 3     | 80   | 90
6                | 3     | 100  | 150
```

## 🚀 **Testing Google Auth Flow**

### **Step 1: Deploy with Cleanup**
```bash
# Set environment variable in Railway
railway variables set CLEANUP_DATABASE=true

# Deploy
railway up
```

### **Step 2: Check Database After Deploy**
```bash
# Connect and check
railway connect < railway_db_test.sql
```

### **Step 3: Test Google Auth**
1. **Go to:** `https://linux-version.vercel.app/register`
2. **Register:** New user with Google
3. **Expected:** Redirect to `/plans` (not `/dashboard`)
4. **Check database:** New user should be created in public schema

### **Step 4: Test Subscription Flow**
1. **Select plan** at `/plans`
2. **Complete payment** with test card `4242 4242 4242 4242`
3. **Check webhook** processing in Railway logs
4. **Check database:** User should get tenant and subscription

## 📋 **Verification Checklist**

### **Database State:**
- [ ] **Public Schema:** Only superusers (theostam1966@gmail.com)
- [ ] **Demo Tenant:** Demo users (manager@demo.localhost, resident1@demo.localhost, etc.)
- [ ] **No other users** in public schema
- [ ] **Subscription plans** available
- [ ] **No user subscriptions** (until someone subscribes)

### **User Flow:**
- [ ] **Google Auth** → new user creation
- [ ] **Redirect to /plans** (not /dashboard)
- [ ] **Subscription flow** working
- [ ] **Stripe checkout** opening
- [ ] **Webhook processing**
- [ ] **Tenant provisioning**
- [ ] **Email notifications**
- [ ] **Secure access links**

## 🚨 **Troubleshooting**

### **Issue: Users still exist after cleanup**
```bash
# Check if cleanup ran
railway logs | grep "CLEANUP DATABASE"

# Check if auto-init ran
railway logs | grep "auto-initialization"
```

### **Issue: No subscription plans**
```bash
# Check auto-init logs
railway logs | grep "Subscription plans"

# Check database
railway connect
# Then run: SELECT * FROM billing_subscriptionplan;
```

### **Issue: Google Auth redirects to /dashboard**
```bash
# Check RegisterForm redirect logic
# Should redirect to /plans, not /dashboard
```

## 🎯 **Success Criteria**

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
