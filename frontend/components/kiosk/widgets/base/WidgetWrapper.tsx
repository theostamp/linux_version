// frontend/components/kiosk/widgets/base/WidgetWrapper.tsx

'use client';

import React, { Suspense } from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';
import { KioskWidget } from '@/types/kiosk';
import { getWidgetComponent } from '@/lib/kiosk/widgets/registry';
import BaseWidget from './BaseWidget';

interface WidgetWrapperProps {
  widget: KioskWidget;
  data?: any;
  isLoading?: boolean;
  error?: string;
  className?: string;
  onError?: (error: Error) => void;
}

export function WidgetWrapper({
  widget,
  data,
  isLoading = false,
  error,
  className,
  onError,
}: WidgetWrapperProps) {
  const WidgetComponent = getWidgetComponent(widget.component);

  if (!WidgetComponent) {
    return (
      <BaseWidget
        widget={widget}
        error={`Widget component "${widget.component}" not found`}
        className={className}
      >
        <div />
      </BaseWidget>
    );
  }

  return (
    <ErrorBoundary
      fallback={
        <BaseWidget
          widget={widget}
          error="Widget failed to render"
          className={className}
        >
          <div />
        </BaseWidget>
      }
      onError={onError}
    >
      <Suspense
        fallback={
          <BaseWidget
            widget={widget}
            isLoading={true}
            className={className}
          >
            <div />
          </BaseWidget>
        }
      >
        <BaseWidget
          widget={widget}
          data={data}
          isLoading={isLoading}
          error={error}
          className={className}
        >
          <WidgetComponent
            widget={widget}
            data={data}
            isLoading={isLoading}
            error={error}
          />
        </BaseWidget>
      </Suspense>
    </ErrorBoundary>
  );
}

export default WidgetWrapper;