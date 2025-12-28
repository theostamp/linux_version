# App Separation Architecture Guide

## Overview

This document describes the complete separation of the monolithic Django application into two independent applications:

- **Public App (Next.js)**: Marketing site, signup, and payment processing
- **Core App (Django + Next.js)**: Multi-tenant building management application

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Public App (Next.js)                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Landing Page  │  │   Signup Page   │  │  Pricing Page   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Stripe Checkout │  │ Stripe Webhook  │  │ Payment Verify  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ HTTP POST with X-Internal-API-Key
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Core App (Django)                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Internal API    │  │ Tenant Service  │  │ User Management │ │
│  │ /api/internal/  │  │                 │  │                 │ │
│  │ tenants/create/ │  │                 │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Multi-tenant    │  │ Building        │  │ Financial       │ │
│  │ Dashboard       │  │ Management      │  │ Management      │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### Public App (Next.js)

**Location**: `/home/theo/project/public-app/`

**Features**:
- Modern landing page with hero section, features, and pricing
- User signup form with validation
- Stripe Checkout integration
- Stripe webhook handler
- Payment verification page

**Key Files**:
- `src/app/page.tsx` - Landing page
- `src/app/signup/page.tsx` - Signup form
- `src/app/api/create-checkout-session/route.ts` - Stripe Checkout API
- `src/app/api/webhooks/stripe/route.ts` - Stripe webhook handler
- `src/app/verify-payment/[session_id]/page.tsx` - Payment verification

### Core App (Django)

**Location**: `/home/theo/project/linux_version/backend/`

**Changes Made**:
- Removed public-facing URLs from `public_urls.py`
- Added internal API security with `IsInternalService` permission
- Created internal API endpoint for tenant creation
- Disabled tenant creation in Stripe webhook handler

**Key Files**:
- `core/permissions.py` - Internal API security
- `tenants/internal_views.py` - Internal tenant creation API
- `tenants/urls.py` - Internal API routes
- `billing/webhooks.py` - Modified webhook handler

## Environment Variables

### Public App

Create `.env.local` in `/home/theo/project/public-app/`:

```env
# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Internal API Configuration
INTERNAL_API_SECRET_KEY=your-secure-random-key-here-32-chars-min
CORE_API_URL=http://localhost:18000

# App Configuration
NEXT_PUBLIC_APP_NAME=New Concierge
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Core App

Add to existing `.env`:

```env
# Internal API Security
INTERNAL_API_SECRET_KEY=your-secure-random-key-here-32-chars-min
```

## Deployment Strategy

### Development

1. **Start Core App**:
   ```bash
   cd /home/theo/project/linux_version
   docker compose up -d
   ```

2. **Start Public App**:
   ```bash
   cd /home/theo/project/public-app
   npm run dev
   ```

3. **Test Stripe Webhooks** (optional):
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

### Production

#### Public App Deployment (Vercel/Netlify)

**Recommended**: Deploy to Vercel for optimal Next.js performance

1. Connect GitHub repository
2. Set environment variables in Vercel dashboard
3. Configure custom domain (e.g., `www.yourdomain.com`)

**Environment Variables**:
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `INTERNAL_API_SECRET_KEY`
- `CORE_API_URL` (production URL)
- `NEXT_PUBLIC_APP_URL` (production URL)

#### Core App Deployment

**Recommended**: Continue with existing Docker infrastructure

1. Deploy to DigitalOcean/AWS with Docker
2. Configure domain (e.g., `app.yourdomain.com`)
3. Set up SSL certificates
4. Configure CORS for Public App domain

## Security Considerations

### Internal API Security

- Uses `X-Internal-API-Key` header for authentication
- Secret key must be identical in both apps
- Generate strong, random 32+ character key
- Never commit secret keys to version control

### CORS Configuration

Core App must allow requests from Public App domain:

```python
CORS_ALLOWED_ORIGINS = [
    "https://www.yourdomain.com",  # Public App
    "https://yourdomain.com",      # Public App (without www)
]
```

### Stripe Security

- Use different webhook secrets for Public App vs Core App
- Verify webhook signatures in both handlers
- Use test keys for development, live keys for production

## API Flow

### Complete Signup Flow

1. **User visits Public App** (`www.yourdomain.com`)
2. **User fills signup form** with building details
3. **Public App creates Stripe Checkout session** with metadata
4. **User completes payment** on Stripe
5. **Stripe sends webhook** to Public App (`/api/webhooks/stripe`)
6. **Public App calls Core API** (`/api/internal/tenants/create/`)
7. **Core App creates tenant** and user account
8. **User redirected** to payment verification page
9. **User accesses building dashboard** at `tenant.yourdomain.com`

### Internal API Endpoint

**URL**: `POST /api/internal/tenants/create/`

**Headers**:
```
Content-Type: application/json
X-Internal-API-Key: your-secret-key
```

**Request Body**:
```json
{
  "schema_name": "tenant-subdomain",
  "user_data": {
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "password": "hashed_password"
  },
  "plan_id": 2,
  "stripe_customer_id": "cus_...",
  "stripe_subscription_id": "sub_..."
}
```

**Response**:
```json
{
  "success": true,
  "tenant": {
    "id": 123,
    "schema_name": "tenant-subdomain",
    "name": "John Doe's Building",
    "domain": "tenant-subdomain.localhost"
  },
  "subscription": {
    "id": 456,
    "status": "trial",
    "plan_id": 2
  },
  "user": {
    "id": 789,
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

## Troubleshooting

### Common Issues

1. **Internal API returns 403 Forbidden**
   - Check `INTERNAL_API_SECRET_KEY` is identical in both apps
   - Verify `X-Internal-API-Key` header is being sent

2. **Stripe webhook fails**
   - Check webhook secret is correct
   - Verify webhook URL is accessible
   - Check Core API URL is reachable from Public App

3. **Tenant creation fails**
   - Check database connection
   - Verify plan_id exists in database
   - Check user email is unique

4. **CORS errors**
   - Update `CORS_ALLOWED_ORIGINS` in Core App
   - Check domain configuration

### Logging

- Public App logs to console (check Vercel logs in production)
- Core App logs to Django logs (check Docker logs)
- Stripe webhook events logged in both apps

### Monitoring

- Set up alerts for failed webhook events
- Monitor tenant creation success rate
- Track payment completion rates

## Migration Notes

### Backward Compatibility

- Existing tenants continue to work normally
- Billing endpoints remain in Django for existing subscriptions
- No data migration required

### Rollback Plan

If issues arise:

1. Re-enable tenant creation in Django webhook handler
2. Update Public App to not call Core API
3. Revert URL changes in Django
4. Deploy previous version

## Future Enhancements

1. **Move billing logic** from Core App to Public App
2. **Add analytics** for signup conversion rates
3. **Implement A/B testing** for landing page
4. **Add email notifications** for signup completion
5. **Create admin dashboard** for Public App management

## Support

For issues or questions:

1. Check logs in both applications
2. Verify environment variables
3. Test API endpoints individually
4. Check Stripe dashboard for webhook events
5. Review this documentation

---

**Last Updated**: October 21, 2025
**Version**: 1.0.0
