import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildGaZones,
  type GaZone,
  type HallTheme,
  type MapSeat,
} from "@/lib/hallSeatTypes";
import { tierColor, tierLabel } from "@/lib/seatMapTheme";
import { cn } from "@/lib/utils";

const VIEW_W = 1000;
const VIEW_H = 820;
const STAGE_Y = 760;

type Props = {
  seats: MapSeat[];
  theme?: HallTheme;
  selectedIds: Set<number>;
  onSeatClick?: (seat: MapSeat) => void;
  onGaZoneClick?: (zone: GaZone) => void;
  readOnly?: boolean;
  zoom?: number;
  className?: string;
  highlightTier?: string | null;
  showLegend?: boolean;
};

const SeatMapCanvas = ({
  seats,
  theme,
  selectedIds,
  onSeatClick,
  onGaZoneClick,
  readOnly = false,
  zoom = 1,
  className,
  highlightTier = null,
  showLegend = true,
}: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 520 });

  const seated = useMemo(
    () => seats.filter((s) => !s.isGa && s.posX != null && s.posY != null),
    [seats]
  );
  const gaZones = useMemo(() => buildGaZones(seats), [seats]);
  const hasCoords = seated.length > 0 || gaZones.length > 0;

  const contentBounds = useMemo(() => {
    let minX = 220;
    let maxX = 780;
    let minY = STAGE_Y;
    let maxY = STAGE_Y + 40;
    for (const zone of gaZones) {
      minX = Math.min(minX, zone.x);
      maxX = Math.max(maxX, zone.x + zone.width);
      minY = Math.min(minY, zone.y);
      maxY = Math.max(maxY, zone.y + zone.height);
    }
    for (const seat of seated) {
      minX = Math.min(minX, seat.posX! - 10);
      maxX = Math.max(maxX, seat.posX! + 10);
      minY = Math.min(minY, seat.posY! - 10);
      maxY = Math.max(maxY, seat.posY! + 10);
    }
    const w = Math.max(120, maxX - minX);
    const h = Math.max(80, maxY - minY);
    return { minX, minY, w, h };
  }, [gaZones, seated]);

  const getTransform = useCallback(() => {
    const pad = 20;
    const scale =
      Math.min(
        (canvasSize.w - pad * 2) / contentBounds.w,
        (canvasSize.h - pad * 2) / contentBounds.h
      ) * zoom;
    const offsetX = (canvasSize.w - contentBounds.w * scale) / 2 - contentBounds.minX * scale;
    const offsetY = (canvasSize.h - contentBounds.h * scale) / 2 - contentBounds.minY * scale;
    return { scale, offsetX, offsetY };
  }, [canvasSize, contentBounds, zoom]);

  const tiers = useMemo(() => {
    const set = new Set<string>();
    seats.forEach((s) => set.add(s.priceTier || s.type || "standard"));
    return Array.from(set).sort();
  }, [seats]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setCanvasSize({ w: el.clientWidth, h: Math.max(360, el.clientHeight) });
    });
    ro.observe(el);
    setCanvasSize({ w: el.clientWidth, h: Math.max(360, el.clientHeight) });
    return () => ro.disconnect();
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize.w * dpr;
    canvas.height = canvasSize.h * dpr;
    canvas.style.width = `${canvasSize.w}px`;
    canvas.style.height = `${canvasSize.h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvasSize.w, canvasSize.h);

    const { scale, offsetX, offsetY } = getTransform();

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    // Stage
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(220, STAGE_Y, 560, 36, 18);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = "bold 11px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("СЦЕНА | STAGE", 500, STAGE_Y + 22);

    // GA zones
    for (const zone of gaZones) {
      const color = tierColor(zone.priceTier, theme);
      ctx.fillStyle = color + "33";
      ctx.strokeStyle = color + "aa";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(zone.x, zone.y, zone.width, zone.height, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.font = "600 10px system-ui";
      ctx.textAlign = "center";
      const label = tierLabel(zone.priceTier || "ga", theme);
      ctx.fillText(label, zone.x + zone.width / 2, zone.y + zone.height / 2 - 4);
      ctx.font = "10px system-ui";
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.fillText(`${zone.available} мест · ${zone.price} Br`, zone.x + zone.width / 2, zone.y + zone.height / 2 + 10);
    }

    const r = seated.length > 8000 ? 2.2 : seated.length > 3000 ? 2.8 : 4;

    for (const seat of seated) {
      const x = seat.posX!;
      const y = seat.posY!;
      const tier = seat.priceTier || seat.type;
      const dimTier = highlightTier && highlightTier !== tier;
      const unavailable = seat.status === "sold" || seat.status === "reserved";
      const selected = selectedIds.has(seat.id) || seat.status === "selected";

      let fill = tierColor(tier, theme);
      if (unavailable) fill = "rgba(255,255,255,0.12)";
      else if (selected) fill = "#ffffff";
      else if (dimTier) fill = fill + "44";

      if (selected) {
        ctx.save();
        ctx.shadowColor = "rgba(255,255,255,0.75)";
        ctx.shadowBlur = 10;
      }
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
      if (selected) ctx.restore();

      if (selected) {
        ctx.strokeStyle = "rgba(255,255,255,0.5)";
        ctx.lineWidth = 0.6;
        ctx.stroke();
      } else if (!unavailable && !dimTier) {
        ctx.strokeStyle = "rgba(0,0,0,0.25)";
        ctx.lineWidth = 0.4;
        ctx.stroke();
      }

      if (unavailable) {
        ctx.strokeStyle = "rgba(255,255,255,0.35)";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(x - r, y - r);
        ctx.lineTo(x + r, y + r);
        ctx.stroke();
      }
    }

    ctx.restore();
  }, [canvasSize, gaZones, getTransform, highlightTier, seated, selectedIds, theme]);

  useEffect(() => {
    draw();
  }, [draw]);

  const hitTest = (clientX: number, clientY: number): { seat?: MapSeat; zone?: GaZone } => {
    const canvas = canvasRef.current;
    const rect = canvas?.getBoundingClientRect();
    if (!rect) return {};

    const { scale, offsetX, offsetY } = getTransform();
    const lx = (clientX - rect.left - offsetX) / scale;
    const ly = (clientY - rect.top - offsetY) / scale;

    for (const zone of gaZones) {
      if (lx >= zone.x && lx <= zone.x + zone.width && ly >= zone.y && ly <= zone.y + zone.height) {
        return { zone };
      }
    }

    const rHit = seated.length > 5000 ? 5 : 7;
    let best: MapSeat | undefined;
    let bestD = rHit;
    for (const seat of seated) {
      const dx = lx - seat.posX!;
      const dy = ly - seat.posY!;
      const d = Math.hypot(dx, dy);
      if (d < bestD) {
        bestD = d;
        best = seat;
      }
    }
    return best ? { seat: best } : {};
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    const { seat, zone } = hitTest(e.clientX, e.clientY);
    if (zone && onGaZoneClick) {
      onGaZoneClick(zone);
      return;
    }
    if (seat && onSeatClick) onSeatClick(seat);
  };

  if (!hasCoords && seats.length === 0) {
    return (
      <div className={cn("flex items-center justify-center text-sm text-white/40 py-16", className)}>
        Схема зала недоступна
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {showLegend && tiers.length > 0 ? (
        <div className="flex flex-wrap gap-3 justify-center px-2">
          {tiers.slice(0, 12).map((t) => (
            <div key={t} className="flex items-center gap-1.5 text-[11px] text-white/55">
              <span
                className="w-3 h-3 rounded-full border border-white/10"
                style={{ background: tierColor(t, theme) }}
              />
              {tierLabel(t, theme)}
            </div>
          ))}
        </div>
      ) : null}
      <div ref={containerRef} className="relative w-full min-h-[360px] flex items-center rounded-xl bg-background border border-border overflow-hidden">
        <canvas
          ref={canvasRef}
          className={cn("w-full h-full", readOnly ? "cursor-default" : "cursor-pointer")}
          onClick={handleClick}
        />
      </div>
    </div>
  );
};

export default SeatMapCanvas;
