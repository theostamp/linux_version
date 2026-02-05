'use client';

/**
 * Simple hook to get authentication token (in-memory with localStorage fallback)
 * For full authentication context, use useAuth from @/components/contexts/AuthContext
 */
import { getAccessToken } from '@/lib/authTokens';

export function useAuthToken() {
    const getToken = (): string | null => {
        return getAccessToken();
    };

    return {
        getToken,
    };
}

// Keep useAuth for backward compatibility (but prefer useAuthToken)
export const useAuth = useAuthToken;
