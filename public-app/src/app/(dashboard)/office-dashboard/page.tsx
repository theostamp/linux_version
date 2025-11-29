'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/contexts/AuthContext';
import { StatsGrid } from '@/components/office-dashboard/StatsGrid';
import { CriticalAlerts } from '@/components/office-dashboard/CriticalAlerts';
import AuthGate from '@/components/AuthGate';

export default function OfficeDashboardPage() {
    const { token } = useAuth();
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (token) {
            fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/management-office/dashboard/`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            .then(res => res.json())
            .then(data => {
                setData(data);
                setIsLoading(false);
            })
            .catch(err => {
                console.error(err);
                setIsLoading(false);
            });
        }
    }, [token]);

    return (
        <AuthGate role="manager">
             <div className="p-8">
                <h1 className="text-2xl font-bold mb-6">Κεντρικός Έλεγχος Γραφείου</h1>
                
                <div className="mb-8">
                    <StatsGrid 
                        stats={data?.overview || {
                            total_buildings: 0,
                            total_apartments: 0,
                            total_debt: 0,
                            monthly_management_revenue: 0,
                            pending_requests: 0
                        }} 
                        financials={data?.financials}
                        isLoading={isLoading} 
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <CriticalAlerts alerts={data?.critical_alerts || []} isLoading={isLoading} />
                    
                    {/* Placeholder for future components */}
                    <div className="bg-gray-50 rounded-xl border border-dashed border-gray-300 p-8 flex items-center justify-center flex-col gap-2">
                        <p className="font-medium text-gray-900">Ερχεται Σύντομα</p>
                        <p className="text-sm text-gray-500">Global Task Manager & Bulk Operations</p>
                    </div>
                </div>
             </div>
        </AuthGate>
    );
}
