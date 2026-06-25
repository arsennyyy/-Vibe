import { config } from "@/config";
import { normalizeApiItem } from "@/lib/apiNormalize";
import { inferGenre, parseEventDate } from "@/lib/concertsCatalog";
import { lineupArtistNames, lineupGeniusArtistNames } from "@/lib/lineupTypes";

export type CatalogSearchHit = {
  id: string;
  title: string;
  location: string;
  /** Все имена из состава — для поиска */
  lineup: string[];
  /** Имена артистов с Genius (или весь состав) — для подсказок */
  artists: string[];
  genre?: string;
};

export async function fetchCatalogSearchHits(): Promise<CatalogSearchHit[]> {
  const res = await fetch(config.endpoints.events);
  if (!res.ok) return [];
  const data = await res.json();
  const normalized = normalizeApiItem(data || []);
  return (normalized || []).map((event: Record<string, unknown>) => {
    const id = String(event.id);
    const title = String(event.title || "Без названия");
    const lineup = lineupArtistNames(event.lineup);
    const artists = lineupGeniusArtistNames(event.lineup);
    const apiGenre =
      event.genre && !/^\?+$/.test(String(event.genre)) ? String(event.genre) : "";
    return {
      id,
      title,
      location: String(event.location || "Минск"),
      lineup,
      artists,
      genre: apiGenre || inferGenre(id, title, lineup),
    };
  });
}

export function filterCatalogHits(hits: CatalogSearchHit[], query: string): CatalogSearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return hits.filter((ev) => {
    const hay = [ev.title, ev.location, ev.genre ?? "", ...ev.lineup, ...ev.artists].join(" ").toLowerCase();
    return hay.includes(q);
  });
}
