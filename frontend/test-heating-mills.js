// Simple test script to check API response in frontend
// Run this in browser console

async function testHeatingMillsAPI() {
  console.log('🔥 Testing Heating Mills API...');
  
  try {
    // Test the API endpoint directly
    const response = await fetch('/api/financial/building/4/apartments-summary/', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include'
    });
    
    console.log('📡 Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API Response:', data);
      
      if (Array.isArray(data) && data.length > 0) {
        const firstApartment = data[0];
        console.log('📋 First apartment data:', {
          id: firstApartment.id,
          number: firstApartment.number,
          heating_mills: firstApartment.heating_mills,
          elevator_mills: firstApartment.elevator_mills,
          participation_mills: firstApartment.participation_mills
        });
        
        // Check if heating_mills are present
        const heatingMillsPresent = data.some(apt => apt.heating_mills !== undefined && apt.heating_mills !== null);
        const elevatorMillsPresent = data.some(apt => apt.elevator_mills !== undefined && apt.elevator_mills !== null);
        
        console.log('🔍 Field check:');
        console.log('   Heating Mills:', heatingMillsPresent ? '✅' : '❌');
        console.log('   Elevator Mills:', elevatorMillsPresent ? '✅' : '❌');
        
        if (heatingMillsPresent) {
          const totalHeating = data.reduce((sum, apt) => sum + (apt.heating_mills || 0), 0);
          console.log('   Total Heating Mills:', totalHeating);
        }
      } else {
        console.log('⚠️ No apartments found in response');
      }
    } else {
      console.log('❌ API Error:', response.status, response.statusText);
      const errorText = await response.text();
      console.log('   Error details:', errorText);
    }
  } catch (error) {
    console.error('❌ Network error:', error);
  }
}

// Run the test
testHeatingMillsAPI();

