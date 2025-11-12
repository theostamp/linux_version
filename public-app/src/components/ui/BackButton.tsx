'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './button';
import { ArrowLeft } from 'lucide-react';

type BackButtonProps = {
  label?: string;
  href?: string;
  variant?: React.ComponentProps<typeof Button>['variant'];
  size?: React.ComponentProps<typeof Button>['size'];
  className?: string;
};

export function BackButton({ label = 'Πίσω', href, variant = 'outline', size = 'default', className }: BackButtonProps) {
  const router = useRouter();
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={() => {
        if (href) {
          router.push(href);
        } else {
          router.back();
        }
      }}
    >
      <ArrowLeft className="w-4 h-4 mr-2" /> {label}
    </Button>
  );
}

