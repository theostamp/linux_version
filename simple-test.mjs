import fetch from 'node-fetch';

try {
  console.log('Testing internal API...');
  const response = await fetch('http://localhost:8080/api/internal/tenants/create/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-API-Key': 'Pf2irUXpdvZcAZ//DD8noS76BnSCLtwtINL8yqJM62Y='
    },
    body: JSON.stringify({test: 'data'})
  });
  
  console.log('Status:', response.status);
  const text = await response.text();
  console.log('Response:', text);
} catch (error) {
  console.error('Error:', error.message);
  console.error('Code:', error.code);
}
