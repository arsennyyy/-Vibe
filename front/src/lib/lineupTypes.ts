export type LineupArtist = {
  name: string;
  /** Профиль на Genius (артист или пользователь) — аватар подтягивается автоматически */
  geniusUrl?: string;
  /** @deprecated используйте geniusUrl */
  bandLink?: string;
  avatarUrl?: string;
  avatarSyncedAt?: string;
};

const GENIUS_RESERVED = new Set([
  "artists", "albums", "songs", "articles", "search", "login", "signup", "settings",
  "about", "jobs", "shop", "videos", "mixtapes", "users", "a", "embed", "api",
  "static", "discussions", "topics", "annotations", "press", "terms", "privacy",
  "dmca", "contributor_guidelines", "pro", "verified-artists", "new", "hot",
]);

/** Артист: genius.com/artists/… · Пользователь (начинающий): genius.com/username */
export function isGeniusProfileUrl(url: string): boolean {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.toLowerCase();
    if (host !== "genius.com" && host !== "www.genius.com") return false;
    const parts = u.pathname.replace(/^\/|\/$/g, "").split("/").filter(Boolean);
    if (parts.length === 0) return false;
    if (parts[0].toLowerCase() === "artists") {
      return parts.length >= 2 && parts[1].trim().length > 0;
    }
    return parts.length === 1 && !GENIUS_RESERVED.has(parts[0].toLowerCase());
  } catch {
    return false;
  }
}

export function getGeniusProfileKind(url: string): "artist" | "user" | null {
  if (!isGeniusProfileUrl(url)) return null;
  try {
    const parts = new URL(url.trim()).pathname.replace(/^\/|\/$/g, "").split("/").filter(Boolean);
    return parts[0]?.toLowerCase() === "artists" ? "artist" : "user";
  } catch {
    return null;
  }
}

/** @alias isGeniusProfileUrl */
export const isGeniusArtistUrl = isGeniusProfileUrl;

export function resolveGeniusUrl(artist: Pick<LineupArtist, "geniusUrl" | "bandLink">): string | undefined {
  const g = artist.geniusUrl?.trim();
  if (g && isGeniusProfileUrl(g)) return g;
  const legacy = artist.bandLink?.trim();
  if (legacy && isGeniusProfileUrl(legacy)) return legacy;
  return undefined;
}

export function parseLineup(raw: unknown): LineupArtist[] {
  if (!raw) return [];
  let arr: unknown[] = [];
  if (Array.isArray(raw)) arr = raw;
  else if (typeof raw === "string") {
    const t = raw.trim();
    if (!t) return [];
    try {
      const p = JSON.parse(t);
      arr = Array.isArray(p) ? p : t.split(/[,;]/).map((s) => s.trim());
    } catch {
      arr = t.split(/[,;]/).map((s) => s.trim());
    }
  }
  return arr
    .map((item): LineupArtist | null => {
      if (typeof item === "string") {
        const name = item.trim();
        return name ? { name } : null;
      }
      if (item && typeof item === "object") {
        const o = item as Record<string, unknown>;
        const name = String(o.name ?? o.Name ?? "").trim();
        if (!name) return null;
        const geniusRaw = String(o.geniusUrl ?? o.GeniusUrl ?? "").trim();
        const bandRaw = String(o.bandLink ?? o.BandLink ?? "").trim();
        const geniusUrl =
          (geniusRaw && isGeniusProfileUrl(geniusRaw) ? geniusRaw : undefined) ??
          (bandRaw && isGeniusProfileUrl(bandRaw) ? bandRaw : undefined);
        const bandLink = bandRaw && !isGeniusProfileUrl(bandRaw) ? bandRaw : undefined;
        return {
          name,
          geniusUrl,
          bandLink,
          avatarUrl: String(o.avatarUrl ?? o.AvatarUrl ?? "").trim() || undefined,
          avatarSyncedAt: String(o.avatarSyncedAt ?? o.AvatarSyncedAt ?? "").trim() || undefined,
        };
      }
      return null;
    })
    .filter((x): x is LineupArtist => x != null);
}

/** Имена артистов из lineup (JSON, объекты или строки). */
export function lineupArtistNames(raw: unknown): string[] {
  return parseLineup(raw)
    .map((a) => a.name.trim())
    .filter(Boolean);
}

/** Имена артистов с Genius; если нет привязки — все имена из состава. */
export function lineupGeniusArtistNames(raw: unknown): string[] {
  const artists = parseLineup(raw);
  const genius = artists
    .filter((a) => resolveGeniusUrl(a))
    .map((a) => a.name.trim())
    .filter(Boolean);
  if (genius.length) return genius;
  return artists.map((a) => a.name.trim()).filter(Boolean);
}

export function serializeLineup(artists: LineupArtist[]): string {
  const clean = artists
    .map((a) => {
      const geniusUrl = resolveGeniusUrl(a);
      return {
        name: a.name.trim(),
        ...(geniusUrl ? { geniusUrl } : {}),
        ...(a.avatarUrl?.trim() ? { avatarUrl: a.avatarUrl.trim() } : {}),
        ...(a.avatarSyncedAt?.trim() ? { avatarSyncedAt: a.avatarSyncedAt.trim() } : {}),
      };
    })
    .filter((a) => a.name);
  return JSON.stringify(clean);
}

/** @deprecated */
export function isBandLinkUrl(url: string): boolean {
  try {
    const u = new URL(url.trim());
    return u.hostname === "band.link" || u.hostname.endsWith(".band.link");
  } catch {
    return false;
  }
}
