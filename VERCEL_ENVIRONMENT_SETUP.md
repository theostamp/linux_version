# Vercel Environment Variables Setup

## 🌐 **Vercel Frontend Environment Variables**

### **Step 1: Access Vercel Dashboard**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: `linux-version`
3. Go to **"Settings"** tab
4. Click **"Environment Variables"**

### **Step 2: Add Environment Variables**

Add these variables one by one:

```bash
# ========================================
# 🔗 API Configuration
# ========================================
NEXT_PUBLIC_API_URL=https://linuxversion-production.up.railway.app/api
NEXT_PUBLIC_DEFAULT_API_URL=https://linuxversion-production.up.railway.app/api
NEXT_PUBLIC_DJANGO_API_URL=https://linuxversion-production.up.railway.app

# ========================================
# 💳 Stripe Configuration (TEST MODE)
# ========================================
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51SKvgDALGEaGtPDYQjJzEQJilEg23btupuoQHNWPtuGazZOAdnQ7mHwYDFg5aTAbASJPfvrsqSZHZ6DyHiLF1AOx0077mYI0Bn

# ========================================
# 🌐 App Configuration
# ========================================
NEXT_PUBLIC_APP_NAME=New Concierge
NEXT_PUBLIC_APP_URL=https://linux-version.vercel.app
NEXT_PUBLIC_APP_URL_CUSTOM=https://linux-version.vercel.app
NEXT_PUBLIC_ENV=production

# ========================================
# 🔐 Google OAuth
# ========================================
NEXT_PUBLIC_GOOGLE_CLIENT_ID=590666847148-a2e037ah9q9f1vogsl6b34mk944bug5g.apps.googleusercontent.com

# ========================================
# 🔗 Internal API
# ========================================
CORE_API_URL=https://linuxversion-production.up.railway.app/api/tenants/internal/create/
INTERNAL_API_SECRET_KEY=Pf2irUXpdvZcAZ//DD8noS76BnSCLtwtINL8yqJM62Y=

# ========================================
# 📧 Email Configuration (if needed)
# ========================================
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=theostam1966@gmail.com
DEFAULT_FROM_EMAIL=noreply@newconcierge.gr

# ========================================
# 🎯 Environment
# ========================================
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

### **Step 3: Environment Variable Details**

For each variable, set:
- **Name**: The variable name (e.g., `NEXT_PUBLIC_API_URL`)
- **Value**: The variable value
- **Environment**: Select **"Production"** for all variables

### **Step 4: Redeploy**

After adding all environment variables:
1. Go to **"Deployments"** tab
2. Click **"Redeploy"** on the latest deployment
3. Wait for deployment to complete

## 🔧 **Vercel Configuration**

### **Project Settings**
- **Framework Preset**: Next.js
- **Root Directory**: `linux_version/frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `.next`

### **Domain Configuration**
- **Production Domain**: `linux-version.vercel.app`
- **Custom Domain**: (if you have one)

## 🧪 **Testing Frontend**

### **1. Test API Connection**
```bash
# Test if API is accessible
curl -I https://linux-version.vercel.app/api/billing/plans/

# Expected response: 200 OK or 401 Unauthorized (both are good)
```

### **2. Test Stripe Integration**
1. Go to `https://linux-version.vercel.app/plans`
2. Verify plans are loaded
3. Click on a plan
4. Verify Stripe checkout opens

### **3. Test Registration Flow**
1. Go to `https://linux-version.vercel.app/register`
2. Register a new user
3. Verify redirect to `/plans`
4. Test plan selection and checkout

## 📋 **Verification Checklist**

### **Environment Variables:**
- [ ] All API URLs configured
- [ ] Stripe publishable key added
- [ ] App configuration set
- [ ] Google OAuth configured
- [ ] Internal API settings configured

### **Deployment:**
- [ ] Build successful
- [ ] No build errors
- [ ] Environment variables loaded
- [ ] API calls working

### **Functionality:**
- [ ] Plans page loads
- [ ] Registration works
- [ ] Stripe checkout opens
- [ ] API calls to Railway backend work

## 🚨 **Troubleshooting**

### **Common Issues:**

**Issue: Build fails**
```
Solution: Check environment variables are set correctly
```

**Issue: API calls fail**
```
Solution: Check NEXT_PUBLIC_API_URL is correct
```

**Issue: Stripe checkout doesn't open**
```
Solution: Check NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is correct
```

**Issue: CORS errors**
```
Solution: Check Railway CORS_ALLOWED_ORIGINS includes Vercel URL
```

### **Debug Commands:**
```bash
# Check if frontend is accessible
curl -I https://linux-version.vercel.app

# Check if API calls work
curl -I https://linux-version.vercel.app/api/billing/plans/

# Check build logs in Vercel Dashboard
```

## 🔍 **Frontend Testing**

### **1. Registration Flow**
```
1. Go to /register
2. Fill registration form
3. Submit form
4. Verify redirect to /plans
5. Check Railway logs for user creation
```

### **2. Plan Selection**
```
1. Go to /plans
2. Verify plans are loaded from API
3. Click on a plan
4. Verify Stripe checkout opens
5. Check user.stripe_checkout_session_id is saved
```

### **3. Payment Success**
```
1. Complete payment in Stripe test mode
2. Verify redirect to /payment/success
3. Check polling starts
4. Verify status changes from processing to completed
5. Check redirect to /dashboard
```

### **4. Tenant Accept**
```
1. Check email for welcome message
2. Click secure link
3. Verify redirect to /tenant/accept
4. Check token validation
5. Verify redirect to /dashboard
```

## 🎯 **Next Steps**

After Vercel setup:
1. **Test end-to-end flow** (register → plans → checkout)
2. **Verify Stripe webhook** processing
3. **Check tenant provisioning** works
4. **Test email notifications**
5. **Monitor logs** for any issues

## 📞 **Support**

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Vercel Support**: [vercel.com/support](https://vercel.com/support)
- **Next.js Docs**: [nextjs.org/docs](https://nextjs.org/docs)

## 🎉 **Ready!**

Once all environment variables are set:
- ✅ Frontend will connect to Railway backend
- ✅ Stripe checkout will work
- ✅ API calls will function
- ✅ Full subscription flow will be operational

**Vercel frontend is ready for deployment!** 🚀
