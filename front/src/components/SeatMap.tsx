import { useState, useEffect, useMemo, useCallback, forwardRef, useImperativeHandle, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Plus, Minus, X, Clock, Ticket } from "lucide-react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/components/ui/use-toast";
import { config } from "@/config";
import { tierLabel } from "@/lib/seatMapTheme";
import { PriceText } from "@/lib/formatPrice";
import SeatMapCanvas from "@/components/SeatMapCanvas";
import SeatMapGrid from "@/components/SeatMapGrid";
import {
  normalizeMapSeat,
  parseHallTheme,
  type GaZone,
  type HallTheme,
  type MapSeat,
} from "@/lib/hallSeatTypes";
import { applyThemeToSeats, mergeTheme } from "@/lib/seatMapTheme";
import {
  startReservationTimer,
  clearReservationTimer,
  remainingSeconds,
  getReservationDeadline,
} from "@/lib/seatReservationTimer";
import { CHECKOUT_STORAGE_KEY, type CheckoutPayload } from "@/pages/EventCheckoutPage";
import {
  pickBestSeatIds,
  countSeatsInCategory,
  maxAvailableInCategory,
  seatCategoryName,
} from "@/lib/pickBestSeats";

interface EventInfo {
  id: number;
  title: string;
  date: string;
}

interface SeatMapProps {
  ticketTypes?: { name: string; price: number; available: boolean }[];
  eventInfo: EventInfo;
  size?: "default" | "large";
  readOnly?: boolean;
  soldOut?: boolean;
  /** Покупка и таймер брони — только на публичной странице мероприятия */
  purchaseMode?: boolean;
  onSelectionChange?: (count: number) => void;
}

export type SeatMapHandle = {
  setCategoryQuantity: (categoryName: string, quantity: number) => void;
  getCategoryQuantity: (categoryName: string) => number;
  getCategoryMax: (categoryName: string) => number;
};

const apiBase = config.apiUrl || "";
const RESERVE_MINUTES = 10;

const SeatMap = forwardRef<SeatMapHandle, SeatMapProps>(function SeatMap(
  {
    eventInfo,
    size = "default",
    readOnly = false,
    soldOut = false,
    purchaseMode = true,
    onSelectionChange,
  },
  ref
) {
  const navigate = useNavigate();
  const { isAuthenticated } = useUser();
  const { toast } = useToast();

  const [seats, setSeats] = useState<MapSeat[]>([]);
  const [theme, setTheme] = useState<HallTheme>({});
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [zoomLevel] = useState(1);
  const [showCheckout, setShowCheckout] = useState(false);
  const [ttl, setTtl] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const normalizeList = (data: unknown[]): MapSeat[] =>
    data
      .map((raw) => normalizeMapSeat(raw as Record<string, unknown>))
      .filter((s): s is MapSeat => s != null);

  const loadSeats = useCallback(async () => {
    if (!eventInfo?.id) return;
    try {
      const hallRes = await axios.get(`${apiBase}/api/Seats/event/${eventInfo.id}/hall-map`);
      const payload = hallRes.data;
      const themeMerged = mergeTheme(
        parseHallTheme(payload.hallThemeJson ?? payload.HallThemeJson),
        (payload.theme ?? {}) as HallTheme
      );
      const list = applyThemeToSeats(normalizeList(payload.seats ?? []), themeMerged);
      setSeats(list);
      setTheme(themeMerged);
      setLoadError(null);
    } catch {
      try {
        const fallback = await axios.get(`${apiBase}/api/Seats/event/${eventInfo.id}`);
        setSeats(normalizeList(fallback.data ?? []));
        setLoadError(null);
      } catch {
        setLoadError("Ошибка при загрузке схемы зала");
      }
    }
  }, [eventInfo?.id]);

  useEffect(() => {
    loadSeats();
  }, [loadSeats]);

  useEffect(() => {
    if (!purchaseMode) return;
    const interval = setInterval(loadSeats, 5000);
    return () => clearInterval(interval);
  }, [loadSeats, purchaseMode]);

  useEffect(() => {
    if (!purchaseMode) {
      clearReservationTimer(eventInfo.id);
      setTtl(0);
      return;
    }
    if (readOnly || selectedIds.size === 0) {
      if (selectedIds.size === 0) clearReservationTimer(eventInfo.id);
      return;
    }
    if (!getReservationDeadline(eventInfo.id)) {
      startReservationTimer(eventInfo.id, RESERVE_MINUTES);
    }
    const tick = () => {
      const sec = remainingSeconds(eventInfo.id);
      setTtl(sec);
      if (sec <= 0 && selectedIds.size > 0) {
        setSelectedIds(new Set());
        toast({
          title: "Время брони истекло",
          description: "Выберите места заново.",
          variant: "destructive",
        });
      }
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [selectedIds.size, eventInfo.id, readOnly, purchaseMode, toast]);

  const onSelectionChangeRef = useRef(onSelectionChange);
  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange;
  }, [onSelectionChange]);

  useEffect(() => {
    onSelectionChangeRef.current?.(selectedIds.size);
  }, [selectedIds.size]);

  const showPurchaseUi = purchaseMode && !readOnly && !soldOut;

  const selectedSeats = useMemo(
    () => seats.filter((s) => selectedIds.has(s.id)),
    [seats, selectedIds]
  );

  const gaSelections = useMemo(() => {
    const map = new Map<string, { label: string; price: number; count: number; seats: MapSeat[] }>();
    for (const s of selectedSeats.filter((x) => x.isGa)) {
      const key = s.sector || "Танцпол";
      const cur = map.get(key) ?? {
        label: tierLabel(s.priceTier || "ga", theme),
        price: s.price,
        count: 0,
        seats: [],
      };
      cur.count += 1;
      cur.seats.push(s);
      map.set(key, cur);
    }
    return map;
  }, [selectedSeats, theme]);

  const seatedSelections = useMemo(
    () => selectedSeats.filter((s) => !s.isGa),
    [selectedSeats]
  );

  const toggleSeat = (seat: MapSeat) => {
    if (seat.status === "sold" || seat.status === "reserved") return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(seat.id)) next.delete(seat.id);
      else next.add(seat.id);
      return next;
    });
  };

  const changeGaCount = (sector: string, delta: number) => {
    const sectorSeats = seats.filter((s) => s.isGa && (s.sector || "Танцпол") === sector);
    const selectedInSector = sectorSeats.filter((s) => selectedIds.has(s.id));
    if (delta > 0) {
      const next = sectorSeats.find((s) => s.status === "available" && !selectedIds.has(s.id));
      if (next) toggleSeat(next);
      else
        toast({
          title: "Нет свободных мест",
          description: "Достигнут лимит танцпола.",
          variant: "destructive",
        });
    } else if (delta < 0 && selectedInSector.length > 0) {
      toggleSeat(selectedInSector[selectedInSector.length - 1]);
    }
  };

  const handleGaZoneClick = (zone: GaZone) => {
    changeGaCount(zone.sector, 1);
  };

  const getTotalPrice = () => selectedSeats.reduce((t, s) => t + s.price, 0);

  const seatZoneName = (s: MapSeat) => tierLabel(s.priceTier || s.type || "standard", theme);

  const formatSeatLabel = (s: MapSeat) => {
    if (s.isGa) return seatZoneName(s);
    return `Ряд ${s.row} · ${s.number}`;
  };

  const timerLabel = useMemo(() => {
    const m = String(Math.floor(ttl / 60)).padStart(2, "0");
    const s = String(ttl % 60).padStart(2, "0");
    return `${m}:${s}`;
  }, [ttl]);

  const handleCheckout = () => {
    if (readOnly) return;
    if (!isAuthenticated) {
      toast({
        title: "Войдите в аккаунт",
        description: "Чтобы купить билет, необходимо авторизоваться.",
        variant: "destructive",
      });
      setTimeout(() => navigate("/signin"), 1000);
      return;
    }
    if (!getReservationDeadline(eventInfo.id)) {
      startReservationTimer(eventInfo.id, RESERVE_MINUTES);
    }
    setShowCheckout(true);
  };

  const proceedToPayment = () => {
    const payload: CheckoutPayload = {
      eventId: eventInfo.id,
      title: eventInfo.title,
      seats: selectedSeats.map((s) => ({
        id: s.id,
        label: s.isGa ? `${seatZoneName(s)}${gaSelections.get(s.sector || "Танцпол")?.count && gaSelections.get(s.sector || "Танцпол")!.count > 1 ? "" : ""}` : formatSeatLabel(s),
        price: s.price,
        type: s.type,
      })),
      total: getTotalPrice(),
    };
    sessionStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(payload));
    setShowCheckout(false);
    navigate(`/event/${eventInfo.id}/checkout`);
  };

  const hasCoords = seats.some((s) => s.posX != null && s.posY != null && !s.isGa);

  useImperativeHandle(
    ref,
    () => ({
      setCategoryQuantity(categoryName: string, quantity: number) {
        const max = maxAvailableInCategory(seats, categoryName, theme);
        const target = Math.max(0, Math.min(quantity, max));
        const current = countSeatsInCategory(seats, selectedIds, categoryName, theme);
        if (target === current) return;

        if (target > current) {
          const ids = pickBestSeatIds(seats, categoryName, target - current, theme, selectedIds);
          if (ids.length === 0) {
            toast({
              title: "Нет свободных мест",
              description: `В категории «${categoryName}» всё занято.`,
              variant: "destructive",
            });
            return;
          }
          setSelectedIds((prev) => {
            const next = new Set(prev);
            ids.forEach((id) => next.add(id));
            return next;
          });
        } else {
          const toRemove = current - target;
          const inCategory = seats.filter(
            (s) => selectedIds.has(s.id) && seatCategoryName(s, theme) === categoryName
          );
          const removeIds = inCategory.slice(-toRemove).map((s) => s.id);
          setSelectedIds((prev) => {
            const next = new Set(prev);
            removeIds.forEach((id) => next.delete(id));
            return next;
          });
        }
      },
      getCategoryQuantity(categoryName: string) {
        return countSeatsInCategory(seats, selectedIds, categoryName, theme);
      },
      getCategoryMax(categoryName: string) {
        return maxAvailableInCategory(seats, categoryName, theme);
      },
    }),
    [seats, selectedIds, theme, toast]
  );

  return (
    <div className="w-full bg-[var(--vibe-surface)] rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden">
      <div className="shrink-0 p-5 border-b border-border bg-background">
        <div className="flex justify-between items-center gap-3">
          <h3 className="font-display font-bold text-white text-lg">
            {readOnly ? "Схема зала" : "Выберите места"}
          </h3>
          {showPurchaseUi && selectedIds.size > 0 && ttl > 0 ? (
            <div className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-200/90 tabular-nums">
              <Clock className="h-3.5 w-3.5" />
              {timerLabel}
            </div>
          ) : null}
        </div>
      </div>

      <div
        className={cn(
          "relative p-3 md:p-4 overflow-hidden min-w-0 flex flex-col justify-center",
          size === "large" ? "min-h-[200px]" : "min-h-[180px]",
          soldOut && "opacity-40 saturate-[0.35]"
        )}
      >
        {loadError ? (
          <p className="text-center text-sm text-white/40 py-10">{loadError}</p>
        ) : hasCoords ? (
          <SeatMapCanvas
            seats={seats.map((s) => ({
              ...s,
              status: selectedIds.has(s.id) ? "selected" : s.status,
            }))}
            theme={theme}
            selectedIds={selectedIds}
            onSeatClick={readOnly ? undefined : toggleSeat}
            onGaZoneClick={readOnly ? undefined : handleGaZoneClick}
            readOnly={readOnly}
            zoom={zoomLevel}
            showLegend
          />
        ) : seats.length === 0 ? (
          <p className="text-center text-sm text-white/40 py-10">
            {loadError || "Сохраните черновик и выберите схему зала"}
          </p>
        ) : (
          <SeatMapGrid
            seats={seats.map((s) => ({
              ...s,
              status: selectedIds.has(s.id) ? "selected" : s.status,
            }))}
            theme={theme}
            selectedIds={selectedIds}
            onSeatClick={readOnly ? undefined : toggleSeat}
            onGaClick={
              readOnly
                ? undefined
                : (sector) => {
                    changeGaCount(sector, 1);
                  }
            }
            readOnly={readOnly}
            zoom={zoomLevel}
          />
        )}
        {soldOut ? (
          <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.55)_0%,rgba(10,10,10,0.92)_70%)] px-6">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(244,63,94,0.28)_0%,transparent_55%)]" />
            <div className="relative max-w-xs rounded-2xl border border-rose-400/40 bg-gradient-to-b from-rose-950/80 to-black/80 px-8 py-8 text-center shadow-[0_0_80px_rgba(244,63,94,0.35)] backdrop-blur-md">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.4em] text-rose-300">Билеты</p>
              <p className="font-display text-4xl font-black uppercase tracking-[0.18em] text-transparent bg-clip-text bg-gradient-to-b from-white via-rose-100 to-rose-400 drop-shadow-[0_0_24px_rgba(244,63,94,0.6)]">
                SOLD OUT
              </p>
              <p className="mt-4 text-sm leading-relaxed text-white/50">Все места раскуплены</p>
            </div>
          </div>
        ) : null}
      </div>

      {soldOut && purchaseMode ? (
        <div className="mt-auto border-t border-rose-500/20 bg-gradient-to-r from-rose-950/40 to-[#0a0a0a] p-5">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-500/35 bg-rose-500/10 px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <span className="text-sm text-rose-200/80">Покупка недоступна</span>
            <span className="rounded-full bg-gradient-to-r from-rose-600 to-red-600 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white shadow-[0_0_16px_rgba(244,63,94,0.45)]">
              SOLD OUT
            </span>
          </div>
        </div>
      ) : showPurchaseUi ? (
        <>
          <div className="shrink-0 flex flex-col max-h-[50vh] min-h-0 border-t border-border bg-background">
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 pb-2 space-y-3">
            {selectedSeats.length > 0 ? (
              <div className="rounded-2xl border border-[#8b5cf6]/25 bg-gradient-to-br from-[#8b5cf6]/10 via-transparent to-transparent p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#c4b5fd]">
                    <Ticket className="h-4 w-4" />
                    Выбрано
                    <span className="rounded-full bg-[#8b5cf6]/20 px-2 py-0.5 text-[10px] font-bold text-[#e9d5ff] tabular-nums normal-case tracking-normal">
                      {selectedSeats.length}
                    </span>
                  </div>
                  {ttl > 0 ? (
                    <span className="text-xs text-amber-200/80 font-mono tabular-nums flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {timerLabel}
                    </span>
                  ) : null}
                </div>

                <div className="space-y-2 pr-1">
                  {[...gaSelections.entries()].map(([sector, g]) => (
                    <div
                      key={sector}
                      className="flex items-center justify-between gap-3 rounded-xl bg-black/30 border border-white/10 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{g.label}</p>
                        <PriceText amount={g.price * g.count} className="text-xs text-white/50" />
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => changeGaCount(sector, -1)}
                          className="h-8 w-8 rounded-lg border border-white/15 bg-white/5 text-white hover:bg-white/10 flex items-center justify-center"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-8 text-center font-bold text-white tabular-nums">{g.count}</span>
                        <button
                          type="button"
                          onClick={() => changeGaCount(sector, 1)}
                          className="h-8 w-8 rounded-lg border border-white/15 bg-white/5 text-white hover:bg-white/10 flex items-center justify-center"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {seatedSelections.map((seat) => (
                    <div
                      key={seat.id}
                      className="flex items-center justify-between gap-3 rounded-xl bg-black/30 border border-white/10 px-3 py-2.5"
                    >
                      <div>
                        <p className="text-sm font-semibold text-white">
                          Ряд {seat.row} · Место {seat.number}
                        </p>
                        <p className="text-xs text-white/45">{seatZoneName(seat)}</p>
                      </div>
                      <PriceText amount={seat.price} className="text-sm font-medium text-white shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-white/30 text-center py-1">Ничего не выбрано</p>
            )}
            </div>

            <div className="shrink-0 px-5 py-4 border-t border-white/[0.08] bg-[#0c0c10] space-y-3">
              <div className="flex items-end justify-between gap-4">
                <p className="text-[11px] text-white/35 max-w-[55%] leading-snug">
                  Танцпол — кнопки +/− или клик по зоне на схеме
                </p>
                <div className="text-right shrink-0">
                  <div className="text-[10px] text-white/45 uppercase tracking-wider mb-0.5">Итого</div>
                  <PriceText amount={getTotalPrice()} className="text-2xl md:text-3xl font-display font-black text-white leading-none" />
                </div>
              </div>
            <div className="shrink-0">
            <button
              type="button"
              className="w-full py-3.5 rounded-xl bg-white text-black font-bold text-sm hover:bg-white/90 disabled:opacity-50 shadow-lg shadow-black/20"
              disabled={selectedSeats.length === 0}
              onClick={handleCheckout}
            >
              Перейти к оформлению
            </button>
            </div>
            </div>
          </div>

          {showCheckout ? (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#121218] border border-white/10 rounded-3xl shadow-2xl p-6 md:p-8 w-full max-w-lg max-h-[min(90vh,640px)] flex flex-col relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-48 h-48 bg-[#8b5cf6]/15 rounded-full blur-3xl pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowCheckout(false)}
                  className="absolute top-4 right-4 text-white/40 hover:text-white z-10"
                >
                  <X className="h-5 w-5" />
                </button>

                <h3 className="text-2xl font-display font-bold text-white mb-1 relative shrink-0">Оформление</h3>
                <p className="text-sm text-white/40 mb-4 relative shrink-0">
                  Проверьте заказ — на оплату {RESERVE_MINUTES} мин
                  {ttl > 0 ? (
                    <span className="ml-2 font-mono text-amber-200/90">{timerLabel}</span>
                  ) : null}
                </p>

                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1 -mr-1 space-y-4 relative">
                <div className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-5 space-y-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-white/35 mb-1">Событие</div>
                    <div className="text-white font-semibold">{eventInfo.title}</div>
                    <div className="text-xs text-white/40 mt-0.5">{eventInfo.date}</div>
                  </div>
                  <div className="border-t border-white/[0.06] pt-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="text-[10px] uppercase tracking-wider text-white/35">Билеты</div>
                      <span className="text-[10px] text-white/30 tabular-nums">{selectedSeats.length} шт.</span>
                    </div>
                    <ul className="max-h-44 overflow-y-auto overscroll-contain space-y-2 text-sm pr-1">
                      {[...gaSelections.values()].map((g, i) => (
                        <li key={`ga-${i}`} className="flex justify-between text-white/80">
                          <span>
                            {g.label} × {g.count}
                          </span>
                          <PriceText amount={g.price * g.count} />
                        </li>
                      ))}
                      {seatedSelections.map((s) => (
                        <li key={s.id} className="flex justify-between text-white/80">
                          <span>{formatSeatLabel(s)}</span>
                          <PriceText amount={s.price} />
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                </div>

                <div className="shrink-0 pt-4 mt-2 border-t border-white/[0.06] relative">
                <div className="flex items-end justify-between mb-4">
                  <span className="text-white/50">К оплате</span>
                  <PriceText amount={getTotalPrice()} className="text-3xl font-display font-black text-white" />
                </div>

                <button
                  type="button"
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-white to-white/90 text-black font-bold hover:opacity-95"
                  onClick={proceedToPayment}
                >
                  Перейти к оплате картой
                </button>
                </div>
              </motion.div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
});

export default SeatMap;
