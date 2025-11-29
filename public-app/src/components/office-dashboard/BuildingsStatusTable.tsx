'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { 
  Building2, 
  AlertTriangle, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  TrendingDown,
  TrendingUp
} from 'lucide-react';
import type { BuildingStatus } from '@/hooks/useOfficeDashboard';

interface BuildingsStatusTableProps {
  data?: BuildingStatus[];
  loading?: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('el-GR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'critical':
      return {
        label: 'Κρίσιμο',
        icon: AlertTriangle,
        className: 'bg-red-100 text-red-700 border-red-200',
        iconClass: 'text-red-600',
      };
    case 'warning':
      return {
        label: 'Προσοχή',
        icon: AlertCircle,
        className: 'bg-amber-100 text-amber-700 border-amber-200',
        iconClass: 'text-amber-600',
      };
    default:
      return {
        label: 'Υγιές',
        icon: CheckCircle2,
        className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        iconClass: 'text-emerald-600',
      };
  }
};

export function BuildingsStatusTable({ data, loading = false }: BuildingsStatusTableProps) {
  const router = useRouter();

  if (loading) {
    return (
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Κατάσταση Κτιρίων
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
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
            <Building2 className="w-5 h-5" />
            Κατάσταση Κτιρίων
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Δεν υπάρχουν κτίρια
          </div>
        </CardContent>
      </Card>
    );
  }

  // Count by status
  const criticalCount = data.filter(b => b.status === 'critical').length;
  const warningCount = data.filter(b => b.status === 'warning').length;
  const healthyCount = data.filter(b => b.status === 'healthy').length;

  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Κατάσταση Κτιρίων
          </CardTitle>
          <div className="flex gap-2">
            {criticalCount > 0 && (
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                {criticalCount} κρίσιμα
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                {warningCount} προσοχή
              </Badge>
            )}
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
              {healthyCount} υγιή
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Κτίριο</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Διαμ.</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Υπόλοιπο</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Αποθεματικό</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Είσπραξη</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Κατάσταση</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {data.map((building) => {
                const statusConfig = getStatusConfig(building.status);
                const StatusIcon = statusConfig.icon;
                
                return (
                  <tr 
                    key={building.id} 
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-foreground">{building.name}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {building.address}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-sm text-foreground">{building.apartments_count}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {building.total_balance >= 0 ? (
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-600" />
                        )}
                        <span className={`font-medium ${building.total_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(Math.abs(building.total_balance))}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-sm text-foreground">
                        {formatCurrency(building.reserve_fund)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center">
                        <div className="w-16 bg-slate-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              building.collection_rate >= 70 ? 'bg-green-500' : 
                              building.collection_rate >= 40 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(building.collection_rate, 100)}%` }}
                          />
                        </div>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {building.collection_rate}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant="outline" className={statusConfig.className}>
                        <StatusIcon className={`w-3 h-3 mr-1 ${statusConfig.iconClass}`} />
                        {statusConfig.label}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/buildings/${building.id}`)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export default BuildingsStatusTable;

