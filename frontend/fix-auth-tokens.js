// Script to fix authentication tokens in localStorage
// Run this in the browser console to update tokens

console.log('🔧 Fixing authentication tokens...');

// New tokens from backend (generated at 2025-01-05)
const newAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzU5NjkyMjIzLCJpYXQiOjE3NTk2OTA0MjMsImp0aSI6ImZiODgxOTA2OGVkZDQwZjhiMTMwMDU0Nzk1NDgzMjA3IiwidXNlcl9pZCI6IjEifQ.Ef1P0lK6tjBXNT-FNWZ1XIDZv_OvX_p_rkUGsr8YsQE';
const newRefreshToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc2MDI5NTIyMywiaWF0IjoxNzU5NjkwNDIzLCJqdGkiOiI1MDdmNWZjYzIyYTk0Y2FlOGFmMDI5NmVkNmIwNWU4YiIsInVzZXJfaWQiOiIxIn0.v7uicvmtqaIG6K0nphLs4YcwxhMuWzDeTEvIJeKYpTo';

// Update localStorage
localStorage.setItem('access', newAccessToken);
localStorage.setItem('refresh', newRefreshToken);

console.log('✅ Tokens updated in localStorage');
console.log('Access token (first 20 chars):', newAccessToken.substring(0, 20) + '...');
console.log('Refresh token (first 20 chars):', newRefreshToken.substring(0, 20) + '...');

// Test the API call
fetch('/api/kiosk/configs/?building_id=1', {
  headers: {
    'Authorization': `Bearer ${newAccessToken}`,
    'Content-Type': 'application/json'
  }
})
.then(response => {
  if (response.ok) {
    console.log('✅ API call successful!');
    return response.json();
  } else {
    console.error('❌ API call failed:', response.status, response.statusText);
    return response.text();
  }
})
.then(data => {
  if (data.count !== undefined) {
    console.log('✅ Kiosk widgets loaded:', data.count, 'widgets');
  } else {
    console.log('Response data:', data);
  }
})
.catch(error => {
  console.error('❌ Error:', error);
});

console.log('🔄 Refresh the page to apply changes');
