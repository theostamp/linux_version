# 🚀 Quick Stripe Setup for Development

## ⚡ **5-Minute Setup**

### **Step 1: Create Stripe Test Account**
1. Go to [stripe.com](https://stripe.com) → Sign up
2. Use test mode (default for new accounts)
3. Go to **Developers → API Keys**

### **Step 2: Get Your Test Keys**
Copy these keys:
- **Publishable key**: `pk_test_...` 
- **Secret key**: `sk_test_...`

### **Step 3: Update Environment**
```bash
cd /home/theo/project/public-app
```

Edit `.env.local`:
```bash
# Replace with your actual test keys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_ACTUAL_KEY
STRIPE_SECRET_KEY=sk_test_YOUR_ACTUAL_KEY
STRIPE_WEBHOOK_SECRET=whsec_test_placeholder
```

### **Step 4: Create Test Products**
```bash
node setup-stripe.js
```

### **Step 5: Test Signup Flow**
1. Visit: http://localhost:3000/signup
2. Fill form with test data
3. Use test card: `4242 4242 4242 4242`
4. Complete checkout

## 🧪 **Test Cards**
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0025 0000 3155`

## ✅ **Expected Result**
After successful payment:
1. Stripe webhook triggers
2. Public App calls Core App API
3. New tenant created in database
4. User redirected to tenant login

---

**Ready to proceed?** Let me know when you have your Stripe test keys!









