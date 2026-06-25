/** Бэкенд отдаёт status числом (enum), строкой PascalCase или camelCase (System.Text.Json). */
export function getOrganizerEventStatusKey(evt: { status?: unknown; Status?: unknown }): string {
  const raw = evt.status ?? evt.Status;
  if (typeof raw === "number") {
    const map = ["Draft", "PendingReview", "Approved", "Rejected", "Published", "Passed", "Cancelled"];
    return map[raw] ?? String(raw);
  }
  const s = String(raw ?? "").trim();
  const aliases: Record<string, string> = {
    draft: "Draft",
    pendingReview: "PendingReview",
    approved: "Approved",
    rejected: "Rejected",
    published: "Published",
    passed: "Passed",
    cancelled: "Cancelled",
  };
  if (aliases[s]) return aliases[s];
  if (["Draft", "PendingReview", "Approved", "Rejected", "Published", "Passed", "Cancelled"].includes(s)) return s;
  return s || "Draft";
}

export function organizerStatusLabelRu(key: string): string {
  return getOrganizerStatusUi(key).label;
}

export type OrganizerStatusUi = {
  label: string;
  dotClassName: string;
  pillClassName: string;
  labelClassName: string;
};

/** Подпись и цвет индикатора для карточек организатора. */
export function getOrganizerStatusUi(statusKey: string): OrganizerStatusUi {
  switch (statusKey) {
    case "Rejected":
      return {
        label: "Отклонено",
        dotClassName: "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.45)]",
        pillClassName: "border-red-500/25 bg-red-500/10",
        labelClassName: "text-red-400/95",
      };
    case "Approved":
      return {
        label: "Одобрено",
        dotClassName: "bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.45)]",
        pillClassName: "border-sky-500/25 bg-sky-500/10",
        labelClassName: "text-sky-300/95",
      };
    case "Published":
      return {
        label: "Опубликовано",
        dotClassName: "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]",
        pillClassName: "border-emerald-500/25 bg-emerald-500/10",
        labelClassName: "text-emerald-400/95",
      };
    case "Passed":
      return {
        label: "Прошло",
        dotClassName: "bg-slate-400 shadow-[0_0_10px_rgba(148,163,184,0.35)]",
        pillClassName: "border-slate-500/25 bg-slate-500/10",
        labelClassName: "text-slate-300/95",
      };
    case "Cancelled":
      return {
        label: "Отменено",
        dotClassName: "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]",
        pillClassName: "border-rose-500/25 bg-rose-500/10",
        labelClassName: "text-rose-400/95",
      };
    case "PendingReview":
      return {
        label: "На модерации",
        dotClassName: "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.45)]",
        pillClassName: "border-amber-500/25 bg-amber-500/10",
        labelClassName: "text-amber-400/95",
      };
    case "Draft":
      return {
        label: "Черновик",
        dotClassName: "bg-white/30",
        pillClassName: "border-white/15 bg-white/[0.04]",
        labelClassName: "text-white/45",
      };
    case "AdminCreated":
      return {
        label: "Создано админом",
        dotClassName: "bg-violet-400 shadow-[0_0_10px_rgba(167,139,250,0.45)]",
        pillClassName: "border-violet-500/30 bg-violet-500/10",
        labelClassName: "text-violet-300/95",
      };
    case "CancellationPending":
      return {
        label: "Запрос на отмену",
        dotClassName: "bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,0.45)]",
        pillClassName: "border-rose-500/30 bg-rose-500/10",
        labelClassName: "text-rose-300/95",
      };
    default:
      return {
        label: statusKey || "—",
        dotClassName: "bg-white/20",
        pillClassName: "border-white/10 bg-white/[0.03]",
        labelClassName: "text-white/50",
      };
  }
}

/** Статус для UI: «Создано админом» только пока черновик/отклонено, иначе реальный статус. */
export function resolveOrganizerDisplayStatus(
  evt: {
    status?: unknown;
    Status?: unknown;
    createdByAdmin?: boolean;
    CreatedByAdmin?: boolean;
  },
  options?: { cancellationPending?: boolean }
): string {
  if (options?.cancellationPending) return "CancellationPending";
  const statusKey = getOrganizerEventStatusKey(evt);
  const createdByAdmin = Boolean(evt.createdByAdmin ?? evt.CreatedByAdmin);
  if (createdByAdmin && (statusKey === "Draft" || statusKey === "Rejected")) {
    return "AdminCreated";
  }
  return statusKey;
}
