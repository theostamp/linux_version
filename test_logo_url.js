// Test script to check logo URL construction
const API_BASE_URL = 'http://localhost:8000';
const office_logo = '/media/office_logos/logo.jpg';

const fullUrl = office_logo.startsWith('http') ? office_logo : `${API_BASE_URL}${office_logo.startsWith('/') ? office_logo : `/${office_logo}`}`;

console.log('🔍 Logo URL Test:');
console.log('  API_BASE_URL:', API_BASE_URL);
console.log('  office_logo:', office_logo);
console.log('  Full URL:', fullUrl);
console.log('  Expected: http://localhost:8000/media/office_logos/logo.jpg');

