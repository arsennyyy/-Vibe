import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Sparkles,
  Ticket,
} from "lucide-react";
import Layout from "@/components/Layout";
import { config } from "@/config";
import { cn } from "@/lib/utils";

type VerifyStatus = "valid" | "expired_window" | "invalid" | "used" | "event_passed";

type VerifyResult = {
  valid: boolean;
  status?: VerifyStatus;
  message: string;
  eventTitle?: string;
  seat?: string;
  ticketId?: number;
  windowMinutes?: number;
  scannedWindow?: number;
  currentWindow?: number;
  secondsUntilNextWindow?: number;
  windowProgressPercent?: number;
  signatureValid?: boolean;
};

function formatMmSs(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function WindowTimeline({
  scanned,
  current,
  valid,
  progress,
  secondsLeft,
}: {
  scanned?: number;
  current: number;
  valid: boolean;
  progress: number;
  secondsLeft?: number | null;
}) {
  const windows = useMemo(() => {
    const cur = current;
    return [cur - 1, cur, cur + 1].filter((w) => w >= 1);
  }, [current]);

  return (
    <div className="mt-6 space-y-3">
      <p className="text-[10px] uppercase tracking-widest text-white/35 text-center">
        10-минутные окна QR
      </p>
      <div className="flex items-center justify-center gap-2">
        {windows.map((w) => {
          const isCurrent = w === current;
          const isScanned = w === scanned;
          return (
            <div
              key={w}
              className={cn(
                "relative flex flex-col items-center rounded-xl border px-3 py-2 min-w-[72px] transition-all",
                isCurrent && "border-violet-500/60 bg-violet-500/15 scale-105",
                isScanned && !valid && "border-amber-500/50 bg-amber-500/10",
                !isCurrent && !isScanned && "border-white/10 bg-white/[0.03]"
              )}
            >
              {isCurrent ? (
                <motion.span
                  className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-violet-400"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                />
              ) : null}
              <span className="text-[10px] text-white/40">Окно</span>
              <span className="text-lg font-bold text-white tabular-nums">#{w}</span>
              {isScanned ? (
                <span className="text-[9px] text-amber-300/90 mt-0.5">отсканировано</span>
              ) : isCurrent ? (
                <span className="text-[9px] text-violet-300/90 mt-0.5">сейчас</span>
              ) : (
                <span className="text-[9px] text-white/25 mt-0.5">устарело</span>
              )}
            </div>
          );
        })}
      </div>

      {valid ? (
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3">
          <div className="flex items-center justify-between text-xs text-emerald-200/90 mb-2">
            <span className="flex items-center gap-1">
              <RefreshCw className="h-3 w-3" />
              До смены QR
            </span>
            <span className="font-mono font-semibold">
              {secondsLeft != null ? formatMmSs(secondsLeft) : formatMmSs(Math.round((100 - progress) * 6))}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-black/30 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-emerald-400 to-violet-400"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          <p className="text-[10px] text-emerald-200/60 mt-2 text-center">
            Каждые 10 минут код меняется — скриншот для перепродажи бесполезен
          </p>
        </div>
      ) : scanned != null && scanned !== current ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-center">
          <p className="text-sm text-amber-200/95 font-medium">
            Окно #{scanned} → уже окно #{current}
          </p>
          <p className="text-[11px] text-amber-200/60 mt-1">
            Именно так +Vibe отсекает перепроданные билеты: старый QR больше не проходит
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function TicketVerifyPage() {
  const [params] = useSearchParams();
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [liveSeconds, setLiveSeconds] = useState<number | null>(null);
  const [liveProgress, setLiveProgress] = useState(0);

  useEffect(() => {
    const p = params.get("p");
    const s = params.get("s");
    if (!p || !s) {
      setResult({ valid: false, status: "invalid", message: "Неверная ссылка проверки" });
      setLoading(false);
      return;
    }
    fetch(`${config.apiUrl}/api/Seats/verify?p=${encodeURIComponent(p)}&s=${encodeURIComponent(s)}`)
      .then((r) => r.json())
      .then((data: VerifyResult) => {
        setResult(data);
        if (data.secondsUntilNextWindow != null) setLiveSeconds(data.secondsUntilNextWindow);
        if (data.windowProgressPercent != null) setLiveProgress(data.windowProgressPercent);
      })
      .catch(() => setResult({ valid: false, status: "invalid", message: "Ошибка проверки" }))
      .finally(() => setLoading(false));
  }, [params]);

  useEffect(() => {
    if (liveSeconds == null || !result?.valid) return;
    const t = setInterval(() => {
      setLiveSeconds((s) => {
        if (s == null || s <= 1) return s;
        return s - 1;
      });
      setLiveProgress((p) => Math.min(99, p + 100 / 600));
    }, 1000);
    return () => clearInterval(t);
  }, [liveSeconds, result?.valid]);

  const status = result?.status ?? (result?.valid ? "valid" : "invalid");

  return (
    <Layout>
      <div className="max-w-lg mx-auto py-12 md:py-16 px-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/10 bg-[#161616] overflow-hidden shadow-2xl"
        >
          <div className="h-1 bg-gradient-to-r from-violet-600 via-violet-400 to-emerald-400" />

          <div className="p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-12 w-12 rounded-xl bg-violet-500/15 flex items-center justify-center">
                <Shield className="h-6 w-6 text-violet-400" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-violet-400 font-semibold">+Vibe Verify</p>
                <h1 className="text-xl font-display font-bold text-white">Проверка билета</h1>
              </div>
            </div>

            <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-3 mb-6 flex gap-3">
              <Sparkles className="h-5 w-5 text-violet-300 shrink-0 mt-0.5" />
              <div className="text-xs text-violet-100/80 leading-relaxed">
                <strong className="text-violet-200">Динамический QR</strong> — код меняется каждые{" "}
                {result?.windowMinutes ?? 10} минут после входа владельца. В РБ аналога нет: скрин или распечатка
                быстро устаревает.
              </div>
            </div>

            {loading ? (
              <div className="py-10 text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  className="inline-block h-8 w-8 border-2 border-violet-500/30 border-t-violet-400 rounded-full"
                />
                <p className="text-white/50 mt-4 text-sm">Проверяем подпись и окно QR…</p>
              </div>
            ) : result ? (
              <>
                <div
                  className={cn(
                    "rounded-xl border p-5 text-center",
                    status === "valid" && "border-emerald-500/30 bg-emerald-500/10",
                    status === "expired_window" && "border-amber-500/30 bg-amber-500/10",
                    (status === "invalid" || status === "used" || status === "event_passed") &&
                      "border-red-500/25 bg-red-500/10"
                  )}
                >
                  {status === "valid" ? (
                    <CheckCircle2 className="h-11 w-11 text-emerald-400 mx-auto mb-2" />
                  ) : status === "expired_window" ? (
                    <Clock className="h-11 w-11 text-amber-400 mx-auto mb-2" />
                  ) : (
                    <XCircle className="h-11 w-11 text-red-400 mx-auto mb-2" />
                  )}

                  <p
                    className={cn(
                      "text-sm font-medium leading-relaxed",
                      status === "valid" && "text-emerald-200",
                      status === "expired_window" && "text-amber-200",
                      status !== "valid" && status !== "expired_window" && "text-red-200"
                    )}
                  >
                    {result.message}
                  </p>

                  {result.eventTitle ? (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <div className="flex items-center justify-center gap-2 text-white font-display font-bold text-lg">
                        <Ticket className="h-4 w-4 text-white/40" />
                        {result.eventTitle}
                      </div>
                      {result.seat ? (
                        <p className="text-sm text-white/50 mt-1">Место {result.seat}</p>
                      ) : null}
                      {result.ticketId ? (
                        <p className="text-[10px] text-white/25 mt-2 font-mono">Билет #{result.ticketId}</p>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {result.currentWindow != null ? (
                  <WindowTimeline
                    scanned={result.scannedWindow}
                    current={result.currentWindow}
                    valid={status === "valid"}
                    progress={liveProgress || result.windowProgressPercent || 0}
                    secondsLeft={result.valid ? liveSeconds : result.secondsUntilNextWindow}
                  />
                ) : null}

                {status === "valid" && liveSeconds != null ? (
                  <p className="text-center text-xs text-white/40 mt-4 flex items-center justify-center gap-1.5">
                    <RefreshCw className="h-3 w-3" />
                    Следующий QR через{" "}
                    <span className="font-mono text-violet-300">{formatMmSs(liveSeconds)}</span>
                  </p>
                ) : null}

                {status === "expired_window" ? (
                  <p className="text-center text-xs text-amber-200/70 mt-4">
                    Попросите гостя открыть профиль +Vibe и показать свежий QR — он уже в новом окне
                  </p>
                ) : null}
              </>
            ) : null}

            <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/concerts"
                className="text-center text-sm px-4 py-2 rounded-xl border border-white/10 text-white/70 hover:bg-white/5 transition-colors"
              >
                К концертам
              </Link>
              <Link
                to="/profile"
                className="text-center text-sm px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors"
              >
                Мои билеты
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}
