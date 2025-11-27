import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 shadow-sm',
  {
    variants: {
      variant: {
        default: 'bg-gradient-to-b from-primary/90 to-primary text-primary-foreground hover:from-primary hover:to-primary/90 shadow-md border-t border-white/20 shadow-[0px_2px_0px_0px_rgba(255,255,255,0.1)_inset]',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/50',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md border-t border-white/20',
        outline: 'border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline shadow-none',
        ghost: 'hover:bg-accent hover:text-accent-foreground shadow-none',
        success: 'bg-gradient-to-b from-success/90 to-success text-success-foreground hover:from-success hover:to-success/90 shadow-md border-t border-white/20',
        warning: 'bg-gradient-to-b from-warning/90 to-warning text-warning-foreground hover:from-warning hover:to-warning/90 shadow-md border-t border-white/20',
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
      animation: {
        none: '',
        scale: 'hover:shadow-lg hover:scale-[1.01] transition-transform duration-200',
        lift: 'hover:-translate-y-0.5 hover:shadow-lg transition-transform duration-150',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      animation: 'none',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, animation, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, animation, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
