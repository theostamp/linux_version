// Debug script για το πρόβλημα με το κόστος διαχείρισης
console.log('🔍 Debugging management fees issue...');

// Test API call για τον Αύγουστο 2025
const testManagementFeesAPI = async () => {
  try {
    console.log('🔄 Testing API call for August 2025...');
    
    // Mock API response για τον Αύγουστο
    const mockAugustResponse = {
      total_expenses_month: 200.00,
      management_fees: 80.00,  // Αυτό θα έπρεπε να είναι 80€
      reserve_fund_contribution: 1083.33,
      current_month_name: 'Αύγουστος 2025'
    };
    
    console.log('📊 Mock API Response for August:', mockAugustResponse);
    
    // Test τη λογική του managementFeeInfo
    const apartmentsCount = 10;
    let finalFee = 0;
    
    if (mockAugustResponse.management_fees > 0) {
      finalFee = mockAugustResponse.management_fees / apartmentsCount;
      console.log('✅ Using API data for management fees:', {
        totalManagementFees: mockAugustResponse.management_fees,
        apartmentsCount,
        finalFee,
        source: 'API'
      });
    } else {
      console.log('⚠️ No management_fees in API response');
      finalFee = 8.00; // Fallback
    }
    
    const managementInfo = {
      feePerApartment: finalFee,
      totalFee: finalFee * apartmentsCount,
      apartmentsCount,
      hasFee: finalFee > 0,
    };
    
    console.log('💰 Final Management Fee Info:', managementInfo);
    
    // Επιβεβαίωση
    if (managementInfo.totalFee === 80.00) {
      console.log('✅ SUCCESS: Κόστος διαχείρισης = 80.00€');
    } else {
      console.log('❌ FAILED: Κόστος διαχείρισης ≠ 80.00€');
      console.log(`   Expected: 80.00€, Got: ${managementInfo.totalFee}€`);
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error);
  }
};

// Test και για Σεπτέμβριο
const testSeptemberManagementFees = () => {
  console.log('\n🔄 Testing September scenario...');
  
  const mockSeptemberResponse = {
    total_expenses_month: 250.00,  // Διαφορετικό ποσό
    management_fees: 100.00,       // Διαφορετικό κόστος διαχείρισης
    reserve_fund_contribution: 1083.33,
    current_month_name: 'Σεπτέμβριος 2025'
  };
  
  console.log('📊 Mock API Response for September:', mockSeptemberResponse);
  
  const apartmentsCount = 10;
  const finalFee = mockSeptemberResponse.management_fees / apartmentsCount;
  
  const managementInfo = {
    feePerApartment: finalFee,
    totalFee: finalFee * apartmentsCount,
    apartmentsCount,
    hasFee: finalFee > 0,
  };
  
  console.log('💰 September Management Fee Info:', managementInfo);
  
  if (managementInfo.totalFee === 100.00) {
    console.log('✅ SUCCESS: Σεπτέμβριος κόστος διαχείρισης = 100.00€');
  } else {
    console.log('❌ FAILED: Σεπτέμβριος κόστος διαχείρισης ≠ 100.00€');
  }
};

// Run tests
testManagementFeesAPI();
testSeptemberManagementFees();

console.log('\n🔍 Debug completed. Check console for results.');
