import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      // Base styles - better mobile spacing
      "inline-flex flex-wrap items-center gap-1 sm:gap-1.5",
      // Background with better contrast
      "rounded-xl sm:rounded-2xl bg-slate-100 dark:bg-slate-800/80 p-1 sm:p-1.5",
      // Text color with good contrast
      "text-slate-600 dark:text-slate-400",
      // Soft shadow for depth
      "shadow-inner shadow-slate-200/50 dark:shadow-slate-900/50",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      // Base layout - better mobile sizing
      "inline-flex items-center justify-center whitespace-nowrap",
      "rounded-lg sm:rounded-xl",
      "px-2.5 sm:px-4 py-1.5 sm:py-2",
      "text-xs sm:text-sm font-semibold",
      "transition-all duration-200",
      
      // Inactive state - better contrast
      "text-slate-600 dark:text-slate-400",
      "hover:text-slate-900 dark:hover:text-slate-100",
      "hover:bg-white/50 dark:hover:bg-slate-700/50",
      
      // Focus state
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2",
      
      // Disabled state
      "disabled:pointer-events-none disabled:opacity-50",
      
      // Active state - high contrast colors
      "data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700",
      "data-[state=active]:text-teal-700 dark:data-[state=active]:text-teal-300",
      "data-[state=active]:shadow-md data-[state=active]:shadow-slate-200/50 dark:data-[state=active]:shadow-slate-900/50",
      "data-[state=active]:ring-1 data-[state=active]:ring-teal-200/50 dark:data-[state=active]:ring-teal-700/30",
      
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-3 sm:mt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
