import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-none text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1abcbd] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 shadow-sm',
  {
    variants: {
      variant: {
        default: 'bg-[#1abcbd] text-white hover:bg-[#026878] hover:shadow-md hover:scale-[1.01] focus:ring-[#1abcbd] font-medium',
        secondary: 'bg-[#1abcbd] text-white hover:bg-[#026878] hover:shadow-md hover:scale-[1.01] focus:ring-[#1abcbd] font-medium',
        destructive: 'bg-[#1abcbd] text-white hover:bg-[#026878] hover:shadow-md hover:scale-[1.01] focus:ring-[#1abcbd] font-medium',
        outline: 'border-2 border-[#1abcbd] text-[#1abcbd] bg-white hover:bg-[#1abcbd] hover:text-white hover:shadow-md focus:ring-[#1abcbd] font-medium',
        link: 'text-[#1abcbd] underline-offset-4 hover:underline hover:text-[#026878] focus:ring-[#1abcbd] font-medium shadow-none',
        ghost: 'bg-[#1abcbd] text-white hover:bg-[#026878] hover:shadow-md focus:ring-[#1abcbd] font-medium',
        success: 'bg-[#1abcbd] text-white hover:bg-[#026878] hover:shadow-md hover:scale-[1.01] focus:ring-[#1abcbd] font-medium',
        warning: 'bg-[#1abcbd] text-white hover:bg-[#026878] hover:shadow-md hover:scale-[1.01] focus:ring-[#1abcbd] font-medium',
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

