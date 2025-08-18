// Debug script για έλεγχο δεδομένων αποθεματικού στο localStorage
// Εκτέλεση στο browser console

function debugReserveFund() {
  console.log('💰 Debug Reserve Fund Data...');
  
  try {
    // Get current building ID from URL or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const buildingIdFromUrl = urlParams.get('building');
    const selectedBuildingId = localStorage.getItem('selectedBuildingId');
    
    console.log('🏢 Building IDs:');
    console.log('   From URL:', buildingIdFromUrl);
    console.log('   From localStorage:', selectedBuildingId);
    
    // Check all reserve fund related localStorage keys
    const buildingId = selectedBuildingId || buildingIdFromUrl || '4'; // Default to 4 for Αλκμάνος 22
    console.log('   Using building ID:', buildingId);
    
    const storageKeys = ['goal', 'start_date', 'target_date', 'duration_months', 'monthly_target'];
    const reserveFundData = {};
    
    console.log('\n📦 Reserve Fund localStorage data:');
    storageKeys.forEach(key => {
      const storageKey = `reserve_fund_${buildingId}_${key}`;
      const value = localStorage.getItem(storageKey);
      reserveFundData[key] = value ? JSON.parse(value) : null;
      console.log(`   ${storageKey}:`, value ? JSON.parse(value) : 'null');
    });
    
    // Check if data exists
    const hasData = Object.values(reserveFundData).some(value => value !== null);
    console.log('\n🔍 Data Status:', hasData ? '✅ Found data' : '❌ No data found');
    
    if (!hasData) {
      console.log('\n💡 Solution: Set default values');
      console.log('   Run this to set default values:');
      console.log(`
        // Set default reserve fund data
        localStorage.setItem('reserve_fund_${buildingId}_goal', '2000');
        localStorage.setItem('reserve_fund_${buildingId}_start_date', '"2025-08-01"');
        localStorage.setItem('reserve_fund_${buildingId}_target_date', '"2026-07-31"');
        localStorage.setItem('reserve_fund_${buildingId}_duration_months', '12');
        localStorage.setItem('reserve_fund_${buildingId}_monthly_target', '166.67"');
        
        // Refresh the page
        window.location.reload();
      `);
    }
    
    // Check all localStorage keys for this building
    console.log('\n🔍 All localStorage keys for this building:');
    const allKeys = Object.keys(localStorage);
    const buildingKeys = allKeys.filter(key => key.includes(`reserve_fund_${buildingId}`));
    buildingKeys.forEach(key => {
      console.log(`   ${key}:`, localStorage.getItem(key));
    });
    
    // Check if there are any reserve fund keys for other buildings
    const otherBuildingKeys = allKeys.filter(key => key.includes('reserve_fund_') && !key.includes(`reserve_fund_${buildingId}`));
    if (otherBuildingKeys.length > 0) {
      console.log('\n🏢 Reserve fund keys for other buildings:');
      otherBuildingKeys.forEach(key => {
        console.log(`   ${key}:`, localStorage.getItem(key));
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Function to set default reserve fund data
function setDefaultReserveFundData(buildingId = '4') {
  console.log('💰 Setting default reserve fund data for building:', buildingId);
  
  try {
    localStorage.setItem(`reserve_fund_${buildingId}_goal`, '2000');
    localStorage.setItem(`reserve_fund_${buildingId}_start_date`, '"2025-08-01"');
    localStorage.setItem(`reserve_fund_${buildingId}_target_date`, '"2026-07-31"');
    localStorage.setItem(`reserve_fund_${buildingId}_duration_months`, '12');
    localStorage.setItem(`reserve_fund_${buildingId}_monthly_target`, '166.67');
    
    console.log('✅ Default data set successfully!');
    console.log('🔄 Refreshing page...');
    
    setTimeout(() => {
      window.location.reload();
    }, 1000);
    
  } catch (error) {
    console.error('❌ Error setting default data:', error);
  }
}

// Run the debug
debugReserveFund();

// Export functions for manual use
window.debugReserveFund = debugReserveFund;
window.setDefaultReserveFundData = setDefaultReserveFundData;
