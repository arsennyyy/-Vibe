export type SupportThreadStatusKey =
  | "ai"
  | "awaiting_admin"
  | "answered"
  | "resolved"
  | "closed";

export type SupportStatusUi = {
  label: string;
  dotClassName: string;
  pillClassName: string;
  labelClassName: string;
};

const STATUS_UI: Record<SupportThreadStatusKey, SupportStatusUi> = {
  ai: {
    label: "ИИ-ассистент",
    dotClassName: "bg-violet-400 shadow-[0_0_10px_rgba(139,92,246,0.45)]",
    pillClassName: "border-violet-500/25 bg-violet-500/10",
    labelClassName: "text-violet-300/95",
  },
  awaiting_admin: {
    label: "Ожидает ответа",
    dotClassName: "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.45)]",
    pillClassName: "border-amber-500/25 bg-amber-500/10",
    labelClassName: "text-amber-300/95",
  },
  answered: {
    label: "Отвечено",
    dotClassName: "bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.45)]",
    pillClassName: "border-sky-500/25 bg-sky-500/10",
    labelClassName: "text-sky-300/95",
  },
  resolved: {
    label: "Решено",
    dotClassName: "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]",
    pillClassName: "border-emerald-500/25 bg-emerald-500/10",
    labelClassName: "text-emerald-300/95",
  },
  closed: {
    label: "Закрыто",
    dotClassName: "bg-white/25",
    pillClassName: "border-white/15 bg-white/[0.04]",
    labelClassName: "text-white/45",
  },
};

export function normalizeSupportStatus(raw: unknown): SupportThreadStatusKey {
  const s = String(raw ?? "ai").trim().toLowerCase();
  if (s in STATUS_UI) return s as SupportThreadStatusKey;
  return "ai";
}

export function getSupportStatusUi(raw: unknown): SupportStatusUi {
  return STATUS_UI[normalizeSupportStatus(raw)];
}

export const SUPPORT_STATUS_OPTIONS: SupportThreadStatusKey[] = [
  "ai",
  "awaiting_admin",
  "answered",
  "resolved",
  "closed",
];

export function supportSenderLabel(role: string): string {
  switch (role) {
    case "user":
      return "Пользователь";
    case "admin":
      return "Поддержка";
    case "ai":
      return "ИИ-ассистент";
    default:
      return role;
  }
}
