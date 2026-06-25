import { Users, CalendarDays, ShoppingBag, Wallet } from "lucide-react";
import AdminMetricCard from "./AdminMetricCard";
import { PriceText } from "@/lib/formatPrice";

type Stats = {
  totalUsers?: number;
  totalEvents?: number;
  totalOrders?: number;
  paidOrders?: number;
  platformRevenue?: number;
  totalRevenue?: number;
  totalGrossSales?: number;
  commissionPercent?: number;
  pendingModerationEvents?: number;
};

const cards = [
  {
    key: "users",
    label: "Пользователи",
    icon: Users,
    accent: "from-sky-500/20 to-transparent border-sky-500/20",
    iconBg: "bg-sky-500/15 text-sky-300",
    getValue: (s: Stats) => s.totalUsers ?? 0,
    sub: null as ((s: Stats) => string) | null,
  },
  {
    key: "events",
    label: "События",
    icon: CalendarDays,
    accent: "from-[#8B5CF6]/25 to-transparent border-[#8B5CF6]/25",
    iconBg: "bg-[#8B5CF6]/15 text-[#c4b5fd]",
    getValue: (s: Stats) => s.totalEvents ?? 0,
    sub: (s: Stats) =>
      s.pendingModerationEvents ? `На модерации: ${s.pendingModerationEvents}` : "В каталоге и черновики",
  },
  {
    key: "orders",
    label: "Заказы",
    icon: ShoppingBag,
    accent: "from-amber-500/15 to-transparent border-amber-500/20",
    iconBg: "bg-amber-500/15 text-amber-300",
    getValue: (s: Stats) => s.totalOrders ?? 0,
    sub: (s: Stats) =>
      s.paidOrders != null
        ? `Оплачено: ${s.paidOrders} · всего: ${s.totalOrders ?? 0}`
        : "Все заказы",
  },
  {
    key: "revenue",
    label: "Доход площадки",
    icon: Wallet,
    accent: "from-emerald-500/20 to-transparent border-emerald-500/20",
    iconBg: "bg-emerald-500/15 text-emerald-300",
    getValue: (s: Stats) => (
      <PriceText
        amount={s.platformRevenue ?? s.totalRevenue ?? 0}
        decimals={2}
        className="text-2xl md:text-[1.65rem] font-display font-bold text-white tracking-tight"
      />
    ),
    sub: (s: Stats) =>
      `Оборот ${(s.totalGrossSales ?? 0).toFixed(2)} · комиссия ${s.commissionPercent ?? 12}%`,
  },
];

export default function AdminStatCards({ statistics }: { statistics: Stats }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
      {cards.map((c) => (
        <AdminMetricCard
          key={c.key}
          label={c.label}
          value={c.getValue(statistics)}
          sub={c.sub ? c.sub(statistics) : null}
          icon={c.icon}
          accent={c.accent}
          iconBg={c.iconBg}
        />
      ))}
    </div>
  );
}
