import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  type CatalogSearchHit,
  fetchCatalogSearchHits,
  filterCatalogHits,
} from "@/lib/catalogSearch";

const Hero = () => {
  const [query, setQuery] = useState("");
  const [catalog, setCatalog] = useState<CatalogSearchHit[]>([]);
  const [suggestions, setSuggestions] = useState<CatalogSearchHit[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    void fetchCatalogSearchHits().then(setCatalog);
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setSuggestions(filterCatalogHits(catalog, value).slice(0, 8));
  };

  const goToEvent = (id: string) => {
    setSuggestions([]);
    navigate(`/event/${id}`);
  };

  const handleSearch = () => {
    const hits = filterCatalogHits(catalog, query);
    if (hits.length === 1) {
      goToEvent(hits[0].id);
      return;
    }
    const q = query.trim();
    if (q) navigate(`/concerts?search=${encodeURIComponent(q)}`);
    else navigate("/concerts");
  };

  return (
    <div className="relative min-h-[100svh] flex flex-col justify-center bg-[#0a0a0a] pt-28 pb-24 md:pt-36 md:pb-32 overflow-hidden">
      <motion.div
        animate={{ x: [0, 40, -20, 0], y: [0, -40, 30, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[10%] left-[-15%] w-[600px] h-[600px] rounded-full blur-[150px] pointer-events-none z-0 bg-[#6d28d9]/20"
      />
      <motion.div
        animate={{ x: [0, -30, 20, 0], y: [0, 30, -20, 0] }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[150px] pointer-events-none z-0 bg-[#5b21b6]/20"
      />
      <div className="absolute top-[40%] left-[45%] -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] rounded-full blur-[140px] pointer-events-none z-0 bg-[#8b5cf6]/10" />

      <div className="container px-6 md:px-12 z-10 relative">
        <div className="max-w-4xl text-left">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <span className="inline-flex items-center rounded-full px-4 py-1.5 text-[10px] font-bold tracking-widest bg-white/5 border border-white/10 text-[#a78bfa] mb-8 uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-[#a78bfa] mr-2" />
              Билеты на концерты
            </span>
          </motion.div>

          <motion.h1
            className="heading-xl mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            Найди свой <br /> лучший вечер
          </motion.h1>

          <motion.p
            className="text-lg md:text-xl text-white/50 mb-14 md:mb-16 max-w-xl leading-relaxed font-medium"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            От камерных площадок до грандиозных стадионов. Безопасно.{" "}
            <br className="hidden sm:block" /> Быстро. С гарантией.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row items-center gap-4 mb-20 md:mb-24 max-w-[700px]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            <div className="relative w-full flex-1">
              <input
                type="text"
                placeholder="Артист, площадка или жанр..."
                className="block w-full bg-[#161616] border border-white/10 rounded-2xl py-4 pl-6 pr-4 text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/40 transition-all text-base shadow-sm"
                value={query}
                onChange={handleInput}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                autoComplete="off"
              />
              {suggestions.length > 0 ? (
                <div className="absolute left-0 right-0 top-[calc(100%+8px)] bg-[#161616] border border-white/10 rounded-2xl shadow-xl z-20 max-h-48 overflow-auto py-2">
                  {suggestions.map((ev) => (
                    <button
                      key={ev.id}
                      type="button"
                      className="w-full text-left px-5 py-3 text-white hover:bg-white/5 transition-colors"
                      onClick={() => goToEvent(ev.id)}
                    >
                      {ev.title}{" "}
                      {ev.artists.length > 0 ? (
                        <span className="text-xs text-white/40 ml-2">({ev.artists.join(", ")})</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="relative group w-full sm:w-[160px] h-[56px] shrink-0">
              <div className="absolute inset-0 bg-[#8B5CF6] rounded-2xl blur-xl opacity-40 group-hover:opacity-70 transition-opacity duration-500" />
              <button
                type="button"
                className="relative bg-[#8B5CF6] hover:bg-[#7c3aed] text-white font-bold rounded-2xl transition-colors w-full h-full flex items-center justify-center text-base"
                onClick={handleSearch}
              >
                Найти
              </button>
            </div>
          </motion.div>

          <motion.div
            className="flex flex-wrap items-center gap-12 md:gap-20"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1 }}
          >
            {[
              ["50 000+", "Проданных билетов"],
              ["120+", "Мероприятий в год"],
              ["98%", "Довольных покупателей"],
            ].map(([num, label]) => (
              <div key={label}>
                <div className="text-3xl md:text-[2.5rem] font-black text-white mb-2 font-display tracking-tight">
                  {num}
                </div>
                <div className="text-[11px] text-white/45 font-semibold uppercase tracking-widest">
                  {label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
