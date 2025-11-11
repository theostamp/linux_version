#!/usr/bin/env node
/**
 * Integration Test Script
 * Tests the connection between frontend and backend
 * 
 * Usage:
 *   node scripts/test-app-connection.mjs
 *   API_BASE_URL=https://backend.up.railway.app node scripts/test-app-connection.mjs
 */

const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'https://linuxversion-production.up.railway.app';
const FRONTEND_URL = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_APP_URL;

const tests = [
  {
    name: 'Backend Health Check',
    url: `${API_BASE_URL}/api/health/`,
    method: 'GET',
    expectedStatus: 200,
    type: 'backend',
  },
  {
    name: 'Backend Database Health Check',
    url: `${API_BASE_URL}/api/health/db/`,
    method: 'GET',
    expectedStatus: 200,
    type: 'backend',
  },
  {
    name: 'Backend API Root',
    url: `${API_BASE_URL}/api/`,
    method: 'GET',
    expectedStatus: 200,
    type: 'backend',
  },
];

// Add frontend test if URL is provided
if (FRONTEND_URL) {
  tests.push({
    name: 'Frontend Health Check',
    url: `${FRONTEND_URL}/api/health`,
    method: 'GET',
    expectedStatus: 200,
    type: 'frontend',
  });
}

async function runTest(test) {
  try {
    console.log(`\n🧪 Testing: ${test.name}`);
    console.log(`   URL: ${test.url}`);
    
    const response = await fetch(test.url, {
      method: test.method,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const statusOk = response.status === test.expectedStatus;
    const statusIcon = statusOk ? '✅' : '❌';
    
    console.log(`   ${statusIcon} Status: ${response.status} (expected: ${test.expectedStatus})`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`   Response:`, JSON.stringify(data, null, 2).slice(0, 200));
    } else {
      const text = await response.text();
      console.log(`   Error: ${text.slice(0, 200)}`);
    }
    
    // Check CORS headers
    const corsHeader = response.headers.get('access-control-allow-origin');
    if (corsHeader) {
      console.log(`   ✅ CORS Header: ${corsHeader}`);
    } else {
      console.log(`   ⚠️  No CORS header found`);
    }
    
    return statusOk;
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('\n🚀 Integration Test - Frontend/Backend Connection');
  console.log('='.repeat(70));
  console.log(`📡 Backend URL: ${API_BASE_URL}`);
  if (FRONTEND_URL) {
    console.log(`🌐 Frontend URL: ${FRONTEND_URL}`);
  } else {
    console.log(`🌐 Frontend URL: (not set, skipping frontend tests)`);
  }
  console.log('='.repeat(70));
  
  const results = [];
  
  for (const test of tests) {
    const passed = await runTest(test);
    results.push({ ...test, passed });
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('📊 Test Results Summary');
  console.log('='.repeat(70));
  
  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  
  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.name}`);
  });
  
  console.log(`\nTotal: ${passedCount}/${totalCount} tests passed`);
  
  if (passedCount === totalCount) {
    console.log('✅ All tests passed!');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

