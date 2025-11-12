'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchAllBuildings } from '@/lib/api';
import { useAuth } from '@/components/contexts/AuthContext';

export const useBuildings = () => {
    const { user } = useAuth();
    
    return useQuery({
        queryKey: ['buildings'],
        queryFn: fetchAllBuildings,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
        enabled: !!user, // Only fetch if user is authenticated
    });
};

