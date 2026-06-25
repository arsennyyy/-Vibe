import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MapPin, Music2, Ticket } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import EventCard from "@/components/EventCard";
import Layout from "@/components/Layout";
import ConcertsFiltersBar from "@/components/concerts/ConcertsFiltersBar";
import ConcertsSkeleton from "@/components/concerts/ConcertsSkeleton";
import ConcertsSpotlight from "@/components/concerts/ConcertsSpotlight";
import { config } from "@/config";
import { useUser } from "@/contexts/UserContext";
import { normalizeApiItem } from "@/lib/apiNormalize";
import { resolveEventImage } from "@/lib/resolveMediaUrl";
import { getEventById } from "@/data/eventData";
import {
  type CatalogEvent,
  type SortMode,
  countUniqueVenues,
  filterCatalogEvents,
  inferGenre,
  eventCardDescription,
  parseEventDate,
  parsePriceFrom,
  sortCatalogEvents,
} from "@/lib/concertsCatalog";

const ConcertsPage = () => {
  const { isAuthenticated } = useUser();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("Все");
  const [selectedGenre, setSelectedGenre] = useState("Все жанры");
  const [quickFilter, setQuickFilter] = useState<"all" | "soon" | "featured">("all");
  const [sortMode, setSortMode] = useState<SortMode>("soon");
  const [eventsData, setEventsData] = useState<CatalogEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [genreOptions, setGenreOptions] = useState<string[]>([
    "Все жанры",
    "Рок",
    "Инди",
    "Хип-хоп",
  ]);
  const [typeOptions, setTypeOptions] = useState<string[]>(["Все", "Концерт"]);

  useEffect(() => {
    const q = searchParams.get("search");
    if (q) setSearchQuery(q);
  }, [searchParams]);

  useEffect(() => {
    fetch(config.endpoints.catalogFilters)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        const genres = Array.isArray(data.genres) ? data.genres : [];
        const types = Array.isArray(data.types) ? data.types : [];
        if (genres.length) setGenreOptions(["Все жанры", ...genres]);
        if (types.length) setTypeOptions(["Все", ...types]);
      })
      .catch(() => {
        /* оставляем дефолт */
      });
  }, []);

  useEffect(() => {
    const loadEvents = async () => {
      setLoading(true);
      setListError(null);
      try {
        const url = isAuthenticated ? config.endpoints.eventsRecommended : config.endpoints.events;
        const headers: HeadersInit = {};
        const token = localStorage.getItem("token");
        if (isAuthenticated && token) headers.Authorization = `Bearer ${token}`;
        const response = await fetch(url, { headers });
        if (!response.ok) {
          setListError(`Ошибка API (${response.status}). Запущен ли бэкенд на ${config.apiUrl}?`);
          setEventsData([]);
          return;
        }
        const data = await response.json();
        const normalized = normalizeApiItem(data || []);
        setEventsData(
          (normalized || []).map((event: Record<string, unknown>) => {
            const id = String(event.id);
            const fallback = getEventById(id);
            const title =
              event.title && !/^\?+$/.test(String(event.title))
                ? String(event.title)
                : fallback?.title || "Без названия";
            const lineup =
              typeof event.lineup === "string"
                ? (() => {
                    try {
                      return JSON.parse(event.lineup as string);
                    } catch {
                      return [];
                    }
                  })()
                : (event.lineup as string[]) || fallback?.lineup || [];
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
              image: resolveEventImage(event.image as string, id, title, lineup, apiGenre || inferGenre(id, title, lineup)),
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
              date: dateRaw
                ? dateRaw.toLocaleDateString("ru-RU")
                : fallback?.date || "",
              time: String(event.time || fallback?.time || ""),
              dateRaw,
              priceFrom: parsePriceFrom(price),
            } satisfies CatalogEvent;
          })
        );
      } catch {
        setListError(`Не удалось связаться с сервером (${config.apiUrl}).`);
        setEventsData([]);
      } finally {
        setLoading(false);
      }
    };
    loadEvents();
    const poll = setInterval(loadEvents, 60000);
    return () => clearInterval(poll);
  }, [isAuthenticated]);

  const filtered = useMemo(() => {
    const list = filterCatalogEvents(eventsData, {
      search: searchQuery,
      type: selectedType,
      genre: selectedGenre,
      quick: quickFilter,
    });
    return sortCatalogEvents(list, sortMode);
  }, [eventsData, searchQuery, selectedType, selectedGenre, quickFilter, sortMode]);

  const spotlightEvent = useMemo(() => {
    if (
      searchQuery ||
      selectedGenre !== "Все жанры" ||
      selectedType !== "Все" ||
      quickFilter !== "all"
    ) {
      return null;
    }
    return filtered.find((e) => e.isFeatured && !e.soldOut)
      ?? filtered.find((e) => !e.soldOut)
      ?? filtered[0]
      ?? null;
  }, [filtered, searchQuery, selectedGenre, selectedType, quickFilter]);

  const gridEvents = useMemo(() => {
    if (!spotlightEvent) return filtered;
    return filtered.filter((e) => e.id !== spotlightEvent.id);
  }, [filtered, spotlightEvent]);

  const venueCount = useMemo(() => countUniqueVenues(eventsData), [eventsData]);

  const hasActiveFilters =
    Boolean(searchQuery) ||
    selectedType !== "Все" ||
    selectedGenre !== "Все жанры" ||
    quickFilter !== "all";

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedType("Все");
    setSelectedGenre("Все жанры");
    setQuickFilter("all");
    setSortMode("soon");
  };

  const showSpotlightFold = Boolean(spotlightEvent) && !loading && !listError;

  return (
    <Layout>
      <div className="min-h-screen bg-[#0a0a0a]">
        <div
          className={
            showSpotlightFold
              ? "flex flex-col h-[calc(100dvh-5rem)] max-h-[calc(100dvh-5rem)] overflow-hidden"
              : undefined
          }
        >
          {/* Hero */}
          <section
            className={
              showSpotlightFold
                ? "relative flex-1 flex flex-col justify-center min-h-0 overflow-hidden border-b border-white/[0.06]"
                : "relative shrink-0 overflow-hidden border-b border-white/[0.06]"
            }
          >
            <div
              className="absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_50%_-30%,rgba(139,92,246,0.22),transparent)]"
              aria-hidden
            />
            <motion.div
              className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-violet-600/10 blur-[100px]"
              animate={{ x: [0, 40, 0], y: [0, -20, 0] }}
              transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
              aria-hidden
            />
            <motion.div
              className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-fuchsia-500/10 blur-[90px]"
              animate={{ x: [0, -30, 0] }}
              transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
              aria-hidden
            />

            <div className="relative w-full max-w-[min(100%,1680px)] mx-auto px-4 sm:px-6 lg:px-10 py-8 md:py-10 lg:py-12">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <p className="text-xs font-medium uppercase tracking-[0.28em] text-[#a78bfa] mb-3 md:mb-4">
                  Каталог +Vibe
                </p>
                <h1 className="text-[2rem] md:text-5xl lg:text-6xl font-display font-black text-white tracking-tight leading-[1.05] max-w-3xl">
                  Все{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-[#c4b5fd] to-[#8B5CF6]">
                    мероприятия
                  </span>
                </h1>
                <p className="mt-4 md:mt-5 text-base md:text-lg text-white/45 max-w-xl">
                  {listError ? (
                    <span className="text-amber-400/90">{listError}</span>
                  ) : loading ? (
                    "Загружаем афишу…"
                  ) : (
                    <>
                      <span className="text-white/80 font-medium">{filtered.length}</span> из{" "}
                      {eventsData.length} — выберите свой вечер
                    </>
                  )}
                </p>
              </motion.div>

              {!loading && !listError && eventsData.length > 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.45 }}
                  className="flex flex-wrap gap-3 mt-5 md:mt-6"
                >
                  {[
                    { icon: Ticket, label: `${eventsData.length} событий` },
                    { icon: MapPin, label: `${venueCount} площадок` },
                  ].map((chip) => (
                    <div
                      key={chip.label}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-white/[0.08] bg-white/[0.03] text-sm text-white/55"
                    >
                      <chip.icon className="h-3.5 w-3.5 text-[#8B5CF6]" />
                      {chip.label}
                    </div>
                  ))}
                </motion.div>
              ) : null}
            </div>
          </section>

          <div
            className={
              showSpotlightFold
                ? "shrink-0 w-full max-w-[min(100%,1680px)] mx-auto px-4 sm:px-6 lg:px-10 pt-4 md:pt-5 pb-4 md:pb-5"
                : "w-full max-w-[min(100%,1680px)] mx-auto px-4 sm:px-6 lg:px-10 py-4 md:py-5"
            }
          >
            <ConcertsFiltersBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedType={selectedType}
              onTypeChange={setSelectedType}
              selectedGenre={selectedGenre}
              onGenreChange={setSelectedGenre}
              typeOptions={typeOptions}
              genreOptions={genreOptions}
              quickFilter={quickFilter}
              onQuickChange={setQuickFilter}
              sortMode={sortMode}
              onSortChange={setSortMode}
              hasActiveFilters={hasActiveFilters}
              onReset={resetFilters}
            />

            {loading ? (
              <div className="mt-10">
                <ConcertsSkeleton />
              </div>
            ) : showSpotlightFold && spotlightEvent ? (
              <div className="mt-4 [&>div]:mb-0">
                <ConcertsSpotlight event={spotlightEvent} />
              </div>
            ) : null}

            {!showSpotlightFold && !loading ? (
              <>
                {spotlightEvent ? (
                  <div className="mt-4">
                    <ConcertsSpotlight event={spotlightEvent} />
                  </div>
                ) : null}

                <AnimatePresence mode="popLayout">
                  <motion.div
                    key={`${searchQuery}-${selectedType}-${selectedGenre}-${quickFilter}-${sortMode}`}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6 mt-6"
                  >
                    {gridEvents.map((event, index) => (
                      <motion.div
                        key={event.id}
                        layout
                        initial={{ opacity: 0, y: 16, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.32) }}
                      >
                        <EventCard {...event} description={event.description} genre={event.genre} soldOut={event.soldOut} />
                      </motion.div>
                    ))}
                  </motion.div>
                </AnimatePresence>

                {filtered.length === 0 && !listError ? (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-24 rounded-3xl border border-white/[0.06] bg-[#12121a]/80 mt-10"
                  >
                    <div className="inline-flex h-16 w-16 rounded-2xl bg-[#8B5CF6]/15 items-center justify-center mb-6">
                      <Music2 className="h-8 w-8 text-[#a78bfa]" />
                    </div>
                    <h3 className="text-2xl font-display font-bold text-white mb-2">
                      Ничего не найдено
                    </h3>
                    <p className="text-white/45 mb-8 max-w-md mx-auto">
                      {quickFilter === "soon"
                        ? "В текущем месяце нет предстоящих концертов — сбросьте фильтр или выберите «Все»."
                        : "Попробуйте другой жанр или сбросьте фильтры — возможно, ваш концерт ждёт в полном каталоге."}
                    </p>
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="bg-white text-black font-semibold px-8 py-3 rounded-xl hover:bg-white/90 transition-colors"
                    >
                      Показать все
                    </button>
                  </motion.div>
                ) : null}
              </>
            ) : null}
          </div>
        </div>

        {showSpotlightFold && !loading ? (
          <div className="w-full max-w-[min(100%,1680px)] mx-auto px-4 sm:px-6 lg:px-10 pt-8 pb-10">
            <AnimatePresence mode="popLayout">
              <motion.div
                key={`${searchQuery}-${selectedType}-${selectedGenre}-${quickFilter}-${sortMode}`}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6"
              >
                {gridEvents.map((event, index) => (
                  <motion.div
                    key={event.id}
                    layout
                    initial={{ opacity: 0, y: 16, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.32) }}
                  >
                    <EventCard {...event} description={event.description} genre={event.genre} soldOut={event.soldOut} />
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        ) : null}
      </div>
    </Layout>
  );
};

export default ConcertsPage;
