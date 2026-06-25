import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import EventCard from "@/components/EventCard";
import { config } from "@/config";
import { type CatalogEvent, mapApiEventsToCatalog } from "@/lib/concertsCatalog";

type Props = {
  eventId: string;
};

const EventYouMightLike = ({ eventId }: Props) => {
  const [events, setEvents] = useState<CatalogEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${config.endpoints.events}/${eventId}/related?count=4`);
        if (!response.ok) {
          if (!cancelled) setEvents([]);
          return;
        }
        const data = await response.json();
        if (!cancelled) {
          setEvents(mapApiEventsToCatalog(data).filter((e) => !e.soldOut));
        }
      } catch {
        if (!cancelled) setEvents([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  if (!loading && events.length === 0) return null;

  return (
    <section className="container mx-auto px-6 mt-20 border-t border-white/[0.06] pt-14">
      <div className="mb-8 md:mb-10">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#a78bfa]/80 mb-3">
          Похожие события
        </p>
        <h2 className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight">
          Вам может понравиться
        </h2>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-7">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-[420px] rounded-[1.35rem] border border-white/[0.06] bg-[#161616] animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-7">
          {events.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.35, delay: Math.min(index * 0.06, 0.24) }}
            >
              <EventCard {...item} soldOut={item.soldOut} description={item.description} genre={item.genre} />
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
};

export default EventYouMightLike;
