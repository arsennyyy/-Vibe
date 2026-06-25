import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { config } from "@/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SeatMapGrid from "@/components/SeatMapGrid";
import {
  collectTiers,
  normalizeMapSeat,
  parseHallTheme,
  type HallTheme,
  type MapSeat,
} from "@/lib/hallSeatTypes";
import { mergeTheme, themeFromTiers, tierColor, tierLabel, TIER_LABELS, defaultPricesFromSeats, applyThemeToSeats } from "@/lib/seatMapTheme";
import { sanitizePriceInput } from "@/lib/formValidation";
import { cn } from "@/lib/utils";
import { LayoutGrid, Palette, Save } from "lucide-react";

type CatalogVenue = {
  id: number;
  name: string;
  city: string;
  address: string;
  halls: {
    id: number;
    name: string;
    capacity: number;
    layouts: { id: number; name: string; seatCount: number }[];
  }[];
};

type Props = {
  eventId: number | null;
  canEdit: boolean;
  venueId?: number | null;
  hallId?: number | null;
  layoutId?: number | null;
  hallThemeJson?: string | null;
  onSaved?: (payload: { hallLayoutId: number; hallThemeJson: string }) => void;
  /** Сохранить черновик, если событие ещё без id (новое создание). */
  onEnsureEventId?: () => Promise<number | null>;
};

const sectionCard = "bg-[#161616] rounded-2xl border border-white/[0.08] p-6 space-y-5";
const fieldLabel = "text-[11px] font-medium uppercase tracking-widest text-white/45 mb-2 block";

const HallLayoutConstructor = ({
  eventId,
  canEdit,
  venueId: initialVenueId,
  hallId: initialHallId,
  layoutId: initialLayoutId,
  hallThemeJson: initialThemeJson,
  onSaved,
  onEnsureEventId,
}: Props) => {
  const [catalog, setCatalog] = useState<CatalogVenue[]>([]);
  const [venueId, setVenueId] = useState<number | "">(initialVenueId ?? "");
  const [hallId, setHallId] = useState<number | "">(initialHallId ?? "");
  const [layoutId, setLayoutId] = useState<number | "">(initialLayoutId ?? "");
  const [previewSeats, setPreviewSeats] = useState<MapSeat[]>([]);
  const [theme, setTheme] = useState<HallTheme>(() => parseHallTheme(initialThemeJson));
  const [activeTier, setActiveTier] = useState<string | null>(null);
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(config.endpoints.organizer.hallCatalog, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : []))
      .then(setCatalog)
      .catch(() => toast.error("Не удалось загрузить каталог залов"));
  }, []);

  useEffect(() => {
    if (initialVenueId) setVenueId(initialVenueId);
    if (initialHallId) setHallId(initialHallId);
    if (initialLayoutId) setLayoutId(initialLayoutId);
    if (initialThemeJson) setTheme(parseHallTheme(initialThemeJson));
  }, [initialVenueId, initialHallId, initialLayoutId, initialThemeJson]);

  const selectedVenue = catalog.find((v) => v.id === venueId);
  const selectedHall = selectedVenue?.halls.find((h) => h.id === hallId);
  const selectedLayout = selectedHall?.layouts.find((l) => l.id === layoutId);

  const loadPreview = useCallback(async (id: number) => {
    setLoadingPreview(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(config.endpoints.organizer.layoutSeats(id), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("preview failed");
      const data = await res.json();
      const seats = (data as unknown[])
        .map((raw) =>
          normalizeMapSeat({
            ...(raw as Record<string, unknown>),
            status: "available",
          })
        )
        .filter((s): s is MapSeat => s != null);
      setPreviewSeats(seats);
      const tiers = collectTiers(seats);
      const fromSeats = defaultPricesFromSeats(seats);
      const saved = parseHallTheme(initialThemeJson);
      const merged = mergeTheme(mergeTheme(themeFromTiers(tiers), { tierPrices: fromSeats }), saved);
      setTheme(merged);
      const drafts: Record<string, string> = {};
      for (const tier of tiers) {
        const p = merged.tierPrices?.[tier] ?? fromSeats[tier];
        if (p != null) drafts[tier] = String(p);
      }
      setPriceDrafts(drafts);
    } catch {
      toast.error("Не удалось загрузить превью схемы");
      setPreviewSeats([]);
    } finally {
      setLoadingPreview(false);
    }
  }, [initialThemeJson]);

  useEffect(() => {
    if (typeof layoutId === "number") loadPreview(layoutId);
    else setPreviewSeats([]);
  }, [layoutId, loadPreview]);

  const tiers = useMemo(() => collectTiers(previewSeats), [previewSeats]);
  const defaultTierPrices = useMemo(() => defaultPricesFromSeats(previewSeats), [previewSeats]);

  const effectiveTierPrices = useMemo(() => {
    const prices: Record<string, number> = { ...defaultTierPrices };
    for (const tier of tiers) {
      const draft = priceDrafts[tier];
      if (draft !== undefined && draft !== "") {
        const n = Number(draft);
        if (!Number.isNaN(n)) prices[tier] = n;
      } else if (theme.tierPrices?.[tier] != null) {
        prices[tier] = theme.tierPrices[tier]!;
      }
    }
    return prices;
  }, [defaultTierPrices, priceDrafts, theme.tierPrices, tiers]);

  const previewTheme = useMemo(
    () => ({ ...theme, tierPrices: effectiveTierPrices }),
    [theme, effectiveTierPrices]
  );
  const displaySeats = useMemo(
    () => applyThemeToSeats(previewSeats, previewTheme),
    [previewSeats, previewTheme]
  );

  const updateTierColor = (tier: string, color: string) => {
    setTheme((prev) => ({
      ...prev,
      tierColors: { ...prev.tierColors, [tier]: color },
    }));
  };

  const updateTierPrice = (tier: string, raw: string) => {
    const cleaned = sanitizePriceInput(raw);
    setPriceDrafts((prev) => ({ ...prev, [tier]: cleaned }));
    if (!cleaned) {
      setTheme((prev) => {
        const next = { ...(prev.tierPrices ?? {}) };
        delete next[tier];
        return { ...prev, tierPrices: next };
      });
      return;
    }
    const num = Number(cleaned);
    setTheme((prev) => ({
      ...prev,
      tierPrices: { ...prev.tierPrices, [tier]: num },
    }));
  };

  const updateTierLabel = (tier: string, label: string) => {
    setTheme((prev) => ({
      ...prev,
      tierLabels: { ...prev.tierLabels, [tier]: label },
    }));
  };

  const saveSetup = async () => {
    let targetId = eventId;
    if (!targetId && onEnsureEventId) {
      targetId = await onEnsureEventId();
    }
    if (!targetId) {
      toast.error("Сначала сохраните черновик события");
      return;
    }
    if (!layoutId) {
      toast.error("Выберите схему зала");
      return;
    }
    setBusy(true);
    const themePayload: HallTheme = {
      ...theme,
      tierPrices: effectiveTierPrices,
    };
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(config.endpoints.organizer.hallSetup(targetId), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          venueId: venueId || null,
          hallId: hallId || null,
          hallLayoutId: layoutId,
          hallThemeJson: JSON.stringify(themePayload),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error((data as { message?: string }).message || "Не удалось сохранить");
        return;
      }
      toast.success("Схема зала применена к событию");
      onSaved?.({
        hallLayoutId: layoutId as number,
        hallThemeJson: JSON.stringify(themePayload),
      });
    } catch {
      toast.error("Ошибка сети при сохранении схемы");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className={sectionCard}>
        <div className="flex items-center gap-2 mb-1">
          <LayoutGrid className="h-5 w-5 text-violet-400" />
          <h3 className="text-lg font-display font-bold text-white">Конструктор схемы зала</h3>
        </div>
        <p className="text-sm text-white/45 leading-relaxed">
          Выберите готовую схему минской площадки из каталога, настройте цвета секторов и цены по
          зонам. После сохранения места появятся на странице покупки билетов.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={fieldLabel}>Площадка</label>
            <Select
              disabled={!canEdit}
              value={venueId ? String(venueId) : ""}
              onValueChange={(v) => {
                setVenueId(Number(v));
                setHallId("");
                setLayoutId("");
              }}
            >
              <SelectTrigger className="bg-[#0a0a0a] border-white/10 text-white">
                <SelectValue placeholder="Выберите площадку" />
              </SelectTrigger>
              <SelectContent>
                {catalog.map((v) => (
                  <SelectItem key={v.id} value={String(v.id)}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className={fieldLabel}>Зал</label>
            <Select
              disabled={!canEdit || !selectedVenue}
              value={hallId ? String(hallId) : ""}
              onValueChange={(v) => {
                setHallId(Number(v));
                setLayoutId("");
              }}
            >
              <SelectTrigger className="bg-[#0a0a0a] border-white/10 text-white">
                <SelectValue placeholder="Зал" />
              </SelectTrigger>
              <SelectContent>
                {selectedVenue?.halls.map((h) => (
                  <SelectItem key={h.id} value={String(h.id)}>
                    {h.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className={fieldLabel}>Схема</label>
            <Select
              disabled={!canEdit || !selectedHall}
              value={layoutId ? String(layoutId) : ""}
              onValueChange={(v) => setLayoutId(Number(v))}
            >
              <SelectTrigger className="bg-[#0a0a0a] border-white/10 text-white">
                <SelectValue placeholder="Рассадка" />
              </SelectTrigger>
              <SelectContent>
                {selectedHall?.layouts.map((l) => (
                  <SelectItem key={l.id} value={String(l.id)}>
                    {l.name} ({l.seatCount})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedLayout ? (
          <p className="text-xs text-white/35">
            {selectedVenue?.name} · {selectedHall?.name} · {selectedLayout.seatCount} мест
          </p>
        ) : null}
      </div>

      {layoutId ? (
        <>
          <div className={cn(sectionCard, "grid grid-cols-1 xl:grid-cols-[260px_minmax(0,1fr)] gap-6 min-w-0")}>
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Palette className="h-4 w-4 text-violet-400" />
                <span className="text-sm font-semibold text-white">Зоны и цены</span>
              </div>
              <div className="space-y-3">
                {tiers.map((tier) => (
                  <div
                    key={tier}
                    className={cn(
                      "rounded-xl border p-3 transition-colors",
                      activeTier === tier
                        ? "border-violet-500/50 bg-violet-500/10"
                        : "border-white/8 bg-[#0a0a0a] hover:border-white/15"
                    )}
                    onFocus={() => setActiveTier(tier)}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="color"
                        disabled={!canEdit}
                        value={tierColor(tier, theme)}
                        onChange={(e) => updateTierColor(tier, e.target.value)}
                        className="h-8 w-10 rounded cursor-pointer bg-transparent border-0 p-0 shrink-0"
                      />
                      <Input
                        className="h-8 text-sm font-medium bg-[#111] border-white/10 flex-1 min-w-0"
                        placeholder={TIER_LABELS[tier] ?? tier}
                        disabled={!canEdit}
                        value={theme.tierLabels?.[tier] ?? ""}
                        onChange={(e) => updateTierLabel(tier, e.target.value)}
                        onFocus={() => setActiveTier(tier)}
                      />
                    </div>
                    <Input
                      className="h-8 text-xs bg-[#111] border-white/10"
                      placeholder="Цена"
                      disabled={!canEdit}
                      inputMode="numeric"
                      value={priceDrafts[tier] ?? ""}
                      onChange={(e) => updateTierPrice(tier, e.target.value)}
                      onFocus={() => setActiveTier(tier)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="min-h-[320px] min-w-0 w-full overflow-x-hidden overflow-y-auto max-h-[520px]">
              {loadingPreview ? (
                <p className="text-sm text-white/40 text-center py-16">Загрузка превью…</p>
              ) : (
                <SeatMapGrid
                  seats={displaySeats}
                  theme={previewTheme}
                  readOnly
                  showLegend={false}
                />
              )}
            </div>
          </div>

          {canEdit ? (
            <Button
              className="w-full h-11 bg-white text-black hover:bg-white/90 disabled:opacity-40"
              disabled={busy || (!eventId && !onEnsureEventId)}
              onClick={saveSetup}
            >
              <Save className="h-4 w-4 mr-2" />
              {busy ? "Сохранение…" : "Применить схему к событию"}
            </Button>
          ) : null}
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-white/35">
          Выберите площадку, зал и схему — откроется превью и настройка цветов
        </div>
      )}
    </div>
  );
};

export default HallLayoutConstructor;
