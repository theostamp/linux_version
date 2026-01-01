'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  colorScheme?: 'buildings' | 'apartments' | 'financial' | 'alerts' | 'pending';
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
  onClick?: () => void;
  loading?: boolean;
}

export function MetricsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  colorScheme = 'buildings',
  trend,
  onClick,
  loading = false,
}: MetricsCardProps) {
  const schemes: Record<NonNullable<MetricsCardProps['colorScheme']>, { accent: string }> = {
    buildings: { accent: '#00BC7D' },
    apartments: { accent: '#00BC7D' },
    financial: { accent: '#8b5cf6' },
    alerts: { accent: '#e11d48' },
    pending: { accent: '#f59e0b' },
  };
  const scheme = schemes[colorScheme] || schemes.buildings;

  const isClickable = !!onClick;

  if (loading) {
    return (
      <div
        className={cn(
          "rounded-3xl p-6",
          "animate-pulse shadow-card-soft"
        )}
        style={{
          backgroundColor: 'var(--bg-card)',
        }}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="h-4 w-20 rounded" style={{ backgroundColor: 'hsl(var(--muted))' }} />
          <div className="h-10 w-10 rounded-lg" style={{ backgroundColor: 'hsl(var(--muted))' }} />
        </div>
        <div className="h-8 w-16 rounded mb-2" style={{ backgroundColor: 'hsl(var(--muted))' }} />
        <div className="h-3 w-24 rounded" style={{ backgroundColor: 'hsl(var(--muted))' }} />
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-3xl p-6 transition-all duration-200 shadow-card-soft",
        isClickable && "cursor-pointer hover:shadow-card-soft hover:scale-[1.02]",
        !isClickable && ""
      )}
      style={{
        backgroundColor: 'var(--bg-card)',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <h3
          className="text-sm font-medium text-accent-primary"
        >
          {title}
        </h3>
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{
            backgroundColor: `${scheme.accent}26`,
            color: scheme.accent,
          }}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {/* Value */}
      <div
        className="text-3xl font-bold mb-2"
        style={{ color: 'hsl(var(--foreground))' }}
      >
        {value}
      </div>

      {/* Subtitle & Trend */}
      <div className="flex items-center justify-between">
        {subtitle && (
          <p
            className="text-xs opacity-75"
            style={{ color: 'hsl(var(--muted-foreground))' }}
          >
            {subtitle}
          </p>
        )}

        {trend && (
          <div
            className={cn(
              "text-xs font-medium flex items-center gap-1",
              trend.direction === 'up' && "text-green-600",
              trend.direction === 'down' && "text-red-600",
              trend.direction === 'neutral' && "text-gray-500"
            )}
          >
            {trend.direction === 'up' && '↑'}
            {trend.direction === 'down' && '↓'}
            {trend.direction === 'neutral' && '→'}
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>
    </div>
  );
}

export default MetricsCard;
