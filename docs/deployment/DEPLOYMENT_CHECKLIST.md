# Deployment Checklist

## Pre-Deployment

### ✅ Code Changes Complete
- [ ] Webhook handler enhanced with idempotency
- [ ] UserSubscription model updated with stripe_checkout_session_id
- [ ] Email service implemented for tenant welcome emails
- [ ] Tenant accept endpoint created
- [ ] Frontend pages created (/plans, /tenant/accept)
- [ ] Register form updated to redirect to /plans
- [ ] Database migration created

### ✅ Environment Variables Ready
- [ ] Stripe test keys obtained
- [ ] Email credentials configured
- [ ] Internal API secret generated
- [ ] Frontend API URL configured

## Railway Backend Deployment

### ✅ Environment Variables
- [ ] STRIPE_SECRET_KEY=sk_test_...
- [ ] STRIPE_PUBLISHABLE_KEY=pk_test_...
- [ ] STRIPE_WEBHOOK_SECRET=whsec_...
- [ ] STRIPE_CURRENCY=eur
- [ ] DJANGO_ALLOWED_HOSTS=linuxversion-production.up.railway.app,linux-version.vercel.app
- [ ] CORS_ALLOWED_ORIGINS=https://linux-version.vercel.app,https://*.vercel.app
- [ ] CSRF_TRUSTED_ORIGINS=https://linux-version.vercel.app,https://*.vercel.app
- [ ] FRONTEND_URL=https://linux-version.vercel.app
- [ ] EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
- [ ] EMAIL_HOST=smtp.gmail.com
- [ ] EMAIL_PORT=587
- [ ] EMAIL_USE_TLS=True
- [ ] EMAIL_HOST_USER=your-email@gmail.com
- [ ] EMAIL_HOST_PASSWORD=your-app-password
- [ ] DEFAULT_FROM_EMAIL=New Concierge <noreply@newconcierge.gr>
- [ ] INTERNAL_API_SECRET_KEY=<random-32-char-secret>

### ✅ Database Migration
- [ ] Run: `railway run python manage.py migrate_schemas --shared`
- [ ] Verify migration applied successfully
- [ ] Check stripe_checkout_session_id field exists

### ✅ Deployment
- [ ] Push code to Railway
- [ ] Verify deployment successful
- [ ] Check Railway logs for errors
- [ ] Test API endpoints accessible

## Vercel Frontend Deployment

### ✅ Environment Variables
- [ ] NEXT_PUBLIC_API_URL=https://linuxversion-production.up.railway.app
- [ ] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

### ✅ Configuration
- [ ] next.config.js rewrites configured
- [ ] Build successful
- [ ] No build errors

### ✅ Deployment
- [ ] Deploy to Vercel
- [ ] Verify deployment successful
- [ ] Test frontend accessible
- [ ] Check environment variables loaded

## Stripe Configuration

### ✅ Webhook Setup
- [ ] Create webhook endpoint: https://linuxversion-production.up.railway.app/api/billing/webhook/stripe/
- [ ] Enable events: checkout.session.completed, customer.subscription.updated
- [ ] Get webhook secret and add to Railway
- [ ] Test webhook delivery

### ✅ Test Mode
- [ ] Verify in test mode
- [ ] Test API keys working
- [ ] Test webhook events

## Post-Deployment Testing

### ✅ Registration Flow
- [ ] Navigate to /register
- [ ] Register new user
- [ ] Verify redirect to /plans
- [ ] Check Railway logs

### ✅ Plan Selection
- [ ] Select plan
- [ ] Verify redirect to Stripe Checkout
- [ ] Check user.stripe_checkout_session_id saved

### ✅ Payment Flow
- [ ] Complete payment with test card
- [ ] Verify redirect to /payment/success
- [ ] Check webhook received

### ✅ Webhook Processing
- [ ] Check Railway logs for webhook events
- [ ] Verify tenant created
- [ ] Verify user.tenant set
- [ ] Verify user.is_staff = True

### ✅ Email Notification
- [ ] Check email received
- [ ] Verify secure link in email
- [ ] Test email link

### ✅ Tenant Access
- [ ] Click email link
- [ ] Verify /tenant/accept page
- [ ] Verify token validation
- [ ] Verify redirect to dashboard

### ✅ Polling Flow
- [ ] Check /payment/success polling
- [ ] Verify status transitions
- [ ] Verify automatic redirect

## Monitoring & Verification

### ✅ Railway Logs
- [ ] No error logs
- [ ] Webhook events logged
- [ ] Email sending successful
- [ ] Database operations successful

### ✅ Stripe Dashboard
- [ ] Webhook deliveries successful
- [ ] Payment events processed
- [ ] No failed webhooks

### ✅ Vercel Logs
- [ ] No build errors
- [ ] API calls successful
- [ ] No CORS errors

### ✅ Database
- [ ] User records created
- [ ] Tenant records created
- [ ] Subscription records created
- [ ] Domain records created

## Performance Verification

### ✅ Response Times
- [ ] Registration < 2 seconds
- [ ] Plan selection < 1 second
- [ ] Checkout session creation < 1 second
- [ ] Webhook processing < 5 seconds
- [ ] Tenant provisioning < 30 seconds

### ✅ Error Rates
- [ ] < 1% error rate
- [ ] No critical errors
- [ ] Proper error handling

## Security Verification

### ✅ CORS
- [ ] No CORS errors in browser
- [ ] Proper CORS headers
- [ ] No unauthorized access

### ✅ Authentication
- [ ] JWT tokens working
- [ ] Token expiry handling
- [ ] Secure token generation

### ✅ Webhook Security
- [ ] Signature verification working
- [ ] No unauthorized webhooks
- [ ] Proper error handling

## Rollback Plan

### If Issues Occur
1. **Revert webhook changes** → Use old internal API endpoint
2. **Disable email sending** → Set EMAIL_BACKEND to console
3. **Manual tenant creation** → Use Django admin
4. **Check logs** → Identify specific issues
5. **Fix and redeploy** → Address root cause

### Emergency Contacts
- Railway support
- Vercel support
- Stripe support

## Success Criteria

### ✅ All Flows Working
- [ ] Registration → Plans → Checkout → Success
- [ ] Webhook → Tenant Provisioning → Email
- [ ] Email → Token Validation → Dashboard Access

### ✅ No Critical Issues
- [ ] No 500 errors
- [ ] No database errors
- [ ] No email failures
- [ ] No webhook failures

### ✅ Performance Acceptable
- [ ] All response times within limits
- [ ] Error rates acceptable
- [ ] User experience smooth

## Final Verification

### ✅ End-to-End Test
1. Register new user
2. Select plan
3. Complete payment
4. Verify tenant created
5. Check email received
6. Access tenant via email link
7. Verify dashboard access

### ✅ Production Ready
- [ ] All tests passing
- [ ] Performance acceptable
- [ ] Security verified
- [ ] Monitoring in place
- [ ] Rollback plan ready

## Go Live Checklist

### ✅ Final Steps
- [ ] Switch to production Stripe keys
- [ ] Update webhook endpoint for production
- [ ] Update environment variables for production
- [ ] Final end-to-end test with production keys
- [ ] Monitor first few transactions
- [ ] Document any issues and resolutions

### ✅ Post-Launch
- [ ] Monitor logs for 24 hours
- [ ] Check error rates
- [ ] Verify all flows working
- [ ] Document any issues
- [ ] Plan for scaling if needed
