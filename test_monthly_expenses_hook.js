// Test script for monthly expenses hook logic
console.log('🧪 Testing monthly expenses hook logic...');

// Mock API response structure
const mockMonthlyExpenses = {
  total_expenses_month: 200.00,  // Λειτουργικές Δαπάνες
  management_fees: 80.00,        // Κόστος διαχείρισης
  reserve_fund_contribution: 1083.33, // Αποθεματικό Ταμείο
  previous_month_expenses: 0,
  previous_month_name: 'Ιούλιος 2025',
  current_month_name: 'Αύγουστος 2025',
  invoice_total: 1363.33,
  current_invoice: 1363.33,
  previous_balances: 6000.00,
  grand_total: 7363.33,
  current_invoice_paid: 0,
  current_invoice_total: 1363.33,
  current_invoice_coverage_percentage: 0,
  total_paid: 0,
  total_obligations: 7363.33,
  total_coverage_percentage: 0,
  current_reserve: -4255.66,
  reserve_target: 6500.00,
  reserve_monthly_contribution: 1083.33,
  reserve_progress_percentage: 0,
  apartment_count: 10,
  has_monthly_activity: true
};

// Test expense breakdown calculation
const calculateExpenseBreakdown = (monthlyExpenses) => {
  const breakdown = { common: 0, elevator: 0, heating: 0, other: 0, coownership: 0 };
  
  if (monthlyExpenses) {
    console.log('🔍 Using API data for month:', monthlyExpenses.current_month_name);
    
    // Map API data to breakdown structure
    breakdown.common = monthlyExpenses.total_expenses_month || 0;
    breakdown.elevator = 0; // Not available in API yet
    breakdown.heating = 0; // Not available in API yet
    breakdown.other = 0; // Not available in API yet
    breakdown.coownership = 0; // Not available in API yet
    
    console.log('✅ Mapped API data to breakdown:', breakdown);
  } else {
    console.log('⚠️ Using fallback state data');
    breakdown.common = 280.00; // Static fallback
    breakdown.elevator = 0;
    breakdown.heating = 0;
    breakdown.other = 0;
    breakdown.coownership = 0;
  }
  
  return breakdown;
};

// Test management fee calculation
const calculateManagementFees = (monthlyExpenses, apartmentsCount = 10) => {
  let finalFee = 0;
  
  if (monthlyExpenses && monthlyExpenses.management_fees > 0) {
    finalFee = monthlyExpenses.management_fees / apartmentsCount;
    console.log('🔍 Using API data for management fees:', {
      totalManagementFees: monthlyExpenses.management_fees,
      apartmentsCount,
      finalFee,
      source: 'API'
    });
  } else {
    finalFee = 8.00; // Fallback
    console.log('🔍 Using fallback state data for management fees:', {
      finalFee,
      source: 'State fallback'
    });
  }
  
  return {
    feePerApartment: finalFee,
    totalFee: finalFee * apartmentsCount,
    apartmentsCount,
    hasFee: finalFee > 0,
  };
};

// Test the logic
console.log('\n📊 Test 1: With API data (August 2025)');
const breakdown1 = calculateExpenseBreakdown(mockMonthlyExpenses);
const management1 = calculateManagementFees(mockMonthlyExpenses);

console.log('\n📊 Test 2: Without API data (fallback)');
const breakdown2 = calculateExpenseBreakdown(null);
const management2 = calculateManagementFees(null);

console.log('\n🎯 Expected Results for August 2025:');
console.log('  - Λειτουργικές Δαπάνες: 200.00€ (from API)');
console.log('  - Κόστος διαχείρισης: 80.00€ (from API)');
console.log('  - Αποθεματικό Ταμείο: 1,083.33€ (from API)');

console.log('\n✅ Monthly expenses hook logic test completed!');
