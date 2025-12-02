'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { 
  Bell, 
  AlertTriangle, 
  AlertCircle, 
  Info,
  ChevronRight
} from 'lucide-react';
import type { Alert } from '@/hooks/useOfficeDashboard';

interface AlertsPanelProps {
  data?: Alert[];
  loading?: boolean;
}

const getAlertConfig = (type: string) => {
  switch (type) {
    case 'critical':
      return {
        icon: AlertTriangle,
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        iconColor: 'text-red-600',
        textColor: 'text-red-800',
      };
    case 'warning':
      return {
        icon: AlertCircle,
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        iconColor: 'text-amber-600',
        textColor: 'text-amber-800',
      };
    default:
      return {
        icon: Info,
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        iconColor: 'text-blue-600',
        textColor: 'text-blue-800',
      };
  }
};

export function AlertsPanel({ data, loading = false }: AlertsPanelProps) {
  const router = useRouter();

  if (loading) {
    return (
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Ειδοποιήσεις
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Ειδοποιήσεις
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-50 flex items-center justify-center">
              <Bell className="w-8 h-8 text-emerald-600" />
            </div>
            <p className="text-muted-foreground">Όλα καλά!</p>
            <p className="text-sm text-muted-foreground">Δεν υπάρχουν ειδοποιήσεις.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort by severity
  const sortedAlerts = [...data].sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return (order[a.type] ?? 3) - (order[b.type] ?? 3);
  });

  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Ειδοποιήσεις
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            {data.length} {data.length === 1 ? 'ειδοποίηση' : 'ειδοποιήσεις'}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedAlerts.map((alert, index) => {
            const config = getAlertConfig(alert.type);
            const AlertIcon = config.icon;
            
            return (
              <div 
                key={index}
                className={`flex items-center justify-between p-4 rounded-xl border ${config.bgColor} ${config.borderColor}`}
              >
                <div className="flex items-center gap-3">
                  <AlertIcon className={`w-5 h-5 ${config.iconColor}`} />
                  <span className={`text-sm ${config.textColor}`}>
                    {alert.message}
                  </span>
                </div>
                {alert.action_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(alert.action_url!)}
                    className={config.textColor}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default AlertsPanel;

