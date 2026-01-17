'use client';

import React from 'react';
import { Building2, Home, Users, Gauge, Sparkles, Timer } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import type { PortfolioInsights } from '@/hooks/useOfficeDashboard';

interface PortfolioSnapshotProps {
  data?: PortfolioInsights;
  loading?: boolean;
}

const formatNumber = (value: number) =>
  new Intl.NumberFormat('el-GR').format(value);

export function PortfolioSnapshot({ data, loading = false }: PortfolioSnapshotProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="rounded-3xl bg-card shadow-card-soft p-4">
            <Skeleton className="h-6 w-20 mb-3" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (!data?.totals) {
    return null;
  }

  const { totals } = data;

  const metrics = [
    {
      title: 'Κτίρια',
      value: formatNumber(totals.buildings),
      subtitle: 'Χαρτοφυλάκιο',
      icon: <Building2 className="h-5 w-5" />,
      color: 'primary' as const,
    },
    {
      title: 'Διαμερίσματα',
      value: formatNumber(totals.apartments),
      subtitle: `${formatNumber(totals.occupied_apartments)} κατοικημένα`,
      icon: <Home className="h-5 w-5" />,
      color: 'info' as const,
    },
    {
      title: 'Κάτοικοι',
      value: formatNumber(totals.residents),
      subtitle: `${formatNumber(totals.owners)} ιδιοκτ. / ${formatNumber(totals.tenants)} ενοικ.`,
      icon: <Users className="h-5 w-5" />,
      color: 'success' as const,
    },
    {
      title: 'Πληρότητα',
      value: `${totals.occupancy_rate}%`,
      subtitle: `${formatNumber(totals.empty_apartments)} κενά`,
      icon: <Gauge className="h-5 w-5" />,
      color: 'warning' as const,
    },
    {
      title: 'Premium',
      value: formatNumber(totals.premium_buildings + totals.premium_iot_buildings),
      subtitle: `${formatNumber(totals.premium_iot_buildings)} με IoT`,
      icon: <Sparkles className="h-5 w-5" />,
      color: 'danger' as const,
    },
    {
      title: 'Trial',
      value: formatNumber(totals.trial_buildings),
      subtitle: 'σε δοκιμή',
      icon: <Timer className="h-5 w-5" />,
      color: 'default' as const,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      {metrics.map((metric) => (
        <StatCard
          key={metric.title}
          title={metric.title}
          value={metric.value}
          description={metric.subtitle}
          icon={metric.icon}
          color={metric.color}
        />
      ))}
    </div>
  );
}

export default PortfolioSnapshot;
