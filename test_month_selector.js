// Test script for month selector logic
console.log('🧪 Testing month selector logic...');

// Test the month generation logic
const generateMonthOptions = () => {
  const options = [];
  const currentDate = new Date();
  
  for (let i = 0; i < 12; i++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const monthName = date.toLocaleDateString('el-GR', { month: 'long', year: 'numeric' });
    options.push({ value: `${year}-${month}`, label: monthName });
  }
  
  return options;
};

// Test deadline calculation
const calculateDeadline = (expenseSheetMonth) => {
  const date = new Date(expenseSheetMonth + '-01');
  const deadlineMonth = String(date.getMonth() + 2).padStart(2, '0');
  const deadlineYear = date.getFullYear();
  return `10/${deadlineMonth}/${deadlineYear}`;
};

// Test the logic
const monthOptions = generateMonthOptions();
console.log('📅 Generated month options:');
monthOptions.forEach(option => {
  const deadline = calculateDeadline(option.value);
  console.log(`  ${option.value}: ${option.label} → Πληρωτέο μέχρι ${deadline}`);
});

// Test specific examples
console.log('\n🎯 Test specific examples:');
const testMonths = ['2025-08', '2025-07', '2025-06'];
testMonths.forEach(month => {
  const deadline = calculateDeadline(month);
  console.log(`  ${month} (${new Date(month + '-01').toLocaleDateString('el-GR', { month: 'long', year: 'numeric' })}) → Πληρωτέο μέχρι ${deadline}`);
});

console.log('\n✅ Month selector logic test completed!');
