/**
 * Copyright by Calmic Sdn Bhd
 * Navigation Button Component - Dedicated component for header navigation
 */

import * as React from "react"
import { cn } from "@/lib/utils"

interface NavButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
  children: React.ReactNode
}

const NavButton = React.forwardRef<HTMLButtonElement, NavButtonProps>(
  ({ className, active, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          // Layout - vertical column with centered items
          "flex flex-col items-center justify-center",
          // Sizing
          "h-auto py-1 px-2",
          // Typography
          "text-sm font-medium",
          // Appearance
          "rounded-md border border-transparent",
          // States
          "hover:bg-accent hover:text-accent-foreground",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "disabled:pointer-events-none disabled:opacity-50",
          // Active state
          active && "bg-secondary border-secondary-border",
          className
        )}
        {...props}
      />
    )
  }
)
NavButton.displayName = "NavButton"

interface NavIconProps {
  children: React.ReactNode
  large?: boolean
}

const NavIcon = ({ children, large }: NavIconProps) => {
  return (
    <span
      className={cn(
        "flex items-center justify-center",
        large ? "w-6 h-6" : "w-5 h-5",
        "[&>svg]:w-full [&>svg]:h-full"
      )}
    >
      {children}
    </span>
  )
}

const NavLabel = ({ children }: { children: React.ReactNode }) => {
  return (
    <span className="text-[10px] mt-0.5 leading-tight whitespace-nowrap">
      {children}
    </span>
  )
}

export { NavButton, NavIcon, NavLabel }
