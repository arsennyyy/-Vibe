import type { MapSeat } from "@/lib/hallSeatTypes";
import { tierLabel, type HallTheme } from "@/lib/seatMapTheme";

function tierKey(seat: MapSeat): string {
  return seat.priceTier || seat.type || "standard";
}

export function seatCategoryName(seat: MapSeat, theme?: HallTheme): string {
  if (seat.isGa) return seat.sector || tierLabel("ga", theme);
  return tierLabel(tierKey(seat), theme);
}

function parseRowNum(row: string): number {
  const n = parseInt(row, 10);
  if (!Number.isNaN(n)) return n;
  const c = row.trim().toUpperCase().charCodeAt(0);
  if (c >= 65 && c <= 90) return c - 64;
  return 999;
}

function scoreSeat(seat: MapSeat, zoneSeats: MapSeat[]): number {
  if (seat.posY != null && seat.posX != null) {
    const xs = zoneSeats.map((s) => s.posX).filter((x): x is number => x != null);
    const centerX = xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : seat.posX;
    return seat.posY * 1000 + Math.abs(seat.posX - centerX);
  }
  return parseRowNum(seat.row) * 1000 + Math.abs(seat.number - 50);
}

function pickConsecutiveBlock(rowSeats: MapSeat[], count: number): MapSeat[] | null {
  const sorted = [...rowSeats].sort((a, b) => a.number - b.number);
  let best: MapSeat[] | null = null;
  let bestScore = Infinity;

  for (let i = 0; i <= sorted.length - count; i++) {
    const window = sorted.slice(i, i + count);
    let consecutive = true;
    for (let j = 1; j < window.length; j++) {
      if (window[j].number !== window[j - 1].number + 1) {
        consecutive = false;
        break;
      }
    }
    if (!consecutive) continue;
    const mid = window[Math.floor(window.length / 2)];
    const score = scoreSeat(mid, rowSeats);
    if (score < bestScore) {
      bestScore = score;
      best = window;
    }
  }
  return best;
}

/** Подбирает лучшие места для просмотра: ближе к сцене, по центру ряда; для GA — любые свободные. */
export function pickBestSeatIds(
  allSeats: MapSeat[],
  categoryName: string,
  count: number,
  theme?: HallTheme,
  excludeIds: Set<number> = new Set()
): number[] {
  if (count <= 0) return [];

  const zoneSeats = allSeats.filter(
    (s) =>
      s.status === "available" &&
      !excludeIds.has(s.id) &&
      seatCategoryName(s, theme) === categoryName
  );

  if (zoneSeats.length === 0) return [];

  const gaSeats = zoneSeats.filter((s) => s.isGa);
  if (gaSeats.length > 0) {
    return gaSeats.slice(0, count).map((s) => s.id);
  }

  const byRow = new Map<string, MapSeat[]>();
  for (const s of zoneSeats) {
    const list = byRow.get(s.row) ?? [];
    list.push(s);
    byRow.set(s.row, list);
  }

  const rows = [...byRow.entries()].sort((a, b) => parseRowNum(a[0]) - parseRowNum(b[0]));

  for (const [, rowSeats] of rows) {
    if (rowSeats.length < count) continue;
    const block = pickConsecutiveBlock(rowSeats, count);
    if (block) return block.map((s) => s.id);
  }

  const scored = zoneSeats
    .map((s) => ({ s, score: scoreSeat(s, zoneSeats) }))
    .sort((a, b) => a.score - b.score);

  return scored.slice(0, count).map((x) => x.s.id);
}

export function countSeatsInCategory(
  seats: MapSeat[],
  selectedIds: Set<number>,
  categoryName: string,
  theme?: HallTheme
): number {
  return seats.filter((s) => selectedIds.has(s.id) && seatCategoryName(s, theme) === categoryName).length;
}

export function maxAvailableInCategory(
  seats: MapSeat[],
  categoryName: string,
  theme?: HallTheme
): number {
  return seats.filter((s) => s.status === "available" && seatCategoryName(s, theme) === categoryName).length;
}
