import * as React from 'react';
import Link from 'next/link';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const sidebarNavItemVariants = cva(
  'flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ease-in-out group',
  {
    variants: {
      active: {
        true: 'bg-gradient-to-r from-brand to-brand-hover text-brand-foreground shadow-lg transform -translate-y-0.5',
        false:
          'hover:bg-brand-subtle dark:hover:bg-brand-subtle/50 hover:shadow-md hover:transform hover:-translate-y-0.5',
      },
    },
    defaultVariants: {
      active: false,
    },
  },
);

export interface SidebarNavItemProps
  extends React.ComponentPropsWithoutRef<typeof Link>,
    VariantProps<typeof sidebarNavItemVariants> {
  active?: boolean;
}

const SidebarNavItem = React.forwardRef<HTMLAnchorElement, SidebarNavItemProps>(
  ({ className, active, ...props }, ref) => {
    return <Link ref={ref} className={cn(sidebarNavItemVariants({ active }), className)} {...props} />;
  },
);
SidebarNavItem.displayName = 'SidebarNavItem';

export { SidebarNavItem, sidebarNavItemVariants };