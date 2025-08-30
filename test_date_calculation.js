// Test the date calculation logic to see what's wrong

function testDateCalculation() {
    console.log('🔍 Testing Date Calculation Logic');
    console.log('=' .repeat(50));
    
    const testCases = [
        '2025-07', // July
        '2025-06', // June  
        '2025-05', // May
        '2025-08'  // August
    ];
    
    testCases.forEach(selectedMonth => {
        console.log(`\n📅 Testing selectedMonth: "${selectedMonth}"`);
        
        if (selectedMonth) {
            const [year, month] = selectedMonth.split('-');
            console.log(`   Split result: year="${year}", month="${month}"`);
            
            const yearInt = parseInt(year);
            const monthInt = parseInt(month);
            console.log(`   Parsed: yearInt=${yearInt}, monthInt=${monthInt}`);
            
            const dateConstructorMonth = monthInt - 1;
            console.log(`   Date constructor month: ${dateConstructorMonth} (monthInt - 1)`);
            
            const date = new Date(yearInt, dateConstructorMonth, 1);
            console.log(`   Created date: ${date}`);
            
            const formatted = date.toLocaleDateString('el-GR', { month: 'long', year: 'numeric' });
            console.log(`   Formatted (el-GR): "${formatted}"`);
            
            // Also test with en-US to see the difference
            const formattedEN = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            console.log(`   Formatted (en-US): "${formattedEN}"`);
        }
    });
    
    console.log('\n🎯 Expected Results:');
    console.log('   2025-07 should show: Ιούλιος 2025 (July)');
    console.log('   2025-06 should show: Ιούνιος 2025 (June)');
    console.log('   2025-05 should show: Μάιος 2025 (May)');
    console.log('   2025-08 should show: Αύγουστος 2025 (August)');
}

testDateCalculation();
