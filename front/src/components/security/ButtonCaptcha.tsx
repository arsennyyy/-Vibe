import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, RefreshCw, Check, Hand } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchCaptchaChallenge, verifyCaptcha } from "@/lib/captcha";

type Props = {
  onVerified: (token: string) => void;
  onReset?: () => void;
  className?: string;
  embedded?: boolean;
};

const ButtonCaptcha = ({ onVerified, onReset, className, embedded }: Props) => {
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "checking" | "ok" | "fail">("loading");
  const [message, setMessage] = useState("");
  const [readyIn, setReadyIn] = useState(1);
  const onResetRef = useRef(onReset);
  const onVerifiedRef = useRef(onVerified);

  useEffect(() => {
    onResetRef.current = onReset;
    onVerifiedRef.current = onVerified;
  }, [onReset, onVerified]);

  const load = useCallback(async () => {
    setStatus("loading");
    setMessage("");
    setReadyIn(1);
    try {
      const id = await fetchCaptchaChallenge();
      setChallengeId(id);
      setStatus("ready");
      onResetRef.current?.();
    } catch {
      setStatus("fail");
      setMessage("Ошибка загрузки. Нажмите «Заново».");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (status !== "ready" || readyIn <= 0) return;
    const t = setTimeout(() => setReadyIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [status, readyIn]);

  const handlePress = async () => {
    if (!challengeId || status !== "ready" || readyIn > 0) return;
    setStatus("checking");
    setMessage("Проверяем…");
    try {
      const token = await verifyCaptcha(challengeId);
      setStatus("ok");
      setMessage("Готово!");
      onVerifiedRef.current(token);
    } catch (e: unknown) {
      setStatus("fail");
      setMessage(e instanceof Error ? e.message : "Попробуйте снова");
      await load();
    }
  };

  const canPress = status === "ready" && readyIn <= 0;

  return (
    <div className={cn(embedded ? "space-y-3" : "rounded-2xl border border-white/10 bg-[#0d0d10] p-4 space-y-3", className)}>
      <motion.button
        type="button"
        onClick={() => void handlePress()}
        disabled={!canPress || status === "checking" || status === "ok"}
        whileTap={canPress ? { scale: 0.98 } : undefined}
        className={cn(
          "relative w-full h-14 rounded-xl border overflow-hidden transition-all duration-300",
          "flex items-center justify-center gap-3 text-sm font-semibold",
          status === "ok"
            ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
            : canPress
              ? "border-[#8b5cf6]/50 bg-gradient-to-r from-[#8b5cf6]/25 to-[#6d28d9]/15 text-white hover:border-[#8b5cf6]/70 hover:shadow-lg hover:shadow-violet-900/25 cursor-pointer"
              : "border-white/10 bg-white/[0.03] text-white/40 cursor-not-allowed"
        )}
      >
        {status === "ok" ? (
          <>
            <Check className="h-5 w-5" />
            Проверка пройдена
          </>
        ) : status === "checking" ? (
          <>
            <ShieldCheck className="h-5 w-5 animate-pulse" />
            Проверяем…
          </>
        ) : readyIn > 0 ? (
          <>
            <Hand className="h-5 w-5 opacity-60" />
            Подождите {readyIn} сек…
          </>
        ) : (
          <>
            <ShieldCheck className="h-5 w-5 text-[#c4b5fd]" />
            Нажмите, чтобы подтвердить
          </>
        )}
      </motion.button>

      <div className="flex items-center justify-between gap-2 min-h-[18px]">
        {message ? (
          <p className={cn("text-xs flex-1", status === "ok" ? "text-emerald-400" : status === "fail" ? "text-rose-400" : "text-white/45")}>
            {message}
          </p>
        ) : (
          <span className="text-[11px] text-white/30">Одно нажатие — без ползунков</span>
        )}
        <button
          type="button"
          onClick={() => void load()}
          className="shrink-0 flex items-center gap-1 text-[11px] text-white/40 hover:text-white transition-colors"
        >
          <RefreshCw className="h-3 w-3" />
          Заново
        </button>
      </div>
    </div>
  );
};

export default ButtonCaptcha;
