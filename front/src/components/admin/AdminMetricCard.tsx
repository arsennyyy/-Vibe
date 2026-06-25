import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: ReactNode;
  sub?: string | null;
  icon: LucideIcon;
  accent: string;
  iconBg: string;
};

/** Карточка метрики — как в шапке админ-панели. */
export default function AdminMetricCard({ label, value, sub, icon: Icon, accent, iconBg }: Props) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border p-5",
        "bg-gradient-to-br",
        accent
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40 mb-2">
            {label}
          </p>
          <p className="text-2xl md:text-[1.65rem] font-display font-bold text-white tracking-tight tabular-nums">
            {value}
          </p>
          {sub ? (
            <p className="text-xs text-white/40 mt-2 leading-snug">{sub}</p>
          ) : null}
        </div>
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", iconBg)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
