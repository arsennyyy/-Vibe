export type SeatStatus = "available" | "reserved" | "selected" | "sold";

export type MapSeat = {
  id: number;
  sector?: string;
  row: string;
  number: number;
  status: SeatStatus;
  type: string;
  price: number;
  priceTier?: string;
  posX?: number | null;
  posY?: number | null;
  isGa?: boolean;
  reservedByUserId?: number | null;
  reservationExpiresAt?: string | null;
};

export type HallTheme = {
  tierColors?: Record<string, string>;
  tierPrices?: Record<string, number>;
  tierLabels?: Record<string, string>;
};

export type GaZone = {
  sector: string;
  x: number;
  y: number;
  width: number;
  height: number;
  available: number;
  price: number;
  priceTier?: string;
  sampleSeatId: number;
};

export type HallMapPayload = {
  seats: MapSeat[];
  hallThemeJson?: string | null;
  theme?: HallTheme | null;
  viewWidth?: number;
  viewHeight?: number;
  stageY?: number;
};

export function normalizeMapSeat(raw: Record<string, unknown>): MapSeat | null {
  const id = Number(raw.id ?? raw.Id);
  const row = String(raw.row ?? raw.Row ?? "");
  const number = Number(raw.number ?? raw.Number);
  if (!id || !row || Number.isNaN(number)) return null;

  return {
    id,
    sector: (raw.sector ?? raw.Sector) as string | undefined,
    row,
    number,
    status: String(raw.status ?? raw.Status ?? "available") as SeatStatus,
    type: String(raw.type ?? raw.Type ?? "standard"),
    price: Number(raw.price ?? raw.Price ?? 0),
    priceTier: (raw.priceTier ?? raw.PriceTier) as string | undefined,
    posX: raw.posX != null ? Number(raw.posX) : raw.PosX != null ? Number(raw.PosX) : null,
    posY: raw.posY != null ? Number(raw.posY) : raw.PosY != null ? Number(raw.PosY) : null,
    isGa: Boolean(raw.isGa ?? raw.IsGa),
    reservedByUserId: (raw.reservedByUserId ?? raw.ReservedByUserId) as number | null,
    reservationExpiresAt: (raw.reservationExpiresAt ?? raw.ReservationExpiresAt) as string | null,
  };
}

export function parseHallTheme(json?: string | null): HallTheme {
  if (!json) return {};
  try {
    return JSON.parse(json) as HallTheme;
  } catch {
    return {};
  }
}

export function buildGaZones(seats: MapSeat[]): GaZone[] {
  const bySector = new Map<string, MapSeat[]>();
  for (const s of seats) {
    if (!s.isGa || s.status === "sold") continue;
    const key = s.sector || "GA";
    const list = bySector.get(key) ?? [];
    list.push(s);
    bySector.set(key, list);
  }

  const zones: GaZone[] = [];
  for (const [sector, list] of bySector) {
    const withCoords = list.filter((s) => s.posX != null && s.posY != null);
    if (!withCoords.length) continue;
    const xs = withCoords.map((s) => s.posX!);
    const ys = withCoords.map((s) => s.posY!);
    const pad = 8;
    const available = list.filter((s) => s.status === "available" || s.status === "selected").length;
    if (!available) continue;
    const sample = list.find((s) => s.status === "available") ?? list[0];
    zones.push({
      sector,
      x: Math.min(...xs) - pad,
      y: Math.min(...ys) - pad,
      width: Math.max(...xs) - Math.min(...xs) + pad * 2 + 6,
      height: Math.max(...ys) - Math.min(...ys) + pad * 2 + 6,
      available,
      price: sample.price,
      priceTier: sample.priceTier,
      sampleSeatId: sample.id,
    });
  }
  return zones;
}

export function collectTiers(seats: MapSeat[]): string[] {
  const set = new Set<string>();
  for (const s of seats) {
    if (s.isGa) {
      set.add(s.priceTier || "ga");
      continue;
    }
    if (s.priceTier) set.add(s.priceTier);
    else if (s.type === "vip") set.add("vip");
    else set.add("standard");
  }
  return Array.from(set).sort((a, b) => {
    if (a === "ga") return -1;
    if (b === "ga") return 1;
    return a.localeCompare(b, "ru");
  });
}

/** Ключ сортировки ряда: цифры → буквы → ложи L1/L2 (как в шаблонах залов). */
function rowSortKey(row: string): [number, number, string] {
  const r = row.trim();
  if (/^\d+$/.test(r)) return [0, parseInt(r, 10), ""];
  if (/^[A-Za-zА-Яа-яЁё]$/.test(r)) return [1, r.codePointAt(0) ?? 0, ""];
  const box = /^L(\d+)$/i.exec(r);
  if (box) return [2, parseInt(box[1], 10), ""];
  return [3, 0, r];
}

export function compareHallRows(a: string, b: string): number {
  const ka = rowSortKey(a);
  const kb = rowSortKey(b);
  for (let i = 0; i < 3; i++) {
    if (ka[i] === kb[i]) continue;
    if (typeof ka[i] === "number" && typeof kb[i] === "number") return ka[i] - kb[i];
    return String(ka[i]).localeCompare(String(kb[i]), "ru");
  }
  return 0;
}

export function sortHallRows(rows: string[]): string[] {
  return [...new Set(rows)].sort(compareHallRows);
}

/** Единый порядок рядов для превью и покупки билетов. */
export function buildRowOrder(seats: MapSeat[]): string[] {
  const rows: string[] = [];
  for (const s of seats) {
    if (s.isGa || rows.includes(s.row)) continue;
    rows.push(s.row);
  }
  return sortHallRows(rows);
}
