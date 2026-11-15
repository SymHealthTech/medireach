"use client"

import { useEffect, useState } from "react"
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

/**
 * Toasts (DESIGN_BRIEF.md §4): bottom-centre on mobile, top-right on desktop.
 * Theme comes from the dashboard shell (no next-themes dependency).
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const [desktop, setDesktop] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)")
    const update = () => setDesktop(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])

  return (
    <Sonner
      className="toaster group"
      position={desktop ? "top-right" : "bottom-center"}
      offset={desktop ? 24 : undefined}
      mobileOffset={{ bottom: 88 }}
      icons={{
        success: <CircleCheckIcon className="size-4 text-leaf" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4 text-marigold" />,
        error: <OctagonXIcon className="size-4 text-clay" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius-xl)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
