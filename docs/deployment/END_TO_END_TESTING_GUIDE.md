# End-to-End Testing Guide

## Complete Flow Testing

### 1. Registration Flow
```
1. Navigate to https://linux-version.vercel.app/register
2. Fill registration form:
   - Email: test@example.com
   - Password: TestPassword123!
   - First Name: Test
   - Last Name: User
3. Submit form
4. Verify redirect to /plans
5. Check Railway logs: "User created successfully - Schema: public"
```

### 2. Plan Selection Flow
```
1. On /plans page, verify plans are loaded
2. Select a plan (e.g., "Basic Plan")
3. Click "Επιλογή Πακέτου"
4. Verify redirect to Stripe Checkout
5. Check user.stripe_checkout_session_id is saved in database
```

### 3. Stripe Checkout Flow
```
1. In Stripe Checkout:
   - Use test card: 4242 4242 4242 4242
   - Expiry: Any future date
   - CVC: Any 3 digits
   - Name: Test User
2. Complete payment
3. Verify redirect to /payment/success?session_id=cs_test_...
```

### 4. Webhook Processing
```
1. Check Railway logs for webhook events:
   - [WEBHOOK] checkout.session.completed: cs_test_...
   - [WEBHOOK] Provisioning complete for test@example.com → tenant_schema
2. Verify tenant created in database
3. Verify user.tenant is set
4. Verify user.is_staff = True, user.role = 'manager'
```

### 5. Payment Success Polling
```
1. On /payment/success page:
   - Verify polling starts (every 3 seconds)
   - Check status transitions: processing → completed
   - Verify automatic redirect to /dashboard
2. Check browser console for API calls
```

### 6. Email Notification
```
1. Check email inbox for welcome email
2. Verify email contains secure access link
3. Click on access link
4. Verify redirect to /tenant/accept?token=...
```

### 7. Tenant Access Flow
```
1. On /tenant/accept page:
   - Verify token validation
   - Check JWT tokens are stored in localStorage
   - Verify redirect to /dashboard
2. Check browser console for successful API calls
```

## Database Verification

### 1. Check User Record
```sql
-- In Railway database console
SELECT 
    email, 
    is_staff, 
    role, 
    stripe_checkout_session_id,
    tenant_id
FROM users_customuser 
WHERE email = 'test@example.com';
```

### 2. Check Tenant Record
```sql
-- Check tenant was created
SELECT 
    schema_name, 
    name, 
    is_active,
    created_on
FROM tenants_client 
WHERE schema_name LIKE '%test%';
```

### 3. Check Subscription Record
```sql
-- Check subscription was created
SELECT 
    user_id,
    plan_id,
    status,
    stripe_checkout_session_id,
    created_at
FROM billing_usersubscription 
WHERE stripe_checkout_session_id = 'cs_test_...';
```

### 4. Check Domain Record
```sql
-- Check domain was created
SELECT 
    domain,
    tenant_id,
    is_primary
FROM tenants_domain 
WHERE tenant_id = (SELECT id FROM tenants_client WHERE schema_name LIKE '%test%');
```

## API Testing

### 1. Test Plans API
```bash
curl -X GET https://linuxversion-production.up.railway.app/api/billing/plans/
```

### 2. Test Checkout Session Creation
```bash
curl -X POST https://linuxversion-production.up.railway.app/api/billing/create-checkout-session/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"plan_id": 1, "building_name": "Test Building"}'
```

### 3. Test Subscription Status
```bash
curl -X GET https://linuxversion-production.up.railway.app/api/billing/subscription-status/cs_test_.../
```

### 4. Test Tenant Accept
```bash
curl -X POST https://linuxversion-production.up.railway.app/api/tenants/accept-invite/ \
  -H "Content-Type: application/json" \
  -d '{"token": "YOUR_SECURE_TOKEN"}'
```

## Error Scenarios Testing

### 1. Duplicate Webhook
```
1. Complete payment
2. Manually trigger webhook again
3. Verify idempotency: no duplicate tenant created
4. Check Railway logs: "Tenant already exists"
```

### 2. Invalid Token
```
1. Use expired or invalid token in /tenant/accept
2. Verify error handling
3. Check redirect to login
```

### 3. Network Issues
```
1. Disconnect internet during polling
2. Reconnect
3. Verify polling resumes
4. Check error handling
```

## Performance Testing

### 1. Load Testing
```
1. Create multiple users simultaneously
2. Monitor Railway logs for performance
3. Check database connection limits
4. Verify webhook processing time
```

### 2. Concurrent Payments
```
1. Complete multiple payments simultaneously
2. Verify all tenants are created
3. Check for race conditions
4. Monitor database locks
```

## Security Testing

### 1. CORS Testing
```
1. Try API calls from different domains
2. Verify CORS headers
3. Check for security vulnerabilities
```

### 2. Token Security
```
1. Test expired tokens
2. Test invalid tokens
3. Verify token rotation
4. Check for token leakage
```

## Monitoring & Logs

### 1. Railway Logs
```
- Check for webhook events
- Monitor error rates
- Verify provisioning success
- Check email sending status
```

### 2. Stripe Dashboard
```
- Monitor webhook deliveries
- Check payment success rates
- Verify event processing
- Monitor for failed webhooks
```

### 3. Vercel Logs
```
- Check for build errors
- Monitor API call success rates
- Verify environment variables
- Check for CORS issues
```

## Success Criteria

### ✅ All Tests Pass
- [ ] Registration → Plans → Checkout → Success flow
- [ ] Webhook processing with idempotency
- [ ] Tenant provisioning successful
- [ ] Email notification sent
- [ ] Token validation working
- [ ] Dashboard access granted

### ✅ Performance Acceptable
- [ ] Registration < 2 seconds
- [ ] Checkout session creation < 1 second
- [ ] Webhook processing < 5 seconds
- [ ] Tenant provisioning < 30 seconds
- [ ] Email delivery < 1 minute

### ✅ Security Verified
- [ ] No CORS errors
- [ ] Token security working
- [ ] Webhook signature verification
- [ ] No sensitive data exposure
- [ ] Proper error handling

## Troubleshooting

### Common Issues
1. **CORS errors**: Check Railway CORS settings
2. **Webhook failures**: Check STRIPE_WEBHOOK_SECRET
3. **Email not sending**: Check EMAIL_HOST_PASSWORD
4. **Token validation fails**: Check token expiry
5. **Database errors**: Check migration status

### Debug Commands
```bash
# Check Railway logs
railway logs

# Check database connection
railway run python manage.py dbshell

# Test email sending
railway run python manage.py shell
>>> from django.core.mail import send_mail
>>> send_mail('Test', 'Test message', 'from@example.com', ['to@example.com'])
```
