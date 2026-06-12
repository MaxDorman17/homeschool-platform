import * as React from "react"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

function Checkbox({
  className,
  checked,
  onCheckedChange,
  id,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "checked" | "onChange"> & {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}) {
  return (
    <div className="relative flex items-center">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onCheckedChange?.(e.target.checked)}
        className="peer sr-only"
        {...props}
      />
      <div
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-input bg-background",
          "peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2",
          "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
          checked && "border-primary bg-primary text-primary-foreground",
          className
        )}
      >
        {checked && <Check className="h-3 w-3" />}
      </div>
    </div>
  )
}

export { Checkbox }
