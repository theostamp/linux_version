import { useEffect } from 'react';
import { api } from '../api';

export const useEnsureCsrf = () => {
  useEffect(() => {
    const fetchToken = async () => {
      try {
        await api.get('/api/csrf/');
      } catch (error) {
        console.error('CSRF token error:', error);
      }
    };

    fetchToken();
  }, []);
};
