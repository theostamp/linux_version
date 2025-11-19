'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { designSystem } from '@/lib/design-system';

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
  const scheme = designSystem.dashboard.metrics[colorScheme];
  
  const isClickable = !!onClick;
  
  if (loading) {
    return (
      <div 
        className={cn(
          "rounded-xl p-6 border",
          "animate-pulse"
        )}
        style={{
          backgroundColor: scheme.bg,
          borderColor: scheme.border,
        }}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="h-4 w-20 bg-gray-300 rounded" />
          <div className="h-10 w-10 bg-gray-300 rounded-lg" />
        </div>
        <div className="h-8 w-16 bg-gray-300 rounded mb-2" />
        <div className="h-3 w-24 bg-gray-300 rounded" />
      </div>
    );
  }
  
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-xl p-6 border transition-all duration-200",
        isClickable && "cursor-pointer hover:shadow-lg hover:scale-[1.02]",
        !isClickable && "shadow-sm"
      )}
      style={{
        backgroundColor: scheme.bg,
        borderColor: scheme.border,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <h3 
          className="text-sm font-medium"
          style={{ color: scheme.text }}
        >
          {title}
        </h3>
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            color: scheme.icon,
          }}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>
      
      {/* Value */}
      <div 
        className="text-3xl font-bold mb-2"
        style={{ color: scheme.text }}
      >
        {value}
      </div>
      
      {/* Subtitle & Trend */}
      <div className="flex items-center justify-between">
        {subtitle && (
          <p 
            className="text-xs opacity-75"
            style={{ color: scheme.text }}
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


