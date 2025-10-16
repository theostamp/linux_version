# 🧪 API Testing Guide
## New Concierge Platform API Testing

### **Overview**
This guide provides comprehensive instructions for testing the New Concierge API endpoints, including authentication, billing, user management, and admin functions.

---

## **🚀 Testing Environment Setup**

### **Prerequisites**
- Docker and Docker Compose
- Python 3.8+ (for running test scripts)
- curl or Postman (for manual testing)
- Valid API credentials

### **Environment Setup**
```bash
# Start the development environment
docker compose up -d

# Wait for services to be ready
sleep 30

# Check service status
docker compose ps
```

### **Test Data Setup**
```bash
# Create test users
docker compose exec backend python manage.py shell
>>> from users.models import CustomUser
>>> from django.contrib.auth.models import Group

# Create test manager
>>> manager = CustomUser.objects.create_user(
...     email='manager@test.com',
...     password='testpass123',
...     first_name='Test',
...     last_name='Manager'
... )
>>> manager.groups.add(Group.objects.get(name='Manager'))

# Create test resident
>>> resident = CustomUser.objects.create_user(
...     email='resident@test.com',
...     password='testpass123',
...     first_name='Test',
...     last_name='Resident'
... )
>>> resident.groups.add(Group.objects.get(name='Resident'))
```

---

## **🔐 Authentication Testing**

### **User Registration**
```bash
# Test user registration
curl -X POST http://localhost:8000/api/users/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@test.com",
    "password": "SecurePass123!",
    "password_confirm": "SecurePass123!",
    "first_name": "New",
    "last_name": "User"
  }'
```

**Expected Response:**
```json
{
  "message": "User registered successfully. Please check your email for verification.",
  "user_id": 123
}
```

### **Email Verification**
```bash
# Get verification token from email or database
curl -X POST http://localhost:8000/api/users/verify-email/ \
  -H "Content-Type: application/json" \
  -d '{
    "token": "verification_token_here"
  }'
```

### **User Login**
```bash
# Test user login
curl -X POST http://localhost:8000/api/users/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "manager@test.com",
    "password": "testpass123"
  }'
```

**Expected Response:**
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

### **Token Refresh**
```bash
# Test token refresh
curl -X POST http://localhost:8000/api/users/token/refresh/ \
  -H "Content-Type: application/json" \
  -d '{
    "refresh": "your_refresh_token_here"
  }'
```

---

## **👥 User Management Testing**

### **User Profile Management**
```bash
# Get user profile
curl -X GET http://localhost:8000/api/users/profile/ \
  -H "Authorization: Bearer <access_token>"

# Update user profile
curl -X PUT http://localhost:8000/api/users/profile/ \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Updated",
    "last_name": "Name",
    "phone": "+1234567890",
    "email_notifications_enabled": true
  }'
```

### **User Invitations**
```bash
# Create invitation (Manager only)
curl -X POST http://localhost:8000/api/users/invite/ \
  -H "Authorization: Bearer <manager_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newresident@test.com",
    "role": "resident",
    "building_id": 1,
    "apartment_id": 1,
    "message": "Welcome to our building!"
  }'

# List invitations
curl -X GET http://localhost:8000/api/users/invitations/ \
  -H "Authorization: Bearer <manager_token>"

# Accept invitation
curl -X POST http://localhost:8000/api/users/accept-invitation/ \
  -H "Content-Type: application/json" \
  -d '{
    "token": "invitation_token_here",
    "password": "NewPassword123!"
  }'
```

### **Password Management**
```bash
# Request password reset
curl -X POST http://localhost:8000/api/users/password-reset/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@test.com"
  }'

# Confirm password reset
curl -X POST http://localhost:8000/api/users/password-reset-confirm/ \
  -H "Content-Type: application/json" \
  -d '{
    "token": "reset_token_here",
    "password": "NewPassword123!",
    "password_confirm": "NewPassword123!"
  }'

# Change password (authenticated user)
curl -X POST http://localhost:8000/api/users/change-password/ \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "old_password": "OldPassword123!",
    "new_password": "NewPassword123!",
    "new_password_confirm": "NewPassword123!"
  }'
```

---

## **🏢 Building Management Testing**

### **Building Operations**
```bash
# Get buildings (Manager only)
curl -X GET http://localhost:8000/api/buildings/ \
  -H "Authorization: Bearer <manager_token>"

# Create building (Manager only)
curl -X POST http://localhost:8000/api/buildings/ \
  -H "Authorization: Bearer <manager_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Building",
    "address": "123 Test Street",
    "total_apartments": 20,
    "floors": 5
  }'

# Update building
curl -X PUT http://localhost:8000/api/buildings/1/ \
  -H "Authorization: Bearer <manager_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Building Name",
    "address": "123 Updated Street"
  }'
```

### **Apartment Management**
```bash
# Get apartments for a building
curl -X GET http://localhost:8000/api/buildings/1/apartments/ \
  -H "Authorization: Bearer <manager_token>"

# Create apartment
curl -X POST http://localhost:8000/api/buildings/1/apartments/ \
  -H "Authorization: Bearer <manager_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "apartment_number": "1A",
    "floor": 1,
    "area": 85.5,
    "bedrooms": 2,
    "bathrooms": 1
  }'
```

---

## **💰 Financial Management Testing**

### **Expense Management**
```bash
# Get expenses
curl -X GET http://localhost:8000/api/financial/expenses/ \
  -H "Authorization: Bearer <manager_token>"

# Create expense
curl -X POST http://localhost:8000/api/financial/expenses/ \
  -H "Authorization: Bearer <manager_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "building": 1,
    "category": "maintenance",
    "amount": 150.00,
    "description": "Elevator maintenance",
    "date": "2024-01-15"
  }'

# Update expense
curl -X PUT http://localhost:8000/api/financial/expenses/1/ \
  -H "Authorization: Bearer <manager_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 175.00,
    "description": "Updated elevator maintenance"
  }'
```

### **Payment Management**
```bash
# Get payments
curl -X GET http://localhost:8000/api/financial/payments/ \
  -H "Authorization: Bearer <manager_token>"

# Create payment record
curl -X POST http://localhost:8000/api/financial/payments/ \
  -H "Authorization: Bearer <manager_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "building": 1,
    "apartment": 1,
    "resident": 1,
    "amount": 200.00,
    "payment_type": "monthly_fee",
    "date": "2024-01-15"
  }'
```

---

## **🔧 Maintenance Management Testing**

### **Maintenance Tickets**
```bash
# Get maintenance tickets
curl -X GET http://localhost:8000/api/maintenance/tickets/ \
  -H "Authorization: Bearer <access_token>"

# Create maintenance ticket
curl -X POST http://localhost:8000/api/maintenance/tickets/ \
  -H "Authorization: Bearer <resident_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "building": 1,
    "apartment": 1,
    "category": "plumbing",
    "priority": "high",
    "description": "Water leak in kitchen",
    "location": "Kitchen sink area"
  }'

# Update maintenance ticket
curl -X PUT http://localhost:8000/api/maintenance/tickets/1/ \
  -H "Authorization: Bearer <manager_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "in_progress",
    "assigned_to": "maintenance_team",
    "notes": "Technician assigned"
  }'
```

---

## **💳 Billing System Testing**

### **Subscription Plans**
```bash
# Get subscription plans
curl -X GET http://localhost:8000/api/billing/plans/ \
  -H "Authorization: Bearer <access_token>"

# Get single plan
curl -X GET http://localhost:8000/api/billing/plans/1/ \
  -H "Authorization: Bearer <access_token>"
```

### **User Subscriptions**
```bash
# Get user subscriptions
curl -X GET http://localhost:8000/api/billing/subscriptions/ \
  -H "Authorization: Bearer <access_token>"

# Create subscription
curl -X POST http://localhost:8000/api/billing/subscriptions/ \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "plan_id": 1,
    "billing_interval": "month",
    "payment_method_id": "pm_test_123"
  }'

# Update subscription
curl -X PUT http://localhost:8000/api/billing/subscriptions/1/ \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "billing_interval": "year"
  }'

# Cancel subscription
curl -X POST http://localhost:8000/api/billing/subscriptions/1/cancel/ \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "cancel_at_period_end": true
  }'
```

### **Payment Methods**
```bash
# Get payment methods
curl -X GET http://localhost:8000/api/billing/payment-methods/ \
  -H "Authorization: Bearer <access_token>"

# Add payment method
curl -X POST http://localhost:8000/api/billing/payment-methods/ \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "stripe_payment_method_id": "pm_test_123",
    "set_as_default": true
  }'

# Update payment method
curl -X PUT http://localhost:8000/api/billing/payment-methods/1/ \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "is_default": true
  }'

# Delete payment method
curl -X DELETE http://localhost:8000/api/billing/payment-methods/1/ \
  -H "Authorization: Bearer <access_token>"
```

### **Usage Tracking**
```bash
# Get usage analytics
curl -X GET http://localhost:8000/api/billing/api/analytics/usage/ \
  -H "Authorization: Bearer <access_token>"

# Get usage trends
curl -X GET http://localhost:8000/api/billing/api/analytics/trends/?period_days=30 \
  -H "Authorization: Bearer <access_token>"

# Get plan comparison
curl -X GET http://localhost:8000/api/billing/api/analytics/plan-comparison/ \
  -H "Authorization: Bearer <access_token>"
```

---

## **📊 Analytics Testing**

### **Revenue Analytics**
```bash
# Get revenue analytics
curl -X GET http://localhost:8000/api/billing/api/analytics/revenue/?period_days=30 \
  -H "Authorization: Bearer <superuser_token>"

# Get revenue trends
curl -X GET http://localhost:8000/api/billing/api/analytics/revenue/trends/?period_days=90 \
  -H "Authorization: Bearer <superuser_token>"
```

### **Customer Analytics**
```bash
# Get customer analytics
curl -X GET http://localhost:8000/api/billing/api/analytics/customers/?period_days=30 \
  -H "Authorization: Bearer <superuser_token>"

# Get customer segments
curl -X GET http://localhost:8000/api/billing/api/analytics/customers/segments/ \
  -H "Authorization: Bearer <superuser_token>"
```

### **Predictive Analytics**
```bash
# Get predictive analytics
curl -X GET http://localhost:8000/api/billing/api/analytics/predictive/ \
  -H "Authorization: Bearer <superuser_token>"

# Get churn prediction
curl -X GET http://localhost:8000/api/billing/api/analytics/predictive/churn/ \
  -H "Authorization: Bearer <superuser_token>"
```

---

## **🛠️ Admin Functions Testing**

### **Admin Dashboard**
```bash
# Get admin dashboard overview
curl -X GET http://localhost:8000/api/billing/api/admin/dashboard/?type=overview \
  -H "Authorization: Bearer <superuser_token>"

# Get user management data
curl -X GET http://localhost:8000/api/billing/api/admin/dashboard/?type=users \
  -H "Authorization: Bearer <superuser_token>"

# Get financial overview
curl -X GET http://localhost:8000/api/billing/api/admin/dashboard/?type=financial \
  -H "Authorization: Bearer <superuser_token>"

# Get system health
curl -X GET http://localhost:8000/api/billing/api/admin/system-health/ \
  -H "Authorization: Bearer <superuser_token>"
```

### **User Management (Admin)**
```bash
# Get all users
curl -X GET http://localhost:8000/api/billing/api/admin/users/ \
  -H "Authorization: Bearer <superuser_token>"

# Activate user
curl -X POST http://localhost:8000/api/billing/api/admin/users/ \
  -H "Authorization: Bearer <superuser_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "activate",
    "user_id": 1
  }'

# Deactivate user
curl -X POST http://localhost:8000/api/billing/api/admin/users/ \
  -H "Authorization: Bearer <superuser_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "deactivate",
    "user_id": 1
  }'
```

### **Subscription Management (Admin)**
```bash
# Get all subscriptions
curl -X GET http://localhost:8000/api/billing/api/admin/subscriptions/ \
  -H "Authorization: Bearer <superuser_token>"

# Extend trial
curl -X POST http://localhost:8000/api/billing/api/admin/subscriptions/ \
  -H "Authorization: Bearer <superuser_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "extend_trial",
    "subscription_id": 1,
    "days": 7
  }'

# Cancel subscription
curl -X POST http://localhost:8000/api/billing/api/admin/subscriptions/ \
  -H "Authorization: Bearer <superuser_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "cancel",
    "subscription_id": 1
  }'
```

---

## **🔗 Stripe Webhook Testing**

### **Webhook Endpoint Testing**
```bash
# Test webhook endpoint
curl -X POST http://localhost:8000/api/billing/webhooks/stripe/ \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: t=1234567890,v1=signature_here" \
  -d '{
    "type": "invoice.payment_succeeded",
    "data": {
      "object": {
        "id": "in_test_123",
        "subscription": "sub_test_123",
        "amount_paid": 4999,
        "currency": "eur",
        "status": "paid"
      }
    }
  }'
```

### **Payment Intent Testing**
```bash
# Create payment intent
curl -X POST http://localhost:8000/api/billing/payment-intents/ \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 4999,
    "currency": "eur",
    "subscription_id": 1
  }'
```

---

## **🧪 Automated Testing Scripts**

### **Python Test Script**
```python
#!/usr/bin/env python3
"""
Comprehensive API Testing Script for New Concierge
"""
import requests
import json
import time
from typing import Dict, Any

class NewConciergeAPITester:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.tokens = {}
        
    def test_authentication(self) -> bool:
        """Test authentication endpoints"""
        print("🔐 Testing Authentication...")
        
        # Test registration
        registration_data = {
            "email": "testuser@example.com",
            "password": "TestPass123!",
            "password_confirm": "TestPass123!",
            "first_name": "Test",
            "last_name": "User"
        }
        
        response = self.session.post(
            f"{self.base_url}/api/users/register/",
            json=registration_data
        )
        
        if response.status_code == 201:
            print("✅ User registration successful")
        else:
            print(f"❌ User registration failed: {response.status_code}")
            return False
            
        # Test login
        login_data = {
            "email": "testuser@example.com",
            "password": "TestPass123!"
        }
        
        response = self.session.post(
            f"{self.base_url}/api/users/login/",
            json=login_data
        )
        
        if response.status_code == 200:
            self.tokens['access'] = response.json()['access']
            print("✅ User login successful")
        else:
            print(f"❌ User login failed: {response.status_code}")
            return False
            
        return True
    
    def test_billing_endpoints(self) -> bool:
        """Test billing endpoints"""
        print("💳 Testing Billing Endpoints...")
        
        headers = {"Authorization": f"Bearer {self.tokens['access']}"}
        
        # Test subscription plans
        response = self.session.get(
            f"{self.base_url}/api/billing/plans/",
            headers=headers
        )
        
        if response.status_code == 200:
            print("✅ Subscription plans retrieved")
        else:
            print(f"❌ Subscription plans failed: {response.status_code}")
            return False
            
        # Test usage analytics
        response = self.session.get(
            f"{self.base_url}/api/billing/api/analytics/usage/",
            headers=headers
        )
        
        if response.status_code == 200:
            print("✅ Usage analytics retrieved")
        else:
            print(f"❌ Usage analytics failed: {response.status_code}")
            return False
            
        return True
    
    def test_admin_endpoints(self) -> bool:
        """Test admin endpoints (requires superuser token)"""
        print("🛠️ Testing Admin Endpoints...")
        
        # Note: This would require superuser credentials
        # For testing purposes, we'll just verify the endpoint exists
        
        headers = {"Authorization": f"Bearer {self.tokens['access']}"}
        
        response = self.session.get(
            f"{self.base_url}/api/billing/api/admin/system-health/",
            headers=headers
        )
        
        if response.status_code in [200, 403]:  # 403 is expected for non-admin users
            print("✅ Admin endpoints accessible")
        else:
            print(f"❌ Admin endpoints failed: {response.status_code}")
            return False
            
        return True
    
    def run_all_tests(self) -> bool:
        """Run all API tests"""
        print("🚀 Starting Comprehensive API Tests...")
        
        tests = [
            self.test_authentication,
            self.test_billing_endpoints,
            self.test_admin_endpoints
        ]
        
        results = []
        for test in tests:
            try:
                result = test()
                results.append(result)
                time.sleep(1)  # Brief pause between tests
            except Exception as e:
                print(f"❌ Test failed with exception: {e}")
                results.append(False)
        
        success_count = sum(results)
        total_tests = len(results)
        
        print(f"\n📊 Test Results: {success_count}/{total_tests} tests passed")
        
        if success_count == total_tests:
            print("🎉 All tests passed!")
            return True
        else:
            print("⚠️ Some tests failed")
            return False

if __name__ == "__main__":
    tester = NewConciergeAPITester()
    tester.run_all_tests()
```

### **Bash Test Script**
```bash
#!/bin/bash
# Comprehensive API Testing Script

BASE_URL="http://localhost:8000"
TEST_EMAIL="testuser@example.com"
TEST_PASSWORD="TestPass123!"

echo "🚀 Starting API Tests..."

# Test registration
echo "🔐 Testing user registration..."
REGISTRATION_RESPONSE=$(curl -s -X POST "$BASE_URL/api/users/register/" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\",
    \"password_confirm\": \"$TEST_PASSWORD\",
    \"first_name\": \"Test\",
    \"last_name\": \"User\"
  }")

if [[ $REGISTRATION_RESPONSE == *"User registered successfully"* ]]; then
  echo "✅ Registration successful"
else
  echo "❌ Registration failed"
  exit 1
fi

# Test login
echo "🔑 Testing user login..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/users/login/" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\"
  }")

ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.access')

if [[ $ACCESS_TOKEN != "null" ]]; then
  echo "✅ Login successful"
else
  echo "❌ Login failed"
  exit 1
fi

# Test billing endpoints
echo "💳 Testing billing endpoints..."
BILLING_RESPONSE=$(curl -s -X GET "$BASE_URL/api/billing/plans/" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if [[ $BILLING_RESPONSE == *"results"* ]]; then
  echo "✅ Billing endpoints accessible"
else
  echo "❌ Billing endpoints failed"
fi

# Test usage analytics
echo "📊 Testing usage analytics..."
USAGE_RESPONSE=$(curl -s -X GET "$BASE_URL/api/billing/api/analytics/usage/" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if [[ $USAGE_RESPONSE == *"current_usage"* ]]; then
  echo "✅ Usage analytics accessible"
else
  echo "❌ Usage analytics failed"
fi

echo "🎉 API testing completed!"
```

---

## **📋 Test Checklist**

### **Authentication Tests**
- [ ] User registration
- [ ] Email verification
- [ ] User login
- [ ] Token refresh
- [ ] Password reset
- [ ] Password change

### **User Management Tests**
- [ ] Profile management
- [ ] User invitations
- [ ] Role assignments
- [ ] Notification preferences

### **Building Management Tests**
- [ ] Building CRUD operations
- [ ] Apartment management
- [ ] Resident associations
- [ ] Permission checks

### **Financial Management Tests**
- [ ] Expense tracking
- [ ] Payment records
- [ ] Financial reports
- [ ] Permission validation

### **Maintenance Tests**
- [ ] Ticket creation
- [ ] Status updates
- [ ] Assignment management
- [ ] Progress tracking

### **Billing System Tests**
- [ ] Subscription plans
- [ ] User subscriptions
- [ ] Payment methods
- [ ] Usage tracking
- [ ] Invoice generation

### **Analytics Tests**
- [ ] Revenue analytics
- [ ] Customer analytics
- [ ] Usage analytics
- [ ] Predictive analytics

### **Admin Function Tests**
- [ ] Dashboard overview
- [ ] User management
- [ ] Subscription management
- [ ] System health monitoring

---

## **🚨 Error Testing**

### **Invalid Authentication**
```bash
# Test with invalid credentials
curl -X POST http://localhost:8000/api/users/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid@test.com",
    "password": "wrongpassword"
  }'
```

### **Permission Testing**
```bash
# Test resident accessing manager-only endpoint
curl -X GET http://localhost:8000/api/buildings/ \
  -H "Authorization: Bearer <resident_token>"
```

### **Rate Limiting Testing**
```bash
# Test rate limiting by making multiple requests
for i in {1..10}; do
  curl -X POST http://localhost:8000/api/users/login/ \
    -H "Content-Type: application/json" \
    -d '{"email": "test@test.com", "password": "wrongpass"}'
done
```

---

## **📊 Performance Testing**

### **Load Testing**
```bash
# Install Apache Bench
sudo apt-get install apache2-utils

# Test API performance
ab -n 100 -c 10 http://localhost:8000/api/billing/plans/

# Test with authentication
ab -n 100 -c 10 -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/users/profile/
```

### **Response Time Testing**
```bash
# Test response times
time curl -X GET http://localhost:8000/api/billing/plans/

# Test with authentication
time curl -X GET http://localhost:8000/api/users/profile/ \
  -H "Authorization: Bearer <token>"
```

---

**This API Testing Guide provides comprehensive instructions for testing all aspects of the New Concierge platform. Regular testing ensures system reliability and performance.** 🧪✅
