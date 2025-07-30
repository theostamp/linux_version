// frontend/lib/apiPublic.ts
import axios from 'axios';

// Helper function to get the correct API base URL based on hostname
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    console.log(`[API PUBLIC] Current hostname: ${hostname}`);
    
    // Αν είναι tenant subdomain (π.χ. demo.localhost), χρησιμοποιούμε το ίδιο subdomain για το API
    if (hostname.includes('.localhost') && !hostname.startsWith('localhost')) {
      const apiUrl = `http://${hostname}:8000/api`;
      console.log(`[API PUBLIC] Using tenant-specific API URL: ${apiUrl}`);
      return apiUrl;
    }
  }
  const defaultUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'http://localhost:8000/api';
  console.log(`[API PUBLIC] Using default API URL: ${defaultUrl}`);
  return defaultUrl;
};

export const apiPublic = axios.create({
  baseURL: getApiBaseUrl(),
});

export const fetchPublicInfo = async (buildingId: number) => {
  try {
    const response = await apiPublic.get(`/public-info/${buildingId}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch public info:', error);
    throw error;
  }
};