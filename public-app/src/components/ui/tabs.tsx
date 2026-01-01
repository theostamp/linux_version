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
      // Theme-aware colors (better contrast in dark mode too)
      "rounded-xl sm:rounded-2xl bg-muted p-1 sm:p-1.5",
      "text-muted-foreground",
      // Subtle depth
      "shadow-inner shadow-black/5 dark:shadow-black/20",
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

      // Inactive state
      "text-muted-foreground",
      "hover:text-foreground",
      "hover:bg-background/60",

      // Focus state
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",

      // Disabled state
      "disabled:pointer-events-none disabled:opacity-50",

      // Active state
      "data-[state=active]:bg-background",
      "data-[state=active]:text-foreground",
      "data-[state=active]:shadow-sm data-[state=active]:shadow-black/10",
      "data-[state=active]:ring-1 data-[state=active]:ring-border/50",

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
      "mt-3 sm:mt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
