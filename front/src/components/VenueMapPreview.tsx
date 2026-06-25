import { useEffect, useMemo, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { parseYandexLonLatFromText, stripHttpUrls } from "@/lib/resolveMediaUrl";
import { geocodeYandex } from "@/lib/yandexMaps";

const mapStyle = { filter: "invert(100%) hue-rotate(180deg) brightness(85%) contrast(90%)" } as const;

type VenueMapPreviewProps = {
  venueName: string;
  address: string;
  className?: string;
};

const MapIframe = ({ lon, lat }: { lon: number; lat: number }) => {
  const src = `https://yandex.ru/map-widget/v1/?ll=${encodeURIComponent(`${lon},${lat}`)}&z=16&pt=${encodeURIComponent(`${lon},${lat}`)},pm2rdm`;
  return (
    <iframe title="Предпросмотр карты" src={src} width="100%" height="100%" frameBorder={0} style={mapStyle} />
  );
};

export default function VenueMapPreview({ venueName, address, className = "h-72" }: VenueMapPreviewProps) {
  const coordsFromText = useMemo(
    () => parseYandexLonLatFromText(`${venueName}\n${address}`),
    [venueName, address]
  );

  const searchQuery = useMemo(() => {
    const cleaned = stripHttpUrls(address);
    return [venueName.trim(), cleaned].filter(Boolean).join(", ").trim();
  }, [venueName, address]);

  const [geocoded, setGeocoded] = useState<{ lon: number; lat: number } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  useEffect(() => {
    if (coordsFromText) {
      setGeocoded(null);
      return;
    }
    if (searchQuery.length < 3) {
      setGeocoded(null);
      return;
    }
    let cancelled = false;
    setGeoLoading(true);
    void geocodeYandex(searchQuery).then((c) => {
      if (!cancelled) {
        setGeocoded(c);
        setGeoLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [coordsFromText, searchQuery]);

  const coords = coordsFromText ?? geocoded;

  if (coords) {
    return (
      <div className={`rounded-xl overflow-hidden border border-white/10 bg-[#0a0a0a] ${className}`}>
        <MapIframe lon={coords.lon} lat={coords.lat} />
      </div>
    );
  }

  if (geoLoading && searchQuery.length >= 3) {
    return (
      <div
        className={`rounded-xl border border-white/10 bg-[#0a0a0a] flex flex-col items-center justify-center gap-2 text-white/40 ${className}`}
      >
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-sm">Поиск адреса на карте…</span>
      </div>
    );
  }

  if (searchQuery.length >= 3) {
    return (
      <div className={`rounded-xl overflow-hidden border border-white/10 bg-[#0a0a0a] ${className}`}>
        <iframe
          title="Предпросмотр карты"
          src={`https://yandex.ru/map-widget/v1/?mode=search&text=${encodeURIComponent(searchQuery)}&z=16`}
          width="100%"
          height="100%"
          frameBorder={0}
          style={mapStyle}
        />
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-dashed border-white/[0.12] bg-[#0a0a0a] flex flex-col items-center justify-center gap-3 text-center px-6 ${className}`}
    >
      <MapPin className="h-7 w-7 text-white/15" />
      <p className="text-sm text-white/40 max-w-sm">Вставьте ссылку Яндекс.Карт или адрес — предпросмотр появится здесь</p>
      <p className="text-xs text-white/25 font-mono">…maps/?ll=27.551643,53.910563…</p>
    </div>
  );
}
