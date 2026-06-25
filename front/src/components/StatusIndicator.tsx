import { cn } from "@/lib/utils";

type StatusIndicatorProps = {
  dotClassName: string;
  label: string;
  labelClassName?: string;
  size?: "sm" | "md";
  className?: string;
};

export function StatusIndicator({
  dotClassName,
  label,
  labelClassName,
  size = "md",
  className,
}: StatusIndicatorProps) {
  const dotSize = size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className={cn("rounded-full shrink-0", dotSize, dotClassName)} aria-hidden />
      <span className={cn("font-medium", textSize, labelClassName)}>{label}</span>
    </span>
  );
}

type StatusPillProps = StatusIndicatorProps & {
  pillClassName?: string;
};

export function StatusPill({ pillClassName, ...props }: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-1",
        pillClassName,
        props.className
      )}
    >
      <StatusIndicator {...props} size={props.size ?? "sm"} className="" />
    </span>
  );
}
