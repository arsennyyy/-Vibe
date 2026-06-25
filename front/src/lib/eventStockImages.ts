/** Уникальные обложки-заглушки (Unsplash), если в БД нет своей картинки. */
const STOCK: Record<string, string> = {
  markul: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80",
  pharaoh: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80",
  "три дня дождя": "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=1200&q=80",
  лсп: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80",
  miyagi: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80",
  "би-2": "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=1200&q=80",
  "kai angel": "https://images.unsplash.com/photo-1598387846159-ed4004000b01?auto=format&fit=crop&w=1200&q=80",
  "9mice": "https://images.unsplash.com/photo-1598387846159-ed4004000b01?auto=format&fit=crop&w=1200&q=80",
  "noize mc": "https://images.unsplash.com/photo-1506157786151-581731abf49?auto=format&fit=crop&w=1200&q=80",
  overlxrd: "https://images.unsplash.com/photo-1571266028243-e68f8570c9e0?auto=format&fit=crop&w=1200&q=80",
  анамнез: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80",
  висхолдинг: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=1200&q=80",
  mdga: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80",
  rock: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=1200&q=80",
  rap: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80",
  pop: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80",
};

export const DEFAULT_EVENT_IMAGE =
  "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80";

/** Локальные /images/* из старого сида — файлов в public нет. */
export function isMissingLocalEventImage(url: string | undefined | null): boolean {
  if (!url) return true;
  const u = url.trim().toLowerCase();
  if (!u) return true;
  return u.startsWith("/images/") || u.startsWith("images/");
}

export function inferEventStockImage(
  title?: string | null,
  lineup?: string | string[] | null,
  genre?: string | null
): string {
  const haystack = [
    title ?? "",
    ...(Array.isArray(lineup) ? lineup : typeof lineup === "string" ? [lineup] : []),
    genre ?? "",
  ]
    .join(" ")
    .toLowerCase();

  for (const [key, url] of Object.entries(STOCK)) {
    if (haystack.includes(key)) return url;
  }

  const g = (genre ?? "").toLowerCase();
  if (g.includes("рок") || g.includes("rock")) return STOCK.rock;
  if (g.includes("рэп") || g.includes("хип")) return STOCK.rap;
  if (g.includes("поп")) return STOCK.pop;

  return DEFAULT_EVENT_IMAGE;
}
