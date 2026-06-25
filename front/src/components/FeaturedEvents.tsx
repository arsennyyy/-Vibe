import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import EventCard from "./EventCard";
import { config } from "@/config";
import { normalizeApiItem } from "@/lib/apiNormalize";
import { resolveEventImage } from "@/lib/resolveMediaUrl";
import {
  eventCardDescription,
  inferGenre,
  parseEventDate,
} from "@/lib/concertsCatalog";
import { getEventById } from "@/data/eventData";

const FeaturedEvents = () => {
  const [events, setEvents] = useState<
    Array<{
      id: string;
      title: string;
      image: string;
      date: string;
      time: string;
      location: string;
      price: string;
      category?: string;
      genre?: string;
      description?: string;
      isFeatured?: boolean;
    }>
  >([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(config.endpoints.events);
        if (!res.ok) return;
        const data = await res.json();
        const normalized = normalizeApiItem(data || []);
        const mapped = (normalized || [])
          .filter((e: Record<string, unknown>) => Boolean(e.isFeatured ?? e.IsFeatured))
          .slice(0, 4)
          .map((event: Record<string, unknown>) => {
            const id = String(event.id);
            const fallback = getEventById(id);
            const title = String(event.title || fallback?.title || "Без названия");
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
            const price = String(event.price || fallback?.price || "От 50 BYN");
            const apiGenre =
              event.genre && !/^\?+$/.test(String(event.genre)) ? String(event.genre) : "";
            const apiDescription =
              event.description && !/^\?+$/.test(String(event.description))
                ? String(event.description)
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
              location: String(event.location || fallback?.location || "Минск"),
              price,
              category: String(event.category || fallback?.category || "Концерт"),
              genre: apiGenre || inferGenre(id, title, lineup),
              description: eventCardDescription(apiDescription),
              isFeatured: true,
              soldOut: Boolean(event.isSoldOut ?? event.soldOut),
              date: dateRaw ? dateRaw.toLocaleDateString("ru-RU") : fallback?.date || "",
              time: String(event.time || fallback?.time || ""),
            };
          });
        setEvents(mapped);
      } catch {
        setEvents([]);
      }
    };
    load();
  }, []);

  if (events.length === 0) return null;

  return (
    <section className="py-24 bg-[#0a0a0a] border-t border-white/[0.06]">
      <div className="container px-6 mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <motion.h2
              className="text-4xl md:text-5xl font-display font-black text-white mb-3"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              Популярные события
            </motion.h2>
            <motion.p
              className="text-white/50 text-base"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
            >
              Самые ожидаемые концерты этого сезона
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <Link
              to="/concerts"
              className="inline-flex items-center text-sm font-semibold text-[#8B5CF6] hover:text-[#7c3aed] transition-colors group"
            >
              Все концерты
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {events.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <EventCard {...event} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedEvents;
