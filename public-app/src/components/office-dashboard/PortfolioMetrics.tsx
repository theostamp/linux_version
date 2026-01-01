'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Building2,
  Home,
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
  Percent
} from 'lucide-react';
import type { PortfolioOverview } from '@/hooks/useOfficeDashboard';

interface PortfolioMetricsProps {
  data?: PortfolioOverview;
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

export function PortfolioMetrics({ data, loading = false }: PortfolioMetricsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const metrics = [
    {
      title: 'Κτίρια',
      value: data.total_buildings.toString(),
      icon: Building2,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-500/10',
    },
    {
      title: 'Διαμερίσματα',
      value: data.total_apartments.toString(),
      icon: Home,
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-50 dark:bg-indigo-500/10',
    },
    {
      title: 'Αποθεματικό',
      value: formatCurrency(data.total_reserve),
      icon: PiggyBank,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-500/10',
    },
    {
      title: 'Ποσοστό Είσπραξης',
      value: `${data.collection_rate}%`,
      icon: Percent,
      color: data.collection_rate >= 70 ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400',
      bgColor: data.collection_rate >= 70 ? 'bg-green-50 dark:bg-green-500/10' : 'bg-orange-50 dark:bg-orange-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Main Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map((metric, index) => (
          <Card key={index} className="border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{metric.title}</p>
                  <p className="text-2xl font-bold text-foreground">{metric.value}</p>
                </div>
                <div className={`p-3 rounded-xl ${metric.bgColor}`}>
                  <metric.icon className={`w-6 h-6 ${metric.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cash Flow Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-sm border border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-500/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-500/20">
                <ArrowUpRight className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Εισπράξεις Μήνα</p>
                <p className="text-xl font-bold text-green-700 dark:text-green-300">
                  {formatCurrency(data.payments_this_month)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-500/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-500/20">
                <ArrowDownRight className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Δαπάνες Μήνα</p>
                <p className="text-xl font-bold text-red-700 dark:text-red-300">
                  {formatCurrency(data.expenses_this_month)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-500/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-500/20">
                <Wallet className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Συνολικές Οφειλές</p>
                <p className="text-xl font-bold text-amber-700 dark:text-amber-300">
                  {formatCurrency(data.total_obligations)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default PortfolioMetrics;
