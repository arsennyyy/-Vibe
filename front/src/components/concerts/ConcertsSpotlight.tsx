import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Calendar, MapPin, Sparkles, Clock } from "lucide-react";
import type { CatalogEvent } from "@/lib/concertsCatalog";
import { DEFAULT_EVENT_IMAGE } from "@/lib/resolveMediaUrl";
import { inferEventStockImage } from "@/lib/eventStockImages";
import { PriceLabel } from "@/lib/formatPrice";

type Props = { event: CatalogEvent };

export default function ConcertsSpotlight({ event }: Props) {
  const [imgSrc, setImgSrc] = useState(event.image || inferEventStockImage(event.title, event.lineup, event.genre));

  const stockFallback = inferEventStockImage(event.title, event.lineup, event.genre);

  useEffect(() => {
    setImgSrc(event.image || stockFallback);
  }, [event.image, stockFallback]);

  const handleImgError = () => {
    setImgSrc((prev) => {
      if (prev !== stockFallback && prev !== DEFAULT_EVENT_IMAGE) return stockFallback;
      if (prev !== DEFAULT_EVENT_IMAGE) return DEFAULT_EVENT_IMAGE;
      return prev;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="relative mb-6 group"
    >
      <div className="absolute -inset-px rounded-3xl bg-gradient-to-r from-[#8B5CF6]/50 via-fuchsia-500/20 to-sky-500/30 opacity-60 blur-sm group-hover:opacity-90 transition-opacity duration-500" />
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#12121a]">
        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] min-h-[240px] md:min-h-[285px]">
          <div className="relative h-48 lg:h-auto overflow-hidden">
            <img
              src={imgSrc}
              alt=""
              onError={handleImgError}
              className="absolute inset-0 w-full h-full object-cover scale-105 group-hover:scale-110 transition-transform duration-[1.2s] ease-out"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#12121a]/40 to-[#12121a] lg:block hidden" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#12121a] via-transparent to-transparent lg:hidden" />
            <div className="absolute top-5 left-5 flex gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#8B5CF6]/90 text-white text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="h-3 w-3" />
                Главное
              </span>
              <span className="px-3 py-1 rounded-full bg-black/50 border border-white/15 text-white/90 text-xs font-medium backdrop-blur-md">
                {event.genre}
              </span>
            </div>
          </div>

          <div className="relative p-6 md:p-8 lg:p-10 flex flex-col justify-center">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#a78bfa] mb-3">Не пропустите</p>
            <h2 className="text-3xl md:text-4xl font-display font-black text-white tracking-tight leading-[1.05] mb-4">
              {event.title}
            </h2>
            <div className="flex flex-wrap gap-4 text-sm text-white/50 mb-6">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-[#8B5CF6]" />
                {event.date}
              </span>
              {event.time ? (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-white/30" />
                  {event.time}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-white/30" />
                {event.location}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-auto">
              <PriceLabel text={event.price} className="text-2xl font-display font-bold text-white" />
              {event.soldOut ? (
                <span className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 px-6 py-3 text-sm font-black uppercase tracking-[0.18em] text-white shadow-[0_4px_24px_rgba(244,63,94,0.45)]">
                  SOLD OUT
                </span>
              ) : (
                <Link
                  to={`/event/${event.id}`}
                  className="inline-flex items-center gap-2 bg-white text-black font-bold px-6 py-3 rounded-xl hover:bg-white/90 transition-colors"
                >
                  Купить билеты
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
