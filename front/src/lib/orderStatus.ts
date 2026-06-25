export type OrderStatusKey = "paid" | "pending" | "cancelled" | "refunded";

export type OrderStatusUi = {
  label: string;
  dotClassName: string;
  pillClassName: string;
  labelClassName: string;
};

const STATUS_UI: Record<OrderStatusKey, OrderStatusUi> = {
  paid: {
    label: "Оплачен",
    dotClassName: "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]",
    pillClassName: "border-emerald-500/30 bg-emerald-500/10",
    labelClassName: "text-emerald-300",
  },
  pending: {
    label: "В ожидании",
    dotClassName: "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.45)]",
    pillClassName: "border-amber-500/30 bg-amber-500/10",
    labelClassName: "text-amber-300",
  },
  cancelled: {
    label: "Отменён",
    dotClassName: "bg-white/30",
    pillClassName: "border-white/15 bg-white/[0.04]",
    labelClassName: "text-white/45",
  },
  refunded: {
    label: "Возврат",
    dotClassName: "bg-violet-400 shadow-[0_0_10px_rgba(167,139,250,0.4)]",
    pillClassName: "border-violet-500/30 bg-violet-500/10",
    labelClassName: "text-violet-300",
  },
};

export function normalizeOrderStatus(raw: unknown): OrderStatusKey {
  const s = String(raw ?? "pending").trim().toLowerCase();
  if (s in STATUS_UI) return s as OrderStatusKey;
  return "pending";
}

export function getOrderStatusUi(raw: unknown): OrderStatusUi {
  return STATUS_UI[normalizeOrderStatus(raw)];
}
