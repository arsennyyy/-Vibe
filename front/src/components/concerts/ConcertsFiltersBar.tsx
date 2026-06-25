import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, SlidersHorizontal, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SortMode } from "@/lib/concertsCatalog";
import ConcertsSortSelect from "./ConcertsSortSelect";

const quickFilters = [
  { id: "all" as const, label: "Все" },
  { id: "soon" as const, label: "В этом месяце" },
  { id: "featured" as const, label: "Топ" },
];

type Props = {
  searchQuery: string;
  onSearchChange: (v: string) => void;
  selectedType: string;
  onTypeChange: (v: string) => void;
  selectedGenre: string;
  onGenreChange: (v: string) => void;
  typeOptions: string[];
  genreOptions: string[];
  quickFilter: "all" | "soon" | "featured";
  onQuickChange: (v: "all" | "soon" | "featured") => void;
  sortMode: SortMode;
  onSortChange: (v: SortMode) => void;
  hasActiveFilters: boolean;
  onReset: () => void;
};

export default function ConcertsFiltersBar({
  searchQuery,
  onSearchChange,
  selectedType,
  onTypeChange,
  selectedGenre,
  onGenreChange,
  typeOptions,
  genreOptions,
  quickFilter,
  onQuickChange,
  sortMode,
  onSortChange,
  hasActiveFilters,
  onReset,
}: Props) {
  const [open, setOpen] = useState(false);
  const activeCount =
    (searchQuery ? 1 : 0) +
    (selectedType !== "Все" ? 1 : 0) +
    (selectedGenre !== "Все жанры" ? 1 : 0) +
    (quickFilter !== "all" ? 1 : 0);

  return (
    <div className="sticky top-[4.5rem] z-30 -mx-1 px-1 pb-2">
      <div className="rounded-2xl border border-white/10 bg-[#161616]/95 backdrop-blur-xl shadow-lg overflow-hidden">
        <div className="flex flex-col sm:flex-row gap-3 p-3 md:p-4">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/35" />
            <input
              type="text"
              placeholder="Поиск артиста или площадки..."
              className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl py-3 pl-11 pr-10 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-[#8B5CF6]/40 focus:ring-1 focus:ring-[#8B5CF6]/25 transition-all"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                aria-label="Очистить"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <ConcertsSortSelect value={sortMode} onChange={onSortChange} />
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all",
                open || activeCount > 0
                  ? "border-[#8B5CF6]/45 bg-[#8B5CF6]/15 text-white"
                  : "border-white/10 bg-white/[0.03] text-white/60 hover:text-white hover:border-white/20"
              )}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Фильтры
              {activeCount > 0 ? (
                <span className="min-w-[1.1rem] h-[1.1rem] rounded-full bg-[#8B5CF6] text-[10px] font-bold flex items-center justify-center">
                  {activeCount}
                </span>
              ) : null}
              <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
            </button>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {open ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="px-3 md:px-4 pb-4 pt-1 border-t border-white/[0.06] space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  {quickFilters.map((q) => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => onQuickChange(q.id)}
                      className={cn(
                        "relative px-4 py-2 rounded-full text-sm font-medium transition-colors",
                        quickFilter === q.id ? "text-white" : "text-white/50 hover:text-white/80"
                      )}
                    >
                      {quickFilter === q.id ? (
                        <motion.span
                          layoutId="concertsQuickPill"
                          className="absolute inset-0 rounded-full bg-[#8B5CF6]/25 border border-[#8B5CF6]/40"
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      ) : null}
                      <span className="relative z-10">{q.label}</span>
                    </button>
                  ))}
                  <span className="w-px h-5 bg-white/10 mx-1 hidden sm:block" />
                  {typeOptions.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => onTypeChange(type)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
                        selectedType === type
                          ? "bg-[#8B5CF6]/15 text-white border border-[#8B5CF6]/40 shadow-sm"
                          : "text-white/55 hover:text-white hover:bg-white/5 border border-transparent"
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {genreOptions.map((genre) => (
                    <button
                      key={genre}
                      type="button"
                      onClick={() => onGenreChange(genre)}
                      className={cn(
                        "px-3.5 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition-all shrink-0",
                        selectedGenre === genre
                          ? "border-[#8B5CF6]/50 text-white bg-[#8B5CF6]/12"
                          : "border-white/10 text-white/45 hover:border-[#8B5CF6]/30 hover:text-white/70"
                      )}
                    >
                      {genre}
                    </button>
                  ))}
                </div>

                {hasActiveFilters ? (
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        onReset();
                        setOpen(false);
                      }}
                      className="text-xs text-[#a78bfa] hover:text-white"
                    >
                      Сбросить все фильтры
                    </button>
                  </div>
                ) : null}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
