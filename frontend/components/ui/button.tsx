import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        // 🎯 Primary - Main actions (Save, Submit, Create) - SOLID backgrounds
        default: 'bg-primary text-primary-foreground hover:bg-primary-hover hover:shadow-lg hover:scale-[1.01] focus:ring-primary font-medium',

        // 🎨 Secondary - Secondary actions (Cancel, Back) - SOLID backgrounds
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary-hover hover:shadow-lg hover:scale-[1.01] focus:ring-secondary font-medium',

        // ⚠️ Destructive - Delete, Remove actions - SOLID backgrounds
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive-hover hover:shadow-lg hover:scale-[1.01] focus:ring-destructive font-medium',

        // 📝 Outline - Less prominent actions
        outline: 'border-2 border-primary text-primary bg-background hover:bg-primary hover:text-primary-foreground hover:shadow-md focus:ring-primary font-medium',

        // 🔗 Link - Text-like buttons
        link: 'text-primary underline-offset-4 hover:underline hover:text-primary-hover focus:ring-primary font-medium',

        // 👻 Ghost - Subtle actions
        ghost: 'hover:bg-accent/10 hover:text-accent-foreground focus:ring-accent font-medium',

        // ✅ Success - Confirm, Approve actions - SOLID backgrounds
        success: 'bg-success text-success-foreground hover:bg-success-hover hover:shadow-lg hover:scale-[1.01] focus:ring-success font-medium',

        // ⚠️ Warning - Caution actions - SOLID backgrounds
        warning: 'bg-warning text-warning-foreground hover:bg-warning-hover hover:shadow-lg hover:scale-[1.01] focus:ring-warning font-medium',

        // 🌟 Accent - Special highlight actions - SOLID backgrounds
        accent: 'bg-accent text-accent-foreground hover:bg-accent-hover hover:shadow-lg hover:scale-[1.01] focus:ring-accent font-medium',

        // ⚫ Neutral - Neutral/muted actions - SOLID backgrounds
        neutral: 'bg-neutral-btn text-neutral-btn-foreground hover:bg-neutral-btn-hover hover:shadow-lg hover:scale-[1.01] focus:ring-neutral-btn font-medium',

        // 🎯 Primary Outline - Primary action with outline
        'outline-primary': 'border-2 border-primary text-primary bg-background hover:bg-primary hover:text-primary-foreground hover:shadow-md focus:ring-primary font-medium',

        // 🎨 Secondary Outline
        'outline-secondary': 'border-2 border-secondary text-secondary bg-background hover:bg-secondary hover:text-secondary-foreground hover:shadow-md focus:ring-secondary font-medium',

        // ✅ Success Outline
        'outline-success': 'border-2 border-success text-success bg-background hover:bg-success hover:text-success-foreground hover:shadow-md focus:ring-success font-medium',

        // 🎨 GRADIENT variants for special cases (optional use)
        'gradient-primary': 'bg-gradient-to-r from-primary to-primary-hover text-primary-foreground hover:from-primary-hover hover:to-primary shadow-lg hover:shadow-xl hover:scale-[1.01] focus:ring-primary font-medium',
        'gradient-secondary': 'bg-gradient-to-r from-secondary to-secondary-hover text-secondary-foreground hover:from-secondary-hover hover:to-secondary shadow-lg hover:shadow-xl hover:scale-[1.01] focus:ring-secondary font-medium',

        // Legacy variants (kept for backward compatibility) - Fixed to solid
        modern: 'bg-primary text-primary-foreground hover:bg-primary-hover hover:shadow-lg hover:scale-[1.01] focus:ring-primary font-medium',
        'modern-secondary': 'bg-neutral-btn text-neutral-btn-foreground hover:bg-neutral-btn-hover hover:shadow-lg hover:scale-[1.01] focus:ring-neutral-btn font-medium',
      },
      size: {
        // 📏 Size variants with consistent padding and heights
        xs: 'h-8 px-3 text-xs',
        sm: 'h-9 px-3 text-sm',
        default: 'h-10 px-4 py-2 text-sm',
        lg: 'h-11 px-8 text-base',
        xl: 'h-12 px-10 text-lg',

        // 🔘 Icon buttons
        icon: 'h-10 w-10 p-0',
        'icon-sm': 'h-8 w-8 p-0',
        'icon-lg': 'h-12 w-12 p-0',

        // 🎯 Full width button
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
