'use client';

import React from 'react';
// Εισάγουμε το original Button component και τα props του
import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Αυτό είναι το νέο, κεντρικό Button component μας.
// Εφαρμόζει συνεπές styling και εφέ σε όλα τα κουμπιά της εφαρμογής.
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