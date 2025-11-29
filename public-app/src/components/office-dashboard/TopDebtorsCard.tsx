'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { 
  AlertTriangle, 
  User, 
  Building2,
  Clock,
  ExternalLink
} from 'lucide-react';
import type { Debtor } from '@/hooks/useOfficeDashboard';

interface TopDebtorsCardProps {
  data?: Debtor[];
  loading?: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('el-GR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(value));
};

const getDaysOverdueLabel = (days: number) => {
  if (days <= 0) return null;
  if (days <= 30) return { label: `${days} ημέρες`, className: 'bg-amber-50 text-amber-700' };
  if (days <= 60) return { label: `${days} ημέρες`, className: 'bg-orange-50 text-orange-700' };
  return { label: `${days} ημέρες`, className: 'bg-red-50 text-red-700' };
};

export function TopDebtorsCard({ data, loading = false }: TopDebtorsCardProps) {
  const router = useRouter();

  if (loading) {
    return (
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Μεγαλύτεροι Οφειλέτες
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
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Μεγαλύτεροι Οφειλέτες
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-50 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-emerald-600" />
            </div>
            <p className="text-muted-foreground">Δεν υπάρχουν οφειλέτες!</p>
            <p className="text-sm text-muted-foreground">Όλα τα διαμερίσματα είναι ενήμερα.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Total debt
  const totalDebt = data.reduce((sum, d) => sum + Math.abs(d.balance), 0);

  return (
    <Card className="border-0 shadow-md" id="debtors">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Μεγαλύτεροι Οφειλέτες
          </CardTitle>
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Σύνολο: {formatCurrency(totalDebt)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.map((debtor, index) => {
            const overdueInfo = getDaysOverdueLabel(debtor.days_overdue);
            
            return (
              <div 
                key={debtor.apartment_id}
                className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all"
              >
                <div className="flex items-center gap-4">
                  {/* Ranking */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    index === 0 ? 'bg-red-100 text-red-700' :
                    index === 1 ? 'bg-orange-100 text-orange-700' :
                    index === 2 ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {index + 1}
                  </div>
                  
                  {/* Info */}
                  <div>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-foreground">{debtor.owner_name}</span>
                      <span className="text-sm text-muted-foreground">
                        (Διαμ. {debtor.apartment_number})
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Building2 className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{debtor.building_name}</span>
                      {overdueInfo && (
                        <>
                          <Clock className="w-3 h-3 text-muted-foreground ml-2" />
                          <Badge variant="outline" className={`text-xs ${overdueInfo.className}`}>
                            {overdueInfo.label}
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Amount and Action */}
                <div className="flex items-center gap-4">
                  <span className="text-lg font-bold text-red-600">
                    {formatCurrency(debtor.balance)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/apartments/${debtor.apartment_id}`)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default TopDebtorsCard;

