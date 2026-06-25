export type ContactMessageStatusKey = "new" | "in_progress" | "resolved" | "archived";

export type ContactStatusUi = {
  label: string;
  dotClassName: string;
  pillClassName: string;
  labelClassName: string;
};

const STATUS_UI: Record<ContactMessageStatusKey, ContactStatusUi> = {
  new: {
    label: "Новое",
    dotClassName: "bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.45)]",
    pillClassName: "border-sky-500/25 bg-sky-500/10",
    labelClassName: "text-sky-300/95",
  },
  in_progress: {
    label: "В работе",
    dotClassName: "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.45)]",
    pillClassName: "border-amber-500/25 bg-amber-500/10",
    labelClassName: "text-amber-300/95",
  },
  resolved: {
    label: "Решено",
    dotClassName: "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]",
    pillClassName: "border-emerald-500/25 bg-emerald-500/10",
    labelClassName: "text-emerald-300/95",
  },
  archived: {
    label: "В архиве",
    dotClassName: "bg-white/25",
    pillClassName: "border-white/15 bg-white/[0.04]",
    labelClassName: "text-white/45",
  },
};

export function normalizeContactStatus(raw: unknown): ContactMessageStatusKey {
  const s = String(raw ?? "new").trim().toLowerCase();
  if (s === "in progress" || s === "inprogress") return "in_progress";
  if (s in STATUS_UI) return s as ContactMessageStatusKey;
  return "new";
}

export function getContactStatusUi(raw: unknown): ContactStatusUi {
  return STATUS_UI[normalizeContactStatus(raw)];
}

export const CONTACT_STATUS_OPTIONS: ContactMessageStatusKey[] = [
  "new",
  "in_progress",
  "resolved",
  "archived",
];
