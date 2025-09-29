'use client';

export function useAuth() {
    const getToken = (): string | null => {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem('access') || localStorage.getItem('accessToken');
    };

    return {
        getToken,
    };
}