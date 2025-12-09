'use client';

import React, { useState } from 'react';
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
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import type { Debtor } from '@/hooks/useOfficeDashboard';

interface TopDebtorsCardProps {
  data?: Debtor[];
  loading?: boolean;
  initialVisibleCount?: number;
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
  if (days <= 30) return { label: `${days} ημέρες`, className: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' };
  if (days <= 60) return { label: `${days} ημέρες`, className: 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400' };
  return { label: `${days} ημέρες`, className: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400' };
};

export function TopDebtorsCard({ 
  data, 
  loading = false,
  initialVisibleCount = 3
}: TopDebtorsCardProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);

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
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Μεγαλύτεροι Οφειλέτες
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
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

  // Determine visible debtors
  const hasMore = data.length > initialVisibleCount;
  const visibleDebtors = isExpanded ? data : data.slice(0, initialVisibleCount);
  const hiddenCount = data.length - initialVisibleCount;

  return (
    <Card className="border-0 shadow-md" id="debtors">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            Μεγαλύτεροι Οφειλέτες
          </CardTitle>
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20">
            Σύνολο: {formatCurrency(totalDebt)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {visibleDebtors.map((debtor, index) => {
            const overdueInfo = getDaysOverdueLabel(debtor.days_overdue);
            
            return (
              <div 
                key={debtor.apartment_id}
                className="flex items-center justify-between p-4 rounded-xl border border-border hover:border-border/80 hover:bg-muted/50 transition-all"
              >
                <div className="flex items-center gap-4">
                  {/* Ranking */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    index === 0 ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300' :
                    index === 1 ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300' :
                    index === 2 ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' :
                    'bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300'
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
                  <span className="text-lg font-bold text-red-600 dark:text-red-400">
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

        {/* Expand/Collapse Button */}
        {hasMore && (
          <div className="mt-4 flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-primary hover:text-primary/80 hover:bg-primary/5"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-2" />
                  Λιγότερα
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-2" />
                  Περισσότερα ({hiddenCount} ακόμα)
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default TopDebtorsCard;
