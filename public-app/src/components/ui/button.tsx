import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-none text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 shadow-sm',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-[#005866] hover:text-white hover:shadow-md hover:scale-[1.01]',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:shadow-md hover:scale-[1.01]',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:shadow-md hover:scale-[1.01]',
        outline: 'border-2 border-primary text-[#005866] dark:text-primary bg-background hover:bg-primary hover:text-primary-foreground hover:shadow-md',
        link: 'text-[#005866] dark:text-primary underline-offset-4 hover:underline hover:text-[#005866] dark:hover:text-primary shadow-none',
        ghost: 'text-[#005866] dark:text-primary hover:bg-accent hover:text-accent-foreground',
        success: 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-md hover:scale-[1.01]',
        warning: 'bg-amber-500 text-white hover:bg-amber-600 hover:shadow-md hover:scale-[1.01]',
      },
      size: {
        xs: 'h-8 px-3 text-xs',
        sm: 'h-9 px-3 text-sm',
        default: 'h-10 px-4 py-2 text-sm',
        lg: 'h-11 px-8 text-base',
        xl: 'h-12 px-10 text-lg',
        icon: 'h-10 w-10 p-0',
        'icon-sm': 'h-8 w-8 p-0',
        'icon-lg': 'h-12 w-12 p-0',
        full: 'w-full h-10 px-4 py-2 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };

