import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const cardVariants = cva(
  "rounded-3xl transition-all duration-200",
  {
    variants: {
      variant: {
        // Default - Cool Clarity theme: white card with blue-tinted shadow
        default: "bg-bg-card dark:bg-slate-800 shadow-card-soft hover:shadow-card-soft dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)] dark:hover:shadow-[0_4px_16px_rgba(0,0,0,0.3)]",
        // Outline - No border, just shadow
        outline: "bg-bg-card dark:bg-slate-800 shadow-card-soft hover:shadow-card-soft",
        // Kaspersky category cards - No borders, just shadows
        security: "bg-blue-50 dark:bg-blue-900/20 shadow-card-soft hover:shadow-card-soft",
        performance: "bg-purple-50 dark:bg-purple-900/20 shadow-card-soft hover:shadow-card-soft",
        privacy: "bg-orange-50 dark:bg-orange-900/20 shadow-card-soft hover:shadow-card-soft",
        warning: "bg-amber-50 dark:bg-amber-900/20 shadow-card-soft hover:shadow-card-soft",
        info: "bg-cyan-50 dark:bg-cyan-900/20 shadow-card-soft hover:shadow-card-soft",
        success: "bg-green-50 dark:bg-green-900/20 shadow-card-soft hover:shadow-card-soft",
        // Elevated - More prominent shadow
        elevated: "bg-bg-card dark:bg-slate-800 shadow-card-soft hover:shadow-lg dark:shadow-slate-900/30",
        // Ghost - No background, minimal styling
        ghost: "hover:bg-gray-50 dark:hover:bg-slate-800/50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant }), className)}
      {...props}
    />
  )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight text-gray-900 dark:text-gray-100", className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-gray-500 dark:text-gray-400", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, cardVariants }
