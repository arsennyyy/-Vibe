import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { HallTheme, MapSeat } from "@/lib/hallSeatTypes";
import { buildRowOrder, collectTiers } from "@/lib/hallSeatTypes";
import { tierColor, tierLabel } from "@/lib/seatMapTheme";
import { PriceText } from "@/lib/formatPrice";

type Props = {
  seats: MapSeat[];
  theme?: HallTheme;
  selectedIds?: Set<number>;
  onSeatClick?: (seat: MapSeat) => void;
  onGaClick?: (sector: string, sampleSeat: MapSeat) => void;
  readOnly?: boolean;
  zoom?: number;
  showLegend?: boolean;
  wide?: boolean;
};

const ROW_LABEL_W = 28;
const BASE_SEAT = 12;
const MIN_SEAT = 8;
const MAX_SEAT = 15;
const MIN_GAP = 2;
/** 1px с каждой стороны ряда + запас под glow */
const ROW_EDGE_INSET = 3;

const SeatDot = ({
  seat,
  theme,
  isSelected,
  readOnly,
  size,
  onClick,
}: {
  seat: MapSeat;
  theme?: HallTheme;
  isSelected: boolean;
  readOnly: boolean;
  size: number;
  onClick?: () => void;
}) => {
  const [hovered, setHovered] = useState(false);
  const isUnavailable = seat.status === "sold" || seat.status === "reserved";
  const tier = seat.priceTier || seat.type;
  const color = tierColor(tier, theme);
  const glow =
    !isUnavailable && (isSelected || hovered)
      ? "0 0 0 2px rgba(255,255,255,0.45), 0 0 14px rgba(255,255,255,0.65), 0 0 22px rgba(255,255,255,0.25)"
      : undefined;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isUnavailable || readOnly}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={`ряд ${seat.row}, место ${seat.number} — ${seat.price}`}
      className={cn(
        "relative shrink-0 rounded-full border-2 transition-[box-shadow,background-color,border-color] duration-150",
        isUnavailable && "opacity-25 cursor-not-allowed",
        (isSelected || hovered) && "z-10"
      )}
      style={
        isSelected || (hovered && !isUnavailable)
          ? {
              width: size,
              height: size,
              backgroundColor: isSelected ? "#ffffff" : color,
              borderColor: "#ffffff",
              boxShadow: glow,
            }
          : {
              width: size,
              height: size,
              backgroundColor: isUnavailable ? "rgba(255,255,255,0.06)" : color,
              borderColor: isUnavailable ? "rgba(255,255,255,0.12)" : `${color}99`,
            }
      }
    >
      {isUnavailable ? (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="w-full h-px bg-white/25 rotate-45" />
        </span>
      ) : null}
    </button>
  );
};

const GaBlock = ({
  sector,
  gaSeats,
  theme,
  selectedIds,
  readOnly,
  onGaClick,
}: {
  sector: string;
  gaSeats: MapSeat[];
  theme?: HallTheme;
  selectedIds: Set<number>;
  readOnly: boolean;
  onGaClick?: (sector: string, sampleSeat: MapSeat) => void;
}) => {
  const available = gaSeats.filter((s) => s.status === "available" || selectedIds.has(s.id));
  const sample = available[0] ?? gaSeats[0];
  if (!sample) return null;
  const selectedCount = gaSeats.filter((s) => selectedIds.has(s.id)).length;
  const tier = sample.priceTier || "ga";
  const color = tierColor(tier, theme);
  const label = tierLabel(tier, theme);

  return (
    <button
      type="button"
      disabled={readOnly || available.length === 0}
      onClick={() => onGaClick?.(sector, sample)}
      className={cn(
        "w-full rounded-xl border border-dashed px-4 py-3.5 text-center transition-all",
        !readOnly && available.length > 0 && "hover:brightness-110 cursor-pointer",
        selectedCount > 0 && "ring-1 ring-white/20"
      )}
      style={{
        borderColor: selectedCount > 0 ? color : `${color}66`,
        background: `linear-gradient(180deg, ${color}22 0%, ${color}0d 100%)`,
      }}
    >
      <div className="text-sm font-semibold text-white tracking-wide">{label}</div>
      <div className="text-[11px] text-white/50 mt-0.5 flex items-center justify-center gap-1 flex-wrap">
        <span>{available.length} мест ·</span>
        <PriceText amount={sample.price} className="text-[11px]" />
        {selectedCount > 0 ? <span>· выбрано {selectedCount}</span> : null}
      </div>
    </button>
  );
};

const SeatMapGrid = ({
  seats,
  theme,
  selectedIds = new Set(),
  onSeatClick,
  onGaClick,
  readOnly = false,
  zoom = 1,
  showLegend = true,
}: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(480);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setContainerW(Math.max(260, el.clientWidth));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const seated = seats.filter((s) => !s.isGa);
  const gaGroups = seats.reduce<Map<string, MapSeat[]>>((acc, s) => {
    if (!s.isGa) return acc;
    const key = s.sector || "Танцпол";
    const list = acc.get(key) ?? [];
    list.push(s);
    acc.set(key, list);
    return acc;
  }, new Map());

  const rowOrder = useMemo(() => buildRowOrder(seated), [seated]);

  const seatsByRow = seated.reduce<Record<string, MapSeat[]>>((acc, seat) => {
    if (!acc[seat.row]) acc[seat.row] = [];
    acc[seat.row].push(seat);
    return acc;
  }, {});
  for (const row of Object.keys(seatsByRow)) {
    seatsByRow[row].sort((a, b) => a.number - b.number);
  }

  const maxSeatsInRow = useMemo(
    () => Math.max(1, ...rowOrder.map((r) => seatsByRow[r]?.length ?? 0)),
    [rowOrder, seatsByRow]
  );

  const arenaInnerW = Math.max(200, containerW - 36 - ROW_LABEL_W * 2 - ROW_EDGE_INSET * 2);

  const seatSize = useMemo(() => {
    const z = Math.max(0.5, Math.min(2.2, zoom));
    let size = BASE_SEAT * z;
    const needed = maxSeatsInRow * size + (maxSeatsInRow - 1) * MIN_GAP;
    if (needed > arenaInnerW) {
      size = (arenaInnerW - (maxSeatsInRow - 1) * MIN_GAP) / maxSeatsInRow;
    }
    return Math.max(MIN_SEAT, Math.min(MAX_SEAT * z, size));
  }, [arenaInnerW, maxSeatsInRow, zoom]);

  const rowGap = (count: number) => {
    if (count <= 1) return 0;
    return Math.max(MIN_GAP, (arenaInnerW - count * seatSize) / (count - 1));
  };

  const tiers = useMemo(() => collectTiers(seats), [seats]);

  return (
    <div ref={containerRef} className="flex flex-col gap-3 w-full min-w-0 max-w-full">
      {showLegend && tiers.length > 0 ? (
        <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center px-1">
          {tiers.slice(0, 12).map((t) => (
            <div key={t} className="flex items-center gap-1.5 text-[11px] text-white/50">
              <span
                className="w-2.5 h-2.5 rounded-full ring-1 ring-white/10"
                style={{ background: tierColor(t, theme) }}
              />
              {tierLabel(t, theme)}
            </div>
          ))}
        </div>
      ) : null}

      <div className="w-full min-w-0 max-w-full overflow-x-hidden flex flex-col justify-center min-h-[min(100%,420px)]">
        <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#141414] via-[#0f0f0f] to-[#0a0a0a] p-3 md:p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_24px_48px_rgba(0,0,0,0.45)] my-auto w-full">
          <div className="relative mb-3 w-full">
            <div
              className="mx-auto h-10 md:h-11 rounded-t-[2.5rem] flex items-center justify-center w-full"
              style={{
                background: "linear-gradient(180deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.02) 100%)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12), 0 4px 20px rgba(0,0,0,0.3)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderBottom: "none",
              }}
            >
              <span className="text-[10px] font-display font-bold uppercase tracking-[0.35em] text-white/35">
                Сцена
              </span>
            </div>
          </div>

          {[...gaGroups.entries()].length > 0 ? (
            <div className="mb-3 space-y-2">
              {[...gaGroups.entries()].map(([sector, gaSeats]) => (
                <GaBlock
                  key={sector}
                  sector={sector}
                  gaSeats={gaSeats}
                  theme={theme}
                  selectedIds={selectedIds}
                  readOnly={readOnly}
                  onGaClick={onGaClick}
                />
              ))}
            </div>
          ) : null}

          <div className="flex flex-col gap-[6px]">
            {rowOrder.map((row) => {
              const rowSeats = seatsByRow[row] ?? [];
              const gap = rowGap(rowSeats.length);
              const prevTier = rowOrder.indexOf(row) > 0
                ? seatsByRow[rowOrder[rowOrder.indexOf(row) - 1]]?.[0]?.priceTier
                : null;
              const curTier = rowSeats[0]?.priceTier;
              const showDivider = prevTier && curTier && prevTier !== curTier;

              return (
                <div key={row}>
                  {showDivider ? (
                    <div className="my-1.5 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
                  ) : null}
                  <div className="flex items-center w-full min-w-0">
                    <span
                      className="shrink-0 text-center text-[10px] font-medium text-white/25 tabular-nums select-none"
                      style={{ width: ROW_LABEL_W }}
                    >
                      {row}
                    </span>
                    <div
                      className="flex items-center justify-center shrink-0 overflow-visible py-1"
                      style={{
                        gap,
                        width: arenaInnerW,
                        maxWidth: arenaInnerW,
                        margin: "0 auto",
                        padding: `0 ${ROW_EDGE_INSET}px`,
                        boxSizing: "border-box",
                      }}
                    >
                      {rowSeats.map((seat) => (
                        <SeatDot
                          key={seat.id}
                          seat={seat}
                          theme={theme}
                          size={seatSize}
                          isSelected={selectedIds.has(seat.id)}
                          readOnly={readOnly}
                          onClick={() => onSeatClick?.(seat)}
                        />
                      ))}
                    </div>
                    <span
                      className="shrink-0 text-center text-[10px] font-medium text-white/25 tabular-nums select-none"
                      style={{ width: ROW_LABEL_W }}
                    >
                      {row}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {rowOrder.length === 0 && gaGroups.size === 0 ? (
            <p className="text-center text-sm text-white/30 py-12">Нет мест для отображения</p>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default SeatMapGrid;
