import { getEventById } from "@/data/eventData";
import { resolveEventImage } from "@/lib/resolveMediaUrl";
import { normalizeApiItem } from "@/lib/apiNormalize";
import { lineupArtistNames } from "@/lib/lineupTypes";

export type CatalogEvent = {
  id: string;
  title: string;
  image: string;
  date: string;
  time: string;
  location: string;
  price: string;
  category?: string;
  description?: string;
  lineup?: string[];
  genre?: string;
  isFeatured?: boolean;
  soldOut?: boolean;
  dateRaw: Date | null;
  priceFrom: number;
};

const GENRE_BY_ID: Record<string, string> = {
  "1": "Инди",
  "2": "Хип-хоп",
  "3": "Трэп",
  "4": "Арт-рэп",
  "5": "Хип-хоп",
  "6": "Рок",
  "7": "Трэп",
  "8": "Альтернатива",
};

const GENRE_KEYWORDS: [string, string][] = [
  ["би-2", "Рок"],
  ["noize", "Альтернатива"],
  ["miyagi", "Хип-хоп"],
  ["markul", "Хип-хоп"],
  ["pharaoh", "Трэп"],
  ["лсп", "Арт-рэп"],
  ["kai angel", "Трэп"],
  ["дождя", "Инди"],
];

/** Текст для карточки события (без плейсхолдеров из БД). */
export function eventCardDescription(raw?: string | null): string {
  const t = (raw ?? "").trim();
  if (!t || t === "—" || t === "-") return "";
  return t;
}

export function inferGenre(id: string, title: string, lineup: string[] = []): string {
  if (GENRE_BY_ID[id]) return GENRE_BY_ID[id];
  const hay = `${title} ${lineup.join(" ")}`.toLowerCase();
  for (const [kw, genre] of GENRE_KEYWORDS) {
    if (hay.includes(kw)) return genre;
  }
  return "Поп";
}

export function parsePriceFrom(price: string): number {
  const m = price.replace(/\s/g, "").match(/(\d+)/);
  return m ? Number(m[1]) : 0;
}

const RU_MONTHS: Record<string, number> = {
  января: 0,
  февраля: 1,
  марта: 2,
  апреля: 3,
  мая: 4,
  июня: 5,
  июля: 6,
  августа: 7,
  сентября: 8,
  октября: 9,
  ноября: 10,
  декабря: 11,
  январь: 0,
  февраль: 1,
  март: 2,
  апрель: 3,
  май: 4,
  июнь: 5,
  июль: 6,
  август: 7,
  сентябрь: 8,
  октябрь: 9,
  ноябрь: 10,
  декабрь: 11,
};

function parseDateString(s: string): Date | null {
  const t = s.trim();
  if (!t) return null;

  const dmy = t.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (dmy) {
    let y = Number(dmy[3]);
    if (y < 100) y += 2000;
    const d = new Date(y, Number(dmy[2]) - 1, Number(dmy[1]));
    if (!Number.isNaN(d.getTime())) return d;
  }

  const named = t.match(/(\d{1,2})\s+(\S+)\s+(\d{4})/);
  if (named) {
    const m = RU_MONTHS[named[2].toLowerCase()];
    if (m !== undefined) return new Date(Number(named[3]), m, Number(named[1]));
  }

  const iso = new Date(t);
  if (!Number.isNaN(iso.getTime())) return iso;

  return null;
}

export function parseEventDate(raw: unknown, fallbackDate?: string): Date | null {
  if (raw != null && String(raw).trim()) {
    const d = parseDateString(String(raw));
    if (d) return d;
  }
  if (fallbackDate) {
    return parseDateString(fallbackDate);
  }
  return null;
}

/** Начало дня в локальной зоне */
export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Событие в текущем месяце, не раньше сегодня */
export function isEventSoonThisMonth(eventDate: Date): boolean {
  const now = new Date();
  const today = startOfDay(now);
  const eventDay = startOfDay(eventDate);

  if (eventDay < today) return false;
  if (eventDay.getFullYear() !== now.getFullYear()) return false;
  if (eventDay.getMonth() !== now.getMonth()) return false;

  return true;
}

export type SortMode = "soon" | "price-asc" | "price-desc" | "title";

export function filterCatalogEvents(
  events: CatalogEvent[],
  opts: {
    search: string;
    type: string;
    genre: string;
    quick: "all" | "soon" | "featured";
  }
): CatalogEvent[] {
  const q = opts.search.trim().toLowerCase();

  return events.filter((event) => {
    if (opts.type !== "Все" && (event.category || "Концерт") !== opts.type) return false;
    if (opts.genre !== "Все жанры") {
      const g = (event.genre || "").trim();
      if (g !== opts.genre) return false;
    }

    if (opts.quick === "featured" && !event.isFeatured) return false;
    if (opts.quick === "soon") {
      if (!event.dateRaw || !isEventSoonThisMonth(event.dateRaw)) return false;
    }

    if (!q) return true;
    const inTitle = event.title.toLowerCase().includes(q);
    const inLocation = event.location.toLowerCase().includes(q);
    const inLineup = (event.lineup || []).some((a) => a.toLowerCase().includes(q));
    return inTitle || inLocation || inLineup;
  });
}

export function sortCatalogEvents(events: CatalogEvent[], mode: SortMode): CatalogEvent[] {
  const copy = [...events];
  let sorted: CatalogEvent[];
  switch (mode) {
    case "price-asc":
      sorted = copy.sort((a, b) => a.priceFrom - b.priceFrom);
      break;
    case "price-desc":
      sorted = copy.sort((a, b) => b.priceFrom - a.priceFrom);
      break;
    case "title":
      sorted = copy.sort((a, b) => a.title.localeCompare(b.title, "ru"));
      break;
    case "soon":
    default:
      sorted = copy.sort((a, b) => {
        if (!a.dateRaw && !b.dateRaw) return 0;
        if (!a.dateRaw) return 1;
        if (!b.dateRaw) return -1;
        return a.dateRaw.getTime() - b.dateRaw.getTime();
      });
  }
  return moveSoldOutLast(sorted);
}

/** SOLD OUT — в конец списка, порядок внутри групп сохраняется. */
export function moveSoldOutLast(events: CatalogEvent[]): CatalogEvent[] {
  const available: CatalogEvent[] = [];
  const soldOut: CatalogEvent[] = [];
  for (const e of events) {
    if (e.soldOut) soldOut.push(e);
    else available.push(e);
  }
  return [...available, ...soldOut];
}

export function countUniqueVenues(events: CatalogEvent[]): number {
  return new Set(events.map((e) => e.location).filter(Boolean)).size;
}

export function mapApiEventRecordToCatalog(event: Record<string, unknown>): CatalogEvent {
  const id = String(event.id);
  const fallback = getEventById(id);
  const title =
    event.title && !/^\?+$/.test(String(event.title))
      ? String(event.title)
      : fallback?.title || "Без названия";
  const parsedLineup = lineupArtistNames(event.lineup);
  const lineup = parsedLineup.length ? parsedLineup : fallback?.lineup || [];
  const dateRaw = parseEventDate(event.date, fallback?.date);
  const price =
    event.price && !/^\?+$/.test(String(event.price))
      ? String(event.price)
      : fallback?.price || "От 50 BYN";
  const apiGenre =
    event.genre && !/^\?+$/.test(String(event.genre)) ? String(event.genre) : "";
  const apiDescription =
    event.description && !/^\?+$/.test(String(event.description))
      ? String(event.description)
      : fallback?.description
        ? String(fallback.description)
        : "";

  return {
    id,
    title,
    image: resolveEventImage(
      event.image as string,
      id,
      title,
      lineup,
      apiGenre || inferGenre(id, title, lineup)
    ),
    location:
      event.location && !/^\?+$/.test(String(event.location))
        ? String(event.location)
        : fallback?.location || "Минск",
    price,
    category:
      event.category && !/^\?+$/.test(String(event.category))
        ? String(event.category)
        : fallback?.category || "Концерт",
    lineup,
    genre: apiGenre || inferGenre(id, title, lineup),
    description: eventCardDescription(apiDescription),
    isFeatured: Boolean(event.isFeatured ?? fallback?.isFeatured),
    soldOut: Boolean(event.isSoldOut ?? event.soldOut),
    date: dateRaw ? dateRaw.toLocaleDateString("ru-RU") : fallback?.date || "",
    time: String(event.time || fallback?.time || ""),
    dateRaw,
    priceFrom: parsePriceFrom(price),
  };
}

export function mapApiEventsToCatalog(data: unknown): CatalogEvent[] {
  const normalized = normalizeApiItem(data || []);
  if (!Array.isArray(normalized)) return [];
  return normalized.map((event) => mapApiEventRecordToCatalog(event as Record<string, unknown>));
}
