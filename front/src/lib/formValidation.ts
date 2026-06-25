/** Время ЧЧ:ММ — только цифры и двоеточие. */
export function sanitizeTimeInput(raw: string): string {
  const cleaned = raw.replace(/[^\d:]/g, "");
  const parts = cleaned.split(":").filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) {
    const d = parts[0].slice(0, 4);
    if (d.length <= 2) return d;
    return `${d.slice(0, 2)}:${d.slice(2, 4)}`;
  }
  const h = parts[0].slice(0, 2);
  const m = parts[1].slice(0, 2);
  return m.length ? `${h}:${m}` : h;
}

export function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value.trim());
}

/** Целое число для цены (BYN). */
export function sanitizePriceInput(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 6);
}

export function isValidDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T12:00:00`);
  return !Number.isNaN(d.getTime());
}
