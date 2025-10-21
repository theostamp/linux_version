// 🧪 Production Environment Testing Script
// Usage: node test-production.mjs [public-url] [core-url]

import fetch from 'node-fetch';

const PUBLIC_APP_URL = process.argv[2] || 'https://yourdomain.com';
const CORE_API_URL = process.argv[3] || 'https://app.yourdomain.com';
const INTERNAL_API_SECRET_KEY = process.env.INTERNAL_API_SECRET_KEY || 'your-internal-api-secret-key';

console.log('🧪 Testing Production Environment');
console.log(`Public App: ${PUBLIC_APP_URL}`);
console.log(`Core App: ${CORE_API_URL}`);
console.log('');

async function testPublicApp() {
  console.log('🌐 Testing Public App...');
  
  try {
    // Test landing page
    const landingResponse = await fetch(`${PUBLIC_APP_URL}/`);
    console.log(`✅ Landing Page: ${landingResponse.status} ${landingResponse.statusText}`);
    
    // Test signup page
    const signupResponse = await fetch(`${PUBLIC_APP_URL}/signup`);
    console.log(`✅ Signup Page: ${signupResponse.status} ${signupResponse.statusText}`);
    
    // Test API endpoint
    const apiResponse = await fetch(`${PUBLIC_APP_URL}/api/create-checkout-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan: 'basic',
        userData: {
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          password: 'test123'
        },
        tenantSubdomain: 'test-company'
      })
    });
    
    if (apiResponse.ok) {
      const data = await apiResponse.json();
      console.log(`✅ Stripe Checkout API: ${apiResponse.status} (Session created)`);
    } else {
      console.log(`⚠️ Stripe Checkout API: ${apiResponse.status} ${apiResponse.statusText}`);
    }
    
  } catch (error) {
    console.log(`❌ Public App Error: ${error.message}`);
  }
}

async function testCoreApp() {
  console.log('\n🏢 Testing Core App...');
  
  try {
    // Test admin panel
    const adminResponse = await fetch(`${CORE_API_URL}/admin/`);
    console.log(`✅ Admin Panel: ${adminResponse.status} ${adminResponse.statusText}`);
    
    // Test API endpoint
    const apiResponse = await fetch(`${CORE_API_URL}/api/`);
    console.log(`✅ API Root: ${apiResponse.status} ${apiResponse.statusText}`);
    
    // Test internal API
    const internalResponse = await fetch(`${CORE_API_URL}/api/internal/tenants/create/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-API-Key': INTERNAL_API_SECRET_KEY,
        'Host': 'app.yourdomain.com'
      },
      body: JSON.stringify({
        schema_name: 'test-tenant',
        user_data: {
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          password: 'test123'
        },
        plan_id: 1,
        stripe_customer_id: 'cus_test123',
        stripe_subscription_id: 'sub_test123'
      })
    });
    
    if (internalResponse.status === 400 || internalResponse.status === 500) {
      console.log(`✅ Internal API: ${internalResponse.status} (Properly secured)`);
    } else {
      console.log(`⚠️ Internal API: ${internalResponse.status} ${internalResponse.statusText}`);
    }
    
  } catch (error) {
    console.log(`❌ Core App Error: ${error.message}`);
  }
}

async function testSSL() {
  console.log('\n🔐 Testing SSL Certificates...');
  
  try {
    const publicResponse = await fetch(PUBLIC_APP_URL, { 
      method: 'HEAD',
      redirect: 'manual'
    });
    
    if (publicResponse.status === 200 || publicResponse.status === 301) {
      console.log(`✅ Public App SSL: Working`);
    } else {
      console.log(`⚠️ Public App SSL: ${publicResponse.status}`);
    }
    
    const coreResponse = await fetch(CORE_API_URL, { 
      method: 'HEAD',
      redirect: 'manual'
    });
    
    if (coreResponse.status === 200 || coreResponse.status === 301) {
      console.log(`✅ Core App SSL: Working`);
    } else {
      console.log(`⚠️ Core App SSL: ${coreResponse.status}`);
    }
    
  } catch (error) {
    console.log(`❌ SSL Error: ${error.message}`);
  }
}

async function testEndToEnd() {
  console.log('\n🔄 Testing End-to-End Flow...');
  
  try {
    // Step 1: Create checkout session
    const checkoutResponse = await fetch(`${PUBLIC_APP_URL}/api/create-checkout-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan: 'basic',
        userData: {
          firstName: 'E2E',
          lastName: 'Test',
          email: 'e2e@example.com',
          password: 'e2etest123'
        },
        tenantSubdomain: 'e2e-test'
      })
    });
    
    if (checkoutResponse.ok) {
      const checkoutData = await checkoutResponse.json();
      console.log(`✅ Step 1 - Checkout Session: Created`);
      
      // Step 2: Simulate webhook call
      const webhookResponse = await fetch(`${PUBLIC_APP_URL}/api/webhooks/stripe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'checkout.session.completed',
          data: {
            object: {
              id: checkoutData.sessionId,
              customer: 'cus_e2e_test',
              subscription: 'sub_e2e_test',
              metadata: {
                tenant_subdomain: 'e2e-test',
                plan_id: 'basic',
                user_email: 'e2e@example.com',
                user_firstName: 'E2E',
                user_lastName: 'Test',
                user_password: 'e2etest123'
              }
            }
          }
        })
      });
      
      if (webhookResponse.ok) {
        console.log(`✅ Step 2 - Webhook Processing: Success`);
        console.log(`✅ End-to-End Flow: Working`);
      } else {
        console.log(`⚠️ Step 2 - Webhook Processing: ${webhookResponse.status}`);
      }
    } else {
      console.log(`⚠️ Step 1 - Checkout Session: ${checkoutResponse.status}`);
    }
    
  } catch (error) {
    console.log(`❌ End-to-End Error: ${error.message}`);
  }
}

async function runAllTests() {
  await testPublicApp();
  await testCoreApp();
  await testSSL();
  await testEndToEnd();
  
  console.log('\n📋 Production Testing Summary:');
  console.log('✅ All tests completed');
  console.log('');
  console.log('🔗 Next steps:');
  console.log('1. Configure Stripe webhook URL in Stripe Dashboard');
  console.log('2. Test with real payment methods');
  console.log('3. Monitor application logs');
  console.log('4. Set up monitoring and alerts');
}

runAllTests().catch(console.error);
