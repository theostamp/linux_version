// frontend/lib/apiPublic.ts
import axios from 'axios';

export const apiPublic = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')
    : '/api',
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