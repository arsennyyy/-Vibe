import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Tags,
  Sparkles,
  Music2,
  LayoutGrid,
  GripVertical,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { config } from "@/config";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { adminInput, adminShell, adminDangerBtn } from "@/lib/adminUi";
import { useConfirm } from "@/contexts/ConfirmContext";

type CatalogFilterRow = {
  id: number;
  kind: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
};

type Props = {
  getToken: () => string | null;
  onChanged?: () => void;
};

const kindMeta = {
  type: {
    title: "Типы мероприятий",
    subtitle: "Вкладки вроде «Концерт» на странице каталога",
    icon: LayoutGrid,
    accent: "from-sky-500/15 to-transparent border-sky-500/20",
    chip: "bg-sky-500/15 text-sky-200 border-sky-500/25",
  },
  genre: {
    title: "Жанры",
    subtitle: "Кнопки жанров под поиском на /concerts",
    icon: Music2,
    accent: "from-[#8B5CF6]/20 to-transparent border-[#8B5CF6]/25",
    chip: "bg-[#8B5CF6]/15 text-[#c4b5fd] border-[#8B5CF6]/30",
  },
} as const;

function FilterRowCard({
  row,
  chipClass,
  onDelete,
  onToggle,
  toggling,
}: {
  row: CatalogFilterRow;
  chipClass: string;
  onDelete: (id: number) => void;
  onToggle: (row: CatalogFilterRow) => void;
  toggling: boolean;
}) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className={cn(
        "group flex items-center gap-3 rounded-xl border px-4 py-3.5 transition-colors",
        row.isActive
          ? "border-white/[0.06] bg-[#0a0a0a]/60 hover:border-white/12 hover:bg-[#111118]"
          : "border-white/[0.04] bg-[#0a0a0a]/30 opacity-75"
      )}
    >
      <GripVertical className="h-4 w-4 text-white/15 shrink-0" aria-hidden />

      <span
        className={cn(
          "inline-flex items-center px-3.5 py-1.5 rounded-full text-base font-medium border min-w-0",
          chipClass,
          !row.isActive && "opacity-50"
        )}
      >
        {row.label}
      </span>

      <div className="flex items-center gap-2 ml-auto shrink-0">
        <span className="text-xs uppercase tracking-wider text-white/30 tabular-nums min-w-[2rem] text-right">
          #{row.sortOrder}
        </span>

        <button
          type="button"
          disabled={toggling}
          onClick={() => onToggle(row)}
          title={row.isActive ? "Скрыть на сайте" : "Показать на сайте"}
          className={cn(
            "inline-flex items-center justify-center gap-1.5 min-w-[4.5rem] h-9 px-3 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors",
            row.isActive
              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25"
              : "bg-white/5 text-white/45 border border-white/10 hover:bg-white/10 hover:text-white/70",
            toggling && "opacity-50 pointer-events-none"
          )}
        >
          {row.isActive ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5" />
              Вкл
            </>
          ) : (
            "Выкл"
          )}
        </button>

        <button
          type="button"
          onClick={() => onDelete(row.id)}
          className={cn(
            adminDangerBtn,
            "flex items-center justify-center !h-9 !w-9 opacity-70 group-hover:opacity-100 transition-opacity"
          )}
          aria-label={`Удалить ${row.label}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </motion.li>
  );
}

export default function AdminCatalogFiltersTab({ getToken, onChanged }: Props) {
  const confirm = useConfirm();
  const [items, setItems] = useState<CatalogFilterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKind, setNewKind] = useState<"genre" | "type">("genre");
  const [newLabel, setNewLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(config.endpoints.admin.catalogFilters, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setItems(
          (Array.isArray(data) ? data : []).map((row: Record<string, unknown>) => ({
            id: Number(row.id ?? row.Id),
            kind: String(row.kind ?? row.Kind ?? "genre"),
            label: String(row.label ?? row.Label ?? ""),
            sortOrder: Number(row.sortOrder ?? row.SortOrder ?? 0),
            isActive: Boolean(row.isActive ?? row.IsActive ?? true),
          }))
        );
      }
    } catch {
      toast.error("Не удалось загрузить фильтры");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async () => {
    const label = newLabel.trim();
    if (!label) {
      toast.error("Введите название");
      return;
    }
    const token = getToken();
    if (!token) return;
    setAdding(true);
    try {
      const res = await fetch(config.endpoints.admin.catalogFilters, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ kind: newKind, label }),
      });
      if (res.ok) {
        toast.success("Фильтр добавлен");
        setNewLabel("");
        load();
        onChanged?.();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { message?: string }).message || "Ошибка");
      }
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (row: CatalogFilterRow) => {
    const token = getToken();
    if (!token) return;
    setTogglingId(row.id);
    try {
      const res = await fetch(`${config.endpoints.admin.catalogFilters}/${row.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive: !row.isActive }),
      });
      if (res.ok) {
        toast.success(row.isActive ? "Скрыто на сайте" : "Снова на сайте");
        load();
        onChanged?.();
      } else {
        toast.error("Не удалось изменить статус");
      }
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    const ok = await confirm({
      title: "Удалить фильтр?",
      message: "Удалить этот фильтр из каталога? Действие нельзя отменить.",
      confirmLabel: "Удалить",
      variant: "danger",
    });
    if (!ok) return;
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${config.endpoints.admin.catalogFilters}/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success("Удалено");
        load();
        onChanged?.();
      }
    } catch {
      toast.error("Ошибка удаления");
    }
  };

  const typeCount = items.filter((i) => i.kind === "type").length;
  const genreCount = items.filter((i) => i.kind === "genre").length;

  return (
    <div className="space-y-8">
      {/* Hero hint */}
      <div className="relative overflow-hidden rounded-2xl border border-[#8B5CF6]/25 bg-gradient-to-br from-[#8B5CF6]/12 via-[#14141c] to-[#0a0a0a] p-6 md:p-7">
        <div
          className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#8B5CF6]/20 blur-3xl pointer-events-none"
          aria-hidden
        />
        <div className="relative flex flex-col md:flex-row md:items-start gap-5">
          <div className="h-12 w-12 rounded-2xl bg-[#8B5CF6]/20 border border-[#8B5CF6]/30 flex items-center justify-center shrink-0">
            <Tags className="h-6 w-6 text-[#c4b5fd]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#a78bfa] mb-2">
              Каталог концертов
            </p>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-2">
              Фильтры на странице «Концерты»
            </h2>
            <p className="text-sm text-white/50 leading-relaxed max-w-2xl">
              Управляйте кнопками жанров и типов. На сайте всегда есть «Все» и «Все жанры» — их не нужно
              добавлять. Блок{" "}
              <span className="text-white/80 font-medium">«Главное»</span> задаётся во вкладке «События» →
              галочка «Главное на каталоге».
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border border-white/10 bg-white/[0.04] text-white/55">
                <LayoutGrid className="h-3 w-3 text-sky-400" />
                {typeCount} типов
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border border-white/10 bg-white/[0.04] text-white/55">
                <Music2 className="h-3 w-3 text-[#a78bfa]" />
                {genreCount} жанров
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Add form */}
      <div className={cn(adminShell, "p-6 md:p-7")}>
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#8B5CF6]/40 to-transparent" />
        <p className="text-sm font-medium text-white mb-4 flex items-center gap-2">
          <Plus className="h-4 w-4 text-[#8B5CF6]" />
          Новый фильтр
        </p>

        <div className="flex flex-wrap gap-2 mb-5">
          {(["genre", "type"] as const).map((k) => {
            const meta = kindMeta[k];
            const Icon = meta.icon;
            const active = newKind === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setNewKind(k)}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all",
                  active
                    ? "border-[#8B5CF6]/40 bg-[#8B5CF6]/15 text-white"
                    : "border-white/10 bg-transparent text-white/45 hover:text-white/70 hover:border-white/20"
                )}
              >
                <Icon className="h-4 w-4" />
                {k === "genre" ? "Жанр" : "Тип"}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
          <div className="flex-1 min-w-0">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40 block mb-2">
              Название
            </label>
            <Input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="Например: Джаз"
              className={adminInput}
            />
          </div>
          <button
            type="button"
            disabled={adding}
            onClick={handleAdd}
            className={cn(
              "inline-flex items-center justify-center gap-2 h-10 px-6 rounded-xl font-semibold text-sm transition-all shrink-0",
              "bg-[#8B5CF6] hover:bg-[#7c3aed] text-white shadow-[0_4px_24px_rgba(139,92,246,0.35)]",
              "disabled:opacity-50 disabled:pointer-events-none"
            )}
          >
            <Plus className="h-4 w-4" />
            {adding ? "Добавляем…" : "Добавить"}
          </button>
        </div>
      </div>

      {/* Lists */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {(["type", "genre"] as const).map((kind) => {
          const meta = kindMeta[kind];
          const Icon = meta.icon;
          const rows = items.filter((i) => i.kind === kind);

          return (
            <section
              key={kind}
              className={cn(
                "relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 md:p-6",
                meta.accent
              )}
            >
              <div className="flex items-start justify-between gap-3 mb-5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-black/25 border border-white/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-white/80" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-white">{meta.title}</h3>
                    <p className="text-xs text-white/40 mt-0.5">{meta.subtitle}</p>
                  </div>
                </div>
                <span className="text-2xl font-display font-black text-white/10">{rows.length}</span>
              </div>

              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="h-12 rounded-xl bg-white/[0.04] animate-pulse border border-white/[0.04]"
                    />
                  ))}
                </div>
              ) : rows.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 py-10 text-center">
                  <Sparkles className="h-8 w-8 text-white/15 mx-auto mb-3" />
                  <p className="text-sm text-white/40">Пока пусто</p>
                  <p className="text-xs text-white/25 mt-1">Добавьте фильтр выше</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {rows.map((row) => (
                      <FilterRowCard
                        key={row.id}
                        row={row}
                        chipClass={meta.chip}
                        onDelete={handleDelete}
                        onToggle={handleToggle}
                        toggling={togglingId === row.id}
                      />
                    ))}
                  </AnimatePresence>
                </ul>
              )}

              <p className="text-[10px] text-white/25 mt-4 leading-relaxed">
                {kind === "type"
                  ? "«Все» на сайте добавляется автоматически."
                  : "«Все жанры» на сайте добавляется автоматически."}
              </p>
            </section>
          );
        })}
      </div>
    </div>
  );
}
