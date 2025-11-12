import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg hover:scale-[1.01] focus:ring-blue-500 font-medium',
        secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 hover:shadow-lg hover:scale-[1.01] focus:ring-gray-400 font-medium',
        destructive: 'bg-red-600 text-white hover:bg-red-700 hover:shadow-lg hover:scale-[1.01] focus:ring-red-500 font-medium',
        outline: 'border-2 border-blue-600 text-blue-600 bg-white hover:bg-blue-600 hover:text-white hover:shadow-md focus:ring-blue-500 font-medium',
        link: 'text-blue-600 underline-offset-4 hover:underline hover:text-blue-700 focus:ring-blue-500 font-medium',
        ghost: 'hover:bg-gray-100 hover:text-gray-900 focus:ring-gray-400 font-medium',
        success: 'bg-green-600 text-white hover:bg-green-700 hover:shadow-lg hover:scale-[1.01] focus:ring-green-500 font-medium',
        warning: 'bg-yellow-600 text-white hover:bg-yellow-700 hover:shadow-lg hover:scale-[1.01] focus:ring-yellow-500 font-medium',
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

