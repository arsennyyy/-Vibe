import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { motion } from "framer-motion";
import { Calendar, Clock, MapPin, Check, Info, Minus, Plus, Ticket } from "lucide-react";
import SeatMap, { type SeatMapHandle } from "@/components/SeatMap";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { config } from "@/config";
import { useToast } from "@/components/ui/use-toast";
import { normalizeApiItem } from "@/lib/apiNormalize";
import { getEventById } from "@/data/eventData";
import { normalizeMapSeat, parseHallTheme } from "@/lib/hallSeatTypes";
import { deriveTicketCategoriesFromHall, mergeTheme } from "@/lib/seatMapTheme";
import { parseYandexLonLatFromText, resolveEventImage, stripHttpUrls, DEFAULT_EVENT_IMAGE } from "@/lib/resolveMediaUrl";
import { parseLineup, type LineupArtist } from "@/lib/lineupTypes";
import ArtistCard from "@/components/lineup/ArtistCard";
import EventYouMightLike from "@/components/EventYouMightLike";
import { PriceText } from "@/lib/formatPrice";
import { pluralSeats } from "@/lib/pluralRu";

declare global {
  interface Window {
    ymaps: any;
  }
}

const mapIframeClass =
  "relative w-full aspect-video md:h-[400px] rounded-2xl overflow-hidden mb-10 border border-border bg-muted";

/** Только iframe по координатам из ссылки Яндекса (без хуков геокодера). */
const YandexMapByCoords = ({ lon, lat }: { lon: number; lat: number }) => {
  const src = `https://yandex.ru/map-widget/v1/?ll=${encodeURIComponent(`${lon},${lat}`)}&z=16&pt=${encodeURIComponent(`${lon},${lat}`)},pm2rdm`;
  return (
    <div className={mapIframeClass}>
      <iframe
        title="Карта"
        src={src}
        width="100%"
        height="100%"
        frameBorder={0}
        allowFullScreen
        style={{ filter: "invert(100%) hue-rotate(180deg) brightness(85%) contrast(90%)" }}
      />
    </div>
  );
};

/** Геокод по названию и адресу без URL (JS API). */
const YandexMapByGeocode = ({ venueName, address, apiKey }: { venueName: string; address: string; apiKey: string }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapStatus, setMapStatus] = useState<"loading" | "success" | "error">("loading");

  const searchQuery = useMemo(() => {
    const cleaned = stripHttpUrls(address);
    const parts = [venueName, cleaned].filter((x) => x && String(x).trim());
    return parts.join(", ").trim() || venueName.trim() || "Минск";
  }, [venueName, address]);

  useEffect(() => {
    let mapInstance: any = null;

    const initMap = () => {
      if (!window.ymaps || !mapContainerRef.current) {
        setMapStatus("error");
        return;
      }

      window.ymaps.ready(() => {
        window.ymaps
          .geocode(searchQuery, { results: 1 })
          .then((res: any) => {
            const firstGeoObject = res.geoObjects.get(0);

            if (!firstGeoObject || !mapContainerRef.current) {
              setMapStatus("error");
              return;
            }

            const coords = firstGeoObject.geometry.getCoordinates();
            mapContainerRef.current.innerHTML = "";

            mapInstance = new window.ymaps.Map(mapContainerRef.current, {
              center: coords,
              zoom: 16,
              controls: ["zoomControl", "fullscreenControl"],
            });

            const placemark = new window.ymaps.Placemark(
              coords,
              {
                balloonContent: venueName,
                hintContent: stripHttpUrls(address) || venueName,
              },
              {
                preset: "islands#redDotIcon",
              }
            );

            mapInstance.geoObjects.add(placemark);
            mapInstance.behaviors.disable("scrollZoom");

            setMapStatus("success");
          })
          .catch((err: any) => {
            console.error("Яндекс отклонил запрос (ошибка ключа):", err);
            setMapStatus("error");
          });
      });
    };

    const scriptId = "yandex-maps-api-script";
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = `https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=ru_RU`;
      script.async = true;

      script.onload = initMap;
      script.onerror = () => setMapStatus("error");

      document.head.appendChild(script);
    } else if (window.ymaps) {
      initMap();
    } else {
      script.addEventListener("load", initMap);
      script.addEventListener("error", () => setMapStatus("error"));
    }

    return () => {
      if (mapInstance) {
        mapInstance.destroy();
      }
    };
  }, [searchQuery, apiKey, venueName, address]);

  if (mapStatus === "loading") {
    return (
      <div className={`${mapIframeClass} bg-[var(--vibe-surface)] flex items-center justify-center`}>
        <div className="flex items-center text-white/50 text-sm">
          <svg className="animate-spin h-5 w-5 mr-3 text-white/30" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Связь со спутниками Яндекса...
        </div>
      </div>
    );
  }

  if (mapStatus === "error") {
    return (
      <div className={mapIframeClass}>
        <iframe
          title="Карта (поиск)"
          src={`https://yandex.ru/map-widget/v1/?text=${encodeURIComponent(searchQuery)}&z=16`}
          width="100%"
          height="100%"
          frameBorder={0}
          allowFullScreen
          style={{ filter: "invert(100%) hue-rotate(180deg) brightness(85%) contrast(90%)" }}
        />
      </div>
    );
  }

  return (
    <div className={mapIframeClass}>
      <div
        ref={mapContainerRef}
        className="w-full h-full"
        style={{ filter: "invert(100%) hue-rotate(180deg) brightness(85%) contrast(90%)" }}
      />
    </div>
  );
};

const YandexMap = ({ venueName, address, apiKey }: { venueName: string; address: string; apiKey: string }) => {
  const coordsFromUrl = useMemo(
    () => parseYandexLonLatFromText(`${venueName}\n${address}`),
    [venueName, address]
  );
  if (coordsFromUrl) {
    return <YandexMapByCoords lon={coordsFromUrl.lon} lat={coordsFromUrl.lat} />;
  }
  return <YandexMapByGeocode venueName={venueName} address={address} apiKey={apiKey} />;
};


const FALLBACK_HERO = DEFAULT_EVENT_IMAGE;

// --- ОСНОВНАЯ СТРАНИЦА СОБЫТИЯ ---
const Event = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [event, setEvent] = useState<any>(null);
  const [isSoldOut, setIsSoldOut] = useState(false);
  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">("loading");
  const [activeTab, setActiveTab] = useState("details");
  const [heroImageBroken, setHeroImageBroken] = useState(false);
  const seatMapRef = useRef<SeatMapHandle>(null);
  const [selectionRevision, setSelectionRevision] = useState(0);
  const [ticketPickerOpen, setTicketPickerOpen] = useState<Record<string, boolean>>({});

  const handleSeatSelectionChange = useCallback(() => {
    setSelectionRevision((n) => n + 1);
    setTicketPickerOpen((prev) => {
      const types = event?.ticketTypes as { name: string }[] | undefined;
      if (!types?.length) return prev;
      const next = { ...prev };
      for (const t of types) {
        const q = seatMapRef.current?.getCategoryQuantity(t.name) ?? 0;
        if (q > 0) next[t.name] = true;
        else if (!prev[t.name]) next[t.name] = false;
      }
      return next;
    });
  }, [event?.ticketTypes]);

  const YANDEX_API_KEY = "22662b03-7e60-4230-b268-7418b275248e";

  useEffect(() => {
    setHeroImageBroken(false);
    setLoadState("loading");
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    const loadEvent = async () => {
      if (!id) {
        setLoadState("error");
        return;
      }
      setLoadState("loading");
      try {
        const apiBase = config.apiUrl || "";
        const [response, hallResponse] = await Promise.all([
          fetch(`${config.endpoints.events}/${id}`),
          fetch(`${apiBase}/api/Seats/event/${id}/hall-map`).catch(() => null),
        ]);
        if (!response.ok) {
          if (!cancelled) {
            setEvent(null);
            setLoadState("error");
          }
          return;
        }
        const data = await response.json();
        const normalized = normalizeApiItem(data);
        const fallback = getEventById(String(id));
        const pick = (value: unknown, backup?: string) =>
          value != null && String(value).trim() !== "" && !/^\?+$/.test(String(value)) ? String(value) : backup;

        const description = String(pick(normalized.description, fallback?.description || "") || "");

        let ticketTypes: { name: string; price: number; available: boolean; availableCount?: number }[] = [];
        if (hallResponse?.ok) {
          const hall = await hallResponse.json();
          const seats = (Array.isArray(hall.seats) ? hall.seats : [])
            .map((raw: Record<string, unknown>) => normalizeMapSeat(raw))
            .filter((s): s is NonNullable<typeof s> => s != null);
          const theme = mergeTheme(
            parseHallTheme(hall.hallThemeJson ?? hall.HallThemeJson),
            (hall.theme ?? {}) as Parameters<typeof mergeTheme>[1]
          );
          const fromHall = deriveTicketCategoriesFromHall(seats, theme);
          if (fromHall.length > 0) ticketTypes = fromHall;
        }
        if (ticketTypes.length === 0) {
          const mapTicketTypes = (raw: unknown) => {
            if (!Array.isArray(raw) || raw.length === 0) return [];
            return raw.map((tt: { name?: string; price?: number; available?: boolean }) => ({
              name: String(tt?.name ?? "Билет"),
              price: Number(tt?.price ?? 0),
              available: tt?.available !== false,
            }));
          };
          ticketTypes =
            mapTicketTypes(normalized.ticketTypes).length > 0
              ? mapTicketTypes(normalized.ticketTypes)
              : mapTicketTypes(fallback?.ticketTypes);
        }

        if (cancelled) return;

        const eventTitle = pick(normalized.title, fallback?.title || "Без названия") || "Без названия";
        const lineupResolved = (() => {
          const parsed = parseLineup(normalized.lineup);
          if (parsed.length) return parsed;
          const fb = parseLineup(fallback?.lineup);
          return fb.length ? fb : [{ name: "Уточняется" }];
        })();

        setEvent({
          ...normalized,
          id: normalized.id ?? normalized.Id ?? id,
          date: normalized.date ? new Date(normalized.date).toLocaleDateString("ru-RU") : fallback?.date || "",
          lineup: lineupResolved,
          ticketTypes,
          description,
          location: pick(normalized.location, fallback?.location || "") || "Минск",
          address: pick(normalized.address, fallback?.address || "") || "",
          title: eventTitle,
          image: resolveEventImage(
            normalized.image,
            id,
            eventTitle,
            lineupResolved.map((a) => a.name),
            pick(normalized.genre, "")
          ),
          category: pick(normalized.category, fallback?.category || "Концерт") || "Концерт",
          time: pick(normalized.time, fallback?.time || "19:00") || "19:00",
        });
        setIsSoldOut(Boolean(normalized.isSoldOut ?? data.isSoldOut));
        setLoadState("ready");
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setEvent(null);
          setLoadState("error");
          toast({
            title: "Ошибка загрузки",
            description: "Не удалось получить данные с сервера",
            variant: "destructive",
          });
        }
      }
    };

    loadEvent();
    return () => {
      cancelled = true;
    };
  }, [id, toast]);

  const coordsFromAddress = useMemo(
    () => parseYandexLonLatFromText(`${event?.location ?? ""}\n${event?.address ?? ""}`),
    [event?.location, event?.address]
  );

  const addressForDisplay =
    stripHttpUrls(event?.address ?? "").trim() ||
    (coordsFromAddress
      ? "Точка на карте по ссылке Яндекса (координаты из параметра ll/pt)"
      : event?.address ?? "");

  const yandexMapsLink = coordsFromAddress
    ? `https://yandex.ru/maps/?ll=${encodeURIComponent(`${coordsFromAddress.lon},${coordsFromAddress.lat}`)}&z=16&pt=${encodeURIComponent(`${coordsFromAddress.lon},${coordsFromAddress.lat}`)}`
    : `https://yandex.ru/maps/?text=${encodeURIComponent(`${event?.location ?? ""}, ${stripHttpUrls(event?.address ?? "")}`.trim())}`;

  if (loadState === "loading") {
    return (
      <Layout>
        <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
          <p className="text-muted-foreground text-sm">Загрузка события…</p>
        </div>
      </Layout>
    );
  }

  if (loadState === "error" || !event) {
    return (
      <Layout>
        <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center max-w-md mx-auto gap-4">
          <h1 className="text-2xl font-display font-bold text-foreground">Событие недоступно</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Такого события нет или оно ещё не опубликовано. На сайте показываются только статусы{" "}
            <span className="text-foreground/80">Approved</span> и <span className="text-foreground/80">Published</span>.
            Черновик и «на модерации» здесь не отображаются.
          </p>
          <button
            type="button"
            onClick={() => navigate("/concerts")}
            className="mt-2 px-6 py-3 rounded-xl bg-[#8B5CF6] text-white font-semibold hover:bg-[#7c3aed] transition-colors"
          >
            К списку концертов
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen pb-24 bg-background">
        
        {/* --- Hero: на весь первый экран, контент ниже — только при скролле --- */}
        <div className="relative h-[calc(100dvh-5rem)] min-h-[480px] w-full overflow-hidden shrink-0">
          <img
            src={heroImageBroken ? FALLBACK_HERO : event.image || FALLBACK_HERO}
            alt={event.title}
            className="absolute inset-0 w-full h-full object-cover object-center"
            onError={() => setHeroImageBroken(true)}
          />
          <div className="absolute inset-0 bg-black/25 z-10" />
          <div className="absolute inset-x-0 bottom-0 h-[38%] bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/75 to-transparent z-10 pointer-events-none" />
          
          <div className="absolute bottom-10 md:bottom-14 left-0 right-0 z-20">
            <div className="container mx-auto px-6">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="inline-flex px-3 py-1 mb-4 rounded-full bg-[#8B5CF6]/20 border border-[#8B5CF6]/30 text-[#e9d5ff] text-xs font-semibold backdrop-blur-md uppercase tracking-wider">
                  {event.category}
                </div>
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-black text-white mb-5 leading-[1.05] tracking-tight drop-shadow-[0_4px_24px_rgba(0,0,0,0.45)]">
                  {event.title}
                </h1>
                
                <div className="flex flex-wrap gap-3 text-white/90 text-sm font-medium">
                  <div className="flex items-center bg-black/35 px-4 py-2.5 rounded-xl backdrop-blur-md border border-white/10">
                    <Calendar className="h-4 w-4 mr-2 text-[#c4b5fd]" />
                    {event.date}
                  </div>
                  <div className="flex items-center bg-black/35 px-4 py-2.5 rounded-xl backdrop-blur-md border border-white/10">
                    <Clock className="h-4 w-4 mr-2 text-[#c4b5fd]" />
                    {event.time}
                  </div>
                  <div className="flex items-center bg-black/35 px-4 py-2.5 rounded-xl backdrop-blur-md border border-white/10">
                    <MapPin className="h-4 w-4 mr-2 text-[#c4b5fd]" />
                    {event.location}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* --- Основной контент (ниже обложки) --- */}
        <div className="container mx-auto px-6 pt-12 md:pt-16 pb-8">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-12 items-start">
            <div className="xl:col-span-2">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                
                <TabsList className="bg-[var(--vibe-surface)] border border-white/10 p-1.5 rounded-2xl mb-10 w-full sm:w-auto inline-flex flex-wrap h-auto shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                  <TabsTrigger value="details" className="rounded-xl data-[state=active]:bg-[#8B5CF6] data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-violet-900/30 text-muted-foreground px-6 py-3 font-medium text-sm transition-all">Детали</TabsTrigger>
                  <TabsTrigger value="venue" className="rounded-xl data-[state=active]:bg-[#8B5CF6] data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-violet-900/30 text-muted-foreground px-6 py-3 font-medium text-sm transition-all">Место проведения</TabsTrigger>
                  <TabsTrigger value="tickets" className="rounded-xl data-[state=active]:bg-[#8B5CF6] data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-violet-900/30 text-muted-foreground px-6 py-3 font-medium text-sm transition-all">Билеты</TabsTrigger>
                </TabsList>
                
                {/* Детали */}
                <TabsContent value="details" className="space-y-10 outline-none mt-0">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="bg-[var(--vibe-surface)] rounded-3xl border border-border p-8"
                  >
                    <h2 className="text-2xl font-display font-bold text-foreground mb-6">О мероприятии</h2>
                    <div className="text-muted-foreground leading-relaxed space-y-4">
                      {String(event.description || "")
                        .split(/\n\n+/)
                        .map((p) => p.trim())
                        .filter(Boolean)
                        .map((paragraph, idx) => (
                          <p key={idx}>{paragraph}</p>
                        ))}
                      {!String(event.description || "").trim() ? (
                        <p className="text-muted-foreground">Описание уточняется.</p>
                      ) : null}
                    </div>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                    className="bg-[var(--vibe-surface)] rounded-3xl border border-border p-8"
                  >
                    <h3 className="text-2xl font-display font-bold text-foreground mb-6">Состав</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {(Array.isArray(event.lineup) ? event.lineup : []).map((artist: LineupArtist, idx: number) => (
                        <ArtistCard key={`${artist.name}-${idx}`} artist={artist} />
                      ))}
                    </div>
                  </motion.div>
                </TabsContent>
                
                {/* Место проведения с Вашей Яндекс.Картой */}
                <TabsContent value="venue" className="outline-none mt-0">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="bg-[var(--vibe-surface)] rounded-3xl border border-border p-8"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-8 gap-4">
                      <div>
                        <h2 className="text-2xl font-display font-bold text-foreground mb-2">{event.location}</h2>
                        <p className="text-muted-foreground">{addressForDisplay}</p>
                      </div>
                      
                      <a 
                        href={yandexMapsLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center px-4 py-2 bg-accent hover:bg-accent/80 border border-border rounded-xl text-sm font-medium text-foreground transition-colors whitespace-nowrap"
                      >
                        <MapPin className="w-4 h-4 mr-2" />
                        Маршрут в Яндекс
                      </a>
                    </div>
                    
                    {/* НАША НОВАЯ КАРТА (Теперь передаем и Название и Адрес) */}
                    <YandexMap venueName={event.location} address={event.address} apiKey={YANDEX_API_KEY} />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div>
                        <h3 className="text-lg font-display font-bold text-foreground mb-4">Как добраться</h3>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          Парковка доступна на территории за дополнительную плату. Рекомендуем использовать сервисы каршеринга, такси или общественный транспорт во избежание пробок.
                        </p>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-display font-bold text-foreground mb-4">Удобства площадки</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
                          <div className="flex items-center"><Check className="w-4 h-4 mr-3 text-[#00e59b]" /> Еда и напитки</div>
                          <div className="flex items-center"><Check className="w-4 h-4 mr-3 text-[#00e59b]" /> Гардероб</div>
                          <div className="flex items-center"><Check className="w-4 h-4 mr-3 text-[#00e59b]" /> Туалеты</div>
                          <div className="flex items-center"><Check className="w-4 h-4 mr-3 text-[#00e59b]" /> Места для курения</div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </TabsContent>
                
                {/* Билеты */}
                <TabsContent value="tickets" className="outline-none mt-0">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="space-y-6"
                  >
                    <h2 className="text-2xl font-display font-bold text-foreground mb-6">Категории билетов</h2>

                    {event.ticketTypes && event.ticketTypes.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {event.ticketTypes.map((ticket) => {
                        void selectionRevision;
                        const qty = seatMapRef.current?.getCategoryQuantity(ticket.name) ?? 0;
                        const maxQty = seatMapRef.current?.getCategoryMax(ticket.name) ?? ticket.availableCount ?? 0;
                        const showCounter = qty > 0 || ticketPickerOpen[ticket.name];
                        const changeQty = (next: number) => {
                          seatMapRef.current?.setCategoryQuantity(ticket.name, next);
                          if (next <= 0) {
                            setTicketPickerOpen((prev) => ({ ...prev, [ticket.name]: false }));
                          } else {
                            setTicketPickerOpen((prev) => ({ ...prev, [ticket.name]: true }));
                          }
                          setSelectionRevision((n) => n + 1);
                          document.getElementById("seatmap-section")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                        };
                        const handleSelect = () => {
                          setTicketPickerOpen((prev) => ({ ...prev, [ticket.name]: true }));
                          seatMapRef.current?.setCategoryQuantity(ticket.name, 1);
                          setSelectionRevision((n) => n + 1);
                          document.getElementById("seatmap-section")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                        };
                        return (
                        <div
                          key={ticket.name}
                          className={`group relative overflow-hidden bg-[var(--vibe-surface)] border rounded-2xl p-6 transition-all duration-300 ${
                            ticket.available
                              ? "border-border hover:border-[#8B5CF6]/40 hover:shadow-[0_0_40px_rgba(139,92,246,0.12)]"
                              : "border-border opacity-50"
                          }`}
                        >
                          <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#8B5CF6]/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="flex justify-between items-start mb-6 relative">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Ticket className="h-4 w-4 text-[#8B5CF6]/70" />
                                <h3 className="text-lg font-bold text-foreground">{ticket.name}</h3>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {ticket.available
                                  ? maxQty > 0
                                    ? `${pluralSeats(Math.max(0, maxQty - qty))} · лучшие места подберём автоматически`
                                    : "Выбор на схеме справа"
                                  : "Распродано"}
                              </p>
                            </div>
                            <div
                              className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                ticket.available
                                  ? "bg-[#00e59b]/10 text-[#00e59b]"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {ticket.available ? "В наличии" : "Нет в наличии"}
                            </div>
                          </div>
                          <div className="flex items-end justify-between relative">
                            <PriceText amount={ticket.price} className="text-2xl font-display font-black text-foreground tabular-nums" />
                            {ticket.available ? (
                              showCounter ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => changeQty(Math.max(0, qty - 1))}
                                    disabled={qty <= 0}
                                    className="h-10 w-10 rounded-xl border border-white/15 bg-white/5 text-white hover:bg-white/10 disabled:opacity-30 flex items-center justify-center transition-colors"
                                    aria-label="Уменьшить"
                                  >
                                    <Minus className="h-4 w-4" />
                                  </button>
                                  <span className="w-8 text-center font-bold text-lg text-white tabular-nums">{qty}</span>
                                  <button
                                    type="button"
                                    onClick={() => changeQty(Math.min(maxQty, qty + 1))}
                                    disabled={qty >= maxQty}
                                    className="h-10 w-10 rounded-xl bg-[#8B5CF6] text-white hover:bg-[#7c3aed] disabled:opacity-30 flex items-center justify-center shadow-lg shadow-violet-900/30 transition-colors"
                                    aria-label="Увеличить"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={handleSelect}
                                  className="px-6 py-2.5 rounded-xl text-sm font-bold bg-[#8B5CF6] text-white hover:bg-[#7c3aed] shadow-lg shadow-violet-900/30 transition-colors"
                                >
                                  Выбрать
                                </button>
                              )
                            ) : (
                              <span className="text-xs text-muted-foreground">Недоступно</span>
                            )}
                          </div>
                        </div>
                      );
                      })}
                    </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-border bg-[var(--vibe-surface)] p-8 text-center text-sm text-muted-foreground">
                        Организатор ещё не указал категории билетов. Цены можно уточнить на схеме зала справа.
                      </div>
                    )}
                    
                    <div className="bg-[var(--vibe-surface)] border border-border rounded-2xl p-6 mt-8 flex gap-4 items-start">
                      <div className="bg-accent p-3 rounded-full shrink-0">
                        <Info className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <h4 className="text-foreground font-medium mb-2">Правила возврата и посещения</h4>
                        <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                          <li>Возврат доступен не позднее чем за 24 часа до начала — подайте заявку в профиле на вкладке «Мои билеты».</li>
                          <li>При отмене концерта возврат оформляется автоматически.</li>
                          <li>Двери открываются за 1 час до начала.</li>
                          <li>Действует возрастное ограничение (проверяется на входе).</li>
                        </ul>
                      </div>
                    </div>
                  </motion.div>
                </TabsContent>
              </Tabs>
            </div>

            <div className="xl:col-span-1 h-fit w-full min-w-0 overflow-hidden" id="seatmap-section">
              <SeatMap
                ref={seatMapRef}
                eventInfo={{
                  id: Number(event.id ?? id),
                  title: event.title,
                  date: event.date
                }}
                soldOut={isSoldOut}
                onSelectionChange={handleSeatSelectionChange}
              />
            </div>
          </div>
        </div>

        <EventYouMightLike eventId={String(event.id ?? id)} />
      </div>
    </Layout>
  );
};

export default Event;