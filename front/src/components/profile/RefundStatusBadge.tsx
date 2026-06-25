import { cn } from "@/lib/utils";
import type { RefundUi } from "@/lib/ticketRefundStatus";

const dotColor: Record<string, string> = {
  available: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]",
  pending: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]",
  soon_unavailable: "bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.6)]",
  unavailable: "bg-white/30",
  refunded: "bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.5)]",
  used: "bg-white/25",
  cancelled: "bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.5)]",
};

export default function RefundStatusBadge({ ui, className }: { ui: RefundUi; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold tracking-wide backdrop-blur-sm",
        ui.pillClassName,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotColor[ui.key] ?? "bg-white/40")} />
      {ui.label}
    </span>
  );
}
