import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type AdminTabItem = {
  value: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
};

type AdminTabBarProps = {
  tabs: AdminTabItem[];
  activeTab: string;
  onChange: (value: string) => void;
};

export default function AdminTabBar({ tabs, activeTab, onChange }: AdminTabBarProps) {
  return (
    <div className="flex flex-wrap gap-1.5 min-w-0 flex-1">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = activeTab === tab.value;
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={cn(
              "inline-flex items-center gap-2 shrink-0 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all",
              active
                ? "bg-[#8B5CF6]/22 text-white border border-[#8B5CF6]/45 shadow-[0_4px_24px_rgba(139,92,246,0.2)]"
                : "bg-white/[0.04] text-white/55 border border-white/[0.06] hover:bg-white/[0.08] hover:text-white/80"
            )}
          >
            <Icon className={cn("h-4 w-4", active ? "text-[#c4b5fd]" : "text-white/40")} />
            {tab.label}
            {tab.badge != null && tab.badge > 0 ? (
              <span className="relative inline-flex">
                {!active && (tab.value === "cancellations" || tab.value === "ticket-refunds") ? (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.7)] animate-pulse" />
                ) : null}
                <span
                  className={cn(
                    "min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-[10px] font-bold text-center",
                    tab.value === "cancellations" || tab.value === "ticket-refunds"
                      ? active
                        ? "bg-rose-500/35 text-white"
                        : "bg-rose-500/20 text-rose-200"
                      : active
                        ? "bg-[#8B5CF6]/35 text-white"
                        : "bg-[#8B5CF6]/20 text-[#c4b5fd]"
                  )}
                >
                  {tab.badge}
                </span>
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
