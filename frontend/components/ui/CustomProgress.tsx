"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface CustomProgressProps {
  value: number
  className?: string
  backgroundColor?: string
  progressColor?: string
  height?: string
}

const CustomProgress = React.forwardRef<HTMLDivElement, CustomProgressProps>(
  ({ value, className, backgroundColor = "bg-gray-200", progressColor = "bg-blue-600", height = "h-3", ...props }, ref) => {
    const clampedValue = Math.min(Math.max(value, 0), 100)
    
    return (
      <div
        ref={ref}
        className={cn(
          "relative w-full overflow-hidden rounded-full",
          backgroundColor,
          height,
          className
        )}
        {...props}
      >
        <div
          className={cn(
            "h-full transition-all duration-300 ease-out",
            progressColor
          )}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    )
  }
)

CustomProgress.displayName = "CustomProgress"

export { CustomProgress }
