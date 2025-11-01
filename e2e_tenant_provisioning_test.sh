#!/bin/bash

# End-to-End Tenant Provisioning Test Script
# Tests the full flow: Stripe checkout → webhook → tenant creation → workspace access

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="${BACKEND_URL:-https://linuxversion-production.up.railway.app}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"
TEST_EMAIL="${TEST_EMAIL:-test-tenant-$(date +%s)@example.com}"
TEST_PASSWORD="${TEST_PASSWORD:-TestPassword123!}"

# Functions
print_header() {
    echo ""
    echo -e "${BLUE}====================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}====================================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Step 1: Create user account
step1_create_user() {
    print_header "Step 1: Create User Account"
    
    print_info "Creating user account: $TEST_EMAIL"
    
    RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/users/register/" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"$TEST_EMAIL\",
            \"password\": \"$TEST_PASSWORD\",
            \"first_name\": \"Test\",
            \"last_name\": \"User\"
        }")
    
    if echo "$RESPONSE" | grep -q "success\|created"; then
        print_success "User account created successfully"
        echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
    else
        print_error "Failed to create user account"
        echo "$RESPONSE"
        exit 1
    fi
}

# Step 2: Complete Stripe checkout (simulate)
step2_checkout() {
    print_header "Step 2: Complete Stripe Checkout"
    
    print_warning "This step requires manual Stripe checkout completion"
    print_info "Please complete checkout in Stripe test mode and provide session_id"
    read -p "Enter Stripe checkout session_id: " SESSION_ID
    
    if [ -z "$SESSION_ID" ]; then
        print_error "Session ID is required"
        exit 1
    fi
    
    print_success "Session ID captured: $SESSION_ID"
    export SESSION_ID
}

# Step 3: Wait for webhook completion
step3_wait_webhook() {
    print_header "Step 3: Wait for Webhook Completion"
    
    if [ -z "$SESSION_ID" ]; then
        print_error "Session ID not set"
        exit 1
    fi
    
    print_info "Polling subscription status for session: $SESSION_ID"
    print_info "Checking every 3 seconds (max 60 seconds)..."
    
    MAX_ATTEMPTS=20
    ATTEMPT=0
    
    while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
        ATTEMPT=$((ATTEMPT + 1))
        
        RESPONSE=$(curl -s -X GET "$BACKEND_URL/api/billing/subscription-status/$SESSION_ID/")
        STATUS=$(echo "$RESPONSE" | jq -r '.status' 2>/dev/null || echo "not_found")
        
        print_info "Attempt $ATTEMPT/$MAX_ATTEMPTS - Status: $STATUS"
        
        if [ "$STATUS" == "completed" ]; then
            print_success "Webhook completed successfully!"
            echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
            
            # Extract access token if available
            ACCESS_TOKEN=$(echo "$RESPONSE" | jq -r '.access' 2>/dev/null || echo "")
            if [ -n "$ACCESS_TOKEN" ] && [ "$ACCESS_TOKEN" != "null" ]; then
                export ACCESS_TOKEN
                print_success "Access token received"
            fi
            
            return 0
        elif [ "$STATUS" == "failed" ]; then
            print_error "Webhook processing failed"
            echo "$RESPONSE"
            exit 1
        fi
        
        sleep 3
    done
    
    print_error "Webhook did not complete within timeout"
    print_warning "Please check backend logs for provisioning errors"
    exit 1
}

# Step 4: Check email for workspace access token
step4_check_email() {
    print_header "Step 4: Check Email for Workspace Access Token"
    
    print_warning "This step requires manual email checking"
    print_info "Please check email inbox for: $TEST_EMAIL"
    print_info "Look for welcome email with workspace access link"
    read -p "Enter token from email (or press Enter to skip): " EMAIL_TOKEN
    
    if [ -z "$EMAIL_TOKEN" ]; then
        print_warning "Skipping email token verification"
        print_info "You can regenerate token with:"
        print_info "python manage.py regenerate_tenant_token $TEST_EMAIL --send-email"
    else
        print_success "Email token captured"
        export EMAIL_TOKEN
    fi
}

# Step 5: Test workspace access endpoint
step5_test_access() {
    print_header "Step 5: Test Workspace Access Endpoint"
    
    if [ -z "$EMAIL_TOKEN" ]; then
        print_warning "Email token not available, skipping workspace access test"
        return 0
    fi
    
    print_info "Testing /api/tenants/accept-invite/ endpoint"
    print_info "⚠️  NOTE: This is DIFFERENT from /api/users/invitations/accept/ (resident invitations)"
    
    RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/tenants/accept-invite/" \
        -H "Content-Type: application/json" \
        -d "{
            \"token\": \"$EMAIL_TOKEN\"
        }")
    
    if echo "$RESPONSE" | grep -q "success\|access"; then
        print_success "Workspace access granted successfully!"
        echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
        
        # Extract access token
        NEW_ACCESS_TOKEN=$(echo "$RESPONSE" | jq -r '.access' 2>/dev/null || echo "")
        if [ -n "$NEW_ACCESS_TOKEN" ] && [ "$NEW_ACCESS_TOKEN" != "null" ]; then
            export NEW_ACCESS_TOKEN
            print_success "New access token received"
        fi
    else
        print_error "Failed to grant workspace access"
        echo "$RESPONSE"
        exit 1
    fi
}

# Step 6: Verify cross-schema access
step6_verify_cross_schema() {
    print_header "Step 6: Verify Cross-Schema Access"
    
    if [ -z "$NEW_ACCESS_TOKEN" ] && [ -z "$ACCESS_TOKEN" ]; then
        print_warning "Access token not available, skipping cross-schema verification"
        return 0
    fi
    
    TOKEN=${NEW_ACCESS_TOKEN:-$ACCESS_TOKEN}
    
    print_info "Testing GET /api/buildings/public/ with access token"
    
    RESPONSE=$(curl -s -X GET "$BACKEND_URL/api/buildings/public/" \
        -H "Authorization: Bearer $TOKEN")
    
    if echo "$RESPONSE" | grep -q "\[\]"; then
        print_warning "No buildings found (may be normal for new tenant)"
    elif echo "$RESPONSE" | jq -e '. | type == "array"' > /dev/null 2>&1; then
        print_success "Buildings retrieved successfully (cross-schema access verified)"
        BUILDING_COUNT=$(echo "$RESPONSE" | jq '. | length' 2>/dev/null || echo "0")
        print_info "Found $BUILDING_COUNT buildings in tenant schema"
    else
        print_error "Failed to retrieve buildings or unexpected response format"
        echo "$RESPONSE"
        exit 1
    fi
}

# Step 7: Verify database state
step7_verify_db() {
    print_header "Step 7: Verify Database State"
    
    print_info "Checking database provisioning status"
    print_info "Run these commands manually to verify:"
    echo ""
    echo "  python scripts/check_tenant_provisioning.py --email $TEST_EMAIL"
    echo "  python scripts/verify_webhook_completion.py --email $TEST_EMAIL"
    echo ""
    print_warning "Manual verification required"
}

# Main execution
main() {
    print_header "END-TO-END TENANT PROVISIONING TEST"
    print_info "Backend URL: $BACKEND_URL"
    print_info "Frontend URL: $FRONTEND_URL"
    print_info "Test Email: $TEST_EMAIL"
    echo ""
    
    # Check dependencies
    if ! command -v curl &> /dev/null; then
        print_error "curl is required but not installed"
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        print_warning "jq is not installed (JSON parsing will be limited)"
    fi
    
    # Run test steps
    step1_create_user
    step2_checkout
    step3_wait_webhook
    step4_check_email
    step5_test_access
    step6_verify_cross_schema
    step7_verify_db
    
    # Final summary
    print_header "TEST SUMMARY"
    print_success "End-to-end test completed!"
    echo ""
    print_info "Test Email: $TEST_EMAIL"
    print_info "Session ID: $SESSION_ID"
    if [ -n "$ACCESS_TOKEN" ]; then
        print_info "Access Token: ${ACCESS_TOKEN:0:20}..."
    fi
    if [ -n "$NEW_ACCESS_TOKEN" ]; then
        print_info "New Access Token: ${NEW_ACCESS_TOKEN:0:20}..."
    fi
    echo ""
    print_info "Next steps:"
    print_info "1. Verify tenant in database: check_tenant_provisioning.py"
    print_info "2. Check backend logs for provisioning errors"
    print_info "3. Test dashboard access with access token"
    echo ""
}

# Run main function
main

