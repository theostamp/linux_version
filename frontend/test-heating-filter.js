// Quick test για το τρέχον μήνας filter
import { getCurrentMonthRange } from './lib/dateUtils.js';

console.log('🧪 Test: getCurrentMonthRange()');

try {
  const result = getCurrentMonthRange();
  console.log('✅ Result:', result);
  
  // Έλεγχος αν οι ημερομηνίες είναι σωστές
  const now = new Date();
  const expectedFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const expectedTo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  
  console.log('📅 Expected from:', expectedFrom);
  console.log('📅 Expected to:', expectedTo);
  console.log('📅 Actual from:', result.from);
  console.log('📅 Actual to:', result.to);
  console.log('📅 Month name:', result.monthName);
  
  if (result.from === expectedFrom && result.to === expectedTo) {
    console.log('✅ Test PASSED: Dates are correct');
  } else {
    console.log('❌ Test FAILED: Dates mismatch');
  }
  
} catch (error) {
  console.log('❌ Error:', error.message);
}