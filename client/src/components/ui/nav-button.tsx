/**
 * Copyright by Calmic Sdn Bhd
 * Navigation Button Component - Uses inline styles for guaranteed layout
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
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: 'auto',
          padding: '4px 8px',
          gap: '0px',
        }}
        className={cn(
          "text-sm font-medium text-foreground rounded-md border border-transparent",
          "hover:bg-accent hover:text-accent-foreground",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "disabled:pointer-events-none disabled:opacity-50",
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
  const size = large ? '24px' : '20px'
  return (
    <span
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          // Clone the child and add inline styles
          if (child.type === 'img') {
            return React.cloneElement(child as React.ReactElement<React.ImgHTMLAttributes<HTMLImageElement>>, {
              style: { width: '100%', height: '100%', ...((child.props as React.ImgHTMLAttributes<HTMLImageElement>).style || {}) }
            })
          }
          // For SVG icons from lucide-react
          return React.cloneElement(child as React.ReactElement<React.SVGProps<SVGSVGElement>>, {
            style: { width: '100%', height: '100%', ...((child.props as React.SVGProps<SVGSVGElement>).style || {}) }
          })
        }
        return child
      })}
    </span>
  )
}

const NavLabel = ({ children }: { children: React.ReactNode }) => {
  return (
    <span
      style={{
        fontSize: '10px',
        marginTop: '2px',
        lineHeight: 1.25,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}

export { NavButton, NavIcon, NavLabel }
