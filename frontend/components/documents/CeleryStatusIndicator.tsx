'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Activity, Zap, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';

export function CeleryStatusIndicator() {
    const [status, setStatus] = useState<'active' | 'idle' | 'error'>('idle');
    const [taskCount, setTaskCount] = useState(0);

    useEffect(() => {
        // Poll for Celery status every 5 seconds
        const checkCeleryStatus = async () => {
            try {
                // This endpoint would need to be implemented in backend
                const response = await apiClient.get('/parser/celery-status/');
                setStatus(response.data.status);
                setTaskCount(response.data.active_tasks || 0);
            } catch (error) {
                setStatus('error');
            }
        };

        checkCeleryStatus();
        const interval = setInterval(checkCeleryStatus, 5000);

        return () => clearInterval(interval);
    }, []);

    const getStatusConfig = () => {
        switch (status) {
            case 'active':
                return {
                    icon: Zap,
                    label: `${taskCount} εργασίες`,
                    variant: 'default' as const,
                    className: 'bg-green-500',
                    pulse: true
                };
            case 'idle':
                return {
                    icon: Activity,
                    label: 'Αναμονή',
                    variant: 'secondary' as const,
                    className: '',
                    pulse: false
                };
            case 'error':
                return {
                    icon: AlertCircle,
                    label: 'Σφάλμα',
                    variant: 'destructive' as const,
                    className: '',
                    pulse: false
                };
        }
    };

    const config = getStatusConfig();
    const Icon = config.icon;

    return (
        <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Celery:</span>
            <Badge variant={config.variant} className={`${config.className} ${config.pulse ? 'animate-pulse' : ''}`}>
                <Icon className="mr-1 h-3 w-3" />
                {config.label}
            </Badge>
        </div>
    );
}