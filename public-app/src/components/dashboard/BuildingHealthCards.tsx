'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Building, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatCurrency, getHealthColor } from '@/lib/design-system';
import type { DashboardOverview } from '@/hooks/useDashboardData';

interface BuildingHealthCardsProps {
  data?: DashboardOverview;
  loading?: boolean;
}

export function BuildingHealthCards({ data, loading = false }: BuildingHealthCardsProps) {
  const router = useRouter();
  
  if (loading) {
    return (
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-foreground mb-4">Κατάσταση Κτιρίων</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-24 bg-muted-foreground/20 rounded-none" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }
  
  const buildings = data?.buildings || [];
  
  if (buildings.length === 0) {
    return null;
  }
  
  const getHealthText = (score: number): string => {
    if (score >= 80) return 'Άριστη';
    if (score >= 60) return 'Καλή';
    if (score >= 40) return 'Μέτρια';
    if (score >= 20) return 'Προβληματική';
    return 'Κρίσιμη';
  };
  
  const getHealthDots = (score: number) => {
    const filledDots = Math.ceil(score / 20); // 0-100 -> 0-5 dots
    return Array.from({ length: 5 }, (_, i) => (
      <div
        key={i}
        className={`w-2 h-2 rounded-full ${
          i < filledDots ? 'opacity-100' : 'opacity-20'
        }`}
        style={{
          backgroundColor: getHealthColor(score),
        }}
      />
    ));
  };
  
  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-foreground mb-4">
        🏢 Κατάσταση Κτιρίων
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {buildings.map((building) => (
          <Card
            key={building.id}
            onClick={() => router.push(`/buildings/${building.id}`)}
            className="cursor-pointer hover:shadow-lg transition-all duration-200 group border-0 shadow-md"
            style={{
              borderColor: `${getHealthColor(building.health_score)}40`,
            }}
          >
            <CardContent className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                    {building.name}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {building.address}
                  </p>
                </div>
                <div
                  className="w-10 h-10 rounded-none flex items-center justify-center flex-shrink-0 ml-3 shadow-sm"
                  style={{
                    backgroundColor: `${getHealthColor(building.health_score)}20`,
                    color: getHealthColor(building.health_score),
                  }}
                >
                  <Building className="w-5 h-5" />
                </div>
              </div>
              
              {/* Health Score */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Κατάσταση</span>
                  <span
                    className="text-sm font-semibold"
                    style={{ color: getHealthColor(building.health_score) }}
                  >
                    {getHealthText(building.health_score)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {getHealthDots(building.health_score)}
                </div>
              </div>
              
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Διαμερίσματα</p>
                  <p className="font-semibold text-foreground">{building.apartments_count}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Υπόλοιπο</p>
                  <div className="flex items-center gap-1">
                    {building.balance >= 0 ? (
                      <TrendingUp className="w-3 h-3 text-green-600" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-red-600" />
                    )}
                    <p className={`font-semibold ${building.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(Math.abs(building.balance))}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Pending Obligations Warning */}
              {building.pending_obligations > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-300">
                  <div className="flex items-center gap-2 text-orange-600">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <p className="text-xs">
                      <span className="font-semibold">{formatCurrency(building.pending_obligations)}</span>
                      {' '}σε οφειλές
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default BuildingHealthCards;


