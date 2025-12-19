import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        // Primary - Teal (Kaspersky style)
        default: 'bg-teal-500 text-white hover:bg-teal-600 shadow-sm hover:shadow-md dark:bg-teal-600 dark:hover:bg-teal-500',
        // Secondary - Soft gray
        secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200 shadow-sm dark:bg-slate-800 dark:text-gray-200 dark:border-slate-700 dark:hover:bg-slate-700',
        // Destructive - Red
        destructive: 'bg-red-500 text-white hover:bg-red-600 shadow-sm hover:shadow-md dark:bg-red-600 dark:hover:bg-red-500',
        // Outline - Soft border
        outline: 'border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-300 dark:bg-transparent dark:text-gray-200 dark:border-slate-600 dark:hover:bg-slate-800',
        // Link
        link: 'text-teal-600 underline-offset-4 hover:underline shadow-none dark:text-teal-400',
        // Ghost
        ghost: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 shadow-none dark:text-gray-300 dark:hover:bg-slate-800 dark:hover:text-gray-100',
        // Success - Green
        success: 'bg-green-500 text-white hover:bg-green-600 shadow-sm hover:shadow-md dark:bg-green-600 dark:hover:bg-green-500',
        // Warning - Amber/Orange
        warning: 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm hover:shadow-md dark:bg-amber-600 dark:hover:bg-amber-500',
        // Info - Blue
        info: 'bg-blue-500 text-white hover:bg-blue-600 shadow-sm hover:shadow-md dark:bg-blue-600 dark:hover:bg-blue-500',
      },
      size: {
        xs: 'h-8 px-3 text-xs rounded-lg',
        sm: 'h-9 px-3 text-sm rounded-lg',
        default: 'h-10 px-4 py-2 text-sm',
        lg: 'h-11 px-8 text-base',
        xl: 'h-12 px-10 text-lg',
        icon: 'h-10 w-10 p-0',
        'icon-sm': 'h-8 w-8 p-0 rounded-lg',
        'icon-lg': 'h-12 w-12 p-0',
        full: 'w-full h-10 px-4 py-2 text-sm',
      },
      animation: {
        none: '',
        scale: 'hover:scale-[1.02] transition-transform duration-200',
        lift: 'hover:-translate-y-0.5 hover:shadow-md transition-all duration-150',
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
