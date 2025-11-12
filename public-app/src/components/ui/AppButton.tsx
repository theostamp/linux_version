'use client';

import React from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const AppButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, ...props }, ref) => (
    <Button
      ref={ref}
      className={cn(
        'transition-transform duration-150 ease-in-out hover:-translate-y-0.5 active:translate-y-0 disabled:transform-none',
        className,
      )}
      {...props}
    />
  ),
);
AppButton.displayName = 'AppButton';

export { AppButton };

