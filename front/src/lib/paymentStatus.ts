export type PaymentStatusKey = "completed" | "pending" | "failed" | "refunded";

export type PaymentStatusUi = {
  label: string;
  dotClassName: string;
  pillClassName: string;
  labelClassName: string;
};

const STATUS_UI: Record<PaymentStatusKey, PaymentStatusUi> = {
  completed: {
    label: "Оплачен",
    dotClassName: "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]",
    pillClassName: "border-emerald-500/30 bg-emerald-500/10",
    labelClassName: "text-emerald-300",
  },
  pending: {
    label: "Ожидает",
    dotClassName: "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.45)]",
    pillClassName: "border-amber-500/30 bg-amber-500/10",
    labelClassName: "text-amber-300",
  },
  failed: {
    label: "Ошибка",
    dotClassName: "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.45)]",
    pillClassName: "border-red-500/30 bg-red-500/10",
    labelClassName: "text-red-300",
  },
  refunded: {
    label: "Возврат",
    dotClassName: "bg-violet-400 shadow-[0_0_10px_rgba(167,139,250,0.4)]",
    pillClassName: "border-violet-500/30 bg-violet-500/10",
    labelClassName: "text-violet-300",
  },
};

export function normalizePaymentStatus(raw: unknown): PaymentStatusKey {
  const s = String(raw ?? "pending").trim().toLowerCase();
  if (s in STATUS_UI) return s as PaymentStatusKey;
  return "pending";
}

export function getPaymentStatusUi(raw: unknown): PaymentStatusUi {
  return STATUS_UI[normalizePaymentStatus(raw)];
}
