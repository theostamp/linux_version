'use client';

/**
 * Simple hook to get authentication token from localStorage
 * For full authentication context, use useAuth from @/components/contexts/AuthContext
 */
export function useAuthToken() {
    const getToken = (): string | null => {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem('access_token') || localStorage.getItem('access') || localStorage.getItem('accessToken');
    };

    return {
        getToken,
    };
}

// Keep useAuth for backward compatibility (but prefer useAuthToken)
export const useAuth = useAuthToken;

