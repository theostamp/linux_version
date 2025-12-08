'use client';

import React from 'react';
import { Building, Users, DollarSign, AlertCircle } from 'lucide-react';
import { MetricsCard } from './MetricsCard';
import { useAuth } from '@/components/contexts/AuthContext';
import { formatCurrency } from '@/lib/design-system';
import type { DashboardOverview } from '@/hooks/useDashboardData';

interface HeroSectionProps {
  data?: DashboardOverview;
  loading?: boolean;
  showWelcome?: boolean;
}

export function HeroSection({ data, loading = false, showWelcome = true }: HeroSectionProps) {
  const { user } = useAuth();
  
  // Determine if balances are positive or negative for display
  const balanceValue = data?.total_balance || 0;
  const obligationsValue = data?.pending_obligations || 0;
  
  return (
    <div className="mb-8">
      {/* Welcome Text */}
      {showWelcome && (
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Καλώς ήρθατε{user?.first_name ? `, ${user.first_name}` : ''}!
          </h1>
          <p className="text-muted-foreground">
            Επισκόπηση όλων των κτιρίων και δραστηριοτήτων σας
          </p>
        </div>
      )}
      
      {/* Key Metrics Grid */}
      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[radial-gradient(circle_at_20%_20%,rgba(0,188,125,0.08),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(29,41,61,0.18),transparent_40%),linear-gradient(135deg,rgba(255,255,255,0.02),rgba(0,0,0,0.2))] p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricsCard
            title="Κτίρια"
            value={data?.buildings_count || 0}
            subtitle="Σύνολο κτιρίων"
            icon={Building}
            colorScheme="buildings"
            loading={loading}
          />
          
          <MetricsCard
            title="Διαμερίσματα"
            value={data?.apartments_count || 0}
            subtitle="Συνολικά διαμερίσματα"
            icon={Users}
            colorScheme="apartments"
            loading={loading}
          />
          
          <MetricsCard
            title="Αποθεματικό"
            value={formatCurrency(balanceValue)}
            subtitle="Διαθέσιμο υπόλοιπο"
            icon={DollarSign}
            colorScheme="financial"
            loading={loading}
            trend={undefined}
          />
          
          <MetricsCard
            title="Οφειλές"
            value={formatCurrency(Math.abs(obligationsValue))}
            subtitle={`${data?.urgent_items || 0} επείγοντα`}
            icon={AlertCircle}
            colorScheme="alerts"
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}

export default HeroSection;


