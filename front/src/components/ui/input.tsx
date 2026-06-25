import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-white/12 bg-[#0a0a0a] px-3 py-2 text-base text-white ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-white placeholder:text-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6]/30 focus-visible:border-[#8B5CF6]/40 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm [color-scheme:dark]",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
