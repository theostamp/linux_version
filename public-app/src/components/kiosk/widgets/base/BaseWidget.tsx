// frontend/components/kiosk/widgets/base/BaseWidget.tsx

'use client';

import React, { ReactNode } from 'react';
import { KioskWidget } from '@/types/kiosk';
import { cn } from '@/lib/utils';

export interface BaseWidgetProps {
  widget: KioskWidget;
  data?: any;
  isLoading?: boolean;
  error?: string;
  className?: string;
  children: ReactNode;
}

export function BaseWidget({
  widget,
  data,
  isLoading = false,
  error,
  className,
  children,
}: BaseWidgetProps) {
  const {
    title,
    showTitle = true,
    backgroundColor = '#ffffff',
    textColor = '#1e293b',
    borderRadius = 8,
    gridSize = 'medium',
  } = widget.settings || {};

  const sizeClasses = {
    small: 'min-h-[200px]',
    medium: 'min-h-[300px]',
    large: 'min-h-[400px]',
    full: 'min-h-[500px]',
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden transition-all duration-200 shadow-sm hover:shadow-lg',
        sizeClasses[gridSize as keyof typeof sizeClasses],
        className
      )}
      style={{
        backgroundColor,
        color: textColor,
        borderRadius: `${borderRadius}px`,
      }}
    >
      {/* Title */}
      {showTitle && title && (
        <div className="px-4 py-3 border-b border-gray-300">
          <h3 className="font-semibold text-lg leading-tight">
            {title}
          </h3>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 p-4">
        {error ? (
          <ErrorState error={error} />
        ) : isLoading ? (
          <LoadingState />
        ) : (
          children
        )}
      </div>

      {/* Widget info overlay (for management mode) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-2 right-2 opacity-0 hover:opacity-100 transition-opacity">
          <div className="bg-black/80 text-white text-xs px-2 py-1 rounded">
            {widget.component}
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current opacity-50"></div>
      <span className="ml-3 text-sm opacity-70">Φόρτωση...</span>
    </div>
  );
}

function ErrorState({ error }: { error: string }) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="text-red-500 text-xl mb-2">⚠️</div>
        <p className="text-sm opacity-70">Σφάλμα φόρτωσης</p>
        <p className="text-xs opacity-50 mt-1">{error}</p>
      </div>
    </div>
  );
}

export default BaseWidget;
