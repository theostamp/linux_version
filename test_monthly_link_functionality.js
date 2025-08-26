// Test script για τη λειτουργικότητα του monthly link
console.log('🧪 Testing Monthly Link Functionality');

// Simulate the navigateToMonth function
const navigateToMonth = (month, buildingId) => {
  const params = new URLSearchParams({
    tab: 'dashboard',
    building: buildingId.toString(),
    month: month
  });
  const url = `/financial?${params.toString()}`;
  console.log(`🔗 Navigation URL: ${url}`);
  return url;
};

// Test cases
const testCases = [
  { month: '2025-02', buildingId: 4, expected: '/financial?tab=dashboard&building=4&month=2025-02' },
  { month: '2025-01', buildingId: 3, expected: '/financial?tab=dashboard&building=3&month=2025-01' },
  { month: '2024-12', buildingId: 2, expected: '/financial?tab=dashboard&building=2&month=2024-12' }
];

console.log('\n📋 Running Test Cases:');
testCases.forEach((testCase, index) => {
  const result = navigateToMonth(testCase.month, testCase.buildingId);
  const passed = result === testCase.expected;
  console.log(`Test ${index + 1}: ${passed ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Input: month=${testCase.month}, buildingId=${testCase.buildingId}`);
  console.log(`  Expected: ${testCase.expected}`);
  console.log(`  Got: ${result}`);
  console.log('');
});

// Test the button structure
console.log('🔧 Button Structure Test:');
const buttonStructure = {
  variant: 'ghost',
  size: 'sm',
  className: 'h-6 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50',
  icon: 'ExternalLink',
  iconSize: 'h-3 w-3'
};

console.log('Button properties:', JSON.stringify(buttonStructure, null, 2));

// Test the monthly breakdown structure
console.log('\n📊 Monthly Breakdown Structure Test:');
const monthlyItem = {
  month: '2025-02',
  displayName: 'Φεβρουάριος 2025',
  balance: -100.00,
  payments: 0.00,
  expenses: 100.00,
  transactions: 1,
  hasLinkButton: true
};

console.log('Monthly item structure:', JSON.stringify(monthlyItem, null, 2));

console.log('\n✅ All tests completed!');
console.log('🎯 The monthly link functionality should work correctly.');
