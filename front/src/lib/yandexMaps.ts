const YANDEX_GEO_API_KEY = "22662b03-7e60-4230-b268-7418b275248e";

export async function geocodeYandex(query: string): Promise<{ lon: number; lat: number } | null> {
  const q = query.trim();
  if (q.length < 3) return null;
  try {
    const url = `https://geocode-maps.yandex.ru/1.x/?apikey=${encodeURIComponent(YANDEX_GEO_API_KEY)}&geocode=${encodeURIComponent(q)}&format=json&results=1`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const pos: string | undefined =
      data?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject?.Point?.pos;
    if (!pos) return null;
    const [lon, lat] = pos.split(" ").map(Number);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
    return { lon, lat };
  } catch {
    return null;
  }
}
