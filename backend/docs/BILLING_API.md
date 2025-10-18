# 💰 Billing API Documentation

## Overview
The New Concierge Billing API provides comprehensive subscription management, payment processing, and analytics capabilities. This API handles everything from subscription plans to advanced business intelligence.

## Authentication
All billing endpoints require authentication via JWT tokens. Include the token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Base URL
```
http://localhost:8000/api/billing/
```

---

## 📋 Subscription Plans

### Get All Subscription Plans
```http
GET /api/billing/plans/
```

**Response:**
```json
{
  "count": 3,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "Starter",
      "description": "Perfect for small buildings",
      "plan_type": "basic",
      "price": "19.99",
      "billing_interval": "month",
      "is_active": true,
      "features": {
        "max_buildings": 1,
        "max_apartments": 10,
        "max_users": 5,
        "api_calls_per_month": 1000,
        "storage_gb": 5
      },
      "stripe_price_id_monthly": "price_123",
      "stripe_price_id_yearly": null
    }
  ]
}
```

### Get Single Subscription Plan
```http
GET /api/billing/plans/{id}/
```

---

## 👤 User Subscriptions

### Get User Subscriptions
```http
GET /api/billing/subscriptions/
```

**Response:**
```json
{
  "count": 1,
  "results": [
    {
      "id": 1,
      "plan": {
        "id": 1,
        "name": "Professional",
        "plan_type": "professional"
      },
      "status": "active",
      "billing_interval": "month",
      "price": "49.99",
      "currency": "eur",
      "current_period_start": "2024-01-01T00:00:00Z",
      "current_period_end": "2024-02-01T00:00:00Z",
      "trial_start": null,
      "trial_end": null,
      "cancel_at_period_end": false,
      "stripe_subscription_id": "sub_123",
      "stripe_customer_id": "cus_123"
    }
  ]
}
```

### Create New Subscription
```http
POST /api/billing/subscriptions/
Content-Type: application/json

{
  "plan_id": 2,
  "billing_interval": "month",
  "payment_method_id": "pm_123"
}
```

### Update Subscription
```http
PUT /api/billing/subscriptions/{id}/
PATCH /api/billing/subscriptions/{id}/

{
  "plan_id": 3,
  "billing_interval": "year"
}
```

### Cancel Subscription
```http
POST /api/billing/subscriptions/{id}/cancel/
{
  "cancel_at_period_end": true
}
```

---

## 💳 Payment Methods

### Get Payment Methods
```http
GET /api/billing/payment-methods/
```

**Response:**
```json
{
  "count": 1,
  "results": [
    {
      "id": 1,
      "payment_type": "card",
      "card_brand": "visa",
      "card_last4": "4242",
      "card_exp_month": 12,
      "card_exp_year": 2025,
      "is_default": true,
      "is_active": true,
      "stripe_payment_method_id": "pm_123"
    }
  ]
}
```

### Add Payment Method
```http
POST /api/billing/payment-methods/
{
  "stripe_payment_method_id": "pm_123",
  "set_as_default": true
}
```

### Update Payment Method
```http
PUT /api/billing/payment-methods/{id}/
PATCH /api/billing/payment-methods/{id}/

{
  "is_default": true
}
```

### Delete Payment Method
```http
DELETE /api/billing/payment-methods/{id}/
```

---

## 🧾 Invoices & Billing Cycles

### Get Invoices
```http
GET /api/billing/invoices/
```

**Response:**
```json
{
  "invoices": [
    {
      "id": 1,
      "subscription": {
        "id": 1,
        "plan": {
          "name": "Professional"
        }
      },
      "period_start": "2024-01-01T00:00:00Z",
      "period_end": "2024-02-01T00:00:00Z",
      "total_amount": "49.99",
      "currency": "eur",
      "status": "paid",
      "due_date": "2024-01-15T00:00:00Z",
      "paid_at": "2024-01-02T10:30:00Z",
      "stripe_invoice_id": "in_123",
      "stripe_payment_intent_id": "pi_123"
    }
  ]
}
```

### Process Payment
```http
POST /api/billing/payments/process/
{
  "invoice_id": 1,
  "payment_intent_id": "pi_123"
}
```

---

## 📊 Usage Tracking

### Get Usage Analytics
```http
GET /api/billing/api/analytics/usage/
```

**Response:**
```json
{
  "current_usage": {
    "api_calls": 450,
    "buildings": 2,
    "apartments": 15,
    "users": 8,
    "storage_gb": 2.5
  },
  "limits": {
    "api_calls": 1000,
    "buildings": 5,
    "apartments": 50,
    "users": 20,
    "storage_gb": 10
  },
  "utilization": {
    "api_calls": 45.0,
    "buildings": 40.0,
    "apartments": 30.0,
    "users": 40.0,
    "storage_gb": 25.0
  },
  "overage_charges": 0.00
}
```

### Get Usage Trends
```http
GET /api/billing/api/analytics/trends/?period_days=30
```

### Get Plan Comparison
```http
GET /api/billing/api/analytics/plan-comparison/
```

---

## 📈 Advanced Analytics

### Revenue Analytics
```http
GET /api/billing/api/analytics/revenue/?period_days=30
```

**Response:**
```json
{
  "period": {
    "start_date": "2024-01-01",
    "end_date": "2024-01-31",
    "days": 30
  },
  "total_revenue": 2499.50,
  "previous_period_revenue": 2100.00,
  "growth_rate": 19.02,
  "revenue_by_source": [
    {
      "subscription__plan__plan_type": "professional",
      "revenue": 1999.60,
      "count": 40,
      "avg_amount": 49.99
    }
  ],
  "revenue_by_plan": [
    {
      "subscription__plan__name": "Professional",
      "subscription__plan__plan_type": "professional",
      "revenue": 1999.60,
      "count": 40,
      "avg_amount": 49.99
    }
  ],
  "daily_revenue_trend": [
    {
      "date": "2024-01-01",
      "revenue": 49.99
    }
  ]
}
```

### Customer Analytics
```http
GET /api/billing/api/analytics/customers/?period_days=30
```

### Subscription Analytics
```http
GET /api/billing/api/analytics/subscriptions/?period_days=30
```

### Payment Analytics
```http
GET /api/billing/api/analytics/payments/?period_days=30
```

### Predictive Analytics
```http
GET /api/billing/api/analytics/predictive/
```

**Response:**
```json
{
  "revenue_forecast": {
    "forecasts": [
      {
        "month": "2024-02",
        "forecasted_revenue": 2750.00,
        "confidence": 75
      }
    ],
    "growth_trend": 250.50,
    "method": "linear_regression_6_months"
  },
  "churn_prediction": {
    "high_risk_customers": [
      {
        "email": "user@example.com",
        "failed_payment_count": 2,
        "low_usage_count": 3
      }
    ],
    "total_high_risk": 5,
    "prediction_method": "usage_and_payment_patterns"
  },
  "growth_projections": {
    "user_growth": {
      "monthly": 15,
      "annual_projection": 180
    },
    "revenue_growth": {
      "monthly": 2750.00,
      "annual_projection": 33000.00
    }
  }
}
```

---

## 🛠️ Admin APIs

### Admin Dashboard
```http
GET /api/billing/api/admin/dashboard/?type=overview
```

**Available types:**
- `overview` - System overview
- `users` - User management data
- `subscriptions` - Subscription management data
- `financial` - Financial overview
- `system` - System health

### User Management
```http
GET /api/billing/api/admin/users/
POST /api/billing/api/admin/users/
{
  "action": "activate",
  "user_id": 1
}
```

### Subscription Management
```http
GET /api/billing/api/admin/subscriptions/
POST /api/billing/api/admin/subscriptions/
{
  "action": "extend_trial",
  "subscription_id": 1,
  "days": 7
}
```

### Billing Management
```http
GET /api/billing/api/admin/billing/
POST /api/billing/api/admin/billing/
```

### System Health
```http
GET /api/billing/api/admin/system-health/
```

---

## 🔗 Stripe Webhooks

### Stripe Webhook Endpoint
```http
POST /api/billing/webhooks/stripe/
```

**Supported Events:**
- `invoice.payment_succeeded` - Payment successful
- `invoice.payment_failed` - Payment failed
- `customer.subscription.updated` - Subscription updated
- `customer.subscription.deleted` - Subscription cancelled

---

## 📝 Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid request data",
  "details": {
    "plan_id": ["This field is required."]
  }
}
```

### 401 Unauthorized
```json
{
  "error": "Authentication credentials were not provided."
}
```

### 403 Forbidden
```json
{
  "error": "Admin access required"
}
```

### 404 Not Found
```json
{
  "error": "Subscription not found"
}
```

### 429 Too Many Requests
```json
{
  "error": "Request was throttled. Expected available in 60 seconds."
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to process payment"
}
```

---

## 🔐 Rate Limiting

The following rate limits apply:

- **Authentication endpoints**: 5 requests per minute
- **Registration**: 3 requests per minute
- **Password reset**: 3 requests per minute
- **Invitations**: 10 requests per hour
- **Email verification**: 5 requests per minute
- **General API**: 1000 requests per hour per user

---

## 📊 Usage Limits

Usage limits are enforced based on subscription plans:

| Plan | Buildings | Apartments | Users | API Calls/Month | Storage (GB) |
|------|-----------|------------|-------|-----------------|--------------|
| Starter | 1 | 10 | 5 | 1,000 | 5 |
| Professional | 5 | 50 | 20 | 10,000 | 25 |
| Enterprise | Unlimited | Unlimited | Unlimited | 100,000 | 100 |

When limits are exceeded, requests return a 403 Forbidden error with upgrade suggestions.

---

## 🚀 Getting Started

1. **Register a user account** via `/api/users/register/`
2. **Verify your email** via `/api/users/verify-email/`
3. **View available plans** via `/api/billing/plans/`
4. **Subscribe to a plan** via `/api/billing/subscriptions/`
5. **Add payment method** via `/api/billing/payment-methods/`
6. **Monitor usage** via `/api/billing/api/analytics/usage/`

---

## 📞 Support

For API support and questions:
- Email: support@newconcierge.com
- Documentation: [API Docs](http://localhost:8000/api/docs/)
- Status: [System Status](http://localhost:8000/api/admin/system-health/)


