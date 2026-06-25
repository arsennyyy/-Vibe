export type RefundUiStatus =
  | "available"
  | "pending"
  | "soon_unavailable"
  | "unavailable"
  | "refunded"
  | "used"
  | "cancelled";

export type RefundUi = {
  key: RefundUiStatus;
  label: string;
  hint?: string;
  canRequest: boolean;
  pillClassName: string;
};

const HOURS_FULL = 72;
const HOURS_WARN = 48;

export function hoursUntilEvent(eventDateIso?: string, eventTime?: string): number | null {
  if (!eventDateIso) return null;
  const d = new Date(eventDateIso);
  if (Number.isNaN(d.getTime())) return null;
  if (eventTime) {
    const m = eventTime.match(/(\d{1,2}):(\d{2})/);
    if (m) d.setHours(parseInt(m[1], 10), parseInt(m[2], 10), 0, 0);
  }
  return (d.getTime() - Date.now()) / (1000 * 60 * 60);
}

export function getRefundUi(opts: {
  isRefunded?: boolean;
  isUsed?: boolean;
  isCancelled?: boolean;
  isPast?: boolean;
  refundRequestStatus?: string | null;
  hoursUntil?: number | null;
}): RefundUi {
  if (opts.isRefunded) {
    return {
      key: "refunded",
      label: "Возвращён",
      canRequest: false,
      pillClassName: "border-violet-500/40 bg-gradient-to-r from-violet-500/15 to-violet-500/5 text-violet-100",
    };
  }
  if (opts.isCancelled) {
    return {
      key: "cancelled",
      label: "Концерт отменён",
      hint: "Возврат оформляется автоматически",
      canRequest: false,
      pillClassName: "border-rose-500/30 bg-rose-500/10 text-rose-300",
    };
  }
  if (opts.isUsed) {
    return {
      key: "used",
      label: "Билет использован",
      canRequest: false,
      pillClassName: "border-white/15 bg-white/5 text-white/45",
    };
  }
  if (opts.isPast) {
    return {
      key: "unavailable",
      label: "Возврат недоступен",
      hint: "Мероприятие уже прошло",
      canRequest: false,
      pillClassName: "border-white/15 bg-white/5 text-white/40",
    };
  }
  if (opts.refundRequestStatus === "pending") {
    return {
      key: "pending",
      label: "Заявка на рассмотрении",
      canRequest: false,
      pillClassName: "border-amber-500/40 bg-gradient-to-r from-amber-500/15 to-amber-500/5 text-amber-100",
    };
  }
  const h = opts.hoursUntil;
  if (h != null && h <= 0) {
    return {
      key: "unavailable",
      label: "Возврат недоступен",
      canRequest: false,
      pillClassName: "border-white/15 bg-white/5 text-white/40",
    };
  }
  if (h != null && h <= HOURS_WARN) {
    return {
      key: "soon_unavailable",
      label: "Скоро недоступен для возврата",
      hint: `До концерта менее ${Math.ceil(h)} ч — успейте подать заявку`,
      canRequest: true,
      pillClassName: "border-orange-500/40 bg-gradient-to-r from-orange-500/15 to-orange-500/5 text-orange-100",
    };
  }
  if (h != null && h <= HOURS_FULL) {
    return {
      key: "available",
      label: "Возврат доступен",
      hint: `Осталось ${Math.ceil(h)} ч до начала`,
      canRequest: true,
      pillClassName: "border-emerald-500/35 bg-gradient-to-r from-emerald-500/15 to-emerald-500/5 text-emerald-100",
    };
  }
  return {
    key: "available",
    label: "Возврат доступен",
    canRequest: true,
    pillClassName: "border-emerald-500/35 bg-gradient-to-r from-emerald-500/15 to-emerald-500/5 text-emerald-100",
  };
}

export function adminRefundUrgency(hoursUntil: number | null): RefundUi {
  if (hoursUntil == null) {
    return {
      key: "available",
      label: "Без срока",
      canRequest: false,
      pillClassName: "border-white/15 text-white/45",
    };
  }
  if (hoursUntil <= 24) {
    return {
      key: "soon_unavailable",
      label: "Срочно: < 24 ч",
      canRequest: false,
      pillClassName: "border-rose-500/40 bg-rose-500/15 text-rose-200",
    };
  }
  if (hoursUntil <= 48) {
    return {
      key: "soon_unavailable",
      label: "Скоро недоступен",
      canRequest: false,
      pillClassName: "border-orange-500/40 bg-gradient-to-r from-orange-500/15 to-orange-500/5 text-orange-100",
    };
  }
  if (hoursUntil <= 72) {
    return {
      key: "soon_unavailable",
      label: "Менее 72 ч",
      canRequest: false,
      pillClassName: "border-amber-500/35 bg-amber-500/12 text-amber-200",
    };
  }
  return {
    key: "available",
    label: "В срок",
    canRequest: false,
    pillClassName: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  };
}
