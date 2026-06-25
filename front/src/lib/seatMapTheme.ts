import { collectTiers, type HallTheme, type MapSeat } from "@/lib/hallSeatTypes";

export type HallTicketCategory = {
  name: string;
  price: number;
  available: boolean;
  availableCount: number;
};

function tierKeyForSeat(s: MapSeat): string {
  if (s.isGa) return s.priceTier || "ga";
  return s.priceTier || (s.type === "vip" ? "vip" : "standard");
}

/** Базовые цвета секторов / price tier (как на ticketpro). */
export const DEFAULT_TIER_COLORS: Record<string, string> = {
  premium: "#2563eb",
  vip: "#eab308",
  standard: "#64748b",
  ga: "#a855f7",
  fanzone: "#06b6d4",
  dancefloor: "#22c55e",
  festival: "#f97316",
  belletage: "#8b5cf6",
  balcony: "#14b8a6",
  side: "#6366f1",
  mid: "#0ea5e9",
  rear: "#78716c",
  amphitheater: "#0891b2",
  box: "#f59e0b",
  "box-vip": "#ca8a04",
  "sector-a": "#ec4899",
  "sector-b": "#3b82f6",
  "sector-c": "#8b5cf6",
  "sector-d": "#06b6d4",
  "sector-e": "#eab308",
  "sector-v": "#64748b",
  "sector-z": "#64748b",
  "sector-g": "#84cc16",
  "parter-center": "#38bdf8",
  "parter-left": "#60a5fa",
  "parter-right": "#60a5fa",
  lower: "#3b82f6",
  middle: "#22c55e",
  upper: "#a3a3a3",
  corner: "#f472b6",
  "tribune-a": "#facc15",
  "tribune-b": "#38bdf8",
  "tribune-c": "#4ade80",
  "tribune-d": "#fb7185",
  "front-extra": "#1d4ed8",
};

export const TIER_LABELS: Record<string, string> = {
  ga: "Танцпол",
  fanzone: "Фанзона",
  dancefloor: "Танцпол",
  festival: "Фестивальная",
  vip: "VIP",
  premium: "Премиум",
  standard: "Стандарт",
  belletage: "Бельэтаж",
  balcony: "Балкон",
  amphitheater: "Амфитеатр",
  box: "Ложа",
  parterre: "Партер",
  "parter-center": "Партер",
  mid: "Средний ярус",
  lower: "Нижний ярус",
  middle: "Средний ярус",
  upper: "Верхний ярус",
};

function hashHue(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue} 65% 52%)`;
}

export function tierColor(tier: string | undefined, theme?: HallTheme): string {
  const key = tier || "standard";
  return theme?.tierColors?.[key] ?? DEFAULT_TIER_COLORS[key] ?? hashHue(key);
}

export function tierLabel(tier: string, theme?: HallTheme): string {
  return theme?.tierLabels?.[tier] ?? TIER_LABELS[tier] ?? tier;
}

/** Цена места с учётом tierPrices из темы (как на бэкенде). */
export function resolveSeatPrice(
  priceTier: string | undefined,
  layoutPrice: number,
  theme?: HallTheme
): number {
  const tier = priceTier || "standard";
  const themed = theme?.tierPrices?.[tier];
  if (themed != null && !Number.isNaN(Number(themed))) return Number(themed);
  return layoutPrice;
}

export function defaultPricesFromSeats(seats: { priceTier?: string; type: string; price: number; isGa?: boolean }[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const s of seats) {
    const tier = s.isGa ? s.priceTier || "ga" : s.priceTier || (s.type === "vip" ? "vip" : "standard");
    if (!(tier in map)) map[tier] = s.price;
  }
  return map;
}

export function applyThemeToSeats<T extends { priceTier?: string; type: string; price: number; isGa?: boolean }>(
  seats: T[],
  theme?: HallTheme
): T[] {
  if (!theme?.tierPrices) return seats;
  return seats.map((s) => {
    const tier = s.isGa ? s.priceTier || "ga" : s.priceTier || s.type;
    return { ...s, price: resolveSeatPrice(tier, s.price, theme) };
  });
}

export function mergeTheme(base?: HallTheme, patch?: HallTheme): HallTheme {
  return {
    tierColors: { ...base?.tierColors, ...patch?.tierColors },
    tierPrices: { ...base?.tierPrices, ...patch?.tierPrices },
    tierLabels: { ...base?.tierLabels, ...patch?.tierLabels },
  };
}

export function themeFromTiers(tiers: string[]): HallTheme {
  const tierColors: Record<string, string> = {};
  const tierLabels: Record<string, string> = {};
  for (const t of tiers) {
    tierColors[t] = DEFAULT_TIER_COLORS[t] ?? hashHue(t);
    if (TIER_LABELS[t]) tierLabels[t] = TIER_LABELS[t];
  }
  return { tierColors, tierLabels };
}

/** Категории билетов для карточек — те же зоны и цены, что на схеме зала. */
export function deriveTicketCategoriesFromHall(
  seats: MapSeat[],
  theme?: HallTheme
): HallTicketCategory[] {
  const themed = applyThemeToSeats(seats, theme);
  const tiers = collectTiers(themed);
  return tiers.map((tier) => {
    const inTier = themed.filter((s) => tierKeyForSeat(s) === tier);
    const availableCount = inTier.filter((s) => s.status === "available").length;
    const sample = inTier[0];
    const price = sample
      ? resolveSeatPrice(tierKeyForSeat(sample), sample.price, theme)
      : Number(theme?.tierPrices?.[tier] ?? 0);
    return {
      name: tierLabel(tier, theme),
      price: Math.round(price),
      available: availableCount > 0,
      availableCount,
    };
  });
}
