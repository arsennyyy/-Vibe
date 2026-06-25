/**
 * Обложки событий: в БД хранится URL или путь.
 * - https://... — внешняя ссылка (Unsplash, CDN)
 * - /uploads/... — файл на бэкенде (загрузка организатором)
 */
import { config } from "@/config";
import { getEventById } from "@/data/eventData";
import {
  DEFAULT_EVENT_IMAGE,
  inferEventStockImage,
  isMissingLocalEventImage,
} from "@/lib/eventStockImages";

export { DEFAULT_EVENT_IMAGE } from "@/lib/eventStockImages";

/** Из любого URL достаём относительный путь /uploads/... для хранения в БД. */
export function toStorageMediaPath(url: string | undefined | null): string {
  if (!url || typeof url !== "string") return "";
  const u = url.trim();
  if (!u) return "";

  const uploadIdx = u.toLowerCase().indexOf("/uploads/");
  if (uploadIdx >= 0) return u.slice(uploadIdx);

  if (u.toLowerCase().startsWith("uploads/")) return `/${u}`;

  return u;
}

function resolveUploadPath(relativePath: string): string {
  const base = config.apiUrl.replace(/\/$/, "");
  return base ? `${base}${relativePath}` : relativePath;
}

export function resolveMediaUrl(url: string | undefined | null): string {
  if (!url || typeof url !== "string") return "";
  const u = url.trim();
  if (!u || /^\?+$/.test(u)) return "";

  if (u.startsWith("http://") || u.startsWith("https://")) {
    const stored = toStorageMediaPath(u);
    if (stored.startsWith("/uploads/")) return resolveUploadPath(stored);
    return u;
  }

  if (isMissingLocalEventImage(u)) return "";

  if (u.startsWith("/uploads/")) return resolveUploadPath(u);

  if (u.startsWith("/")) return u;

  if (u.startsWith("uploads/")) return resolveUploadPath(`/${u}`);

  return u;
}

/** Обложка для карточки/страницы: API → fallback по id → по названию → дефолт. */
export function resolveEventImage(
  apiImage: string | undefined | null,
  eventId?: string | number,
  title?: string | null,
  lineup?: string | string[] | null,
  genre?: string | null
): string {
  const fromApi = resolveMediaUrl(apiImage);
  if (fromApi) return fromApi;

  const fallback = eventId != null ? getEventById(String(eventId)) : undefined;
  const fromFallback = resolveMediaUrl(fallback?.image);
  if (fromFallback) return fromFallback;

  return inferEventStockImage(title ?? fallback?.title, lineup ?? fallback?.lineup, genre);
}

/** Убираем ссылки из строки адреса, чтобы не кормить их геокодеру. */
export function stripHttpUrls(text: string): string {
  return text.replace(/https?:\/\/[^\s]+/gi, " ").replace(/\s+/g, " ").trim();
}

/** Достаём lon/lat из ссылки Яндекса (?ll= или &pt=). */
export function parseYandexLonLatFromText(raw: string): { lon: number; lat: number } | null {
  if (!raw) return null;
  const tryParam = (name: string): { lon: number; lat: number } | null => {
    const re = new RegExp(`[?&#]${name}=([^&]+)`, "i");
    const m = raw.match(re);
    if (!m) return null;
    const decoded = decodeURIComponent(m[1].replace(/\+/g, " "));
    const parts = decoded.split(/[,\s]+/).map((x) => parseFloat(x.trim()));
    if (parts.length >= 2 && parts.every((n) => Number.isFinite(n))) {
      return { lon: parts[0], lat: parts[1] };
    }
    return null;
  };
  return tryParam("ll") ?? tryParam("pt");
}
