import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, Calendar, MapPin, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { eventCardDescription } from "@/lib/concertsCatalog";
import { DEFAULT_EVENT_IMAGE } from "@/lib/resolveMediaUrl";
import { inferEventStockImage } from "@/lib/eventStockImages";
import { PriceLabel } from "@/lib/formatPrice";

interface EventCardProps {
  id: string;
  title: string;
  image: string;
  date: string;
  time: string;
  location: string;
  price: string;
  category?: string;
  isFeatured?: boolean;
  className?: string;
  /** @deprecated используйте description */
  subtitle?: string;
  description?: string;
  genre?: string;
  soldOut?: boolean;
  /** Без ссылки — для предпросмотра в конструкторе */
  preview?: boolean;
}

const EventCard = ({
  id,
  title,
  image,
  date,
  time,
  location,
  price,
  category = "Концерт",
  isFeatured = false,
  className,
  subtitle,
  description,
  genre,
  soldOut = false,
  preview = false,
}: EventCardProps) => {
  const [imgSrc, setImgSrc] = useState(image);
  const cardDescription = eventCardDescription(description ?? subtitle);

  const stockFallback = inferEventStockImage(title, undefined, genre);

  useEffect(() => {
    setImgSrc(image);
  }, [image]);

  const handleImgError = () => {
    setImgSrc((prev) => {
      if (prev !== stockFallback && prev !== DEFAULT_EVENT_IMAGE) return stockFallback;
      if (prev !== DEFAULT_EVENT_IMAGE) return DEFAULT_EVENT_IMAGE;
      return prev;
    });
  };

  return (
    <motion.div
      whileHover={preview || soldOut ? undefined : { y: -6 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-[1.5rem]",
        "border border-white/[0.08] bg-gradient-to-b from-[#1a1a22] to-[#101014]",
        "shadow-[0_12px_40px_rgba(0,0,0,0.45)]",
        "transition-[border-color,box-shadow,transform,filter] duration-400",
        "hover:border-[#8B5CF6]/35 hover:shadow-[0_24px_56px_rgba(0,0,0,0.55),0_0_40px_rgba(139,92,246,0.12)]",
        soldOut && "border-white/[0.05] hover:border-white/[0.08] hover:shadow-[0_12px_40px_rgba(0,0,0,0.45)]",
        className
      )}
    >
      {soldOut ? (
        <div
          className="pointer-events-none absolute inset-0 z-[15] rounded-[inherit] bg-black/40"
          aria-hidden
        />
      ) : null}

      {!preview ? (
        <Link to={`/event/${id}`} className="absolute inset-0 z-30" aria-label={`Перейти к ${title}`} />
      ) : null}

      <div className="relative h-56 w-full shrink-0 overflow-hidden">
        <img
          src={imgSrc}
          alt={title}
          onError={handleImgError}
          className={cn(
            "h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]",
            soldOut && "brightness-[0.65] saturate-[0.7]"
          )}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#101014] via-[#101014]/40 to-transparent" />
        <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(ellipse_at_50%_0%,rgba(139,92,246,0.18),transparent_65%)]" />

        {soldOut ? (
          <>
            <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(ellipse_at_center,rgba(244,63,94,0.22)_0%,transparent_68%)]" />
            <div className="absolute inset-x-4 top-1/2 z-20 -translate-y-1/2">
              <div className="mx-auto w-fit rounded-full border border-rose-400/50 bg-gradient-to-r from-rose-600/90 to-red-600/90 px-5 py-2 text-[11px] font-black uppercase tracking-[0.32em] text-white shadow-[0_0_40px_rgba(244,63,94,0.45)]">
                SOLD OUT
              </div>
            </div>
          </>
        ) : null}

        <div className="absolute inset-x-4 top-4 z-20 flex items-start justify-between gap-2">
          <span className="rounded-full border border-white/15 bg-black/50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/95 backdrop-blur-md">
            {category}
          </span>
          <span className="rounded-full border border-[#8B5CF6]/30 bg-[#8B5CF6]/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#ddd6fe] backdrop-blur-md">
            {genre || (isFeatured ? "Топ" : "Билеты")}
          </span>
        </div>
      </div>

      <div className="relative z-20 flex flex-grow flex-col px-5 pb-5 pt-4">
        <div className="mb-auto">
          <h3
            className={cn(
              "mb-2 line-clamp-2 font-display text-xl font-bold leading-snug tracking-tight text-white md:text-[1.35rem] group-hover:text-[#ede9fe] transition-colors",
              soldOut && "text-white/75 group-hover:text-white/80"
            )}
          >
            {title}
          </h3>
          {cardDescription ? (
            <p className="mb-4 line-clamp-2 text-[13px] leading-relaxed text-white/42">{cardDescription}</p>
          ) : (
            <div className="mb-4" />
          )}
        </div>

        <div className="mb-4 space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-xs text-white/55">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-[#a78bfa]/80" />
              {date}
            </span>
            <span className="hidden h-1 w-1 rounded-full bg-white/20 sm:inline-block" aria-hidden />
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 shrink-0 text-white/35" />
              {time}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-white/35" />
            <span className="truncate">{location}</span>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 pt-1 border-t border-white/[0.06]">
          <PriceLabel text={price} className="font-display text-lg font-bold tracking-tight text-white" />
          {soldOut ? (
            <span className="inline-flex items-center rounded-full bg-gradient-to-r from-rose-600 to-red-600 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-white shadow-[0_4px_20px_rgba(244,63,94,0.4)] ring-1 ring-rose-300/30">
              SOLD OUT
            </span>
          ) : (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-3.5 py-2",
                "text-xs font-semibold text-white/70",
                "bg-gradient-to-r from-[#8B5CF6]/20 to-indigo-500/10 ring-1 ring-[#8B5CF6]/25",
                "transition-all duration-300",
                "group-hover:from-[#8B5CF6]/35 group-hover:text-white group-hover:ring-[#8B5CF6]/45 group-hover:shadow-[0_0_20px_rgba(139,92,246,0.25)]"
              )}
            >
              Купить
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default EventCard;
