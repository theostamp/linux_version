// Debug script για έλεγχο heating_mills στο frontend
// Εκτέλεση στο browser console

async function debugHeatingData() {
  console.log('🔥 Debug Heating Data...');
  
  try {
    // Test 1: Direct API call
    console.log('📡 Test 1: Direct API call');
    const response = await fetch('/api/financial/building/4/apartments-summary/', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include'
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API Response (first 3 apartments):');
      data.slice(0, 3).forEach((apt, index) => {
        console.log(`   ${index + 1}. ${apt.number}: participation=${apt.participation_mills}, heating=${apt.heating_mills}, elevator=${apt.elevator_mills}`);
      });
    }
    
    // Test 2: Check if fetchApartmentsWithFinancialData is available
    console.log('\n📡 Test 2: Check frontend function');
    if (typeof window !== 'undefined' && window.fetchApartmentsWithFinancialData) {
      console.log('✅ fetchApartmentsWithFinancialData is available');
    } else {
      console.log('❌ fetchApartmentsWithFinancialData not available');
    }
    
    // Test 3: Check React components
    console.log('\n📡 Test 3: Check React components');
    const reactElements = document.querySelectorAll('[data-testid*="heating"], [class*="heating"]');
    console.log(`Found ${reactElements.length} heating-related elements`);
    
    // Test 4: Check localStorage for building selection
    console.log('\n📡 Test 4: Check localStorage');
    const selectedBuildingId = localStorage.getItem('selectedBuildingId');
    console.log('Selected Building ID:', selectedBuildingId);
    
    // Test 5: Check current URL and building context
    console.log('\n📡 Test 5: Check current context');
    console.log('Current URL:', window.location.href);
    console.log('Current pathname:', window.location.pathname);
    
    // Test 6: Look for heating data in DOM
    console.log('\n📡 Test 6: Search for heating data in DOM');
    const heatingElements = Array.from(document.querySelectorAll('*')).filter(el => 
      el.textContent && el.textContent.includes('θέρμανση') || 
      el.textContent && el.textContent.includes('heating')
    );
    console.log(`Found ${heatingElements.length} elements with heating text`);
    
    if (heatingElements.length > 0) {
      console.log('Sample heating elements:');
      heatingElements.slice(0, 3).forEach((el, index) => {
        console.log(`   ${index + 1}. ${el.tagName}: ${el.textContent.substring(0, 100)}...`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the debug
debugHeatingData();

